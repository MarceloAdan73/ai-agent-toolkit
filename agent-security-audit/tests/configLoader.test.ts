import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loadConfigFile, mergeConfig } from '../src/configLoader.ts';

describe('configLoader', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'configloader-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('loadConfigFile', () => {
    it('returns parsed config when .aiconfig.json exists and is valid', () => {
      const config = { provider: 'gemini', model: 'gemini-2.5-flash', maxChars: 10000, verbose: true };
      fs.writeFileSync(path.join(tmpDir, '.aiconfig.json'), JSON.stringify(config));
      const result = loadConfigFile(tmpDir);
      expect(result).toEqual(config);
    });

    it('returns null when .aiconfig.json does not exist', () => {
      const result = loadConfigFile(tmpDir);
      expect(result).toBeNull();
    });

    it('returns null when .aiconfig.json contains invalid JSON', () => {
      fs.writeFileSync(path.join(tmpDir, '.aiconfig.json'), '{bad: json,');
      const result = loadConfigFile(tmpDir);
      expect(result).toBeNull();
    });

    it('returns null when .aiconfig.json is empty', () => {
      fs.writeFileSync(path.join(tmpDir, '.aiconfig.json'), '');
      const result = loadConfigFile(tmpDir);
      expect(result).toBeNull();
    });

    it('returns partial config when only some fields are present', () => {
      const config = { provider: 'openai' };
      fs.writeFileSync(path.join(tmpDir, '.aiconfig.json'), JSON.stringify(config));
      const result = loadConfigFile(tmpDir);
      expect(result).toEqual({ provider: 'openai' });
    });
  });

  describe('mergeConfig', () => {
    it('returns cliValue when it is defined', () => {
      expect(mergeConfig(100, 50, 10)).toBe(100);
    });

    it('returns configValue when cliValue is undefined', () => {
      expect(mergeConfig(undefined, 50, 10)).toBe(50);
    });

    it('returns defaultValue when both cliValue and configValue are undefined', () => {
      expect(mergeConfig(undefined, undefined, 10)).toBe(10);
    });

    it('returns cliValue false over configValue true', () => {
      expect(mergeConfig(false, true, true)).toBe(false);
    });

    it('returns cliValue empty string over configValue', () => {
      expect(mergeConfig('', 'config', 'default')).toBe('');
    });

    it('returns cliValue 0 over configValue', () => {
      expect(mergeConfig(0, 100, 50)).toBe(0);
    });
  });
});
