export const MICROSOFT_PROFILE_SELECTS = 'id,displayName,mail';
export const SITES_SELECTS = 'id,name,displayName,webUrl';
export const DRIVES_SELECTS = 'id,name,description,webUrl,driveType';
export const DRIVE_ITEM_SELECTS =
  'id,name,webUrl,size,createdBy,lastModifiedBy,parentReference,fileSystemInfo,file,folder';

export const allowedDocumentMimeTypes = [
  // CSV
  'text/csv',
  'application/csv',

  // DOC
  'application/msword',

  // DOCX
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

  // ODP (OpenDocument Presentation)
  'application/vnd.oasis.opendocument.presentation',

  // ODS (OpenDocument Spreadsheet)
  'application/vnd.oasis.opendocument.spreadsheet',

  // ODT (OpenDocument Text)
  'application/vnd.oasis.opendocument.text',

  // POT
  'application/vnd.ms-powerpoint',

  // POTM
  'application/vnd.ms-powerpoint.template.macroenabled.12',

  // POTX
  'application/vnd.openxmlformats-officedocument.presentationml.template',

  // PPS
  'application/vnd.ms-powerpoint',

  // PPSX
  'application/vnd.openxmlformats-officedocument.presentationml.slideshow',

  // PPSXM (I believe you meant PPSM)
  'application/vnd.ms-powerpoint.slideshow.macroenabled.12',

  // PPT
  'application/vnd.ms-powerpoint',

  // PPTM
  'application/vnd.ms-powerpoint.presentation.macroenabled.12',

  // PPTX
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',

  // RTF
  'application/rtf',
  'text/rtf',

  // XLS
  'application/vnd.ms-excel',

  // XLSX
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
] as const;
