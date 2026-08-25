import { NextResponse } from 'next/server';
import { User } from '@supabase/supabase-js';
import { google } from '@ai-sdk/google';
import { CoreMessage, streamText, TextPart, createDataStreamResponse } from 'ai';

import { PostHog } from "posthog-node";
import { withTracing } from "@posthog/ai";

import { createAccountsApi } from '@tm/accounts/api';
import { createReasonSearchTool, DocumentSource } from '@tm/ai'; 
import { enhanceRouteHandler, HandlerParams } from '@tm/next/routes';
import { getSupabaseServerClient } from '@tm/supabase/server-client';
import { enactSystemPrompt, enactUserPrompt } from '@tm/ai/prompts';

import { Database } from '~/lib/database.types';
import { checkChatMessageLimits } from '~/lib/usage-limits';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 800; // 800 seconds (13 minutes) max duration for the function

// Initialize PostHog client
const posthog = new PostHog(process.env.POSTHOG_API_KEY || 'phc_2iqHDFdXj1A8gmGoJ8k4qWw9dfchHsN76bbiPNCpOmC', { host: process.env.POSTHOG_HOST || 'https://eu.i.posthog.com' });

// Initialize traced models upfront
const tracedModel = withTracing(
  google('gemini-2.5-flash-preview-04-17'),
  posthog,
  {}
);

// Ensure clean shutdown of PostHog client
process.on('beforeExit', () => {
  posthog.shutdown();
});

interface RequestBody {
  messages: CoreMessage[];
  conversationId?: string;
  source?: DocumentSource | DocumentSource[];
}

type ConversationResponse =
  Database['public']['Tables']['conversations']['Insert'];

const supabase = getSupabaseServerClient({ admin: true });

export const POST = enhanceRouteHandler(
  async ({ request, user, teamAccount }: HandlerParams<undefined, true>) => {
    try {
      const { query, messages, conversationId, userName, source, signal } =
        await validateRequest(request, user);

      if (!teamAccount?.id) {
        return NextResponse.json(
          { error: 'No accounts found for user' },
          { status: 400 },
        );
      }

      // Check message limits
      const { allowed, currentUsage, limit } = await checkChatMessageLimits(
        supabase,
        user.id,
        teamAccount.id,
        query.length,
      );

      if (!allowed) {
        return NextResponse.json(
          {
            error: 'Chat message limit exceeded',
            details: {
              currentUsage,
              limit,
              remainingCharacters: Math.max(0, limit - currentUsage),
            },
          },
          { status: 403 },
        );
      }

      // Create or validate conversation ID
      let currentConversationId = conversationId;
      let isNewConversation = false;
      if (conversationId) {
        const { data } = await supabase
          .from('conversations')
          .select('id')
          .eq('id', conversationId)
          .eq('user_id', user.id)
          .single();

        if (!data) {
          // If conversation doesn't exist or doesn't belong to user, create a new one
          isNewConversation = true;
          currentConversationId = await createNewConversation(
            user.id,
            query.slice(0, 100),
          );
        }
      } else {
        isNewConversation = true;
        currentConversationId = await createNewConversation(
          user.id,
          query.slice(0, 100),
        );
      }

      if (!currentConversationId) {
        console.error('Failed to create or retrieve conversation ID');
        return NextResponse.json(
          { error: 'Failed to establish conversation context' },
          { status: 500 },
        );
      }

      let aiMessages: { role: 'user' | 'assistant'; content: string }[] = [];
      if (!isNewConversation) {
        await syncConversationState(currentConversationId, messages.length);
        aiMessages = await fetchAndMapMessageHistory(conversationId, user.id);
      }
      await saveUserMessage(query, currentConversationId);
      
      // Format the user prompt
      const formattedUserPrompt = enactUserPrompt.format({
        query,
        userName,
        currentDateTime: new Date().toISOString(),
        isFirstMessage: aiMessages.length === 0 ? 'is' : 'is not',
      });
      
      // Create the data stream response with the conversation ID header
      return createDataStreamResponse({
        execute: (dataStream) => {
          // Create the result from streamText
          const result = streamText({
            model: tracedModel,
            providerOptions: {
              google: {
                thinkingConfig: {
                  thinkingBudget: 4096, // Increased thinking budget for complex reasoning
                },
              },
            },
            tools: {
              reason_search: createReasonSearchTool(dataStream)
            },
            maxSteps: 15, // Increased to allow for multi-step reasoning process
            system: enactSystemPrompt.format(),
            messages: [
              ...aiMessages,
              { role: 'user', content: formattedUserPrompt }
            ],
            toolChoice: 'auto',
            toolCallStreaming: true,
            onFinish: async ({ text, toolCalls, toolResults }) => {
              await saveAssistantMessage(text, currentConversationId);
              
              if (toolCalls.length > 0) {
                // In a real implementation, you might want to store these in a separate table
                // or as additional fields on the messages table
                console.log(`Processed ${toolCalls.length} tool calls`);
              }
            },
            abortSignal: signal
          });
          
          // IMPORTANT: Merge the result into the data stream
          result.mergeIntoDataStream(dataStream, {
            sendReasoning: true
          });
        },
        // Add headers directly in the createDataStreamResponse call
        headers: {
          'X-Conversation-Id': currentConversationId,
        }
      });
    } catch (error) {
      console.error('Error in chat endpoint:', error);
      return NextResponse.json(
        { error: 'Failed to process chat request' },
        { status: 500 },
      );
    }
  },
  { auth: true },
);

