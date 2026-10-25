/* Sanibel's Calling — core: helpers, content loading, photos, places, tides, weather, storage.
   Guide content (places, shells, tips, hotspots…) lives in content.json and is edited with editor.html.
   Your own shell walks, photos and saved places stay on this phone. */
'use strict';

// ---------- helpers ----------
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { } };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad = n => String(n).padStart(2, '0');
const isoDate = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const isoLocal = d => `${isoDate(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
function hav(a, b, c, d) { const R = 3958.8, r = Math.PI / 180, x = (c - a) * r, y = (d - b) * r; const h = Math.sin(x / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin(y / 2) ** 2; return 2 * R * Math.asin(Math.sqrt(h)); }
const TZ = 'America/New_York';   // island time, even when planning from home
const fmtTime = t => new Date(t).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: TZ });
const fmtDay = t => new Date(t).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', timeZone: TZ });
const fmtDayLong = t => new Date(t).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: TZ });
const islandDay = t => new Date(t).toLocaleDateString('en-CA', { timeZone: TZ });   // YYYY-MM-DD on the island
const fmtLL = (a, b) => `${a.toFixed(5)}, ${b.toFixed(5)}`;
const COMPASS = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
const compass = deg => deg == null ? '—' : COMPASS[Math.round(((deg % 360) + 360) % 360 / 22.5) % 16];
let toastT, undoFn = null;
function toast(msg, undo, ms = 2800) {
  $('#toastMsg').textContent = msg; undoFn = undo || null; $('#toastUndo').hidden = !undo; $('#toast').hidden = false;
  clearTimeout(toastT); toastT = setTimeout(() => { $('#toast').hidden = true; undoFn = null; }, undo ? 5000 : ms);
}
$('#toastUndo').onclick = () => { const f = undoFn; $('#toast').hidden = true; undoFn = null; f && f(); };
function shade(hex, pct) { const n = parseInt(hex.slice(1), 16), f = v => Math.max(0, Math.min(255, Math.round(v + v * pct / 100))); return '#' + [f(n >> 16), f((n >> 8) & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join(''); }

// Simple formatting used in content.json text: blank line = new paragraph, "- " = bullet, **bold**, [link](https://…)
function md(src) {
  const inline = t => esc(t).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
  return '<div class="rt">' + String(src || '').trim().split(/\n\s*\n/).map(block => {
    const lines = block.split('\n');
    if (lines.every(l => /^\s*-\s+/.test(l))) return '<ul>' + lines.map(l => `<li>${inline(l.replace(/^\s*-\s+/, ''))}</li>`).join('') + '</ul>';
    return '<p>' + lines.map(inline).join('<br>') + '</p>';
  }).join('') + '</div>';
}

// ---------- icons ----------
const ICONS = {
  wave: '<path d="M2 15c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3"/><path d="M2 20c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3"/><circle cx="17" cy="6" r="3"/>',
  shell: '<path d="M12 20c-5 0-8-3-8-7 0-5 4-9 8-9s8 4 8 9c0 4-3 7-8 7z"/><path d="M12 20V5M7 18 9 7M17 18 15 7"/>',
  museum: '<path d="M3 21h18M4 10h16M12 3 3 8h18z"/><path d="M6 10v8M10 10v8M14 10v8M18 10v8"/>',
  leaf: '<path d="M5 19c0-9 6-14 15-14 0 9-5 15-14 15"/><path d="M5 19 13 11"/>',
  paddle: '<path d="m4 20 9-9"/><path d="M13 11c-1-3 1-7 4-8 2 2 3 4 1 7-1 2-3 2-5 1z"/><path d="M2 17c2 0 3 2 5 2"/>',
  boat: '<path d="M3 15h18l-3 5H6z"/><path d="M12 3v12M12 4l6 8h-6"/>',
  fan: '<circle cx="12" cy="12" r="2"/><path d="M12 10c0-4 1-7 3-7s1 5-3 7zM14 12c4 0 7 1 7 3s-5 1-7-3zM12 14c0 4-1 7-3 7s-1-5 3-7zM10 12c-4 0-7-1-7-3s5-1 7 3z"/>',
  gator: '<path d="M2 14c3-2 6-3 10-3h8l2 2-3 1H10c-3 0-5 1-8 2z"/><path d="M6 12V9M10 11V8M14 11V8"/><path d="M2 18c2.5 0 2.5-1.5 5-1.5S9.5 18 12 18s2.5-1.5 5-1.5 2.5 1.5 5 1.5"/>',
  fish: '<path d="M3 12c3-4 7-5 11-5 3 0 5 2 7 5-2 3-4 5-7 5-4 0-8-1-11-5z"/><path d="M3 12 1 9M3 12l-2 3"/><circle cx="16" cy="11" r="1"/>',
  rod: '<path d="M3 21 19 5"/><path d="M19 5c1 4 1 8-1 12"/><circle cx="18" cy="19" r="2"/><path d="M7 17l2 2"/>',
  hook: '<path d="M14 3v11a4 4 0 0 1-8 0v-2l3 2"/><circle cx="14" cy="3" r="1"/>',
  basket: '<path d="M3 10h18l-2 10H5z"/><path d="m8 10 3-6M16 10l-3-6"/><path d="M8 14v3M12 14v3M16 14v3"/>',
  music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  cone: '<path d="M8 11 12 22l4-11"/><circle cx="12" cy="8" r="4"/>',
  conch: '<path d="M6 20c-2-5 0-12 6-16 6 4 8 11 6 16-4 1-8 1-12 0z"/><path d="M9 9h6M8 13h8"/>',
  bag: '<path d="M5 8h14l-1 13H6z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l3 13h11l2-9H6"/>',
  wrench: '<path d="M14 6a4 4 0 0 1 5 5l-9 9-4-4 9-9z"/><path d="m14 6-2-2 3-1 2 2"/>',
  cross: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 8v8M8 12h8"/>',
  car: '<path d="M3 16v-4l2-5h14l2 5v4z"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z"/>',
  sun: '<circle cx="12" cy="14" r="4"/><path d="M12 4v3M4.9 7.9l2 2M19.1 7.9l-2 2M2 18h20M5 22h14"/>',
  heart: '<path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/>',
  book: '<path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2z"/><path d="M4 21V5M9 7h6"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  tide: '<path d="M2 12c2.5 0 2.5-3 5-3s2.5 3 5 3 2.5-3 5-3 2.5 3 5 3"/><path d="M12 22v-6M9 19l3 3 3-3"/>',
  home: '<path d="M3 11 12 3l9 8"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>'
};
const icon = (name, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" ${extra}>${ICONS[name] || ICONS.star}</svg>`;
const UI = {
  apple: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 11 18-8-8 18-2-8z"/></svg>',
  google: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  web: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/></svg>',
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg>',
  heartFull: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 21s-8-5.2-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 10c0 5.8-8 11-8 11z"/></svg>',
  photo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-8 8"/></svg>',
  cam: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/></svg>',
  loc: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>',
  layers: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/></svg>',
  pin: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
  share: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15V3M7 8l5-5 5 5"/><path d="M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7"/></svg>',
  back: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m15 5-7 7 7 7"/></svg>',
  chev: '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m9 5 7 7-7 7"/></svg>'
};

