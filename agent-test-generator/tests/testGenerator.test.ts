import { describe, it, expect, vi, afterEach } from 'vitest';
import { createAIClient, GeminiClient, OpenAIClient, AnthropicClient, DeepSeekClient, OllamaClient } from '../src/aiClient.ts';
import type { AIClient } from '../src/aiClient.ts';
import { generateTests, extractTestContent } from '../src/testGenerator.ts';

class FakeClient implements AIClient {
  calls: { prompt: string; model: string }[] = [];
  response: string | null;
  failTimes = 0;

  constructor(response = '```typescript\ndescribe("x", () => {});\n```') {
    this.response = response;
  }

  async generate(prompt: string, model: string): Promise<string | null> {
    this.calls.push({ prompt, model });
    if (this.failTimes > 0) {
      this.failTimes--;
      throw new Error('transient failure');
    }
    return this.response;
  }
}

describe('createAIClient', () => {
  it('returns null when gemini apiKey is missing', () => {
    expect(createAIClient({ provider: 'gemini' })).toBeNull();
    expect(createAIClient({ provider: 'gemini', apiKey: '' })).toBeNull();
    expect(createAIClient({ provider: 'gemini', apiKey: 'your_gemini_api_key_here' })).toBeNull();
  });

  it('returns a GeminiClient for a valid key', () => {
    const client = createAIClient({ provider: 'gemini', apiKey: 'fake-api-key-12345' });
    expect(client).not.toBeNull();
    expect(client).toBeInstanceOf(GeminiClient);
  });

  it('returns an OpenAIClient for the openai provider', () => {
    const client = createAIClient({ provider: 'openai', apiKey: 'sk-fake-key' });
    expect(client).not.toBeNull();
    expect(client).toBeInstanceOf(OpenAIClient);
  });

  it('returns null when openai apiKey is missing', () => {
    expect(createAIClient({ provider: 'openai' })).toBeNull();
    expect(createAIClient({ provider: 'openai', apiKey: '' })).toBeNull();
  });

  it('returns an AnthropicClient for the anthropic provider', () => {
    const client = createAIClient({ provider: 'anthropic', apiKey: 'sk-ant-fake-key' });
    expect(client).not.toBeNull();
    expect(client).toBeInstanceOf(AnthropicClient);
  });

  it('returns null when anthropic apiKey is missing', () => {
    expect(createAIClient({ provider: 'anthropic' })).toBeNull();
    expect(createAIClient({ provider: 'anthropic', apiKey: '' })).toBeNull();
  });

  it('returns a DeepSeekClient for the deepseek provider', () => {
    const client = createAIClient({ provider: 'deepseek', apiKey: 'sk-fake-key' });
    expect(client).not.toBeNull();
    expect(client).toBeInstanceOf(DeepSeekClient);
  });

  it('returns null when deepseek apiKey is missing', () => {
    expect(createAIClient({ provider: 'deepseek' })).toBeNull();
    expect(createAIClient({ provider: 'deepseek', apiKey: '' })).toBeNull();
  });

  it('returns an OllamaClient for the ollama provider', () => {
    const client = createAIClient({ provider: 'ollama', baseUrl: 'http://localhost:11434/v1' });
    expect(client).toBeInstanceOf(OllamaClient);
  });

  it('returns null for unknown provider', () => {
    expect(createAIClient({ provider: 'unknown' })).toBeNull();
  });
});

describe('OpenAIClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('posts to api.openai.com and returns message content', async () => {
    global.fetch = (async (_url: any, opts: any) => {
      const body = JSON.parse(opts.body);
      expect(body.model).toBe('gpt-4o');
      expect(body.messages[0].role).toBe('user');
      expect(opts.headers['Authorization']).toBe('Bearer sk-test');
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: '```ts\ndescribe("x", () => {});\n```' } }] }),
      } as any;
    }) as any;

    const client = new OpenAIClient('sk-test');
    const out = await client.generate('test this', 'gpt-4o');
    expect(out).toBe('```ts\ndescribe("x", () => {});\n```');
  });
});

describe('AnthropicClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('posts to api.anthropic.com with correct headers', async () => {
    global.fetch = (async (_url: any, opts: any) => {
      const body = JSON.parse(opts.body);
      expect(body.model).toBe('claude-sonnet-4-20250514');
      expect(body.max_tokens).toBe(8096);
      expect(opts.headers['x-api-key']).toBe('sk-ant-test');
      expect(opts.headers['anthropic-version']).toBe('2023-06-01');
      return {
        ok: true,
        json: async () => ({ content: [{ type: 'text', text: '```ts\ndescribe("x", () => {});\n```' }] }),
      } as any;
    }) as any;

    const client = new AnthropicClient('sk-ant-test');
    const out = await client.generate('test this', 'claude-sonnet-4-20250514');
    expect(out).toBe('```ts\ndescribe("x", () => {});\n```');
  });
});

