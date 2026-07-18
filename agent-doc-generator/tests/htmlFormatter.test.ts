import { describe, it, expect } from 'vitest';
import { generateHtmlFromContent } from '../src/htmlFormatter.ts';

describe('htmlFormatter', () => {
  it('returns a full HTML document', () => {
    const html = generateHtmlFromContent('# Hello', 'Title', 'Agent Doc Generator');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('wraps content in HTML structure', () => {
    const html = generateHtmlFromContent('Some content', 'My Title', 'Agent Doc Generator');
    expect(html).toContain('My Title');
    expect(html).toContain('Some content');
    expect(html).toContain('Agent Doc Generator');
  });

  it('converts markdown headings to HTML headings', () => {
    const html = generateHtmlFromContent('# Heading 1\n## Heading 2', 'Test', 'Agent');
    expect(html).toContain('<h1>');
    expect(html).toContain('Heading 1');
    expect(html).toContain('<h2>');
    expect(html).toContain('Heading 2');
  });

  it('converts list items to HTML', () => {
    const html = generateHtmlFromContent('- Item 1\n- Item 2', 'Test', 'Agent');
    expect(html).toContain('<li>Item 1</li>');
    expect(html).toContain('<li>Item 2</li>');
  });
});
