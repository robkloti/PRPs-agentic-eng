import { GoogleGenAI, Type } from '@google/genai';

import { PromptTemplate } from '../../../../prompts';
import { TicketCreateDecisionZodSchema } from '../../../../types';
import { TeamMindState } from '../create-graph';

const ticketCreateDecisionSystemPrompt =
  PromptTemplate.create(`You are an AI task management specialist integrated with a system that creates tickets from meeting transcripts. Your responsibility is to determine which tasks need new tickets while avoiding duplication of existing tickets.

## EVALUATION PROCESS

1. IDENTIFY ALL TASKS from the transcript:
   - Action items (explicit or implied)
   - Work assignments
   - Issues that need resolution
   - Features or changes to implement
   - Follow-up activities

2. FOR EACH POTENTIAL TASK, perform an internal reasoning step:
   - Compare the potential task against ALL existing tickets.
   - Explicitly state whether it's covered by an existing ticket (and which one, if applicable).
   - Justify the decision (create/don't create) based on the criteria below.
   - *This reasoning is for your internal verification and does not need to be in the final JSON output, except for the 'updateSummary' field for created tickets.*

3. EVALUATE against existing tickets based on your reasoning:
   - Is this task already tracked in an existing ticket?
   - Is this task a subtask of an existing ticket?
   - Could this task be handled as part of an existing ticket?
   - Is this task substantially different from all existing tickets?

## DECISION CRITERIA

CREATE NEW TICKET WHEN:
- The task is clearly defined with a specific deliverable
- The task is NOT already covered by any existing ticket
- The work is substantial enough to warrant its own tracking
- The task has different requirements from existing tickets

DO NOT CREATE TICKET WHEN:
- An existing ticket already covers this work
- The task is vague or lacks actionable details
- The task is a small subtask of an existing ticket
- The work could reasonably be incorporated into an existing ticket
- The task represents minor effort or a trivial update that doesn't require separate tracking.

## EXAMPLES

**Example 1: Create New Ticket**

*   **Transcript Snippet:** "Alice needs to research competitor pricing for the new widget by Friday."
*   **Existing Tickets:** None related to competitor pricing or the new widget specifically.
*   **Reasoning:** This is a clearly defined, actionable task assigned to Alice with a deadline. No existing ticket covers this specific research.
*   **Decision:** Create a new ticket.
*   **Output:**
    \`\`\`json
    {
      "createTickets": true,
      "source": "jira",
      "tickets": [
        {
          "parentId": "PROJ-A",
          "title": "Research competitor pricing for the new widget",
          "content": "### Description\nAs discussed in the meeting, research the pricing strategies of key competitors for the upcoming widget launch.\n\n### Acceptance Criteria\n- Identify 3-5 key competitors.\n- Document their pricing models for similar products.\n- Summarize findings in a brief report by Friday.",
          "updateSummary": "New task identified: Research competitor pricing for the new widget, assigned to Alice, due Friday. No existing ticket covers this."
        }
      ]
    }
    \`\`\`

**Example 2: Do Not Create (Duplicate)**

*   **Transcript Snippet:** "Bob mentioned he still needs to fix the login bug."
*   **Existing Tickets:** \`[{"id":"PROJ-B-123","title":"Fix login issue on staging","description":"Users reporting errors when logging into the staging environment.","parentId":"PROJ-B"}]\`
*   **Reasoning:** The transcript mentions fixing a login bug. An existing ticket PROJ-B-123 already tracks this exact issue.
*   **Decision:** Do not create a new ticket.
*   **Output:**
    \`\`\`json
    {
      "createTickets": false,
      "source": "jira",
      "tickets": []
    }
    \`\`\`

**Example 3: Do Not Create (Subtask/Merge)**

*   **Transcript Snippet:** "We should also add a tooltip to the new save button."
*   **Existing Tickets:** \`[{"id":"PROJ-C-45","title":"Implement new save functionality","description":"Add a new save button and backend logic.","parentId":"PROJ-C"}]\`
*   **Reasoning:** Adding a tooltip is a minor UI enhancement directly related to the new save button being implemented in PROJ-C-45. It's not substantial enough for its own ticket and should be part of the existing work.
*   **Decision:** Do not create a new ticket; this should be handled within PROJ-C-45.
*   **Output:**
    \`\`\`json
    {
      "createTickets": false,
      "source": "jira",
      "tickets": []
    }
    \`\`\`

## TICKET CREATION GUIDELINES
For each ticket to create:
- Write a clear, specific title
- Create a comprehensive description with all necessary context
- Define explicit acceptance criteria
- Use the same language as the existing tickets or transcript
- Select appropriate parent/project from valid options
- Include any mentioned priority, assignee, or timeline information

## OUTPUT FORMAT
Respond with this JSON structure:
{
  "createTickets": boolean,
  "source": "jira" | "linear" | etc.,
  "tickets": [
    {
      "parentId": "Project key (use only from valid_parent_ids)",
      "title": "Clear task title",
      "content": "Complete ticket content with description and acceptance criteria in markdown format",
      "updateSummary": "Brief explanation of why this ticket is needed"
    },
    // Additional tickets as needed
  ]
}

If no new tickets are needed, return createTickets: false with an empty tickets array.`);

