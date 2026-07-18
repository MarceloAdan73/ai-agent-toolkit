import { describe, it, expect } from 'vitest';
import { generateHtmlReport } from '../src/htmlFormatter.ts';

describe('htmlFormatter', () => {
  it('returns a full HTML document', () => {
    const html = generateHtmlReport([], 'Agent Security Audit');
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('</html>');
  });

  it('includes the agent name', () => {
    const html = generateHtmlReport([], 'Agent Security Audit');
    expect(html).toContain('Agent Security Audit');
  });

  it('renders audit findings', () => {
    const entries = [
      {
        relativePath: 'src/db.ts',
        filePath: '/p/src/db.ts',
        results: [
          { severity: 'critical', category: 'SQL Injection', line: 25, suggestion: 'Use parameterized queries' },
        ],
      },
    ];
    const html = generateHtmlReport(entries, 'Agent Security Audit');
    expect(html).toContain('src/db.ts');
    expect(html).toContain('SQL Injection');
    expect(html).toContain('Use parameterized queries');
  });

  it('includes summary cards', () => {
    const html = generateHtmlReport([], 'Agent Security Audit');
    expect(html).toContain('Críticos');
    expect(html).toContain('Advertencias');
  });
});
