import { DocumentSource, DocumentSourceCount } from '@tm/ai/types';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '~/lib/database.types';

/**
 * Type definition for the database function return type
 */
export type CountDocumentsBySourceType = 
  Database['public']['Functions']['count_documents_by_source_type'];

/**
 * Maps document source counts to a list of available document sources
 * @param documentSourceCount Object containing counts of documents by source type
 * @returns Array of document sources that have documents
 */
export function mapConnectorConfigsToSources(
  documentSourceCount: DocumentSourceCount
): DocumentSource[] {
  const sources: DocumentSource[] = [];

  if (documentSourceCount.confluence) sources.push('confluence');
  if (documentSourceCount.jira) sources.push('jira');
  if (documentSourceCount.sharepoint) sources.push('sharepoint');
  if (documentSourceCount.notion) sources.push('notion');
  if (documentSourceCount.google_drive) sources.push('google_drive');
  if (documentSourceCount.gmail) sources.push('gmail');
  if (documentSourceCount.pdf) sources.push('pdf');

  return sources;
}

/**
 * Fetches available document sources using the provided Supabase client
 * This function can be used in both client and server contexts
 * 
 * @param supabase Supabase client instance
 * @returns Promise resolving to an array of available document sources
 */
export async function fetchAvailableSources(
  supabase: SupabaseClient<Database>
): Promise<DocumentSource[]> {
  try {
    const { data, error } = await supabase.rpc<
      'count_documents_by_source_type',
      CountDocumentsBySourceType
    >('count_documents_by_source_type');

    if (error) {
      console.error('Error fetching available sources:', error);
      return [];
    }

    if (!data) {
      console.error('No data returned from count_documents_by_source_type');
      return [];
    }

    return mapConnectorConfigsToSources(data as DocumentSourceCount);
  } catch (error) {
    console.error('Error fetching available sources:', error);
    return [];
  }
}