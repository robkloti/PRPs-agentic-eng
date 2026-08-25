import { SupabaseClient } from '@supabase/supabase-js';

import { gmail_v1, google } from 'googleapis';

import { Database } from '@tm/supabase/database';

import { GFMContextPathChunker } from '../../../embeddings/gfm-context-path-chunker';
import { DocumentAccessManager, SupabaseVectorStore } from '../../../storage';
import {
  GmailBodyParts,
  GmailEmailMetadata,
  GmailThreadMetadata,
} from '../../../types/google';
import { GoogleBase } from '../google-base';
import { GmailToMarkdownConverter } from './gmail-to-md';

// Configuration constants
const CONFIG = {
  BATCH_SIZE: 50,
  MIN_CONTENT_LENGTH: 20,
  MONTHS_TO_LOAD: 6,
  MAX_CONCURRENCY: 10,
} as const;

export interface GmailLoaderConfig {
  userId: string;
  accessToken: string;
  refreshToken: string;
  supabase: SupabaseClient<Database>;
  userEmail: string;
}

export interface ProcessingEmail {
  id: string;
  threadId: string;
  headers: Record<string, string>;
  body: GmailBodyParts;
  metadata: GmailEmailMetadata;
  snippet?: string;
  inReplyTo?: string;
}

export class GmailLoader extends GoogleBase {
  private readonly vectorStore: SupabaseVectorStore;
  private readonly accessManager: DocumentAccessManager;
  private readonly userEmail: string;
  private readonly userDomain: string;
  private readonly converter = new GmailToMarkdownConverter();
  private readonly chunker = new GFMContextPathChunker();
  private gmailService: gmail_v1.Gmail;

  // Track which threads we've already processed to prevent duplicates
  private processedThreadIds = new Set<string>();

  constructor(config: GmailLoaderConfig) {
    super(config.accessToken, config.refreshToken, config.userId);
    this.vectorStore = new SupabaseVectorStore(config.supabase);
    this.accessManager = new DocumentAccessManager(config.supabase);
    this.userId = config.userId;
    this.userEmail = config.userEmail;
    this.userDomain = this.userEmail.split('@')[1]!;
    this.gmailService = google.gmail({ version: 'v1', auth: this.auth });
  }

  /**
   * Main method to load emails
   */
  public async load(options?: { modifiedSince?: Date }): Promise<void> {
    try {
      const modifiedSince = options?.modifiedSince;

      // Reset the processed threads tracking set
      this.processedThreadIds.clear();

      // Load conversation threads (priority)
      await this.loadConversationThreads(modifiedSince);

      // Load domain-specific emails (if user domain is available)
      if (this.userDomain) {
        await this.loadDomainThreads(modifiedSince);
      }

      // Load starred emails that weren't captured by other queries
      await this.loadStarredEmails(modifiedSince);

      // Load emails sent by the user
      await this.loadSentEmails(modifiedSince);

      console.log(
        `[GMAIL LOADER] Completed loading ${this.processedThreadIds.size} unique threads`,
      );
    } catch (error) {
      console.error('[GMAIL LOADER] Error loading emails:', error);
      throw error;
    }
  }

  /**
   * Loads threads that are part of conversations (have in-reply-to headers)
   */
  private async loadConversationThreads(modifiedSince?: Date): Promise<void> {
    let query = 'has:in-reply-to';

    // Add time filter if applicable
    if (modifiedSince) {
      const formattedDate = modifiedSince.toISOString().split('T')[0];
      query += ` after:${formattedDate}`;
    } else {
      const cutoffDate = this.getDefaultCutoffDate();
      const formattedDate = cutoffDate.toISOString().split('T')[0];
      query += ` after:${formattedDate}`;
    }

    await this.loadEmailsWithQuery(query, 'conversation threads');
  }

