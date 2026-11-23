export function safeMapUrl(value?: string | null): string | undefined {
  try {
    const map = new URL((value || '').replace(/&amp;/g, '&'));
    if (map.protocol !== 'https:' || map.username || map.password || map.port) return undefined;
    if (['www.openstreetmap.org', 'openstreetmap.org'].includes(map.hostname) && ['/export/embed', '/export/embed.html'].includes(map.pathname)) {
      map.pathname = '/export/embed.html';
      return map.href;
    }
    if (['www.google.com', 'maps.google.com'].includes(map.hostname) && map.pathname.startsWith('/maps/embed')) return map.href;
  } catch { /* Invalid maps are omitted. */ }
  return undefined;
}

/** Use coordinates already supplied by the event when an embed is missing. */
export function eventMapUrl(event: {
  eventLinkSrcOsmaps?: string | null;
  eventLinkOsmaps?: string | null;
  eventLinkGmaps?: string | null;
  eventLinkWaze?: string | null;
}): string | undefined {
  const embed = safeMapUrl(event.eventLinkSrcOsmaps);
  if (embed) return embed;

  for (const value of [event.eventLinkOsmaps, event.eventLinkGmaps, event.eventLinkWaze]) {
    try {
      const link = new URL((value || '').replace(/&amp;/g, '&'));
      if (link.protocol !== 'https:' || link.username || link.password || link.port) continue;
      let coordinates: string | undefined | null;
      if (['openstreetmap.org', 'www.openstreetmap.org'].includes(link.hostname)) {
        const match = link.hash.match(/^#map=\d+(?:\.\d+)?\/(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)(?:&|$)/);
        coordinates = match ? `${match[1]},${match[2]}` : undefined;
      } else if (['www.google.com', 'maps.google.com'].includes(link.hostname) && link.pathname.startsWith('/maps')) {
        coordinates = link.searchParams.get('q') || link.searchParams.get('query');
      } else if (['waze.com', 'www.waze.com', 'ul.waze.com'].includes(link.hostname)) {
        coordinates = link.searchParams.get('ll');
      }
      if (!coordinates || !/^-?\d+(?:\.\d+)?\s*,\s*-?\d+(?:\.\d+)?$/.test(coordinates)) continue;
      const [lat, lon] = coordinates.split(',').map(Number);
      if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
      const map = new URL('https://www.openstreetmap.org/export/embed.html');
      map.searchParams.set('bbox', [Math.max(-180, lon - .01), Math.max(-90, lat - .006), Math.min(180, lon + .01), Math.min(90, lat + .006)].join(','));
      map.searchParams.set('layer', 'mapnik');
      map.searchParams.set('marker', `${lat},${lon}`);
      return map.href;
    } catch { /* Try the next location link. */ }
  }
  return undefined;
}
