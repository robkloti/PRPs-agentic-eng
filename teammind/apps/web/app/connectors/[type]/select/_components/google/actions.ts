'use server';

import { redirect } from 'next/navigation';

import { GoogleDrive } from '@tm/ai/integrations/google';
import { DocumentAccessManager } from '@tm/ai/storage';
import { Json } from '@tm/supabase/database';
import { requireUser } from '@tm/supabase/require-user';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { loadGoogleDriveDocs } from '~/api/_trigger.dev/connectors/google';

interface GoogleFolder {
  id: string;
  name: string;
  parentId?: string;
  path?: string;
  hasChildren?: boolean;
  children?: GoogleFolder[];
}

// Global search for folders across entire Google Drive
export async function searchGoogleDriveFolders(
  query: string,
): Promise<GoogleFolder[]> {
  if (!query || query.trim().length < 2) {
    return []; // Don't search for very short queries
  }

  try {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);

    if (auth.error) {
      return [];
    }

    const user = auth.data;

    // Get Google config with access token and refresh token
    const { data: config } = await client
      .from('google_config')
      .select('access_token, refresh_token')
      .eq('user_id', user.id)
      .single();

    if (!config) {
      return [];
    }

    // Initialize Google API client
    const drive = new GoogleDrive(
      config.access_token,
      config.refresh_token,
      user.id,
    );

    // Use Google Drive's search capabilities to find folders matching the query
    const { items: searchResults } = await drive.listFiles({
      mimeTypes: ['application/vnd.google-apps.folder'],
      query: query, // Use the search query to find matching folders
    });

    // For each search result, get its full path
    const folderResults = await Promise.all(
      searchResults.map(async (folder) => {
        try {
          const folderObj = await drive.getFileById(folder.id);
          const path = await folderObj.getFolderPath();

          // Check if it has children
          const { items: childItems } = await drive.listFiles({
            mimeTypes: ['application/vnd.google-apps.folder'],
            folderId: folder.id,
          });

          return {
            id: folder.id,
            name: folder.name,
            path: path || folder.name,
            hasChildren: childItems.length > 0,
          };
        } catch (error) {
          console.error(
            `Error processing search result for folder ${folder.id}:`,
            error,
          );
          return null;
        }
      }),
    );

    // Filter out any null results
    return folderResults.filter(Boolean) as GoogleFolder[];
  } catch (error) {
    console.error(`Error searching Google Drive folders:`, error);
    return [];
  }
}

// Fetch subfolders with multiple levels of depth
export async function fetchSubfolders(
  parentId: string,
  depth = 2,
): Promise<GoogleFolder[]> {
  try {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);

    if (auth.error) {
      return [];
    }

    const user = auth.data;

    // Get Google config with access token and refresh token
    const { data: config } = await client
      .from('google_config')
      .select('access_token, refresh_token')
      .eq('user_id', user.id)
      .single();

    if (!config) {
      return [];
    }

    const drive = new GoogleDrive(
      config.access_token,
      config.refresh_token,
      user.id,
    );

    // Start the recursive fetching
    return await fetchFolderWithDepth(drive, parentId, depth);
  } catch (error) {
    console.error(`Error fetching subfolders for ${parentId}:`, error);
    return [];
  }
}

async function fetchFolderWithDepth(
  drive: GoogleDrive,
  folderId: string,
  currentDepth: number,
): Promise<GoogleFolder[]> {
  // Get subfolders for the specified parent
  const { items: subfolders } = await drive.listFiles({
    mimeTypes: ['application/vnd.google-apps.folder'],
    folderId: folderId,
  });

  if (currentDepth <= 0 || subfolders.length === 0) {
    // If we've reached max depth or there are no subfolders, just check if they have children
    return Promise.all(
      subfolders.map(async (folder) => {
        // Check if this folder has any children
        const { items: childItems } = await drive.listFiles({
          mimeTypes: ['application/vnd.google-apps.folder'],
          folderId: folder.id,
        });

        return {
          id: folder.id,
          name: folder.name,
          parentId: folderId,
          hasChildren: childItems.length > 0,
          children: [],
        };
      }),
    );
  } else {
    // If we need to go deeper, recursively fetch children
    return Promise.all(
      subfolders.map(async (folder) => {
        // Recursively fetch children with reduced depth
        const children = await fetchFolderWithDepth(
          drive,
          folder.id,
          currentDepth - 1,
        );

        return {
          id: folder.id,
          name: folder.name,
          parentId: folderId,
          hasChildren: children.length > 0,
          children: children,
        };
      }),
    );
  }
}

