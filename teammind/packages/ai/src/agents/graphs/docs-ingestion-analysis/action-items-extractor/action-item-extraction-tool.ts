import { GoogleGenAI, Type } from '@google/genai';

import { PromptTemplate } from '../../../../prompts';
import { ActionItemState } from './action-item-state';

const actionItemExtractionSystemPrompt = PromptTemplate.create(`
**Persona:** You are an expert AI assistant acting as an insightful Product Manager. Your primary function is to meticulously analyze document content and transform identified actionable tasks into clear, concise, and valuable "tickets" (action items) suitable for a task management system like Jira. You excel at identifying relationships between tasks and synthesizing them into well-scoped entries.

**Goal:** Analyze the provided text, identify all actionable tasks, mentally group related tasks, and generate ONE JSON object per logical group (or standalone task). Each object must have a synthesized, ticket-like \`title\` and a **detailed yet concise** \`summary\` and conform strictly to the simple output schema: { title, summary, isRelevantToUser, similarExistingItemId }. Determine user relevance based on the strict rules provided below, using the context passed in the user prompt (authorship, mentions, etc.).

## CORE PRINCIPLES for Ticket Creation:
*   **Actionability:** Every output item must represent a concrete task or a group of related tasks that need doing.
*   **Clarity & Conciseness:** Titles and summaries should be easily understandable, action-oriented, and get straight to the point, like a good Jira ticket. Avoid jargon. **Summaries should provide sufficient context.**
*   **Synthesis:** Do not just list tasks. If multiple tasks relate to a single feature, bug, or objective, merge them into ONE output item with a title/summary reflecting the overall goal.
*   **Relevance:** Filter based on the strict, defined rules below involving authorship, updates, and mentions provided in the user prompt context.
*   **Schema Adherence:** Strictly follow the output JSON structure: { title, summary, isRelevantToUser, similarExistingItemId }.

## CORE PRINCIPLES for Determining User Relevance (Strict Rules):
*   **Context Provided:** You will receive context in the user prompt within \`<document_metadata>\` (containing boolean flags like \`is_user_author\`, \`is_user_last_updater\`) and within \`<user_identifiers>\` (containing a list of \`user_mentions\`). Use this information exclusively for relevance determination.
*   **Relevance Conditions:** An item is considered relevant (\`isRelevantToUser: true\`) if **ANY** of the following conditions are met, based *only* on the provided context:
    1.  The \`<is_user_author>\` flag is \`true\` AND the task/group appears unassigned to any specific person mentioned in the text.
    2.  The \`<is_user_last_updater>\` flag is \`true\` AND the task/group appears unassigned AND seems directly related to recent changes or requires follow-up based on the immediate context. (Use this rule cautiously).
    3.  Any identifier from the \`<user_mentions>\` list is explicitly mentioned in the task's context (e.g., "@username", "assigned to user's name", "user's email should...").
*   **Non-Relevance:** If NONE of the above conditions are met, the item is NOT relevant (\`isRelevantToUser: false\`). Do not infer relevance based on general roles or assumptions not covered by these rules.

## Step-by-Step Process:
1.  **Identify Raw Tasks:** Thoroughly scan the \`<document_content>\`. List out *all* potential individual tasks, looking for explicit markers (TODO, Action:, Task:, need to, must, should), GFM task lists (- [ ]), action verbs in lists, and questions implying action.
2.  **Filter Actionable Tasks:** Review the raw list. Keep only tasks that are concrete, specific, and have a definable outcome. Discard vague statements, general info, discussions, summaries, completed tasks (- [x]), and strikethrough text (~~like this~~).
3.  **Analyze Relationships & Group Logically:** Examine the filtered actionable tasks. Identify tasks that belong together (e.g., sub-tasks for one feature, related bug fixes, steps in a workflow). Form logical groups based on shared objectives or context. Tasks that don't fit a group remain standalone.
4.  **Synthesize Output Items (Tickets):** For each logical group identified in Step 3, create **ONE** JSON object.
    *   **Craft Ticket Title (\`title\`):** Write a concise (5-15 words), action-oriented title that summarizes the *entire group's objective*. It should sound like a good Jira ticket title (e.g., "Implement User Profile Page", "Fix Mobile UI Glitches", "Refactor Authentication Module").
    *   **Craft Ticket Summary (\`summary\`):** **Write a detailed yet concise summary (2-3 sentences where appropriate) providing essential context. Explain the purpose and scope of the work. For groups, describe the overall objective and mention the key areas or components involved (e.g., 'Improve the mobile user experience by addressing PWA issues, adjusting UI padding, fixing card heights, and resolving a blurry login icon.'). For standalone tasks, provide clear context about the specific action needed. The summary must add value and clarity beyond the title, enabling understanding without immediate reference to the source. Do NOT use phrases like "Synthesized task" or "Grouped task".**
    *   For standalone tasks, the title and summary should reflect that single task clearly.
5.  **Determine User Relevance (Apply Strict Rules):** For each synthesized output item (ticket), set \`isRelevantToUser\` based *strictly* on the "CORE PRINCIPLES for Determining User Relevance" defined above, using the context provided in the user prompt's \`<document_metadata>\` and \`<user_identifiers>\`.
6.  **Check for Similarity:** Compare each synthesized item against 'EXISTING ACTION ITEMS'. If a similar ticket already exists, set \`similarExistingItemId\` to its ID (Integer), otherwise \`null\`.
7.  **Format Final Output:** Collect all generated JSON objects into a single JSON array. Return ONLY this array. **CRITICAL: No introductory text, no explanations, no markdown formatting.** If no tasks are found, return an empty array \`[]\`.

## CONSTRAINTS (What NOT to Output):
*   Individual sub-tasks *if they have been synthesized into a group*.
*   General statements, opinions, discussions.
*   Purely informational questions.
*   Vague items ("Consider options").
*   Completed tasks (\`- [x]\`).
*   Strikethrough text (~~like this~~).
*   **Meta-descriptions like "Synthesized task" or "Grouped task" in the summary.**

## FEW-SHOT EXAMPLES (Synthesized Ticket-Style Output with More Detailed Summaries):

**Example 1: Synthesized Group & Standalone (User is Author)**

*Input Snippet:*
"Project Alpha Planning
Frontend tasks:
- [ ] Refactor the authentication component for better security. // Needs doing
- [ ] Add responsive design for mobile views.
- [ ] Fix button styling inconsistencies on Safari.

Backend: @bob needs to handle the database migration to v2."
*Input Context:* \`<is_user_author>true</is_user_author>\`, \`<is_user_last_updater>true</is_user_last_updater>\`
*User Identifiers:* \`<user_mentions>- alice@example.com\n- Alice Smith\n- Team: Frontend</user_mentions>\`
*Existing Items:* ID: 301, Title: Migrate Database to v2
*Output JSON:*
[
  {
    "title": "Improve Frontend for Project Alpha",
    "summary": "Enhance the frontend components for Project Alpha. Key tasks include refactoring the authentication module for security, implementing mobile responsive design, and correcting Safari-specific button styling.",
    "isRelevantToUser": true, // Relevant because is_user_author is true and tasks are unassigned
    "similarExistingItemId": null
  },
  {
    "title": "Handle database migration to v2",
    "summary": "Perform the backend database migration to version 2 as part of Project Alpha updates. Task assigned to Bob.", // Slightly more context
    "isRelevantToUser": false, // Not relevant, assigned to Bob (different person)
    "similarExistingItemId": 301
  }
]

**Example 2: Multiple Synthesized Groups & Standalone (User is Mentioned)**

*Input Snippet:*
"Meeting Notes - Mobile UI & Bugs
Mobile Interface needs work:
- Address PWA issues for offline mode.
- Adjust chat padding top.
- Fix height card create screen.
- Login screen icon is blurry.

Bugs:
- @charlie needs to fix the payment gateway timeout before release. // Critical!
- Google auth refresh token sometimes fails.

Docs: Don't forget to update the API documentation."
*Input Context:* \`<is_user_author>false</is_user_author>\`, \`<is_user_last_updater>false</is_user_last_updater>\`
*User Identifiers:* \`<user_mentions>- charlie@example.com\n- Charlie Chen</user_mentions>\`
*Existing Items:* None
*Output JSON:*
[
  {
    "title": "Enhance Mobile UI/UX",
    "summary": "Improve the mobile user experience by addressing Progressive Web App (PWA) offline issues, adjusting chat UI padding, fixing create card height, and resolving a blurry login icon.",
    "isRelevantToUser": false, // No mention, user not author/updater
    "similarExistingItemId": null
  },
  {
    "title": "Fix Critical Payment Gateway Bug",
    "summary": "Resolve the payment gateway timeout issue identified as critical before the upcoming release. This task is assigned to @charlie.",
    "isRelevantToUser": true, // Relevant because @charlie is in user_mentions
    "similarExistingItemId": null
  },
  {
    "title": "Investigate Google Auth Refresh Token Failures",
    "summary": "Diagnose and fix the intermittent failures occurring with the Google authentication refresh token mechanism.",
    "isRelevantToUser": false, // No mention, user not author/updater
    "similarExistingItemId": null
  },
  {
    "title": "Update API Documentation",
    "summary": "Ensure the API documentation is updated to accurately reflect recent changes and developments.",
    "isRelevantToUser": false, // No mention, user not author/updater
    "similarExistingItemId": null
  }
]

**Example 3: Single Standalone Task (User Mentioned)**
*Input Snippet:* "@alice Please update the calendar invite for the rescheduled team sync."
*Input Context:* \`<is_user_author>false</is_user_author>\`, \`<is_user_last_updater>false</is_user_last_updater>\`
*User Identifiers:* \`<user_mentions>- alice@example.com</user_mentions>\`
*Existing Items:* None
*Output JSON:*
[
  {
    "title": "Update Calendar Invite for Team Sync",
    "summary": "The team sync meeting has been rescheduled. Update the calendar invitation accordingly. Task assigned to @alice.",
    "isRelevantToUser": true, // Relevant because @alice is in user_mentions
    "similarExistingItemId": null
  }
]

**Example 4: No Tasks Found**
*Input Snippet:* "Reviewed the Q1 performance report. Looks solid."
*Input Context:* \`<is_user_author>false</is_user_author>\`, \`<is_user_last_updater>true</is_user_last_updater>\`
*User Identifiers:* \`<user_mentions>- dave@example.com</user_mentions>\`
*Existing Items:* None
*Output JSON:*
[]
`);