  /**
   * Loads threads matching the user's domain filter
   * Explicitly excludes conversation threads to prevent duplicates
   */
  private async loadDomainThreads(modifiedSince?: Date): Promise<void> {
    if (!this.userDomain) return;

    const domainQuery = this.buildDomainQuery(this.userDomain);
    if (!domainQuery) {
      return; // Skip entirely for gmail.com addresses
    }

    // Continue with existing logic for custom domains
    let query = domainQuery;

    // Add time filter if applicable
    if (modifiedSince) {
      const formattedDate = modifiedSince.toISOString().split('T')[0];
      query += ` after:${formattedDate}`;
    } else {
      const cutoffDate = this.getDefaultCutoffDate();
      const formattedDate = cutoffDate.toISOString().split('T')[0];
      query += ` after:${formattedDate}`;
    }

    // IMPORTANT: Explicitly exclude conversation threads to prevent duplicates
    // Since we loaded those in the previous step
    query += ' -has:in-reply-to';

    await this.loadEmailsWithQuery(query, 'domain threads');
  }

  /**
   * Loads user-starred emails that might contain important information
   * but weren't captured by other queries
   */
  private async loadStarredEmails(modifiedSince?: Date): Promise<void> {
    let query = 'is:starred';

    // Add time filter if applicable
    if (modifiedSince) {
      const formattedDate = modifiedSince.toISOString().split('T')[0];
      query += ` after:${formattedDate}`;
    } else {
      const cutoffDate = this.getDefaultCutoffDate();
      const formattedDate = cutoffDate.toISOString().split('T')[0];
      query += ` after:${formattedDate}`;
    }

    // Exclude conversations and domain emails we've already processed
    query += ' -has:in-reply-to';
    if (this.userDomain) {
      query += ` -(from:*@${this.userDomain} OR to:*@${this.userDomain})`;
    }

    await this.loadEmailsWithQuery(query, 'starred emails');
  }

  /**
   * Loads emails sent by the user
   */
  private async loadSentEmails(modifiedSince?: Date): Promise<void> {
    let query = 'from:me';

    // Add time filter if applicable
    if (modifiedSince) {
      const formattedDate = modifiedSince.toISOString().split('T')[0];
      query += ` after:${formattedDate}`;
    } else {
      const cutoffDate = this.getDefaultCutoffDate();
      const formattedDate = cutoffDate.toISOString().split('T')[0];
      query += ` after:${formattedDate}`;
    }

    // Exclude emails already captured in conversation threads
    query += ' -has:in-reply-to';

    await this.loadEmailsWithQuery(query, 'sent emails');
  }

  /**
   * Loads emails matching a specific query
   */
  private async loadEmailsWithQuery(
    query: string,
    type: string,
  ): Promise<void> {
    let pageToken: string | undefined;
    let emailsProcessed = 0;
    let threadsProcessed = 0;

    console.log(`[GMAIL LOADER] Starting to load ${type} with query: ${query}`);

    do {
      try {
        // Fetch email batch
        const response = await this.gmailService.users.messages.list({
          userId: 'me',
          maxResults: CONFIG.BATCH_SIZE,
          q: query,
          pageToken,
        });

        if (!response.data.messages || response.data.messages.length === 0) {
          console.log(`[GMAIL LOADER] No more ${type} to process`);
          break;
        }

        // Process this batch of emails
        const emails = await this.fetchEmailDetails(response.data.messages);
        const newThreadsProcessed = await this.processEmails(emails);

        // Update counters and tokens
        emailsProcessed += emails.length;
        threadsProcessed += newThreadsProcessed;
        pageToken = response.data.nextPageToken ?? undefined;

        console.log(
          `[GMAIL LOADER] Processed ${emailsProcessed} ${type} (${threadsProcessed} threads) so far...`,
        );
      } catch (error) {
        console.error(`[GMAIL LOADER] Error fetching ${type}:`, error);
        break;
      }
    } while (pageToken);

    console.log(`[GMAIL LOADER] Completed loading ${threadsProcessed} ${type}`);
  }

