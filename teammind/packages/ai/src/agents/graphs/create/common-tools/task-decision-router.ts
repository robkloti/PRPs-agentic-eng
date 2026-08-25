import { GoogleGenAI, Type } from '@google/genai';
import { END, Send } from '@langchain/langgraph';
import { z } from 'zod';

import { PromptTemplate } from '../../../../prompts';
import { DocumentSource } from '../../../../types';
import { TeamMindState } from '../create-graph';

// Zod schema for validation
export const TaskDecisionZodSchema = z.object({
  needsDocument: z.boolean(),
  needsTicket: z.boolean(),
});

export type TaskDecisionOutput = z.infer<typeof TaskDecisionZodSchema>;

// Document-focused prompt template with flexible criteria, examples, and thinking process
const taskDecisionSystemPrompt =
  PromptTemplate.create(`You are an AI decision system integrated with a knowledge management platform that processes meeting transcripts to automate documentation and task tracking. Your primary function is to analyze meeting content and determine which automated actions (documentation creation/update, ticket/task creation) should be triggered based on the provided criteria and available tools.

## DECISION TASK
Analyze the provided meeting transcript and determine whether the system should:
1. Create or update documentation based on the content.
2. Create tickets/tasks based on action items or issues discussed.
3. Trigger both actions.
4. Trigger neither action.

## THINKING PROCESS
Follow these steps to make your decision:
1.  **Scan Transcript:** Read through the entire transcript summary.
2.  **Identify Documentation Needs:** Look for content matching the "DOCUMENTATION REQUIRED WHEN" criteria. Note any technical details, processes, designs, decisions, findings, etc.
3.  **Identify Task Needs:** Look for content matching the "TICKETS/TASKS REQUIRED WHEN" criteria. Note any action items, assignments, issues, feature requests, deadlines, follow-ups, etc.
4.  **Apply Guidelines:** Consider the "IMPORTANT GUIDELINES", especially defaulting to documentation and capturing ambiguous tasks.
5.  **Check Connectors:** Review the list of "availableConnectors". A decision to create a document requires a document connector (e.g., confluence, notion, gdocs). A decision to create a ticket requires a ticket connector (e.g., jira, linear, asana).
6.  **Formulate JSON:** Based on the analysis and connector availability, determine the boolean values for \`needsDocument\` and \`needsTicket\`. If documentation criteria are met AND a document connector is available, set \`needsDocument\` to true. If task criteria are met AND a ticket connector is available, set \`needsTicket\` to true.
7.  **Output:** Respond *only* with the final JSON object. Do not include your thinking steps or any other text.

## DECISION CRITERIA

### DOCUMENTATION REQUIRED WHEN:
- Important information, decisions, plans, or processes are discussed that need to be recorded for future reference or team knowledge.
- Key details, specifications, findings, or rationales are shared.

### TICKETS/TASKS REQUIRED WHEN:
- Specific actions, follow-ups, or work items are identified or assigned.
- Issues, problems, or requests needing resolution or tracking are discussed.
- Deadlines or clear next steps are mentioned.

## IMPORTANT GUIDELINES
- **Default to Documentation:** When in doubt about whether information is valuable enough for documentation, lean towards creating it. Preserving knowledge is critical.
- **Capture Ambiguous Tasks:** Err on the side of capturing potential tasks even if ownership or exact details are slightly unclear. It's better to capture it for later refinement than to miss it.
- **Both Can Be True:** A single meeting transcript can (and often will) contain information requiring *both* documentation and ticket creation. Evaluate each need independently.
- **Connector Dependency:** The final decision *must* consider the \`availableConnectors\`. If the transcript suggests creating a document, but no document connectors are listed, \`needsDocument\` must be false. The same applies to tickets and ticket connectors.

## EXAMPLES

**Example 1: Documentation Only (HR Policy)**
<transcript>
The HR team finalized the new remote work policy. Key points include eligibility criteria based on role and tenure, required home office setup, and communication expectations. This needs to be added to the official employee handbook.
</transcript>
<available_connectors>
sharepoint, asana
</available_connectors>
**Output:**
{
  "needsDocument": true, // Policy details need recording
  "needsTicket": false   // No specific task assigned *in this snippet*
}

**Example 2: Ticket Only (Sales Follow-up)**
<transcript>
Reviewing the Q2 pipeline, we need to prioritize the Acme Corp deal. John, please schedule a follow-up call with their VP by end of week to discuss the revised proposal. Let's track this.
</transcript>
<available_connectors>
notion, jira
</available_connectors>
**Output:**
{
  "needsDocument": false, // Standard pipeline review, no new process/decision to document
  "needsTicket": true   // Specific action assigned to John with a deadline
}

**Example 3: Both Documentation and Ticket (Marketing Campaign)**
<transcript>
Okay, the 'Summer Splash' campaign plan is approved. We'll target demographics A and B via social media and email. The key messaging points are finalized and should be documented on the campaign wiki page. Lisa, can you create tasks for the design team to get the ad creatives ready by next Monday?
</transcript>
<available_connectors>
confluence, trello
</available_connectors>
**Output:**
{
  "needsDocument": true, // Campaign plan details and messaging need recording
  "needsTicket": true   // Specific action assigned to Lisa/design team with a deadline
}

**Example 4: Neither (Real Estate - General Discussion)**
<transcript>
We looked at the property on Elm Street. It has potential, but the foundation needs work. Also considered the Maple Avenue listing, better condition but smaller yard. Still undecided on the best approach for this client.
</transcript>
<available_connectors>
gdocs, linear
</available_connectors>
**Output:**
{
  "needsDocument": false, // General discussion, no final decision/plan to document yet
  "needsTicket": false   // No specific action item or issue assigned
}

**Example 5: Both (Tech Decision & Task)**
<transcript>
We've decided to use the 'quick-cache' library for API response caching to improve performance. The standard TTL will be 5 minutes. This configuration needs to be documented. Alex, please create a ticket to implement this in the 'product-service' next sprint.
</transcript>
<available_connectors>
notion, jira
</available_connectors>
**Output:**
{
  "needsDocument": true, // Decision and configuration details need recording
  "needsTicket": true   // Specific implementation task assigned to Alex
}

## OUTPUT FORMAT
After analyzing the transcript and considering the connectors, respond with **only** the following JSON structure:
{
  "needsDocument": boolean, // true if ANY documentable information exists AND a document connector is available
  "needsTicket": boolean    // true if ANY trackable tasks or actions exist AND a ticket connector is available
}`);
const taskDecisionUserPrompt = PromptTemplate.create<{
  transcript: string;
  availableConnectors: string;
}>(
  `The meeting transcript you need to analyze:

<transcript>
{{transcript}}
</transcript>

These are the available connectors (tools or systems) for creating documents, tasks, or emails:

<available_connectors>
{{availableConnectors}}
</available_connectors>
`,
);

