export function generateHtmlFromContent(content: string, title: string, agentName: string): string {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1a1a2e; background: #f5f6fa; padding: 2rem; }
    .container { max-width: 900px; margin: 0 auto; }
    header { background: linear-gradient(135deg, #1a1a2e, #16213e); color: #fff; padding: 2rem; border-radius: 12px; margin-bottom: 2rem; }
    header h1 { font-size: 1.8rem; margin-bottom: .5rem; }
    .content { background: #fff; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,.06); padding: 2rem; line-height: 1.7; }
    .content pre { background: #1a1a2e; color: #e2e8f0; padding: 1rem; border-radius: 8px; overflow-x: auto; font-size: .85rem; }
    .content code { font-family: 'Fira Code', 'SF Mono', Consolas, monospace; background: #edf2f7; padding: .15rem .3rem; border-radius: 4px; font-size: .9em; }
    .content pre code { background: transparent; padding: 0; }
    .content h1 { font-size: 1.5rem; margin: 1.5rem 0 .75rem; color: #2d3748; }
    .content h2 { font-size: 1.25rem; margin: 1.25rem 0 .5rem; color: #2d3748; }
    .content p { margin-bottom: .75rem; color: #4a5568; }
    .content ul, .content ol { margin: .5rem 0 .75rem 1.5rem; color: #4a5568; }
    .content table { width: 100%; border-collapse: collapse; margin: 1rem 0; }
    .content th, .content td { border: 1px solid #e2e8f0; padding: .5rem; text-align: left; }
    .content th { background: #edf2f7; font-weight: 600; }
    footer { text-align: center; color: #a0aec0; font-size: .8rem; margin-top: 2rem; }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <h1>${title}</h1>
      <p class="meta">Generado: ${new Date().toLocaleString('es-AR')} • ${agentName}</p>
    </header>
    <div class="content">${content.split('\n').map(line => {
      if (line.startsWith('# ')) return `<h1>${line.slice(2)}</h1>`;
      if (line.startsWith('## ')) return `<h2>${line.slice(3)}</h2>`;
      if (line.startsWith('### ')) return `<h3>${line.slice(4)}</h3>`;
      if (line.startsWith('- ')) return `<li>${line.slice(2)}</li>`;
      if (line.startsWith('|')) return line;
      if (line.trim() === '') return '<br>';
      return `<p>${line}</p>`;
    }).join('\n')}</div>
    <footer>${agentName} • AI Agent Toolkit</footer>
  </div>
</body>
</html>`;
}
