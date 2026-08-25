'use client';

import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

import {
  AssistantRuntimeProvider,
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  type ThreadMessage,
  useLocalRuntime,
  type ChatModelAdapter,
} from '@assistant-ui/react';
import { AlertCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { DocumentSource } from '@tm/ai/types';
import { useSupabase } from '@tm/supabase/hooks/use-supabase';
import { Alert, AlertDescription } from '@tm/ui/alert';
import { Button } from '@tm/ui/button';
import { toast } from '@tm/ui/sonner';
import { Spinner } from '@tm/ui/spinner';

import { Database } from '~/lib/database.types';

import { createFeedbackAdapter } from '../../_components/chat-rendering/feedback-adapter';

import { fetchAvailableSources } from '~/lib/available-sources';
import {
  DisabledContext,
  SourceFilterProvider,
  ReasonSearchToolUI,
  Thread
} from '../../_components/chat-rendering';

type Message = Database['public']['Tables']['messages']['Row'];

interface Props {
  userId: string;
  accountSlug: string;
  isInSidebar?: boolean; // New prop to indicate if the chat is in a sidebar
}

// Main component handles loading initial messages
export default function EnactRuntime({ userId, accountSlug, isInSidebar = false }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationId = searchParams.get('id');
  const supabase = useSupabase();
  const [initialMessages, setInitialMessages] = useState<ThreadMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [validatedConversationId, setValidatedConversationId] = useState<
    string | null
  >(conversationId);
  // State for conversation data
  const [conversationData, setConversationData] = useState<{
    title: string | null;
    favourite: boolean;
  }>({
    title: null,
    favourite: false,
  });
  // Add a ref to track if this is a new conversation we just created
  const isNewlyCreatedConversation = useRef(false);

  useEffect(() => {
    const loadMessages = async () => {
      setIsLoading(true);

      // If this is a newly created conversation that we just set in the child component,
      // don't validate it - just accept it and reset the flag
      if (conversationId && isNewlyCreatedConversation.current) {
        isNewlyCreatedConversation.current = false;
        setValidatedConversationId(conversationId);
        setIsLoading(false);
        return;
      }

      if (conversationId) {
        // Get conversation and its messages in a single query with join
        const { data, error } = await supabase
          .from('conversations')
          .select(
            `
            id, 
            title,
            favourite,
            messages(*)
          `,
          )
          .eq('id', conversationId)
          .eq('user_id', userId)
          .order('created_at', { referencedTable: 'messages', ascending: true })
          .single();

        if (error || !data) {
          // If conversation doesn't exist or doesn't belong to user, remove ID
          setValidatedConversationId(null);
          const pathname = window.location.pathname;
          router.replace(pathname, { scroll: false });
        } else {
          // Conversation is valid, process the messages
          setValidatedConversationId(conversationId);
          setConversationData({
            title: data.title ?? null,
            favourite: data.favourite || false,
          });
          setInitialMessages(
            (data.messages ?? []).map((msg) => convertToThreadMessage(msg)),
          );
        }
      }

      setIsLoading(false);
    };

    void loadMessages();
  }, [conversationId, supabase, router, userId]);

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
        }}
      >
        <Spinner />
      </div>
    );
  }

  return (
    <EnactRuntimeContent
      initialMessages={initialMessages}
      conversationId={validatedConversationId}
      conversationData={conversationData}
      setConversationData={setConversationData}
      isNewlyCreatedConversation={isNewlyCreatedConversation}
      userId={userId}
      accountSlug={accountSlug}
      isInSidebar={isInSidebar}
    />
  );
}

