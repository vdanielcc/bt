import { DateTime } from 'luxon';

// Event dates without an offset are local tournament time, not the viewer's timezone.
export function scheduleStart(value?: string): DateTime | null {
  if (!value || !/[T ]\d{2}:\d{2}/.test(value)) return null;
  const start = DateTime.fromISO(value.replace(' ', 'T'), { zone: 'America/Santiago' });
  return start.isValid ? start : null;
}

function timeLabel(time: DateTime, start: DateTime): string {
  const days = Math.round(time.startOf('day').diff(start.startOf('day'), 'days').days);
  return time.toFormat(time.second ? 'HH:mm:ss' : 'HH:mm') + (days ? ` (+${days} d)` : '');
}

export function scheduleTimes(value: string | undefined, items: { durationMinutes: number | null }[]): { start: string; end: string }[] {
  const initial = scheduleStart(value);
  let cursor = initial;
  return items.map(item => {
    const start = cursor && initial ? timeLabel(cursor, initial) : 'Por definir';
    const duration = item.durationMinutes;
    cursor = cursor && duration != null && Number.isFinite(duration) && duration >= 0
      ? cursor.plus({ minutes: duration }) : null;
    return { start, end: cursor && initial ? timeLabel(cursor, initial) : 'Por definir' };
  });
}
