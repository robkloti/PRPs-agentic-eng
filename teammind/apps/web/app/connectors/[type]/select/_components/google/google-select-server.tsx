import { redirect } from 'next/navigation';

import { requireUser } from '@tm/supabase/require-user';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { fetchRootFolders } from './actions';
import { GoogleSelectClient } from './google-select-client';

interface GoogleFolder {
  id: string;
  name: string;
  parentId?: string;
  hasChildren?: boolean;
  children?: GoogleFolder[];
}

// Configuration constants
const INITIAL_PRELOAD_DEPTH = 1;
async function getGoogleDriveRootFolders() {
  try {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);

    // If the user is not authenticated, redirect to the specified URL.
    if (auth.error) {
      return redirect(auth.redirectTo);
    }

    const user = auth.data;

    // Get Google config with selected items
    const { data: config } = await client
      .from('google_config')
      .select('selected_folders')
      .eq('user_id', user.id)
      .single();

    if (!config) {
      return { error: 'Configuration not found' };
    }

    // Fetch root folders with optimized preloading
    const rootFolders = await fetchRootFolders(user.id, INITIAL_PRELOAD_DEPTH);

    // Get previously selected folder IDs
    const selectedFolderIds = (
      (config.selected_folders as unknown as GoogleFolder[]) || []
    ).map((folder) => folder.id);

    return {
      rootFolders,
      selectedFolderIds,
    };
  } catch (error) {
    console.error('Error fetching Google Drive folders:', error);
    return { error: 'Failed to fetch Google Drive folders' };
  }
}

export async function GoogleSelectServer({
  accountSlug,
}: {
  accountSlug: string;
}) {
  const { rootFolders, selectedFolderIds, error } =
    await getGoogleDriveRootFolders();

  if (error !== undefined) {
    return <div>Error: {error}</div>;
  }

  return (
    <GoogleSelectClient
      accountSlug={accountSlug}
      rootFolders={rootFolders || []}
      initialSelectedFolders={selectedFolderIds || []}
      preloadDepth={2} // Configure how many levels to preload when a folder is opened
    />
  );
}
