import 'server-only';

import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@tm/supabase/database';

import { createBillingGatewayService } from './billing-gateway.service';

/**
 * @description This function retrieves the billing provider from the database and returns a
 * new instance of the `BillingGatewayService` class. This class is used to interact with the server actions
 * defined in the host application.
 */
export async function getBillingGatewayProvider(
  client: SupabaseClient<Database>,
) {
  const provider = await getBillingProvider(client);

  return createBillingGatewayService(provider);
}

async function getBillingProvider(client: SupabaseClient<Database>) {
  const { data, error } = await client
    .from('config')
    .select('billing_provider')
    .limit(1);

  if (error || !data || data.length === 0 || !data[0]!.billing_provider) {
    console.error('Failed to retrieve billing provider:', error);
    throw new Error('Failed to retrieve billing provider');
  }

  return data[0]!.billing_provider;
}
