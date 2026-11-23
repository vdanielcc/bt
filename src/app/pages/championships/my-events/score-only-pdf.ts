import type { jsPDF } from 'jspdf';
export function scoreOnlyPages(rounds:{matches:any[]}[]):any[][] {
 const rows=rounds.flatMap(r=>r.matches).filter(m=>!!m.top?.competitorId);
 return Array.from({length:Math.max(1,Math.ceil(rows.length/20))},(_,i)=>rows.slice(i*20,(i+1)*20));
}
export function renderScoreOnlyPdf(doc:jsPDF,rounds:{matches:any[]}[],startPage:(page:number,total:number)=>void):void {
 const pages=scoreOnlyPages(rounds);const widths=[12,100,70,25.6,25.6,25.6,25.6,25.6];
 const text=(value:string,x:number,y:number,width:number)=>{let size=9;doc.setFontSize(size);while(doc.getTextWidth(value)>width&&size>5)doc.setFontSize(size-=.25);doc.text(value,x,y);};
 pages.forEach((rows,page)=>{
  startPage(page+1,pages.length);doc.setTextColor('#111827');doc.setDrawColor('#94a3b8');doc.setLineWidth(.2);
  let x=10;doc.setFont('helvetica','bold');
  ['N.º','Participante','Academia','J1','J2','J3','J4','J5'].forEach((heading,col)=>{doc.setFillColor('#f1f5f9');doc.rect(x,42,widths[col],8,'FD');text(heading,x+2,47.5,widths[col]-4);x+=widths[col];});
  rows.forEach((row,index)=>{let left=10;const y=50+index*7;doc.setFont('helvetica','normal');const values=[String(page*20+index+1),row.top.name||'',row.top.academyName??row.top.academy??'','','','','',''];
   values.forEach((value,col)=>{doc.rect(left,y,widths[col],7);if(value)text(value,left+2,y+4.8,widths[col]-4);left+=widths[col];});
  });
 });
}
