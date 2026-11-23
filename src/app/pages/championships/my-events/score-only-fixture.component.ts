import { ChangeDetectionStrategy, Component, Input, TemplateRef } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ScoreOnlySlot {competitorId?:number|null;name?:string;academy?:string;academyName?:string;}
export interface ScoreOnlyRound {matches:{position:number;top:ScoreOnlySlot}[];}
@Component({standalone:true,selector:'bte-score-only-fixture',imports:[CommonModule],changeDetection:ChangeDetectionStrategy.OnPush,
template:`<div class="score-scroll"><table aria-label="Solo Puntaje: participantes y jueces"><thead><tr><th scope="col">N.º</th><th scope="col">Participante</th><th scope="col">Academia</th><th *ngFor="let judge of judges" scope="col">{{judge}}</th><th *ngIf="actionsTemplate" aria-label="Acciones"></th></tr></thead><tbody><tr *ngFor="let row of participants;index as index"><td>{{index+1}}</td><th scope="row">{{row.top.name}}</th><td>{{row.top.academyName || row.top.academy}}</td><td *ngFor="let judge of judges"><span class="score-box" [attr.aria-label]="'Casilla de puntaje '+judge+' para '+row.top.name"></span></td><td *ngIf="actionsTemplate"><ng-container *ngTemplateOutlet="actionsTemplate;context:{$implicit:row.top}"></ng-container></td></tr><tr *ngIf="!participants.length"><td [attr.colspan]="actionsTemplate?9:8">No hay participantes en esta versión.</td></tr></tbody></table></div>`,
// Projected action buttons use absolute positioning in the event summary.
// Anchor them to their own participant cell instead of the outer fixture.
styles:[`.score-scroll{overflow-x:auto}table{width:100%;min-width:720px;border-collapse:collapse;text-align:left}th,td{border:1px solid var(--vex-divider-color,#cbd5e1);padding:12px}thead{background:var(--vex-background-hover,#f1f5f9)}tbody th{font-weight:600}td:last-child:has(.competitor-menu-button){position:relative;min-width:52px}.score-box{display:block;min-width:48px;height:40px;border:1px solid #94a3b8;background:#fff}@media print{.score-scroll{overflow:visible}.score-box{height:32px}th[aria-label="Acciones"],td:has(.competitor-menu-button){display:none}}`]})
export class ScoreOnlyFixtureComponent {
 @Input() rounds:ScoreOnlyRound[]=[];
 @Input() actionsTemplate:TemplateRef<unknown>|null=null;
 readonly judges=['J1','J2','J3','J4','J5'];
 get participants():{position:number;top:ScoreOnlySlot}[]{return this.rounds.flatMap(r=>r.matches).filter(m=>!!m.top?.competitorId);}
}
