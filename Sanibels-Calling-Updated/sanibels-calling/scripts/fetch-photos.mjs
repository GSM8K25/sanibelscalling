// Downloads the default (Wikipedia/Wikimedia Commons) photo for every shell and place into www/photos/,
// with the photographer and license for each, so the iPhone app has its pictures offline.
// Run with Node 22+:  node scripts/fetch-photos.mjs      (setup-ios.sh runs it for you)
// Shells or places where you set your own photo in the editor are skipped.
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const WWW = path.join(ROOT, 'www'), OUT = path.join(WWW, 'photos');
const UA = { 'User-Agent': 'SanibelsCallingApp/1.0 (photo bundling for a free visitor guide app)' };
const content = JSON.parse(await fs.readFile(path.join(WWW, 'content.json'), 'utf8'));
await fs.mkdir(OUT, { recursive: true });
let index = {}; try { index = JSON.parse(await fs.readFile(path.join(OUT, 'index.json'), 'utf8')); } catch { }

const strip = s => String(s || '').replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const items = [...content.shells, ...content.places].filter(x => !x.photo && x.wiki);
let ok = 0, skipped = 0, failed = [];
for (const x of items) {
  const titles = Array.isArray(x.wiki) ? x.wiki : [x.wiki];
  if (titles.some(t => index[t])) { skipped++; continue; }
  let done = false;
  for (const t of titles) {
    try {
      const sum = await (await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, '_'))}`, { headers: UA })).json();
      if (!sum.thumbnail) continue;
      const src = sum.thumbnail.source.replace(/\/\d+px-/, '/800px-');
      const file = decodeURIComponent((sum.originalimage?.source || sum.thumbnail.source).split('/').pop()).replace(/^\d+px-/, '');
      const meta = await (await fetch(`https://commons.wikimedia.org/w/api.php?action=query&format=json&prop=imageinfo&iiprop=extmetadata&titles=File:${encodeURIComponent(file)}`, { headers: UA })).json();
      const em = Object.values(meta.query?.pages || {})[0]?.imageinfo?.[0]?.extmetadata || {};
      const credit = [strip(em.Artist?.value), strip(em.LicenseShortName?.value)].filter(Boolean).join(' · ') || 'Wikimedia Commons';
      let img = await fetch(src, { headers: UA }); if (!img.ok) img = await fetch(sum.thumbnail.source, { headers: UA });
      if (!img.ok) throw new Error('image ' + img.status);
      const name = slug(t) + '.jpg';
      await fs.writeFile(path.join(OUT, name), Buffer.from(await img.arrayBuffer()));
      index[t] = { file: 'photos/' + name, credit, page: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file) };
      ok++; done = true; console.log('✓', t, '—', credit); break;
    } catch (e) { console.log('…', t, e.message); }
    await sleep(250);
  }
  if (!done) failed.push(x.name || x.n);
  await sleep(250);
}
await fs.writeFile(path.join(OUT, 'index.json'), JSON.stringify(index, null, 1));
console.log(`\nPhotos: ${ok} downloaded, ${skipped} already had, ${failed.length} without a photo${failed.length ? ': ' + failed.join(', ') : ''}`);
