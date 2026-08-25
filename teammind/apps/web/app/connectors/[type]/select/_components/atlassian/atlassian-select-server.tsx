import { redirect } from 'next/navigation';

import { ConfluenceApi, JiraApi } from '@tm/ai/integrations/atlassian';
import { ConfluenceSite, JiraSite } from '@tm/ai/types';
import { requireUser } from '@tm/supabase/require-user';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { AtlassianSelectClient } from './atlassian-select-client';

interface Space {
  id: string;
  name: string;
  type: string;
}

interface Board {
  id: string;
  name: string;
  type: string;
}

async function getAtlassianSelections() {
  try {
    const client = getSupabaseServerClient();
    const auth = await requireUser(client);

    // If the user is not authenticated, redirect to the specified URL.
    if (auth.error) {
      return redirect(auth.redirectTo);
    }

    const user = auth.data;

    // Get Atlassian config with access token and selected items
    const { data: config } = await client
      .from('atlassian_config')
      .select(
        'atlassian_account_id, access_token, atlassian_cloud_id, atlassian_base_url, selected_confluence_spaces, selected_jira_boards',
      )
      .eq('user_id', user.id)
      .single();

    if (!config) {
      return { error: 'Configuration not found' };
    }

    // Get all available spaces and boards
    const [spaces, boards] = await Promise.all([
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
    const filteredSpaces = spaces.filter(
      (space) =>
        space.type !== 'personal' ||
        (space.type === 'personal' &&
          space.authorId === config.atlassian_account_id),
    );

    // Map to simple format for frontend
    const simplifiedSpaces: Space[] = filteredSpaces.map((space) => ({
      id: space.id,
      name: space.name,
      type: 'confluence',
    }));

    const simplifiedBoards: Board[] = boards.map((board) => ({
      id: board.id.toString(),
      name: board.name,
      type: 'jira',
    }));

    // Get selected IDs from stored configuration
    const selectedSpaceIds = (
      (config.selected_confluence_spaces as unknown as ConfluenceSite[]) || []
    ).map((space: ConfluenceSite) => space.id);

    const selectedBoardIds = (
      (config.selected_jira_boards as unknown as JiraSite[]) || []
    ).map((board: JiraSite) => board.id.toString());

    return {
      spaces: simplifiedSpaces,
      boards: simplifiedBoards,
      selectedSpaces: selectedSpaceIds,
      selectedBoards: selectedBoardIds,
    };
  } catch (error) {
    console.error('Error fetching Atlassian data:', error);
    return { error: 'Failed to fetch Atlassian data' };
  }
}

export async function AtlassianSelectServer({
  accountSlug,
}: {
  accountSlug: string;
}) {
  const { spaces, boards, selectedSpaces, selectedBoards, error } =
    await getAtlassianSelections();

  if (error !== undefined) {
    return <div>Error: {error}</div>;
  }

  return (
    <AtlassianSelectClient
      accountSlug={accountSlug}
      spaces={spaces || []}
      boards={boards || []}
      initialSelectedSpaces={selectedSpaces || []}
      initialSelectedBoards={selectedBoards || []}
    />
  );
}
