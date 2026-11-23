import { AuthSession } from './auth.models';

// Navigation visibility and direct URL access share this policy.
// Resource ownership is always revalidated by the API.
export function canAccessRoute(session: Pick<AuthSession, 'rol' | 'academieId'> | null, url: string): boolean {
  if (!session) return false;
  const path = url.split(/[?#]/)[0].replace(/\/+$/, '') || '/';
  if (path === '/' || path === '/mi-cuenta') return true;
  if (session.rol === 'admin') return true;
  const academy = /^\/academies\/(\d+)(?:\/|$)/.exec(path);
  if (session.rol === 'academy_admin') {
    if (academy) return Number(academy[1]) === session.academieId;
    return /^\/(dashboards\/analytics|academia|campeonatos|scoreboard|medallero|students)(\/|$)/.test(path);
  }
  if (session.rol === 'instructor') {
    // Instructor academy membership can differ for substitute sessions.
    // The API checks the active session assignment, not the ID in the URL.
    return /^\/academies\/\d+\/class-sessions\/\d+(?:\/attendance)?$/.test(path);
  }
  return false;
}