const ticketCreateDecisionUserPrompt = PromptTemplate.create<{
  transcript: string;
  relevant_tickets: string;
  source: string;
  valid_parent_ids: string;
}>(`# Meeting Transcript:
    <transcript>
    {{transcript}}
    </transcript>
    
    # Existing Tickets (CAREFULLY CHECK FOR SIMILAR TICKETS):
    <relevant_tickets>
    {{relevant_tickets}}
    </relevant_tickets>
    
    # Available Ticket System:
    <available_system>
    {{source}}
    </available_system>
    
    # Valid Project Keys (ONLY use these for parentId):
    <valid_parent_ids>
    {{valid_parent_ids}}
    </valid_parent_ids>
    
    Based on this information, identify actionable items from the transcript that AREN'T ALREADY TRACKED in existing tickets.
    
    IMPORTANT:
    1. Compare each potential ticket to ALL existing tickets to avoid creating redundant tickets
    2. Be EXTREMELY conservative - only create tickets for truly new work that isn't covered by existing tickets
    3. If a task could potentially fit within the scope of an existing ticket, DO NOT create a new one
    4. For each potential new ticket, explicitly compare it to the most similar existing tickets and explain why it's different
    5. Use ONLY project keys from the valid_parent_ids list for parentId values
    6. When in doubt, err on the side of NOT creating a ticket
    7. Filter out minor tasks or trivial updates; focus only on significant pieces of work requiring dedicated tracking.`);

/**
 * Tool that analyzes meeting transcript and search results
 * to make decisions about creating multiple tickets, with improved duplicate detection
 *
 * @param ai - Initialized language model
 * @returns A function that processes the state and returns ticket creation decisions
 */
