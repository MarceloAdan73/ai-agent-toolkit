import { GoogleGenAI } from '@google/genai';

export interface AIClient {
  generate(prompt: string, model: string): Promise<string | null>;
}

export interface CreateAIClientOptions {
  provider?: string;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  verbose?: boolean;
}

const PLACEHOLDER_KEY = 'your_gemini_api_key_here';
const DEFAULT_LOCAL_BASE_URL = 'http://localhost:11434';

export class GeminiClient implements AIClient {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async generate(prompt: string, model: string): Promise<string | null> {
    const result = await this.ai.models.generateContent({ model, contents: prompt });
    return result.text ?? null;
  }
}

export class OpenAIClient implements AIClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string, model: string): Promise<string | null> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`OpenAI API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data?.choices?.[0]?.message?.content ?? null;
  }
}

export class AnthropicClient implements AIClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string, model: string): Promise<string | null> {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 8096,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Anthropic API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    return data?.content?.[0]?.text ?? null;
  }
}

export class DeepSeekClient implements AIClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async generate(prompt: string, model: string): Promise<string | null> {
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`DeepSeek API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data?.choices?.[0]?.message?.content ?? null;
  }
}

export class OllamaClient implements AIClient {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string, apiKey?: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
    this.apiKey = apiKey;
  }

  async generate(prompt: string, model: string): Promise<string | null> {
    const url = `${this.baseUrl}/api/chat`;
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.apiKey) headers['Authorization'] = `Bearer ${this.apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        stream: false,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Ollama API error ${res.status}: ${body}`);
    }

    const data = (await res.json()) as {
      message?: { content?: string };
    };
    return data?.message?.content ?? null;
  }
}

export function createAIClient(options: CreateAIClientOptions = {}): AIClient | null {
  const provider = options.provider ?? 'gemini';

  switch (provider) {
    case 'gemini': {
      const apiKey = options.apiKey;
      if (!apiKey || apiKey === PLACEHOLDER_KEY) {
        console.error('[ERROR] GEMINI_API_KEY is not set or is invalid.');
        console.error('  Create a .env file with: GEMINI_API_KEY=your_key');
        console.error('  Get key at: https://aistudio.google.com/apikey');
        console.error('  Or use: --provider openai | anthropic | deepseek | ollama');
        return null;
      }
      try {
        return new GeminiClient(apiKey);
      } catch (err) {
        const error = err as Error;
        console.error(`[ERROR] Failed to initialize Gemini client: ${error.message}`);
        return null;
      }
    }

    case 'openai': {
      const apiKey = options.apiKey;
      if (!apiKey) {
        console.error('[ERROR] OPENAI_API_KEY is not set.');
        console.error('  Create a .env file with: OPENAI_API_KEY=sk-...');
        return null;
      }
      return new OpenAIClient(apiKey);
    }

    case 'anthropic': {
      const apiKey = options.apiKey;
      if (!apiKey) {
        console.error('[ERROR] ANTHROPIC_API_KEY is not set.');
        console.error('  Create a .env file with: ANTHROPIC_API_KEY=sk-ant-...');
        return null;
      }
      return new AnthropicClient(apiKey);
    }

    case 'deepseek': {
      const apiKey = options.apiKey;
      if (!apiKey) {
        console.error('[ERROR] DEEPSEEK_API_KEY is not set.');
        console.error('  Create a .env file with: DEEPSEEK_API_KEY=sk-...');
        return null;
      }
      return new DeepSeekClient(apiKey);
    }

    case 'ollama': {
      const baseUrl = options.baseUrl ?? DEFAULT_LOCAL_BASE_URL;
      return new OllamaClient(baseUrl, options.apiKey);
    }

    default:
      console.error(`[ERROR] Unknown provider: "${provider}"`);
      console.error('  Valid providers: gemini, openai, anthropic, deepseek, ollama');
      return null;
  }
}
