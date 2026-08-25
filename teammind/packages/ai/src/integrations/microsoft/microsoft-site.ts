import { MicrosoftSiteMetaData } from '../../types';
import { MicrosoftDriveable } from './microsoft-driveable';

export class MicrosoftSite extends MicrosoftDriveable {
  public id: string;
  public name: string;
  public displayName: string;
  public webUrl: string;

  constructor(
    data: MicrosoftSiteMetaData,
    accessToken: string,
    refreshToken: string,
    baseUrl: string,
  ) {
    super(accessToken, refreshToken, baseUrl);
    this.id = data.id;
    this.name = data.name;
    this.displayName = data.displayName;
    this.webUrl = data.webUrl;
  }

  public getMetadata(): MicrosoftSiteMetaData {
    return {
      id: this.id,
      name: this.name,
      displayName: this.displayName,
      webUrl: this.webUrl,
    };
  }
}
