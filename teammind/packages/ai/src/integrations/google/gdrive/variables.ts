export const ALLOWED_MIME_TYPES = [
  // Google Workspace formats
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.spreadsheet',
  'application/vnd.google-apps.presentation',

  // Microsoft Office formats
  'application/msword', // DOC
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // DOCX
  'application/vnd.ms-excel', // XLS
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // XLSX
  'application/vnd.ms-powerpoint', // PPT
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // PPTX

  // PDF
  'application/pdf',

  // Text formats
  'text/plain',
  'text/csv',
  'text/html',
  'text/rtf',
  'application/rtf',

  // Open Document formats
  'application/vnd.oasis.opendocument.text', // ODT
  'application/vnd.oasis.opendocument.spreadsheet', // ODS
  'application/vnd.oasis.opendocument.presentation', // ODP
] as const;

export const CONFIG = {
  BATCH_SIZE: 50,
  MIN_CONTENT_SIZE: 100, // bytes
} as const;
