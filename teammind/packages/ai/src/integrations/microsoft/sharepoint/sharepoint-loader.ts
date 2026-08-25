import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@tm/supabase/database';

import { DocQualityAnalyzer } from '../../../agents';
import { PdfToMarkdownConverter } from '../../../file-converters';
import { DocumentAccessManager, SupabaseVectorStore } from '../../../storage';
import {
  MicrosoftSiteMetaData,
  SharePointDocumentMetadata,
} from '../../../types';
import { MicrosoftApi } from '../microsoft-api';
import { MicrosoftDrive } from '../microsoft-drive';
import { MicrosoftDriveItem } from '../microsoft-drive-item';
import { MicrosoftSite } from '../microsoft-site';

const CONFIG = {
  BATCH_SIZE: 50,
  MIN_CONTENT_SIZE: 100, // bytes
} as const;

interface SharePointLoaderConfig {
  userId: string;
  accessToken: string;
  refreshToken: string;
  selectedSites: MicrosoftSiteMetaData[];
  supabase: SupabaseClient<Database>;
}

interface AccessOperation {
  id: string;
  siteId: string;
  version: string | number;
}

interface ProcessedSharePointFile {
  id: string;
  name: string;
  webUrl: string;
  siteId: string;
  driveId: string;
  folderId?: string;
  folderPath?: string;
  lastModifiedDateTime: string;
  mimeType: string;
  content?: Blob;
  size: number;
  deleted: boolean;
  createdBy?: string;
  lastModifiedBy?: string;
}

export class SharePointLoader {
  private readonly userId: string;
  private readonly accessToken: string;
  private readonly refreshToken: string;
  private readonly selectedSites: MicrosoftSiteMetaData[];
  private readonly vectorStore: SupabaseVectorStore;
  private readonly accessManager: DocumentAccessManager;
  private readonly docQualityAnalyzer: DocQualityAnalyzer;
  private readonly converter = new PdfToMarkdownConverter();

  constructor(config: SharePointLoaderConfig) {
    this.userId = config.userId;
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.selectedSites = config.selectedSites;
    this.accessManager = new DocumentAccessManager(config.supabase);
    this.vectorStore = new SupabaseVectorStore(config.supabase);
    this.docQualityAnalyzer = new DocQualityAnalyzer(config.supabase);
  }

  public async load(options?: { modifiedSince?: Date }): Promise<void> {
    try {
      console.log(
        '[SHAREPOINT LOADER] Starting SharePoint document loading...',
      );

      // Load Microsoft sites
      const sites = await this.loadSites();

      // Process each site
      for (const site of sites) {
        await this.processSite(site, options?.modifiedSince);
      }

      console.log('[SHAREPOINT LOADER] Completed SharePoint document loading');
    } catch (error) {
      console.error(
        '[SHAREPOINT LOADER] Error loading SharePoint documents:',
        error,
      );
      throw error;
    }
  }

  private async loadSites(): Promise<MicrosoftSite[]> {
    const sites: MicrosoftSite[] = [];

    const msApi = new MicrosoftApi(this.accessToken, this.refreshToken);

    for (const siteMetadata of this.selectedSites) {
      try {
        const site = await msApi.getSiteById(siteMetadata.id);

        if (site) {
          sites.push(site);
        }
      } catch (error) {
        console.error(
          `[SHAREPOINT LOADER] Error loading site ${siteMetadata.id}:`,
          error,
        );
      }
    }

    return sites;
  }

