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

  it('generates a PDF file with content', async () => {
    const outputPath = path.join(tmpDir, 'report.pdf');
    await generatePdfReport([], outputPath, 'Agent Code Review');
    expect(fs.existsSync(outputPath)).toBe(true);
    const stat = fs.statSync(outputPath);
    expect(stat.size).toBeGreaterThan(500);
  });

  it('includes findings in the PDF', async () => {
    const outputPath = path.join(tmpDir, 'report2.pdf');
    const entries = [
      {
        relativePath: 'src/test.ts',
        results: [
          { severity: 'critical', category: 'Security', line: 5, suggestion: 'Vulnerability found' },
        ],
      },
    ];
    await generatePdfReport(entries, outputPath, 'Agent Code Review');
    expect(fs.existsSync(outputPath)).toBe(true);
    const stat = fs.statSync(outputPath);
    expect(stat.size).toBeGreaterThan(800);
  });

  it('handles multiple files', async () => {
    const outputPath = path.join(tmpDir, 'report3.pdf');
    const entries = [
      { relativePath: 'a.ts', results: [{ severity: 'warning', category: 'Style', suggestion: 'Format' }] },
      { relativePath: 'b.ts', results: [{ severity: 'info', category: 'Perf', suggestion: 'Optimize' }] },
    ];
    await generatePdfReport(entries, outputPath, 'Agent Code Review');
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.statSync(outputPath).size).toBeGreaterThan(1000);
  });
});