// ---------- content (content.json; newest of bundled / downloaded / editor preview) ----------
let C = null, CAT = {}, P = {}, SH = {};
const PREVIEW = new URLSearchParams(location.search).has('preview');
const validContent = j => j && Array.isArray(j.places) && Array.isArray(j.shells) && Array.isArray(j.cats);
const newer = (a, b) => !b ? a : !a ? b : (String(a.updated) >= String(b.updated) ? a : b);
function indexContent() {
  for (const k of ['notes', 'strategy', 'tips', 'hotspots', 'sunspots', 'favorites']) C[k] = C[k] || [];
  C.booking = C.booking || {}; C.app = C.app || {};
  CAT = Object.fromEntries(C.cats.map(c => [c.id, c])); P = Object.fromEntries(C.places.map(p => [p.id, p])); SH = Object.fromEntries(C.shells.map(s => [s.id, s]));
}
async function loadContent() {
  if (PREVIEW) { const d = lsGet('content.draft', null); if (validContent(d)) { C = d; $('#previewbar').hidden = false; indexContent(); return; } }
  let built = null; try { built = await (await fetch('content.json', { cache: 'no-cache' })).json(); } catch { }
  const live = lsGet('content.live', null);
  C = newer(validContent(built) ? built : null, validContent(live) ? live : null) || { cats: [], places: [], shells: [] };
  indexContent();
}
// The iPhone app checks your website for a newer content.json (your edits) once a day and on launch.
async function checkContentUpdate() {
  if (!NATIVE.on || PREVIEW) return;
  try {
    const r = await fetch(APP_CONFIG.webUrl + 'content.json', { cache: 'no-store' }); if (!r.ok) return;
    const j = await r.json(); if (!validContent(j) || String(j.updated) <= String(C.updated)) return;
    lsSet('content.live', j); C = j; indexContent(); render(); loadWiki();
  } catch { }
}

