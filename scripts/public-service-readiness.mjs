import fs from 'node:fs';
import path from 'node:path';

// Promote a service only when verified records can be published.
// Placeholder routes remain available for direct QA but never as main entry points.
const readJson = (filename) => fs.existsSync(filename)
  ? JSON.parse(fs.readFileSync(filename, 'utf8'))
  : {};

export function publicServiceReadiness({ root = process.cwd(), now = new Date() } = {}) {
  const pieces = Object.fromEntries(new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now).map(part => [part.type, part.value]));
  const today = [pieces.year, pieces.month, pieces.day].join('-');
  const snapshot = readJson(path.join(root, 'dist', 'events-data.json'));
  const events = Array.isArray(snapshot.events) ? snapshot.events : [];
  const eventsReady = events.some(event => event.title && event.slug
    && /^\d{4}-\d{2}-\d{2}$/.test(event.startDate || '')
    && /^\d{4}-\d{2}-\d{2}$/.test(event.endDate || '')
    && event.endDate >= today
    && /^https:\/\//.test(event.officialUrl || ''));

  const estate = readJson(path.join(root, 'content', 'real-estate.json'));
  const listings = Array.isArray(estate.listings) ? estate.listings : [];
  const approved = listings.some(item => item.approved === true && item.sample !== true);
  const estatePage = path.join(root, 'dist', 'real-estate', 'index.html');
  const estateHtml = fs.existsSync(estatePage) ? fs.readFileSync(estatePage, 'utf8') : '';
  const estateRobots = estateHtml.match(/<meta\b[^>]*name=["']robots["'][^>]*>/i)?.[0] || '';
  const realEstateReady = approved && Boolean(estateRobots) && !/\bnoindex\b/i.test(estateRobots);

  return { events: eventsReady, realEstate: realEstateReady };
}
