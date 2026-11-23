import { EnrollmentStatus } from '../models/academy-management.models';
export const enrollmentStatuses: Record<EnrollmentStatus, string> = { ACTIVE: 'Activo', PAUSED: 'Pausado', WITHDRAWN: 'Retirado', COMPLETED: 'Completado' };
export function enrollmentStatusLabel(status: string): string { return enrollmentStatuses[status as EnrollmentStatus] ?? status; }
export function localDate(): string { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`; }
