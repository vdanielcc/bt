import { jsPDF } from 'jspdf';
import { strToU8, strFromU8, unzipSync, zipSync } from 'fflate';
import { AcademyStudent } from './students.models';
import { renderStudentListPdf, studentListRows, studentListWorkbook } from './student-list-export';

describe('Student list exports', () => {
  const student: AcademyStudent = { id: 1, firstName: 'José & Ana', lastName: '=Apellido', role: 'D', birthDate: '2009-04-21' };
  it('builds a valid XLSX package preserving accents, XML characters and literal names', () => {
    const files = studentListWorkbook('Dojo <Norte>', [student]);
    const archive = unzipSync(zipSync(Object.fromEntries(Object.entries(files).map(([name, text]) => [name, strToU8(text)]))));
    const sheet = strFromU8(archive['xl/worksheets/sheet1.xml']);
    for (const [name, bytes] of Object.entries(archive)) {
      expect(new DOMParser().parseFromString(strFromU8(bytes), 'application/xml').querySelector('parsererror')).withContext(name).toBeNull();
    }
    expect(sheet).toContain('Dojo &lt;Norte&gt;');
    expect(sheet).toContain('José &amp; Ana');
    expect(sheet).toContain('=Apellido');
    expect(sheet).not.toContain('<f>');
    expect(sheet).toContain('21/04/2009');
  });
  it('repeats the Letter PDF header, logos and exact footer on every page', () => {
    const doc = new jsPDF({ unit: 'mm', format: 'letter' });
    const images = spyOn(doc, 'getImageProperties').and.returnValue({ width: 120, height: 60 } as any);
    const addImage = spyOn(doc, 'addImage').and.returnValue(doc);
    const text = spyOn(doc, 'text').and.callThrough();
    const links = spyOn(doc, 'textWithLink').and.callThrough();
    renderStudentListPdf(doc, 'Dojo Norte', Array.from({ length: 80 }, (_, index) => ({ ...student, id: index + 1 })), 'budo', 'academy');
    expect(doc.internal.pageSize.getWidth()).toBeCloseTo(215.9, 1);
    expect(doc.internal.pageSize.getHeight()).toBeCloseTo(279.4, 1);
    expect(doc.getNumberOfPages()).toBeGreaterThan(1);
    expect(images.calls.count()).toBe(doc.getNumberOfPages() * 2);
    const imageCalls = addImage.calls.allArgs() as unknown as unknown[][];
    expect(imageCalls[0][2]).toBe(12);
    expect(imageCalls[1][2] as number).toBeCloseTo(179.9, 1);
    expect(links.calls.count()).toBe(doc.getNumberOfPages());
    expect(links.calls.argsFor(0)[0]).toBe('https://budotournaments.net/app/');
    expect(text.calls.allArgs().filter(args => args[0] === '@budotournaments_net').length).toBe(doc.getNumberOfPages());
    expect(text.calls.allArgs().filter(args => args[0] === 'Listado de Estudiantes/Deportistas').length).toBe(doc.getNumberOfPages());
  });
  it('formats dates without timezone conversion', () => {
    expect(studentListRows([student])[0][4]).toBe('21/04/2009');
    expect(studentListRows([{ ...student, birthDate: '' }])[0][4]).toBe('');
  });
});
