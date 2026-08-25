import { NextResponse } from 'next/server';
import { User } from '@supabase/supabase-js';
import { google } from '@ai-sdk/google';
import {
  TextContentPart,
  ThreadAssistantContentPart,
  ToolCallContentPart,
} from '@assistant-ui/react';
import { generateObject, streamText } from 'ai';
import { ReadonlyJSONObject } from 'node_modules/@assistant-ui/react/dist/utils/json/json-value';
import { HierachicalSearchParams } from 'node_modules/@tm/ai/src/storage/retrieve';

import { PostHog } from "posthog-node";
import { withTracing } from "@posthog/ai";

import { createAccountsApi } from '@tm/accounts/api';
import { ChunkItem, DocumentSource, QueryExpansionOutput } from '@tm/ai'; 
import {
  queryExpansionSchema,
  queryExpansionSystemPrompt,
  queryExpansionUserPrompt,
  chatSystemPrompt,
  chatUserPrompt, 
  gapAnalysisSchema, 
  gapAnalysisSystemPrompt,
  gapAnalysisUserPrompt,
} from '@tm/ai/prompts';
import { GroupedSearchResultItem, HierarchicalRetriever } from '@tm/ai/storage';
import { HandlerParams, enhanceRouteHandler } from '@tm/next/routes';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { Database } from '~/lib/database.types';
import { checkChatMessageLimits } from '~/lib/usage-limits';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Configuration constants
const DOC_SEARCH_LIMIT = 128;
const CHUNK_SEARCH_LIMIT = 512;
const MAX_HISTORY_MESSAGES_HELPER_PROMPTs = 4;
const MAX_MESSAGE_LENGTH_HELPER_PROMPTS = 1000;
const MAX_HISTORY_MESSAGES_ANSWER_PROMPT = 10;
const EMBEDDING_WEIGHT = 0.7; // 70% weight for embeddings
const FULLTEXT_WEIGHT = 0.3; // 30% weight for full-text search
const FOLLOW_UP_PRIORITY_THRESHOLD = 7; // Minimum importance for follow-up searches
const MAX_FOLLOW_UP_SEARCHES = 2; // Limit follow-up searches for efficiency

// Initialize PostHog client
const posthog = new PostHog(process.env.POSTHOG_API_KEY || 'phc_2iqHDFdXj1A8gmGoJ8k4qWw9dfchHsN76bbiPNCpOmC', { host: process.env.POSTHOG_HOST || 'https://eu.i.posthog.com' });

// Initialize traced models upfront
const tracedExpansionModel = withTracing(
  google('gemini-2.0-flash-lite'),
  posthog,
  {}
);

const tracedGapAnalysisModel = withTracing(
  google('gemini-2.5-flash-preview-04-17'),
  posthog,
  {}
);

const tracedSynthesisModel = withTracing(
  google('gemini-2.5-flash-preview-04-17'),
  posthog,
  {}
);

// Ensure clean shutdown of PostHog client
process.on('beforeExit', () => {
  posthog.shutdown();
});

interface RequestBody {
  messages: { role: 'user' | 'assistant'; content: string }[];
  conversationId?: string;
  source?: DocumentSource | DocumentSource[];
}

type ConversationResponse =
  Database['public']['Tables']['conversations']['Insert'];
type Message = Database['public']['Tables']['messages']['Row'];

// Initialize services
const supabase = getSupabaseServerClient({ admin: true });

// Initialize hierarchical retriever
const hierarchicalRetriever = new HierarchicalRetriever({
  client: supabase,
  docSearchLimit: DOC_SEARCH_LIMIT,
  chunkSearchLimit: CHUNK_SEARCH_LIMIT,
  embeddingWeight: EMBEDDING_WEIGHT,
  fulltextWeight: FULLTEXT_WEIGHT,
});

