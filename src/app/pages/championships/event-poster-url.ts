import { environment } from '../../../environments/environment';

export function eventPosterUrl(path: string | null | undefined): string {
  if (!path) return '';
  if (/^\/events\/\d+\//.test(path)) return new URL(path, environment.apiBaseUrl).href;
  return path;
}
