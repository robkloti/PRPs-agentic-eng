import { SupabaseClient } from '@supabase/supabase-js';

type DocumentHierarchyEntry = {
  id: string;
  title: string;
  parentId?: string;
};

export class MicrosoftHierarchyManager {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Builds complete hierarchy paths for pages, fetching missing ancestry data as needed
   * Only includes ancestors that the specified user has access to
   */
  async buildHierarchyPaths(
    documents: DocumentHierarchyEntry[],
    userId: string,
  ): Promise<Map<string, string>> {
    // First build map of known pages
    const pageMap = new Map<string, DocumentHierarchyEntry>();
    documents.forEach((doc) => pageMap.set(doc.id, doc));

    // Collect all unknown parent IDs we need to fetch
    const missingParentIds = new Set<string>();
    documents.forEach((page) => {
      if (page.parentId && !pageMap.has(page.parentId)) {
        missingParentIds.add(page.parentId);
      }
    });

    // Fetch missing ancestors recursively until we have complete chains
    // Only fetch ancestors the user has access to
    while (missingParentIds.size > 0) {
      const { data: ancestorDocs } = await this.supabase
        .from('documents')
        .select(
          'source_id, title, source_parent_id, document_user_access!inner(user_id)',
        )
        .in('source_id', Array.from(missingParentIds))
        .eq('document_user_access.user_id', userId);

      if (!ancestorDocs?.length) break;

      // Add fetched ancestors to our page map
      ancestorDocs.forEach((doc) => {
        pageMap.set(doc.source_id, {
          id: doc.source_id,
          title: doc.title,
          parentId: doc.source_parent_id,
        });
        missingParentIds.delete(doc.source_id);

        // Add any new unknown parents to our missing set
        if (doc.source_parent_id && !pageMap.has(doc.source_parent_id)) {
          missingParentIds.add(doc.source_parent_id);
        }
      });
    }

    // Now build complete hierarchy paths
    const hierarchyPaths = new Map<string, string>();

    documents.forEach((page) => {
      const titleParts: string[] = [];
      const seenIds = new Set<string>();
      let currentId: string | undefined = page.id;

      // Build path by walking up parent chain
      while (currentId && !seenIds.has(currentId)) {
        const currentPage = pageMap.get(currentId);
        if (!currentPage) break;

        titleParts.unshift(currentPage.title);
        seenIds.add(currentId);
        currentId = currentPage.parentId;
      }

      // Store complete path (excluding current page title)
      hierarchyPaths.set(page.id, titleParts.slice(0, -1).join('\\'));
    });

    return hierarchyPaths;
  }

  /**
   * Updates hierarchy paths for all documents under a given parent
   * Only updates documents the specified user has access to
   */
  async updateDescendantPaths(parentId: string, userId: string): Promise<void> {
    // First fetch all descendants the user has access to
    const { data: descendants } = await this.supabase
      .from('documents')
      .select(
        'source_id, title, source_parent_id, document_user_access!inner(user_id)',
      )
      .eq('source_parent_id', parentId)
      .eq('document_user_access.user_id', userId);

    if (!descendants?.length) return;

    // Build new hierarchy paths
    const descendantEntries = descendants.map((doc) => ({
      id: doc.source_id,
      title: doc.title,
      parentId: doc.source_parent_id,
    }));

    const newPaths = await this.buildHierarchyPaths(descendantEntries, userId);

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
        batch.map((doc) => this.updateDescendantPaths(doc.source_id, userId)),
      );
    }
  }
}
