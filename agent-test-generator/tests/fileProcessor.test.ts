import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  collectFiles,
  readFile,
  writeTestFile,
  writeSingleTestFile,
  shouldSkipContent,
} from '../src/fileProcessor.ts';

describe('fileProcessor', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'testproc-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe('collectFiles', () => {
    it('returns a single file when path is a valid file', () => {
      const filePath = path.join(tmpDir, 'test.ts');
      fs.writeFileSync(filePath, 'export const x = 1;');
      const result = collectFiles(filePath);
      expect(result).toEqual([filePath]);
    });

    it('returns empty array for unsupported extension', () => {
      const filePath = path.join(tmpDir, 'test.py');
      fs.writeFileSync(filePath, 'print("hello")');
      const result = collectFiles(filePath);
      expect(result).toEqual([]);
    });

    it('skips existing test files', () => {
      const filePath = path.join(tmpDir, 'utils.ts');
      const testFilePath = path.join(tmpDir, 'utils.test.ts');
      fs.writeFileSync(filePath, 'export const x = 1;');
      fs.writeFileSync(testFilePath, 'import { x } from "./utils";');
      const result = collectFiles(tmpDir);
      expect(result.length).toBe(1);
      expect(result[0]).toBe(filePath);
    });

    it('collects files recursively from directory', () => {
      fs.mkdirSync(path.join(tmpDir, 'src'));
      fs.writeFileSync(path.join(tmpDir, 'src', 'a.ts'), 'export const a = 1;');
      fs.writeFileSync(path.join(tmpDir, 'src', 'b.js'), 'export const b = 2;');
      fs.writeFileSync(path.join(tmpDir, 'src', 'c.txt'), 'not supported');
      const result = collectFiles(tmpDir);
      expect(result.length).toBe(2);
      expect(result.every((f) => f.endsWith('.ts') || f.endsWith('.js'))).toBe(true);
    });

    it('skips node_modules directory', () => {
      fs.mkdirSync(path.join(tmpDir, 'node_modules'));
      fs.writeFileSync(path.join(tmpDir, 'node_modules', 'dep.ts'), 'export const dep = 1;');
      fs.writeFileSync(path.join(tmpDir, 'index.ts'), 'export const idx = 1;');
      const result = collectFiles(tmpDir);
      expect(result.length).toBe(1);
      expect(result[0]!.endsWith('index.ts')).toBe(true);
    });

    it('filters files by custom extensions', () => {
      fs.writeFileSync(path.join(tmpDir, 'a.ts'), 'export const a = 1;');
      fs.writeFileSync(path.join(tmpDir, 'b.js'), 'const b = 1;');
      const result = collectFiles(tmpDir, false, ['.ts']);
      expect(result.length).toBe(1);
      expect(result[0]!.endsWith('.ts')).toBe(true);
    });

    it('handles extensions without leading dot', () => {
      fs.writeFileSync(path.join(tmpDir, 'a.ts'), 'export const a = 1;');
      fs.writeFileSync(path.join(tmpDir, 'b.jsx'), 'const b = 1;');
      const result = collectFiles(tmpDir, false, ['ts']);
      expect(result.length).toBe(1);
      expect(result[0]!.endsWith('.ts')).toBe(true);
    });
  });

  describe('readFile', () => {
    it('returns file content with paths', () => {
      const filePath = path.join(tmpDir, 'read.ts');
      fs.writeFileSync(filePath, 'const hello = "world";');
      const result = readFile(filePath);
      expect(result).not.toBeNull();
      expect(result!.content).toBe('const hello = "world";');
      expect(result!.filePath).toBe(filePath);
    });

    it('returns null for non-existent file', () => {
      const result = readFile(path.join(tmpDir, 'nope.ts'));
      expect(result).toBeNull();
    });
  });

  describe('writeTestFile', () => {
    it('creates a .test.ts file alongside the original', () => {
      const filePath = path.join(tmpDir, 'utils.ts');
      fs.writeFileSync(filePath, 'export const x = 1;');
      const testPath = writeTestFile(filePath, 'describe("utils", () => {});');
      expect(testPath).toBe(path.join(tmpDir, 'utils.test.ts'));
      expect(fs.existsSync(testPath!)).toBe(true);
      expect(fs.readFileSync(testPath!, 'utf-8')).toBe('describe("utils", () => {});');
    });

    it('creates file in custom output directory', () => {
      const filePath = path.join(tmpDir, 'src', 'utils.ts');
      const outputDir = path.join(tmpDir, 'tests');
      fs.mkdirSync(path.dirname(filePath), { recursive: true });
      fs.writeFileSync(filePath, 'export const x = 1;');
      const testPath = writeTestFile(filePath, 'describe("utils", () => {});', outputDir);
      expect(testPath).toBe(path.join(outputDir, 'utils.test.ts'));
      expect(fs.existsSync(testPath!)).toBe(true);
    });
  });

  describe('writeSingleTestFile', () => {
    it('creates a TESTS.md with all tests', () => {
      const entries = [
        { relativePath: 'src/a.ts', content: 'describe("a", () => {});' },
        { relativePath: 'src/b.ts', content: 'describe("b", () => {});' },
      ];
      const testPath = writeSingleTestFile(tmpDir, entries);
      expect(testPath).toBe(path.join(tmpDir, 'TESTS.md'));
      const content = fs.readFileSync(testPath!, 'utf-8');
      expect(content).toContain('# Tests Generados');
      expect(content).toContain('src/a.ts');
      expect(content).toContain('describe("a", () => {})');
      expect(content).toContain('src/b.ts');
      expect(content).toContain('describe("b", () => {})');
    });
  });

  describe('shouldSkipContent', () => {
    it('returns true for empty content', () => {
      expect(shouldSkipContent('')).toBe(true);
      expect(shouldSkipContent('   ')).toBe(true);
    });

    it('returns true for @ts-nocheck only', () => {
      expect(shouldSkipContent('// @ts-nocheck')).toBe(true);
    });

    it('returns false for real code', () => {
      expect(shouldSkipContent('export const x = 1;')).toBe(false);
    });
  });
});
