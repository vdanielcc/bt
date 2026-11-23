import { TestBed } from '@angular/core/testing';
import { jsPDF } from 'jspdf';
import { ScoreOnlyFixtureComponent } from './score-only-fixture.component';
import { scoreOnlyPages } from './score-only-pdf';
import { renderTournamentPdf } from './tournament-fixture-pdf';
import { EventSummaryComponent } from './event-summary.component';
const rounds=(count:number)=>[{number:1,name:'Solo Puntaje',matches:Array.from({length:count},(_,i)=>({position:i+1,matchNumber:i+1,id:i+1,top:{competitorId:i+1,name:`Participante ${i+1}`,academy:'Dojo'},bottom:{competitorId:null,name:''},isBye:false,winnerCompetitorId:null,nextMatchId:null,nextMatchPosition:null}))}];
describe('Solo Puntaje',()=>{
 it('renders each participant once with exactly five labeled score boxes',()=>{
  TestBed.configureTestingModule({imports:[ScoreOnlyFixtureComponent]});const fixture=TestBed.createComponent(ScoreOnlyFixtureComponent);fixture.componentInstance.rounds=rounds(7);fixture.detectChanges();
  const element=fixture.nativeElement as HTMLElement;expect(element.querySelectorAll('tbody tr').length).toBe(7);expect(element.querySelectorAll('.score-box').length).toBe(35);
  expect(Array.from(element.querySelectorAll('thead th')).map(th=>th.textContent?.trim())).toEqual(['N.º','Participante','Academia','J1','J2','J3','J4','J5']);
  expect(element.textContent).not.toContain('BYE');expect(element.textContent).not.toContain('Ganador');
 });
 it('keeps every participant exactly once across PDF pages with a readable row size',()=>{
  const pages=scoreOnlyPages(rounds(65));expect(pages.map(page=>page.length)).toEqual([20,20,20,5]);expect(new Set(pages.flat().map(row=>row.id)).size).toBe(65);
 });
 it('exports a judging table without elimination, winners or duplicate names',()=>{
  const canvas=document.createElement('canvas');canvas.width=canvas.height=2;const logo=canvas.toDataURL('image/png');
  const doc=new jsPDF({orientation:'landscape',unit:'mm',format:[330,216]});const text=spyOn(doc,'text').and.callThrough();const rectangles=spyOn(doc,'rect').and.callThrough();
  renderTournamentPdf(doc,[{category:{code:'KA1',name:'Kata'},fixture:{fixtureType:'SOLOPUNTAJE',rounds:rounds(21),version:1}}],'Torneo',logo,logo);
  expect(doc.getNumberOfPages()).toBe(2);const values=text.calls.allArgs().map(args=>String(args[0]));for(let i=1;i<=21;i++)expect(values.filter(value=>value===`Participante ${i}`).length).toBe(1);
  expect(values.filter(value=>value==='J5').length).toBe(2);expect(values).not.toContain('Ganador');
  for(const [x,y,width,height] of rectangles.calls.allArgs()){expect(x).toBeGreaterThanOrEqual(10);expect(x+width).toBeLessThanOrEqual(320.001);expect(y+height).toBeLessThan(202);}
 });
 it('saves individual rows without inventing byes for the empty opponent',()=>{
  const component=new EventSummaryComponent({} as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never,{} as never);
  component.fixture={fixtureType:'SOLOPUNTAJE'};component.selectedCategory={fixtureType:'SOLOPUNTAJE'};
  component.fixtureRounds=rounds(1).map(r=>({...r,matches:r.matches.map(m=>({...m,top:{...m.top,color:'#dc2626',label:'AKA',past:false},bottom:{...m.bottom,academy:'',color:'#fff',label:'AO',past:true}}))}));
  const matches=(component as unknown as {fixtureMatchesForSave:()=>{isBye:boolean;nextMatchNumber:number|null}[]}).fixtureMatchesForSave();expect(matches[0].isBye).toBeFalse();expect(matches[0].nextMatchNumber).toBeNull();
 });
});
