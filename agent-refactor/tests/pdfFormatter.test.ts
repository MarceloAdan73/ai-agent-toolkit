import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { generatePdfReport } from '../src/pdfFormatter.ts';

describe('pdfFormatter', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdftest-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates a PDF file', async () => {
    const outputPath = path.join(tmpDir, 'refactor.pdf');
    await generatePdfReport([], outputPath, 'Agent Refactor');
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.statSync(outputPath).size).toBeGreaterThan(500);
  });

  it('includes suggestions in the PDF', async () => {
    const outputPath = path.join(tmpDir, 'refactor2.pdf');
    const entries = [
      {
        relativePath: 'src/app.ts',
        suggestions: [
          { category: 'Style', description: 'Simplify', before: 'if (x) { return true; }', after: 'return !!x;' },
        ],
      },
    ];
    await generatePdfReport(entries, outputPath, 'Agent Refactor');
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.statSync(outputPath).size).toBeGreaterThan(800);
  });
});
