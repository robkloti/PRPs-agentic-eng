import { drive_v3 } from 'googleapis';

import { GoogleBase } from '../google-base';
import { GoogleDriveItem } from './google-drive-item';
import { ALLOWED_MIME_TYPES } from './variables';

export interface GoogleDriveChange {
  fileId: string;
  removed: boolean;
  trashed: boolean; // Include trashed property
  file?: drive_v3.Schema$File;
  time: string;
}

interface GoogleDriveSearchCriteria {
  folderId?: string;
  modifiedAfter?: Date | string;
  mimeTypes?: string[];
  query?: string;
}

export class GoogleDrive extends GoogleBase {
  private drive;

  constructor(accessToken: string, refreshToken: string, userId: string) {
    super(accessToken, refreshToken, userId);
    this.drive = this.getDriveService();
  }

  public async listFiles(
    criteria?: GoogleDriveSearchCriteria,
    nextPageToken?: string,
  ) {
    // Build query string based on criteria
    let q = 'trashed = false';

    if (criteria?.modifiedAfter) {
      const modifiedTime = new Date(criteria.modifiedAfter).toISOString();
      q += ` and modifiedTime > '${modifiedTime}'`;
    }

    if (criteria?.query) {
      q += ` and name contains '${criteria.query}'`;
    }

    if (criteria?.mimeTypes && criteria.mimeTypes.length > 0) {
      const mimeTypeQueries = criteria.mimeTypes
        .map((type) => `mimeType = '${type}'`)
        .join(' or ');
      q += ` and (${mimeTypeQueries})`;
    } else if (!criteria?.folderId) {
      // Only apply mime type filtering when not looking for subfolders specifically
      const allowedTypes = ALLOWED_MIME_TYPES.map(
        (type) => `mimeType = '${type}'`,
      ).join(' or ');
      q += ` and (${allowedTypes})`;
    }

    if (criteria?.folderId) {
      if (criteria.folderId === 'root') {
        q += " and 'root' in parents";
      } else {
        q += ` and '${criteria.folderId}' in parents`;
      }
    }

    try {
      const response = await this.drive.files.list({
        q,
        pageToken: nextPageToken,
        pageSize: 100,
        fields:
          'nextPageToken, files(id, name, mimeType, webViewLink, createdTime, modifiedTime, size, parents, webContentLink, owners)',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
      });

      const items = (response.data.files ?? []).map(
        (file) =>
          new GoogleDriveItem(
            file,
            this.accessToken,
            this.refreshToken,
            this.userId,
          ),
      );

      return {
        items,
        nextPageToken: response.data.nextPageToken,
      };
    } catch (error) {
      console.error('Error listing files:', error);
      throw error;
    }
  }

  public async getFileById(fileId: string) {
    try {
      const response = await this.drive.files.get({
        fileId,
        fields:
          'id, name, mimeType, webViewLink, createdTime, modifiedTime, size, parents, webContentLink, owners',
        supportsAllDrives: true,
      });

      return new GoogleDriveItem(
        response.data,
        this.accessToken,
        this.refreshToken,
        this.userId,
      );
    } catch (error) {
      console.error(`Error getting file by ID ${fileId}:`, error);
      throw error;
    }
  }

  // Helper method to find all files within a folder and its subfolders
  public async getAllFilesInFolder(
    folderId: string,
    mimeTypes?: string[],
  ): Promise<GoogleDriveItem[]> {
    const allFiles: GoogleDriveItem[] = [];
    const processedFolders = new Set<string>();
    const foldersToProcess: string[] = [folderId];

    while (foldersToProcess.length > 0) {
      const currentFolderId = foldersToProcess.shift()!;

      // Skip if we've already processed this folder
      if (processedFolders.has(currentFolderId)) {
        continue;
      }

      processedFolders.add(currentFolderId);

      // Get all items in the current folder
      const { items } = await this.listFiles({
        folderId: currentFolderId,
      });

      // Add files to the result and subfolders to processing queue
      for (const item of items) {
        if (item.isFolder()) {
          foldersToProcess.push(item.id);
        } else if (!mimeTypes || mimeTypes.includes(item.mimeType)) {
          allFiles.push(item);
        }
      }
    }

    return allFiles;
  }

  public async listChanges(startPageToken?: string) {
    if (!startPageToken) {
      return this.getStartPageToken();
    }

    try {
      const response = await this.drive.changes.list({
        pageToken: startPageToken,
        pageSize: 100,
        fields:
          'nextPageToken, newStartPageToken, changes(fileId, file(id, name, mimeType, webViewLink, createdTime, modifiedTime, size, parents, webContentLink, owners, trashed), removed, time)',
        includeItemsFromAllDrives: true,
        supportsAllDrives: true,
        includeRemoved: true,
      });

      const changes = (response.data.changes ?? []).map(
        (change) =>
          ({
            fileId: change.fileId!,
            removed: change.removed ?? false,
            trashed: change.file?.trashed ?? false,
            time: change.time!,
            file: change.file
              ? new GoogleDriveItem(
                  change.file,
                  this.accessToken,
                  this.refreshToken,
                  this.userId,
                )
              : undefined,
          }) as GoogleDriveChange,
      );

      return {
        changes,
        nextPageToken: response.data.nextPageToken,
        newStartPageToken: response.data.newStartPageToken,
      };
    } catch (error) {
      console.error('Error listing changes:', error);
      throw error;
    }
  }

  // Get the current page token to start tracking changes
  public async getStartPageToken() {
    try {
      const response = await this.drive.changes.getStartPageToken({
        supportsAllDrives: true,
      });

      return {
        changes: [],
        nextPageToken: undefined,
        newStartPageToken: response.data.startPageToken!,
      };
    } catch (error) {
      console.error('Error getting start page token:', error);
      throw error;
    }
  }
}
