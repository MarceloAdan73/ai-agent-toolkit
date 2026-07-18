import PDFDocument from 'pdfkit';
import fs from 'fs';

export async function generatePdfFromContent(content: string, outputPath: string, title: string, agentName: string): Promise<void> {
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  const stream = fs.createWriteStream(outputPath);
  doc.pipe(stream);

  doc.fontSize(20).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.fontSize(11).font('Helvetica').text(`Generado: ${new Date().toLocaleString('es-AR')} • ${agentName}`, { align: 'center' });
  doc.moveDown(1.5);

  const lines = content.split('\n');
  for (const line of lines) {
    if (doc.y > 750) doc.addPage();
    if (line.startsWith('# ')) {
      doc.fontSize(16).font('Helvetica-Bold').text(line.slice(2), { indent: 0 });
    } else if (line.startsWith('## ')) {
      doc.fontSize(13).font('Helvetica-Bold').text(line.slice(3), { indent: 0 });
    } else if (line.startsWith('### ')) {
      doc.fontSize(11).font('Helvetica-Bold').text(line.slice(4), { indent: 0 });
    } else if (line.startsWith('- ')) {
      doc.fontSize(10).font('Helvetica').text(`  • ${line.slice(2)}`, { indent: 10 });
    } else if (line.startsWith('|')) {
    } else if (line.trim() === '') {
      doc.moveDown(0.3);
    } else {
      doc.fontSize(10).font('Helvetica').text(line, { indent: 0 });
    }
  }

  doc.moveDown(1);
  doc.fontSize(8).font('Helvetica').fillColor('#999').text(`Generado por ${agentName} • AI Agent Toolkit`, { align: 'center' });
  doc.end();

  return new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });
}
