import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { collectFiles, readFile, writeDocFile, shouldSkipContent, createBackup, applyRefactor } from '../src/fileProcessor.ts';
import { getFileTypePrompt } from '../src/prompts.ts';
import { parseRefactorResults } from '../src/refactorGenerator.ts';
import { loadCache, saveCache, computeFileHash, isFileCached, updateCache } from '../src/cache.ts';

describe('Integration: full pipeline with mock', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'integration-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('processes a Prisma schema end-to-end', () => {
    const schemaContent = `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Task {
  id          String   @id @default(uuid())
  title       String
  description String?
  status      String   @default("pending")
  priority    Int      @default(0)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  user        User     @relation(fields: [userId], references: [id])
  userId      String
}

model User {
  id    String @id @default(uuid())
  email String @unique
  tasks Task[]
}`;

    const filePath = path.join(tmpDir, 'schema.prisma');
    fs.writeFileSync(filePath, schemaContent);

    const files = collectFiles(tmpDir);
    expect(files.length).toBe(1);

    const fileData = readFile(files[0]!);
    expect(fileData!.content).toContain('model Task');

    const prompt = getFileTypePrompt(files[0]!, fileData!.content);
    expect(prompt).toContain('Prisma Schema');

    const mockResponse = '[{"category":"Extract Function","description":"Extract user validation into separate function","before":"model User {\\n  id String @id\\n}","after":"// Separate validation\\nmodel User {\\n  id String @id\\n}","line":1}]';
    const suggestions = parseRefactorResults(mockResponse);
    expect(suggestions.length).toBe(1);
    expect(suggestions[0]!.category).toBe('Extract Function');

    const docPath = writeDocFile(files[0]!, JSON.stringify(suggestions, null, 2));
    expect(fs.existsSync(docPath!)).toBe(true);
  });

  it('processes a React component end-to-end', () => {
    const componentContent = `import React from 'react';

interface TaskCardProps {
  title: string;
  status: 'pending' | 'done';
  onToggle: () => void;
}

export const TaskCard: React.FC<TaskCardProps> = ({ title, status, onToggle }) => {
  return (
    <div className="card">
      <h3>{title}</h3>
      <button onClick={onToggle}>{status === 'pending' ? 'Complete' : 'Undo'}</button>
    </div>
  );
};`;

    const compDir = path.join(tmpDir, 'components');
    fs.mkdirSync(compDir);
    const filePath = path.join(compDir, 'TaskCard.tsx');
    fs.writeFileSync(filePath, componentContent);

    const files = collectFiles(tmpDir);
    expect(files.length).toBe(1);

    const fileData = readFile(files[0]!);
    const prompt = getFileTypePrompt(files[0]!, fileData!.content);
    expect(prompt).toContain('React Component');
  });

  it('processes a Zod validator end-to-end', () => {
    const validatorContent = `import { z } from 'zod';

export const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  priority: z.number().int().min(0).max(5).default(0),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;`;

    const filePath = path.join(tmpDir, 'task.validator.ts');
    fs.writeFileSync(filePath, validatorContent);

    const files = collectFiles(tmpDir);
    const fileData = readFile(files[0]!);
    const prompt = getFileTypePrompt(files[0]!, fileData!.content);
    expect(prompt).toContain('Zod');
  });

  it('processes a utility file end-to-end', () => {
    const utilContent = `export function formatPriority(level: number): string {
  if (level === 0) return 'None';
  if (level <= 2) return 'Low';
  if (level <= 4) return 'Medium';
  return 'High';
}

export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}`;

    const filePath = path.join(tmpDir, 'utils.ts');
    fs.writeFileSync(filePath, utilContent);

    const files = collectFiles(tmpDir);
    const fileData = readFile(files[0]!);
    const prompt = getFileTypePrompt(files[0]!, fileData!.content);
    expect(prompt).toContain('Utility');
  });

  it('simulates full directory scan', () => {
    const structure: Record<string, string> = {
      'prisma/schema.prisma': 'model Task { id String @id }',
      'src/controllers/task.controller.ts': "import { Request, Response } from 'express'; export const getTasks = (req: Request, res: Response) => {}",
      'src/validators/task.validator.ts': "import { z } from 'zod'; export const schema = z.object({ title: z.string() })",
      'src/routes/task.routes.ts': "import { Router } from 'express'; const router = Router();",
      'src/utils/priorityUtils.ts': 'export function getPriorityColor(p: number): string { return "blue"; }',
    };

    for (const [relPath, content] of Object.entries(structure)) {
      const fullPath = path.join(tmpDir, relPath);
      fs.mkdirSync(path.dirname(fullPath), { recursive: true });
      fs.writeFileSync(fullPath, content);
    }

    const files = collectFiles(tmpDir);
    expect(files.length).toBe(5);

    const detected = files.map((f) => {
      const data = readFile(f);
      const prompt = getFileTypePrompt(f, data!.content);
      const typeMatch = prompt.match(/## File Type: (.+)/);
      return { file: path.relative(tmpDir, f), type: typeMatch?.[1] || 'Unknown' };
    });

    expect(detected.find((d) => d.file.includes('schema.prisma'))?.type).toBe('Prisma Schema');
    expect(detected.find((d) => d.file.includes('task.controller'))?.type).toBe('Express Route / Controller');
    expect(detected.find((d) => d.file.includes('task.validator'))?.type).toBe('Zod Validation Schema');
    expect(detected.find((d) => d.file.includes('priorityUtils'))?.type).toBe('Utility / Service Module');
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

    const updatedCache = updateCache(filePath, 'test.refactor.md', hash, {});
    expect(isFileCached(filePath, updatedCache, hash)).toBe(true);
  });

  it('detects file changes invalidating cache', () => {
    const filePath = path.join(tmpDir, 'test.ts');
    fs.writeFileSync(filePath, 'export const x = 1;');
    const hash1 = computeFileHash(filePath);

    const cache = updateCache(filePath, 'test.refactor.md', hash1, {});
    expect(isFileCached(filePath, cache, hash1)).toBe(true);

    fs.writeFileSync(filePath, 'export const x = 2;');
    const hash2 = computeFileHash(filePath);
    expect(isFileCached(filePath, cache, hash2)).toBe(false);
  });
});

describe('Backup and apply integration', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'apply-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('creates backup and applies refactor', () => {
    const filePath = path.join(tmpDir, 'source.ts');
    fs.writeFileSync(filePath, 'export function big() {\n  console.log("step1");\n  console.log("step2");\n  console.log("step3");\n}');

    const backupPath = createBackup(filePath);
    expect(backupPath).toBe(`${filePath}.bak`);
    expect(fs.readFileSync(backupPath!, 'utf-8')).toBe(fs.readFileSync(filePath, 'utf-8'));

    const newContent = 'export function step1() {\n  console.log("step1");\n}\nexport function step2() {\n  console.log("step2");\n}\nexport function step3() {\n  console.log("step3");\n}\nexport function big() {\n  step1();\n  step2();\n  step3();\n}';
    const applied = applyRefactor(filePath, newContent);
    expect(applied).toBe(true);
    expect(fs.readFileSync(filePath, 'utf-8')).toBe(newContent);
    expect(fs.readFileSync(backupPath!, 'utf-8')).toContain('export function big()');
  });
});
