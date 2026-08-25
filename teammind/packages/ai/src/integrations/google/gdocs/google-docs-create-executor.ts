import { SupabaseClient } from '@supabase/supabase-js';

import { docs_v1, drive_v3, google } from 'googleapis';

import { Database } from '@tm/supabase/database';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { DocumentAction, GoogleDriveConfig } from '../../../types';
import { CreateActionExecutor, CreateExecutionResult } from '../../shared';
import { GoogleBase } from '../google-base';
import { GfmToGoogleDocsConverter } from './md-to-google-doc-converter';

/**
 * Google Docs-specific result that extends the base result
 */
export interface GoogleDocsCreateResult extends CreateExecutionResult {
  documentId: string;
  folderId?: string;
}

/**
 * Executor implementation for Google Docs operations
 */
export class GoogleDocsExecutor
  implements
    CreateActionExecutor<
      { accessToken: string; refreshToken: string },
      DocumentAction,
      GoogleDocsCreateResult
    >
{
  private readonly converter = new GfmToGoogleDocsConverter();
  private readonly supabase: SupabaseClient<Database> = getSupabaseServerClient(
    {
      admin: true,
    },
  );

  async execute(
    actionData: DocumentAction,
    config: GoogleDriveConfig,
    userId: string,
  ): Promise<GoogleDocsCreateResult> {
    const { action, title, parentPageId, pageId, content } = actionData;

    try {
      // Create a Google Docs API client
      const googleBase = new GoogleBase(
        config.accessToken,
        config.refreshToken,
        userId,
      );

      const auth = googleBase.authClient;
      const docs = google.docs({ version: 'v1', auth });
      const drive = google.drive({ version: 'v3', auth });

      if (action === 'create') {
        // Create a new Google Doc
        const docMetadata: drive_v3.Schema$File = {
          name: title ?? 'Untitled Document',
          mimeType: 'application/vnd.google-apps.document',
          parents: parentPageId ? [parentPageId] : undefined,
        };

        const file = await drive.files.create({
          requestBody: docMetadata,
          fields: 'id, name, webViewLink',
        });

        const documentId = file.data.id!;

        // Convert markdown to Google Docs API requests
        const { requests } = this.converter.convertToRequests(content);

        // Insert content into the document using batch updates
        if (requests.length > 0) {
          // Google Docs API has a limit on batch request size, so we may need to split them
          const batchSize = 1000;
          for (let i = 0; i < requests.length; i += batchSize) {
            const batch = requests.slice(i, i + batchSize);
            await docs.documents.batchUpdate({
              documentId,
              requestBody: { requests: batch },
            });
          }
        }

        return {
          id: documentId,
          title: title ?? 'Untitled Document',
          url: file.data.webViewLink!,
          documentId,
          folderId: parentPageId ?? undefined,
        };
      } else if (action === 'update') {
        if (!pageId) {
          throw new Error('Document ID is required for update action');
        }

        console.log(`Fetching document: ${pageId}`);
        // Get the existing document
        const existingDoc = await docs.documents.get({
          documentId: pageId,
        });

        const { data: originalMarkdown } = await this.supabase
          .from('documents')
          .select('content, document_user_access!inner(user_id)')
          .eq('source_id', pageId)
          .eq('source', 'notion')
          .eq('document_user_access.user_id', userId)
          .single();

        if (existingDoc.data.body?.content) {
          console.log('Analyzing document structure...');

          // Step 1: Find text elements and media elements
          // We'll use this to identify what to delete and what to preserve
          const textElements: Array<{
            index: number;
            startIndex: number;
            endIndex: number;
            hasBullet: boolean;
          }> = [];
          const mediaElements: number[] = []; // Store indices of elements with media

          existingDoc.data.body.content.forEach((element, index) => {
            // Is this a media element?
            if (
              element.paragraph?.elements?.some((e) => e.inlineObjectElement) ||
              element.table ||
              element.sectionBreak
            ) {
              mediaElements.push(index);
            }
            // Is this a text paragraph (with or without bullets)?
            else if (
              element.paragraph &&
              !!element.startIndex &&
              !!element.endIndex
            ) {
              const hasBullet = element.paragraph.bullet !== undefined;
              textElements.push({
                index,
                startIndex: element.startIndex,
                endIndex: element.endIndex,
                hasBullet,
              });
            }
          });

          // Sort text elements by position from end to beginning to handle index shifting
          textElements.sort((a, b) => b.startIndex - a.startIndex);

          console.log(
            `Found ${textElements.length} text elements to potentially delete`,
          );
          console.log(
            `Found ${mediaElements.length} media elements to preserve`,
          );

          // Step 2: Delete text elements one by one, from end to beginning
          for (const element of textElements) {
            // Skip deletion if this would leave just an empty newline
            if (element.endIndex - element.startIndex <= 1) continue;

            try {
              if (element.hasBullet) {
                // For bullet points, first remove the bullet formatting, then the content
                await docs.documents.batchUpdate({
                  documentId: pageId,
                  requestBody: {
                    requests: [
                      {
                        deleteParagraphBullets: {
                          range: {
                            startIndex: element.startIndex,
                            endIndex: element.endIndex,
                          },
                        },
                      },
                      {
                        deleteContentRange: {
                          range: {
                            startIndex: element.startIndex,
                            endIndex: element.endIndex, // Delete entire range including newline
                          },
                        },
                      },
                    ],
                  },
                });
              } else {
                // For regular text, just delete the content
                await docs.documents.batchUpdate({
                  documentId: pageId,
                  requestBody: {
                    requests: [
                      {
                        deleteContentRange: {
                          range: {
                            startIndex: element.startIndex,
                            endIndex: element.endIndex, // Delete entire range including newline
                          },
                        },
                      },
                    ],
                  },
                });
              }
            } catch (error) {
              console.error(
                `Error deleting text element at index ${element.index}:`,
                error,
              );
              // Continue with next element
            }
          }
        }

        // Step 3: Insert new content at the beginning of the document
        console.log('Preparing to insert new content...');
        const { requests: newContentRequests } =
          this.converter.convertToRequests(content);
        console.log(`Generated ${newContentRequests.length} content requests`);

        if (newContentRequests.length > 0) {
          // Fetch the document again to get current state after deletions
          const updatedDoc = await docs.documents.get({
            documentId: pageId,
          });

          // Find the first non-media element to insert content before it
          let insertionIndex = 1; // Default to beginning of document

          if (
            updatedDoc.data.body?.content &&
            updatedDoc.data.body.content.length > 0
          ) {
            // If first element is a section break, insert after it
            if (
              updatedDoc.data.body.content[0]!.sectionBreak &&
              updatedDoc.data.body.content[0]!.endIndex
            ) {
              insertionIndex = updatedDoc.data.body.content[0]!.endIndex;
            }
          }

          console.log(`Using insertion index: ${insertionIndex}`);

          // Prepare insertion requests
          let currentIndex = insertionIndex;
          const insertRequests: docs_v1.Schema$Request[] = [];

          for (const request of newContentRequests) {
            if (request.insertText) {
              request.insertText.location = { index: currentIndex };
              insertRequests.push(request);

              if (request.insertText.text) {
                currentIndex += request.insertText.text.length;
              }
            } else {
              // For non-text requests (like formatting), include them as-is
              insertRequests.push(request);
            }
          }

          // Send insertion requests in batches
          const batchSize = 1000;
          for (let i = 0; i < insertRequests.length; i += batchSize) {
            const batch = insertRequests.slice(i, i + batchSize);
            console.log(
              `Sending insert batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(insertRequests.length / batchSize)}`,
            );
            await docs.documents.batchUpdate({
              documentId: pageId,
              requestBody: { requests: batch },
            });
          }
          console.log('New content inserted successfully');
        }

        // Get the updated document metadata
        const file = await drive.files.get({
          fileId: pageId,
          fields: 'id, name, webViewLink, parents',
        });

        const folderId = file.data.parents?.[0] ?? undefined;

        return {
          id: pageId,
          title: file.data.name!,
          url: file.data.webViewLink!,
          documentId: pageId,
          folderId,
          contentBefore: originalMarkdown?.content,
        };
      } else {
        throw new Error(`Unsupported action type: ${action}`);
      }
    } catch (error) {
      console.error('Error in Google Docs executor:', error);
      throw error;
    }
  }
}
