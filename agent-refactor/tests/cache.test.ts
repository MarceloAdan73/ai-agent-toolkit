import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  loadCache,
  saveCache,
  computeFileHash,
  isFileCached,
  updateCache,
} from '../src/cache.ts';

describe('cache', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('loadCache', () => {
    it('returns empty object if file does not exist', () => {
      const cache = loadCache(tmpDir);
      expect(cache).toEqual({});
    });

    it('loads existing cache file', () => {
      const data = { 'test.ts': { hash: 'abc123', refactorPath: 'test.refactor.ts', timestamp: 1000 } };
      fs.writeFileSync(path.join(tmpDir, '.refactor-cache.json'), JSON.stringify(data));
      const cache = loadCache(tmpDir);
      expect(cache['test.ts']).toBeDefined();
      expect(cache['test.ts']!.hash).toBe('abc123');
    });

    it('returns empty object if JSON is corrupt', () => {
      fs.writeFileSync(path.join(tmpDir, '.refactor-cache.json'), '{bad json');
      const cache = loadCache(tmpDir);
      expect(cache).toEqual({});
    });
  });

  describe('saveCache', () => {
    it('writes cache file correctly', () => {
      const cache = { 'test.ts': { hash: 'def456', refactorPath: 'test.refactor.ts', timestamp: 2000 } };
      saveCache(tmpDir, cache);
      const cachePath = path.join(tmpDir, '.refactor-cache.json');
      expect(fs.existsSync(cachePath)).toBe(true);
      const saved = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      expect(saved['test.ts'].hash).toBe('def456');
    });
  });

  describe('computeFileHash', () => {
    it('returns a valid MD5 hash', () => {
      const filePath = path.join(tmpDir, 'hash-test.ts');
      fs.writeFileSync(filePath, 'export const x = 1;');
      const hash = computeFileHash(filePath);
      expect(hash).toMatch(/^[a-f0-9]{32}$/);
    });
  });

  describe('isFileCached', () => {
    it('returns true if hash matches', () => {
      const cache = { 'test.ts': { hash: 'abc', refactorPath: 'test.refactor.ts', timestamp: 1000 } };
      expect(isFileCached('test.ts', cache, 'abc')).toBe(true);
    });

    it('returns false if hash does not match', () => {
      const cache = { 'test.ts': { hash: 'abc', refactorPath: 'test.refactor.ts', timestamp: 1000 } };
      expect(isFileCached('test.ts', cache, 'def')).toBe(false);
    });

    it('returns false if entry does not exist', () => {
      const cache = {};
      expect(isFileCached('nonexistent.ts', cache, 'abc')).toBe(false);
    });
  });

  describe('updateCache', () => {
    it('adds an entry to the cache', () => {
      const cache = {};
      const updated = updateCache('test.ts', 'test.refactor.ts', 'abc', cache);
      expect(updated['test.ts']).toBeDefined();
      expect(updated['test.ts']!.hash).toBe('abc');
      expect(updated['test.ts']!.refactorPath).toBe('test.refactor.ts');
      expect(updated['test.ts']!.timestamp).toBeGreaterThan(0);
    });

    it('overwrites an existing entry', () => {
      const cache = { 'test.ts': { hash: 'old', refactorPath: 'old.refactor.ts', timestamp: 100 } };
      updateCache('test.ts', 'new.refactor.ts', 'newhash', cache);
      expect(cache['test.ts']!.hash).toBe('newhash');
      expect(cache['test.ts']!.refactorPath).toBe('new.refactor.ts');
      expect(cache['test.ts']!.timestamp).toBeGreaterThan(100);
    });
  });
});
