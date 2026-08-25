import { SupabaseClient } from '@supabase/supabase-js';

import { drive_v3 } from 'googleapis';

import { Database } from '@tm/supabase/database';

import { DocQualityAnalyzer } from '../../../agents';
import { PdfToMarkdownConverter } from '../../../file-converters';
import { DocumentAccessManager, SupabaseVectorStore } from '../../../storage';
import { GoogleDriveDocumentMetadata } from '../../../types';
import { GoogleDrive, GoogleDriveChange } from './google-drive';
import { GoogleDriveItem } from './google-drive-item';
import { ALLOWED_MIME_TYPES, CONFIG } from './variables';

interface GoogleDriveLoaderConfig {
  userId: string;
  accessToken: string;
  refreshToken: string;
  supabase: SupabaseClient<Database>;
  selectedFolders?: Array<{ id: string; name: string; path?: string }>;
}

export class GoogleDriveLoader {
  private readonly userId: string;
  private readonly accessToken: string;
  private readonly refreshToken: string;
  private readonly supabase: SupabaseClient<Database>;
  private readonly vectorStore: SupabaseVectorStore;
  private readonly accessManager: DocumentAccessManager;
  private readonly docQualityAnalyzer: DocQualityAnalyzer;
  private readonly converter = new PdfToMarkdownConverter();
  private readonly selectedFolders?: Array<{
    id: string;
    name: string;
    path?: string;
  }>;

  constructor(config: GoogleDriveLoaderConfig) {
    this.userId = config.userId;
    this.accessToken = config.accessToken;
    this.refreshToken = config.refreshToken;
    this.supabase = config.supabase;
    this.accessManager = new DocumentAccessManager(config.supabase);
    this.vectorStore = new SupabaseVectorStore(config.supabase);
    this.docQualityAnalyzer = new DocQualityAnalyzer(config.supabase);
    this.selectedFolders = config.selectedFolders;
  }

  public async load(options?: { startPageToken?: string }): Promise<void> {
    try {
      console.log(
        '[GOOGLE DRIVE LOADER] Starting Google Drive document loading...',
      );

      const drive = new GoogleDrive(
        this.accessToken,
        this.refreshToken,
        this.userId,
      );

      // If we have a startPageToken, use Changes API
      if (options?.startPageToken) {
        console.log(
          '[GOOGLE DRIVE LOADER] Using Changes API with token',
          options.startPageToken,
        );

        // Get changes since last sync
        const { newStartPageToken, changes } = await drive.listChanges(
          options.startPageToken,
        );

        // Filter changes based on selected folders if applicable
        let relevantChanges = changes;
        if (this.selectedFolders && this.selectedFolders.length > 0) {
          const selectedFolderIds = this.selectedFolders.map(
            (folder) => folder.id,
          );
          relevantChanges = await this.filterChangesBySelectedFolders(
            drive,
            changes,
            selectedFolderIds,
          );
          console.log(
            `[GOOGLE DRIVE LOADER] Filtered to ${relevantChanges.length} changes in selected folders`,
          );
        }

        // Process all changes (deleted/trashed and modified/added)
        await this.processChanges(relevantChanges);

        // Save the new start token for next time - ensure it's not null/undefined
        if (newStartPageToken) {
          await this.updateStartPageToken(newStartPageToken);
        } else {
          console.error(
            '[GOOGLE DRIVE LOADER] No new start page token received',
          );
        }

        console.log(
          '[GOOGLE DRIVE LOADER] Completed Google Drive document loading via Changes API',
        );
        return;
      }

      // No startPageToken, this is the initial sync
      const { newStartPageToken } = await drive.getStartPageToken();

      // Ensure newStartPageToken is not null/undefined before using it
      if (newStartPageToken) {
        console.log(
          '[GOOGLE DRIVE LOADER] First sync - saving start token for future syncs:',
          newStartPageToken,
        );

        // Save the token for next time
        await this.updateStartPageToken(newStartPageToken);
      } else {
        console.error(
          '[GOOGLE DRIVE LOADER] No start page token received during initial sync',
        );
      }

      // Process selected folders or the entire drive for initial sync
      if (this.selectedFolders && this.selectedFolders.length > 0) {
        await this.processSelectedFolders(drive);
      } else {
        await this.processAllFiles(drive);
      }

      console.log(
        '[GOOGLE DRIVE LOADER] Completed initial Google Drive document loading',
      );
    } catch (error) {
      console.error(
        '[GOOGLE DRIVE LOADER] Error loading Google Drive documents:',
        error,
      );
      throw error;
    }
  }