// Fetch root folders with initial preloading
export async function fetchRootFolders(
  userId: string,
  preloadDepth = 1,
): Promise<GoogleFolder[]> {
  try {
    const client = getSupabaseServerClient();

    // Get Google config with access token and refresh token
    const { data: config } = await client
      .from('google_config')
      .select('access_token, refresh_token')
      .eq('user_id', userId)
      .single();

    if (!config) {
      return [];
    }

    const drive = new GoogleDrive(
      config.access_token,
      config.refresh_token,
      userId,
    );

    // Get only root folders (those without a parent or with parent = 'root')
    const { items: rootItems } = await drive.listFiles({
      mimeTypes: ['application/vnd.google-apps.folder'],
      folderId: 'root',
    });

    // Use parallel fetching for better performance
    return await Promise.all(
      rootItems.map(async (folder) => {
        let children: GoogleFolder[] = [];

        if (preloadDepth > 0) {
          // Fetch children with the specified depth
          children = await fetchSubfolders(folder.id, preloadDepth - 1);
        } else {
          // Just check if there are any children
          const { items: childItems } = await drive.listFiles({
            mimeTypes: ['application/vnd.google-apps.folder'],
            folderId: folder.id,
          });

          return {
            id: folder.id,
            name: folder.name,
            hasChildren: childItems.length > 0,
          };
        }

        return {
          id: folder.id,
          name: folder.name,
          hasChildren: children.length > 0,
          children: children,
        };
      }),
    );
  } catch (error) {
    console.error('Error fetching root folders:', error);
    return [];
  }
}

export async function updateGoogleFolderSelections(
  accountSlug: string,
  selectedFolderIds: string[],
) {
  try {
    const supabase = getSupabaseServerClient({ admin: true });
    const accessManager = new DocumentAccessManager(supabase);
    const auth = await requireUser(getSupabaseServerClient());

    // If the user is not authenticated, redirect to the specified URL.
    if (auth.error) {
      redirect(auth.redirectTo);
    }
    const user = auth.data;

    // Get current config and previous selections
    const { data: config } = await supabase
      .from('google_config')
      .select('access_token, refresh_token, selected_folders')
      .eq('user_id', user.id)
      .single();

    if (!config) {
      return { error: 'Configuration not found' };
    }

    const drive = new GoogleDrive(
      config.access_token,
      config.refresh_token,
      user.id,
    );

    // Get detailed folder information for selected folders
    const selectedFolders: GoogleFolder[] = [];

    // Use Promise.all for parallel processing
    const folderPromises = selectedFolderIds.map(async (folderId) => {
      try {
        const folder = await drive.getFileById(folderId);
        if (folder?.isFolder()) {
          const path = await folder.getFolderPath();
          return {
            id: folder.id,
            name: folder.name,
            path: path ?? folder.name,
          };
        }
      } catch (error) {
        console.error(`Error getting folder details for ${folderId}:`, error);
      }
      return null;
    });

    // Wait for all folder details to be fetched
    const folderResults = await Promise.all(folderPromises);

    // Filter out null results
    selectedFolders.push(...(folderResults.filter(Boolean) as GoogleFolder[]));

    // Handle deselected folders
    const previousFolderIds = (
      (config.selected_folders as unknown as GoogleFolder[]) || []
    ).map((folder) => folder.id);

    const deselectedFolderIds = previousFolderIds.filter(
      (id) => !selectedFolderIds.includes(id),
    );

    // Remove access to deselected folders' documents
    if (deselectedFolderIds.length > 0) {
      await accessManager.manageUserAccess(user.id, 'remove', {
        source: 'google_drive',
        metadata: {
          folder_id: deselectedFolderIds,
        },
      });
    }

    // Update selected folders in the database
    const { error: updateError } = await supabase
      .from('google_config')
      .update({
        selected_folders: selectedFolders as unknown as Json[],
      })
      .eq('user_id', user.id);

    if (updateError) {
      return { error: 'Failed to update selections' };
    }

    // Trigger the Google Drive loader for selected folders
    if (selectedFolders.length > 0) {
      await loadGoogleDriveDocs.trigger({
        userId: user.id,
        accessToken: config.access_token,
        refreshToken: config.refresh_token,
        selectedFolders: selectedFolders,
      });

      // Wait for 3 seconds before redirecting to allow the loader to start
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } catch (error) {
    console.error('Error updating Google Drive folder selections:', error);
    return { error: 'Failed to update selections' };
  }

  redirect(`/home/${accountSlug}`);
}
