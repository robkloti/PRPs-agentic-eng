import { redirect } from 'next/navigation';

import { MicrosoftApi } from '@tm/ai/integrations/microsoft';
import { MicrosoftSiteMetaData } from '@tm/ai/types';
import { requireUser } from '@tm/supabase/require-user';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { MicrosoftSelectClient } from './microsoft-select-client';

async function getSharePointSites() {
  await new Promise((resolve) => setTimeout(resolve, 2000));
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
      .from('microsoft_config')
      .select(
        'microsoft_account_id, sharepoint_root_id, access_token, refresh_token, selected_sharepoint_sites',
      )
      .eq('user_id', user.id)
      .single();

    if (!config) {
      return { error: 'Configuration not found' };
    }

    const msApi = new MicrosoftApi(config.access_token, config.refresh_token);
    const sites = config.sharepoint_root_id ? await msApi.getSites() : [];

    const selectedSites = (
      (config.selected_sharepoint_sites as unknown as MicrosoftSiteMetaData[]) ||
      []
    ).map((space) => space.id);

    return {
      sites: sites.map((site) => site.getMetadata()),
      selectedSites,
    };
  } catch (error) {
    console.error('Error fetching Microsoft data:', error);
    return { error: 'Failed to fetch Microsoft data' };
  }
}

export async function MicrosoftSelectServer({
  accountSlug,
}: {
  accountSlug: string;
}) {
  const { sites, selectedSites, error } = await getSharePointSites();
  if (error !== undefined) {
    return <div>Error: {error}</div>;
  }

  return (
    <MicrosoftSelectClient
      accountSlug={accountSlug}
      sites={sites}
      initialSelectedSites={selectedSites}
    />
  );
}
