import { SupabaseClient } from '@supabase/supabase-js';

import { GoogleGenAI, Type } from '@google/genai';

import { Database } from '@tm/supabase/database';

import { PromptTemplate } from '../../../../prompts';
import { DocContentGenerationZodSchema } from '../../../../types';
import { TeamMindState } from '../create-graph';

const docContentGenerationSystemPrompt = PromptTemplate.create<{
  sourceType: string;
}>(`You are an AI technical documentation specialist tasked with creating documentation based on meeting transcripts. Your goal is to produce clear, comprehensive, and well-structured content.

## OUTPUT FORMAT
All content must be in **layout-rich GFM (GitHub Flavored Markdown)** format. Prioritize clarity, structure, and readability. Do not use any platform-specific formatting (like Notion blocks).

Use a comprehensive range of standard Markdown syntax effectively:
- Headings (# for level 1, ## for level 2, etc.) - Use headings logically to create a clear document hierarchy.
- Lists (- or * for bullet points, 1. for numbered lists) - Use nested lists where appropriate for structure.
- Task Lists (\`- [ ]\` or \`- [x]\`) for action items or checklists.
- Code blocks (\\\`\\\`\\\`language\\ncode\\n\\\`\\\`\\\` for multi-line, \\\`inline code\\\`) - Specify the language for syntax highlighting where applicable.
- Tables (using \`|\` and \`-\` characters) for structured data.
- Emphasis (**bold** for key terms or highlights, *italic* for subtle emphasis).
- Blockquotes (\`>\`) for quoting or highlighting sections.
- Horizontal Rules (\`---\` or \`***\`) to separate distinct sections visually.
- Strikethrough (\`~~text~~\`) for indicating removed or deprecated information.
- Links (\`[text](url)\`) for references.

**Layout & Readability:**
- Use whitespace (empty lines) effectively to separate paragraphs and sections.
- Keep paragraphs concise and focused.
- Structure information logically (e.g., step-by-step instructions, problem/solution).
- Use formatting strategically to guide the reader's eye and improve scannability.

## LANGUAGE DETERMINATION
Use the same language as found in the transcript or related documents.

## PROCESS STEPS
Follow these steps meticulously:
1.  **Analyze Inputs:** Carefully review the provided transcript summary and search results.
2.  **Determine Language:** Choose the appropriate language based on the transcript and context.
3.  **Generate Content:** Create well-structured documentation based on your analysis.
4.  **Format Output:** Format the entire content using the GFM Markdown rules specified under 'OUTPUT FORMAT'. Pay close attention to structure, clarity, and syntax.
5.  **Validate Title & Heading:** Ensure the \`content\` field does *not* begin with a heading (H1, H2, etc.) that duplicates the document's main \`title\`.
6.  **Construct JSON:** Assemble the final JSON object with the \`content\`, \`title\`, and a concise \`updateSummary\`.

## CONTENT CREATION GUIDELINES
- **CRITICAL:** The \`content\` field MUST NOT start with any heading (H1, H2, etc.) that repeats the document's main title. The main title is provided separately in the \`title\` field of the JSON output. The Markdown \`content\` should begin directly with the document's body text, an introductory paragraph, or the first *actual section* heading (which should be different from the main document title).
- Write in clear, professional language
- Use logical structure with appropriate heading levels
- Include all technical details from the transcript
- Maintain precision in terminology and parameters
- Provide context that makes information actionable
- Format using GFM Markdown
- Use the determined language consistently throughout
- Start with a clear overview section
- Use informative headings for each section
- Create logical information hierarchy
- Include all context necessary for understanding
- Ensure standalone comprehensibility

## VERIFICATION
Before outputting the JSON, review your generated \`content\` and \`title\`. Verify that:
- The formatting strictly adheres to the GFM Markdown rules.
- The language matches the determined language.
- All relevant information from the transcript is included and accurately represented.
- The \`content\` does not start with a duplicate title heading.
- The JSON structure is correct and complete.

Return your result in this JSON structure:
{
  "content": "Complete content in GFM Markdown format",
  "title": "Document title in the determined language",
  "updateSummary": "Brief summary of what was created"
}`);

