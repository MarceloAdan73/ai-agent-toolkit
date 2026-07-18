import PDFDocument from 'pdfkit';

export interface PdfEntry {
  relativePath: string;
  suggestions: { category: string; description: string; before: string; after: string; line?: number }[];
}

export async function generatePdfReport(entries: PdfEntry[], outputPath: string, agentName: string): Promise<void> {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = require('fs').createWriteStream(outputPath);
  doc.pipe(stream);

  const totalSuggestions = entries.reduce((sum, e) => sum + e.suggestions.length, 0);

  doc.fontSize(22).font('Helvetica-Bold').text(agentName, { align: 'center' });
  doc.fontSize(12).font('Helvetica').text(`Generado: ${new Date().toLocaleString('es-AR')}`, { align: 'center' });
  doc.moveDown(1.5);

  doc.fontSize(14).font('Helvetica-Bold').text('Resumen');
  doc.moveDown(0.5);
  doc.fontSize(11).font('Helvetica');
  doc.text(`Archivos analizados: ${entries.length}`);
  doc.text(`Sugerencias: ${totalSuggestions}`);
  doc.moveDown(1);

  for (const entry of entries) {
    if (entry.suggestions.length === 0) continue;
    if (doc.y > 700) doc.addPage();
    doc.fontSize(13).font('Helvetica-Bold').text(entry.relativePath);
    doc.moveDown(0.3);

    for (const s of entry.suggestions) {
      if (doc.y > 700) doc.addPage();
      const lineInfo = s.line ? `:${s.line}` : '';
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#333').text(`[${s.category}]${lineInfo} ${s.description}`);
      doc.moveDown(0.2);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#c53030').text('Before:');
      doc.fontSize(8).font('Courier').fillColor('#555').text(s.before.slice(0, 500), { indent: 10 });
      doc.moveDown(0.2);
      doc.fontSize(8).font('Helvetica-Bold').fillColor('#276749').text('After:');
      doc.fontSize(8).font('Courier').fillColor('#555').text(s.after.slice(0, 500), { indent: 10 });
      doc.moveDown(0.4);
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
