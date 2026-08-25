import { Annotation } from '@langchain/langgraph';

export const ActionItemState = Annotation.Root({
  // Input fields
  documentId: Annotation<number>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),
  userId: Annotation<string>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // User mentions
  userConfig: Annotation<{
    mentions?: string[];
    sourceIds?: string[];
  }>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),
  // Document data
  document: Annotation<{
    id: number;
    title: string;
    content: string;
    source: string;
    isUserAuthor: boolean;
    isUserLastUpdater: boolean;
    sourceMentionedUserIds?: string[];
  }>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // Existing action items for similarity check
  existingActionItems: Annotation<
    {
      id: number;
      title: string;
      summary?: string;
      status: string;
    }[]
  >({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // Simple eligibility flag
  isEligible: Annotation<boolean>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // Extracted action items with similarity detection
  extractedActionItems: Annotation<
    {
      title: string;
      summary?: string;
      isRelevantToUser: boolean;
      similarExistingItemId?: number;
    }[]
  >({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // Completion flag
  completed: Annotation<boolean>({
    reducer: (prevValue, newValue) => newValue ?? prevValue,
  }),

  // Error handling
  error: Annotation<{
    message: string;
    timestamp: string;
    operation: string;
  }>({
    reducer: (prev, update) => update ?? prev,
  }),

  retryCount: Annotation<number>({
    reducer: (prev, update) => (update ?? 0) + (prev ?? 0),
  }),
});
