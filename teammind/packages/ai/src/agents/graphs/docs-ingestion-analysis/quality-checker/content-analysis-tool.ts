import { GoogleGenAI, Type } from '@google/genai';

import { PromptTemplate } from '../../../../prompts';
import { DocQualityCheckState } from './search-tool';

// Prompt templates
const contentAnalysisSystemPrompt = PromptTemplate.create(`
  You are an expert content quality analyzer for knowledge management systems.
  Your task is to evaluate a target document against similar documents (if provided) and determine if it should be flagged for quality issues.

  **IMPORTANT: Write your analysis as if you are reviewing regular business documents. Do not mention technical implementation details, file formats, conversion processes, or internal system references.**

  Infer the document's likely purpose from its title, headings, and opening sentences. If the purpose remains ambiguous, state this in the \`details\` and evaluate based on the most plausible interpretation.

  ## Analysis Steps (Follow these in order):
  1.  **Infer Purpose:** Determine the document's likely goal based on the content.
  2.  **Evaluate Core Areas:** Assess the document against the criteria below, comparing with similar documents if available.
  3.  **Handle Overview/Index Pages:** Apply specific logic if the document primarily links to other content.
  4.  **Determine Flagging & Action:** Decide if the document should be flagged based on significant issues found.
  5.  **Assign Relevancy:** Calculate the relevancy score based on certainty and severity.
  6.  **Format Output:** Construct the JSON response according to the specified schema.

  ## Core Evaluation Areas
  Evaluate the target document based on these concepts, relative to its inferred purpose:
  1.  **Current & Accurate:** Is the information up-to-date and factually correct? Pay close attention to the \`updatedAt\` timestamps. Significantly older documents covering the same topic as newer ones are strong candidates for being 'outdated'. Flag as 'factual' only if an error is clearly demonstrable within the content or contradicts widely accepted, stable general knowledge.
  2.  **Consistent:** Does the content align with or contradict similar documents? Actively search for conflicting dates, figures, instructions, or conclusions between the target and similar documents.
  3.  **Unique Value:** Does the content offer distinct information or a useful organization/summary not found elsewhere?
  4.  **Quality & Clarity:** Is the content well-structured, easy to understand, and reasonably complete for its intended purpose?
      - Assess if the document structure helps or hinders understanding.
      - Flag if key sections implied by the title seem missing, or if the structure is highly confusing (e.g., lack of headings, illogical flow).
      - Consider if the document's length and detail seem appropriate for its likely purpose.

  ## Handling Overview/Index Pages
  - Recognize pages that primarily structure or link to other content.
  - Judge their quality based on organization, clarity, and navigational usefulness.
  - **Do NOT flag them as 'redundant' or 'quality' simply for lacking deep original content if they serve their structural purpose well.**
  - Only flag them if they are clearly outdated, poorly structured, or genuinely redundant as an overview.

  ## Flagging & Actions
  **Critical Alignment:** Your detailed explanation in the \`details\` field MUST logically justify your final \`shouldFlag\` decision based only on the analysis of the provided content. If your analysis concludes the document is generally effective or has only minor flaws, \`shouldFlag\` MUST be \`false\`.

  If issues are found, determine the \`primaryReason\` and \`recommendedAction\`. Select the *most significant* problem hindering the document's usefulness as the \`primaryReason\`.
  - **Reasons:** Use one of these lowercase values: 'outdated', 'inconsistent', 'redundant', 'quality', 'factual', 'none'.
  - **Actions:** Use one of these lowercase values: 'update', 'merge', 'archive', 'restructure', 'none'.

  Note: 'none' should only be used when \`shouldFlag\` is false. If \`shouldFlag\` is true, you must select one of the other values.

  ## Relevancy Score
  Assign a \`relevancy\` score (0.0 - 1.0) reflecting *both* the certainty that an issue exists AND the severity/impact of that issue.
  **Crucially, a \`shouldFlag: true\` decision requires a HIGH \`relevancy\` score (generally > 0.7).** This means both certainty AND severity must be sufficiently high. Minor issues, even if certain, should have lower relevancy. If either certainty OR severity is low, the relevancy score must be low, and consequently, \`shouldFlag\` must be \`false\`.

  ## Output Instructions
  **CRITICAL WRITING GUIDELINES:**
  - Write the \`details\` field as if explaining the analysis to a business user who wants to understand document quality issues
  - **NEVER mention document IDs, reference numbers, or internal system identifiers in the details**
  - **NEVER mention technical terms like "GFM", "markdown", "conversion", or file format details**
  - When referring to other documents, use only their titles (e.g., "the 'User Guide' document" instead of "document ID 123")
  - Focus on business impact and content quality, not technical implementation
  - Write in plain, professional language that a content manager would understand

  - Your response MUST be ONLY the raw JSON object matching the schema EXACTLY.
  - If \`recommendedAction\` is "merge", \`relatedDocumentIds\` MUST contain the IDs of documents to merge with.
  - Be conservative: Only flag if there's strong evidence within the provided content. If unsure, lean towards \`shouldFlag: false\`.

  ## Output JSON Structure (MUST follow this):
  {
    "shouldFlag": boolean, // True ONLY if significant issues found with high relevancy, false otherwise. MUST align with details.
    "primaryReason": string | null, // 'outdated', 'inconsistent', 'redundant', 'quality', 'factual', 'none'. Set to null if shouldFlag is false.
    "relevancy": number | null, // 0.0 - 1.0. Reflects certainty AND severity. Set to null if shouldFlag is false.
    "recommendedAction": string | null, // 'update', 'merge', 'archive', 'restructure', 'none'. Set to null if shouldFlag is false.
    "details": string, // Business-focused explanation (Required). MUST justify the shouldFlag decision. NO technical references or document IDs.
    "relatedDocumentIds": array of numbers | null // IDs for merge action. Set to null if not applicable or shouldFlag is false.
  }

  ## Examples

  Example (Redundant Content Document):
  {
    "shouldFlag": true,
    "primaryReason": "redundant",
    "relevancy": 0.85,
    "recommendedAction": "merge",
    "details": "This API documentation covers the same endpoints and functionality as the 'Comprehensive API Guide' with approximately 70% content overlap. The Comprehensive API Guide appears more current and complete, making this document redundant.",
    "relatedDocumentIds": [123, 456]
  }

  Example (Good Content Document):
  {
    "shouldFlag": false,
    "primaryReason": null,
    "relevancy": null,
    "recommendedAction": null,
    "details": "The 'Onboarding Checklist for New Hires' is current, unique, well-structured, and provides essential information not found in other documents. No significant issues identified.",
    "relatedDocumentIds": null
  }

  Example (Outdated Content):
  {
    "shouldFlag": true,
    "primaryReason": "outdated",
    "relevancy": 0.8,
    "recommendedAction": "update",
    "details": "The document contains specific personal contact information that appears outdated compared to more recent documents which reference general team aliases. Using specific personal contacts makes the process prone to becoming outdated and less reliable than general contact methods.",
    "relatedDocumentIds": null
  }

  Example (Poor Quality Document):
  {
    "shouldFlag": true,
    "primaryReason": "quality",
    "relevancy": 0.7,
    "recommendedAction": "restructure",
    "details": "While the document contains valuable information, it lacks clear headings and logical flow, making it difficult to find specific information quickly. The content would benefit from better organization and structure.",
    "relatedDocumentIds": null
  }

  Example (Data Quality Issue):
  {
    "shouldFlag": true,
    "primaryReason": "quality",
    "relevancy": 0.8,
    "recommendedAction": "update",
    "details": "The document has an uninformative title ('Untitled') and shows an incorrect future date for the last updated field. These metadata issues need to be corrected to ensure proper document management and user clarity.",
    "relatedDocumentIds": null
  }

  Example (Minor Issue - Not Flagged):
  {
    "shouldFlag": false,
    "primaryReason": null,
    "relevancy": null,
    "recommendedAction": null,
    "details": "The document contains a few minor formatting inconsistencies but the content is clear, current, and serves its purpose effectively. No action required.",
    "relatedDocumentIds": null
  }
`);

