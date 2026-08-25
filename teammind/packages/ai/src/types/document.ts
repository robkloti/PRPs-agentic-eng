import { z } from 'zod';

import { DocumentSource } from './common';

export interface ConversionResult {
  markdown?: string;
  sourceMentionedUserIds?: string[];
}

export interface ConvertedContent {
  markdown: string;
  sourceMentionedUserIds: string[];
}

export const DocActionDecisionZodSchema = z.object({
  action: z.enum(['update', 'create', 'none']),
  pageId: z.string().nullable(),
  parentPageId: z.string().nullable(),
  spaceId: z.string().nullable(),
  source: z.custom<DocumentSource>(),
});

export type DocActionDecision = z.infer<typeof DocActionDecisionZodSchema>;

export const DocContentGenerationZodSchema = z.object({
  content: z.string(),
  title: z.string(),
  updateSummary: z.string(),
});

export type DocContentGeneration = z.infer<
  typeof DocContentGenerationZodSchema
>;

export type DocumentAction = Omit<
  z.infer<typeof DocActionDecisionZodSchema>,
  'source'
> &
  DocContentGeneration;

/**
 * Result of a document creation/update operation
 */
export interface DocumentCreateResult {
  id: string; // Document ID
  url: string; // Web URL to access the document
  title: string; // Document title
  source: DocumentSource; // Source system
}
