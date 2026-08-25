import { SupabaseClient } from '@supabase/supabase-js';

import { tool } from 'ai';
import { z } from 'zod';

import { Database } from '@tm/supabase/database';

import { getGmailClient } from '../google-function-client';
import {
  createGmailDraft,
  getGmailMessage,
  getGmailThread,
  searchGmail,
  sendGmailMessage,
} from './functions';

/**
 * Creates Gmail tools that are customized for a specific user
 */
export function createGmailTools(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  // Create tools object
  const tools = {
    // Tools requiring confirmation (no execute function)
    send_gmail_message: tool({
      description:
        'Sends an email message using Gmail with specified recipients, subject, and message body. CC and BCC are optional.',
      parameters: z.object({
        to: z.array(z.string()).describe('List of recipient email addresses.'),
        subject: z.string().describe('The subject line of the email.'),
        message: z.string().describe('The main body content of the email.'),
        cc: z
          .array(z.string())
          .optional()
          .describe('Optional list of CC recipient email addresses.'),
        bcc: z
          .array(z.string())
          .optional()
          .describe('Optional list of BCC recipient email addresses.'),
      }),
      // No execute function -> requires confirmation
    }),

    create_gmail_draft: tool({
      description:
        'Creates a draft email in Gmail with specified recipients, subject, and message body. CC and BCC are optional.',
      parameters: z.object({
        to: z.array(z.string()).describe('List of recipient email addresses.'),
        subject: z.string().describe('The subject line of the email.'),
        message: z.string().describe('The main body content of the email.'),
        cc: z
          .array(z.string())
          .optional()
          .describe('Optional list of CC recipient email addresses.'),
        bcc: z
          .array(z.string())
          .optional()
          .describe('Optional list of BCC recipient email addresses.'),
      }),
      // No execute function -> requires confirmation
    }),

    // Tools that don't require confirmation (include execute function)
    get_gmail_message: tool({
      description:
        'Retrieves a specific email message from Gmail using its unique message ID.',
      parameters: z.object({
        messageId: z
          .string()
          .describe('The unique ID of the message to retrieve.'),
      }),
      execute: async ({ messageId }) => {
        try {
          const gmailClient = await getGmailClient(supabase, userId);
          return await getGmailMessage({ messageId }, gmailClient);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return {
            success: false,
            error: message,
          };
        }
      },
    }),

    get_gmail_thread: tool({
      description:
        'Retrieves an entire email thread from Gmail using its unique thread ID.',
      parameters: z.object({
        threadId: z
          .string()
          .describe('The unique ID of the thread to retrieve.'),
      }),
      execute: async ({ threadId }) => {
        try {
          const gmailClient = await getGmailClient(supabase, userId);
          return await getGmailThread({ threadId }, gmailClient);
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return {
            success: false,
            error: message,
          };
        }
      },
    }),

    search_gmail: tool({
      description:
        'Searches Gmail messages or threads using a query. Can specify max results and resource type (messages or threads).',
      parameters: z.object({
        query: z
          .string()
          .describe(
            'The search query string (e.g., "from:example@domain.com subject:Report").',
          ),
        maxResults: z
          .number()
          .optional()
          .describe(
            'Optional maximum number of results to return. Defaults to 10.',
          ),
        resource: z
          .enum(['messages', 'threads'])
          .optional()
          .describe(
            'Optional resource type to search. Defaults to "messages".',
          ),
      }),
      execute: async ({ query, maxResults, resource }) => {
        try {
          const gmailClient = await getGmailClient(supabase, userId);
          return await searchGmail(
            { query, maxResults, resource },
            gmailClient,
          );
        } catch (error) {
          const message =
            error instanceof Error ? error.message : String(error);
          return {
            success: false,
            error: message,
          };
        }
      },
    }),
  };

  return tools;
}

/**
 * Gmail tool execution functions to be used after confirmation
 */
export function getGmailExecuteFunctions(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  return {
    send_gmail_message: async ({ to, subject, message, cc, bcc }: any) => {
      try {
        const gmailClient = await getGmailClient(supabase, userId);
        return await sendGmailMessage(
          { to, subject, message, cc, bcc },
          gmailClient,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: errorMessage,
        };
      }
    },

    create_gmail_draft: async ({ to, subject, message, cc, bcc }: any) => {
      try {
        const gmailClient = await getGmailClient(supabase, userId);
        return await createGmailDraft(
          { to, subject, message, cc, bcc },
          gmailClient,
        );
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : String(error);
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
  };
}
