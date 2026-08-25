import { allowedDocumentMimeTypes } from '../integrations/microsoft/variables';
import { ConvertedContent } from './document';

export type MicrosoftRequestConfig = {
  accessToken: string;
  refreshToken: string;
};

export type MicrosoftTokenResponse = {
  token_type: string;
  scope?: string;
  expires_in: number;
  ext_expires_in?: number;
  access_token: string;
  refresh_token: string;
  id_token: string;
};

export type MicrosoftScopes =
  | 'User.Read'
  | 'openid'
  | 'profile'
  | 'email'
  | 'offline_access'
  | 'Files.Read'
  | 'Files.Read.All'
  | 'Sites.Read.All';

export type MicrosoftApiError = {
  error: {
    code: string;
    message: string;
    innerError: {
      date: string;
      'request-id': string;
      'client-request-id': string;
    };
  };
};

export type MicrosoftDocumentMimeType =
  (typeof allowedDocumentMimeTypes)[number];

export type MicrosoftProfileMetaData = {
  id: string;
  displayName: string;
  mail: string;
};

export type MicrosoftSiteMetaData = {
  id: string;
  name: string;
  displayName: string;
  webUrl: string;
};

export type MicrosoftDriveMetaData = {
  id: string;
  name: string;
  description: string;
  webUrl: string;
  driveType: string;
};

export type MicrosoftDriveItemMetaData = {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  createdBy: {
    user: {
      id: string;
      displayName: string;
    };
  };
  lastModifiedBy: {
    user: {
      id: string;
      displayName: string;
    };
  };
  parentReference: {
    driveType: string;
    driveId: string;
    id: string;
    path: string;
    siteId: string;
  };
  fileSystemInfo: {
    createdDateTime: string;
    lastModifiedDateTime: string;
  };
  file?: {
    mimeType: MicrosoftDocumentMimeType;
  };
  folder?: {
    childCount: number;
  };
  deleted?: {
    state: string;
  };
};

export interface ProcessingSharePointSite extends SharePointResponse {
  hierarchy_path?: string;
  processedContent: ConvertedContent;
}

export interface SharePointResponse {
  id: string;
  status: 'current' | 'draft' | 'archived';
  title: string;
  spaceId: string;
  parentId: string;
  parentType: string;
  position: number;
  authorId: string;
  ownerId: string;
  lastOwnerId: string;
  createdAt: string;
  body: {
    storage: {
      value: string;
    };
    atlas_doc_format: Record<string, unknown>;
  };
  version: {
    createdAt: string;
    message: string;
    number: number;
    minorEdit: boolean;
    authorId: string;
  };
  _links: {
    webui: string;
    editui: string;
    tinyui: string;
  };
}

export interface SharePointDocumentMetadata {
  url: string;
  site_id: string;
  drive_id: string;
  folder_path?: string;
  mime_type: string;
  file_size: number;
  version: string;
}
