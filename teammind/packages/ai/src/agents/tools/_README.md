# Tools

## Env keys needed:

```sh
EXA_API_KEY
GOOGLE_MAPS_API_KEY
MAPBOX_ACCESS_TOKEN
OPENWEATHER_API_KEY
SMITHERY_API_KEY
TMDB_API_KEY
TAVILY_API_KEY
GOOGLE_GENERATIVE_AI_API_KEY
YT_ENDPOINT
```

## Example Usage

```ts
import { openai } from '@ai-sdk/openai';
import { createDataStreamResponse, streamText } from 'ai';
import { SupabaseClient } from '@supabase/supabase-js';

import { Database } from '@tm/supabase/database';
import {
  getAvailableTools,
  getToolExecuteFunctions,
  processToolConfirmations
} from '../../agents/tools';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages, userId } = await req.json();
  const supabase: SupabaseClient<Database> = /* initialize your Supabase client */;

  return createDataStreamResponse({
    execute: async dataStream => {
      // Get available tools for this user
      const tools = await getAvailableTools(supabase, userId);

      // Get execution functions for tools requiring confirmation
      const executeFunctions = getToolExecuteFunctions(supabase, userId);

      // Process any tool confirmations in the messages
      const processedMessages = await processToolConfirmations(
        {
          messages,
          dataStream,
          tools,
        },
        executeFunctions
      );

      // Generate AI response with the processed messages
      const result = streamText({
        model: openai('gpt-4o'),
        messages: processedMessages,
        tools,
        maxSteps: 5,
      });

      // Merge the result into the data stream
      result.mergeIntoDataStream(dataStream);
    }
  });
}
```
