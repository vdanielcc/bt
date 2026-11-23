import { HttpErrorResponse } from '@angular/common/http';

export function enrollmentErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 403) return 'No tienes permiso para inscribir a este deportista desde la academia seleccionada.';
    const body = error.error;
    if (body && typeof body === 'object' && typeof body.message === 'string') return body.message;
    if (body && typeof body === 'object' && body.errors) {
      const messages = Object.values(body.errors).flat().filter((value): value is string => typeof value === 'string');
      if (messages.length) return messages.join(' ');
    }
  }
  return 'No fue posible realizar la inscripción. Inténtalo nuevamente.';
}
