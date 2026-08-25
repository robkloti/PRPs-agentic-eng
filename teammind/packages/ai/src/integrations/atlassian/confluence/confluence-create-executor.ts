import { SupabaseClient } from '@supabase/supabase-js';

import { GoogleGenAI } from '@google/genai';

import { Database } from '@tm/supabase/database';
import { getSupabaseServerClient } from '@tm/supabase/server-client';

import { PromptTemplate } from '../../../prompts';
import {
  AtlassianConfig,
  DocumentAction,
  DocumentCreateResult,
} from '../../../types';
import { CreateActionExecutor, CreateExecutionResult } from '../../shared';
import { confluencePageFormat } from '../confluence';
import {
  ConfluenceApi,
  ConfluencePageCreationRequest,
  ConfluencePageUpdateRequest,
} from './confluence-api';

/**
 * Confluence-specific result that extends the base result with string content
 */
export interface ConfluenceCreateResult
  extends DocumentCreateResult,
    CreateExecutionResult {
  spaceId: string;
  version: number;
}

// System instruction for Markdown to Confluence XHTML conversion
const markdownToConfluenceSystemInstruction = PromptTemplate.create<{
  confluencePageFormat: string;
}>(`You are an expert Confluence technical writer AI specializing in precise Markdown-to-XHTML conversion. Your goal is to transform the provided Markdown into valid, well-structured Confluence XHTML storage format, adhering strictly to the specification below.

## CONFLUENCE XHTML STORAGE FORMAT SPECIFICATION
{{confluencePageFormat}}
// ^ Ensure this variable contains detailed specs, including macro definitions and attributes.

## CONVERSION RULES & BEST PRACTICES
1.  **Strict Validation:** Output MUST be valid Confluence XHTML storage format.
2.  **Complete Conversion:** Convert ALL Markdown elements to their corresponding Confluence XHTML equivalents as defined in the specification.
3.  **Structure Preservation:** Maintain the semantic structure (headings, lists, paragraphs, emphasis, etc.) from Markdown. Use appropriate heading levels (h1, h2, etc.).
4.  **Paragraphs:** Wrap all standard text paragraphs in <p> tags.
5.  **Line Breaks:** Convert Markdown line breaks (double space + newline or backslash + newline) to <br /> tags within paragraphs where appropriate. Standard paragraph breaks should use separate <p> tags.
6.  **Macros:** Utilize Confluence macros accurately:
    *   **Code Blocks:** Use \`<ac:structured-macro ac:name="code">\` with appropriate parameters (e.g., \`ac:parameter ac:name="language"\`, \`ac:parameter ac:name="theme"\`). Preserve language hints from Markdown fences.
    *   **Panels:** Use \`<ac:structured-macro ac:name="info|warning|note|tip">\` for admonitions/panels. Choose the type based on context if possible, otherwise default to 'info'.
    *   **Tables:** Convert Markdown tables to standard XHTML \`<table>\`, \`<tr>\`, \`<th>\`, \`<td>\` tags. Ensure proper structure.
    *   **Links:**
        *   **External:** Use standard \`<a>\` tags with \`href\`.
        *   **Internal Confluence Links:** Use \`<ac:link><ri:page ri:content-title="Page Title Here" /></ac:link>\` or similar based on exact spec. If the target page title is ambiguous, use the raw link text.
    *   **Other Macros:** Accurately convert any other specified macros (e.g., table of contents, expand).
7.  **Lists:** Use \`<ul>\`/\`<ol>\` and \`<li>\` tags. Handle nested lists correctly.
8.  **Escaping:** Properly escape special characters within text content and code blocks as needed for valid XHTML.
9.  **No Custom Styles:** DO NOT use inline CSS (\`style="..."\`) or custom \`<style>\` blocks unless explicitly part of a defined Confluence macro.
10. **Clean Output:** Return ONLY the converted Confluence XHTML content within a JSON object with a single key "content". Do not include any explanatory text or apologies outside the JSON structure.
11. **Verification:** Before outputting the JSON, double-check the generated XHTML against the provided CONFLUENCE XHTML STORAGE FORMAT SPECIFICATION to ensure validity and accuracy. Confirm that all Markdown elements have been converted appropriately.

## EXAMPLE (Illustrative - adapt based on actual spec)
Markdown Input:
\`\`\`markdown
# Section 1

Some text.

* Item 1
* Item 2

\`\`\`
\`\`\`
Expected JSON Output:
\`\`\`json
{
  "content": "<h1>Section 1</h1><p>Some text.</p><ul><li>Item 1</li><li>Item 2</li></ul>"
}
\`\`\`
`);

