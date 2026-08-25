/** 
 * 
 * DEACTIVATED FOR NOW
 */



// import { schedules } from '@trigger.dev/sdk/v3';

// import { getSupabaseServerClient } from '@tm/supabase/server-client';
// import { ActionItemExtractorGraph } from '@tm/ai/agents/graphs';
// import { Database } from '@tm/supabase/database';

// // Define a constant for the document scan interval (in days)
// const DOCUMENT_SCAN_INTERVAL_DAYS = 30; 

// type FindActionItemDocuments = Database['public']['Functions']['find_action_item_documents'];

// export const cronExtractActionItems = schedules.task({
//   id: 'cron-extract-action-items',
//   // Run four times a day at 8 AM, 11 AM, 2 PM, and 5 PM UTC
//   cron: '0 8,11,14,17 * * *',
//   retry: {
//     maxAttempts: 3,
//     minTimeoutInMs: 60000,
//     maxTimeoutInMs: 300000,
//     factor: 2,
//   },
//   maxDuration: 3600,
//   run: async (payload) => {
//     try {
//       const supabase = getSupabaseServerClient({ admin: true });
      
//       console.info('Starting scheduled action item extraction', {
//         timestamp: payload.timestamp,
//       });

//       // Get active personal accounts
//       // TODO improve this query to only fetch accounts that are not already being processed etc.
//       const { data: personalAccounts, error: accountsError } = await supabase
//         .from('accounts')
//         .select('id, primary_owner_user_id')
//         .eq('is_personal_account', true)

//       if (accountsError) {
//         console.error('Error fetching personal accounts', { error: accountsError });
//         throw accountsError;
//       }

//       if (!personalAccounts || personalAccounts.length === 0) {
//         console.info('No personal accounts found');
//         return { status: 'success', message: 'No accounts to process' };
//       }

//       console.info(`Processing action items for ${personalAccounts.length} personal accounts`);
      
//       // Create action item extractor
//       const actionItemExtractor = new ActionItemExtractorGraph(supabase);
      
//       // Process each personal account
//       const results = await Promise.allSettled(
//         personalAccounts.map(async (account) => {
//           try {
//             const userId = account.primary_owner_user_id;
            
//             // Gather user identifiers from all integration configs
//             const mentions = [];
//             const sourceIds = [];
            
//             // Query Google config
//             const { data: googleConfig } = await supabase
//               .from('google_config')
//               .select('email, name')
//               .eq('user_id', userId)
//               .single();
              
//             if (googleConfig) {
//               if (googleConfig.email) mentions.push(googleConfig.email);
//               if (googleConfig.name) mentions.push(googleConfig.name);
//             }
            
//             // Query Microsoft config
//             const { data: microsoftConfig } = await supabase
//               .from('microsoft_config')
//               .select('microsoft_email, microsoft_display_name, microsoft_account_id')
//               .eq('user_id', userId)
//               .single();
              
//             if (microsoftConfig) {
//               if (microsoftConfig.microsoft_email) mentions.push(microsoftConfig.microsoft_email);
//               if (microsoftConfig.microsoft_display_name) mentions.push(microsoftConfig.microsoft_display_name);
//               if (microsoftConfig.microsoft_account_id) sourceIds.push(microsoftConfig.microsoft_account_id);
//             }
            
//             // Query Atlassian config
//             const { data: atlassianConfig } = await supabase
//               .from('atlassian_config')
//               .select('atlassian_email, atlassian_display_name, atlassian_account_id')
//               .eq('user_id', userId)
//               .single();
              
//             if (atlassianConfig) {
//               if (atlassianConfig.atlassian_email) mentions.push(atlassianConfig.atlassian_email);
//               if (atlassianConfig.atlassian_display_name) mentions.push(atlassianConfig.atlassian_display_name);
//               if (atlassianConfig.atlassian_account_id) sourceIds.push(atlassianConfig.atlassian_account_id);
//             }
            
//             // Query Notion config
//             const { data: notionConfig } = await supabase
//               .from('notion_config')
//               .select('owner_email, owner_name, owner_id')
//               .eq('user_id', userId)
//               .single();
              
//             if (notionConfig) {
//               if (notionConfig.owner_email) mentions.push(notionConfig.owner_email);
//               if (notionConfig.owner_name) mentions.push(notionConfig.owner_name);
//               if (notionConfig.owner_id) sourceIds.push(notionConfig.owner_id);
//             }
            
//             // Filter out null/undefined values
//             const filteredMentions = mentions.filter(Boolean);
//             const filteredSourceIds = sourceIds.filter(Boolean);
            
//             console.info(`User ${userId}: Found ${filteredMentions.length} mentions and ${filteredSourceIds.length} source IDs`);
            
//             // Call the RPC to get eligible documents
//             const { data, error } = await supabase.rpc<
//               'find_action_item_documents',
//               FindActionItemDocuments
//             >(
//               'find_action_item_documents',
//               { 
//                 p_user_id: userId,
//                 mentions: filteredMentions,
//                 source_ids: filteredSourceIds,
//                 p_days_interval: DOCUMENT_SCAN_INTERVAL_DAYS
//               }
//             );
            
//             if (error) {
//               console.error(`Error running RPC for user ${userId}`, { error });
//               return { 
//                 accountId: account.id, 
//                 userId, 
//                 status: 'error', 
//                 error: error.message, 
//                 documentCount: 0 
//               };
//             }

//             const documentIds = data?.map(item => item.document_id) || [];
//             const userConfig = {
//               mentions: filteredMentions,
//               sourceIds: filteredSourceIds
//             };
            
//             if (!documentIds.length) {
//               console.info(`No eligible documents found for user ${userId}`);
//               return { 
//                 accountId: account.id, 
//                 userId, 
//                 status: 'success', 
//                 documentCount: 0 
//               };
//             }
            
//             console.info(`Processing ${documentIds.length} documents for user ${userId}`);
            
//             let processedCount = 0;
//             for (const docId of documentIds) {
//               try {
//                 // Extract action items with user config (sequential processing)
//                 await actionItemExtractor.extractActionItems(
//                   docId,
//                   userId,
//                   userConfig
//                 );
                
//                 processedCount++;
//               } catch (docError) {
//                 console.error(`Error processing document ${docId} for user ${userId}`, { 
//                   error: docError instanceof Error ? docError.message : String(docError) 
//                 });
//               }
//             }
            
//             return { 
//               accountId: account.id,
//               userId, 
//               status: 'success', 
//               documentCount: documentIds.length,
//               processedCount 
//             };
//           } catch (userError) {
//             console.error(`Error processing account ${account.id}`, { 
//               error: userError instanceof Error ? userError.message : String(userError) 
//             });
//             return { 
//               accountId: account.id, 
//               userId: account.primary_owner_user_id,
//               status: 'error', 
//               error: userError 
//             };
//           }
//         })
//       );
      
//       // Count successful and failed operations
//       const successful = results.filter(r => r.status === 'fulfilled' && r.value.status === 'success').length;
//       const failed = results.filter(r => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.status === 'error')).length;
      
//       console.info('Action item extraction completed', {
//         totalAccounts: personalAccounts.length,
//         successful,
//         failed
//       });
      
//       return {
//         status: 'success',
//         message: 'Action item extraction complete',
//         stats: {
//           totalAccounts: personalAccounts.length,
//           successful,
//           failed
//         }
//       };
//     } catch (error) {
//       console.error('Error in action item extraction schedule', {
//         error: error instanceof Error ? error.message : 'Unknown error',
//       });
//       throw error;
//     }
//   },
// });