// ---------- photos ----------
// Order: your own photo (content.json "photo") > photo bundled with the iPhone app (photos/index.json) > Wikipedia lead photo > drawing
let wiki = lsGet('wiki.v2', {}), bundled = {};
async function loadBundled() { try { const r = await fetch('photos/index.json'); if (r.ok) bundled = await r.json(); } catch { } }
const titlesOf = x => (Array.isArray(x.wiki) ? x.wiki : x.wiki ? [x.wiki] : []);
async function resolveWiki(titles) {
  for (const t of titles) {
    if (wiki[t] && !wiki[t].none) return;
    if (wiki[t]?.none && Date.now() - wiki[t].at < 7 * 864e5) continue;
    try {
      const r = await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, '_'))}`);
      const j = await r.json();
      if (j.thumbnail) {
        const file = decodeURIComponent((j.originalimage?.source || j.thumbnail.source).split('/').pop()).replace(/^\d+px-/, '');
        wiki[t] = { thumb: j.thumbnail.source.replace(/\/\d+px-/, '/400px-'), full: j.thumbnail.source.replace(/\/\d+px-/, '/1000px-'), page: 'https://commons.wikimedia.org/wiki/File:' + encodeURIComponent(file), at: Date.now() };
        return;
      }
      wiki[t] = { none: true, at: Date.now() };
    } catch { wiki[t] = { none: true, at: Date.now() }; }
  }
}
let wikiRunning = false;
async function loadWiki() {
  if (wikiRunning || navigator.onLine === false) return; wikiRunning = true;
  const todo = [...C.shells, ...C.places].filter(x => titlesOf(x).length && !x.photo && !titlesOf(x).some(t => bundled[t] || (wiki[t] && !wiki[t].none)));
  for (const x of todo) { await resolveWiki(titlesOf(x)); }
  lsSet('wiki.v2', wiki); wikiRunning = false; if (todo.length && view !== 'map') render();
}
function photoOf(x) {
  if (x.photo) return { thumb: x.photo, full: x.photo, credit: x.photoCredit || '', page: '' };
  for (const t of titlesOf(x)) { if (bundled[t]) return { thumb: bundled[t].file, full: bundled[t].file, credit: bundled[t].credit || 'Wikimedia Commons', page: bundled[t].page }; }
  for (const t of titlesOf(x)) { const w = wiki[t]; if (w && !w.none) return { thumb: w.thumb, full: w.full, credit: 'Wikimedia Commons', page: w.page }; }
  return null;
}
function artFor(x, color, ic) { return `<div class="art" style="background:linear-gradient(135deg, ${color}, ${shade(color, -28)})">${icon(ic)}</div>`; }
function picHTML(x, color, ic, big) {
  const ph = photoOf(x), art = artFor(x, color, ic);
  if (!ph) return art;
  const credit = big && (ph.credit || ph.page) ? (ph.page ? `<a class="credit" href="${esc(ph.page)}" target="_blank" rel="noopener">Photo: ${esc(ph.credit || 'Wikimedia Commons')}</a>` : `<span class="credit">Photo: ${esc(ph.credit)}</span>`) : '';
  return `${art}<img src="${esc(big ? ph.full : ph.thumb)}" alt="${esc(x.n || x.name || '')}" loading="lazy" onerror="this.remove()">${credit}`;
}
const GCOL = { univalve: '#C27A3A', bivalve: '#1E88A8', other: '#7A86A8' };
const shellPic = (s, big) => picHTML(s, GCOL[s.g] || '#C27A3A', 'shell', big);
const placePic = (p, big) => { const c = CAT[p.c] || { color: '#13858C', icon: 'star' }; return picHTML(p, c.color, c.icon, big); };

// ---------- places: links, locations ----------
const dest = p => `${p.n}, ${p.addr}`;
const dirURL = (x, kind) => {
  // own pin first (exact spot), then the linked place's address, then the item's address
  const own = x.lat != null && x.lat !== '' ? `${x.lat},${x.lng}` : null;
  const target = own || (x.place && P[x.place] ? dest(P[x.place]) : x.addr ? dest(x) : (loc(x) ? `${loc(x).lat},${loc(x).lng}` : 'Sanibel, FL'));
  return kind === 'apple' ? `https://maps.apple.com/?daddr=${encodeURIComponent(target)}&dirflg=d` : `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(target)}`;
};
const appleURL = p => dirURL(p, 'apple'), googleURL = p => dirURL(p, 'google');
const googleSearch = p => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(dest(p))}`;
let geo = lsGet('geo.v1', {}), geoRunning = false;
const okNear = (lat, lng) => hav(lat, lng, 26.44, -82.09) < 140;
async function geocodeOne(p) {
  const tries = [p.addr, `${p.n}, ${String(p.a || '').replace(/\s*\(.*\)/, '')}, Florida`];
  for (const q of tries) {
    try {
      const r = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=3&lat=26.44&lon=-82.09`);
      const j = await r.json();
      for (const f of j.features || []) {
        const pr = f.properties || {}, [lng, lat] = f.geometry.coordinates;
        const precise = pr.housenumber || pr.type === 'house' || (pr.osm_key && pr.osm_key !== 'highway' && pr.osm_key !== 'place' && pr.type !== 'street' && pr.type !== 'city' && pr.type !== 'district');
        if (precise && okNear(lat, lng)) return { lat, lng };
      }
    } catch { }
    await new Promise(r => setTimeout(r, 1100));
  }
  return null;
}
async function geocodeAll() {
  if (geoRunning || navigator.onLine === false) return; geoRunning = true;
  for (const p of C.places) {
    if (p.ll || (p.lat != null)) continue;
    const k = p.id + '|' + p.addr; if (geo[k] && (geo[k].lat || Date.now() - geo[k].at < 14 * 864e5)) continue;
    const r = await geocodeOne(p); geo[k] = r ? r : { fail: true, at: Date.now() }; lsSet('geo.v1', geo);
    if (view === 'map' && r) MAPV.draw();
    await new Promise(res => setTimeout(res, 1100));
  }
  geoRunning = false; if (view === 'map') MAPV.draw();
}
const LL = p => { if (!p) return null; if (p.lat != null && p.lng != null) return { lat: +p.lat, lng: +p.lng }; if (p.ll) return p.ll; const g = geo[p.id + '|' + p.addr]; return g && g.lat ? g : null; };
// hotspots, sun spots and favorites: their own pin if set, otherwise the linked place
const loc = x => x && x.lat != null && x.lat !== '' ? { lat: +x.lat, lng: +x.lng } : x && x.place ? LL(P[x.place]) : LL(x);

