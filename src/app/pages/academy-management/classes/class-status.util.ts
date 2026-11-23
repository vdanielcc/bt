import { ClassStatus } from '../models/academy-management.models';

export function classStatusLabel(status: ClassStatus): string {
  return { ACTIVE: 'Activa', INACTIVE: 'Inactiva', CLOSED: 'Cerrada' }[status];
}
