import { MicrosoftDriveMetaData } from '../../types';
import { MicrosoftBase } from './microsoft-base';
import { MicrosoftDrive } from './microsoft-drive';
import { DRIVES_SELECTS } from './variables';

export class MicrosoftDriveable extends MicrosoftBase {
  constructor(accessToken: string, refreshToken: string, baseUrl: string) {
    super(accessToken, refreshToken, baseUrl);
  }
  public async getDrives(): Promise<MicrosoftDrive[]> {
    const url = new URL(`${this.baseUrl}/drives?$select=${DRIVES_SELECTS}`);
    const drives = await this.makeRequest<{ value: MicrosoftDriveMetaData[] }>(
      url,
      {
        method: 'GET',
      },
    );

    return (
      drives?.value?.map(
        (drive) =>
          new MicrosoftDrive(
            drive,
            this.accessToken,
            this.refreshToken,
            `${this.baseUrl}/drives/${drive.id}`,
          ),
      ) || []
    );
  }

  public async getDriveById(driveId: string): Promise<MicrosoftDrive | null> {
    const url = new URL(
      `${this.baseUrl}/drives/${driveId}?$select=${DRIVES_SELECTS}`,
    );
    const drive = await this.makeRequest<MicrosoftDriveMetaData>(url, {
      method: 'GET',
    });
    return drive
      ? new MicrosoftDrive(
          drive,
          this.accessToken,
          this.refreshToken,
          `${this.baseUrl}/drives/${drive.id}`,
        )
      : null;
  }
}
