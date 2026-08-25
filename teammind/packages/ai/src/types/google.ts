import { Json } from '@tm/supabase/database';

// Google Drive types
export type GoogleDriveConfig = {
  accessToken: string;
  refreshToken: string;
  selectedFolders: Json;
};

export type GoogleDocumentMimeType =
  | 'application/vnd.google-apps.document'
  | 'application/vnd.google-apps.spreadsheet'
  | 'application/vnd.google-apps.presentation'
  | 'application/vnd.google-apps.folder'
  | 'application/pdf';

export interface GoogleDriveDocumentMetadata {
  url: string;
  mime_type: string;
  file_size: number;
  version: string;
  folder_path?: string;
  folder_id?: string;
}

// Gmail types
export interface GmailBodyParts {
  plain: string | null;
  html: string | null;
}

// Individual email metadata
export interface GmailEmailMetadata {
  message_id: string;
  thread_id: string;
  from_email: string;
  from_name: string;
  to: string[];
  cc: string[];
  bcc: string[];
  subject: string;
  date: string;
  labels: string[];
  domain: string;
  reply_to?: string;
  is_sent: boolean;
  is_read: boolean;
  is_important: boolean;
  is_starred: boolean;
}

// Thread-level metadata (for storage/retrieval)
export interface GmailThreadMetadata {
  url: string;
  email_count: number;
  date_range: {
    start: string;
    end: string;
  };
}
