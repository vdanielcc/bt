import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export interface RegistrationCounts {
  totalCompetitors: number;
  totalCoaches: number;
  totalTeams: number;
  totalRegistrations: number;
}

// Render authoritative API statistics; entry rows cannot reconstruct unique people.
@Component({
  selector: 'bte-registration-counts', standalone: true, imports: [CommonModule],
  template: `<section class="counts" aria-label="Resumen de inscripciones">
    <div><span>Deportistas únicos</span><strong>{{ counts?.totalCompetitors ?? '—' }}</strong><small>Con inscripción deportiva individual</small></div>
    <div><span>Coaches</span><strong>{{ counts?.totalCoaches ?? '—' }}</strong><small>Personas con registro de coach</small></div>
    <div><span>Equipos</span><strong>{{ counts?.totalTeams ?? '—' }}</strong><small>Equipos con inscripción deportiva</small></div>
    <div><span>Inscripciones deportivas</span><strong>{{ counts?.totalRegistrations ?? '—' }}</strong><small>Participaciones por categoría, sin coaches</small></div>
  </section>`,
  styles: [`.counts{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:1rem;margin:1rem 0}
    .counts>div{padding:1rem;border:1px solid #cbd5e1;border-radius:.6rem}
    span,strong,small{display:block}strong{font-size:1.6rem;margin:.3rem 0}small{opacity:.75}
    @media(max-width:800px){.counts{grid-template-columns:repeat(2,minmax(0,1fr))}}
    @media(max-width:420px){.counts{grid-template-columns:1fr}}`]
})
export class RegistrationCountsComponent {
  @Input() counts?: Partial<RegistrationCounts> | null;
}
