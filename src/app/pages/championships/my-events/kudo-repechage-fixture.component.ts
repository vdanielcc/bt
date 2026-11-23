import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'bte-kudo-repechage-fixture', standalone: true, imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<p>La primera derrota lleva al repechaje; la segunda elimina. El ganador del repechaje disputa el título. Si vence al finalista invicto, se juega una final decisiva.</p>
    <div class="rounds"><section *ngFor="let round of rounds"><h3>{{round.name}}</h3>
      <article *ngFor="let match of round.matches" [class.inactive]="match.isActive === false">
        <header>Combate {{match.matchNumber}} <small *ngIf="match.isBye">· Pase libre</small><small *ngIf="match.isConditional">· Condicional</small></header>
        <div class="side blue" [class.winner]="match.winnerCompetitorId && match.winnerCompetitorId === match.top?.competitorId"><b>AO</b><span>{{name(match, true)}}<small>{{match.top?.academyName || match.top?.academy}}</small></span></div>
        <div class="side white" [class.winner]="match.winnerCompetitorId && match.winnerCompetitorId === match.bottom?.competitorId"><b>SHIRO</b><span>{{name(match, false)}}<small>{{match.bottom?.academyName || match.bottom?.academy}}</small></span></div>
        <small *ngIf="match.isConditional && match.isActive === false">Se habilita si el ganador del repechaje gana la gran final.</small>
      </article></section></div><p *ngIf="winner"><strong>Campeón: {{winner.name}}</strong> {{winner.academyName || winner.academy}}</p>`,
  styles: [`.rounds{display:flex;gap:20px;overflow:auto;padding:16px 0}section{min-width:280px;max-width:360px}h3{font-weight:600;margin-bottom:12px}article{border:1px solid #94a3b8;border-radius:8px;margin-bottom:16px;overflow:hidden}header{padding:8px;background:#e2e8f0;color:#0f172a}.side{display:flex;gap:12px;padding:12px;border-top:1px solid #cbd5e1}.blue{border-left:7px solid #0957d9}.white{border-left:7px solid #fff;box-shadow:inset 1px 0 #94a3b8}.side b{min-width:46px}.side small{display:block;color:#64748b}.winner{font-weight:700;background:#dcfce7;color:#14532d}.inactive{opacity:.65}article>small{display:block;padding:8px}`]
})
export class KudoRepechageFixtureComponent {
  @Input() rounds: any[] = [];
  get winner(): any {
    const matches = this.rounds.flatMap(r => r.matches);
    const reset = matches.find(m => m.stage === 'RESET');
    const final = reset?.isActive ? reset : matches.find(m => m.stage === 'GF');
    return final?.winnerCompetitorId ? [final.top, final.bottom].find(s => s?.competitorId === final.winnerCompetitorId) : undefined;
  }
  name(match: any, top: boolean): string {
    const side = top ? match.top : match.bottom;
    if (side?.competitorId) return side.name || `Deportista ${side.competitorId}`;
    const number = top ? match.topSourceNumber : match.bottomSourceNumber;
    const result = top ? match.topSourceResult : match.bottomSourceResult;
    return number ? `${result === 'loser' ? 'Perdedor' : 'Ganador'} del combate ${number}` : 'Pase libre';
  }
}
