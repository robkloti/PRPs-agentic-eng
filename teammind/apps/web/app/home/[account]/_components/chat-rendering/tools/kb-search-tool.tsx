import React from 'react';
import { makeAssistantToolUI, useContentPart } from '@assistant-ui/react';
import { Loader2, SearchIcon, BookOpen } from 'lucide-react';
import { ScrollArea } from '@tm/ui/scroll-area';

// Define the expected types for the tool
interface KBSearchArgs {
  query: string;
  hydeAnswer?: string;
  embeddingWeight?: number;
  fulltextWeight?: number;
  source?: string | string[];
}

interface KBSearchResult {
  success: boolean;
  query: string;
  results?: Array<{
    title: string;
    url: string | null;
    source: string | null;
    content: string | null;
    documentId: string;
    updatedAt: string | null;
  }>;
  error?: string;
  stats?: {
    totalResults: number;
    embeddingWeight: number;
    fulltextWeight: number;
    source?: string | string[];
    timeRange: { startDate: string; endDate: string } | null;
  };
}

export const KBSearchToolUI = makeAssistantToolUI<KBSearchArgs, KBSearchResult>({
  toolName: 'kb_search', // Changed from 'name' to 'toolName'
  render: () => {
    const part = useContentPart(s => s);
    
    // Check if this is a tool call part
    if (part.type !== 'tool-call') {
      return null;
    }
    
    const isLoading = part.status.type === 'running';
    const args = part.args as unknown as KBSearchArgs;
    
    // Get result when available (after completion)
    let result: KBSearchResult | null = null;
    if (part.status.type === 'complete' && part.result) {
      result = typeof part.result === 'string' 
        ? JSON.parse(part.result) 
        : part.result;
    }
    
    // Handle loading state
    if (isLoading || !result) {
      return (
        <div className="my-2 flex flex-col rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 flex items-center">
            <SearchIcon className="mr-2 h-4 w-4 text-gray-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Searching knowledge base...
            </p>
          </div>
          <div className="flex items-center text-sm text-gray-500">
            <Loader2 className="mr-2 h-3 w-3 animate-spin" />
            <p>Querying: "{args?.query || 'Loading...'}"</p>
          </div>
        </div>
      );
    }
    
    // Handle successful search
    if (result.success && result.results && result.results.length > 0) {
      return (
        <div className="my-2 flex flex-col rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-2 flex items-center">
            <SearchIcon className="mr-2 h-4 w-4 text-blue-500" />
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Knowledge Base Search
            </p>
          </div>
          
          <div className="mb-2 text-xs text-gray-500">
            <p>Query: "{result.query}"</p>
            <p>Found {result.results.length} results</p>
          </div>
          
          <ScrollArea className="max-h-40">
            <div className="space-y-2">
              {result.results.slice(0, 3).map((item, index) => (
                <div key={index} className="rounded border border-gray-200 p-2 dark:border-gray-700">
                  <div className="flex items-center gap-1 text-xs font-medium text-gray-700 dark:text-gray-300">
                    <BookOpen className="h-3 w-3" />
                    {item.title || "Untitled Document"}
                  </div>
                  <div className="mt-1 text-xs text-gray-500">
                    {item.source && <span className="mr-2 rounded-full bg-gray-200 px-2 py-0.5 text-xs dark:bg-gray-700">{item.source}</span>}
                    {item.updatedAt && <span>Updated: {new Date(item.updatedAt).toLocaleDateString()}</span>}
                  </div>
                </div>
              ))}
              
              {result.results.length > 3 && (
                <div className="text-center text-xs text-gray-500">
                  +{result.results.length - 3} more results
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      );
    }
    
    // Handle failed search or no results
    return (
      <div className="my-2 flex flex-col rounded-md border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-2 flex items-center">
          <SearchIcon className="mr-2 h-4 w-4 text-gray-500" />
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
            Knowledge Base Search
          </p>
        </div>
        <p className="text-xs text-gray-500">
          {result.success === false 
            ? `Search failed: ${result.error || "Unknown error"}` 
            : "No relevant results found"}
        </p>
      </div>
    );
  }
});