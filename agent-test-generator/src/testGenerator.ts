import { getFileTypePrompt } from './prompts.js';
import { createAIClient, GeminiClient, OpenAIClient, AnthropicClient, DeepSeekClient, OllamaClient } from './aiClient.js';
import type { AIClient } from './aiClient.js';

export { createAIClient, GeminiClient, OpenAIClient, AnthropicClient, DeepSeekClient, OllamaClient };
export type { AIClient };

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const MAX_FILE_CHARS = 15000;
const DEFAULT_MODEL = 'gemini-2.5-flash';

export async function generateTests(
  ai: AIClient | null,
  filePath: string,
  content: string,
  verbose: boolean = false,
  model: string = DEFAULT_MODEL,
  maxChars: number = MAX_FILE_CHARS
): Promise<string | null> {
  if (!ai) {
    console.error('[ERROR] AI model not initialized. Skipping test generation.');
    return null;
  }

  if (content.length > maxChars) {
    console.warn(`[WARN] ${filePath}: ${content.length} chars truncado a ${maxChars}.`);
  }

  const trimmedContent = content.length > maxChars
    ? content.slice(0, maxChars) + '\n// ... [truncated]'
    : content;

  const promptTemplate = getFileTypePrompt(filePath, trimmedContent);
  const prompt = promptTemplate.replace('{CODE}', trimmedContent);

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (verbose) {
        console.log(`[INFO] Generating tests (attempt ${attempt}/${MAX_RETRIES})...`);
      }

      const text = await ai.generate(prompt, model);

      if (!text || text.trim().length === 0) {
        throw new Error('Empty response from AI provider');
      }

      if (verbose) console.log('[INFO] Tests generated successfully.');
      return text;

    } catch (err) {
      const error = err as Error;
      const isRateLimit = error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED');
      const isQuota = error.message?.includes('quota') || error.message?.includes('quotaExceeded');

      if (isRateLimit || isQuota) {
        const waitMs = RETRY_DELAY_MS * attempt;
        console.warn(`[WARN] API rate limit hit. Retrying in ${waitMs / 1000}s... (attempt ${attempt}/${MAX_RETRIES})`);
        await sleep(waitMs);
        continue;
      }

      if (attempt < MAX_RETRIES) {
        console.warn(`[WARN] Attempt ${attempt} failed: ${error.message}. Retrying...`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      console.error(`[ERROR] All ${MAX_RETRIES} attempts failed for ${filePath}:`);
      console.error(`  ${error.message}`);
      return null;
    }
  }

  return null;
}

export function extractTestContent(rawText: string | null | undefined): string {
  if (!rawText) return '';

  const codeBlockMatch = rawText.match(/```(?:typescript|ts|javascript|js)?\n([\s\S]*?)```/);
  if (codeBlockMatch) {
    return codeBlockMatch[1]!.trim();
  }

  return rawText.trim();
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
