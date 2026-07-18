import { describe, it, expect } from 'vitest';
import { generateHtmlReport } from '../src/htmlFormatter.ts';

describe('htmlFormatter', () => {
  it('returns a full HTML document', () => {
    const html = generateHtmlReport([], 'Agent Refactor');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('includes the agent name', () => {
    const html = generateHtmlReport([], 'Agent Refactor');
    expect(html).toContain('Agent Refactor');
  });

  it('renders refactor suggestions with before/after code', () => {
    const entries = [
      {
        relativePath: 'src/util.ts',
        filePath: '/p/src/util.ts',
        suggestions: [
          { category: 'Performance', description: 'Use map instead of forEach', before: 'arr.forEach', after: 'arr.map', line: 5 },
        ],
      },
    ];
    const html = generateHtmlReport(entries, 'Agent Refactor');
    expect(html).toContain('src/util.ts');
    expect(html).toContain('Use map instead of forEach');
    expect(html).toContain('arr.forEach');
    expect(html).toContain('arr.map');
  });

  it('includes before/after code blocks when suggestions exist', () => {
    const entries = [
      {
        relativePath: 'src/x.ts',
        filePath: '/p/src/x.ts',
        suggestions: [
          { category: 'Style', description: 'Simplify', before: 'old code', after: 'new code' },
        ],
      },
    ];
    const html = generateHtmlReport(entries, 'Agent Refactor');
    expect(html).toContain('Before');
    expect(html).toContain('After');
    expect(html).toContain('old code');
    expect(html).toContain('new code');
  });
});
