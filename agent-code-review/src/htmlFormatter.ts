export interface ReviewEntry {
  relativePath: string;
  filePath: string;
  results: { severity: string; category: string; line?: number; suggestion: string }[];
}

function severityClass(severity: string): string {
  if (severity === 'critical') return 'severity-critical';
  if (severity === 'warning') return 'severity-warning';
  return 'severity-info';
}

function severityIcon(severity: string): string {
  if (severity === 'critical') return '🔴';
  if (severity === 'warning') return '🟡';
  return '🟢';
}

export function generateHtmlReport(entries: ReviewEntry[], agentName: string): string {
  const allResults = entries.flatMap(e => e.results);
  const critical = allResults.filter(r => r.severity === 'critical');
  const warnings = allResults.filter(r => r.severity === 'warning');
  const info = allResults.filter(r => r.severity === 'info');

  const filesHtml = entries.map(entry => {
    if (entry.results.length === 0) return '';
    const resultsHtml = entry.results.map(r => {
      const lineInfo = r.line ? `:${r.line}` : '';
      return `<tr class="${severityClass(r.severity)}">
        <td class="severity-col">${severityIcon(r.severity)} ${r.severity}</td>
        <td>${r.category}${lineInfo}</td>
        <td>${r.suggestion}</td>
      </tr>`;
    }).join('\n');
    return `<div class="file-section">
      <h2>${entry.relativePath}</h2>
      <table>
        <thead><tr><th>Severidad</th><th>Categoría</th><th>Sugerencia</th></tr></thead>
        <tbody>${resultsHtml}</tbody>
      </table>
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
    .summary-card { flex: 1; background: #fff; padding: 1.5rem; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.06); text-align: center; }
    .summary-card .count { font-size: 2rem; font-weight: 700; }
    .summary-card .label { font-size: .85rem; color: #718096; margin-top: .25rem; }
    .summary-card.critical { border-top: 4px solid #e53e3e; }
    .summary-card.warning { border-top: 4px solid #d69e2e; }
    .summary-card.info { border-top: 4px solid #38a169; }
    .file-section { background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 1.5rem; margin-bottom: 1.5rem; }
    .file-section h2 { font-size: 1.1rem; color: #2d3748; margin-bottom: 1rem; padding-bottom: .5rem; border-bottom: 2px solid #edf2f7; }
    table { width: 100%; border-collapse: collapse; }
    th { text-align: left; padding: .75rem .5rem; font-size: .8rem; text-transform: uppercase; color: #718096; border-bottom: 2px solid #edf2f7; }
    td { padding: .75rem .5rem; border-bottom: 1px solid #f7fafc; font-size: .9rem; }
    .severity-col { white-space: nowrap; font-weight: 600; }
    .severity-critical td:first-child { color: #e53e3e; }
    .severity-warning td:first-child { color: #d69e2e; }
    .severity-info td:first-child { color: #38a169; }
    footer { text-align: center; color: #a0aec0; font-size: .8rem; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${agentName}</h1>
      <p class="meta">Generado: ${new Date().toLocaleString('es-AR')} • Archivos revisados: ${entries.length}</p>
    </header>
    <div class="summary">
      <div class="summary-card critical">
        <div class="count">${critical.length}</div>
        <div class="label">🔴 Críticos</div>
      </div>
      <div class="summary-card warning">
        <div class="count">${warnings.length}</div>
        <div class="label">🟡 Advertencias</div>
      </div>
      <div class="summary-card info">
        <div class="count">${info.length}</div>
        <div class="label">🟢 Info</div>
      </div>
    </div>
    ${filesHtml}
    <footer>Generado por ${agentName} • AI Agent Toolkit</footer>
  </div>
</body>
</html>`;
}