  /**
   * Fetches detailed information for a batch of emails
   */
  private async fetchEmailDetails(
    messages: gmail_v1.Schema$Message[],
  ): Promise<ProcessingEmail[]> {
    return Promise.all(
      messages.map(async (message) => {
        try {
          if (!message.id) {
            throw new Error('Message ID is undefined');
          }

          const response = await this.gmailService.users.messages.get({
            userId: 'me',
            id: message.id,
            format: 'full',
          });

          if (!response.data || !response.data.payload) {
            throw new Error('Invalid message data');
          }

          // Extract headers
          const headers: Record<string, string> = {};
          response.data.payload.headers?.forEach((header) => {
            if (header.name && header.value) {
              headers[header.name.toLowerCase()] = header.value;
            }
          });

          // Extract email bodies (plain text and HTML)
          const body = this.extractEmailBodies(response.data.payload);

          // Extract flags from labels
          const labels = response.data.labelIds || [];
          const isSent = labels.includes('SENT');
          const isRead = !labels.includes('UNREAD');
          const isImportant = labels.includes('IMPORTANT');
          const isStarred = labels.includes('STARRED');

          // Parse from address to extract name and email separately
          const fromDetails = this.parseFromField(headers['from'] || '');

          // Track in-reply-to header for conversation matching
          const inReplyTo = headers['in-reply-to'];

          // Build metadata
          const metadata: GmailEmailMetadata = {
            message_id: message.id,
            thread_id: response.data.threadId || '',
            from_email: fromDetails.email,
            from_name: fromDetails.name,
            to: (headers['to'] || '').split(',').map((e) => e.trim()),
            cc: (headers['cc'] || '').split(',').map((e) => e.trim()),
            bcc: (headers['bcc'] || '').split(',').map((e) => e.trim()),
            subject: headers['subject'] || '(No Subject)',
            date: headers['date'] || '',
            labels: labels,
            domain: this.extractDomain(fromDetails.email),
            reply_to: headers['reply-to'],
            is_sent: isSent,
            is_read: isRead,
            is_important: isImportant,
            is_starred: isStarred,
          };

          return {
            id: message.id,
            threadId: response.data.threadId || '',
            headers,
            body,
            metadata,
            snippet: response.data.snippet || undefined,
            inReplyTo,
          };
        } catch (error) {
          console.error(
            `[GMAIL LOADER] Error fetching email details for ${message.id}:`,
            error,
          );
          throw error;
        }
      }),
    );
  }

  /**
   * Extracts both plain text and HTML bodies from an email
   */
  private extractEmailBodies(
    payload: gmail_v1.Schema$MessagePart,
  ): GmailBodyParts {
    let plainTextBody: string | null = null;
    let htmlBody: string | null = null;

    // Function to check a part and its nested parts
    const extractFromPart = (part: gmail_v1.Schema$MessagePart) => {
      // Check for body content in this part
      if (part.mimeType === 'text/plain' && part.body?.data) {
        plainTextBody = this.decodeBase64Url(part.body.data);
      } else if (part.mimeType === 'text/html' && part.body?.data) {
        htmlBody = this.decodeBase64Url(part.body.data);
      }

      // Recursively check multipart content
      if (part.parts && part.parts.length > 0) {
        part.parts.forEach(extractFromPart);
      }
    };

    // Start with the main payload
    extractFromPart(payload);

    return { plain: plainTextBody, html: htmlBody };
  }

  /**
   * Decodes Base64URL-encoded content
   */
  private decodeBase64Url(data: string): string {
    // Use the same decoding logic as the converter for consistency
    return GmailToMarkdownConverter.decodeBase64Url(data);
  }