export const POST = enhanceRouteHandler(
  async ({ request, user, teamAccount }: HandlerParams<undefined, true>) => {
    try {
      const { message, messages, conversationId, userName, source, signal } =
        await validateRequest(request, user);

      const query = message;

      if (!teamAccount?.id) {
        return NextResponse.json(
          { error: 'No accounts found for user' },
          { status: 400 },
        );
      }

      // Fetch message history if conversationId is provided
      const messageHistory = await fetchMessageHistory(conversationId, user.id);

      // Check message limits
      const { allowed, currentUsage, limit } = await checkChatMessageLimits(
        supabase, 
        user.id, 
        teamAccount.id, 
        query.length
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

      // Perform query expansion BEFORE conversation creation
      console.time('EXPAND');
      const expansionOutput = await expandQuery({
        userName,
        query,
        messageHistory,
        signal,
      });
      console.log('Query expansion output:', expansionOutput);
      console.timeEnd('EXPAND');

      if (signal.aborted) {
        return new Response("Request aborted", { status: 499 });
      }

      // Create or validate conversation ID
      let currentConversationId = conversationId;
      if (conversationId) {
        const { data } = await supabase
          .from('conversations')
          .select('id')
          .eq('id', conversationId)
          .eq('user_id', user.id)
          .single();

        if (!data) {
          // If conversation doesn't exist or doesn't belong to user, create a new one
          currentConversationId = await createNewConversation(
            user.id,
            // Use expansion output title if available
            expansionOutput.title ?? query.slice(0, 100),
          );
        }
      } else {
        // Create new conversation if none provided
        currentConversationId = await createNewConversation(
          user.id,
          // Use expansion output title if available
          expansionOutput.title ?? query.slice(0, 100),
        );
      }

      if (currentConversationId) {
        await syncConversationState(currentConversationId, messages.length);
      }

      // Save user message immediately
      await saveUserMessage(query, currentConversationId!);

      // Create stream for orchestrated response
      const { stream } = await createOrchestratedStream(
        query,
        userName,
        user.id,
        messageHistory,
        signal,
        currentConversationId!,
        expansionOutput,
        source
      );

      // Return the response with the stream
      return new Response(stream, {
        headers: {
          'Content-Type': 'text/event-stream',
          'X-Conversation-Id': currentConversationId,
        } as HeadersInit,
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

// Function to create a stream using Orchestrator-Worker pattern
async function createOrchestratedStream(
  query: string,
  userName: string,
  userId: string,
  messageHistory: Partial<Message>[],
  signal: AbortSignal,
  conversationId: string,
  expansionOutput: QueryExpansionOutput,
  source?: DocumentSource | DocumentSource[]
): Promise<{ stream: ReadableStream }> {
  const encoder = new TextEncoder();
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  
  (async () => {
    try {
      // Helper to send events to the stream
      const sendStreamEvent = async (contentParts: ThreadAssistantContentPart[]) => {
        if (signal.aborted) return;
        
        await writer.write(encoder.encode(
          JSON.stringify({ content: contentParts }) + '\n\n'
        ));
      };
      
      // Helper to create text parts
      const createTextPart = (text: string): TextContentPart => ({ 
        type: 'text', 
        text 
      });
      
      // Helper to create tool call parts
      const createToolCallPart = <TArgs extends Record<string, unknown>>(
        name: string,
        args: TArgs
      ): ToolCallContentPart => ({
        type: 'tool-call',
        toolCallId: `${name}-${Date.now()}`,
        toolName: name,
        args: args as ReadonlyJSONObject,
        argsText: JSON.stringify(args),
      });
      
      // 1. QUERY EXPANSION - Already computed, just inform the user
      await sendStreamEvent([
        createToolCallPart('search_process', {
          status: expansionOutput.status,
          query: expansionOutput.expandedQuery,
        }),
      ]);
      
      // 2. INITIAL SEARCH - Perform the hierarchical search
      console.time('INITIAL_SEARCH');
      const searchParams: HierachicalSearchParams = {
        target_user_id: userId,
        start_date: expansionOutput.timeFilter?.startDate ?? undefined,
        end_date: expansionOutput.timeFilter?.endDate ?? undefined,
        embedding_weight: expansionOutput.weights?.semanticWeight ?? EMBEDDING_WEIGHT,
        fulltext_weight: expansionOutput.weights?.keywordWeight ?? FULLTEXT_WEIGHT,
        source: source,
        concatChunks: false,
      };
      
      const initialSearchResults = await hierarchicalRetriever.hierarchicalSearch(
        messageHistory.length > 1 ? expansionOutput.expandedQuery : query,
        expansionOutput.hydeAnswer,
        searchParams,
      );
      console.timeEnd('INITIAL_SEARCH');

      if (signal.aborted) return;

      // Create a Set of URLs to track which documents we've already retrieved
      // This helps us avoid duplicate search results
      const retrievedUrls = new Set<string>();
      
      // Add initial search results to the set of retrieved URLs
      for (const result of initialSearchResults) {
        if (result.url) {
          retrievedUrls.add(result.url);
        }
      }

      // 4. EVALUATION - Orchestrator evaluates search results and identifies gaps
      console.time('EVALUATION');
      const { object: evaluation } = await generateObject({
        model: tracedGapAnalysisModel,
        providerOptions: {
          google: {
            thinkingConfig: {
              thinkingBudget: 128,
            },
          },
        },
        schema: gapAnalysisSchema,
        system: gapAnalysisSystemPrompt.format(),
        messages: [
          ...mapMessageHistoryForAISDK(
            messageHistory,
            MAX_HISTORY_MESSAGES_HELPER_PROMPTs,
            MAX_MESSAGE_LENGTH_HELPER_PROMPTS,
          ),
          { role: 'user', content: gapAnalysisUserPrompt.format({
            query: expansionOutput.expandedQuery,
            initialSearchResults: JSON.stringify(initialSearchResults),
          }) }
        ],
      });
      console.log('Follow-up search gaps: ', evaluation);
      console.timeEnd('EVALUATION');

      if (signal.aborted) return;

      // 5. CONDITIONALLY PERFORM ADDITIONAL SEARCHES
      let allSearchResults = [...initialSearchResults];
      const followupSearchResults: GroupedSearchResultItem[] = [];

      if (
        evaluation.needsAdditionalSearches &&
        evaluation.informationGaps.length > 0
      ) {
        await sendStreamEvent([
          createToolCallPart('search_process', {
            status: 'Searching for additional information',
            query: evaluation.informationGaps
              .map((gap) => gap.followupQuery)
              .join(', '),
          }),
        ]);
        // Sort gaps by importance and limit to MAX_FOLLOW_UP_SEARCHES
        const prioritizedGaps = [...evaluation.informationGaps]
          .filter(gap => gap.importance >= FOLLOW_UP_PRIORITY_THRESHOLD)
          .sort((a, b) => b.importance - a.importance)
          .slice(0, MAX_FOLLOW_UP_SEARCHES);

        console.time('FOLLOW_UP_SEARCHES');
        // Perform follow-up searches in parallel
        const followupSearchPromises = prioritizedGaps.map(async (gap) => {
          const results = await hierarchicalRetriever.hierarchicalSearch(
            gap.followupQuery,
            gap.followUpHydeAnswer,
            searchParams,
          );
          return {
            gap,
            results,
          };
        });

        // Wait for all follow-up searches to complete
        const followupResults = await Promise.all(followupSearchPromises);

        // Add follow-up results to allSearchResults and build followupSearchResults
        for (const { results } of followupResults) {
          if (results.length > 0) {
            // Create a Map to track documents and their chunks by documentId and chunkIndex
            const documentChunksMap = new Map<string, Set<number>>();
            
            // Filter out duplicate search results based on documentId + chunkIndex
            const uniqueResults = results.filter(result => {
              if (!result.documentId) return false;
              
              // Create a unique key for document
              const docKey = `${result.documentId}`;
              
              // Initialize set of chunks for this document if not exists
              if (!documentChunksMap.has(docKey)) {
                documentChunksMap.set(docKey, new Set<number>());
              }
              
              // Get chunk index, defaulting to 0 if not provided
              const chunkIndex = Array.isArray(result.contentParts) 
                ? (result.contentParts[0]?.chunkIndex ?? 0) 
                : 0;
              
              // Check if we already have this chunk
              const chunksSet = documentChunksMap.get(docKey)!;
              if (chunksSet.has(chunkIndex)) {
                return false; // Skip duplicate chunks
              }
              
              // Add to our tracking set
              chunksSet.add(chunkIndex);
              return true;
            });
            
            // Only add unique results
            if (uniqueResults.length > 0) {
              allSearchResults = [...allSearchResults, ...uniqueResults];
              followupSearchResults.push(...uniqueResults);
            }
          }
        }
        console.timeEnd('FOLLOW_UP_SEARCHES');

        if (signal.aborted) return;
      }

      // 6. GENERATE FINAL ANSWER
      console.time('SYNTHESIS');

      const processedSearchResults = [];
      const processedDocIds = new Set<number>();

      for (const result of allSearchResults) {
        if (processedDocIds.has(result.documentId)) {
          continue; // Skip documents we've already processed
        }
        
        // Find all chunks for this document
        const docChunks = allSearchResults.filter(r => r.documentId === result.documentId);
        
        // Extract chunk items from all matches for this document
        const allChunkItems: ChunkItem[] = [];
        for (const chunk of docChunks) {
          if (Array.isArray(chunk.contentParts)) {
            allChunkItems.push(...chunk.contentParts);
          }
        }

        // Create a new processed result
        if (allChunkItems.length > 0) {
          // If we have chunk items, concatenate them
          processedSearchResults.push({
            ...result,
            contentParts: hierarchicalRetriever.concatenateChunks(allChunkItems)
          });
        } else {
          // If no chunk items (because we retrieved the document entirely), preserve the original contentParts
          processedSearchResults.push({
            ...result
          });
        }
        
        // Mark this document as processed
        processedDocIds.add(result.documentId);
      }

      let accumulatedText = '';
      const stream = streamText({
        model: tracedSynthesisModel,
        temperature: 1,
        providerOptions: {
          google: {
            thinkingConfig: {
              thinkingBudget: 2048,
            },
          },
        },
        system: chatSystemPrompt.format(),
        messages: [
          ...mapMessageHistoryForAISDK(
            messageHistory,
            MAX_HISTORY_MESSAGES_ANSWER_PROMPT,
          ),
          {
            role: 'user',
            content: chatUserPrompt.format({ 
              query: query,
              userName: userName,
              currentDateTime: new Date().toISOString(),
              allSearchResults: JSON.stringify(processedSearchResults),
              isFirstMessage: messageHistory.length > 1 ? 'is not' : 'is',
            })
          }
        ],
      });

      // Stream the response
      for await (const chunk of stream.textStream) {
        if (signal.aborted) break;

        if (chunk) {
          accumulatedText += chunk;
          await sendStreamEvent([createTextPart(accumulatedText)]);
        }
      }
      console.timeEnd('SYNTHESIS');

      // 7. Save the assistant message after streaming is complete
      if (accumulatedText && !signal.aborted) {
        // Just save the response and let the document references be added by saveAssistantMessage
        await saveAssistantMessage(
          accumulatedText.trim(),
          conversationId,
          allSearchResults,
          messageHistory,
        );
      }
    } catch (error) {
      console.error('Error in orchestrated stream processing:', error);

      if (!signal.aborted) {
        const errorMessage =
          JSON.stringify({
            content: [
              {
                type: 'text',
                text: 'An error occurred while generating a response. Please try again.',
              },
            ],
          }) + '\n\n';

        await writer.write(encoder.encode(errorMessage));
      }
    } finally {
      writer.close();
    }
  })();

  return { stream: readable };
}

// Simplified query expansion function
async function expandQuery({
  userName,
  query,
  messageHistory,
  signal,
}: {
  userName: string;
  query: string;
  messageHistory: Partial<Message>[];
  signal: AbortSignal;
}): Promise<QueryExpansionOutput> {
  if (signal.aborted) {
    throw new Error('Query expansion aborted by client');
  }

  // Format the user prompt for query expansion
  const formattedQueryExpansionPrompt = queryExpansionUserPrompt.format({
    userName,
    originalQuery: query,
    currentDateTime: new Date().toISOString(),
  });

  const recentMessages = messageHistory.slice(
    -MAX_HISTORY_MESSAGES_HELPER_PROMPTs,
  );
  const firstUserIndex = recentMessages.findIndex((msg) => msg.role === 'user');
  const historyToUse =
    firstUserIndex >= 0 ? recentMessages.slice(firstUserIndex) : [];

  if (signal.aborted) {
    throw new Error('Query expansion aborted by client');
  }

  try {
    console.time('EXPAND_SDK');
    const { object } = await generateObject({
      model: tracedExpansionModel,
      schema: queryExpansionSchema,
      system: queryExpansionSystemPrompt.format(),
      temperature: 0.2,
      messages: [
        ...mapMessageHistoryForAISDK(
          historyToUse,
          MAX_HISTORY_MESSAGES_HELPER_PROMPTs,
          MAX_MESSAGE_LENGTH_HELPER_PROMPTS,
        ),
        { role: 'user', content: formattedQueryExpansionPrompt }
      ],
    });
    console.timeEnd('EXPAND_SDK');

    if (signal.aborted) {
      throw new Error('Query expansion aborted by client');
    }

    // Add default values for removed fields to satisfy interface
    return object;
  } catch (error) {
    if (signal.aborted) {
      throw new Error('Query expansion aborted by client');
    }
    throw error;
  }
}

// -- Helper functions --

function mapMessageHistoryForAISDK(
  messages: Partial<Message>[],
  maxMessages: number,
  maxMessageLength?: number,
): { role: 'user' | 'assistant'; content: string }[] {
  const recentMessages = messages.slice(-maxMessages);
  const firstUserIndex = recentMessages.findIndex((msg) => msg.role === 'user');
  const historyToUse =
    firstUserIndex >= 0 ? recentMessages.slice(firstUserIndex) : [];

  return historyToUse
    .filter((msg) => msg.content && msg.content.trim() !== '')
    .map((msg) => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content:
        maxMessageLength && msg.content && msg.content.length > maxMessageLength
          ? msg.content.slice(0, maxMessageLength) + '...'
          : msg.content || '',
    }));
}

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

  const lastUserMessage = messages[messages.length - 1];

  return {
    message: lastUserMessage!.content,
    messages,
    conversationId,
    userName,
    source,
    signal: request.signal,
  };
}

async function fetchMessageHistory(
  conversationId?: string,
  userId?: string,
): Promise<Partial<Message>[]> {
  if (!conversationId || !userId) {
    return [];
  }

  try {
    const { data: conversationData } = await supabase
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single();

    if (!conversationData) {
      console.warn(
        `Conversation ${conversationId} not found for user ${userId}`,
      );
      return [];
    }

    const { data: messages, error } = await supabase
      .from('messages')
      .select('role, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching message history:', error);
      return [];
    }

    return messages || [];
  } catch (error) {
    console.error('Error in fetchMessageHistory:', error);
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
  searchResults?: GroupedSearchResultItem[],
  messageHistory?: Partial<Message>[],
): Promise<void> {
  if (!assistantContent?.trim()) return;

  try {
    let contentWithReferences = assistantContent.trim();

    // If we have search results, process document references
    if (searchResults && searchResults.length > 0) {
      // Extract all URLs from the current message
      const currentMessageUrls = extractUrlsFromText(assistantContent);

      // Find documents from search results that match the current message URLs
      const potentialReferencedDocs = searchResults.filter((result) =>
        currentMessageUrls.some(
          (url) =>
            result.url === url ||
            result.url.includes(url) ||
            url.includes(result.url),
        ),
      );

      if (potentialReferencedDocs.length > 0 && messageHistory?.length) {
        // Build a set of previously referenced URLs from message history
        const previouslyReferencedUrls = new Set<string>();

        for (const message of messageHistory) {
          // Extract references from previous messages
          const referencesMatch =
            /<referenced-docs>(.*?)<\/referenced-docs>/s.exec(
              message.content ?? '',
            );

          if (referencesMatch?.[1]) {
            try {
              const references = JSON.parse(referencesMatch[1]);
              // Add all URLs from previous references to the set
              for (const ref of references) {
                if (ref.url) {
                  previouslyReferencedUrls.add(ref.url);
                }
              }
            } catch (parseError) {
              console.error(
                'Error parsing previously referenced documents:',
                parseError,
              );
            }
          }
        }

        // Filter to new references only
        const newReferencedDocs = potentialReferencedDocs.filter(
          (doc) =>
            !Array.from(previouslyReferencedUrls).some(
              (prevUrl) =>
                doc.url === prevUrl ||
                (doc.url.includes(prevUrl) && prevUrl.length > 10) ||
                (prevUrl.includes(doc.url) && doc.url.length > 10),
            ),
        );

        // Append hidden tag with document references if any new references were found
        if (newReferencedDocs.length > 0) {
          const docReferences = newReferencedDocs.map((doc) => ({
            source: doc.source,
            title: doc.title,
            url: doc.url,
            content: doc.contentParts,
          }));

          contentWithReferences += `\n\n<referenced-docs>${JSON.stringify(docReferences)}</referenced-docs>`;
        }
      } else if (potentialReferencedDocs.length > 0) {
        // If no message history is available, include all references (fallback)
        const docReferences = potentialReferencedDocs.map((doc) => ({
          source: doc.source,
          title: doc.title,
          url: doc.url,
          content: doc.contentParts,
        }));

        contentWithReferences += `\n\n<referenced-docs>${JSON.stringify(docReferences)}</referenced-docs>`;
      }
    }

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      role: 'assistant',
      content: contentWithReferences,
      created_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving assistant message:', error);
  }
}

function extractUrlsFromText(text: string): string[] {
  // Match URLs in different markdown formats
  const urlPatterns = [
    /\]\((https?:\/\/[^\s\)]+)\)/g, // URLs in markdown links
    /\((https?:\/\/[^\s\)]+)\)/g, // URLs in parentheses
    /(?<![(\[])(https?:\/\/[^\s\)\]]+)/g, // Raw URLs not in parentheses or brackets
  ];

  const urls: string[] = [];

  // Apply each pattern
  for (const pattern of urlPatterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      if (!match[1]) continue; // Skip if no URL found
      urls.push(match[1]);
    }
  }

  return [...new Set(urls)]; // Return unique URLs
}