import { SupabaseClient } from '@supabase/supabase-js';

import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';

import { Database } from '@tm/supabase/database';

import { PromptTemplate } from '../../../../prompts';
import { TeamMindState } from '../create-graph';

export const TranscriptSummaryZodSchema = z.object({
  summary: z.string(),
  language: z.string(),
  title: z.string(),
});

export type TranscriptSummaryOutput = z.infer<
  typeof TranscriptSummaryZodSchema
>;

const transcriptSummarizerSystemPrompt =
  PromptTemplate.create(`You are an elite meeting analysis specialist with exceptional comprehension and summarization abilities. Your task is to transform meeting transcripts into comprehensive, flowing summaries that capture EVERY meaningful detail while maintaining natural language.

## CRITICAL REQUIREMENTS
- Produce an EXHAUSTIVELY DETAILED summary in natural, flowing prose
- Write in the EXACT SAME LANGUAGE as the original transcript
- Preserve ALL technical terminology, project names, and domain-specific language
- Maintain chronological flow of the discussion
- Capture nuances, uncertainties, and differing opinions
- Include EVERY action item, decision, and technical detail
- Aim for maximum information density without sacrificing readability
- Ensure your summary is so comprehensive that referring back to the original transcript is rarely necessary

## STRUCTURE AND APPROACH
Create a natural, flowing narrative that reads like a detailed account written by an expert observer. Your summary should:

1. Begin with a comprehensive overview paragraph that captures meeting purpose and key outcomes

2. Follow with a chronological walkthrough of the ENTIRE discussion that includes:
   - ALL topics discussed with full technical details
   - EVERY decision made with complete context and rationale
   - ALL action items mentioned (explicit or implicit) with ownership and timelines
   - Full technical specifications, parameters, requirements mentioned
   - All questions raised and answers provided
   - Areas of uncertainty or disagreement
   - Background context and references to past work
   - Next steps and future planning

3. Use natural transitions between topics while maintaining explicit speaker attribution (e.g., "Attribute speakers naturally, like 'Sarah proposed...' or 'According to the team lead,...'")

4. Integrate technical details seamlessly into the narrative rather than isolating them

5. Represent different perspectives and opinions expressed during the meeting

6. Format the content for maximum readability:
   - Use paragraphs for cohesive topics
   - Include bullet points where appropriate for clarity
   - Create section breaks for major topic shifts
   - Use emphasis for critical information

Remember: Downstream AI systems will use your summary as their ONLY source of information about what happened in this meeting. Your summary must be so comprehensive that it can completely replace the original transcript.

After completing your exceptionally detailed narrative summary, provide a JSON object with:
{
  "summary": "Your complete, extraordinarily detailed summary in natural language prose",
  "language": "The exact language of the transcript (e.g., 'English', 'Spanish', 'German')",
  "title": "A precise, descriptive meeting title that captures the core subject matter"
}

The quality of your summary directly impacts all downstream processes. Aim for extraordinary detail while maintaining natural, readable language.`);

const transcriptSummarizerUserPrompt = PromptTemplate.create<{
  transcript: string;
}>(`Here is the meeting transcript you need to analyze:

<transcript>
{{transcript}}
</transcript>
`);

/**
 * Creates an enhanced transcript summarizer tool that detects language,
 * extracts comprehensive information from meeting transcripts in the original language,
 * and provides an extremely detailed summary
 *
 * @param ai - Instance of GoogleGenAI to use for summarization
 * @returns A function that generates a comprehensive transcript summary with language detection
 */
export const createTranscriptSummarizerTool = (
  ai: GoogleGenAI,
  supabaseClient: SupabaseClient<Database>,
) => {
  return async (
    state: typeof TeamMindState.State,
  ): Promise<typeof TeamMindState.State> => {
    const { transcript, meetingId } = state;

    try {
      const formattedPrompt = transcriptSummarizerUserPrompt.format({
        transcript: JSON.stringify(transcript, null, 2),
      });

      // Generate the comprehensive summary with language detection
      const summaryResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-preview-04-17',
        contents: formattedPrompt,
        config: {
          temperature: 0.5,
          responseMimeType: 'application/json',
          systemInstruction: transcriptSummarizerSystemPrompt.format(), // Moved into config
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              summary: {
                type: Type.STRING,
                description:
                  'Complete formatted summary of the transcript in Markdown format',
              },
              language: {
                type: Type.STRING,
                description: 'Detected language of transcript',
              },
              title: {
                type: Type.STRING,
                description: 'Title of the meeting',
              },
            },
            required: ['summary', 'language', 'title'],
          },
        },
      });

      // Check if response text exists before parsing
      if (!summaryResponse.text) {
        throw new Error(
          'Model response did not contain text for JSON parsing.',
        );
      }
      const summary: TranscriptSummaryOutput = JSON.parse(summaryResponse.text);

      // Update the title of the meeting
      const { error: meetingError } = await supabaseClient
        .from('meetings')
        .update({
          title: summary.title,
        })
        .eq('id', meetingId);

      if (meetingError) {
        console.log('Error updating meeting title:', meetingError);
      }

      return {
        ...state,
        transcriptSummary: summary.summary,
        title: summary.title,
      };
    } catch (error) {
      console.error('Error in transcript summarizer:', error);
      // Return error state if even fallback fails
      return {
        ...state,
        transcriptSummary: 'Error: Unable to summarize transcript.',
        error: {
          message:
            error instanceof Error
              ? error.message
              : 'Unknown summarization error',
          timestamp: new Date().toISOString(),
          severity: 'critical',
        },
      };
    }
  };
};