  /**
   * Processes a batch of emails
   * Returns the number of new threads processed
   */
  private async processEmails(emails: ProcessingEmail[]): Promise<number> {
    if (emails.length === 0) return 0;

    // Check which emails already exist in the database
    const existingDocs =
      await this.vectorStore.getExistingDocumentsBySourceId<GmailThreadMetadata>(
        emails.map((email) => email.id),
        'gmail',
      );

    // Group emails by thread for processing
    const emailsByThread = this.groupEmailsByThread(emails);

    // Filter threads for processing
    const threadsToProcess: Array<[string, ProcessingEmail[]]> = [];

    for (const [threadId, threadEmails] of emailsByThread.entries()) {
      // IMPORTANT: Skip threads we've already processed in this session
      if (this.processedThreadIds.has(threadId)) {
        console.log(
          `[GMAIL LOADER] Skipping thread ${threadId}: Already processed in this session`,
        );
        continue;
      }

      // Skip threads where all emails are already in the database and accessible
      if (
        threadEmails.every(
          (email) =>
            existingDocs.has(email.id) &&
            existingDocs.get(email.id)?.user_ids_access.includes(this.userId),
        )
      ) {
        console.log(
          `[GMAIL LOADER] Skipping thread ${threadId}: All emails already exist in database`,
        );
        continue;
      }

      // Check if this thread is a conversation (has replies)
      const isConversationThread = threadEmails.some(
        (email) => email.inReplyTo,
      );

      // Check if this thread involves the user's domain
      const hasDomainEmails = threadEmails.some(
        (email) =>
          this.extractDomain(email.metadata.from_email) === this.userDomain ||
          email.metadata.to.some((to) => to.includes(`@${this.userDomain}`)),
      );

      // Check if any email in this thread is starred
      const hasStarredEmails = threadEmails.some(
        (email) => email.metadata.is_starred,
      );

      // Skip if not relevant (no conversation, no domain connection, and not starred)
      if (!isConversationThread && !hasDomainEmails && !hasStarredEmails) {
        console.log(
          `[GMAIL LOADER] Skipping thread ${threadId}: Not relevant (not a conversation, no domain connection, not starred)`,
        );
        continue;
      }

      // Add to processing queue
      threadsToProcess.push([threadId, threadEmails]);
    }

    // Process threads in parallel with controlled concurrency
    let newThreadsProcessed = 0;

    // Process in chunks to control concurrency
    for (let i = 0; i < threadsToProcess.length; i += CONFIG.MAX_CONCURRENCY) {
      const chunk = threadsToProcess.slice(i, i + CONFIG.MAX_CONCURRENCY);

      const results = await Promise.all(
        chunk.map(async ([threadId, threadEmails]) => {
          try {
            await this.processThread(threadId, threadEmails, existingDocs);
            // Mark this thread as processed to prevent duplicates
            this.processedThreadIds.add(threadId);
            return 1; // Successfully processed
          } catch (error) {
            console.error(
              `[GMAIL LOADER] Error processing thread ${threadId}:`,
              error,
            );
            return 0; // Failed to process
          }
        }),
      );

      // Count successful thread processing
      newThreadsProcessed += results.reduce<number>((sum, val) => sum + val, 0);
    }

    return newThreadsProcessed;
  }

  /**
   * Groups emails by thread ID for contextual processing
   */
  private groupEmailsByThread(
    emails: ProcessingEmail[],
  ): Map<string, ProcessingEmail[]> {
    const emailsByThread = new Map<string, ProcessingEmail[]>();

    for (const email of emails) {
      if (!email.threadId) continue;

      const threadEmails = emailsByThread.get(email.threadId) || [];
      threadEmails.push(email);
      emailsByThread.set(email.threadId, threadEmails);
    }

    // Sort emails within each thread by date
    for (const [threadId, threadEmails] of emailsByThread.entries()) {
      emailsByThread.set(
        threadId,
        threadEmails.sort((a, b) => {
          const dateA = new Date(a.metadata.date).getTime();
          const dateB = new Date(b.metadata.date).getTime();
          return dateA - dateB;
        }),
      );
    }

    return emailsByThread;
  }