// -- Helper functions for message history and conversation management --

async function validateRequest(request: Request, user: User) {
  const body = (await request.json()) as RequestBody;
  const { messages, conversationId, source } = body;

  if (!messages) {
    throw new Error('Missing required message field');
  }

  const api = createAccountsApi(supabase);
  const account = await api.getAccount(user.id);
  if (!account) {
    throw new Error('Account not found');
  }
  const userName = account.name;

   // Get the last user message content
   const lastUserMessage = messages[messages.length - 1];
   const lastUserMessageContent = (lastUserMessage?.content as TextPart[])[0]!;
   const query = lastUserMessageContent.text;

  return {
    query,
    messages,
    conversationId,
    userName,
    source,
    signal: request.signal,
  };
}

async function fetchAndMapMessageHistory(
  conversationId?: string,
  userId?: string,
  maxMessages: number = 10,
): Promise<{ role: 'user' | 'assistant'; content: string }[]> {
  if (!conversationId || !userId) {
    return [];
  }

  try {
    // Fetch messages and verify conversation ownership
    const { data: messages, error } = await supabase
      .from('messages')
      .select(`
        role, 
        content, 
        created_at,
        conversations!inner ( user_id )
      `)
      .eq('conversation_id', conversationId)
      .eq('conversations.user_id', userId)
      .order('created_at', { ascending: true })
      .limit(maxMessages);

    if (error) {
      console.error('Error fetching message history:', error);
      return [];
    }

    if (!messages || messages.length === 0) {
      return [];
    }

    // Map and filter the fetched messages
    const firstUserIndex = messages.findIndex((msg) => msg.role === 'user');
    const historyToUse =
      firstUserIndex >= 0 ? messages.slice(firstUserIndex) : [];

    return historyToUse
      .filter((msg) => msg.content && msg.content.trim() !== '')
      .map((msg) => ({
        // We know role is either 'user' or 'assistant' based on DB constraints/usage
        role: msg.role as 'user' | 'assistant', 
        content: msg.content || '',
      }));

  } catch (error) {
    console.error('Error in fetchAndMapMessageHistory:', error);
    return [];
  }
}

async function syncConversationState(
  conversationId: string,
  clientMessagesCount: number,
): Promise<void> {
  if (!conversationId) return;

  try {
    const { data: dbMessages, error: fetchError } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (fetchError || !dbMessages) {
      console.error('Error fetching messages for sync:', fetchError);
      return;
    }

    const messagesToKeep = clientMessagesCount - 1;

    if (dbMessages.length >= messagesToKeep) {
      const messagesToDelete = dbMessages.slice(messagesToKeep);
      const idsToDelete = messagesToDelete.map((msg) => msg.id);

      if (idsToDelete.length > 0) {
        const { error: deleteError } = await supabase
          .from('messages')
          .delete()
          .in('id', idsToDelete);

        if (deleteError) {
          console.error('Error deleting messages during sync:', deleteError);
        }
      }
    }
  } catch (error) {
    console.error('Error in syncConversationState:', error);
  }
}

async function createNewConversation(
  userId: string,
  title: string,
): Promise<string> {
  const { data: newConversation, error: conversationError } = await supabase
    .from('conversations')
    .insert({ user_id: userId, title })
    .select<'conversations', ConversationResponse>()
    .single();

  if (conversationError ?? !newConversation) {
    console.error('Failed to create conversation:', conversationError);
    throw new Error('Failed to create conversation');
  }

  return newConversation.id!;
}

async function saveUserMessage(
  userContent: string,
  conversationId: string,
): Promise<void> {
  if (!userContent) return;
  try {
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: userContent,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving user message:', error);
  }
}

async function saveAssistantMessage(
  assistantContent: string,
  conversationId: string,
): Promise<void> {
  if (!assistantContent?.trim()) return;

  try {
    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: assistantContent.trim(),
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving assistant message:', error);
  }
}