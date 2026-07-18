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
    const outputPath = path.join(tmpDir, 'audit.pdf');
    await generatePdfReport([], outputPath, 'Agent Security Audit');
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.statSync(outputPath).size).toBeGreaterThan(500);
  });

  it('includes findings in the PDF', async () => {
    const outputPath = path.join(tmpDir, 'audit2.pdf');
    const entries = [
      {
        relativePath: 'src/api.ts',
        results: [
          { severity: 'critical', category: 'XSS', line: 10, suggestion: 'Sanitize input' },
        ],
      },
    ];
    await generatePdfReport(entries, outputPath, 'Agent Security Audit');
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.statSync(outputPath).size).toBeGreaterThan(800);
  });
});
