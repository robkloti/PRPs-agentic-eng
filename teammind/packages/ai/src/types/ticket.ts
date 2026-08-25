import { z } from 'zod';

import { DocumentSource } from './common';

export const TicketItemZodSchema = z.object({
  parentId: z.string(),
  title: z.string(),
  content: z.string(),
  updateSummary: z.string(),
});

export const TicketCreateDecisionZodSchema = z.object({
  createTickets: z.boolean(),
  source: z.custom<DocumentSource>(),
  tickets: z.array(TicketItemZodSchema).nullable(),
});

/**
 * Base interface for ticket creation data across all platforms
 */
export type TicketAction = z.infer<typeof TicketItemZodSchema>;
/**
 * Data structure for ticket creation decision
 */
export type TicketGeneration = z.infer<typeof TicketCreateDecisionZodSchema>;

/**
 * Result of a ticket creation operation
 */
export interface TicketCreateResult {
  id: string; // Unique identifier
  key: string; // Platform-specific key (e.g., JIRA-123)
  url: string; // Web URL to access the ticket
  title: string; // Title of the created ticket
  source: DocumentSource; // Source system identifier
}
