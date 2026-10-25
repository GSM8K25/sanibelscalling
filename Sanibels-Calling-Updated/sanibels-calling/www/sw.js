// Offline support: app files cached on install; map tiles and photos cached as you view them.
// content.json (your editable guide content) is always fetched fresh when there's a signal.
const APP = 'sanibels-calling-v1', TILES = 'sc-tiles-v1', PHOTOS = 'sc-photos-v1';
const CORE = ['./', 'index.html', 'app-core.js', 'app.js', 'native.js', 'map.js', 'qr.js', 'content.json', 'manifest.webmanifest', 'icon-180.png', 'icon-192.png', 'icon-512.png', 'img/logo.jpg', 'img/mark.png', 'fonts/YoungSerif.woff', 'fonts/PlusJakartaSans.woff'];
self.addEventListener('install', e => e.waitUntil(caches.open(APP).then(c => c.addAll(CORE)).then(() => self.skipWaiting())));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => ![APP, TILES, PHOTOS].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim())));
async function trim(name, max) { const c = await caches.open(name); const ks = await c.keys(); for (let i = 0; i < ks.length - max; i++) await c.delete(ks[i]); }
function cacheFirst(e, name, max) {
  e.respondWith(caches.open(name).then(async c => { const hit = await c.match(e.request); if (hit) return hit; try { const r = await fetch(e.request); if (r.ok || r.type === 'opaque') { c.put(e.request, r.clone()); trim(name, max); } return r; } catch { return hit || Response.error(); } }));
}
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const u = new URL(e.request.url);
  if (u.hostname.endsWith('tile.openstreetmap.org') || u.hostname === 'server.arcgisonline.com') return cacheFirst(e, TILES, 1500);
  if (u.hostname === 'upload.wikimedia.org') return cacheFirst(e, PHOTOS, 300);
  if (u.origin !== location.origin) return;            // APIs (tides, weather, Wikipedia) are cached by the app itself
  if (u.pathname.endsWith('/content.json') || u.pathname.endsWith('/editor.html') || u.pathname.endsWith('/editor.js')) {
    e.respondWith(fetch(e.request).then(r => { if (r.ok) { const cl = r.clone(); caches.open(APP).then(c => c.put(e.request, cl)); } return r; }).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => {
    const net = fetch(e.request).then(r => { if (r.ok) { const cl = r.clone(); caches.open(APP).then(c => c.put(e.request, cl)); } return r; }).catch(() => hit);
    return hit || net;
  }));
});