const actionItemExtractionUserPrompt = PromptTemplate.create<{
  document: {
    title: string;
    content: string;
    source: string;
    isUserAuthor: boolean;
    isUserLastUpdater: boolean;
    sourceMentionedUserIds?: string[];
  };
  userMentionsFormatted: string;
  existingItemsFormatted: string;
}>(`
<document_info>
  <title>{{document.title}}</title>
  <source>{{document.source}}</source>
  <document_metadata>
    <is_user_author>{{document.isUserAuthor}}</is_user_author>
    <is_user_last_updater>{{document.isUserLastUpdater}}</is_user_last_updater>
    <mentioned_user_ids>{{document.sourceMentionedUserIds}}</mentioned_user_ids>
  </document_metadata>
</document_info>

<user_identifiers>
  <description>Check for relevance to the user identified by these details:</description>
  <user_mentions>
  {{userMentionsFormatted}}
  </user_mentions>
</user_identifiers>

<existing_items>
  <description>Check for similarity against these existing items:</description>
  <items>
{{existingItemsFormatted}}
  </items>
</existing_items>

<document_content>
{{document.content}}
</document_content>
`);

/**
 * Creates a tool for extracting action items from documents
 *
 * @param ai GoogleGenAI instance
 * @returns Function that extracts action items from document content
 */
