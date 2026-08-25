import { GoogleGenAI, Type } from '@google/genai';

import { PromptTemplate } from '../../../../prompts';
import { DocActionDecisionZodSchema } from '../../../../types';
import { TeamMindState } from '../create-graph';

const docActionDecisionSystemPrompt = PromptTemplate.create<{
  available_connectors: string;
}>(`You are an AI document management specialist within a system that creates technical documentation from meeting transcripts. Your task is to decide whether to create a new document or take no action.

## DECISION FACTORS
Analyze these critical factors:

1. TOPIC SIGNIFICANCE:
   - Is the information substantial enough to warrant a standalone document?
   - Does the transcript contain valuable documentation-worthy content?

2. CONTENT NOVELTY:
   - Is the information already adequately covered in existing documentation?
   - What new information does the transcript contain?

3. DOCUMENT PLACEMENT:
   - Where does this information logically belong?
   - What would be the most appropriate parent document or space?

4. KNOWLEDGE COHERENCE:
   - Would creating this document improve knowledge organization?
   - Does the information logically fit together as a standalone document?

## DECISION RULES

### CREATE NEW DOCUMENT WHEN:
- The information is substantial enough to warrant a standalone document.
- The content represents valuable knowledge that should be preserved.
- Creating a new document would better organize information than not documenting it.
- The information has a coherent theme that works as a unified document.
- SELECT: Most appropriate parent page and space.

### TAKE NO ACTION WHEN:
- The transcript doesn't contain substantial documentable information
- The information is already comprehensively documented
- The content is too fragmented or insubstantial to form a coherent document

## EXAMPLES

**Example 1: Create New**

*Input Context:*
- Transcript details a new "Internal Developer Portal" initiative with specific requirements.
- Available Space: Confluence "Engineering" Space (ID: engSpace)

*Output:*
\`\`\`json
{
  "action": "create",
  "parentPageId": null, // Or a suitable top-level page ID if known
  "spaceId": "engSpace",
  "source": "confluence"
}
\`\`\`

**Example 2: No Action**

*Input Context:*
- Transcript is a brief check-in confirming minor details with no substantial new information.
- Available Space: Confluence "Engineering" Space (ID: engSpace)

*Output:*
\`\`\`json
{
  "action": "none",
  "parentPageId": null,
  "spaceId": null,
  "source": "confluence" // Source might still be relevant even for 'none'
}
\`\`\`

## OUTPUT FORMAT
First, briefly state your reasoning for the chosen action (e.g., "Reasoning: Creating new document as transcript contains substantial new information about our API architecture.").
Then, respond *only* with the following JSON structure:
{
  "action": "create" | "none",
  "parentPageId": "ID of parent for new page (null if top-level)",
  "spaceId": "ID of space for new page (required if creating)",
  "source": {{available_connectors}}
}

Your choices directly impact knowledge organization and accessibility.`);
const docCrudDecisionUserPrompt = PromptTemplate.create<{
  transcript: string;
  relevant_pages: string;
  available_connectors: string;
  available_spaces: string;
}>(`1. Meeting Transcript Summary:
<transcript>
{{transcript}}
</transcript>

2. Relevant Existing Pages:
<relevant_pages>
{{relevant_pages}}
</relevant_pages>

3. Available Connectors:
<available_connectors>
{{available_connectors}}
</available_connectors>

4. Available Spaces:
<available_spaces>
{{available_spaces}}
</available_spaces>
`);

/**
 * Tool that analyzes search results and transcript to decide
 * whether to create a new document or update an existing one
 *
 * @param client - Supabase client for database operations
 * @param ai - Initialized language model
 * @returns A function that processes the state and returns a document decision
 */
export const createDocActionDecisionTool = (ai: GoogleGenAI) => {
  return async (
    state: typeof TeamMindState.State,
  ): Promise<typeof TeamMindState.State> => {
    const { transcriptSummary, documentSearchResults, userConfig } = state;

    try {
      // Remove irrelevant data from the search results
      const relevantPages = documentSearchResults?.map((page) => ({
        id: page.sourceId,
        parentId: page.sourceParentId,
        title: page.title,
        hierarchyPath: page.hierarchyPath,
        content: page.contentParts,
        spaceId: page.metadata?.space_id,
      }));

      console.log('Relevant pages found:', relevantPages.length);

      // Prepare spaces info for all configured sources
      let availableSpacesInfo = 'No spaces information available.';

      // Add Confluence spaces if available
      if (userConfig.credentials.confluence?.selectedSpacesOrBoards) {
        availableSpacesInfo = `Confluence Spaces: ${JSON.stringify(
          userConfig.credentials.confluence.selectedSpacesOrBoards,
          null,
          2,
        )}`;
      }

      // Add Notion workspace if available
      if (userConfig.credentials.notion?.workspaceId) {
        const notionInfo = `Notion Workspace: ${JSON.stringify(
          { spaceId: userConfig.credentials.notion.workspaceId },
          null,
          2,
        )}`;
        availableSpacesInfo =
          availableSpacesInfo === 'No spaces information available.'
            ? notionInfo
            : `${availableSpacesInfo}\n\n${notionInfo}`;
      }

      const formattedPrompt = docCrudDecisionUserPrompt.format({
        transcript: transcriptSummary,
        relevant_pages:
          JSON.stringify(relevantPages, null, 2) ?? 'No relevant pages found.',
        available_connectors: userConfig.availableConnectors.join(', '),
        available_spaces: availableSpacesInfo,
      });

      // Generate the document decision
      const decisionResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: formattedPrompt,
        config: {
          temperature: 0.5,
          responseMimeType: 'application/json',
          systemInstruction: docActionDecisionSystemPrompt.format({
            available_connectors: userConfig.availableConnectors.join(', '),
          }),
          thinkingConfig: {
            thinkingBudget: 20480,
          },
          responseSchema: {
            type: Type.OBJECT,
            description:
              'Decide whether to create a new document or take no action',
            properties: {
              action: {
                type: Type.STRING,
                enum: ['create', 'none'],
                description:
                  'Action to take: "create" or "none" (if no action needed)',
              },
              parentPageId: {
                type: Type.STRING,
                description: 'ID of the parent page',
                nullable: true,
              },
              spaceId: {
                type: Type.STRING,
                description:
                  'ID of the space to create the new page in (if action is create)',
                nullable: true,
              },
              source: {
                type: Type.STRING,
                enum: userConfig.availableConnectors, // Dynamically set enum
                description: `Source platform for the document: ${userConfig.availableConnectors.map((c) => `"${c}"`).join(', ')}`,
              },
            },
            required: ['action', 'source', 'parentPageId', 'spaceId'],
          },
        },
      });

      // Check if response text exists before parsing
      if (!decisionResponse.text) {
        throw new Error(
          'Model response did not contain text for JSON parsing.',
        );
      }
      const docActionDecision = DocActionDecisionZodSchema.parse(
        JSON.parse(decisionResponse.text),
      );

      if (
        docActionDecision.action === 'update' &&
        !docActionDecision.parentPageId
      ) {
        docActionDecision.parentPageId =
          documentSearchResults.find(
            (page) => page.sourceId === docActionDecision.pageId,
          )?.sourceParentId ?? null;
      }

      console.log('Doc decision output:', docActionDecision);

      return {
        ...state,
        docActionDecision,
      };
    } catch (error) {
      console.error('Error in document CRUD decision:', error);

      // Return an error state
      return {
        ...state,
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Unknown document decision error',
          timestamp: new Date().toISOString(),
        },
      };
    }
  };
};