let origin = lsGet('origin', null), gpsPos = null;
const GPS = { last: null };
function getPos(timeout = 12000) {
  if (NATIVE.on) return NATIVE.getPos(timeout).then(p => {
    if (p && !p.denied) { gpsPos = GPS.last = { lat: p.lat, lng: p.lng, acc: p.acc, t: Date.now() }; return GPS.last; }
    if (p && p.denied) toast('Location is off for this app. Turn it on in Settings to use your location.');
    return GPS.last && Date.now() - GPS.last.t < 180000 ? GPS.last : null;
  });
  return new Promise(res => {
    if (!navigator.geolocation) return res(null);
    navigator.geolocation.getCurrentPosition(p => { gpsPos = GPS.last = { lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy, t: Date.now() }; res(GPS.last); },
      () => res(GPS.last && Date.now() - GPS.last.t < 180000 ? GPS.last : null), { enableHighAccuracy: true, timeout, maximumAge: 60000 });
  });
}
const from = () => origin || gpsPos;
function dist(x) { const o = from(), l = loc(x); if (!o || !l) return null; return hav(o.lat, o.lng, l.lat, l.lng); }
const fmtDist = d => d == null ? '' : d < 0.1 ? 'here' : d < 10 ? d.toFixed(1) + ' mi' : Math.round(d) + ' mi';

