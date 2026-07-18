import fs from 'fs';
import path from 'path';

export interface ProviderConfig {
  provider: string;
  model: string;
  baseUrl?: string;
  autoDetected: boolean;
  detectedAt: string;
}

export interface DetectOptions {
  env?: Record<string, string | undefined>;
  ollamaBaseUrl?: string;
  projectRoot?: string;
}

const CONFIG_FILE = '.aicode.json';

const DEFAULT_MODELS: Record<string, string> = {
  openai: 'gpt-4o',
  anthropic: 'claude-sonnet-4-20250514',
  deepseek: 'deepseek-chat',
  gemini: 'gemini-2.5-flash',
  ollama: 'llama3',
};

const OLLAMA_DEFAULT_URL = 'http://localhost:11434';

export async function detectProvider(options: DetectOptions = {}): Promise<ProviderConfig | null> {
  const env = options.env ?? process.env;
  const ollamaBaseUrl = options.ollamaBaseUrl ?? OLLAMA_DEFAULT_URL;

  if (env.OPENAI_API_KEY && env.OPENAI_API_KEY !== 'your_openai_api_key_here') {
    return {
      provider: 'openai',
      model: DEFAULT_MODELS.openai,
      autoDetected: true,
      detectedAt: new Date().toISOString(),
    };
  }

  if (env.ANTHROPIC_API_KEY && env.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') {
    return {
      provider: 'anthropic',
      model: DEFAULT_MODELS.anthropic,
      autoDetected: true,
      detectedAt: new Date().toISOString(),
    };
  }

  if (env.DEEPSEEK_API_KEY && env.DEEPSEEK_API_KEY !== 'your_deepseek_api_key_here') {
    return {
      provider: 'deepseek',
      model: DEFAULT_MODELS.deepseek,
      autoDetected: true,
      detectedAt: new Date().toISOString(),
    };
  }

  if (env.GEMINI_API_KEY && env.GEMINI_API_KEY !== 'your_gemini_api_key_here') {
    return {
      provider: 'gemini',
      model: DEFAULT_MODELS.gemini,
      autoDetected: true,
      detectedAt: new Date().toISOString(),
    };
  }

  const ollamaModels = await detectOllama(ollamaBaseUrl);
  if (ollamaModels && ollamaModels.length > 0) {
    const model = ollamaModels[0];
    return {
      provider: 'ollama',
      model,
      baseUrl: ollamaBaseUrl,
      autoDetected: true,
      detectedAt: new Date().toISOString(),
    };
  }

  if (ollamaModels === null) {
    return null;
  }

  return null;
}

export async function detectOllama(baseUrl: string = OLLAMA_DEFAULT_URL): Promise<string[] | null> {
  try {
    const res = await fetch(`${baseUrl}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as { models?: { name: string }[] };
    return (data.models ?? []).map((m) => m.name);
  } catch {
    return null;
  }
}

export function loadConfig(projectRoot: string): ProviderConfig | null {
  const configPath = path.join(projectRoot, CONFIG_FILE);
  try {
    if (!fs.existsSync(configPath)) return null;
    const raw = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(raw) as ProviderConfig;
    if (config.provider && config.model) return config;
    return null;
  } catch {
    return null;
  }
}

export function saveConfig(projectRoot: string, config: ProviderConfig): void {
  const configPath = path.join(projectRoot, CONFIG_FILE);
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
}

export function getDefaultModel(provider: string): string {
  return DEFAULT_MODELS[provider] ?? 'gemini-2.5-flash';
}

export function getAvailableProviders(env?: Record<string, string | undefined>): string[] {
  const e = env ?? process.env;
  const providers: string[] = [];

  if (e.GEMINI_API_KEY && e.GEMINI_API_KEY !== 'your_gemini_api_key_here') providers.push('gemini');
  if (e.OPENAI_API_KEY && e.OPENAI_API_KEY !== 'your_openai_api_key_here') providers.push('openai');
  if (e.ANTHROPIC_API_KEY && e.ANTHROPIC_API_KEY !== 'your_anthropic_api_key_here') providers.push('anthropic');
  if (e.DEEPSEEK_API_KEY && e.DEEPSEEK_API_KEY !== 'your_deepseek_api_key_here') providers.push('deepseek');

  providers.push('ollama');

  return providers;
}

export function printDetectionResult(config: ProviderConfig | null, verbose: boolean = false): void {
  if (config) {
    console.log(`[AUTO-DETECT] Provider: ${config.provider} | Model: ${config.model}`);
    if (verbose) {
      console.log(`[AUTO-DETECT] Auto-detected at: ${config.detectedAt}`);
    }
  } else {
    console.log('[AUTO-DETECT] No provider found.');
    console.log('');
    console.log('  Set up one of these options:');
    console.log('');
    console.log('  1. Gemini (free tier):');
    console.log('     echo "GEMINI_API_KEY=your_key" > .env');
    console.log('     Get key: https://aistudio.google.com/apikey');
    console.log('');
    console.log('  2. OpenAI:');
    console.log('     echo "OPENAI_API_KEY=sk-..." > .env');
    console.log('');
    console.log('  3. Anthropic:');
    console.log('     echo "ANTHROPIC_API_KEY=sk-ant-..." > .env');
    console.log('');
    console.log('  4. DeepSeek (cheapest):');
    console.log('     echo "DEEPSEEK_API_KEY=sk-..." > .env');
    console.log('');
    console.log('  5. Ollama (local, free):');
    console.log('     Install: https://ollama.com');
    console.log('     ollama pull llama3');
    console.log('');
    console.log('  Or specify directly: --provider openai --model gpt-4o');
  }
}