// Custom ChatModelAdapter for handling API communication with streaming
const createEnactModelAdapter = (
  currentConversationId: string | null,
  sources: DocumentSource[],
  userId: string,
  onResponse: (response: Response) => void
): ChatModelAdapter => {
  return {
    // @ts-expect-error TODO: Fix this type error
    async *run({ messages, abortSignal, context }) {
      // Prepare the request body
      const requestBody = {
        messages,
        conversationId: currentConversationId,
        source: sources.length > 0 ? sources : undefined,
        userId: userId,
        context,
      };

      try {
        // Call your API endpoint
        const response = await fetch('/api/enact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: abortSignal,
        });

        // Call the onResponse callback to handle headers, etc.
        onResponse(response);

        // Check if the response is ok
        if (!response.ok) {
          throw new Error(`API response error: ${response.status}`);
        }

        // Use the stream processing approach
        if (response.body) {
          const reader = response.body
            .pipeThrough(new TextDecoderStream())
            .pipeThrough(new EnactStreamTransformer())
            .getReader();

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            yield {
              content: [value],
            }
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error in API stream:', error);
          yield {
            content: [{
              type: 'text' as const,
              text: 'Sorry, there was an error processing your request.'
            }],
          };
        }
      }
    },
  };
};

// Custom transformer for Enact stream format
class EnactStreamTransformer extends TransformStream<string, { text?: string, type?: string, data?: any }> {
  constructor() {
    let buffer = '';
    let accumulatedText = ''; // Add state to track accumulated text

    super({
      transform(chunk, controller) {
        // Add the new chunk to our buffer
        buffer += chunk;

        // Process each line in the buffer
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep the last possibly incomplete line

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            // Extract content part after the prefix
            const colonIndex = line.indexOf(':');
            if (colonIndex === -1) continue;

            const prefix = line.substring(0, colonIndex);
            const jsonContent = line.substring(colonIndex + 1);
            const data = JSON.parse(jsonContent);

            // Push data based on the prefix
            switch (prefix) {
              case '0':
                // Text content - accumulate it instead of just passing through
                accumulatedText += data;
                // Send the accumulated text so far
                controller.enqueue({ type: 'text', text: accumulatedText });
                break;

              case 'b':
                // Tool call initialization
                // If we have accumulated text, make sure it's sent before switching context
                if (accumulatedText) {
                  controller.enqueue({ type: 'text', text: accumulatedText });
                }
                controller.enqueue({ type: 'tool-call', ...data });
                break;

              case '8':
                if (data[0].type === 'tool-call') {
                  // Tool call delta
                  controller.enqueue(data[0]);
                }
                break;

              case '9':
                // Tool call completion
                // controller.enqueue({ type: 'tool-call-finish', data });
                break;

              default:
                console.warn('Unknown prefix:', prefix);
                break;
            }
          } catch (e) {
            console.error('Error processing chunk:', e, line);
          }
        }
      },
      flush(controller) {
        // Make sure to flush any remaining text when the stream ends
        if (accumulatedText) {
          controller.enqueue({ type: 'text', text: accumulatedText });
        }
      }
    });
  }
}

