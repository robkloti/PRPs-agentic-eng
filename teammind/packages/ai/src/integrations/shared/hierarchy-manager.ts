import { SupabaseClient } from '@supabase/supabase-js';

import { DocumentSource } from '../../types';

export interface PageHierarchyEntry {
  id: string;
  title: string;
  parentId?: string;
}

export class HierarchyManager {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Builds complete hierarchy paths for pages, fetching missing ancestry data as needed
   * Only includes ancestors that the specified user has access to
   */
  async buildHierarchyPaths(
    pages: PageHierarchyEntry[],
    userId: string,
    source: DocumentSource,
  ): Promise<Map<string, string>> {
    // First validate all page entries
    const validatedPages = pages.map((page) => ({
      ...page,
      title: page.title?.trim() || `Untitled (${page.id.substring(0, 8)})`,
    }));

    // Build map of known pages with validated titles
    const pageMap = new Map<string, PageHierarchyEntry>();
    validatedPages.forEach((page) => pageMap.set(page.id, page));

    // Collect and fetch missing parents
    const missingParentIds = new Set<string>();
    validatedPages.forEach((page) => {
      if (page.parentId && !pageMap.has(page.parentId)) {
        missingParentIds.add(page.parentId);
      }
    });

    // Fetch missing ancestors
    if (missingParentIds.size > 0) {
      const { data: ancestorDocs } = await this.supabase
        .from('documents')
        .select(
          'source_id, title, source_parent_id, document_user_access!inner(user_id)',
        )
        .in('source_id', Array.from(missingParentIds))
        .eq('source', source)
        .eq('document_user_access.user_id', userId);

      // Add fetched ancestors to our page map
      ancestorDocs?.forEach((doc) => {
        pageMap.set(doc.source_id, {
          id: doc.source_id,
          title:
            doc.title?.trim() ?? `Untitled (${doc.source_id.substring(0, 8)})`,
          parentId: doc.source_parent_id,
        });
      });
    }

    // Build hierarchy paths
    const hierarchyPaths = new Map<string, string>();

    validatedPages.forEach((page) => {
      const titleParts: string[] = [];
      const seenIds = new Set<string>();
      let currentId: string | undefined = page.id;

      // Walk up the parent chain to build path
      while (currentId && !seenIds.has(currentId)) {
        const currentPage = pageMap.get(currentId);
        if (!currentPage) break;

        titleParts.unshift(currentPage.title);
        seenIds.add(currentId);
        currentId = currentPage.parentId;
      }

      // Store path (excluding current page title)
      hierarchyPaths.set(page.id, titleParts.slice(0, -1).join('\\'));
    });

    return hierarchyPaths;
  }

  /**
   * Updates hierarchy paths for all documents under a given parent
   * Only updates documents the specified user has access to
   */
  async updateDescendantPaths(
    parentId: string,
    userId: string,
    source: DocumentSource,
  ): Promise<void> {
    // First fetch all descendants the user has access to
    const { data: descendants } = await this.supabase
      .from('documents')
      .select(
        'source_id, title, source_parent_id, document_user_access!inner(user_id)',
      )
      .eq('source_parent_id', parentId)
      .eq('source', source)
      .eq('document_user_access.user_id', userId);

    if (!descendants?.length) return;

    // Build new hierarchy paths
    const descendantEntries = descendants.map((doc) => ({
      id: doc.source_id,
      title: doc.title,
      parentId: doc.source_parent_id,
    }));

    const newPaths = await this.buildHierarchyPaths(
      descendantEntries,
      userId,
      source,
    );

    // Update paths in batches
    const batchSize = 100;
    for (let i = 0; i < descendants.length; i += batchSize) {
      const batch = descendants.slice(i, i + batchSize);

      await this.supabase.from('documents').upsert(
        batch.map((doc) => ({
          source_id: doc.source_id,
          hierarchy_path: newPaths.get(doc.source_id),
        })),
      );

      // Recursively update paths for next level of descendants
      await Promise.all(
        batch.map((doc) =>
          this.updateDescendantPaths(doc.source_id, userId, source),
        ),
      );
    }
  }
}
