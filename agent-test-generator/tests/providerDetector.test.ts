import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  detectProvider,
  detectOllama,
  loadConfig,
  saveConfig,
  getDefaultModel,
  getAvailableProviders,
  printDetectionResult,
} from '../src/providerDetector.ts';

describe('providerDetector', () => {
  describe('detectProvider', () => {
    it('returns openai when OPENAI_API_KEY exists', async () => {
      const result = await detectProvider({ env: { OPENAI_API_KEY: 'sk-real-key' } });
      expect(result).not.toBeNull();
      expect(result!.provider).toBe('openai');
      expect(result!.model).toBe('gpt-4o');
      expect(result!.autoDetected).toBe(true);
    });

    it('returns anthropic when ANTHROPIC_API_KEY exists', async () => {
      const result = await detectProvider({ env: { ANTHROPIC_API_KEY: 'sk-ant-real-key' } });
      expect(result).not.toBeNull();
      expect(result!.provider).toBe('anthropic');
      expect(result!.model).toBe('claude-sonnet-4-20250514');
    });

    it('returns deepseek when DEEPSEEK_API_KEY exists', async () => {
      const result = await detectProvider({ env: { DEEPSEEK_API_KEY: 'sk-real-key' } });
      expect(result).not.toBeNull();
      expect(result!.provider).toBe('deepseek');
      expect(result!.model).toBe('deepseek-chat');
    });

    it('returns gemini when GEMINI_API_KEY exists', async () => {
      const result = await detectProvider({ env: { GEMINI_API_KEY: 'real-key' } });
      expect(result).not.toBeNull();
      expect(result!.provider).toBe('gemini');
      expect(result!.model).toBe('gemini-2.5-flash');
    });

    it('returns ollama when no keys but Ollama responds', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [{ name: 'qwen2.5-coder:1.5b' }, { name: 'llama3' }] }),
      } as any);
      try {
        const result = await detectProvider({ env: {} });
        expect(result).not.toBeNull();
        expect(result!.provider).toBe('ollama');
        expect(result!.model).toBe('qwen2.5-coder:1.5b');
        expect(result!.baseUrl).toBe('http://localhost:11434');
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('returns null when nothing is available', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
      try {
        const result = await detectProvider({ env: {} });
        expect(result).toBeNull();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('respects priority openai > anthropic > deepseek > gemini > ollama', async () => {
      const result = await detectProvider({
        env: {
          OPENAI_API_KEY: 'sk-openai',
          ANTHROPIC_API_KEY: 'sk-ant',
          DEEPSEEK_API_KEY: 'sk-deep',
          GEMINI_API_KEY: 'gemini-key',
        },
      });
      expect(result).not.toBeNull();
      expect(result!.provider).toBe('openai');
    });

    it('ignores placeholder keys (your_xxx_api_key_here)', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('No ollama'));
      try {
        const result = await detectProvider({
          env: {
            OPENAI_API_KEY: 'your_openai_api_key_here',
            ANTHROPIC_API_KEY: 'your_anthropic_api_key_here',
            DEEPSEEK_API_KEY: 'your_deepseek_api_key_here',
            GEMINI_API_KEY: 'your_gemini_api_key_here',
          },
        });
        expect(result).toBeNull();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('detectOllama', () => {
    it('returns the list of models when /api/tags responds OK', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [{ name: 'qwen2.5-coder:1.5b' }, { name: 'llama3' }] }),
      } as any);
      try {
        const result = await detectOllama('http://localhost:11434');
        expect(result).toEqual(['qwen2.5-coder:1.5b', 'llama3']);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('returns empty array when Ollama responds but has no models', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ models: [] }),
      } as any);
      try {
        const result = await detectOllama('http://localhost:11434');
        expect(result).toEqual([]);
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it('returns null when fetch fails', async () => {
      const originalFetch = globalThis.fetch;
      globalThis.fetch = vi.fn().mockRejectedValue(new Error('Connection refused'));
      try {
        const result = await detectOllama('http://localhost:11434');
        expect(result).toBeNull();
      } finally {
        globalThis.fetch = originalFetch;
      }
    });
  });

  describe('loadConfig', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'loadcfg-test-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('reads .aicode.json correctly', () => {
      const config = { provider: 'gemini', model: 'gemini-2.5-flash', autoDetected: false, detectedAt: new Date().toISOString() };
      fs.writeFileSync(path.join(tmpDir, '.aicode.json'), JSON.stringify(config));
      const result = loadConfig(tmpDir);
      expect(result).not.toBeNull();
      expect(result!.provider).toBe('gemini');
      expect(result!.model).toBe('gemini-2.5-flash');
    });

    it('returns null if file does not exist', () => {
      const result = loadConfig(tmpDir);
      expect(result).toBeNull();
    });

    it('returns null if JSON is corrupt', () => {
      fs.writeFileSync(path.join(tmpDir, '.aicode.json'), '{bad: json,');
      const result = loadConfig(tmpDir);
      expect(result).toBeNull();
    });
  });

  describe('saveConfig', () => {
    let tmpDir: string;

    beforeEach(() => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'savecfg-test-'));
    });

    afterEach(() => {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it('writes .aicode.json correctly', () => {
      const config = { provider: 'openai', model: 'gpt-4o', autoDetected: true, detectedAt: new Date().toISOString() };
      saveConfig(tmpDir, config);
      const configPath = path.join(tmpDir, '.aicode.json');
      expect(fs.existsSync(configPath)).toBe(true);
      const saved = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
      expect(saved.provider).toBe('openai');
      expect(saved.model).toBe('gpt-4o');
      expect(saved.autoDetected).toBe(true);
    });
  });

  describe('getDefaultModel', () => {
    it('returns correct model for openai', () => {
      expect(getDefaultModel('openai')).toBe('gpt-4o');
    });

    it('returns correct model for anthropic', () => {
      expect(getDefaultModel('anthropic')).toBe('claude-sonnet-4-20250514');
    });

    it('returns correct model for deepseek', () => {
      expect(getDefaultModel('deepseek')).toBe('deepseek-chat');
    });

    it('returns correct model for gemini', () => {
      expect(getDefaultModel('gemini')).toBe('gemini-2.5-flash');
    });

    it('returns correct model for ollama', () => {
      expect(getDefaultModel('ollama')).toBe('llama3');
    });

    it('returns fallback for unknown provider', () => {
      expect(getDefaultModel('unknown')).toBe('gemini-2.5-flash');
    });
  });

  describe('getAvailableProviders', () => {
    it('returns providers that have valid keys', () => {
      const providers = getAvailableProviders({
        GEMINI_API_KEY: 'key',
        OPENAI_API_KEY: 'sk-key',
      });
      expect(providers).toContain('gemini');
      expect(providers).toContain('openai');
    });

    it('always includes ollama', () => {
      const providers = getAvailableProviders({});
      expect(providers).toContain('ollama');
    });

    it('excludes placeholder keys', () => {
      const providers = getAvailableProviders({
        GEMINI_API_KEY: 'your_gemini_api_key_here',
        OPENAI_API_KEY: 'your_openai_api_key_here',
      });
      expect(providers).not.toContain('gemini');
      expect(providers).not.toContain('openai');
    });
  });

  describe('printDetectionResult', () => {
    it('logs provider info when config is provided', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      printDetectionResult({ provider: 'gemini', model: 'gemini-2.5-flash', autoDetected: true, detectedAt: '2026-01-01' });
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('gemini'));
      spy.mockRestore();
    });

    it('logs setup instructions when config is null', () => {
      const spy = vi.spyOn(console, 'log').mockImplementation(() => {});
      printDetectionResult(null);
      expect(spy).toHaveBeenCalledWith(expect.stringContaining('No provider'));
      spy.mockRestore();
    });
  });
});
