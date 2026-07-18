import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { generatePdfFromContent } from '../src/pdfFormatter.ts';

describe('pdfFormatter', () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pdftest-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('generates a PDF file from markdown content', async () => {
    const outputPath = path.join(tmpDir, 'doc.pdf');
    await generatePdfFromContent('# Title\n\nSome content here.', outputPath, 'Title', 'Agent Doc Generator');
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.statSync(outputPath).size).toBeGreaterThan(500);
  });

  it('handles multiline content', async () => {
    const outputPath = path.join(tmpDir, 'doc2.pdf');
    const content = '# Header\n## Sub\n- Item 1\n- Item 2\n\nParagraph text.';
    await generatePdfFromContent(content, outputPath, 'Test', 'Agent');
    expect(fs.existsSync(outputPath)).toBe(true);
    expect(fs.statSync(outputPath).size).toBeGreaterThan(600);
  });
});