  private async processSite(
    site: MicrosoftSite,
    modifiedSince?: Date,
  ): Promise<void> {
    console.log(
      `[SHAREPOINT LOADER] Processing site: ${site.displayName} (${site.id})`,
    );

    try {
      // Get all drives for this site
      const drives = await site.getDrives();
      console.log(
        `[SHAREPOINT LOADER] Found ${drives.length} drives for site ${site.displayName}`,
      );

      // Process drives with concurrency limit
      const drivesProcessed = await Promise.allSettled(
        drives.map(async (drive, index) => {
          console.log(
            `[SHAREPOINT LOADER] Processing drive ${index + 1}/${drives.length}: ${drive.name} (${drive.id})`,
          );

          // Process the drive
          const files = await this.processDrive(
            drive,
            modifiedSince?.toISOString(),
          );

          console.log(
            `[SHAREPOINT LOADER] Found ${files.length} files in drive ${drive.name}`,
          );

          // Process files in batches
          await this.processFileBatches(files, site);

          console.log(
            `[SHAREPOINT LOADER] Completed processing drive ${index + 1}/${drives.length}: ${drive.name}`,
          );
          return drive;
        }),
      );

      for (const result of drivesProcessed) {
        if (result.status === 'rejected') {
          console.error(
            `[SHAREPOINT LOADER] Error processing drive: ${result.reason}`,
          );
        }
        if (result.status === 'fulfilled') {
          console.log(
            `[SHAREPOINT LOADER] Successfully processed drive: ${result.value.name}`,
          );
        }
      }

      console.log(
        `[SHAREPOINT LOADER] Completed processing site: ${site.displayName}`,
      );
    } catch (error) {
      console.error(
        `[SHAREPOINT LOADER] Error processing site ${site.id}:`,
        error,
      );
    }
  }

  private async processDrive(drive: MicrosoftDrive, token?: string) {
    const allFiles: ProcessedSharePointFile[] = [];

    let cursor = token;
    try {
      do {
        const { items, cursor: nextCursor } = await drive.getItems(cursor);
        const processedFiles = await this.processItems(items);

        allFiles.push(...processedFiles);

        cursor = nextCursor;
      } while (cursor);
    } catch (error) {
      console.error(
        `[SHAREPOINT LOADER] Error processing drive ${drive.id}:`,
        error,
      );
    }
    return allFiles;
  }

  private async processItems(items: MicrosoftDriveItem[]) {
    const allFiles: ProcessedSharePointFile[] = [];
    const itemsProcessingResult = await Promise.allSettled(
      items.map(async (item) => {
        if (!item.file?.mimeType) {
          console.log(
            `[SHAREPOINT LOADER] Skipping item ${item.name} - not a file`,
          );
          return;
        }

        // Skip small files early
        if (item.size < CONFIG.MIN_CONTENT_SIZE) {
          console.log(
            `[SHAREPOINT LOADER] Skipping item ${item.name} - too small (${item.size} bytes)`,
          );
          return;
        }

        const pdfContent = await item.getContent();
        if (!pdfContent) {
          return;
        }

        const processedFile: ProcessedSharePointFile = {
          id: item.id,
          name: item.name,
          webUrl: item.webUrl,
          siteId: item.parentReference.siteId,
          driveId: item.parentReference.driveId,
          folderId: item.parentReference.id,
          folderPath: item.path,
          lastModifiedDateTime: item.fileSystemInfo.lastModifiedDateTime,
          mimeType: item.file.mimeType,
          size: item.size,
          createdBy: item.createdBy?.user.id,
          lastModifiedBy: item.lastModifiedBy?.user.id,
          deleted: item.deleted?.state === 'deleted',
          content: pdfContent,
        };
        return processedFile;
      }),
    );
    for (const item of itemsProcessingResult) {
      if (item.status === 'fulfilled' && item.value) {
        allFiles.push(item.value);
        console.log(
          `[SHAREPOINT LOADER] Added file to process: ${item.value.name} (${item.value.size} bytes)`,
        );
      }
      if (item.status === 'rejected') {
        console.error(
          `[SHAREPOINT LOADER] Error processing file: ${item.reason}`,
        );
      }
    }
    return allFiles;
  }