const docContentGenerationUserPrompt = PromptTemplate.create<{
  transcript: string;
  searchResults: string;
  action: string;
  source: string;
}>(`1. Meeting Transcript Summary:
<transcript_summary>
{{transcript}}
</transcript_summary>

2. Search Results:
<search_results>
{{searchResults}}
</search_results>

3. Action Information:
<action_info>
Action: {{action}}
Source: {{source}}
</action_info>`);

/**
 * Tool that generates document content in Markdown format with automatic language detection
 *
 * @param client - Supabase client for database operations
 * @param ai - Initialized language model
 * @returns A function that processes the state and returns document content with detected language
 */
export const createDocContentGenerationTool = (
  client: SupabaseClient<Database>,
  ai: GoogleGenAI,
) => {
  return async (
    state: typeof TeamMindState.State,
  ): Promise<typeof TeamMindState.State> => {
    const { transcriptSummary, docActionDecision, documentSearchResults } =
      state;

    if (!docActionDecision) {
      return {
        ...state,
        error: {
          message: 'No document decision found. Cannot generate content.',
          timestamp: new Date().toISOString(),
        },
      };
    }

    try {
      // Format the search results for inclusion in the prompt. Sort by highest similarity score and take top 8 results
      const relevantPages = documentSearchResults
        ?.sort((a, b) => b.similarity - a.similarity)
        .slice(0, 8)
        .map((page) => {
          // Clean the content by removing the prefix (if any)
          let cleanedContent = page.contentParts;
          const prefix =
            page.hierarchyPath && page.title
              ? `${page.hierarchyPath}\\${page.title}`
              : null;

          if (prefix) {
            if (Array.isArray(cleanedContent)) {
              // Handle array of ChunkItem objects
              cleanedContent = cleanedContent.map((chunk) => ({
                ...chunk,
                content: chunk.content.startsWith(prefix)
                  ? chunk.content.substring(prefix.length).trim()
                  : chunk.content,
              }));
            } else if (
              typeof cleanedContent === 'string' &&
              cleanedContent.startsWith(prefix)
            ) {
              // Handle string content
              cleanedContent = cleanedContent.substring(prefix.length).trim();
            }
          }

          return {
            id: page.sourceId,
            parentId: page.sourceParentId,
            title: page.title,
            hierarchyPath: page.hierarchyPath,
            content: cleanedContent,
          };
        });

      const formattedPrompt = docContentGenerationUserPrompt.format({
        transcript: transcriptSummary,
        searchResults: relevantPages
          ? JSON.stringify(relevantPages, null, 2)
          : 'No relevant pages found.',
        action: docActionDecision.action,
        source: docActionDecision.source,
      });

      const docContentGenerationResult = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: formattedPrompt,
        config: {
          temperature: 0.5,
          responseMimeType: 'application/json',
          systemInstruction: docContentGenerationSystemPrompt.format({
            sourceType: docActionDecision.source,
          }),
          thinkingConfig: {
            thinkingBudget: 20480,
          },
          responseSchema: {
            type: Type.OBJECT,
            description:
              'Generate content for a document in Markdown format with automatic language detection',
            properties: {
              content: {
                type: Type.STRING,
                description: 'Content in GFM Markdown format',
              },
              title: {
                type: Type.STRING,
                description: 'Title of the document',
              },
              updateSummary: {
                type: Type.STRING,
                description:
                  'A concise summary of what has been updated or created',
              },
            },
            required: ['content', 'title', 'updateSummary'],
          },
        },
      });

      // Check if response text exists before parsing
      if (!docContentGenerationResult.text) {
        throw new Error(
          'Model response did not contain text for JSON parsing.',
        );
      }
      const docContentGenerationOutput = DocContentGenerationZodSchema.parse(
        JSON.parse(docContentGenerationResult.text),
      );

      return {
        ...state,
        docContent: docContentGenerationOutput,
      };
    } catch (error) {
      console.error('Error in document content generation:', error);

      // Return an error state
      return {
        ...state,
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Unknown document content generation error',
          timestamp: new Date().toISOString(),
          severity: 'critical',
        },
      };
    }
  };
};
