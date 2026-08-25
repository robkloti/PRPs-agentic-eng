import { SupabaseClient } from '@supabase/supabase-js';

import { ToolSet } from 'ai';

import { Database } from '@tm/supabase/database';

import { calculatorTool } from './calculator';
import { createGmailTools, getGmailExecuteFunctions } from './google/gmail';
import {
  createCalendarTools,
  getCalendarExecuteFunctions,
} from './google/google-calendar';
import {
  APPROVAL,
  getToolsRequiringConfirmation,
  processToolConfirmations,
} from './utils';

/**
 * Enumeration of all possible tool names that can be used
 */
export type ToolName =
  | 'calculator'
  | 'create_gmail_draft'
  | 'get_gmail_message'
  | 'get_gmail_thread'
  | 'send_gmail_message'
  | 'search_gmail'
  | 'create_calendar_event'
  | 'view_calendar_events';

/**
 * Creates a set of tools that are customized for a specific user
 */
export function createUserTools(
  supabase: SupabaseClient<Database>,
  userId: string,
): ToolSet {
  return {
    calculator: calculatorTool,
    ...createGmailTools(supabase, userId),
    ...createCalendarTools(supabase, userId),
  };
}

/**
 * Get tool execution functions for tools that require confirmation
 */
export function getToolExecuteFunctions(
  supabase: SupabaseClient<Database>,
  userId: string,
) {
  return {
    ...getGmailExecuteFunctions(supabase, userId),
    ...getCalendarExecuteFunctions(supabase, userId),
  };
}

/**
 * Returns a subset of tools available for a user based on permissions
 */
export async function getAvailableTools(
  supabase: SupabaseClient<Database>,
  userId: string,
  toolNames?: ToolName[],
): Promise<ToolSet> {
  const allTools = createUserTools(supabase, userId);

  if (!toolNames) {
    const availableToolNames = await getAvailableToolNames(supabase, userId);
    const availableTools: ToolSet = {};

    for (const name of availableToolNames) {
      if (name in allTools) {
        availableTools[name] = allTools[name as keyof typeof allTools]!;
      }
    }

    return availableTools;
  }

  const availableToolNames = await getAvailableToolNames(supabase, userId);
  const filteredTools: ToolSet = {};

  for (const name of toolNames) {
    if (availableToolNames.includes(name as any) && name in allTools) {
      filteredTools[name] = allTools[name as keyof typeof allTools]!;
    }
  }

  return filteredTools;
}

/**
 * Returns a list of tool names that are available for a user
 */
export async function getAvailableToolNames(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ToolName[]> {
  const availableTools: ToolName[] = ['calculator'];

  const { data: googleConfig } = await supabase
    .from('google_config')
    .select('id, granted_scopes')
    .eq('user_id', userId)
    .single();

  if (googleConfig) {
    if (googleConfig.granted_scopes?.includes('https://mail.google.com/')) {
      availableTools.push(
        'create_gmail_draft',
        'get_gmail_message',
        'get_gmail_thread',
        'send_gmail_message',
        'search_gmail',
      );
    }

    if (
      googleConfig.granted_scopes?.includes(
        'https://www.googleapis.com/auth/calendar',
      )
    ) {
      availableTools.push('create_calendar_event', 'view_calendar_events');
    }
  }

  return availableTools;
}

export { APPROVAL, getToolsRequiringConfirmation, processToolConfirmations };