/**
 * Tool-agnostic decision maker that favors document creation by default
 * for preserving valuable meeting information
 */
export const createTaskDecisionTool = (ai: GoogleGenAI) => {
  return async (
    state: typeof TeamMindState.State,
  ): Promise<typeof TeamMindState.State> => {
    const { transcriptSummary, userConfig } = state;

    try {
      // Format the prompt
      const formattedPrompt = taskDecisionUserPrompt.format({
        transcript: transcriptSummary,
        availableConnectors: userConfig.availableConnectors.join(', '),
      });

      // Generate the task decisions
      const decisionResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: formattedPrompt,
        config: {
          temperature: 0.5,
          responseMimeType: 'application/json',
          systemInstruction: taskDecisionSystemPrompt.format(),
          thinkingConfig: {
            thinkingBudget: 4096,
          },
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              needsDocument: {
                type: Type.BOOLEAN,
                description: 'Whether document creation/update is needed',
              },
              needsTicket: {
                type: Type.BOOLEAN,
                description: 'Whether new ticket creation is needed',
              },
            },
            required: ['needsDocument', 'needsTicket'],
          },
        },
      });

      // Check if response text exists before parsing
      if (!decisionResponse.text) {
        throw new Error(
          'Model response did not contain text for JSON parsing.',
        );
      }
      const decision: TaskDecisionOutput = JSON.parse(decisionResponse.text);

      // Map connector types to decision fields for validation
      const connectorMapping = {
        needsDocument: [
          'confluence',
          'sharepoint',
          'notion',
          'google_drive',
          'document',
        ],
        needsTicket: ['jira', 'linear', 'asana', 'trello', 'ticket'],
      };

      // Validate against available connectors
      const validatedDecision = {
        needsDocument:
          decision.needsDocument &&
          userConfig.availableConnectors.some((connector) =>
            connectorMapping.needsDocument.includes(connector.toLowerCase()),
          ),

        needsTicket:
          decision.needsTicket &&
          userConfig.availableConnectors.some((connector) =>
            connectorMapping.needsTicket.includes(connector.toLowerCase()),
          ),
      };

      console.log('Task decisions:', validatedDecision);

      // Return the decisions and add the message
      return {
        ...state,
        taskDecisions: validatedDecision,
      };
    } catch (error) {
      console.error('Error in task decision node:', error);

      // Return default decisions (no actions)
      return {
        ...state,
        taskDecisions: {
          needsDocument: false,
          needsTicket: false,
        },
        error: {
          message:
            error instanceof Error ? error.message : 'Unknown decision error',
          timestamp: new Date().toISOString(),
        },
      };
    }
  };
};

/**
 * Task decision router that supports parallel execution
 * Returns an array of Send objects for parallel execution
 */
export const taskDecisionRouterParallel = (
  state: typeof TeamMindState.State,
): string | Send[] | string[] => {
  const { taskDecisions, userConfig, userPreferences } = state;

  if (!taskDecisions) {
    return END;
  }

  const tasks: (Send | string)[] = [];

  // Check if document creation/update is needed, we have document connectors,
  // and user preferences allow it
  const hasDocConnectors = userConfig.availableConnectors.some(
    (connector: DocumentSource) =>
      ['confluence', 'sharepoint', 'notion', 'google_drive'].includes(
        connector,
      ),
  );

  // Only proceed with document tasks if generation is enabled (defaults to true if undefined)
  const documentGenerationEnabled =
    userPreferences?.document_generation_enabled !== false;

  if (
    taskDecisions.needsDocument &&
    hasDocConnectors &&
    documentGenerationEnabled
  ) {
    tasks.push('docQueryTool');
  }

  // Check if new ticket creation is needed, we have ticket connectors,
  // and user preferences allow it
  const hasTicketConnectors = userConfig.availableConnectors.some((connector) =>
    ['jira', 'linear', 'asana', 'trello'].includes(connector),
  );

  // Only proceed with ticket tasks if generation is enabled (defaults to true if undefined)
  const ticketGenerationEnabled =
    userPreferences?.ticket_generation_enabled !== false;

  if (
    taskDecisions.needsTicket &&
    hasTicketConnectors &&
    ticketGenerationEnabled
  ) {
    tasks.push('ticketQueryTool');
  }

  // If no tasks, end the flow
  if (tasks.length === 0) {
    console.warn(
      'No matching tasks found or disabled by user preferences, ending flow',
    );
    return END;
  }

  // If only one task, return it directly
  if (tasks.length === 1) {
    return tasks[0] as string;
  }

  // If multiple tasks, return them as an array for parallel execution
  return tasks as Send[];
};