  // Process all changes - handles both deleted/trashed and modified files
  private async processChanges(changes: GoogleDriveChange[]): Promise<void> {
    // 1. Process deleted or trashed files
    const deletedFileIds = changes
      .filter(
        (change) =>
          change.removed ||
          change.trashed ||
          (change.file && change.file.trashed === true),
      )
      .map((change) => change.fileId);

    if (deletedFileIds.length > 0) {
      console.log(
        `[GOOGLE DRIVE LOADER] Processing ${deletedFileIds.length} deleted/trashed files`,
      );
      await this.processDeletedFiles(deletedFileIds);
    }

    // 2. Process added/modified files (that are not deleted or trashed)
    const filesToProcess = changes
      .filter(
        (change) =>
          !change.removed &&
          !change.trashed &&
          change.file &&
          !change.file.trashed,
      )
      .filter((change) => this.isFileSuitable(change.file!))
      .map((change) => change.file!);

    if (filesToProcess.length > 0) {
      console.log(
        `[GOOGLE DRIVE LOADER] Processing ${filesToProcess.length} new/modified files`,
      );
      await this.processFiles(filesToProcess);
    }
  }

  // Check if a file meets our requirements
  private isFileSuitable(file: drive_v3.Schema$File): boolean {
    // Skip folders
    if (file.mimeType === 'application/vnd.google-apps.folder') return false;

    // Check mime type
    if (
      !ALLOWED_MIME_TYPES.includes(
        file.mimeType as (typeof ALLOWED_MIME_TYPES)[number],
      )
    )
      return false;

    // Check file size (if available)
    const size = file.size ? parseInt(file.size, 10) : 0;
    if (size < CONFIG.MIN_CONTENT_SIZE) {
      console.log(
        `[GOOGLE DRIVE LOADER] Skipping file ${file.name} - too small (${size} bytes)`,
      );
      return false;
    }

    return true;
  }

  // Process deleted files
  private async processDeletedFiles(fileIds: string[]): Promise<void> {
    if (fileIds.length === 0) return;

    console.log(
      `[GOOGLE DRIVE LOADER] Removing access to ${fileIds.length} deleted/trashed files`,
    );

    // Remove user access to these files
    await this.accessManager.manageUserAccess(this.userId, 'remove', {
      source: 'google_drive',
      source_ids: fileIds,
    });

    console.log(
      `[GOOGLE DRIVE LOADER] Successfully removed access to deleted/trashed files`,
    );
  }

  // Filter changes based on selected folders
  private async filterChangesBySelectedFolders(
    drive: GoogleDrive,
    changes: GoogleDriveChange[],
    selectedFolderIds: string[],
  ): Promise<GoogleDriveChange[]> {
    // For removed/trashed files, we include all as we need to clean up
    const removedChanges = changes.filter(
      (change) =>
        change.removed ||
        change.trashed ||
        (change.file && change.file.trashed === true),
    );

    // For files with content, check if they're in our selected folders
    const fileChanges = changes.filter(
      (change) =>
        !change.removed &&
        !change.trashed &&
        change.file &&
        !change.file.trashed,
    );

    const relevantFileChanges: GoogleDriveChange[] = [];

    for (const change of fileChanges) {
      if (!change.file) continue;

      try {
        // Skip folders as we don't index them
        if (change.file.mimeType === 'application/vnd.google-apps.folder')
          continue;

        // Skip files with unsupported mime types
        if (
          !ALLOWED_MIME_TYPES.includes(
            change.file.mimeType as (typeof ALLOWED_MIME_TYPES)[number],
          )
        )
          continue;

        // Check if file is in any of our selected folders
        const driveItem = new GoogleDriveItem(
          change.file,
          this.accessToken,
          this.refreshToken,
          this.userId,
        );
        if (
          await this.isFileInSelectedFolders(
            drive,
            driveItem,
            selectedFolderIds,
          )
        ) {
          relevantFileChanges.push(change);
        }
      } catch (error) {
        console.error(
          `[GOOGLE DRIVE LOADER] Error checking file path for ${change.fileId}:`,
          error,
        );
      }
    }

    return [...removedChanges, ...relevantFileChanges];
  }

