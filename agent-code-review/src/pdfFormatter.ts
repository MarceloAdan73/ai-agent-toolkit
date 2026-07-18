import PDFDocument from 'pdfkit';

export interface PdfEntry {
  relativePath: string;
  results: { severity: string; category: string; line?: number; suggestion: string }[];
}

export async function generatePdfReport(entries: PdfEntry[], outputPath: string, agentName: string): Promise<void> {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = require('fs').createWriteStream(outputPath);
  doc.pipe(stream);

  const allResults = entries.flatMap(e => e.results);
  const critical = allResults.filter(r => r.severity === 'critical');
  const warnings = allResults.filter(r => r.severity === 'warning');
  const info = allResults.filter(r => r.severity === 'info');

  doc.fontSize(22).font('Helvetica-Bold').text(agentName, { align: 'center' });
  doc.fontSize(12).font('Helvetica').text(`Generado: ${new Date().toLocaleString('es-AR')}`, { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(14).font('Helvetica-Bold').text('Resumen');
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica');
  doc.text(`Archivos revisados: ${entries.length}`);
  doc.text(`Críticos: ${critical.length}`);
  doc.text(`Advertencias: ${warnings.length}`);
  doc.text(`Info: ${info.length}`);
  doc.moveDown(1);

  for (const entry of entries) {
    if (entry.results.length === 0) continue;
    if (doc.y > 700) doc.addPage();
    doc.fontSize(13).font('Helvetica-Bold').text(entry.relativePath);
    doc.moveDown(0.3);

    for (const r of entry.results) {
      if (doc.y > 720) doc.addPage();
      const lineInfo = r.line ? `:${r.line}` : '';
      const sevMap: Record<string, string> = { critical: 'CRIT', warning: 'WARN', info: 'INFO' };
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#333').text(`[${sevMap[r.severity] || 'INFO'}] [${r.category}]${lineInfo}`);
      doc.fontSize(9).font('Helvetica').fillColor('#555').text(r.suggestion, { indent: 12 });
      doc.moveDown(0.3);
    }
    doc.moveDown(0.5);
  }

  doc.fontSize(9).font('Helvetica').fillColor('#999').text(`Generado por ${agentName} • AI Agent Toolkit`, { align: 'center' });
  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}
