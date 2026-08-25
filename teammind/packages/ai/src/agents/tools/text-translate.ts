import { google } from '@ai-sdk/google';
import { generateObject, tool } from 'ai';
import { z } from 'zod';

/**
 * Creates a text translation tool using the Google AI SDK.
 *
 * @returns A tool definition for text translation.
 */
export const textTranslateTool = tool({
  description: 'Translate text from one language to another.',
  parameters: z.object({
    text: z.string().describe('The text to translate.'),
    to: z
      .string()
      .describe(
        "The target language code (e.g., 'fr' for French, 'es' for Spanish, 'de' for German).",
      ),
  }),
  execute: async ({ text, to }: { text: string; to: string }) => {
    try {
      const { object: translation } = await generateObject({
        model: google('gemini-2.0-flash'),
        system: `You are a helpful assistant that translates text accurately. Detect the source language automatically.`,
        prompt: `Translate the following text to the language with code "${to}":\n\n${text}`,
        schema: z.object({
          translatedText: z.string().describe('The translated text.'),
          detectedLanguage: z
            .string()
            .describe('The detected source language code (e.g., en, es, fr).'),
        }),
      });

      console.log('Translation successful:');
      console.log('  Detected Language:', translation.detectedLanguage);
      console.log('  Translated Text:', translation.translatedText);

      return {
        translatedText: translation.translatedText,
        detectedLanguage: translation.detectedLanguage,
      };
    } catch (error) {
      console.error('Error during text translation:', error);
      throw new Error(
        `Failed to translate text: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  },
});