// ---------- sun, market, moon ----------
function sunTimes(date, lat = 26.44, lng = -82.09) {
  const rad = Math.PI / 180, dayMs = 864e5, J1970 = 2440588, J2000 = 2451545, e = rad * 23.4397, J0 = 0.0009;
  const toDays = d => d.valueOf() / dayMs - 0.5 + J1970 - J2000, fromJ = j => new Date((j + 0.5 - J1970) * dayMs);
  const lw = rad * -lng, phi = rad * lat, d = toDays(date), n = Math.round(d - J0 - lw / (2 * Math.PI));
  const ds = J0 + lw / (2 * Math.PI) + n, M = rad * (357.5291 + 0.98560028 * ds);
  const L = M + rad * (1.9148 * Math.sin(M) + 0.02 * Math.sin(2 * M) + 0.0003 * Math.sin(3 * M)) + rad * 102.9372 + Math.PI;
  const dec = Math.asin(Math.sin(e) * Math.sin(L)), Jnoon = J2000 + ds + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  const w = Math.acos((Math.sin(-0.833 * rad) - Math.sin(phi) * Math.sin(dec)) / (Math.cos(phi) * Math.cos(dec)));
  const Jset = J2000 + (J0 + (w + lw) / (2 * Math.PI) + n) + 0.0053 * Math.sin(M) - 0.0069 * Math.sin(2 * L);
  return { sunrise: fromJ(Jnoon - (Jset - Jnoon)), sunset: fromJ(Jset) };
}
function marketInfo(now = new Date()) {
  const p = new Date(now.toLocaleString('en-US', { timeZone: TZ }));
  const inSeason = d => d.getMonth() >= 9 || d.getMonth() <= 4;
  if (p.getDay() === 0 && inSeason(p)) return p.getHours() < 13 ? { v: 'Today 9–1', hot: true } : { v: 'Next Sunday' };
  if (!inSeason(p)) return { v: 'Back in October' };
  const d = new Date(p); d.setDate(d.getDate() + (7 - d.getDay()) % 7);
  return { v: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }) };
}
function moon(t) { const syn = 29.530588853, ref = Date.UTC(2000, 0, 6, 18, 14); const age = (((t - ref) / 864e5) % syn + syn) % syn; return ['New moon', 'Waxing crescent', 'First quarter', 'Waxing gibbous', 'Full moon', 'Waning gibbous', 'Last quarter', 'Waning crescent'][Math.floor(((age + syn / 16) % syn) / (syn / 8))]; }

