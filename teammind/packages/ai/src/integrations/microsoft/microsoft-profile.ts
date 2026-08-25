import { MicrosoftProfileMetaData } from '../../types';
import { MicrosoftDriveable } from './microsoft-driveable';

export class MicrosoftProfile extends MicrosoftDriveable {
  public id: string;
  public displayName: string;
  public email: string;

  constructor(
    data: MicrosoftProfileMetaData,
    accessToken: string,
    refreshToken: string,
    baseUrl: string,
  ) {
    super(accessToken, refreshToken, baseUrl);
    this.id = data.id;
    this.displayName = data.displayName;
    this.email = data.mail;
  }
}
