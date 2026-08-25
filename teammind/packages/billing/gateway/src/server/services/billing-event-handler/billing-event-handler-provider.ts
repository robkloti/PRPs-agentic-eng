import 'server-only';

import { SupabaseClient } from '@supabase/supabase-js';

import { BillingConfig } from '@tm/billing';
import { Database } from '@tm/supabase/database';

import { BillingEventHandlerFactoryService } from './billing-event-handler-factory.service';
import { createBillingEventHandlerService } from './billing-event-handler.service';

// the billing provider from the database
type BillingProvider = Database['public']['Enums']['billing_provider'];

/**
 * @name getBillingEventHandlerService
 * @description This function retrieves the billing provider from the database and returns a
 * new instance of the `BillingGatewayService` class. This class is used to interact with the server actions
 * defined in the host application.
 */
export async function getBillingEventHandlerService(
  clientProvider: () => SupabaseClient<Database>,
  provider: BillingProvider,
  config: BillingConfig,
) {
  const strategy = await BillingEventHandlerFactoryService.GetProviderStrategy(
    provider,
    config,
  );

  return createBillingEventHandlerService(clientProvider, strategy);
}
