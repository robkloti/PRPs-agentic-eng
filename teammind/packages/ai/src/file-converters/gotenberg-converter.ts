import { adjust, gotenberg, office, pipe, please } from 'gotenberg-js-client';
import { Readable } from 'stream';

// Configure Gotenberg credentials once at the module level
const GOTENBERG_URL = process.env.GOTENBERG_URL ?? '';
const GOTENBERG_USERNAME = process.env.GOTENBERG_USERNAME ?? '';
const GOTENBERG_PASSWORD = process.env.GOTENBERG_PASSWORD ?? '';

// Prepare the basic auth header value if credentials are provided
const getAuthHeaders = () => {
  if (GOTENBERG_USERNAME && GOTENBERG_PASSWORD) {
    const base64Credentials = Buffer.from(
      `${GOTENBERG_USERNAME}:${GOTENBERG_PASSWORD}`,
    ).toString('base64');
    return {
      Authorization: `Basic ${base64Credentials}`,
    };
  }
  return undefined;
};

// Helper to create streams from blobs/buffers
const createReadableStream = async (
  content: Blob | Buffer,
): Promise<Readable> => {
  let buffer: Buffer;

  if (content instanceof Blob) {
    const arrayBuffer = await content.arrayBuffer();
    buffer = Buffer.from(arrayBuffer);
  } else {
    buffer = content;
  }

  const stream = new Readable();
  stream.push(buffer);
  stream.push(null);
  return stream;
};

// Mapping of mime types to file extensions
const mimeTypeToExtension: Record<string, string> = {
  'application/msword': 'doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
    'docx',
  'application/vnd.ms-excel': 'xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-powerpoint': 'ppt',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation':
    'pptx',
  'text/plain': 'txt',
  'text/csv': 'csv',
  'text/html': 'html',
  'text/rtf': 'rtf',
  'application/rtf': 'rtf',
  'application/vnd.oasis.opendocument.text': 'odt',
  'application/vnd.oasis.opendocument.spreadsheet': 'ods',
  'application/vnd.oasis.opendocument.presentation': 'odp',
  'application/pdf': 'pdf',
};

/**
 * Gotenberg client for converting various document formats to PDF
 * Compatible with Gotenberg 8 modular architecture
 */
export const GotenbergClient = {
  /**
   * Convert an Office document to PDF
   * @param content Document content as Blob or Buffer
   * @param mimeType MIME type of the document
   * @returns PDF as a readable stream
   */
  convertOfficeToPdf: async (
    content: Blob | Buffer,
    mimeType: string,
  ): Promise<NodeJS.ReadableStream> => {
    // Get file extension based on MIME type
    const extension = mimeTypeToExtension[mimeType] ?? 'bin';
    const filename = `document.${extension}`;

    // Create content stream
    const stream = await createReadableStream(content);

    // Configure the Gotenberg pipeline with authentication
    // For Gotenberg 8, we need to use the LibreOffice module endpoint
    const toPdf = pipe(
      gotenberg(''), // We'll override this with adjust
      office,
      adjust({
        url: `${GOTENBERG_URL}/forms/libreoffice/convert`,
        headers: getAuthHeaders(),
      }),
      please,
    );

    // Convert to PDF
    return await toPdf({ [filename]: stream });
  },

  /**
   * Convert a PDF stream to a Blob for further processing
   * @param stream PDF stream from conversion
   * @returns PDF content as Blob
   */
  streamToBlob: async (stream: NodeJS.ReadableStream): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) =>
        reject(err instanceof Error ? err : new Error(String(err))),
      );
      stream.on('end', () =>
        resolve(new Blob([Buffer.concat(chunks)], { type: 'application/pdf' })),
      );
    });
  },
};

// Export lists of supported formats for convenience
export const SUPPORTED_OFFICE_FORMATS = Object.keys(mimeTypeToExtension).filter(
  (type) => type !== 'application/pdf' && type !== 'text/html',
);