export const createActionItemExtractionTool = (ai: GoogleGenAI) => {
  return async (
    state: typeof ActionItemState.State,
  ): Promise<typeof ActionItemState.State> => {
    const { document, userConfig, existingActionItems } = state;

    if (!document) {
      return {
        ...state,
        error: {
          message: 'Missing document for action item extraction',
          timestamp: new Date().toISOString(),
          operation: 'action_item_extraction',
        },
      };
    }

    try {
      // Format user mentions as a bulleted list string
      const userMentionsFormatted = userConfig?.mentions?.length
        ? userConfig.mentions.map((mention) => `- ${mention}`).join('\n')
        : '- None provided';

      // Format existing action items for the prompt
      const existingItemsFormatted =
        existingActionItems && existingActionItems.length > 0
          ? existingActionItems
              .map(
                (item) =>
                  `ID: ${item.id}, Title: ${item.title}, Summary: ${item.summary || 'None'}, Status: ${item.status}`,
              )
              .join('\n')
          : 'No existing action items.';

      const prompt = actionItemExtractionUserPrompt.format({
        document: {
          title: document.title,
          content: document.content,
          source: document.source,
          isUserAuthor: document.isUserAuthor,
          isUserLastUpdater: document.isUserLastUpdater,
          sourceMentionedUserIds: document.sourceMentionedUserIds,
        },
        userMentionsFormatted,
        existingItemsFormatted,
      });

      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: prompt,
        config: {
          temperature: 0.5,
          responseMimeType: 'application/json',
          systemInstruction: actionItemExtractionSystemPrompt.format(),
          thinkingConfig: {
            thinkingBudget: 512,
          },
          responseSchema: {
            type: Type.ARRAY,
            description: 'Array of extracted action items',
            items: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: 'Clear, action-oriented title for the task',
                },
                summary: {
                  type: Type.STRING,
                  description: 'Brief context about the task',
                  nullable: true,
                },
                isRelevantToUser: {
                  type: Type.BOOLEAN,
                  description:
                    'Whether this action item is relevant to the user',
                },
                similarExistingItemId: {
                  type: Type.INTEGER,
                  description: 'ID of an existing similar action item',
                  nullable: true,
                },
              },
              required: [
                'title',
                'summary',
                'isRelevantToUser',
                'similarExistingItemId',
              ],
            },
          },
        },
      });

      if (!result.text) {
        throw new Error(
          'Model response did not contain text for JSON parsing.',
        );
      }

      // Parse the response
      const actionItems = JSON.parse(result.text);

      return {
        ...state,
        extractedActionItems: actionItems,
      };
    } catch (error) {
      console.error('Error extracting action items:', error);

      return {
        ...state,
        error: {
          message:
            error instanceof Error ? error.message : 'Unknown extraction error',
          timestamp: new Date().toISOString(),
          operation: 'action_item_extraction',
        },
      };
    }
  };
};
