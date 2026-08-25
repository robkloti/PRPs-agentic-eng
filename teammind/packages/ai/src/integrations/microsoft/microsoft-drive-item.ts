import {
  MicrosoftDocumentMimeType,
  MicrosoftDriveItemMetaData,
} from '../../types';
import { MicrosoftBase } from './microsoft-base';

export class MicrosoftDriveItem extends MicrosoftBase {
  public id: string;
  public name: string;
  public path?: string;
  public webUrl: string;
  public size: number;
  public createdBy: {
    user: {
      id: string;
      displayName: string;
    };
  };
  public lastModifiedBy: {
    user: {
      id: string;
      displayName: string;
    };
  };
  public parentReference: {
    driveType: string;
    driveId: string;
    id: string;
    path: string;
    siteId: string;
  };
  public fileSystemInfo: {
    createdDateTime: string;
    lastModifiedDateTime: string;
  };
  public file?: {
    mimeType: MicrosoftDocumentMimeType;
  };
  public folder?: {
    childCount: number;
  };
  public deleted?: {
    state: string;
  };

  constructor(
    data: MicrosoftDriveItemMetaData,
    accessToken: string,
    refreshToken: string,
    baseUrl: string,
  ) {
    super(accessToken, refreshToken, baseUrl);
    this.id = data.id;
    this.name = data.name;
    this.webUrl = data.webUrl;
    this.size = data.size;
    this.createdBy = data.createdBy;
    this.lastModifiedBy = data.lastModifiedBy;
    this.parentReference = data.parentReference;
    this.fileSystemInfo = data.fileSystemInfo;
    this.file = data.file;
    this.folder = data.folder;
    this.deleted = data.deleted;
    this.path = this.extractPath(data.parentReference.path);
  }

  public isFile(): boolean {
    return !!this.file?.mimeType;
  }

  public isFolder(): boolean {
    return !!this.folder;
  }

  public async getItems() {
    if (!this.isFolder()) {
      return [];
    }

    const url = new URL(`${this.baseUrl}/children`);
    const items = await this.makeRequest<{
      value: MicrosoftDriveItemMetaData[];
    }>(url, {
      method: 'GET',
    });
    return items?.value.length
      ? items.value.map(
          (item) =>
            new MicrosoftDriveItem(
              item,
              this.accessToken,
              this.refreshToken,
              this.replaceItemId(item.id),
            ),
        )
      : [];
  }

  public async getContent() {
    if (!this.isFile()) {
      return undefined;
    }

    const url = new URL(`${this.baseUrl}/content?format=pdf`);
    const response = await fetch(url.toString(), {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
    });
    if (!response.ok) {
      await this.handleError(response);
    }
    return response.blob();
  }

  private replaceItemId(id: string) {
    return this.baseUrl.replace(/items\/[^/]+/, `items/${id}`);
  }

  private extractPath(parentReferencePath?: string) {
    const path = parentReferencePath?.split('/root:').slice(1);
    const pathParts = path?.[0]?.split('/').filter((part) => part !== '');
    return pathParts?.join('\\') ?? '';
  }
}
