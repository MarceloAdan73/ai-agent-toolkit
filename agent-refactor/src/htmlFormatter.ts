export interface RefactorEntry {
  relativePath: string;
  filePath: string;
  suggestions: { category: string; description: string; before: string; after: string; line?: number }[];
}

export function generateHtmlReport(entries: RefactorEntry[], agentName: string): string {
  const totalSuggestions = entries.reduce((sum, e) => sum + e.suggestions.length, 0);

  const filesHtml = entries.map(entry => {
    if (entry.suggestions.length === 0) return '';
    const resultsHtml = entry.suggestions.map(s => {
      const lineInfo = s.line ? `:${s.line}` : '';
      return `<div class="suggestion">
        <h3>${s.category}${lineInfo} — ${s.description}</h3>
        <div class="code-block">
          <div class="code-header before">Before</div>
          <pre><code>${escapeHtml(s.before)}</code></pre>
        </div>
        <div class="code-block">
          <div class="code-header after">After</div>
          <pre><code>${escapeHtml(s.after)}</code></pre>
        </div>
      </div>`;
    }).join('\n');
    return `<div class="file-section">
      <h2>${entry.relativePath}</h2>
      ${resultsHtml}
    </div>`;
  }).join('\n');

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${agentName} - Reporte</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; background: #f5f6fa; padding: 2rem; }
    .container { max-width: 1100px; margin: 0 auto; }
    header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
    header h1 { font-size: 1.8rem; margin-bottom: .5rem; }
    header .meta { color: #a0aec0; font-size: .9rem; }
    .summary { display: flex; gap: 1rem; margin-bottom: 2rem; }
    .summary-card { flex: 1; background: #fff; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.06); text-align: center; border-top: 4px solid #667eea; }
    .summary-card .count { font-size: 2rem; font-weight: 700; }
    .summary-card .label { font-size: .85rem; color: #718096; margin-top: .25rem; }
    .file-section { background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 1.5rem; margin-bottom: 1.5rem; }
    .file-section h2 { font-size: 1.1rem; color: #2d3748; margin-bottom: 1rem; padding-bottom: .5rem; border-bottom: 2px solid #edf2f7; }
    .suggestion { margin-bottom: 1.5rem; padding: 1rem; background: #fafbfc; border-radius: 8px; }
    .suggestion h3 { font-size: 1rem; color: #2d3748; margin-bottom: .75rem; }
    .code-block { margin-bottom: .75rem; }
    .code-header { font-size: .8rem; font-weight: 600; text-transform: uppercase; padding: .25rem .75rem; border-radius: 4px 4px 0 0; display: inline-block; }
    .code-header.before { background: #fed7d7; color: #c53030; }
    .code-header.after { background: #c6f6d5; color: #276749; }
    pre { background: #1a1a2e; color: #e2e8f0; padding: 1rem; border-radius: 0 8px 8px 8px; overflow-x: auto; font-size: .85rem; line-height: 1.5; }
    code { font-family: 'Fira Code', 'SF Mono', Consolas, monospace; }
    footer { text-align: center; color: #a0aec0; font-size: .8rem; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${agentName}</h1>
      <p class="meta">Generado: ${new Date().toLocaleString('es-AR')} • Archivos analizados: ${entries.length}</p>
    </header>
    <div class="summary">
      <div class="summary-card">
        <div class="count">${totalSuggestions}</div>
        <div class="label">Sugerencias</div>
      </div>
      <div class="summary-card">
        <div class="count">${entries.length}</div>
        <div class="label">Archivos</div>
      </div>
    </div>
    ${filesHtml}
    <footer>Generado por ${agentName} • AI Agent Toolkit</footer>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