// Child component handles runtime initialization
function EnactRuntimeContent({
  initialMessages,
  conversationId: initialConvId,
  conversationData,
  setConversationData,
  isNewlyCreatedConversation,
  userId,
  accountSlug,
  isInSidebar = false,
}: {
  initialMessages: ThreadMessage[];
  conversationId: string | null;
  conversationData: { title: string | null; favourite: boolean };
  setConversationData: React.Dispatch<
    React.SetStateAction<{ title: string | null; favourite: boolean }>
  >;
  isNewlyCreatedConversation: React.MutableRefObject<boolean>;
  userId: string;
  accountSlug: string;
  isInSidebar?: boolean;
}) {
  const { t } = useTranslation('chat');
  const router = useRouter();
  const [currentConversationId, setCurrentConversationId] =
    useState(initialConvId);
  const [usageLimitError, setUsageLimitError] = useState<{
    currentUsage: number;
    limit: number;
    remainingCharacters: number;
  } | null>(null);
  const initialMessageHandled = useRef(false);
  const supabase = useSupabase();
  const [characterLimitExceeded, setCharacterLimitExceeded] = useState(false);
  const CHARACTER_LIMIT = 20 * 1800; // Around 20 pages of text

  // Initialize with all available sources if no initialSources provided
  const [selectedSourcesState, setSelectedSourcesState] = useState<
    DocumentSource[]
  >([]);
  const [availableSources, setAvailableSources] = useState<DocumentSource[]>(
    [],
  );

  const feedbackAdapter = useMemo(
    () => createFeedbackAdapter(supabase, currentConversationId),
    [supabase, currentConversationId],
  );

  useEffect(() => {
    const loadSources = async () => {
      const sources = await fetchAvailableSources(supabase);
      setAvailableSources(sources);
      setSelectedSourcesState(sources);
    };

    void loadSources();
  }, [supabase]);

  // Add useEffect to fetch conversation data when currentConversationId changes
  useEffect(() => {
    const fetchConversationData = async () => {
      if (!currentConversationId) return;

      try {
        const { data, error } = await supabase
          .from('conversations')
          .select('title, favourite')
          .eq('id', currentConversationId)
          .single();

        if (error) throw error;

        if (data) {
          setConversationData({
            title: data.title,
            favourite: data.favourite || false,
          });
        }
      } catch (error) {
        console.error('Error fetching conversation data:', error);
      }
    };

    // Only fetch if this is a new conversation ID that we just received
    if (currentConversationId && currentConversationId !== initialConvId) {
      void fetchConversationData();
    }
  }, [currentConversationId, initialConvId, supabase, setConversationData]);

  // Function to toggle favourite status
  const toggleFavourite = async () => {
    if (!currentConversationId) return;

    const newFavouriteValue = !conversationData.favourite;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ favourite: newFavouriteValue })
        .eq('id', currentConversationId);

      if (error) throw error;

      setConversationData({
        ...conversationData,
        favourite: newFavouriteValue,
      });

      toast.success(
        newFavouriteValue ? t('addedToBookmarks') : t('removedFromBookmarks'),
      );
    } catch (error) {
      console.error('Error toggling favourite status:', error);
      toast.error(t('errorTogglingBookmark'));
    }
  };

  // Define the response handler
  const handleResponse = (response: Response) => {
    // Handle conversation ID from response headers
    const newConversationId = response.headers.get('X-Conversation-Id');
    if (newConversationId && !currentConversationId) {
      // Set the flag to indicate this is a newly created conversation
      isNewlyCreatedConversation.current = true;
      setCurrentConversationId(newConversationId);
      // Update the URL immediately with the new conversation ID
      router.replace(`?id=${newConversationId}`, { scroll: false });
    }
  };

  // Create the custom model adapter
  const modelAdapter = useMemo(
    () => createEnactModelAdapter(
      currentConversationId,
      selectedSourcesState,
      userId,
      handleResponse
    ),
    [currentConversationId, selectedSourcesState, userId]
  );

  // Use local runtime instead of AI SDK runtime
  const runtime = useLocalRuntime(modelAdapter, {
    initialMessages,
    adapters: {
      feedback: feedbackAdapter,
      attachments: new CompositeAttachmentAdapter([
        new SimpleImageAttachmentAdapter(),
        new SimpleTextAttachmentAdapter(),
      ]),
    },
  });

  // Calculate the character count for limit checking
  useEffect(() => {
    const threadState = runtime.thread.getState();
    if (!threadState.messages.length) return;

    const totalCharCount = threadState.messages.reduce(
      (total: number, message) => {
        // Get text content from parts that have it
        const textParts = message.content.filter(
          (part) => part.type === 'text' && 'text' in part,
        );

        // Sum the lengths
        const messageLength = textParts.reduce(
          (sum, part) => sum + (part.text?.length ?? 0),
          0,
        );

        return total + messageLength;
      },
      0,
    );

    setCharacterLimitExceeded(totalCharCount > CHARACTER_LIMIT);
  }, [runtime.thread, CHARACTER_LIMIT]);

  // Handle initial message from session storage (if any)
  useEffect(() => {
    const initialMessage = sessionStorage.getItem('chatInitialMessage');
    if (!initialConvId && initialMessage && !initialMessageHandled.current) {
      initialMessageHandled.current = true;

      // Check for initial sources as well
      const initialSources = sessionStorage.getItem('chatInitialSources');
      if (initialSources) {
        try {
          setSelectedSourcesState(JSON.parse(initialSources));
          sessionStorage.removeItem('chatInitialSources');
        } catch (e) {
          console.error('Error parsing initial sources', e);
        }
      }

      runtime.thread.composer.setText(initialMessage);
      runtime.thread.composer.send();
      sessionStorage.removeItem('chatInitialMessage');
    }
  }, [runtime, initialConvId]);

  return (
    <DisabledContext.Provider value={characterLimitExceeded}>
      <AssistantRuntimeProvider runtime={runtime}>
        <SourceFilterProvider
          initialSources={selectedSourcesState}
          availableSources={availableSources}
          onSourcesChange={setSelectedSourcesState}
        >
          {usageLimitError && (
            <div className={isInSidebar
              ? "absolute bottom-16 left-0 right-0 z-50 mx-auto w-full px-4"
              : "fixed bottom-4 left-0 right-0 z-50 mx-auto w-full max-w-lg px-4 sm:px-8"
            }>
              <Alert
                variant="warning"
                className="!bg-orange-50 !via-orange-50 !to-orange-50 shadow-lg dark:!bg-orange-900/90 dark:!via-orange-900/30 dark:!to-orange-900/30"
              >
                <AlertCircle className="h-4 w-4 dark:text-white" />
                <AlertDescription className="font-medium dark:text-white">
                  {t('chatMessageLimitReached', {
                    currentUsage: usageLimitError.currentUsage,
                    limit: usageLimitError.limit,
                  })}
                </AlertDescription>
              </Alert>
            </div>
          )}

          {characterLimitExceeded && (
            <div className={isInSidebar
              ? "absolute bottom-16 left-0 right-0 z-50 mx-auto w-full px-4"
              : "fixed bottom-4 left-0 right-0 z-50 mx-auto w-full max-w-lg px-4 sm:px-8"
            }>
              <Alert
                variant="warning"
                className="!bg-orange-50 !via-orange-50 !to-orange-50 shadow-lg dark:!bg-orange-900/90 dark:!via-orange-900/30 dark:!to-orange-900/30"
              >
                <div className="flex w-full flex-col sm:flex-row sm:items-center sm:justify-between">
                  <div className="mb-2 flex items-center gap-2 sm:mb-0">
                    <AlertCircle className="h-5 w-5 flex-shrink-0 dark:text-white" />
                    <AlertDescription className="font-medium dark:text-white">
                      {t('sessionTooLong')}
                    </AlertDescription>
                  </div>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => router.push(`/home/${accountSlug}`)}
                    className="sm:ml-4"
                  >
                    {t('startNewChat')}
                  </Button>
                </div>
              </Alert>
            </div>
          )}

          <ReasonSearchToolUI />

          <Suspense fallback={<Spinner className="size-6" />}>
            <Thread
              conversationTitle={conversationData.title}
              isFavourite={conversationData.favourite}
              onToggleFavourite={toggleFavourite}
              userId={userId}
              accountSlug={accountSlug}
              isInSidebar={isInSidebar}
            />
          </Suspense>
        </SourceFilterProvider>
      </AssistantRuntimeProvider>
    </DisabledContext.Provider>
  );
}

// Helper function to convert database message to ThreadMessage
function convertToThreadMessage(msg: Message): ThreadMessage {
  const content: any[] = [{ type: 'text', text: msg.content }];

  return {
    id: msg.id.toString(),
    content,
    role: msg.role as 'user' | 'assistant',
    createdAt: new Date(msg.created_at),
    metadata: { custom: {} },
    ...(msg.role === 'assistant' && {
      status: { type: 'complete', reason: 'stop' },
    }),
    ...(msg.role === 'user' && { attachments: [] }),
  } as ThreadMessage;
}