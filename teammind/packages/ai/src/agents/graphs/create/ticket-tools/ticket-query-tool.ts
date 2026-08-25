import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';

import { PromptTemplate } from '../../../../prompts';
import { TeamMindState } from '../create-graph';

const TicketQueryZodSchema = z.object({
  queryText: z.string(),
  hydeTicket: z.string(),
});

type TicketQueryOutput = z.infer<typeof TicketQueryZodSchema>;

const ticketQuerySystemPrompt =
  PromptTemplate.create(`You are an AI expert specializing in analyzing meeting transcripts to generate effective search parameters for ticket and task management systems. Your goal is to create a natural language query and a hypothetical ticket example to find existing, relevant tickets and prevent duplication.

## SEARCH SYSTEM CONTEXT
The search system uses semantic vector search based on two inputs you will generate:
1.  **queryText**: A natural language query describing the core task(s).
2.  **hydeTicket**: A detailed, hypothetical ticket representing an ideal match.

## STEP-BY-STEP GENERATION PROCESS

**Step 1: Analyze the Transcript**
   - Carefully read the provided meeting transcript.
   - Identify the key actionable tasks, decisions, or issues discussed that likely require a ticket.
   - Note any specific project names, technical terms, assignees, or deadlines mentioned.

**Step 2: Generate the Natural Language Query (\`queryText\`)**
   - Formulate a concise (1-2 sentences) natural language query.
   - **Focus:** Target the *specific actionable work* identified in Step 1.
   - **Keywords:** Include relevant project names, task types (e.g., "bug fix," "feature implementation," "documentation update"), and *exact* technical terminology used in the transcript.
   - **Intent:** Phrase it as a clear request for information about existing tickets related to this work (e.g., "Find tickets related to implementing the new auth flow for Project Phoenix," "Search for issues about the database connection leak in the reporting module").

**Step 3: Generate the Hypothetical Ticket (\`hydeTicket\`)**
   - Construct a realistic, well-structured hypothetical ticket that embodies the task(s).
   - **Title:** Create a clear, action-oriented title (e.g., "Implement New User Authentication Flow," "Fix Database Connection Leak in Reporting Module").
   - **Description:** Write a detailed description outlining the work required, referencing specifics from the transcript. Include context, goals, and any mentioned technical requirements or constraints.
   - **Acceptance Criteria:** Define clear, measurable criteria for when the task is considered complete (Definition of Done).
   - **Metadata (Simulated):** If assignees, teams, priority, or components were mentioned, include them (e.g., "Assignee: Frontend Team," "Priority: High").
   - **Structure:** Follow a standard ticket format (Title, Description, Acceptance Criteria, Metadata).

**Step 4: Review and Refine**
   - **Self-Correction:** Before finalizing, review your generated \`queryText\` and \`hydeTicket\`.
   - Does the \`queryText\` accurately capture the core task and include key terms? Is it phrased as an effective search query?
   - Does the \`hydeTicket\` realistically represent the task discussed? Is it detailed, well-structured, and include necessary information like acceptance criteria?
   - Ensure both components are directly derived from the transcript content.

**Step 5: Format the Output**
   - Provide your final output *only* in the following JSON structure. Do not include any explanatory text outside the JSON object.
     \`\`\`json
     {
       "queryText": "Your generated natural language query",
       "hydeTicket": "Your generated hypothetical ticket content"
     }
     \`\`\`

## IMPORTANT CONSIDERATIONS
- Accuracy is key. Use the exact terminology and details from the transcript.
- The quality of your \`queryText\` and \`hydeTicket\` directly impacts the system's ability to find relevant existing tickets and avoid creating duplicates. Aim for clarity, specificity, and completeness based *only* on the provided transcript.
`);
const ticketQueryUserPrompt = PromptTemplate.create<{ transcript: string }>(
  `Here is the meeting transcript you need to analyze:

<transcript>
{{transcript}}
</transcript>`,
);

/**
 * Tool that generates ticket search queries and hypothetical tickets
 * for semantic vector search
 */
export const createTicketQueryTool = (ai: GoogleGenAI) => {
  return async (
    state: typeof TeamMindState.State,
  ): Promise<typeof TeamMindState.State> => {
    const { transcriptSummary } = state;

    try {
      const formattedPrompt = ticketQueryUserPrompt.format({
        transcript: transcriptSummary,
      });

      const queryResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: formattedPrompt,
        config: {
          temperature: 0.5,
          responseMimeType: 'application/json',
          systemInstruction: ticketQuerySystemPrompt.format(),
          responseSchema: {
            type: Type.OBJECT,
            description:
              'Generate natural language query and hypothetical ticket for semantic search',
            properties: {
              queryText: {
                type: Type.STRING,
                description:
                  'Natural language query for finding relevant tickets',
              },
              hydeTicket: {
                type: Type.STRING,
                description:
                  "A hypothetical ticket that represents the task/issue we're looking for",
              },
            },
            required: ['queryText', 'hydeTicket'],
          },
        },
      });

      // Check if response text exists before parsing
      if (!queryResponse.text) {
        throw new Error(
          'Model response did not contain text for JSON parsing.',
        );
      }
      const queryOutput: TicketQueryOutput = TicketQueryZodSchema.parse(
        JSON.parse(queryResponse.text),
      );

      // Return the query output
      return {
        ...state,
        ticketQueryText: queryOutput.queryText,
        ticketHyde: queryOutput.hydeTicket,
      };
    } catch (error) {
      console.error('Error in ticket query generation:', error);

      // Return a default query on error
      return {
        ...state,
        ticketQueryText: 'Tasks related to the topics discussed in the meeting',
        ticketHyde:
          '# Task Implementation\n\n## Description\nThis task involves implementing the features and addressing the issues discussed in the meeting. Work includes technical development, testing, and coordination with team members.\n\n## Acceptance Criteria\n- Implementation meets the requirements discussed\n- Code passes all tests\n- Documentation is updated\n\n## Metadata\n* **Type:** Task\n* **Priority:** Medium\n* **Status:** To Do\n* **Components:** Core System',
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
