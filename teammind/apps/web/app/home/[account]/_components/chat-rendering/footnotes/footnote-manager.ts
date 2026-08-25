import { DocumentSource } from '@tm/ai/types';

import { SourceInfo } from '../source-link';

// Create a message-specific store
class FootnoteManager {
  private footnotesByMessage: Record<string, SourceInfo[]> = {};

  addFootnote(messageId: string, sourceInfo: SourceInfo): void {
    // Initialize array if needed
    if (!this.footnotesByMessage[messageId]) {
      this.footnotesByMessage[messageId] = [];
    }

    // Check for duplicates
    const isDuplicate = this.footnotesByMessage[messageId].some(
      (existing) => existing.url === sourceInfo.url,
    );

    // Only add if not a duplicate
    if (!isDuplicate) {
      this.footnotesByMessage[messageId].push(sourceInfo);
    }
  }

  getFootnotes(messageId: string): SourceInfo[] {
    return this.footnotesByMessage[messageId] || [];
  }

  resetFootnotes(messageId: string): void {
    this.footnotesByMessage[messageId] = [];
  }
}

// Create a singleton instance
export const footnoteManager = new FootnoteManager();

// Helper to determine document source from URL
export const getSourceFromUrl = (url: string): DocumentSource => {
  if (url.includes('notion.so')) return 'notion';
  if (url.includes('docs.google.com')) return 'google_drive';
  if (url.includes('mail.google.com')) return 'gmail';
  if (url.includes('sharepoint.com')) return 'sharepoint';
  if (url.includes('atlassian.net/wiki')) return 'confluence';
  if (url.includes('atlassian.net/browse')) return 'jira';
  return 'pdf';
};