  // Check if a file is within any of the selected folders or their subfolders
  private async isFileInSelectedFolders(
    drive: GoogleDrive,
    file: GoogleDriveItem,
    selectedFolderIds: string[],
  ): Promise<boolean> {
    if (!file.parents || file.parents.length === 0) {
      return false;
    }

    // Check if any direct parent is in our selected folders
    for (const parentId of file.parents) {
      if (selectedFolderIds.includes(parentId)) {
        return true;
      }
    }

    // Recursively check parent folders
    for (const parentId of file.parents) {
      try {
        const parent = await drive.getFileById(parentId);
        if (
          await this.isFileInSelectedFolders(drive, parent, selectedFolderIds)
        ) {
          return true;
        }
      } catch (error) {
        console.error(
          `[GOOGLE DRIVE LOADER] Error fetching parent folder ${parentId}:`,
          error,
        );
      }
    }

    return false;
  }

  // Update the start page token in the database
  private async updateStartPageToken(token: string): Promise<void> {
    try {
      const { error } = await this.supabase
        .from('google_config')
        .update({ change_page_token: token })
        .eq('user_id', this.userId);

      if (error) {
        console.error(
          '[GOOGLE DRIVE LOADER] Error updating change page token:',
          error,
        );
      }
    } catch (error) {
      console.error(
        '[GOOGLE DRIVE LOADER] Error updating change page token:',
        error,
      );
    }
  }

  // Process selected folders
  private async processSelectedFolders(drive: GoogleDrive): Promise<void> {
    if (!this.selectedFolders || this.selectedFolders.length === 0) {
      return;
    }

    console.log(
      `[GOOGLE DRIVE LOADER] Processing ${this.selectedFolders.length} selected folders`,
    );

    for (const folder of this.selectedFolders) {
      console.log(
        `[GOOGLE DRIVE LOADER] Processing folder: ${folder.name} (${folder.id})`,
      );

      try {
        // Get all files from the folder and its subfolders
        const folderFiles = await drive.getAllFilesInFolder(folder.id);
        console.log(
          `[GOOGLE DRIVE LOADER] Found ${folderFiles.length} files in folder ${folder.name}`,
        );

        // Filter out unsuitable files
        const suitableFiles = folderFiles
          .filter((item) => !item.isFolder())
          .filter((item) => this.isAllowedMimeType(item.mimeType))
          .filter(
            (item) =>
              !item.size || parseInt(item.size, 10) >= CONFIG.MIN_CONTENT_SIZE,
          );

        if (suitableFiles.length > 0) {
          // Convert GoogleDriveItems to drive_v3.Schema$File to process
          const filesToProcess = suitableFiles.map((item) => ({
            id: item.id,
            name: item.name,
            mimeType: item.mimeType,
            webViewLink: item.webViewLink,
            webContentLink: item.webContentLink,
            createdTime: item.createdTime,
            modifiedTime: item.modifiedTime,
            size: item.size,
            parents: item.parents,
            owners: item.owners,
            trashed: false, // We know these aren't trashed as they came from folder listing
          }));

          console.log(
            `[GOOGLE DRIVE LOADER] Processing ${filesToProcess.length} suitable files from folder ${folder.name}`,
          );
          await this.processFiles(filesToProcess, folder.id, folder.path);
        }
      } catch (error) {
        console.error(
          `[GOOGLE DRIVE LOADER] Error processing folder ${folder.id}:`,
          error,
        );
      }
    }
  }

