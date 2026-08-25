import { drive_v3 } from 'googleapis';

import {
  GotenbergClient,
  SUPPORTED_OFFICE_FORMATS,
} from '../../../file-converters/gotenberg-converter';
import { GoogleDocumentMimeType } from '../../../types/google';
import { GoogleBase } from '../google-base';

export class GoogleDriveItem extends GoogleBase {
  private drive;

  // Store the original file data
  private fileData: drive_v3.Schema$File;

  constructor(
    data: drive_v3.Schema$File,
    accessToken: string,
    refreshToken: string,
    userId: string,
  ) {
    super(accessToken, refreshToken, userId);
    this.drive = this.getDriveService();
    this.fileData = data;
  }

  // Provide getters for commonly used properties
  get id(): string {
    return this.fileData.id!;
  }
  get name(): string {
    return this.fileData.name!;
  }
  get mimeType(): GoogleDocumentMimeType {
    return this.fileData.mimeType as GoogleDocumentMimeType;
  }
  get webViewLink(): string {
    return this.fileData.webViewLink!;
  }
  get webContentLink(): string | undefined {
    return this.fileData.webContentLink ?? undefined;
  }
  get createdTime(): string {
    return this.fileData.createdTime!;
  }
  get modifiedTime(): string {
    return this.fileData.modifiedTime!;
  }
  get size(): string | undefined {
    return this.fileData.size ?? undefined;
  }
  get parents(): string[] | undefined {
    return this.fileData.parents ?? undefined;
  }
  get owners(): drive_v3.Schema$User[] | undefined {
    return this.fileData.owners ?? undefined;
  }
  get trashed(): boolean {
    return this.fileData.trashed ?? false;
  }

  // Original methods remain the same
  public isGoogleDocument(): boolean {
    return (
      this.mimeType === 'application/vnd.google-apps.document' ||
      this.mimeType === 'application/vnd.google-apps.spreadsheet' ||
      this.mimeType === 'application/vnd.google-apps.presentation'
    );
  }

  public isFolder(): boolean {
    return this.mimeType === 'application/vnd.google-apps.folder';
  }

  public isConvertibleDocument(): boolean {
    return SUPPORTED_OFFICE_FORMATS.includes(this.mimeType);
  }

  public async getContent(): Promise<Blob | null> {
    try {
      let response;

      if (this.isGoogleDocument()) {
        // For Google Docs, Sheets, and Slides, export as PDF via Google API
        response = await this.drive.files.export(
          {
            fileId: this.id,
            mimeType: 'application/pdf',
          },
          {
            responseType: 'arraybuffer',
          },
        );
      } else {
        // For other file types, get the file content directly
        response = await this.drive.files.get(
          {
            fileId: this.id,
            alt: 'media',
            supportsAllDrives: true,
          },
          {
            responseType: 'arraybuffer',
          },
        );
      }

      const contentBlob = new Blob([response.data as ArrayBuffer], {
        type: this.isGoogleDocument() ? 'application/pdf' : this.mimeType,
      });

      // If conversion is requested and this is a convertible file type
      if (this.isConvertibleDocument()) {
        return await this.convertToPdf(contentBlob);
      }

      return contentBlob;
    } catch (error) {
      console.error(`Error fetching content for file ${this.id}:`, error);
      return null;
    }
  }

  private async convertToPdf(blob: Blob): Promise<Blob> {
    try {
      console.log(
        `Converting file ${this.name} (${this.id}) to PDF using Gotenberg`,
      );

      // Use the shared Gotenberg client for conversion
      const pdfStream = await GotenbergClient.convertOfficeToPdf(
        blob,
        this.mimeType,
      );

      // Convert the stream to a blob
      return await GotenbergClient.streamToBlob(pdfStream);
    } catch (error) {
      console.error(`Error converting file ${this.id} to PDF:`, error);
      throw error;
    }
  }

  public async getFolderPath(): Promise<string> {
    if (!this.parents || this.parents.length === 0) {
      return '';
    }

    try {
      // Get the parent folder
      const response = await this.drive.files.get({
        fileId: this.parents[0],
        fields: 'id, name, parents',
        supportsAllDrives: true,
      });

      const parent = response.data;

      // Recursively get the parent's path
      const parentItem = new GoogleDriveItem(
        {
          id: parent.id!,
          name: parent.name!,
          parents: parent.parents,
          mimeType: 'application/vnd.google-apps.folder',
          createdTime: '',
          modifiedTime: '',
          webViewLink: '',
        },
        this.accessToken,
        this.refreshToken,
        this.userId,
      );

      const parentPath = await parentItem.getFolderPath();
      return parentPath ? `${parentPath}\\${parent.name}` : parent.name!;
    } catch (error) {
      console.error(`Error getting folder path for file ${this.id}:`, error);
      return '';
    }
  }
}