// ---------- tides (NOAA predictions; Open-Meteo marine model as a backup) ----------
const ymd = d => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
async function tideStation() {
  if (C.tideStation) return C.tideStation;
  const c = lsGet('tide.station', null); if (c) return c;
  const r = await fetch('https://api.tidesandcurrents.noaa.gov/mdapi/prod/webapi/tidepredstations.json?lat=26.45&lon=-82.03&radius=12');
  const j = await r.json(); const list = j.stationList || j.stations || [];
  let best = null, bd = 1e9;
  for (const s of list) { const id = s.stationId || s.id, la = +(s.lat), lo = +(s.lon ?? s.lng); if (!id || isNaN(la)) continue; const d = hav(la, lo, 26.45, -82.03); if (d < bd) { bd = d; best = { id: String(id), name: s.name || s.stationName || '' }; } }
  if (!best) throw new Error('no station'); lsSet('tide.station', best); return best;
}
async function tidesNOAA() {
  const st = await tideStation(); const id = st.id || st;
  const url = `https://api.tidesandcurrents.noaa.gov/api/prod/datagetter?product=predictions&application=sanibels_calling&begin_date=${ymd(new Date(Date.now() - 864e5))}&range=96&datum=MLLW&station=${id}&time_zone=gmt&units=english&interval=hilo&format=json`;
  const j = await (await fetch(url)).json();
  if (!j.predictions) throw new Error('no predictions');
  return { src: 'NOAA' + (st.name ? ' · ' + st.name : ''), list: j.predictions.map(p => ({ t: Date.parse(p.t.replace(' ', 'T') + ':00Z'), h: +p.v, type: p.type === 'L' ? 'L' : 'H' })) };
}
async function tidesModel() {
  const j = await (await fetch('https://marine-api.open-meteo.com/v1/marine?latitude=26.43&longitude=-82.09&hourly=sea_level_height_msl&timezone=GMT&past_days=1&forecast_days=3')).json();
  const t = j.hourly.time.map(s => Date.parse(s + ':00Z')), v = j.hourly.sea_level_height_msl, list = [];
  for (let i = 1; i < v.length - 1; i++) {
    if (v[i] == null || v[i - 1] == null || v[i + 1] == null) continue;
    const lo = v[i] <= v[i - 1] && v[i] < v[i + 1], hi = v[i] >= v[i - 1] && v[i] > v[i + 1]; if (!lo && !hi) continue;
    const a = (v[i - 1] + v[i + 1] - 2 * v[i]) / 2, b = (v[i + 1] - v[i - 1]) / 2, off = a ? Math.max(-.5, Math.min(.5, -b / (2 * a))) : 0;
    list.push({ t: t[i] + off * 3600e3, h: +((v[i] + a * off * off + b * off) * 3.28084).toFixed(2), type: lo ? 'L' : 'H', rel: true });
  }
  return { src: 'Open-Meteo marine model (approximate)', list };
}
let tideData = lsGet('tides.v1', null), tidePromise = null;
function getTides() {
  if (tideData && Date.now() - tideData.at < 6 * 3600e3 && tideData.list.some(x => x.t > Date.now() + 6 * 3600e3)) return Promise.resolve(tideData);
  if (tidePromise) return tidePromise;
  tidePromise = (async () => {
    let d = null; try { d = await tidesNOAA(); } catch { try { d = await tidesModel(); } catch { } }
    if (d) { d.at = Date.now(); tideData = d; lsSet('tides.v1', d); }
    tidePromise = null; return tideData;
  })();
  return tidePromise;
}
const nextLows = (n = 2) => (tideData?.list || []).filter(x => x.type === 'L' && x.t > Date.now() - 45 * 60e3).slice(0, n);
const lowNear = t => (tideData?.list || []).filter(x => x.type === 'L').reduce((b, x) => !b || Math.abs(x.t - t) < Math.abs(b.t - t) ? x : b, null);
function lowLabel(l) {
  if (!l) return '';
  if (l.rel) return 'Low';
  return l.h <= 0 ? 'Negative low: great' : l.h <= 0.5 ? 'Low: good' : 'Shallow low';
}

