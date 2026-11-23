import type { jsPDF } from 'jspdf';

// Printable annotations only: never add encounters to the official fixture.
export function renderPdfResults(doc: jsPDF, thirdPlacePlayoff: boolean, lightCorner: boolean, includeWinner = true, kudo = false): void {
  doc.setFont('helvetica', 'normal'); doc.setTextColor('#111827'); doc.setDrawColor('#94a3b8'); doc.setLineWidth(.25);
  if (includeWinner) {
    doc.setFontSize(8); doc.text('Ganador', 10, 161);
    doc.rect(10, 164, 145, 8);
  }
  doc.setFontSize(8); doc.text('Lugares', 10, 174);
  doc.setFillColor('#f1f5f9'); doc.rect(10, 176, 145, 5, 'FD');
  doc.setFontSize(7); doc.text('Lugar', 12, 179.5); doc.text('Deportista / Dojo', 40, 179.5);
  const places = thirdPlacePlayoff ? ['1er lugar', '2do lugar', '3er lugar'] : ['1er lugar', '2do lugar', '3er lugar', '3er lugar'];
  places.forEach((place, i) => { const y = 181 + i * 5; doc.rect(10, y, 145, 5); doc.text(place, 12, y + 3.5); });
  doc.line(38, 176, 38, 181 + places.length * 5);
  if (!thirdPlacePlayoff) return;
  doc.setFontSize(8); doc.text('Definición de tercer lugar', 175, 174);
  for (let side = 0; side < 2; side++) {
    const y = 181 + side * 10;
    const color = side ? lightCorner ? '#f8fafc' : '#0957d9' : kudo ? '#0957d9' : '#dc2626';
    doc.setDrawColor(side && lightCorner ? '#94a3b8' : color); doc.setFillColor('#ffffff'); doc.rect(175, y, 65, 10, 'FD');
    doc.setFillColor(color); doc.rect(175, y, 10, 10, 'FD');
    doc.setTextColor(side && lightCorner ? '#111827' : '#ffffff'); doc.setFontSize(6); doc.text(side ? lightCorner ? 'SHIRO' : 'AO' : kudo ? 'AO' : 'AKA', 176, y + 6);
  }
  doc.setDrawColor('#94a3b8'); doc.setTextColor('#111827'); doc.setFontSize(7);
  doc.text('3er lugar', 255, 183); doc.rect(255, 186, 60, 10);
  doc.line(240, 191, 255, 191);
}