export const createTicketGenerationTool = (ai: GoogleGenAI) => {
  return async (
    state: typeof TeamMindState.State,
  ): Promise<typeof TeamMindState.State> => {
    const { userConfig, transcriptSummary, ticketSearchResults } = state;

    try {
      // Get most relevant ticket system from available connectors
      const availableTicketSystems = userConfig.availableConnectors.filter(
        (system) => ['jira', 'linear', 'asana', 'trello'].includes(system),
      );

      if (availableTicketSystems.length === 0) {
        throw new Error('No compatible ticket systems available');
      }

      const primaryTicketSystem = availableTicketSystems[0]!;

      // Format relevant tickets from search results with more details to help similarity detection
      const relevantTickets = ticketSearchResults?.map((ticket) => ({
        id: ticket.sourceId,
        title: ticket.title,
        description: ticket.contentParts ?? 'No description available',
        parentId: ticket.sourceParentId ?? '', // This contains the project key for Jira
        status: ticket.metadata?.status ?? 'Unknown',
        labels: ticket.metadata?.labels ?? [],
        type: ticket.metadata?.type ?? 'Task',
        // Include more metadata for better similarity matching
        assignee: ticket.metadata?.assignee ?? null,
        priority: ticket.metadata?.priority ?? null,
        createdDate: ticket.metadata?.createdDate ?? null,
      }));

      // Extract all valid parentIds from the search results
      const validParentIds = new Set<string>();
      relevantTickets?.forEach((ticket) => {
        if (ticket.parentId) {
          validParentIds.add(ticket.parentId);
        }
      });

      // Get default parentId (first valid one)
      const validParentIdsArray = Array.from(validParentIds);
      const defaultParentId =
        validParentIdsArray.length > 0 ? validParentIdsArray[0] : '';

      // Format the prompt with valid project keys and detailed existing tickets
      const formattedPrompt = ticketCreateDecisionUserPrompt.format({
        transcript: transcriptSummary,
        relevant_tickets: relevantTickets?.length
          ? JSON.stringify(relevantTickets, null, 2)
          : 'No relevant tickets found.',
        source: primaryTicketSystem,
        valid_parent_ids:
          validParentIdsArray.length > 0
            ? JSON.stringify(validParentIdsArray)
            : '', // Provide at least one value
      });

      const ticketGenerationResult = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: formattedPrompt,
        config: {
          temperature: 0.5,
          responseMimeType: 'application/json',
          systemInstruction: ticketCreateDecisionSystemPrompt.format(),
          thinkingConfig: {
            thinkingBudget: 20480,
          },
          responseSchema: {
            type: Type.OBJECT,
            description:
              'Create multiple tickets based on meeting transcript information',
            properties: {
              createTickets: {
                type: Type.BOOLEAN,
                description:
                  'Whether new tickets should be created or not. If creating any tickets, set to true.',
              },
              source: {
                type: Type.STRING,
                enum: ['jira'], // Adjust if other systems are supported
                description: 'Target ticket system: "jira", "linear", etc.',
              },
              tickets: {
                type: Type.ARRAY,
                description: 'Array of tickets to be created',
                items: {
                  type: Type.OBJECT,
                  properties: {
                    parentId: {
                      type: Type.STRING,
                      description:
                        'Project key or parent ID where the ticket should be created',
                    },
                    title: {
                      type: Type.STRING,
                      description: 'Clear, concise title for the ticket',
                    },
                    content: {
                      type: Type.STRING,
                      description:
                        'Complete formatted content for the ticket in markdown format',
                    },
                    updateSummary: {
                      type: Type.STRING,
                      description:
                        'Brief summary of what this ticket is about and why it was created',
                    },
                  },
                  required: ['parentId', 'title', 'content', 'updateSummary'],
                },
              },
            },
            required: ['createTickets', 'source', 'tickets'],
          },
        },
      });

      // Check if response text exists before parsing
      if (!ticketGenerationResult.text) {
        throw new Error(
          'Model response did not contain text for JSON parsing.',
        );
      }
      const ticketGenerationOutput = TicketCreateDecisionZodSchema.parse(
        JSON.parse(ticketGenerationResult.text),
      );

      // Validate and correct parentId for each ticket
      if (
        ticketGenerationOutput.createTickets &&
        ticketGenerationOutput.tickets
      ) {
        ticketGenerationOutput.tickets = ticketGenerationOutput.tickets.map(
          (ticket) => {
            // Check if the parentId is valid
            const validParentId = validParentIdsArray.includes(ticket.parentId)
              ? ticket.parentId
              : defaultParentId;

            return {
              ...ticket,
              parentId: validParentId!,
            };
          },
        );
      }

      // Return the decision output along with the original state
      return {
        ...state,
        ticketGeneration: ticketGenerationOutput,
      };
    } catch (error) {
      console.error('Error in ticket creation decision:', error);

      // Return an error state
      return {
        ...state,
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Unknown ticket creation decision error',
          timestamp: new Date().toISOString(),
          operation: 'ticket_create_decision',
        },
      };
    }
  };
};