// ---------- weather now (Open-Meteo) ----------
let wxNow = lsGet('wx.now', null);
async function getWx() {
  if (wxNow && Date.now() - wxNow.at < 45 * 60e3) return wxNow;
  try {
    const j = await (await fetch('https://api.open-meteo.com/v1/forecast?latitude=26.44&longitude=-82.09&current=temperature_2m,wind_speed_10m,wind_direction_10m,weather_code&hourly=wind_direction_10m,wind_speed_10m&past_days=2&forecast_days=1&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=GMT')).json();
    const c = j.current; const hs = j.hourly, now = Date.now();
    let w = 0; for (let i = 0; i < hs.time.length; i++) { const t = Date.parse(hs.time[i] + ':00Z'); if (t > now - 36 * 3600e3 && t <= now) { const d = hs.wind_direction_10m[i]; if (d >= 200 && d <= 340 && hs.wind_speed_10m[i] >= 10) w++; } }
    wxNow = { at: Date.now(), temp: Math.round(c.temperature_2m), wind: Math.round(c.wind_speed_10m), dir: c.wind_direction_10m, code: c.weather_code, westHours: w };
    lsSet('wx.now', wxNow);
  } catch { }
  return wxNow;
}

// ---------- my list (saved places) ----------
let saved = lsGet('saved', []);
const isSaved = id => saved.includes(id);
function toggleSave(id) { saved = isSaved(id) ? saved.filter(x => x !== id) : saved.concat(id); lsSet('saved', saved); toast(isSaved(id) ? 'Added to My list' : 'Removed from My list'); }

// ---------- shell walk storage (IndexedDB on this phone) ----------
const DB = (() => {
  let dbp = null; const mem = { walks: new Map(), photos: new Map() };
  function open() { if (dbp) return dbp; dbp = new Promise(res => { try { const r = indexedDB.open('sanibels-calling', 1); r.onupgradeneeded = () => { for (const s of ['walks', 'photos']) r.result.createObjectStore(s, { keyPath: 'id' }); }; r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch { res(null); } }); return dbp; }
  async function tx(store, mode, fn) { const db = await open(); if (!db) return fn(null, mem[store]); return new Promise((res, rej) => { const t = db.transaction(store, mode); const out = fn(t.objectStore(store)); t.oncomplete = () => res(out && out.result !== undefined ? out.result : out); t.onerror = () => rej(t.error); }); }
  return {
    all: s => tx(s, 'readonly', (st, m) => m ? [...m.values()] : st.getAll()),
    get: (s, id) => tx(s, 'readonly', (st, m) => m ? m.get(id) : st.get(id)),
    put: async (s, v) => { const r = await tx(s, 'readwrite', (st, m) => m ? m.set(v.id, v) : st.put(v)); mirror(s, 'put', v); return r; },
    del: async (s, id) => { const r = await tx(s, 'readwrite', (st, m) => m ? m.delete(id) : st.delete(id)); mirror(s, 'del', id); return r; }
  };
})();
function mirror(store, op, v) {
  if (!NATIVE.on) return;
  if (store === 'photos') return op === 'put' ? NATIVE.mirrorPhoto(v) : NATIVE.unmirrorPhoto(v);
  NATIVE.mirrorData(() => ({ walks }));
}
let walks = [], photoCache = new Map(), activeId = lsGet('activeWalk', null);
async function loadWalks() {
  walks = (await DB.all('walks')) || [];
  if (NATIVE.on && !walks.length) {
    const b = await NATIVE.readAutobackup();
    if (b && b.walks.length) { for (const p of b.photos) await DB.put('photos', p); for (const w of b.walks) await DB.put('walks', w); walks = b.walks; setTimeout(() => toast(`Shell log restored from this phone’s backup: ${walks.length} walk${walks.length === 1 ? '' : 's'}.`, null, 5000), 800); }
  }
  walks.sort((a, b) => b.start - a.start);
  if (activeId && !walks.find(w => w.id === activeId)) { activeId = null; lsSet('activeWalk', null); }
}
const W = id => walks.find(w => w.id === id);
async function saveWalk(w) { w.updated = Date.now(); await DB.put('walks', w); if (!walks.includes(w)) walks.unshift(w); walks.sort((a, b) => b.start - a.start); }
async function photo(id) { if (photoCache.has(id)) return photoCache.get(id); const p = await DB.get('photos', id); if (p) photoCache.set(id, p); return p; }
const total = w => Object.values(w.finds || {}).reduce((a, n) => a + n, 0);