describe('DeepSeekClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('posts to api.deepseek.com and returns message content', async () => {
    global.fetch = (async (_url: any, opts: any) => {
      const body = JSON.parse(opts.body);
      expect(body.model).toBe('deepseek-chat');
      expect(opts.headers['Authorization']).toBe('Bearer sk-test');
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: '```ts\ndescribe("x", () => {});\n```' } }] }),
      } as any;
    }) as any;

    const client = new DeepSeekClient('sk-test');
    const out = await client.generate('test this', 'deepseek-chat');
    expect(out).toBe('```ts\ndescribe("x", () => {});\n```');
  });
});

describe('OllamaClient', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('posts to baseUrl/api/chat and returns message content', async () => {
    global.fetch = (async (_url: any, opts: any) => {
      const body = JSON.parse(opts.body);
      expect(body.model).toBe('llama3');
      expect(body.messages[0].role).toBe('user');
      expect(body.stream).toBe(false);
      return {
        ok: true,
        json: async () => ({ message: { content: '```ts\ndescribe("x", () => {});\n```' } }),
      } as any;
    }) as any;

    const client = new OllamaClient('http://localhost:11434/v1');
    const out = await client.generate('test this', 'llama3');
    expect(out).toBe('```ts\ndescribe("x", () => {});\n```');
  });

  it('strips trailing slashes from baseUrl', async () => {
    let calledUrl = '';
    global.fetch = (async (url: any) => {
      calledUrl = url;
      return {
        ok: true,
        json: async () => ({ message: { content: 'ok' } }),
      } as any;
    }) as any;

    const client = new OllamaClient('http://localhost:11434/v1/');
    await client.generate('p', 'm');
    expect(calledUrl).toBe('http://localhost:11434/v1/api/chat');
  });
});

describe('generateTests', () => {
  it('calls ai.generate with the prompt and model', async () => {
    const fake = new FakeClient();
    const result = await generateTests(fake, 'f.ts', 'export const x = 1;', false, 'gemini-2.5-flash');
    expect(result).toContain('describe');
    expect(fake.calls.length).toBe(1);
    expect(fake.calls[0]!.model).toBe('gemini-2.5-flash');
  });

  it('returns null when ai is null', async () => {
    const result = await generateTests(null, 'f.ts', 'x', false, 'm');
    expect(result).toBeNull();
  });

  it('returns null when the provider returns empty', async () => {
    const fake = new FakeClient('');
    const result = await generateTests(fake, 'f.ts', 'x', false, 'm');
    expect(result).toBeNull();
  });

  it('retries on transient errors then succeeds', async () => {
    const fake = new FakeClient();
    fake.failTimes = 2;
    const result = await generateTests(fake, 'f.ts', 'x', true, 'm');
    expect(result).toContain('describe');
    expect(fake.calls.length).toBe(3);
  }, 10000);

  it('warns when content is truncated', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fake = new FakeClient();
    const longContent = 'x'.repeat(20000);
    await generateTests(fake, 'long.ts', longContent, false, 'm', 15000);
    expect(warnSpy).toHaveBeenCalled();
    const warnMsg = warnSpy.mock.calls[0]![0] as string;
    expect(warnMsg).toContain('long.ts');
    expect(warnMsg).toContain('truncado');
    expect(warnMsg).toContain('20000');
    warnSpy.mockRestore();
  });

  it('does not warn when content is under maxChars', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fake = new FakeClient();
    await generateTests(fake, 'short.ts', 'const x = 1;', false, 'm', 15000);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('respects custom maxChars limit', async () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const fake = new FakeClient();
    const content = 'x'.repeat(100);
    await generateTests(fake, 'f.ts', content, false, 'm', 50);
    expect(warnSpy).toHaveBeenCalled();
    const warnMsg = warnSpy.mock.calls[0]![0] as string;
    expect(warnMsg).toContain('50');
    warnSpy.mockRestore();
  });
});

describe('extractTestContent', () => {
  it('extracts code from markdown code block', () => {
    const raw = 'Here is the test code:\n```typescript\ndescribe("test", () => {});\n```\nDone.';
    const result = extractTestContent(raw);
    expect(result).toBe('describe("test", () => {});');
  });

  it('extracts code from ts code block', () => {
    const raw = '```ts\nconst x = 1;\n```';
    const result = extractTestContent(raw);
    expect(result).toBe('const x = 1;');
  });

  it('returns raw text when no code block found', () => {
    const raw = 'Just some text without code blocks';
    const result = extractTestContent(raw);
    expect(result).toBe('Just some text without code blocks');
  });

  it('returns empty string for null/undefined', () => {
    expect(extractTestContent(null)).toBe('');
    expect(extractTestContent(undefined)).toBe('');
    expect(extractTestContent('')).toBe('');
  });

  it('handles multiple code blocks by taking the first', () => {
    const raw = '```ts\nfirst\n```\n\n```ts\nsecond\n```';
    const result = extractTestContent(raw);
    expect(result).toBe('first');
  });
});
