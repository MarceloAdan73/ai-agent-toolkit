import { describe, it, expect } from 'vitest';
import { createAIClient } from '../src/securityGenerator.ts';

function isKeyValid(key: string | undefined): boolean {
  return !!key && !key.toLowerCase().includes('your_') && key.length > 8;
}

const geminiKey = process.env.GEMINI_API_KEY;
const openaiKey = process.env.OPENAI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;
const deepseekKey = process.env.DEEPSEEK_API_KEY;

const SIMPLE_PROMPT = 'Responde solo con la palabra "OK" sin explicaciones.';

async function testProvider(provider: string, apiKey: string | undefined, model: string): Promise<void> {
  const client = createAIClient({ provider, apiKey });
  expect(client).not.toBeNull();
  const result = await client!.generate(SIMPLE_PROMPT, model);
  expect(result).not.toBeNull();
  expect(result!.trim().length).toBeGreaterThan(0);
}

describe('Provider Integration Tests', () => {
  it('gemini: real API call', { retry: 1, timeout: 30000 }, async () => {
    if (!isKeyValid(geminiKey)) return;
    await testProvider('gemini', geminiKey, 'gemini-2.5-flash');
  });

  it('openai: real API call', { retry: 1, timeout: 30000 }, async () => {
    if (!isKeyValid(openaiKey)) return;
    await testProvider('openai', openaiKey, 'gpt-4o-mini');
  });

  it('anthropic: real API call', { retry: 1, timeout: 30000 }, async () => {
    if (!isKeyValid(anthropicKey)) return;
    await testProvider('anthropic', anthropicKey, 'claude-sonnet-4-20250514');
  });

  it('deepseek: real API call', { retry: 1, timeout: 30000 }, async () => {
    if (!isKeyValid(deepseekKey)) return;
    await testProvider('deepseek', deepseekKey, 'deepseek-chat');
  });
});
