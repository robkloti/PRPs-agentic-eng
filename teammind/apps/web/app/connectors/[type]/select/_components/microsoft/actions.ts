'use server';

import { redirect } from 'next/navigation';

import { MicrosoftApi } from '@tm/ai/integrations/microsoft';
import { DocumentAccessManager } from '@tm/ai/storage';
import { MicrosoftSiteMetaData } from '@tm/ai/types';
import { Json } from '@tm/supabase/database';
import { requireUser } from '@tm/supabase/require-user';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { loadSharePointDocs } from '~/api/_trigger.dev/connectors/microsoft';

export async function updateSelections(
  accountSlug: string,
  selectedSiteIds: string[],
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
    const allSites = await msApi.getSites();
    const selectedSites = allSites
      .filter((site) => selectedSiteIds.includes(site.id))
      .map((site) => site.getMetadata());

    // Handle deselected spaces
    const previousSiteIds =
      (
        config.selected_sharepoint_sites as unknown as MicrosoftSiteMetaData[]
      )?.map((site) => site.id) || [];

    const deselectedSiteIds = previousSiteIds.filter(
      (id) => !selectedSites.some((site) => site.id === id),
    );

    // Remove access to deselected spaces' documents
    if (deselectedSiteIds.length > 0) {
      await accessManager.manageUserAccess(user.id, 'remove', {
        source: 'sharepoint',
        metadata: {
          site_id: deselectedSiteIds,
        },
      });
    }

    // Update selections for both
    const { error: updateError } = await supabase
      .from('microsoft_config')
      .update({
        selected_sharepoint_sites: selectedSites as unknown as Json[],
      })
      .eq('user_id', user.id);

    if (updateError) {
      return { error: 'Failed to update selections' };
    }

    // Trigger the SharePoint loader for newly selected sites
    if (selectedSites.length > 0) {
      await loadSharePointDocs.trigger({
        userId: user.id,
        accountId: config.microsoft_account_id,
        accessToken: config.access_token,
        refreshToken: config.refresh_token,
        selectedSites: selectedSites,
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