  private async processFileBatches(
    files: ProcessedSharePointFile[],
    site: MicrosoftSite,
  ): Promise<void> {
    console.log(
      `[SHAREPOINT LOADER] Starting batch processing for ${files.length} files from site ${site.displayName}`,
    );

    const totalBatches = Math.ceil(files.length / CONFIG.BATCH_SIZE);
    const processedDocIds: number[] = [];

    // Process files in batches
    for (let i = 0; i < files.length; i += CONFIG.BATCH_SIZE) {
      const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
      console.log(
        `[SHAREPOINT LOADER] Processing batch ${batchNumber}/${totalBatches} (${i}-${Math.min(i + CONFIG.BATCH_SIZE - 1, files.length - 1)})`,
      );

      try {
        const batch = files.slice(i, i + CONFIG.BATCH_SIZE);

        // Get existing documents to determine whether to create/update
        console.log(
          `[SHAREPOINT LOADER] Checking for existing documents in batch ${batchNumber}/${totalBatches}`,
        );

        const existingDocs =
          await this.vectorStore.getExistingDocumentsBySourceId<SharePointDocumentMetadata>(
            batch.map((file) => file.id),
            'sharepoint',
            {
              site_id: site.id,
            },
          );

        // Classify files based on existing documents
        const { toStore, toDelete, toAddAccess } = this.classifyFiles(
          batch,
          existingDocs,
          site.id,
        );

        console.log(
          `[SHAREPOINT LOADER] Batch ${batchNumber}/${totalBatches} classification: ` +
            `${batch.length} files | ` +
            `${existingDocs.size} existing | ` +
            `${toStore.length} to store | ` +
            `${toAddAccess.length} to add access`,
        );

        // Handle access updates
        if (toAddAccess.length > 0) {
          console.log(
            `[SHAREPOINT LOADER] Adding access for ${toAddAccess.length} documents in batch ${batchNumber}/${totalBatches}`,
          );

          await this.accessManager.manageUserAccess(this.userId, 'add', {
            source: 'sharepoint',
            source_ids: toAddAccess.map((op) => op.id),
            metadata: {
              site_id: [site.id],
            },
          });

          console.log(
            `[SHAREPOINT LOADER] Successfully added access for ${toAddAccess.length} documents`,
          );
        }

        // Process content for new documents and create them
        if (toStore.length > 0) {
          console.log(
            `[SHAREPOINT LOADER] Creating ${toStore.length} new documents in batch ${batchNumber}/${totalBatches}`,
          );

          let createdCount = 0;
          const skippedCount = toStore.reduce(
            (count, file) =>
              count +
              (file.size < CONFIG.MIN_CONTENT_SIZE || !file.content ? 1 : 0),
            0,
          );

          const documentCreationResults = await Promise.allSettled(
            toStore
              .filter(
                (file) => file.size >= CONFIG.MIN_CONTENT_SIZE && file.content,
              )
              .map(async (file) => {
                // Convert to markdown
                console.log(
                  `[SHAREPOINT LOADER] Converting content for file: ${file.name} (${file.size} bytes)`,
                );
                const markdown = await this.processFileContent(file);
                file.content = undefined; // Release memory immediately after conversion
                if (!markdown) {
                  console.log(
                    `[SHAREPOINT LOADER] Skipping file ${file.name} - no content`,
                  );
                  return;
                }
                console.log(
                  `[SHAREPOINT LOADER] Storing document in vector store: ${file.name}`,
                );
                // Store document
                const result = await this.vectorStore.storeDocument({
                  title: file.name,
                  content: markdown,
                  hierarchy_path: file.folderPath ?? file.name,
                  source: 'sharepoint',
                  source_updated_at: file.lastModifiedDateTime,
                  source_id: file.id,
                  source_parent_id: file.folderId,
                  source_author_id: file.createdBy,
                  last_updated_source_user_id: file.lastModifiedBy,
                  metadata: {
                    url: file.webUrl,
                    site_id: file.siteId,
                    drive_id: file.driveId,
                    folder_path: file.folderPath,
                    mime_type: file.mimeType,
                    file_size: file.size,
                    version: new Date(file.lastModifiedDateTime)
                      .getTime()
                      .toString(),
                  },
                  user_ids_access: [this.userId],
                });

                if (result?.id) {
                  processedDocIds.push(result.id);
                }

                createdCount++;
                if (createdCount % 5 === 0 || createdCount === toStore.length) {
                  console.log(
                    `[SHAREPOINT LOADER] Progress: created ${createdCount}/${toStore.length} documents in batch ${batchNumber}/${totalBatches}`,
                  );
                }
              }),
          );

          for (const result of documentCreationResults) {
            if (result.status === 'rejected') {
              console.error(
                `[SHAREPOINT LOADER] Error processing file content: ${result.reason}`,
              );
            }
          }

          console.log(
            `[SHAREPOINT LOADER] Deleting ${toDelete.length} documents in batch ${batchNumber}/${totalBatches}`,
          );
          const deletionResults = await Promise.allSettled(
            toDelete.map((file) =>
              this.vectorStore.deleteDocumentBySource(
                file.id,
                'sharepoint',
                this.userId,
              ),
            ),
          );
          const successfulDeletions = deletionResults.filter(
            (result) => result.status === 'fulfilled' && result.value.deleted,
          ).length;
          console.log(
            `[SHAREPOINT LOADER] Successfully deleted ${successfulDeletions} documents`,
          );

          console.log(
            `[SHAREPOINT LOADER] Batch ${batchNumber}/${totalBatches} results: ` +
              `${createdCount} documents created, ${skippedCount} skipped`,
          );
        }

        console.log(
          `[SHAREPOINT LOADER] Completed batch ${batchNumber}/${totalBatches}`,
        );
      } catch (error) {
        console.error(
          `[SHAREPOINT LOADER] Error processing batch ${batchNumber}/${totalBatches}:`,
          error,
        );
        continue;
      }
    }

    if (processedDocIds.length > 0) {
      await this.docQualityAnalyzer.processDocuments(
        processedDocIds,
        this.userId,
      );
    }

    console.log(
      `[SHAREPOINT LOADER] Completed processing all ${totalBatches} batches for site ${site.displayName}`,
    );
  }

