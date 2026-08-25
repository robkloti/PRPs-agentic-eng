import {
  MicrosoftDriveItemMetaData,
  MicrosoftDriveMetaData,
} from '../../types';
import { MicrosoftBase } from './microsoft-base';
import { MicrosoftDriveItem } from './microsoft-drive-item';
import { DRIVE_ITEM_SELECTS, allowedDocumentMimeTypes } from './variables';

export class MicrosoftDrive extends MicrosoftBase {
  id: string;
  name: string;
  description: string;
  webUrl: string;
  driveType: string;

  constructor(
    data: MicrosoftDriveMetaData,
    accessToken: string,
    refreshToken: string,
    baseUrl: string,
  ) {
    super(accessToken, refreshToken, baseUrl);
    this.id = data.id;
    this.name = data.name;
    this.description = data.description;
    this.webUrl = data.webUrl;
    this.driveType = data.driveType;
  }

  public async getItems(token?: string) {
    const url = new URL(
      `${this.baseUrl}/root/delta?$select=${DRIVE_ITEM_SELECTS}${token ? `&token=${token}` : ''}`,
    );
    const response = await this.makeRequest<{
      value: MicrosoftDriveItemMetaData[];
      '@odata.nextLink': string;
    }>(url, {
      method: 'GET',
    });
    const cursor = response?.['@odata.nextLink'];
    const items = response?.value.length
      ? response.value
          .filter((item) => {
            if (!item.file?.mimeType) {
              return false;
            }

            return allowedDocumentMimeTypes.includes(item.file.mimeType);
          })
          .map(
            (item) =>
              new MicrosoftDriveItem(
                item,
                this.accessToken,
                this.refreshToken,
                `${this.baseUrl}/items/${item.id}`,
              ),
          )
      : [];

    return {
      items,
      cursor,
    };
  }

  public async getItemById(itemId: string): Promise<MicrosoftDriveItem | null> {
    const url = new URL(
      `${this.baseUrl}/items/${itemId}?$select=${DRIVE_ITEM_SELECTS}`,
    );
    const item = await this.makeRequest<MicrosoftDriveItemMetaData>(url, {
      method: 'GET',
    });
    return item
      ? new MicrosoftDriveItem(
          item,
          this.accessToken,
          this.refreshToken,
          `${this.baseUrl}/items/${item.id}`,
        )
      : null;
  }
}