// User prompt template for comparing documents
const contentAnalysisUserPrompt = PromptTemplate.create<{
  document: {
    title: string;
    content: string;
    updatedAt: string;
  };
  similarDocuments: string;
}>(`
Here are the similar documents for comparison:

<similar_documents>
{{similarDocuments}}
</similar_documents>

Here is the target document you need to analyze:

<target_document_title>
{{document.title}}
</target_document_title>

<target_document_updated_at>
{{document.updatedAt}}
</target_document_updated_at>

<target_document_content>
{{document.content}}
</target_document_content>
`);

// User prompt template for analyzing a document without similar documents
const soloDocumentAnalysisPrompt = PromptTemplate.create<{
  document: {
    title: string;
    content: string;
    updatedAt: string;
  };
}>(`
TARGET DOCUMENT:
Title: {{document.title}}
Last Updated: {{document.updatedAt}}
Content: {{document.content}}

No similar documents were found for comparison. Analyze this document for standalone quality issues only.
`);

/**
 * Tool that analyzes document content and identifies quality issues
 *
 * @param ai - Instance of GoogleGenAI to use for analysis
 * @returns A function that analyzes documents and identifies quality issues
 */
export const createContentAnalysisTool = (ai: GoogleGenAI) => {
  return async (state: DocQualityCheckState): Promise<DocQualityCheckState> => {
    const { document, similarDocuments } = state;

    if (!document) {
      return {
        ...state,
        error: {
          message: 'Missing document for analysis',
          timestamp: new Date().toISOString(),
          operation: 'content_analysis',
        },
      };
    }

    try {
      let prompt;

      // Handle the case with no similar documents
      if (!similarDocuments || similarDocuments.length === 0) {
        // Use the solo document analysis prompt
        prompt = soloDocumentAnalysisPrompt.format({
          document: {
            title: document.title,
            content: document.content
              ? // Remove the hierarchy path and title from the content
                (() => {
                  const content = document.content.trim();
                  const prefixes = [
                    `${document.hierarchy_path}\\${document.title}`,
                    document.hierarchy_path,
                    document.title,
                  ].filter(Boolean);

                  for (const prefix of prefixes) {
                    if (prefix && content.startsWith(prefix)) {
                      return content.slice(prefix.length).trim();
                    }
                  }
                  return content;
                })()
              : '',
            updatedAt: document.source_updated_at,
          },
        });
      } else {
        // Format similar documents for the prompt - handling GroupedSearchResultItem
        const formattedSimilarDocs = similarDocuments
          .map(
            (doc) => `
            Title: ${doc.title}
            Document ID: ${doc.documentId}
            Source: ${doc.source}
            Last Updated: ${doc.sourceUpdatedAt}
            Similarity Score: ${doc.similarity.toFixed(4)}
            Content: ${doc.contentParts as string}
          `,
          )
          .join('\n\n');

        // Prepare the prompt with document and similar documents
        prompt = contentAnalysisUserPrompt.format({
          document: {
            title: document.title,
            content: document.content,
            updatedAt: document.source_updated_at,
          },
          similarDocuments: formattedSimilarDocs,
        });
      }

      // Generate the content analysis
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: prompt,
        config: {
          temperature: 0.5,
          responseMimeType: 'application/json',
          systemInstruction: contentAnalysisSystemPrompt.format(),
          thinkingConfig: {
            thinkingBudget: 1024,
          },
          responseSchema: {
            type: Type.OBJECT,
            description: 'Content analysis results for document comparison',
            properties: {
              shouldFlag: {
                type: Type.BOOLEAN,
                description:
                  'Set to true ONLY if a significant issue (OUTDATED, INCONSISTENT, REDUNDANT, QUALITY, FACTUAL) is identified with high relevancy (certainty AND severity, e.g., > 0.7). Set to false otherwise, even if minor imperfections are noted in the details. This decision MUST align with the `details` field.',
              },
              primaryReason: {
                type: Type.STRING,
                enum: [
                  'outdated',
                  'inconsistent',
                  'redundant',
                  'quality',
                  'factual',
                  'none',
                ],
                description:
                  'Primary reason for flagging (only required if shouldFlag is true)',
                nullable: true,
              },
              relevancy: {
                type: Type.NUMBER,
                description:
                  'Relevancy score (0.0 - 1.0) reflecting BOTH the certainty that an issue exists AND the severity/impact of that issue. A high score (e.g., > 0.7) is generally required to set `shouldFlag` to true. Minor issues, even if certain, should have lower relevancy.',
                nullable: true,
              },
              recommendedAction: {
                type: Type.STRING,
                enum: ['update', 'merge', 'archive', 'restructure', 'none'],
                description:
                  'Recommended action to resolve the issue (Required only if shouldFlag is true)',
                nullable: true,
              },
              details: {
                type: Type.STRING,
                description:
                  'Detailed explanation of the issue or why no action is needed',
              },
              relatedDocumentIds: {
                type: Type.ARRAY,
                items: {
                  type: Type.INTEGER,
                },
                description:
                  'IDs of related documents, especially for merge recommendations (Required only if shouldFlag is true and recommendedAction is MERGE)',
              },
            },
            required: [
              'shouldFlag',
              'primaryReason',
              'relevancy',
              'recommendedAction',
              'details',
              'relatedDocumentIds',
            ],
          },
        },
      });

      // Check if response text exists before parsing
      if (!result.text) {
        throw new Error(
          'Model response did not contain text for JSON parsing.',
        );
      }
      // Parse the response and update state
      const analysisResult = result.text;
      let parsedResult = JSON.parse(analysisResult); // Use let to allow modification

      // Relevancy Filter: Override flag if relevancy is below 0.75
      if (parsedResult.shouldFlag && parsedResult.relevancy < 0.75) {
        parsedResult = {
          ...parsedResult,
          shouldFlag: false,
          primaryReason: 'NONE',
          recommendedAction: 'NONE',
          relatedDocumentIds: [],
          details: `Original flag (${parsedResult.primaryReason}) overridden due to low relevancy (${parsedResult.relevancy.toFixed(2)}). ${parsedResult.details}`,
        };
      }

      // If the document shouldn't be flagged (either initially or after filtering), return simplified result
      if (!parsedResult.shouldFlag) {
        return {
          ...state,
          analysisResult: {
            shouldFlag: false,
            details:
              parsedResult.details ??
              'Document passed quality check with no issues detected.',
          },
        };
      }

      // Only process related documents if we're still flagging the document after the relevancy check
      let relatedDocumentIds = parsedResult.relatedDocumentIds ?? [];
      if (parsedResult.shouldFlag) {
        if (
          parsedResult.recommendedAction === 'merge' &&
          (!relatedDocumentIds || relatedDocumentIds.length === 0) &&
          similarDocuments &&
          similarDocuments.length > 0
        ) {
          // Extract IDs from the top similar documents (up to 3)
          relatedDocumentIds = similarDocuments
            .slice(0, 3)
            .map((doc) => Number(doc.documentId))
            .filter((id) => !isNaN(id));
        }

        return {
          ...state,
          analysisResult: {
            shouldFlag: true,
            primaryReason: parsedResult.primaryReason,
            relevancy: parsedResult.relevancy,
            recommendedAction: parsedResult.recommendedAction,
            details: parsedResult.details,
            relatedDocumentIds,
          },
        };
      } else {
        // This case should technically be covered by the earlier check, but included for robustness
        return {
          ...state,
          analysisResult: {
            shouldFlag: false,
            details:
              parsedResult.details ??
              'Document passed quality check or flag overridden due to low relevancy.',
          },
        };
      }
    } catch (error) {
      console.error('Error in content analysis:', error);

      return {
        ...state,
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Unknown content analysis error',
          timestamp: new Date().toISOString(),
          operation: 'content_analysis',
        },
      };
    }
  };
};
