import { useQuery } from '@tanstack/react-query';

import {
  ConfluenceDocumentMetadata,
  DocumentSource,
  JiraMetadata,
} from '@tm/ai';
import { useSupabase } from '@tm/supabase/hooks/use-supabase';

import { Database } from '~/lib/database.types';

type QualityFlag =
  Database['public']['Tables']['document_quality_flags']['Row'];

// Custom hook for fetching document details
export function useDocumentDetails(documentId: number | null) {
  const client = useSupabase();

  return useQuery({
    queryKey: ['documentDetails', documentId],
    queryFn: async () => {
      if (!documentId) return null;

      const { data, error } = await client
        .from('documents')
        .select('id, title, source, metadata')
        .eq('id', documentId)
        .single();

      if (error) throw error;

      return {
        id: data.id,
        title: data.title,
        source: data.source,
        url: (
          data.metadata as unknown as ConfluenceDocumentMetadata | JiraMetadata
        ).url,
      };
    },
    enabled: !!documentId,
  });
}

// Custom hook for fetching related documents for a specific flag
export function useRelatedDocuments(flagId: number | null) {
  const client = useSupabase();

  return useQuery({
    queryKey: ['relatedDocuments', flagId],
    queryFn: async () => {
      if (!flagId) return [];

      // First fetch the related document IDs from the relations table
      const { data: relations, error: relationsError } = await client
        .from('document_quality_flag_relations')
        .select('related_document_id')
        .eq('flag_id', flagId);

      if (relationsError) throw relationsError;

      if (!relations || relations.length === 0) return [];

      // Extract the document IDs
      const documentIds = relations.map((rel) => rel.related_document_id);

      // Then fetch the actual documents
      const { data, error } = await client
        .from('documents')
        .select('id, title, source, metadata')
        .in('id', documentIds);

      if (error) throw error;

      return data.map((doc) => ({
        id: doc.id,
        title: doc.title,
        source: doc.source,
        url: (
          doc.metadata as unknown as ConfluenceDocumentMetadata | JiraMetadata
        ).url,
      }));
    },
    enabled: !!flagId,
  });
}

// Custom hook for batch fetching flag documents
export function useFlagDocuments(flags: QualityFlag[] | undefined) {
  const client = useSupabase();

  // Extract all unique document IDs from flags
  const documentIds = flags
    ? [...new Set(flags.map((flag) => flag.document_id))]
    : [];

  return useQuery({
    queryKey: ['flagDocuments', documentIds],
    queryFn: async () => {
      if (!documentIds.length) return {};

      const { data, error } = await client
        .from('documents')
        .select('id, title, source, metadata')
        .in('id', documentIds);

      if (error) throw error;

      // Convert to a map for easy lookup
      return data.reduce(
        (acc, doc) => {
          acc[doc.id] = {
            id: doc.id,
            title: doc.title,
            source: doc.source,
            url: (
              doc.metadata as unknown as
                | ConfluenceDocumentMetadata
                | JiraMetadata
            ).url,
          };
          return acc;
        },
        {} as Record<
          number,
          { id: number; title: string; source: DocumentSource; url?: string }
        >,
      );
    },
    enabled: documentIds.length > 0,
  });
}
