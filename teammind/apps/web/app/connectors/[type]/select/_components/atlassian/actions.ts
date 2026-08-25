'use server';

import { redirect } from 'next/navigation';

import { ConfluenceApi, JiraApi } from '@tm/ai/integrations/atlassian';
import { DocumentAccessManager } from '@tm/ai/storage';
import { ConfluenceSite, JiraSite } from '@tm/ai/types';
import { Json } from '@tm/supabase/database';
import { requireUser } from '@tm/supabase/require-user';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { loadAtlassianData } from '~/api/_trigger.dev/connectors/atlassian';

export async function updateAtlassianSelections(
  accountSlug: string,
  selectedSpaces: string[],
  selectedBoards: string[],
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
      .from('atlassian_config')
      .select(
        'atlassian_account_id, atlassian_base_url, access_token, atlassian_cloud_id, selected_confluence_spaces, selected_jira_boards',
      )
      .eq('user_id', user.id)
      .single();

    if (!config) {
      return { error: 'Configuration not found' };
    }

    // Get full objects for both Confluence and Jira
    const [allSpaces, allBoards] = await Promise.all([
      config.atlassian_cloud_id
        ? ConfluenceApi.getSpaces({
            cloudId: config.atlassian_cloud_id,
            accessToken: config.access_token,
          })
        : [],
      config.atlassian_cloud_id
        ? JiraApi.getBoards({
            cloudId: config.atlassian_cloud_id,
            accessToken: config.access_token,
          })
        : [],
    ]);

    // Filter spaces to include all non-personal spaces and only personal spaces owned by the user
    const filteredSpaces = allSpaces.filter(
      (space) =>
        space.type !== 'personal' ||
        (space.type === 'personal' &&
          space.authorId === config.atlassian_account_id),
    );

    // Map selected IDs to full objects and ensure they have the required structure
    const selectedSpaceObjects = filteredSpaces.filter((space) =>
      selectedSpaces.includes(space.id),
    );

    const selectedBoardObjects = allBoards
      .filter((board) => selectedBoards.includes(board.id.toString()))
      .map(
        (board): JiraSite => ({
          ...board,
          id: board.id,
          location: {
            ...board.location,
            projectId: board.location.projectId,
          },
        }),
      );

    // Handle deselected spaces
    const previousSpaceIds =
      (config.selected_confluence_spaces as unknown as ConfluenceSite[])?.map(
        (space) => space.id,
      ) || [];
    const deselectedSpaceIds = previousSpaceIds.filter(
      (id) => !selectedSpaces.includes(id),
    );

    // Handle deselected boards
    const previousBoardIds =
      (config.selected_jira_boards as unknown as JiraSite[])?.map(
        (board) => board.id,
      ) || [];
    const deselectedBoardIds = previousBoardIds.filter(
      (id) => !selectedBoards.includes(id.toString()),
    );

    // Remove access to deselected spaces' documents
    if (deselectedSpaceIds.length > 0) {
      await accessManager.manageUserAccess(user.id, 'remove', {
        source: 'confluence',
        metadata: {
          space_id: deselectedSpaceIds,
        },
      });
    }

    // Remove access to deselected boards' documents
    if (deselectedBoardIds.length > 0) {
      await accessManager.manageUserAccess(user.id, 'remove', {
        source: 'jira',
        metadata: {
          board_id: deselectedBoardIds,
        },
      });
    }

    // Update selections for both
    const { error: updateError } = await supabase
      .from('atlassian_config')
      .update({
        selected_confluence_spaces: selectedSpaceObjects as unknown as Json[],
        selected_jira_boards: selectedBoardObjects as unknown as Json[],
      })
      .eq('user_id', user.id);

    if (updateError) {
      return { error: 'Failed to update selections' };
    }

    if (
      (selectedSpaceObjects.length > 0 || selectedBoardObjects.length > 0) &&
      config.atlassian_base_url &&
      config.atlassian_cloud_id
    ) {
      await loadAtlassianData.trigger({
        userId: user.id,
        cloudId: config.atlassian_cloud_id,
        accessToken: config.access_token,
        baseUrl: config.atlassian_base_url,
        selectedSpaces:
          selectedSpaceObjects.length > 0 ? selectedSpaceObjects : undefined,
        selectedBoards:
          selectedBoardObjects.length > 0 ? selectedBoardObjects : undefined,
      });

      // Wait for 3 seconds before redirecting to allow the loader to start
      await new Promise((resolve) => setTimeout(resolve, 3000));
    }
  } catch (error) {
    console.error('Error updating selections:', error);
    return { error: 'Failed to update selections' };
  }

  redirect(`/home/${accountSlug}`);
}
