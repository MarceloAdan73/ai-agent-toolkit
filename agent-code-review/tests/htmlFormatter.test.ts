import { describe, it, expect } from 'vitest';
import { generateHtmlReport } from '../src/htmlFormatter.ts';

describe('htmlFormatter', () => {
  it('returns a full HTML document with DOCTYPE', () => {
    const html = generateHtmlReport([], 'Agent Code Review');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('includes the agent name in the title', () => {
    const html = generateHtmlReport([], 'Agent Code Review');
    expect(html).toContain('Agent Code Review');
  });

  it('includes summary cards with 0 counts for empty entries', () => {
    const html = generateHtmlReport([], 'Agent Code Review');
    expect(html).toContain('Críticos');
    expect(html).toContain('Advertencias');
    expect(html).toContain('Info');
  });

  it('renders findings with severity, category and suggestion', () => {
    const entries = [
      {
        relativePath: 'src/test.ts',
        filePath: '/project/src/test.ts',
        results: [
          { severity: 'critical', category: 'Security', line: 10, suggestion: 'Fix this' },
          { severity: 'warning', category: 'Style', suggestion: 'Clean up' },
        ],
      },
    ];
    const html = generateHtmlReport(entries, 'Agent Code Review');
    expect(html).toContain('src/test.ts');
    expect(html).toContain('critical');
    expect(html).toContain('Security');
    expect(html).toContain('Fix this');
    expect(html).toContain('warning');
    expect(html).toContain('Clean up');
  });

  it('shows line numbers when present', () => {
    const entries = [
      {
        relativePath: 'src/app.ts',
        filePath: '/project/src/app.ts',
        results: [
          { severity: 'info', category: 'Best Practice', line: 42, suggestion: 'Refactor' },
        ],
      },
    ];
    const html = generateHtmlReport(entries, 'Agent Code Review');
    expect(html).toContain(':42');
  });

  it('includes embedded CSS styles', () => {
    const html = generateHtmlReport([], 'Agent Code Review');
    expect(html).toContain('<style>');
    expect(html).toContain('.summary-card');
    expect(html).toContain('.file-section');
  });
});