  /**
   * Processes a complete thread
   */
  private async processThread(
    threadId: string,
    threadEmails: ProcessingEmail[],
    existingDocs: Map<string, any>,
  ): Promise<void> {
    // If we have incomplete thread data, fetch the complete thread
    if (this.isThreadPotentiallyIncomplete(threadEmails)) {
      const completeThreadEmails = await this.getThread(threadId);
      if (completeThreadEmails.length > threadEmails.length) {
        threadEmails = completeThreadEmails;
      }
    }

    // Check if we need to add access for any emails in this thread
    const emailsNeedingAccess = threadEmails.filter(
      (email) =>
        existingDocs.has(email.id) &&
        !existingDocs.get(email.id)?.user_ids_access.includes(this.userId),
    );

    if (emailsNeedingAccess.length > 0) {
      await this.accessManager.manageUserAccess(this.userId, 'add', {
        source: 'gmail',
        source_ids: emailsNeedingAccess.map((email) => email.id),
      });
    }

    // Get emails that need to be stored (don't exist or need updating)
    const emailsToStore = threadEmails.filter(
      (email) => !existingDocs.has(email.id),
    );

    if (emailsToStore.length === 0) {
      return; // All emails already stored and accessible
    }

    // Get thread subject from the first email
    const threadSubject = threadEmails[0]!.metadata.subject;

    // Create a consolidated thread content with all emails using our converter
    const threadResult = this.converter.createThreadDocument(
      threadEmails.map((email) => ({
        body: email.body,
        metadata: email.metadata,
      })),
    );

    // Skip threads with no actual content
    if (!threadResult.hasContent) {
      console.log(
        `[GMAIL LOADER] Skipping thread ${threadId}: No actual content found in any email`,
      );
      return;
    }

    const threadContent = threadResult.content;

    // Continue with existing length check
    if (!threadContent || threadContent.length < CONFIG.MIN_CONTENT_LENGTH) {
      console.log(
        `[GMAIL LOADER] Skipping thread ${threadId}: Content too short or empty`,
      );
      return;
    }

    if (!threadContent || threadContent.length < CONFIG.MIN_CONTENT_LENGTH) {
      console.log(
        `[GMAIL LOADER] Skipping thread ${threadId}: Content too short or empty`,
      );
      return;
    }

    // Use the chunker to create appropriate chunks for embedding
    const chunks = this.chunker.chunk(threadContent, threadSubject);

    if (chunks.length === 0) {
      console.log(`[GMAIL LOADER] No chunks generated for thread ${threadId}`);
      return;
    }

    // Store the thread document
    await this.vectorStore.storeDocument({
      title: threadSubject,
      content: threadContent,
      source: 'gmail',
      source_id: threadId,
      source_updated_at: new Date(
        threadEmails[threadEmails.length - 1]!.metadata.date,
      ).toISOString(),
      source_mentioned_user_ids: Array.from(
        new Set(threadEmails.map((email) => email.metadata.from_email)),
      ),
      metadata: {
        url: `https://mail.google.com/mail/u/0/#search/${encodeURIComponent(
          threadSubject,
        )}`,
        email_count: threadEmails.length,
        date_range: {
          start: new Date(threadEmails[0]!.metadata.date).toISOString(),
          end: new Date(
            threadEmails[threadEmails.length - 1]!.metadata.date,
          ).toISOString(),
        },
      },
      user_ids_access: [this.userId],
    });
  }