  // Process all files in Google Drive
  private async processAllFiles(drive: GoogleDrive): Promise<void> {
    console.log('[GOOGLE DRIVE LOADER] Processing entire Google Drive');

    let nextPageToken: string | undefined;
    let pageCount = 0;
    const processedDocIds: number[] = [];

    try {
      do {
        pageCount++;
        console.log(`[GOOGLE DRIVE LOADER] Fetching files page ${pageCount}`);

        const { items, nextPageToken: newNextPageToken } =
          await drive.listFiles({}, nextPageToken);
        console.log(
          `[GOOGLE DRIVE LOADER] Found ${items.length} files on page ${pageCount}`,
        );

        // Convert GoogleDriveItems to drive_v3.Schema$File objects
        const filesToProcess = items
          .filter((item) => !item.isFolder())
          .filter((item) => this.isAllowedMimeType(item.mimeType))
          .filter(
            (item) =>
              !item.size || parseInt(item.size, 10) >= CONFIG.MIN_CONTENT_SIZE,
          )
          .map((item) => ({
            id: item.id,
            name: item.name,
            mimeType: item.mimeType,
            webViewLink: item.webViewLink,
            webContentLink: item.webContentLink,
            createdTime: item.createdTime,
            modifiedTime: item.modifiedTime,
            size: item.size,
            parents: item.parents,
            owners: item.owners,
            trashed: false,
          }));

        if (filesToProcess.length > 0) {
          console.log(
            `[GOOGLE DRIVE LOADER] Processing ${filesToProcess.length} suitable files from page ${pageCount}`,
          );
          const docIds = await this.processFiles(filesToProcess);
          processedDocIds.push(...docIds);
        }

        nextPageToken = newNextPageToken ?? undefined;
      } while (nextPageToken);

      // Process quality for all documents in one batch
      if (processedDocIds.length > 0) {
        await this.docQualityAnalyzer.processDocuments(
          processedDocIds,
          this.userId,
        );
      }

      console.log(
        '[GOOGLE DRIVE LOADER] Completed processing all files from Google Drive',
      );
    } catch (error) {
      console.error(
        '[GOOGLE DRIVE LOADER] Error processing Google Drive:',
        error,
      );
      throw error;
    }
  }