// User prompt template for Markdown to Confluence conversion
const markdownToConfluencePrompt = PromptTemplate.create<{
  markdownContent: string;
}>(`## INPUT
Markdown content to convert to Confluence XHTML format:

{{markdownContent}}`);

// System instruction for updating Confluence content
const updateConfluenceSystemInstruction = PromptTemplate.create<{
  confluencePageFormat: string;
}>(`You are an expert Confluence editor AI. Your task is to meticulously integrate new information (provided in Markdown) into an existing Confluence page (provided in XHTML storage format). Preserve the original structure, formatting, and macros while ensuring the final document is coherent, up-to-date, and valid Confluence XHTML.

## CONFLUENCE XHTML STORAGE FORMAT SPECIFICATION
{{confluencePageFormat}}

## UPDATE METHODOLOGY & RULES
1.  **Analyze Structure:** First, analyze the structure (headings, sections, macros) of the existing Confluence XHTML (\`<current_content>\`).
2.  **Analyze New Content:** Second, analyze the content and structure of the new Markdown (\`<new_content>\`).
3.  **Identify Integration Points:** Determine how the new Markdown content relates to the existing XHTML:
    *   **Matching Sections:** If the Markdown contains a section (e.g., identified by a heading) that corresponds to an existing section in the XHTML, update the content *within* that existing XHTML section. Replace the old content of that section with the newly converted XHTML from the Markdown section.
    *   **New Sections:** If the Markdown contains a new section not present in the XHTML, convert it to XHTML and append it at the most logical place (usually at the end, or after a related preceding section).
    *   **Minor Edits/Additions:** If the Markdown seems to provide minor additions or corrections to existing paragraphs or lists, carefully integrate these changes into the relevant XHTML elements.
4.  **Preserve Existing Elements:**
    *   **Macros:** Maintain ALL existing Confluence macros (\`<ac:...\` tags) and their parameters/IDs unless the new Markdown explicitly intends to replace or remove them.
    *   **Structure:** Do not arbitrarily change the existing heading hierarchy or reorder major sections unless the Markdown clearly dictates this.
    *   **IDs/Attributes:** Preserve existing IDs and attributes on XHTML elements if present.
5.  **Convert New Content:** Convert the relevant parts of the new Markdown content to Confluence XHTML using the rules from the Markdown-to-XHTML conversion task before integrating.
6.  **Avoid Duplication:** Do not simply append the entire converted Markdown. Integrate it thoughtfully based on the analysis in step 3. If the Markdown largely repeats existing content, prioritize the Markdown version for updates within the relevant section.
7.  **Strict Validation:** The final output MUST be valid Confluence XHTML storage format. Ensure all tags are correctly nested and closed.
8.  **Clean Output:** Return ONLY the updated Confluence XHTML content within a JSON object with a single key "content". Do not include explanations outside the JSON.
9.  **Verification:** Before outputting the JSON, meticulously verify the following:
    *   The final output is valid Confluence XHTML storage format.
    *   All original macros, IDs, and structural elements from \`<current_content>\` are preserved unless intentionally modified or replaced by \`<new_content>\`.
    *   The integration of new content is logical and does not introduce unintended duplications or formatting errors.
10. **Final Review:** Briefly review the integrated content for coherence and ensure it accurately reflects the intended updates from the new Markdown.

## EXAMPLE SCENARIO
*   If \`<current_content>\` has \`<h2>Section A</h2><p>Old text.</p>\`
*   And \`<new_content>\` has \`## Section A\n\nNew text.\`
*   The output should update the paragraph under the existing H2: \`<h2>Section A</h2><p>New text.</p>\`

*   If \`<new_content>\` has \`## Section B\n\nMore text.\` (and Section B doesn't exist in current)
*   The output should append: \`... (existing content) ...<h2>Section B</h2><p>More text.</p>\`
`);

// User prompt template for updating Confluence content
const updateConfluencePrompt = PromptTemplate.create<{
  currentXhtml: string;
  newMarkdown: string;
}>(`## Current Confluence XHTML content
<current_content>
{{currentXhtml}}
</current_content>

## New Markdown content to integrate
<new_content>
{{newMarkdown}}
</new_content>`);

/**
 * Executor implementation for Confluence operations
 */
