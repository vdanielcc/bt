import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AcademyService } from '../../academy/academy.service';
import { AcademyStudent } from './students.models';
import { renderStudentListPdf, studentListTitle, studentListWorkbook } from './student-list-export';

@Injectable({ providedIn: 'root' })
export class StudentListExportService {
  constructor(private readonly academies: AcademyService) {}

  async download(format: 'excel' | 'pdf', academyId: number, students: AcademyStudent[]): Promise<void> {
    const academy = await firstValueFrom(this.academies.getAcademy(academyId));
    const filename = `listado-estudiantes-${academyId}`;
    if (format === 'excel') {
      const { zipSync, strToU8 } = await import('fflate');
      const entries = Object.fromEntries(Object.entries(studentListWorkbook(academy.name, students)).map(([name, content]) => [name, strToU8(content)]));
      const url = URL.createObjectURL(new Blob([zipSync(entries)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }));
      const link = document.createElement('a'); link.href = url; link.download = `${filename}.xlsx`;
      document.body.appendChild(link); link.click(); link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      return;
    }
    const academySource = academy.logoBase64
      ? (academy.logoBase64.startsWith('data:') ? academy.logoBase64 : `data:image/png;base64,${academy.logoBase64}`)
      : this.academies.logoUrl(academy);
    const [budoLogo, academyLogo, { jsPDF }] = await Promise.all([
      this.imageData(new URL('favicon.png', document.baseURI).href),
      academySource ? this.imageData(academySource) : Promise.resolve(''), import('jspdf')
    ]);
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter', compress: true });
    doc.setProperties({ title: `${academy.name} - ${studentListTitle}`, author: 'Budo Tournaments' });
    renderStudentListPdf(doc, academy.name, students, budoLogo, academyLogo);
    doc.save(`${filename}.pdf`);
  }

  private imageData(source: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const image = new Image();
      const fail = (): void => { window.clearTimeout(timeout); image.onload = image.onerror = null; reject(new Error('No fue posible cargar los logos del PDF. Reintenta la descarga.')); };
      const timeout = window.setTimeout(fail, 20000);
      image.crossOrigin = 'anonymous'; image.onerror = fail;
      image.onload = () => {
        window.clearTimeout(timeout);
        try {
          const canvas = document.createElement('canvas');
          const scale = Math.min(1, 600 / Math.max(image.naturalWidth, image.naturalHeight));
          canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
          canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
          const context = canvas.getContext('2d');
          if (!context) throw new Error('canvas');
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/png'));
        } catch { fail(); }
      };
      image.src = source;
    });
  }
}
