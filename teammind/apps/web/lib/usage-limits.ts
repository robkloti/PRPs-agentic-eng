import { SupabaseClient } from '@supabase/supabase-js';

import { createAccountsApi } from '@tm/accounts/api';
import billingConfig from '@tm/billing/config';

import { Database } from '~/lib/database.types';

// Default limits for fallback
const DEFAULT_LIMITS = {
  chatCharactersPerFiveHours: 20 * 1800, // around 20 pages of text
  meetingHoursPerMonth: 0,
};

// Type definitions for usage limits
export interface UsageLimits {
  chatCharactersPerFiveHours: number;
  meetingHoursPerMonth: number;
}

/**
 * Get the usage limits for an account based on their subscription
 */
export async function getAccountUsageLimits(
  supabase: SupabaseClient<Database>,
  accountId: string,
): Promise<UsageLimits> {
  try {
    // Get the account's subscription
    const api = createAccountsApi(supabase);
    const subscription = await api.getSubscription(accountId);

    // If no subscription, return default limits
    if (!subscription) {
      return DEFAULT_LIMITS;
    }

    // Match the subscription to the product in the billing config
    for (const product of billingConfig.products) {
      // Check if the subscription contains an item with this product ID
      const hasProductMatch = subscription.items.some(
        (item) => item.product_id === product.id,
      );

      if (hasProductMatch && product.usageLimits) {
        return product.usageLimits as UsageLimits;
      }
    }

    // Fallback to default limits if no match found
    return DEFAULT_LIMITS;
  } catch (error) {
    console.error('Error fetching account usage limits:', error);
    return DEFAULT_LIMITS;
  }
}

/**
 * Check if a user has exceeded their chat message limits
 */
export async function checkChatMessageLimits(
  supabase: SupabaseClient<Database>,
  userId: string,
  accountId: string,
  newMessageLength: number,
): Promise<{ allowed: boolean; currentUsage: number; limit: number }> {
  try {
    // Get the usage limits for this account
    const limits = await getAccountUsageLimits(supabase, accountId);

    // Get the total message length from the last 5 hours
    const fiveHoursAgo = new Date();
    fiveHoursAgo.setHours(fiveHoursAgo.getHours() - 5);

    const { data, error } = await supabase
      .from('messages')
      .select('content')
      .eq('conversation_id', userId) // Assuming we're storing user ID in the conversation_id
      .gte('created_at', fiveHoursAgo.toISOString());

    if (error) {
      console.error('Error checking chat limits:', error);
      // Allow the message if we can't check the limits
      return {
        allowed: true,
        currentUsage: 0,
        limit: limits.chatCharactersPerFiveHours,
      };
    }

    // Calculate total character count
    const currentUsage = data.reduce(
      (total, message) => total + (message.content?.length || 0),
      0,
    );

    // Check if adding this message would exceed the limit
    const allowed =
      currentUsage + newMessageLength <= limits.chatCharactersPerFiveHours;

    return {
      allowed,
      currentUsage,
      limit: limits.chatCharactersPerFiveHours,
    };
  } catch (error) {
    console.error('Error in checkChatMessageLimits:', error);
    // Allow the message if we encounter an error
    return {
      allowed: true,
      currentUsage: 0,
      limit: DEFAULT_LIMITS.chatCharactersPerFiveHours,
    };
  }
}

/**
 * Check if an account has exceeded their meeting hour limits
 */
export async function checkMeetingHourLimits(
  supabase: SupabaseClient<Database>,
  accountId: string,
  estimatedMeetingHours?: number,
): Promise<{ allowed: boolean; currentUsage: number; limit: number }> {
  try {
    // Get the usage limits for this account
    const limits = await getAccountUsageLimits(supabase, accountId);

    // If this account doesn't have meeting capabilities, return false
    if (limits.meetingHoursPerMonth <= 0) {
      return {
        allowed: false,
        currentUsage: 0,
        limit: 0,
      };
    }

    // Get the first day of the current month
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Query meetings from the current month for this account's users
    const { data: accountUsers } = await supabase
      .from('accounts_memberships')
      .select('user_id')
      .eq('account_id', accountId);

    if (!accountUsers || accountUsers.length === 0) {
      return {
        allowed: true,
        currentUsage: 0,
        limit: limits.meetingHoursPerMonth,
      };
    }

    const userIds = accountUsers.map((user) => user.user_id);

    // Get meetings for these users in the current month
    const { data: meetings, error } = await supabase
      .from('meetings')
      .select('time_start, time_end')
      .in('user_id', userIds)
      .gte('time_start', firstDayOfMonth.toISOString())
      .not('time_end', 'is', null);

    if (error) {
      console.error('Error checking meeting limits:', error);
      return {
        allowed: true,
        currentUsage: 0,
        limit: limits.meetingHoursPerMonth,
      };
    }

    // Calculate total meeting hours this month
    const currentMeetingHours = meetings.reduce((total, meeting) => {
      if (meeting.time_start && meeting.time_end) {
        const start = new Date(meeting.time_start);
        const end = new Date(meeting.time_end);
        const durationHours =
          (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return total + durationHours;
      }
      return total;
    }, 0);

    // Check if adding this meeting would exceed the limit
    const estimatedHours = estimatedMeetingHours ?? 1; // Default to 1 hour if not specified
    const allowed =
      currentMeetingHours + estimatedHours <= limits.meetingHoursPerMonth;

    return {
      allowed,
      currentUsage: currentMeetingHours,
      limit: limits.meetingHoursPerMonth,
    };
  } catch (error) {
    console.error('Error in checkMeetingHourLimits:', error);
    // Deny the meeting if we encounter an error with limit checking
    return { allowed: false, currentUsage: 0, limit: 0 };
  }
}
