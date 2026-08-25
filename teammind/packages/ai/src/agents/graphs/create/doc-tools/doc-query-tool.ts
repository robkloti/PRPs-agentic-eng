import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';

import { PromptTemplate } from '../../../../prompts';
import { TeamMindState } from '../create-graph';

// Zod schema for validation
const DocQueryZodSchema = z.object({
  queryText: z.string(),
  hydeDocument: z.string(),
});

type DocQueryOutput = z.infer<typeof DocQueryZodSchema>;

// Query prompt template for semantic search
const docQuerySystemPrompt =
  PromptTemplate.create(`You are an AI specializing in semantic document search. Your task is to generate optimal search parameters to find existing documentation related to a meeting transcript.

## SEARCH SYSTEM CONTEXT
This system performs semantic vector search using two components:
1. A natural language query describing what we're looking for
2. A hypothetical document (HyDE) representing what a matching document might contain

## QUERY GENERATION GUIDELINES
Create a natural language query that:
- Captures the main topic(s) from the transcript
- Includes specific technical terminology exactly as used
- Focuses on the most substantial information
- Mentions project names, product features, or systems discussed
- Is formulated as a clear information need (1-2 sentences)

## HYPOTHETICAL DOCUMENT GUIDELINES
Create a hypothetical document that:
- Resembles a technical document covering the main topic
- Contains 2-3 paragraphs of detailed content
- Includes specific terms, parameters, and details from the transcript
- Is organized with a clear structure (headings, paragraphs)
- Focuses on the most important technical information
- Captures the essence of what we expect to find in existing documentation

## VERIFICATION STEP
Before generating the final JSON output, review your generated 'queryText' and 'hydeDocument'. Ensure they strictly follow all the guidelines provided above. Check for clarity, relevance to the transcript, inclusion of specific terms, and appropriate structure/length.

## OUTPUT FORMAT
Provide your output in this JSON structure:
{
  "queryText": "Your natural language query for finding relevant documents",
  "hydeDocument": "Your hypothetical document representing what we're looking for"
}

The effectiveness of your search parameters directly impacts the system's ability to find relevant documentation and prevent duplication.`);
const docQueryUserPrompt = PromptTemplate.create<{ transcript: string }>(
  `Here is the meeting transcript you need to analyze:

<meeting_transcript>
{{transcript}}
</meeting_transcript>`,
);

/**
 * Tool that generates document search queries and hypothetical documents
 * for semantic vector search
 */
export const createDocQueryTool = (ai: GoogleGenAI) => {
  return async (
    state: typeof TeamMindState.State,
  ): Promise<typeof TeamMindState.State> => {
    const { transcriptSummary } = state;

    try {
      const formattedPrompt = docQueryUserPrompt.format({
        transcript: transcriptSummary,
      });

      const queryResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: formattedPrompt,
        config: {
          temperature: 0.5,
          responseMimeType: 'application/json',
          systemInstruction: docQuerySystemPrompt.format(),
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              queryText: {
                type: Type.STRING,
                description:
                  'Natural language query for semantic vector search',
              },
              hydeDocument: {
                type: Type.STRING,
                description:
                  "A hypothetical document that represents what we're looking for",
              },
            },
            required: ['queryText', 'hydeDocument'],
          },
        },
      });

      // Check if response text exists before parsing
      if (!queryResponse.text) {
        throw new Error(
          'Model response did not contain text for JSON parsing.',
        );
      }
      const queryOutput: DocQueryOutput = DocQueryZodSchema.parse(
        JSON.parse(queryResponse.text),
      );

      // Return the query output
      return {
        ...state,
        documentQueryText: queryOutput.queryText,
        documentHyde: queryOutput.hydeDocument,
      };
    } catch (error) {
      console.error('Error in document query generation:', error);

      // Return a default query on error
      return {
        ...state,
        documentQueryText: 'Information about topics discussed in the meeting',
        documentHyde:
          'This document contains a summary of the key topics and decisions from the meeting, including technical details, project information, and action items that were discussed.',
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Unknown query generation error',
          timestamp: new Date().toISOString(),
        },
      };
    }
  };
};