  // Process a batch of files
  private async processFiles(
    files: drive_v3.Schema$File[],
    folderId?: string,
    folderPath?: string,
  ): Promise<number[]> {
    const processedDocIds: number[] = [];

    // Get existing documents to determine create/update status
    console.log(
      `[GOOGLE DRIVE LOADER] Checking for existing documents (${files.length} files)`,
    );
    const existingDocs =
      await this.vectorStore.getExistingDocumentsBySourceId<GoogleDriveDocumentMetadata>(
        files.map((file) => file.id!),
        'google_drive',
      );

    // Process files in batches
    for (let i = 0; i < files.length; i += CONFIG.BATCH_SIZE) {
      const batchNumber = Math.floor(i / CONFIG.BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(files.length / CONFIG.BATCH_SIZE);
      const batch = files.slice(i, i + CONFIG.BATCH_SIZE);

      console.log(
        `[GOOGLE DRIVE LOADER] Processing batch ${batchNumber}/${totalBatches} (${i}-${Math.min(i + CONFIG.BATCH_SIZE - 1, files.length - 1)})`,
      );

      // Classify files based on existing documents
      const { toStore, toAddAccess } = this.classifyFiles(batch, existingDocs);

      console.log(
        `[GOOGLE DRIVE LOADER] Batch ${batchNumber}/${totalBatches} classification: ` +
          `${batch.length} files | ` +
          `${existingDocs.size} existing | ` +
          `${toStore.length} to store | ` +
          `${toAddAccess.length} to add access`,
      );

      // Handle access updates
      if (toAddAccess.length > 0) {
        console.log(
          `[GOOGLE DRIVE LOADER] Adding access for ${toAddAccess.length} documents in batch ${batchNumber}/${totalBatches}`,
        );

        await this.accessManager.manageUserAccess(this.userId, 'add', {
          source: 'google_drive',
          source_ids: toAddAccess,
        });

        console.log(
          `[GOOGLE DRIVE LOADER] Successfully added access for ${toAddAccess.length} documents`,
        );
      }

      // Process new or updated files
      if (toStore.length > 0) {
        console.log(
          `[GOOGLE DRIVE LOADER] Creating/updating ${toStore.length} documents in batch ${batchNumber}/${totalBatches}`,
        );

        const batchDocIds = await this.storeFiles(
          toStore,
          folderId,
          folderPath,
        );
        processedDocIds.push(...batchDocIds);

        console.log(
          `[GOOGLE DRIVE LOADER] Completed batch ${batchNumber}/${totalBatches}`,
        );
      }
    }

    // Process quality for this batch
    if (processedDocIds.length > 0) {
      await this.docQualityAnalyzer.processDocuments(
        processedDocIds,
        this.userId,
      );
    }

    return processedDocIds;
  }

  // Store files in vector store
  private async storeFiles(
    files: drive_v3.Schema$File[],
    folderId?: string,
    folderPath?: string,
  ): Promise<number[]> {
    const docIds: number[] = [];
    let processedCount = 0;

    await Promise.allSettled(
      files.map(async (file) => {
        try {
          // Create GoogleDriveItem to get content
          const driveItem = new GoogleDriveItem(
            file,
            this.accessToken,
            this.refreshToken,
            this.userId,
          );

          // Get content as blob
          const content = await driveItem.getContent();
          if (!content) {
            console.log(
              `[GOOGLE DRIVE LOADER] Failed to get content for file: ${file.name}`,
            );
            return null;
          }

          // Convert to markdown
          const markdown = await this.converter.convert(content);
          if (!markdown) {
            console.log(
              `[GOOGLE DRIVE LOADER] Failed to convert file to markdown: ${file.name}`,
            );
            return null;
          }

          // Get folder path
          let itemFolderPath = folderPath;
          if (!itemFolderPath) {
            itemFolderPath = await driveItem.getFolderPath();
          }

          // Create document in vector store
          const size = file.size ? parseInt(file.size, 10) : 0;
          const version = new Date(file.modifiedTime!).getTime().toString();

          const result = await this.vectorStore.storeDocument({
            title: file.name!,
            content: markdown,
            hierarchy_path: itemFolderPath ?? file.name!,
            source: 'google_drive',
            source_updated_at: file.modifiedTime!,
            source_id: file.id!,
            source_parent_id:
              folderId ?? (file.parents ? file.parents[0] : undefined),
            source_author_id: file.owners?.[0]?.emailAddress ?? undefined,
            last_updated_source_user_id:
              file.owners?.[0]?.emailAddress ?? undefined,
            metadata: {
              url: file.webViewLink!,
              mime_type: file.mimeType!,
              file_size: size,
              version: version,
              folder_path: itemFolderPath,
              folder_id:
                folderId ?? (file.parents ? file.parents[0] : undefined),
            },
            user_ids_access: [this.userId],
          });

          if (result?.id) {
            docIds.push(result.id);
          }

          processedCount++;
          if (processedCount % 5 === 0 || processedCount === files.length) {
            console.log(
              `[GOOGLE DRIVE LOADER] Progress: processed ${processedCount}/${files.length} documents`,
            );
          }

          return result?.id;
        } catch (error) {
          console.error(
            `[GOOGLE DRIVE LOADER] Error processing file ${file.id}:`,
            error,
          );
          return null;
        }
      }),
    );

    return docIds;
  }

  // Classify files based on existing documents
  private classifyFiles(
    files: drive_v3.Schema$File[],
    existingDocs: Map<
      string,
      {
        user_ids_access: string[];
        source_updated_at: string;
        version: string;
      }
    >,
  ): {
    toStore: drive_v3.Schema$File[];
    toAddAccess: string[];
  } {
    const toStore: drive_v3.Schema$File[] = [];
    const toAddAccess: string[] = [];

    files.forEach((file) => {
      if (!file.id) return;

      const existingDoc = existingDocs.get(file.id);
      const currentVersion = new Date(file.modifiedTime!).getTime().toString();

      if (!existingDoc) {
        // New document - create it
        toStore.push(file);
        return;
      }

      if (existingDoc.version === currentVersion) {
        // Same version - just update access if needed
        if (!existingDoc.user_ids_access.includes(this.userId)) {
          toAddAccess.push(file.id);
        }
        return;
      }

      // Different version - update in place
      toStore.push(file);
    });

    return { toStore, toAddAccess };
  }

  // Check if this is an allowed mime type
  private isAllowedMimeType(mimeType: string): boolean {
    return ALLOWED_MIME_TYPES.includes(
      mimeType as (typeof ALLOWED_MIME_TYPES)[number],
    );
  }
}
