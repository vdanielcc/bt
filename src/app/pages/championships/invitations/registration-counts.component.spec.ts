import { TestBed } from '@angular/core/testing';
import { RegistrationCountsComponent } from './registration-counts.component';

describe('Registration counters', () => {
  it('displays the four official counts without deriving them from entry rows', () => {
    TestBed.configureTestingModule({ imports: [RegistrationCountsComponent] });
    const fixture = TestBed.createComponent(RegistrationCountsComponent);
    fixture.componentInstance.counts = { totalCompetitors: 7, totalCoaches: 2, totalTeams: 3, totalRegistrations: 24 };
    fixture.detectChanges();
    expect(Array.from(fixture.nativeElement.querySelectorAll('strong')).map((node: any) => node.textContent.trim()))
      .toEqual(['7', '2', '3', '24']);
    expect(fixture.nativeElement.textContent).toContain('Con inscripción deportiva individual');
    expect(fixture.nativeElement.textContent).toContain('Participaciones por categoría, sin coaches');
    fixture.destroy();
  });

  it('preserves zero and shows an unavailable count instead of guessing it', () => {
    TestBed.configureTestingModule({ imports: [RegistrationCountsComponent] });
    const fixture = TestBed.createComponent(RegistrationCountsComponent);
    fixture.componentInstance.counts = { totalCompetitors: 0, totalTeams: 0 };
    fixture.detectChanges();
    expect(Array.from(fixture.nativeElement.querySelectorAll('strong')).map((node: any) => node.textContent.trim()))
      .toEqual(['0', '—', '0', '—']);
    fixture.destroy();
  });
});