  /**
   * Checks if a thread might be incomplete based on reply relationships
   */
  private isThreadPotentiallyIncomplete(emails: ProcessingEmail[]): boolean {
    // Check if we have any emails with in-reply-to headers pointing to messages not in our set
    const messageIds = new Set(
      emails.map((email) => email.headers['message-id']).filter(Boolean),
    );

    // Look for any in-reply-to that references a message we don't have
    for (const email of emails) {
      if (email.inReplyTo && !messageIds.has(email.inReplyTo)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Parses the From field to extract name and email separately
   */
  private parseFromField(from: string): { name: string; email: string } {
    // Handle common format: "Name <email@example.com>"
    const match = from.match(/^([^<]+)<([^>]+)>$/);
    if (match) {
      return {
        name: match[1]!.trim(),
        email: match[2]!.trim(),
      };
    }

    // Handle email-only format
    if (from.includes('@')) {
      return {
        name: from,
        email: from,
      };
    }

    // Fallback
    return {
      name: from,
      email: '',
    };
  }

  /**
   * Extracts domain from an email address
   */
  private extractDomain(email: string): string {
    const match = email.match(/@([^>]+)/);
    return match ? match[1]! : 'unknown';
  }

  /**
   * Builds a query to fetch domain-specific emails
   */
  private buildDomainQuery(domain: string): string | null {
    // Skip domain filtering for gmail.com
    if (domain.toLowerCase() === 'gmail.com') {
      return null;
    }

    // For custom/organization domains, use domain filtering
    return `(from:*@${domain} OR to:*@${domain})`;
  }

  /**
   * Gets the default cutoff date (configured months ago)
   */
  private getDefaultCutoffDate(): Date {
    const date = new Date();
    date.setMonth(date.getMonth() - CONFIG.MONTHS_TO_LOAD);
    return date;
  }

  /**
   * Retrieves all messages in a thread directly using the threads API
   */
  public async getThread(threadId: string): Promise<ProcessingEmail[]> {
    try {
      const response = await this.gmailService.users.threads.get({
        userId: 'me',
        id: threadId,
        format: 'full',
      });

      if (!response.data.messages || response.data.messages.length === 0) {
        return [];
      }

      // Convert thread messages to ProcessingEmail objects
      const emails = response.data.messages
        .map((message) => {
          if (!message.id || !message.payload) return null;

          // Extract headers
          const headers: Record<string, string> = {};
          message.payload.headers?.forEach((header) => {
            if (header.name && header.value) {
              headers[header.name.toLowerCase()] = header.value;
            }
          });

          // Track in-reply-to header for conversation matching
          const inReplyTo = headers['in-reply-to'];

          // Extract bodies
          const body = message.payload
            ? this.extractEmailBodies(message.payload)
            : { plain: null, html: null };

          // Parse from address
          const fromDetails = this.parseFromField(headers['from'] || '');

          // Extract flags from labels
          const labels = message.labelIds || [];
          const isSent = labels.includes('SENT');
          const isRead = !labels.includes('UNREAD');
          const isImportant = labels.includes('IMPORTANT');
          const isStarred = labels.includes('STARRED');

          // Build metadata
          const metadata: GmailEmailMetadata = {
            message_id: message.id,
            thread_id: threadId,
            from_email: fromDetails.email,
            from_name: fromDetails.name,
            to: (headers['to'] || '').split(',').map((e) => e.trim()),
            cc: (headers['cc'] || '').split(',').map((e) => e.trim()),
            bcc: (headers['bcc'] || '').split(',').map((e) => e.trim()),
            subject: headers['subject'] || '(No Subject)',
            date: headers['date'] || '',
            labels: labels,
            domain: this.extractDomain(fromDetails.email),
            reply_to: headers['reply-to'],
            is_sent: isSent,
            is_read: isRead,
            is_important: isImportant,
            is_starred: isStarred,
          };

          return {
            id: message.id,
            threadId,
            headers,
            body,
            metadata,
            snippet: message.snippet,
            inReplyTo,
          };
        })
        .filter(Boolean) as ProcessingEmail[];

      // Sort emails by date
      return emails.sort((a, b) => {
        const dateA = new Date(a.metadata.date).getTime();
        const dateB = new Date(b.metadata.date).getTime();
        return dateA - dateB;
      });
    } catch (error) {
      console.error(`[GMAIL LOADER] Error getting thread ${threadId}:`, error);
      return [];
    }
  }
}