  private classifyFiles(
    files: ProcessedSharePointFile[],
    existingDocs: Map<
      string, // source_id
      {
        user_ids_access: string[];
        source_updated_at: string;
        version: string;
        site_id: string;
      }
    >,
    siteId: string,
  ): {
    toStore: ProcessedSharePointFile[];
    toDelete: ProcessedSharePointFile[];
    toAddAccess: AccessOperation[];
  } {
    const toStore: ProcessedSharePointFile[] = [];
    const toDelete: ProcessedSharePointFile[] = [];
    const toAddAccess: AccessOperation[] = [];

    files.forEach((file) => {
      const existingDoc = existingDocs.get(file.id);
      const currentVersion = new Date(file.lastModifiedDateTime)
        .getTime()
        .toString();

      if (file.deleted) {
        // If file is deleted, add to delete list
        toDelete.push(file);
        return;
      }

      if (!existingDoc) {
        // New document - create it
        toStore.push(file);
        return;
      }

      if (existingDoc.version === currentVersion) {
        // Same version - just update access if needed
        if (!existingDoc.user_ids_access.includes(this.userId)) {
          toAddAccess.push({
            id: file.id,
            siteId: siteId,
            version: currentVersion,
          });
        }
        return;
      }

      // Different version - update in place
      toStore.push(file);
    });

    return { toStore, toAddAccess, toDelete };
  }

  private async processFileContent(
    file: ProcessedSharePointFile,
  ): Promise<string | null> {
    if (!file.content || file.size < CONFIG.MIN_CONTENT_SIZE) {
      return null;
    }

    // Process file content in chunks if needed
    try {
      return await this.converter.convert(file.content);
    } catch (error) {
      console.error(
        `[SHAREPOINT LOADER] Error converting file ${file.name}:`,
        error,
      );
      return null;
    }
  }
}