export class ConfluenceExecutor
  implements
    CreateActionExecutor<
      AtlassianConfig,
      DocumentAction,
      ConfluenceCreateResult
    >
{
  private readonly ai = new GoogleGenAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
  });
  private readonly supabase: SupabaseClient<Database> = getSupabaseServerClient(
    {
      admin: true,
    },
  );

  async execute(
    actionData: DocumentAction,
    config: AtlassianConfig,
    userId: string,
  ): Promise<ConfluenceCreateResult> {
    const { action, spaceId, title, parentPageId, pageId, content } =
      actionData;

    if (action === 'create') {
      // Convert the Markdown content to Confluence XHTML format
      const confluenceContent =
        await this.convertMarkdownToConfluenceXhtml(content);

      // Create document
      const createRequest: ConfluencePageCreationRequest = {
        spaceId: spaceId!,
        status: 'current',
        title: title ?? actionData.title ?? 'Untitled Document',
        ...(parentPageId && {
          parentId: parentPageId,
        }),
        body: {
          storage: {
            value: confluenceContent,
            representation: 'storage',
          },
        },
      };

      const apiResult = await ConfluenceApi.createPage(createRequest, config);

      return {
        id: apiResult.id,
        title: apiResult.title,
        url: `${config.baseUrl}/wiki${apiResult._links.webui}`,
        spaceId: apiResult.spaceId,
        version: apiResult.version.number,
        source: 'confluence',
        contentBefore: content, // Store original Markdown
      };
    } else if (action === 'update') {
      if (!pageId) {
        throw new Error('Page ID is required for update action');
      }
      // First fetch the original page content directly from the Confluence API
      const currentPage = await ConfluenceApi.getPageById(pageId, config);

      // Extract the original content from the page
      const originalXhtml = currentPage.body?.storage?.value || '';

      // Get original Markdown from Supabase
      const { data: originalMarkdown } = await this.supabase
        .from('documents')
        .select('content, document_user_access!inner(user_id)')
        .eq('source_id', pageId)
        .eq('source', 'confluence')
        .eq('document_user_access.user_id', userId)
        .single();

      // Update the content using both original XHTML and new Markdown
      const updatedXhtml = await this.updateConfluenceContent(
        originalXhtml,
        content,
      );

      // Update document
      const updateRequest: ConfluencePageUpdateRequest = {
        id: pageId,
        spaceId: currentPage.spaceId,
        status: currentPage.status,
        title: title ?? currentPage.title,
        body: {
          storage: {
            value: updatedXhtml,
            representation: 'storage',
          },
        },
        version: {
          number: currentPage.version.number + 1,
          message: 'Updated by TeamMind AI',
        },
      };

      const apiResult = await ConfluenceApi.updatePage(updateRequest, config);

      return {
        id: apiResult.id,
        title: apiResult.title,
        url: `${config.baseUrl}/wiki${apiResult._links.webui}`,
        spaceId: apiResult.spaceId,
        version: apiResult.version.number,
        source: 'confluence',
        contentBefore: originalMarkdown?.content, // Store original Markdown from DB
      };
    } else {
      throw new Error(`Unsupported action type: ${action}`);
    }
  }

  /**
   * Converts Markdown content to Confluence XHTML format
   */
  private async convertMarkdownToConfluenceXhtml(
    markdownContent: string,
  ): Promise<string> {
    try {
      const formattedPrompt = markdownToConfluencePrompt.format({
        markdownContent,
      });

      const result = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: formattedPrompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingBudget: 12288,
          },
          systemInstruction: markdownToConfluenceSystemInstruction.format({
            confluencePageFormat,
          }),
        },
      });

      if (!result.text) {
        throw new Error('Markdown conversion response did not contain text.');
      }
      const response = JSON.parse(result.text) as { content: string };

      return response.content;
    } catch (error) {
      console.error('Error converting Markdown to Confluence XHTML:', error);
      throw new Error('Failed to convert content to Confluence format');
    }
  }

  /**
   * Updates existing Confluence XHTML content with new Markdown content
   */
  private async updateConfluenceContent(
    currentXhtml: string,
    newMarkdown: string,
  ): Promise<string> {
    try {
      const formattedPrompt = updateConfluencePrompt.format({
        currentXhtml,
        newMarkdown,
      });

      const result = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: formattedPrompt,
        config: {
          temperature: 0.2,
          responseMimeType: 'application/json',
          thinkingConfig: {
            thinkingBudget: 12288,
          },
          systemInstruction: updateConfluenceSystemInstruction.format({
            confluencePageFormat,
          }),
        },
      });

      if (!result.text) {
        throw new Error('Confluence update response did not contain text.');
      }
      const response = JSON.parse(result.text) as { content: string };

      return response.content;
    } catch (error) {
      console.error('Error updating Confluence content:', error);

      // Fall back to converting just the new Markdown if update fails
      console.log('Falling back to direct conversion...');
      return this.convertMarkdownToConfluenceXhtml(newMarkdown);
    }
  }
}
