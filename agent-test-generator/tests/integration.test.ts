import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { collectFiles, readFile, writeTestFile, shouldSkipContent } from '../src/fileProcessor.ts';
import { getFileTypePrompt } from '../src/prompts.ts';
import { extractTestContent } from '../src/testGenerator.ts';
import { loadCache, saveCache, computeFileHash, isFileCached, updateCache } from '../src/cache.ts';

describe('Integration: full pipeline with mock', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('processes a utility function end-to-end', () => {
    const utilContent = `export function formatPriority(level: number): string {
  if (level === 0) return 'None';
  if (level <= 2) return 'Low';
  if (level <= 4) return 'Medium';
  return 'High';
}`;

    const filePath = path.join(tmpDir, 'utils.ts');
    fs.writeFileSync(filePath, utilContent);

    const files = collectFiles(tmpDir);
    expect(files.length).toBe(1);

    const fileData = readFile(files[0]!);
    expect(fileData!.content).toContain('formatPriority');

    const prompt = getFileTypePrompt(files[0]!, fileData!.content);
    expect(prompt).toContain('Utility');

    const mockResponse = '```typescript\nimport { describe, it, expect } from "vitest";\nimport { formatPriority } from "./utils";\n\ndescribe("formatPriority", () => {\n  it("returns None for level 0", () => {\n    expect(formatPriority(0)).toBe("None");\n  });\n});\n```';
    const testContent = extractTestContent(mockResponse);
    expect(testContent.length).toBeGreaterThan(0);
    expect(testContent).toContain('describe');
    expect(testContent).toContain('formatPriority');

    const testPath = writeTestFile(files[0]!, testContent);
    expect(fs.existsSync(testPath!)).toBe(true);
    expect(testPath!.endsWith('utils.test.ts')).toBe(true);
  });

  it('processes a React component end-to-end', () => {
    const componentContent = `import React from 'react';

interface ButtonProps {
  label: string;
  onClick: () => void;
}

export const Button: React.FC<ButtonProps> = ({ label, onClick }) => {
  return <button onClick={onClick}>{label}</button>;
};`;

    const compDir = path.join(tmpDir, 'components');
    fs.mkdirSync(compDir);
    const filePath = path.join(compDir, 'Button.tsx');
    fs.writeFileSync(filePath, componentContent);

    const files = collectFiles(tmpDir);
    expect(files.length).toBe(1);

    const fileData = readFile(files[0]!);
    const prompt = getFileTypePrompt(files[0]!, fileData!.content);
    expect(prompt).toContain('React Component');

    const mockResponse = '```tsx\nimport { describe, it, expect } from "vitest";\nimport { Button } from "./Button";\n\ndescribe("Button", () => {\n  it("renders with label", () => {\n    expect(Button).toBeDefined();\n  });\n});\n```';
    const testContent = extractTestContent(mockResponse);
    expect(testContent).toContain('Button');

    const testPath = writeTestFile(files[0]!, testContent);
    expect(fs.existsSync(testPath!)).toBe(true);
  });

  it('processes a Zod validator end-to-end', () => {
    const validatorContent = `import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.number().int().min(0).max(5).default(0),
});`;

    const filePath = path.join(tmpDir, 'task.validator.ts');
    fs.writeFileSync(filePath, validatorContent);

    const files = collectFiles(tmpDir);
    const fileData = readFile(files[0]!);
    const prompt = getFileTypePrompt(files[0]!, fileData!.content);
    expect(prompt).toContain('Zod');
  });

  it('processes an Express route end-to-end', () => {
    const routeContent = `import { Router, Request, Response } from 'express';

const router = Router();

router.get('/api/tasks', (req: Request, res: Response) => {
  res.json({ tasks: [] });
});`;

    const filePath = path.join(tmpDir, 'routes.ts');
    fs.writeFileSync(filePath, routeContent);

    const files = collectFiles(tmpDir);
    const fileData = readFile(files[0]!);
    const prompt = getFileTypePrompt(files[0]!, fileData!.content);
    expect(prompt).toContain('Express');
  });

  it('simulates full directory scan', () => {
    const structure: Record<string, string> = {
      'src/utils.ts': 'export function formatPriority(p: number): string { return "blue"; }',
      'src/components/Button.tsx': 'export const Button: React.FC = () => <div />',
      'src/validators/task.validator.ts': "import { z } from 'zod'; export const schema = z.object({ title: z.string() })",
      'src/routes/task.routes.ts': "import { Request, Response } from 'express'; export const getTasks = (req: Request, res: Response) => {}",
    };

    for (const [relPath, content] of Object.entries(structure)) {
      const fullPath = path.join(tmpDir, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }

    const files = collectFiles(tmpDir);
    expect(files.length).toBe(4);

    const detected = files.map((f) => {
      const data = readFile(f);
      const prompt = getFileTypePrompt(f, data!.content);
      const typeMatch = prompt.match(/## File Type: (.+)/);
      return { file: path.relative(tmpDir, f), type: typeMatch?.[1] || 'Unknown' };
    });

    expect(detected.find((d) => d.file.includes('utils'))?.type).toBe('Utility / Service Module');
    expect(detected.find((d) => d.file.includes('Button'))?.type).toBe('React Component');
    expect(detected.find((d) => d.file.includes('task.validator'))?.type).toBe('Zod Validation Schema');
    expect(detected.find((d) => d.file.includes('task.routes'))?.type).toBe('Express Route / Controller');
  });
});

describe('Cache integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cache-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('computes file hash correctly', () => {
    const filePath = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(filePath, 'export const x = 1;');
    const hash = computeFileHash(filePath);
    expect(hash).toMatch(/^[a-f0-9]{32}$/);
  });

  it('detects cached vs non-cached files', () => {
    const filePath = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(filePath, 'export const x = 1;');
    const hash = computeFileHash(filePath);

    const cache = {};
    expect(isFileCached(filePath, cache, hash)).toBe(false);

    const updatedCache = updateCache(filePath, 'test.test.ts', hash, {});
    expect(isFileCached(filePath, updatedCache, hash)).toBe(true);
  });

  it('detects file changes invalidating cache', () => {
    const filePath = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(filePath, 'export const x = 1;');
    const hash1 = computeFileHash(filePath);

    const cache = updateCache(filePath, 'test.test.ts', hash1, {});
    expect(isFileCached(filePath, cache, hash1)).toBe(true);

    fs.writeFileSync(filePath, 'export const x = 2;');
    const hash2 = computeFileHash(filePath);
    expect(isFileCached(filePath, cache, hash2)).toBe(false);
  });
});
