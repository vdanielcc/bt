import { eventMapUrl, safeMapUrl } from './safe-map-url';
describe('Embedded map URL restrictions', () => {
  it('accepts official HTTPS embeds', () => expect(safeMapUrl('https://www.openstreetmap.org/export/embed.html?bbox=1')).toBeDefined());
  it('rejects script and data URLs', () => { expect(safeMapUrl('javascript:alert(1)')).toBeUndefined(); expect(safeMapUrl('data:text/html,hello')).toBeUndefined(); });
  it('rejects deceptive domains and credentials', () => { expect(safeMapUrl('https://www.google.com.attacker.test/maps/embed')).toBeUndefined(); expect(safeMapUrl('https://attacker@www.google.com/maps/embed')).toBeUndefined(); });
  it('rejects unrelated paths, insecure transport and malformed input', () => { expect(safeMapUrl('https://www.google.com/search')).toBeUndefined(); expect(safeMapUrl('http://www.openstreetmap.org/export/embed.html')).toBeUndefined(); expect(safeMapUrl('invalid')).toBeUndefined(); });
});

describe('Event location map', () => {
  it('normalizes legacy OSM embeds and HTML query separators', () => {
    const map = new URL(safeMapUrl('https://www.openstreetmap.org/export/embed?bbox=1,2,3,4&amp;layer=mapnik')!);
    expect(map.pathname).toBe('/export/embed.html');
    expect(map.searchParams.get('layer')).toBe('mapnik');
  });
  it('uses the coordinates available for event 48 when its OSM fields are empty', () => {
    const map = new URL(eventMapUrl({ eventLinkSrcOsmaps: null, eventLinkOsmaps: null, eventLinkGmaps: 'https://www.google.com/maps?q=-35.4261,-71.6556' })!);
    expect(map.hostname).toBe('www.openstreetmap.org');
    expect(map.searchParams.get('marker')).toBe('-35.4261,-71.6556');
    const bounds = map.searchParams.get('bbox')!.split(',').map(Number);
    [-71.6656, -35.4321, -71.6456, -35.4201].forEach((value, index) => expect(bounds[index]).toBeCloseTo(value, 6));
  });
  it('prefers a configured embed', () => {
    const embed = 'https://www.openstreetmap.org/export/embed.html?bbox=1';
    expect(eventMapUrl({ eventLinkSrcOsmaps: embed, eventLinkGmaps: 'https://www.google.com/maps?q=1,2' })).toBe(embed);
  });
  it('can use an OSM map link or Waze coordinates', () => {
    expect(new URL(eventMapUrl({ eventLinkOsmaps: 'https://www.openstreetmap.org/#map=18/-34.179052/-70.765284' })!).searchParams.get('marker')).toBe('-34.179052,-70.765284');
    expect(new URL(eventMapUrl({ eventLinkWaze: 'https://ul.waze.com/ul?ll=-35.4%2C-71.6' })!).searchParams.get('marker')).toBe('-35.4,-71.6');
  });
  it('omits missing, non-coordinate, out-of-range and untrusted locations', () => {
    expect(eventMapUrl({})).toBeUndefined();
    for (const link of ['https://www.google.com/maps?q=Talca', 'https://www.google.com/maps?q=91,2', 'https://www.google.com/maps?q=1,181', 'https://www.google.com.attacker.test/maps?q=1,2', 'http://www.google.com/maps?q=1,2']) {
      expect(eventMapUrl({ eventLinkGmaps: link })).toBeUndefined();
    }
  });
});
