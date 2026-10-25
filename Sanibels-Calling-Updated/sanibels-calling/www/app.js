/* Sanibel's Calling — screens and actions. Data helpers are in app-core.js. */
'use strict';

let view = lsGet('view', 'explore'), catSel = null, q = '', sortNear = false;
let sub = null;                                   // 'strategy' | 'notes' (full-page sub views)
let shellF = { q: '', g: 'all', freq: 'all', shape: null, color: null, id: false };
let logTab = 'walks', openWalk = null;
const sheet = $('#sheet');
const openSheet = html => { sheet.innerHTML = html; if (!sheet.open) sheet.showModal(); sheet.scrollTop = 0; };
const closeSheet = () => sheet.open && sheet.close();
sheet.addEventListener('click', e => { if (e.target === sheet) closeSheet(); });
const head = t => `<div style="position:sticky;top:0;z-index:2;background:var(--bg);display:flex;align-items:center;gap:10px;padding:14px 16px 10px;border-bottom:1px solid var(--line)"><h2 style="flex:1;font-size:24px">${t}</h2><button class="iconbtn" style="background:var(--surface2);color:var(--ink)" data-act="close" aria-label="Close">×</button></div>`;
const backBar = t => `<div class="back"><button class="iconbtn" data-act="back" aria-label="Back">${UI.back}</button><h2>${esc(t)}</h2></div>`;

// ================= EXPLORE =================
function tags(p) { return (p.tags || []).length ? `<div class="tags">${p.tags.map(t => `<span class="tag ${/free/i.test(t) ? 'free' : ''}">${esc(t)}</span>`).join('')}</div>` : ''; }
function card(p) {
  const d = dist(p);
  return `<div class="pcard"><button class="pic" data-open="${p.id}" style="border:0;padding:0" aria-label="${esc(p.n)}">${placePic(p)}</button>
    <div style="min-width:0"><button data-open="${p.id}" style="background:none;border:0;padding:0;text-align:left;width:100%"><div class="nm">${esc(p.n)}</div>
    <div class="meta">${esc(p.a)}${d != null ? ' · ' + fmtDist(d) : ''}</div>${p.d ? `<div class="ds">${esc(p.d)}</div>` : ''}</button>${tags(p)}
    <div class="acts"><a class="btn sm" href="${appleURL(p)}" target="_blank" rel="noopener" aria-label="Directions in Apple Maps">${UI.apple}Apple</a><a class="btn sm" href="${googleURL(p)}" target="_blank" rel="noopener" aria-label="Directions in Google Maps">${UI.google}Google</a><button class="btn sm ${isSaved(p.id) ? 'saved' : ''}" data-save="${p.id}" aria-label="Save">${isSaved(p.id) ? UI.heartFull : UI.heart}</button></div></div></div>`;
}
function listOf(arr) {
  let a = arr.slice(); if (sortNear && from()) a.sort((x, y) => (dist(x) ?? 1e9) - (dist(y) ?? 1e9));
  return a.length ? `<div class="list">${a.map(card).join('')}</div>` : '<div class="empty">Nothing matches that search.</div>';
}
function bookingCard() {
  const b = C.booking; if (!b.url) return '';
  return `<div class="book"><h3>${esc(b.title || 'Stay with us')}</h3>${b.text ? `<p>${esc(b.text)}</p>` : ''}<a class="btn" href="${esc(b.url)}" target="_blank" rel="noopener">${esc(b.button || 'Check dates & book')}</a></div>`;
}
function spotCard(x, kind) {
  const p = P[x.place] || {}; const st = sunTimes(new Date());
  const badge = kind === 'sun' ? `<span class="rank ${x.kind === 'sunrise' ? 'rise' : ''}">${x.kind === 'sunrise' ? 'Sunrise ' + fmtTime(st.sunrise) : x.kind === 'sunset' ? 'Sunset ' + fmtTime(st.sunset) : 'Sunrise & sunset'}</span>` : kind === 'hot' ? '<span class="rank" style="background:var(--gulf)">Shell hotspot</span>' : '';
  return `<button class="mcard sm" data-spot="${kind}:${x.id}"><div class="pic">${x.photo ? picHTML(x, '#13858C', 'sun') : placePic(p)}${badge}</div><div class="body"><div class="nm">${esc(x.name)}</div><div class="small muted">${esc(x.best || p.a || '')}</div></div></button>`;
}
function todayStrip() {
  const now = new Date(), st = sunTimes(now), mk = marketInfo(now), low = nextLows(1)[0];
  return `<div class="today">
    <div><div class="l">Sunrise</div><div class="v">${fmtTime(st.sunrise)}</div><div class="s">Sunset ${fmtTime(st.sunset)}</div></div>
    <div class="${low && !low.rel && low.h <= 0.5 ? 'hot' : ''}" role="button" data-go="shells" style="cursor:pointer"><div class="l">Next low tide</div><div class="v">${low ? (islandDay(low.t) !== islandDay(Date.now()) ? fmtDay(low.t).split(',')[0] + ' ' : '') + fmtTime(low.t) : '—'}</div><div class="s">${low ? (low.rel ? 'approximate' : low.h.toFixed(1) + ' ft · ' + lowLabel(low)) : 'Needs a signal'}</div></div>
    <div class="${mk.hot ? 'market' : ''}" role="button" data-open="farmers-market" style="cursor:pointer;grid-column:1/-1"><div class="l">Farmers market</div><div class="v">${mk.v}</div></div></div>`;
}
function noteCard(n) { return `<div class="note">${n.date ? `<div class="d">${esc(fmtDayLong(Date.parse(n.date + 'T12:00:00Z')))}</div>` : ''}<h3>${esc(n.title)}</h3>${md(n.body)}</div>`; }
const sortedNotes = () => C.notes.map((n, i) => [n, i]).sort(([a, ia], [b, ib]) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || String(b.date || '').localeCompare(String(a.date || '')) || ib - ia).map(([n]) => n);
function renderExplore() {
  if (q.trim()) {
    const s = q.trim().toLowerCase(); const hits = C.places.filter(p => (p.n + ' ' + p.a + ' ' + (p.d || '') + ' ' + (CAT[p.c]?.name || '') + ' ' + (p.tags || []).join(' ')).toLowerCase().includes(s));
    const sh = C.shells.filter(x => (x.name + ' ' + x.sci).toLowerCase().includes(s));
    return `<input class="search" id="q" placeholder="Search beaches, shells, tours, ice cream…" value="${esc(q)}" autocomplete="off">
      ${sh.length ? `<div class="sec"><h2>Shells</h2></div><div class="sgrid">${sh.map(shellCard).join('')}</div>` : ''}
      ${hits.length || !sh.length ? `<div class="sec"><h2>${hits.length} place${hits.length === 1 ? '' : 's'}</h2></div>${listOf(hits)}` : ''}`;
  }
  if (catSel) {
    const c = catSel === 'must' ? { name: 'Must-sees' } : CAT[catSel];
    const arr = catSel === 'must' ? C.places.filter(p => p.must).sort((a, b) => a.must - b.must) : C.places.filter(p => p.c === catSel);
    return `<div class="back"><button class="iconbtn" data-act="backCats" aria-label="Back">${UI.back}</button><h2>${esc(c?.name || '')}</h2></div>
      ${catNote(catSel)}<div class="chips"><button class="chip ${!sortNear ? 'on' : ''}" data-sort="0">Recommended</button><button class="chip ${sortNear ? 'on' : ''}" data-sort="1">Nearest</button></div>${listOf(arr)}`;
  }
  if (sub === 'notes') return `${backBar('Island notes')}<div class="list">${sortedNotes().map(noteCard).join('')}</div>`;
  const must = C.places.filter(p => p.must).sort((a, b) => a.must - b.must), notes = sortedNotes();
  return `<div class="hero-logo"><img src="img/logo.jpg" alt="Sanibel’s Calling: see why everyone falls in love with Sanibel." width="360" height="360"></div>
  <input class="search" id="q" placeholder="Search beaches, shells, tours, ice cream…" value="" autocomplete="off">
  ${todayStrip()}
  ${bookingCard()}
  ${notes.length ? `<div class="sec"><h2>Island notes</h2><span class="spacer"></span>${notes.length > 2 ? '<button class="linkbtn" data-act="allNotes">See all</button>' : ''}</div>${notes.slice(0, 2).map(noteCard).join('')}` : ''}
  <div class="sec"><h2>Must-sees</h2><span class="spacer"></span><button class="linkbtn" data-cat="must">See all</button></div>
  <div class="carousel">${must.map(p => `<button class="mcard" data-open="${p.id}"><div class="pic">${placePic(p)}<span class="rank">#${p.must}</span></div><div class="body"><div class="nm">${esc(p.n)}</div><div class="small muted">${esc(p.a)}</div></div></button>`).join('')}</div>
  ${C.sunspots.length ? `<div class="sec"><h2>Sunrise &amp; sunset spots</h2></div><div class="carousel">${C.sunspots.map(x => spotCard(x, 'sun')).join('')}</div>` : ''}
  ${C.favorites.length ? `<div class="sec"><h2>Local favorites</h2></div><div class="list">${C.favorites.map(favCard).join('')}</div>` : ''}
  <div class="sec"><h2>Explore by type</h2></div>
  <div class="cats">${C.cats.map(c => `<button class="cat" data-cat="${c.id}"><span class="ic" style="background:${c.color}">${icon(c.icon)}</span>${esc(c.name)}<span class="n">${C.places.filter(p => p.c === c.id).length}</span></button>`).join('')}</div>
  <p class="small muted">Listings checked ${esc(C.checked || '')}. Hours and seasons change, so tap through to Google Maps for today's hours before you go.</p>`;
}
function favCard(f) {
  const p = P[f.place] || {};
  return `<button class="pcard" data-spot="fav:${f.id}" style="cursor:pointer"><div class="pic">${f.photo ? picHTML(f, '#EE6A3C', 'heart') : placePic(p)}</div><div style="min-width:0"><div class="nm">${esc(f.name)}</div><div class="meta">${esc(f.tag || '')}${p.a ? ' · ' + esc(p.a) : ''}</div><div class="ds">${esc(String(f.body || '').replace(/\*\*/g, ''))}</div></div></button>`;
}
function catNote(c) {
  const notes = {
    shelling: '<div class="notice law"><b>Leave live shells on the beach.</b> In Lee County you may not keep any shell with a living animal inside (except oysters, hard clams, sunray venus and coquinas, with a fishing license).</div>',
    fishfree: '<div class="notice">Most anglers 16 and older need a Florida saltwater fishing license for shore and pier fishing. Get one at a bait shop or from Florida Fish and Wildlife online. Charters cover their customers.</div>',
    fishpaid: '<div class="notice">Charter captains’ licenses usually cover you, so no separate fishing license is needed. Book ahead in winter and spring.</div>',
    airboat: '<div class="notice">These are day trips: plan on 1¼ to 2 hours each way from Sanibel. Morning tours are cooler and often see more wildlife.</div>',
    everglades: '<div class="notice">About 1¾ hours from Sanibel. Pair a tour with lunch in Everglades City or Chokoloskee. Bring bug spray.</div>',
    music: '<div class="notice">Live music schedules change weekly. Check the venue’s site or call before heading out.</div>',
    beach: '<div class="notice">Most Sanibel beach lots charge by the hour (pay by app or at the pay station); Causeway Islands parking is free. Lots fill by mid-morning in season, so biking is easiest.</div>'
  };
  return notes[c] || '';
}
function openPlace(id) {
  const p = P[id]; if (!p) return; const c = CAT[p.c] || {}, d = dist(p);
  openSheet(`<div style="position:relative"><div class="pic hero">${placePic(p, true)}</div><button class="sheet-x" data-act="close" aria-label="Close">×</button></div>
  <div class="sheet-b"><div><div class="small" style="color:${c.color};font-weight:800;letter-spacing:.04em;text-transform:uppercase">${esc(c.name || '')}${p.must ? ` · Must-see #${p.must}` : ''}</div><h2>${esc(p.n)}</h2><div class="muted">${esc(p.a)}${d != null ? ' · ' + fmtDist(d) + (origin ? ' from ' + esc(origin.label) : ' away') : ''}</div></div>
    ${p.d ? `<p style="margin:0">${esc(p.d)}</p>` : ''}${p.tip ? `<div class="notice"><b>Tip:</b> ${esc(p.tip)}</div>` : ''}${p.when ? `<div class="small"><b>When:</b> ${esc(p.when)}</div>` : ''}${tags(p)}
    <div class="addr"><span>${esc(p.addr)}</span><button class="btn sm" data-copy="${esc(p.addr)}">Copy</button></div>
    <div class="dir"><a class="btn primary" href="${appleURL(p)}" target="_blank" rel="noopener">${UI.apple}Apple Maps</a><a class="btn sun" href="${googleURL(p)}" target="_blank" rel="noopener">${UI.google}Google Maps</a></div>
    <div class="acts" style="margin-top:0">${p.web ? `<a class="btn sm" href="${esc(p.web)}" target="_blank" rel="noopener">${UI.web}Website</a>` : ''}<a class="btn sm" href="${googleSearch(p)}" target="_blank" rel="noopener">${UI.photo}Photos, hours &amp; reviews</a>
      <button class="btn sm ${isSaved(p.id) ? 'saved' : ''}" data-save="${p.id}">${isSaved(p.id) ? UI.heartFull + 'Saved' : UI.heart + 'Save to My list'}</button></div>
    ${catNote(p.c)}<p class="small muted" style="margin:0">Checked ${esc(C.checked || '')}. Hours and prices change, so confirm before you go.</p></div>`);
}
// hotspot / sun spot / favorite detail
function openSpot(key) {
  const [kind, id] = key.split(':'); const list = kind === 'hot' ? C.hotspots : kind === 'sun' ? C.sunspots : C.favorites;
  const x = list.find(v => v.id === id); if (!x) return; const p = P[x.place]; const st = sunTimes(new Date()), d = dist(x);
  const label = kind === 'hot' ? 'Shell hotspot' : kind === 'sun' ? (x.kind === 'sunrise' ? `Sunrise spot · today ${fmtTime(st.sunrise)}` : x.kind === 'sunset' ? `Sunset spot · today ${fmtTime(st.sunset)}` : `Sunrise ${fmtTime(st.sunrise)} · sunset ${fmtTime(st.sunset)}`) : 'Local favorite' + (x.tag ? ' · ' + x.tag : '');
  openSheet(`<div style="position:relative"><div class="pic hero">${x.photo ? picHTML(x, '#13858C', 'sun', true) : p ? placePic(p, true) : artFor(x, '#13858C', 'star')}</div><button class="sheet-x" data-act="close" aria-label="Close">×</button></div>
  <div class="sheet-b"><div><div class="small" style="color:var(--gulf);font-weight:800;letter-spacing:.04em;text-transform:uppercase">${esc(label)}</div><h2>${esc(x.name)}</h2>${p || d != null ? `<div class="muted">${p ? esc(p.a) : ''}${d != null ? ' · ' + fmtDist(d) + ' away' : ''}</div>` : ''}</div>
    ${x.best ? `<div class="notice"><b>Best:</b> ${esc(x.best)}</div>` : ''}
    ${md(x.body)}
    ${kind === 'hot' && (x.shells || []).length ? `<div><div class="small muted" style="font-weight:800;text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Shells to look for</div><div class="chips wrap">${x.shells.filter(s => SH[s]).map(s => `<button class="chip" data-shell="${s}">${esc(SH[s].name)}</button>`).join('')}</div></div>` : ''}
    ${kind === 'hot' && nextLows(1)[0] ? `<div class="small"><b>Next low tide:</b> ${fmtDay(nextLows(1)[0].t)} ${fmtTime(nextLows(1)[0].t)}</div>` : ''}
    <div class="dir"><a class="btn primary" href="${appleURL(x)}" target="_blank" rel="noopener">${UI.apple}Apple Maps</a><a class="btn sun" href="${googleURL(x)}" target="_blank" rel="noopener">${UI.google}Google Maps</a></div>
    ${p ? `<button class="btn sm" data-open="${p.id}" style="justify-self:start">More about ${esc(p.n)}</button>` : ''}</div>`);
}

// ================= SHELLS =================
const SHAPES = [['spindle', 'Spindle'], ['conch', 'Conch'], ['cone', 'Cone'], ['round', 'Round snail'], ['cylinder', 'Bullet'], ['murex', 'Spiky ridges'], ['tall spiral', 'Tall spiral'], ['ear', 'Ear'], ['slipper', 'Slipper / cup'], ['fan', 'Fan'], ['heart', 'Ribbed clam'], ['clam', 'Clam'], ['long oval', 'Long oval'], ['wedge', 'Small wedge'], ['disc', 'Flat disc']];
const COLORS = ['white', 'cream', 'tan', 'brown', 'orange', 'red', 'pink', 'purple', 'yellow', 'gray', 'black', 'blue', 'green'];
const SWATCH = { white: '#fff', cream: '#F3E7C9', tan: '#D2B48C', brown: '#7B4B2A', orange: '#F08A2C', red: '#C9302C', pink: '#F4A6C1', purple: '#8E5BB5', yellow: '#F5D33B', gray: '#9AA3A8', black: '#222', blue: '#5B8DD6', green: '#6FA36B', maroon: '#7A1F2B', silver: '#C9CED3' };
const foundCount = id => walks.reduce((a, w) => a + ((w.finds || {})[id] || 0), 0);
function shellCard(s) {
  const n = foundCount(s.id);
  return `<button class="scard" data-shell="${s.id}"><div class="pic">${shellPic(s)}${n ? `<span class="got">✓ ${n}</span>` : ''}</div><div class="b"><div class="nm">${esc(s.name)}</div><div class="sci">${esc(String(s.sci).replace(/\s*\(?[A-Z][^()]*\d{4}\)?$/, ''))}</div><div class="freq ${esc(String(s.freq).split(' ')[0])}">${esc(s.freq)}</div></div></button>`;
}
function filteredShells() {
  const f = shellF, s = f.q.trim().toLowerCase();
  return C.shells.filter(x => (f.g === 'all' || x.g === f.g) && (f.freq === 'all' || (f.freq === 'rare' ? /rare/i.test(x.freq) : x.freq === f.freq)) && (!f.shape || x.shape === f.shape) && (!f.color || (x.colors || []).includes(f.color)) && (!s || (x.name + ' ' + x.sci + ' ' + x.fam + ' ' + (x.colors || []).join(' ')).toLowerCase().includes(s)));
}
function outlookCard() {
  const lows = nextLows(2), w = wxNow;
  const westNote = w && w.westHours >= 6 ? 'Onshore west winds over the last day and a half: fresh shells likely on Gulf beaches.' : w && w.dir >= 200 && w.dir <= 340 && w.wind >= 10 ? 'West wind blowing now: good sign for the next low tide.' : '';
  return `<div class="card" style="display:grid;gap:8px"><div class="row"><div style="font:20px var(--display)">Shelling outlook</div><span class="spacer"></span><span class="small muted">${esc(moon(Date.now()))}</span></div>
    ${lows.length ? `<div class="wx">${lows.map(l => `<div><div class="l">${islandDay(l.t) === islandDay(Date.now()) ? 'Low tide today' : 'Low tide ' + esc(fmtDay(l.t).split(',')[0])}</div><div class="v">${fmtTime(l.t)}</div><div class="small muted">${l.rel ? 'approximate' : l.h.toFixed(1) + ' ft · ' + esc(lowLabel(l))}</div></div>`).join('')}</div>` : '<div class="small muted">Tide times need a signal. Try again when you’re online.</div>'}
    ${w ? `<div class="small"><b>Wind:</b> ${compass(w.dir)} ${w.wind} mph · ${w.temp}°F${westNote ? ' · ' + westNote : ''}</div>` : ''}
    <div class="small muted">Best shelling: an hour either side of low tide, especially after a front or west wind. ${tideData ? 'Tides: ' + esc(tideData.src) + '.' : ''}</div></div>`;
}
function renderShells() {
  if (sub === 'strategy') return `${backBar('Shell-finding strategy')}<div class="steps">${C.strategy.map(s => `<div class="step"><h3>${esc(s.title)}</h3>${md(s.body)}</div>`).join('')}</div>
    <div class="notice law"><b>Leave live shells.</b> In Lee County you may not keep any shell with a living animal inside, except oysters, hard clams, sunray venus and coquinas (fishing license required). <a href="https://myfwc.com/fishing/saltwater/recreational/sea-shells/" target="_blank" rel="noopener" style="color:var(--sunset);font-weight:700">FWC shell rules</a></div>${bookingCard()}`;
  const list = filteredShells(), f = shellF;
  const chip = (k, v, l) => `<button class="chip ${f[k] === v ? 'on' : ''}" data-sf="${k}:${v}">${esc(l)}</button>`;
  return `<button class="banner" data-act="strategy"><span class="ic">${icon('book')}</span><span><b>Shell-finding strategy</b><span class="small muted">When, where and how to find the good ones</span></span>${UI.chev}</button>
  ${outlookCard()}
  ${C.hotspots.length ? `<div class="sec"><h2>Shell hotspots</h2></div><div class="carousel">${C.hotspots.map(x => spotCard(x, 'hot')).join('')}</div>` : ''}
  <div class="sec"><h2>Shell guide</h2><span class="spacer"></span><span class="small muted">${C.shells.length} shells</span></div>
  <input class="search" id="sq" placeholder="Search shells by name or color" value="${esc(f.q)}" autocomplete="off">
  <div class="chips">${chip('g', 'all', 'All')}${chip('g', 'univalve', 'Snail shells')}${chip('g', 'bivalve', 'Clam shells')}${chip('g', 'other', 'Sand dollars')}<span style="width:8px;flex:none"></span>${chip('freq', 'Common', 'Common')}${chip('freq', 'Uncommon', 'Uncommon')}${chip('freq', 'rare', 'Rare finds')}</div>
  <button class="linkbtn" data-act="toggleId" style="justify-self:start">${f.id ? 'Hide' : 'Help me identify a shell'} ›</button>
  ${f.id ? `<div class="filters card"><div class="lab">Shape</div><div class="chips wrap">${SHAPES.filter(([k]) => C.shells.some(s => s.shape === k)).map(([k, l]) => `<button class="chip ${f.shape === k ? 'on' : ''}" data-sf="shape:${k}">${esc(l)}</button>`).join('')}</div>
    <div class="lab">Main color</div><div class="chips wrap">${COLORS.map(c => `<button class="chip ${f.color === c ? 'on' : ''}" data-sf="color:${c}"><span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${SWATCH[c]};border:1px solid var(--line);vertical-align:-1px"></span> ${c}</button>`).join('')}</div>
    ${f.shape || f.color ? '<button class="btn sm" data-act="clearId" style="justify-self:start">Clear shape &amp; color</button>' : ''}</div>` : ''}
  ${list.length ? `<div class="sgrid">${list.map(shellCard).join('')}</div>` : '<div class="empty">No shells match. Try fewer filters.</div>'}
  <div class="notice law"><b>Leave live shells.</b> If anything is inside, even a hermit crab, put it back in the water. Live sand dollars are brown and fuzzy.</div>
  <p class="small muted">Names checked against the Bailey-Matthews National Shell Museum’s Southwest Florida shell guide. How often you’ll find each is a rule of thumb and changes with storms and seasons.</p>`;
}
function openShell(id) {
  const s = SH[id]; if (!s) return; const n = foundCount(id), act = W(activeId);
  const alike = esc(s.alike || '').replace(/\[\[([^\]]+)\]\]/g, (m, k) => SH[k] ? `<button class="xref" data-shell="${k}">${esc(SH[k].name)}</button>` : esc(k));
  const spots = C.hotspots.filter(h => (h.shells || []).includes(id));
  openSheet(`<div style="position:relative"><div class="pic hero sq">${shellPic(s, true)}</div><button class="sheet-x" data-act="close" aria-label="Close">×</button></div>
  <div class="sheet-b"><div><div class="freq ${esc(String(s.freq).split(' ')[0])}">${esc(s.freq)}${n ? ` · you’ve logged ${n}` : ''}</div><h2>${esc(s.name)}</h2><div class="muted"><i>${esc(s.sci)}</i> · ${esc(s.fam)}</div></div>
    <div class="facts"><div><div class="l">Size</div><div class="v">${esc(s.size)}</div></div><div><div class="l">Type</div><div class="v">${s.g === 'univalve' ? 'Snail shell' : s.g === 'bivalve' ? 'Clam shell' : 'Not a shell'}</div></div><div><div class="l">Found</div><div class="v">${esc(s.freq)}</div></div></div>
    <div><h3 style="font-size:19px;margin-bottom:4px">How to tell</h3><ul class="idp">${(s.idp || []).map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
    ${s.alike ? `<div><h3 style="font-size:19px;margin-bottom:4px">Don’t confuse with</h3><div>${alike}</div></div>` : ''}
    ${s.where ? `<div><h3 style="font-size:19px;margin-bottom:4px">Where &amp; when</h3><div>${esc(s.where)}</div></div>` : ''}
    ${s.note ? `<div class="notice"><b>Our tip:</b> ${md(s.note)}</div>` : ''}
    ${s.fact ? `<div class="small"><b>Did you know?</b> ${esc(s.fact)}</div>` : ''}
    ${spots.length ? `<div class="chips wrap">${spots.map(h => `<button class="chip" data-spot="hot:${h.id}">${icon('pin', 'width="14" height="14" style="vertical-align:-2px"')} ${esc(h.name)}</button>`).join('')}</div>` : ''}
    ${act ? `<button class="btn primary big" data-act="logShell" data-sp="${id}">+ Add to today’s walk</button>` : `<button class="btn big" data-act="startWalk">Start a shell walk</button>`}
    ${s.ref ? `<a class="small" href="${esc(s.ref)}" target="_blank" rel="noopener" style="color:var(--gulf);font-weight:700">Check it in the Shell Museum / reference guide ›</a>` : ''}
</div>`);
}

// ================= SHELL LOG (walks) =================
const PIN = { pile: { l: 'Shell pile', c: '#13858C' }, hotspot: { l: 'My hotspot', c: '#EE6A3C' }, find: { l: 'Great find', c: '#E3A72F' }, live: { l: 'Live shells (left them)', c: '#7A86A8' }, note: { l: 'Note', c: '#9C6ADE' } };
function nearestSpotName(lat, lng) {
  const cands = [...C.hotspots.map(h => ({ n: h.name, l: loc(h) })), ...C.places.filter(p => p.c === 'beach').map(p => ({ n: p.n, l: LL(p) }))].filter(x => x.l);
  let best = null, bd = 0.6; for (const x of cands) { const d = hav(lat, lng, x.l.lat, x.l.lng); if (d < bd) { bd = d; best = x.n; } } return best;
}
async function startWalk(manual) {
  const t = Date.now();
  const w = { id: uid(), start: manual ? t - 2 * 3600e3 : t, end: manual ? t : null, lat: null, lng: null, spotName: '', finds: {}, checked: [], specials: [], photos: [], pins: [], route: [], notes: '', wx: null, low: null, moon: moon(t) };
  const last = walks[0]; if (last) w.checked = (last.checked || []).slice(0, 12);
  if (!manual) { activeId = w.id; lsSet('activeWalk', w.id); }
  await saveWalk(w); openWalk = w.id; view = 'log'; lsSet('view', 'log'); closeSheet(); render();
  if (!manual) {
    toast('Getting your location, tide and wind…', null, 5000);
    const [p] = await Promise.all([getPos(), getTides(), getWx()]);
    if (p) { w.lat = p.lat; w.lng = p.lng; w.spotName = nearestSpotName(p.lat, p.lng) || ''; }
    const l = lowNear(w.start); if (l) w.low = { t: l.t, h: l.h, rel: !!l.rel };
    if (wxNow) w.wx = { temp: wxNow.temp, wind: wxNow.wind, dir: wxNow.dir };
    await saveWalk(w); render(); toast(w.spotName ? `Walk started at ${w.spotName}. Happy shelling!` : 'Walk started. Happy shelling!');
  }
}
async function endWalk(id) { stopRoute(); NATIVE.on && NATIVE.tap('success'); const w = W(id); w.end = Date.now(); await saveWalk(w); if (activeId === id) { activeId = null; lsSet('activeWalk', null); } openWalk = id; render(); toast('Walk saved to your shell log.'); }
async function bump(id, sp, d) {
  const w = W(id); if (!w) return; const v = (w.finds[sp] || 0) + d; if (v < 0) return;
  w.finds[sp] = v; if (!w.checked.includes(sp)) w.checked.push(sp); NATIVE.on && NATIVE.tap(d > 0 ? 'medium' : 'light');
  await saveWalk(w); document.querySelectorAll(`[data-count="sp:${sp}"]`).forEach(el => el.textContent = v); document.querySelectorAll('[data-count=total]').forEach(el => el.textContent = total(w));
  if (d > 0) toast(`+1 ${SH[sp]?.name || 'shell'} · ${total(w)} today`, () => bump(id, sp, -1));
}
// route: records your path while the app is open
let routeWatch = null, routeWeb = null;
function routeOn() { return routeWatch != null || routeWeb != null; }
async function startRoute(id) {
  const add = p => { const w = W(id); if (!w || w.end) return stopRoute(); const r = w.route; const last = r[r.length - 1]; if (p.acc > 60) return; if (last && hav(last[0], last[1], p.lat, p.lng) < 0.006) return; r.push([+p.lat.toFixed(6), +p.lng.toFixed(6), Date.now()]); saveWalk(w); if (view === 'map') MAPV.draw(); };
  if (NATIVE.on) routeWatch = await NATIVE.watch(add);
  else if (navigator.geolocation) routeWeb = navigator.geolocation.watchPosition(p => add({ lat: p.coords.latitude, lng: p.coords.longitude, acc: p.coords.accuracy }), () => { }, { enableHighAccuracy: true, maximumAge: 5000 });
  lsSet('routeOn', id); render(); toast('Recording your route while the app is open.');
}
function stopRoute() { if (routeWatch != null) NATIVE.clearWatch(routeWatch); if (routeWeb != null) navigator.geolocation.clearWatch(routeWeb); routeWatch = routeWeb = null; lsSet('routeOn', null); }
const miles = r => { let m = 0; for (let i = 1; i < r.length; i++) m += hav(r[i - 1][0], r[i - 1][1], r[i][0], r[i][1]); return m; };
async function photosHTML(ids, ctx) {
  const ps = (await Promise.all((ids || []).map(photo))).filter(Boolean);
  return `<div class="photos">${ps.map(p => `<div class="ph"><img src="${p.data}" alt="Photo" data-act="viewPhoto" data-id="${p.id}"><button type="button" class="del" data-act="delPhoto" data-ctx="${ctx}" data-id="${p.id}" aria-label="Delete photo">×</button></div>`).join('')}</div>
  <div class="row" style="margin-top:8px"><button type="button" class="btn sm" data-act="addPhoto" data-ctx="${ctx}" data-lib="0">${UI.cam}Take photo</button><button type="button" class="btn sm" data-act="addPhoto" data-ctx="${ctx}" data-lib="1">From library</button></div>`;
}
async function walkHTML(w) {
  const isA = w.id === activeId, tot = total(w), sps = (w.checked || []).filter(id => SH[id]);
  let html = `<div class="card walkcard"><div class="row" style="align-items:flex-start;flex-wrap:nowrap"><div style="flex:1;min-width:0"><div class="small muted" style="font-weight:800;text-transform:uppercase;letter-spacing:.05em">${isA ? 'Shelling now' : esc(fmtDayLong(w.start))}</div>
      <button class="where" data-act="nameWalk" data-id="${w.id}">${esc(w.spotName || 'Name this beach')} <span style="color:var(--sunset);font-size:16px">✎</span></button>
      <div class="small muted">${fmtTime(w.start)}${w.end ? '–' + fmtTime(w.end) : ''}${w.route?.length > 1 ? ' · ' + miles(w.route).toFixed(1) + ' mi walked' : ''}</div></div>
      ${isA ? (routeOn() ? '<span class="rec"><i></i>Route</span>' : `<button class="btn sm" data-act="route" data-id="${w.id}">${UI.loc}Track route</button>`) : ''}</div>
    <div class="wx"><div><div class="l">Low tide</div><div class="v">${w.low ? fmtTime(w.low.t) : '—'}</div><div class="small muted">${w.low && !w.low.rel ? w.low.h.toFixed(1) + ' ft' : ''}</div></div>
      <div><div class="l">Wind</div><div class="v">${w.wx ? compass(w.wx.dir) + ' ' + w.wx.wind : '—'}</div><div class="small muted">${w.wx ? w.wx.temp + '°F · ' : ''}${esc(w.moon || '')}</div></div></div></div>
  <div class="tallies"><div class="total"><div class="n" data-count="total">${tot}</div><div class="l">Shells</div></div>
    <div class="kpi"><div class="l">Kinds</div><div class="v">${Object.values(w.finds).filter(n => n > 0).length}</div></div>
    <div class="kpi"><div class="l">Special</div><div class="v">${w.specials.length}</div></div></div>
  <div class="sec"><h2>Finds</h2><span class="muted small">tap + for each shell you keep</span></div>
  <div class="splist">${sps.map(id => `<div class="sprow"><button class="pic" data-shell="${id}" style="border:0;padding:0">${shellPic(SH[id])}</button><div style="min-width:0"><div class="nm">${esc(SH[id].name)}</div><div class="small muted">${esc(SH[id].freq)}</div></div>
    <div class="ctr"><button class="pmb" data-act="bump" data-sp="${id}" data-d="-1" data-id="${w.id}" aria-label="One less ${esc(SH[id].name)}">−</button><div class="n" data-count="sp:${id}">${w.finds[id] || 0}</div><button class="pmb plus" data-act="bump" data-sp="${id}" data-d="1" data-id="${w.id}" aria-label="One more ${esc(SH[id].name)}">+</button></div></div>`).join('')}
    <button class="addsp" data-act="checklist" data-id="${w.id}">${sps.length ? '+ Add or remove shells' : '+ Pick shells to count'}</button></div>
  <div class="sec"><h2>Special finds</h2><span class="spacer"></span><button class="btn sm" data-act="newSpecial" data-id="${w.id}">+ Find</button></div>`;
  if (w.specials.length) { html += '<div class="splist">'; for (const n of w.specials) { const p = n.photos?.[0] ? await photo(n.photos[0]) : null; html += `<button class="item" data-act="openSpecial" data-id="${w.id}" data-n="${n.id}"><div style="min-width:0"><div class="t">${esc(SH[n.sp]?.name || 'Shell')}</div><div class="d">${esc((n.notes || '').slice(0, 90))}</div></div>${p ? `<img src="${p.data}" alt="" style="width:60px;height:60px;object-fit:cover;border-radius:10px">` : '<span></span>'}</button>`; } html += '</div>'; }
  else html += '<div class="muted small" style="margin-top:-6px">A junonia, a perfect lion’s paw, your kid’s first lightning whelk: give it its own entry with photos.</div>';
  html += `<div class="sec"><h2>Photos</h2></div><div>${await photosHTML(w.photos, 'walk:' + w.id)}</div>
  <div class="sec"><h2>Marked spots</h2><span class="spacer"></span><button class="btn sm" data-act="markHere" data-id="${w.id}">${UI.pin}Mark here</button></div>
  ${w.pins.length ? `<div class="splist">${w.pins.map(p => `<button class="item" data-act="openPin" data-id="${w.id}" data-p="${p.id}"><div><div class="t" style="font-size:17px"><span style="color:${PIN[p.type]?.c}">●</span> ${esc(p.name || PIN[p.type]?.l)}</div><div class="d">${fmtTime(p.t)} · ${fmtLL(p.lat, p.lng)}</div></div><span></span></button>`).join('')}</div>` : '<div class="muted small" style="margin-top:-6px">Mark shell piles and your own hotspots so you can find them next time.</div>'}
  ${w.pins.length || w.route?.length > 1 || w.lat != null ? '<div class="minimap" id="wmap"></div>' : ''}
  <label class="f">Notes<textarea id="wNotes" data-id="${w.id}" placeholder="Tide, wind, where the shell line was, what you’d try next time…">${esc(w.notes)}</textarea></label>
  <div class="row">${isA ? `<button class="btn primary" style="flex:1" data-act="endWalk" data-id="${w.id}">End walk &amp; save</button>` : ''}<button class="btn" style="flex:1" data-act="shareWalk" data-id="${w.id}">${UI.share}Share</button></div>
  ${isA ? '' : `<div class="row"><button class="btn sm" data-act="backLog">${UI.back.replace('width="26" height="26"', 'width="18" height="18"')}All walks</button><span class="spacer"></span><button class="btn danger sm" data-act="delWalk" data-id="${w.id}">Delete this walk</button></div>`}`;
  return html;
}
function walkItem(w) {
  const sps = Object.entries(w.finds || {}).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]);
  return `<button class="item" data-act="openWalk" data-id="${w.id}"><div style="min-width:0"><div class="t">${esc(w.spotName || 'Shell walk')}${w.id === activeId ? ' <span style="color:var(--sunset)">· now</span>' : ''}</div><div class="d">${fmtDay(w.start)}${w.low ? ' · low ' + fmtTime(w.low.t) : ''}${w.wx ? ` · ${compass(w.wx.dir)} ${w.wx.wind}` : ''}</div></div>
    <div class="big">${total(w)}<small>shells</small></div>${sps.length ? `<div class="sps">${sps.slice(0, 6).map(([id, n]) => `<span class="pill">${esc(SH[id]?.name || id)} ${n}</span>`).join('')}</div>` : ''}</button>`;
}
function renderLog() {
  const w = W(openWalk) || W(activeId);
  if (w && logTab === 'walks') return null; // async walk view
  const tabs = `<div class="chips"><button class="chip ${logTab === 'walks' ? 'on' : ''}" data-ltab="walks">Walks</button><button class="chip ${logTab === 'stats' ? 'on' : ''}" data-ltab="stats">My shell stats</button></div>`;
  if (logTab === 'stats') return tabs + renderStats();
  const low = nextLows(1)[0];
  return `<div class="card" style="display:grid;gap:10px"><div style="font:22px var(--display)">Shell log</div>
    <button class="btn sun big" data-act="startWalk">Start a shell walk</button>
    <div class="small muted">Saves the time, beach, tide and wind. Then tap + as you find shells${low ? ` · next low tide ${fmtDay(low.t).split(',')[0]} ${fmtTime(low.t)}` : ''}.</div>
    <button class="btn sm" data-act="pastWalk" style="justify-self:start">+ Log a past walk</button></div>
  ${tabs}
  ${walks.length ? `<div class="list">${walks.map(walkItem).join('')}</div>` : '<div class="empty">No walks yet. Your shell log stays private on this phone.</div>'}`;
}
function renderStats() {
  const by = {}; walks.forEach(w => Object.entries(w.finds || {}).forEach(([k, n]) => { if (n) by[k] = (by[k] || 0) + n; }));
  const rows = Object.entries(by).sort((a, b) => b[1] - a[1]), max = rows[0]?.[1] || 1, totalShells = rows.reduce((a, [, n]) => a + n, 0);
  const life = C.shells.filter(s => by[s.id]), pct = Math.round(life.length / Math.max(1, C.shells.length) * 100);
  const beaches = {}; walks.forEach(w => { const k = w.spotName || 'Unnamed'; beaches[k] = beaches[k] || { n: 0, s: 0 }; beaches[k].n++; beaches[k].s += total(w); });
  const missing = C.shells.filter(s => !by[s.id]);
  return `<div class="kpis"><div class="kpi"><div class="l">Walks</div><div class="v">${walks.length}</div></div><div class="kpi"><div class="l">Shells</div><div class="v">${totalShells}</div></div><div class="kpi"><div class="l">Kinds</div><div class="v">${life.length}</div></div></div>
  <div class="card" style="display:grid;gap:8px"><div class="row"><b>Life list</b><span class="spacer"></span><span class="small muted">${life.length} of ${C.shells.length} in the guide</span></div><div class="progress"><i style="width:${pct}%"></i></div>
    ${missing.length ? `<div class="small muted">Still to find: ${missing.slice(0, 8).map(s => `<button class="xref" data-shell="${s.id}">${esc(s.name)}</button>`).join(', ')}${missing.length > 8 ? '…' : ''}</div>` : '<div class="small">You’ve found every shell in the guide. Legend.</div>'}</div>
  <div class="card" style="display:grid;gap:10px"><b>By shell</b>${rows.map(([id, n]) => `<div class="hbar"><span>${esc(SH[id]?.name || id)}</span><span>${n}</span><div class="track"><i style="width:${(n / max * 100).toFixed(0)}%"></i></div></div>`).join('') || '<div class="small muted">No shells logged yet.</div>'}</div>
  <div class="card" style="display:grid;gap:6px"><b>Best beaches</b>${Object.entries(beaches).sort((a, b) => b[1].s / b[1].n - a[1].s / a[1].n).map(([k, v]) => `<div class="row small"><span>${esc(k)}</span><span class="spacer"></span><span>${v.n} walk${v.n > 1 ? 's' : ''} · ${(v.s / v.n).toFixed(1)} per walk</span></div>`).join('') || '<div class="small muted">Not enough walks yet.</div>'}</div>
  <div class="card" style="display:grid;gap:10px"><b>Your data</b><div class="small muted">Your shell log stays on this phone. Save a backup now and then, and before switching phones.</div>
    <div class="row"><button class="btn sm" data-act="exportData">Save backup</button><button class="btn sm" data-act="importData">Restore backup</button><button class="btn sm" data-act="exportCSV">Spreadsheet (CSV)</button></div></div>`;
}
// sheets used by the log
function openChecklist(id) {
  const w = W(id);
  openSheet(`${head('Shells to count')}<div class="sheet-b"><input class="search" id="ckq" placeholder="Search shells" autocomplete="off"><div class="small muted">Check the shells you want counters for. You can add more any time.</div>
    <div id="cklist">${C.shells.map(s => `<button class="ck ${w.checked.includes(s.id) ? 'on' : ''}" data-ck="${s.id}"><span class="pic">${shellPic(s)}</span><span><b>${esc(s.name)}</b><br><span class="small muted">${esc(s.freq)}${w.finds[s.id] ? ' · ' + w.finds[s.id] + ' today' : ''}</span></span><span class="box">${UI.check}</span></button>`).join('')}</div></div>
    <div class="sheet-f"><button class="btn primary" data-act="close">Done</button></div>`);
  $('#ckq').oninput = e => { const qq = e.target.value.toLowerCase(); sheet.querySelectorAll('[data-ck]').forEach(b => b.hidden = qq && !SH[b.dataset.ck].name.toLowerCase().includes(qq)); };
  sheet.querySelectorAll('[data-ck]').forEach(b => b.onclick = async () => { const s = b.dataset.ck, on = w.checked.includes(s); if (on && w.finds[s]) { if (!b.dataset.armed) { b.dataset.armed = 1; toast(`Tap again to remove ${w.finds[s]} ${SH[s].name}`); return; } delete w.finds[s]; } w.checked = on ? w.checked.filter(x => x !== s) : w.checked.concat(s); b.classList.toggle('on', !on); await saveWalk(w); });
  sheet.addEventListener('close', () => render(), { once: true });
}
const shellSelect = cur => `<select name="sp">${['univalve', 'bivalve', 'other'].map(g => `<optgroup label="${g === 'univalve' ? 'Snail shells' : g === 'bivalve' ? 'Clam shells' : 'Other'}">${C.shells.filter(s => s.g === g).map(s => `<option value="${s.id}" ${s.id === cur ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</optgroup>`).join('')}</select>`;
function openSpecial(wid, nid) {
  const w = W(wid), n = w.specials.find(x => x.id === nid);
  openSheet(`${head('Special find')}<form id="NF" class="sheet-b"><label class="f">Shell${shellSelect(n.sp)}</label><label class="f">Notes<textarea name="notes" placeholder="Size, condition, exactly where you found it…">${esc(n.notes)}</textarea></label><div id="nph"></div></form>
    <div class="sheet-f"><button class="btn danger" data-act="delSpecial" data-id="${wid}" data-n="${nid}">Delete</button><button class="btn primary" data-act="saveSpecial" data-id="${wid}" data-n="${nid}">Save</button></div>`);
  photosHTML(n.photos, `special:${wid}:${nid}`).then(x => { const el = $('#nph'); if (el) el.innerHTML = x; });
}
async function saveSpecialForm(wid, nid) { const w = W(wid), n = w.specials.find(x => x.id === nid), F = $('#NF'); if (!F) return; n.sp = F.sp.value; n.notes = F.notes.value; await saveWalk(w); }
async function addPin(wid, lat, lng) {
  const w = W(wid);
  if (lat == null) { toast('Getting your location…', null, 5000); const p = await getPos(); if (!p) return toast('No GPS fix. On the Map tab, long-press the spot instead.'); lat = p.lat; lng = p.lng; }
  const p = { id: uid(), type: 'pile', name: '', notes: '', lat, lng, t: Date.now(), photos: [] }; w.pins.push(p); await saveWalk(w); openPin(wid, p.id, true);
}
function openPin(wid, pid, isNew) {
  const w = W(wid), p = w.pins.find(x => x.id === pid);
  openSheet(`${head(isNew ? 'Spot marked' : esc(p.name || PIN[p.type].l))}<form id="PF" class="sheet-b"><div class="chips wrap">${Object.entries(PIN).map(([k, v]) => `<button type="button" class="chip ${p.type === k ? 'on' : ''}" data-ptype="${k}"><span style="color:${v.c}">●</span> ${v.l}</button>`).join('')}</div>
    <label class="f">Name (optional)<input name="name" value="${esc(p.name)}" placeholder="e.g. Sandbar past the 3rd post"></label><label class="f">Notes<textarea name="notes">${esc(p.notes)}</textarea></label>
    <div class="small muted">${fmtLL(p.lat, p.lng)} · ${fmtDay(p.t)} ${fmtTime(p.t)}</div><div id="pph"></div></form>
    <div class="sheet-f"><button class="btn danger" data-act="delPin" data-id="${wid}" data-p="${pid}">Delete</button><button class="btn primary" data-act="savePin" data-id="${wid}" data-p="${pid}">Save</button></div>`);
  sheet.querySelectorAll('[data-ptype]').forEach(b => b.onclick = () => sheet.querySelectorAll('[data-ptype]').forEach(x => x.classList.toggle('on', x === b)));
  photosHTML(p.photos, `pin:${wid}:${pid}`).then(x => { const el = $('#pph'); if (el) el.innerHTML = x; });
}
async function savePinForm(wid, pid) { const w = W(wid), p = w.pins.find(x => x.id === pid), F = $('#PF'); if (!F) return; p.type = sheet.querySelector('[data-ptype].on')?.dataset.ptype || p.type; p.name = F.name.value.trim(); p.notes = F.notes.value; await saveWalk(w); }
function openWalkDetails(id) {
  const w = W(id);
  openSheet(`${head('Walk details')}<form id="WF" class="sheet-b"><label class="f">Beach<input name="spot" value="${esc(w.spotName)}" list="beaches" placeholder="e.g. Bowman’s Beach"><datalist id="beaches">${[...C.hotspots.map(h => h.name), ...C.places.filter(p => p.c === 'beach').map(p => p.n)].map(n => `<option value="${esc(n)}">`).join('')}</datalist></label>
    <div class="two"><label class="f">Start<input type="datetime-local" name="start" value="${isoLocal(new Date(w.start))}"></label><label class="f">End<input type="datetime-local" name="end" value="${w.end ? isoLocal(new Date(w.end)) : ''}"></label></div></form>
    <div class="sheet-f"><button class="btn primary" data-act="saveWalkDetails" data-id="${id}">Save</button></div>`);
}
function summaryText(w) {
  const sp = Object.entries(w.finds).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1]).map(([id, n]) => `${SH[id]?.name || id} ${n}`).join(', ');
  return `${fmtDay(w.start)} · ${w.spotName || 'Shell walk'} on Sanibel\n${total(w)} shells${sp ? ': ' + sp : ''}${w.specials.length ? '\nSpecial: ' + w.specials.map(n => SH[n.sp]?.name).join(', ') : ''}${w.low ? `\nLow tide ${fmtTime(w.low.t)}` : ''}${w.notes ? '\n' + w.notes : ''}\n— Sanibel’s Calling`;
}

// photos
let photoTarget = null;
function compress(file) {
  return new Promise((res, rej) => { const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, 1600 / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .8)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Could not read that image.')); }; img.src = url; });
}
async function handlePhotos(files) {
  if (!files.length || !photoTarget) return; const tg = photoTarget; photoTarget = null; const ids = [];
  for (const f of files) { try { const p = { id: uid(), data: await compress(f), t: Date.now(), lat: GPS.last?.lat ?? null, lng: GPS.last?.lng ?? null }; await DB.put('photos', p); photoCache.set(p.id, p); ids.push(p.id); } catch (e) { toast(e.message); } }
  await tg.add(ids); toast(`${ids.length} photo${ids.length === 1 ? '' : 's'} saved.`);
}
$('#camIn').onchange = e => { handlePhotos([...e.target.files]); e.target.value = ''; };
$('#libIn').onchange = e => { handlePhotos([...e.target.files]); e.target.value = ''; };
function ctxTarget(ctx) {
  const [kind, a, b] = ctx.split(':'); const w = W(a); if (!w) return null;
  if (kind === 'walk') return { obj: w, save: () => saveWalk(w), reopen: () => render() };
  const o = (kind === 'special' ? w.specials : w.pins).find(x => x.id === b);
  return { obj: o, save: () => saveWalk(w), reopen: () => kind === 'special' ? openSpecial(a, b) : openPin(a, b) };
}

// ================= MAP =================
const TILE = { street: NATIVE.on ? { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}', attr: 'Tiles © Esri' } : { url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', attr: '© OpenStreetMap' }, sat: { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attr: 'Imagery © Esri' } };
const dot = (bg, ic, size = 30) => `<span class="mk" style="display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:50%;background:${bg};border:2px solid #fff;color:#fff">${icon(ic, `width="${Math.round(size * .55)}" height="${Math.round(size * .55)}"`)}</span>`;
const MAPV = {
  map: null, filter: 'all', sat: lsGet('mapSat', false),
  mount(el) {
    const F = [['all', 'All'], ['hot', 'Shell hotspots'], ['sun', 'Sunrise & sunset'], ['fav', 'Local favorites'], ['must', 'Must-sees'], ['mine', 'My spots & routes'], ...C.cats.map(c => [c.id, c.name])];
    el.innerHTML = `<div id="map"></div><div class="mapchips"><div class="chips" style="margin:0">${F.map(([k, l]) => `<button class="chip ${this.filter === k ? 'on' : ''}" data-mf="${k}">${esc(l)}</button>`).join('')}</div></div>
      <div class="mapctl"><button data-act="mapLocate" aria-label="Center on me">${UI.loc}</button><button data-act="mapLayer" aria-label="Satellite or street map">${UI.layers}</button></div><div class="mapstatus" id="mapstatus" hidden></div>`;
    const v = lsGet('mapView', [26.445, -82.09, 12]), t = this.sat ? TILE.sat : TILE.street;
    this.map = new TinyMap($('#map'), { lat: v[0], lng: v[1], zoom: v[2], tileUrl: t.url, attribution: t.attr });
    this.map.on('move', () => lsSet('mapView', [this.map.lat, this.map.lng, this.map.z]));
    this.map.on('longpress', ll => { if (activeId) addPin(activeId, ll.lat, ll.lng); else toast('Start a shell walk to mark spots on the map.'); });
    this.draw(); geocodeAll();
  },
  draw() {
    if (!this.map) return; const f = this.filter, marks = [], lines = []; let missing = 0;
    const want = k => f === 'all' || f === k;
    if (f !== 'hot' && f !== 'sun' && f !== 'fav' && f !== 'mine') for (const p of C.places) {
      if (!(f === 'all' || (f === 'must' ? p.must : p.c === f))) continue; const l = LL(p); if (!l) { missing++; continue; } const c = CAT[p.c] || {};
      marks.push({ lat: l.lat, lng: l.lng, label: p.n, anchor: [15, 15], onClick: () => openPlace(p.id), html: dot(c.color, c.icon) });
    }
    if (want('hot')) for (const x of C.hotspots) { const l = loc(x); if (l) marks.push({ lat: l.lat, lng: l.lng, label: x.name, anchor: [18, 18], onClick: () => openSpot('hot:' + x.id), html: dot('#13858C', 'shell', 36) }); }
    if (want('sun')) for (const x of C.sunspots) { const l = loc(x); if (l) marks.push({ lat: l.lat, lng: l.lng, label: x.name, anchor: [17, 17], onClick: () => openSpot('sun:' + x.id), html: dot(x.kind === 'sunrise' ? '#E3A72F' : '#EE6A3C', 'sun', 34) }); }
    if (want('fav')) for (const x of C.favorites) { const l = loc(x); if (l) marks.push({ lat: l.lat, lng: l.lng, label: x.name, anchor: [15, 15], onClick: () => openSpot('fav:' + x.id), html: dot('#D84393', 'heart') }); }
    if (f === 'mine' || f === 'all') for (const w of walks) {
      for (const p of w.pins) marks.push({ lat: p.lat, lng: p.lng, label: p.name || PIN[p.type]?.l, anchor: [12, 12], onClick: () => openPin(w.id, p.id), html: `<span class="mk" style="display:block;width:22px;height:22px;border-radius:50%;background:${PIN[p.type]?.c || '#888'};border:3px solid #fff"></span>` });
      if (f === 'mine' && w.route?.length > 1) lines.push({ pts: w.route.map(r => [r[0], r[1]]), color: '#EE6A3C', width: 4, onClick: () => { openWalk = w.id; go('log'); } });
    }
    if (gpsPos) marks.push({ lat: gpsPos.lat, lng: gpsPos.lng, html: '<div class="me"></div>', anchor: [9, 9] });
    this.map.setOverlay(lines, marks);
    const s = $('#mapstatus'); if (s) { s.hidden = !missing; s.textContent = geoRunning ? `Placing ${missing} more on the map…` : `${missing} place${missing > 1 ? 's' : ''} not on the map. Use the list for directions.`; }
  }
};
function walkMiniMap(w) {
  const el = $('#wmap'); if (!el) return; const t = MAPV.sat ? TILE.sat : TILE.street;
  const m = new TinyMap(el, { tileUrl: t.url, attribution: t.attr });
  const marks = w.pins.map(p => ({ lat: p.lat, lng: p.lng, anchor: [11, 11], onClick: () => openPin(w.id, p.id), html: `<span class="mk" style="display:block;width:22px;height:22px;border-radius:50%;background:${PIN[p.type]?.c};border:3px solid #fff"></span>` }));
  const lines = w.route?.length > 1 ? [{ pts: w.route.map(r => [r[0], r[1]]), color: '#EE6A3C', width: 4 }] : [];
  m.setOverlay(lines, marks); const pts = [...marks.map(k => [k.lat, k.lng]), ...(lines[0]?.pts || [])]; if (!pts.length && w.lat != null) pts.push([w.lat, w.lng]);
  requestAnimationFrame(() => pts.length > 1 ? m.fitBounds(pts, 30, 18) : pts.length ? m.setView(pts[0][0], pts[0][1], 16) : 0);
}

// ================= TIPS =================
function renderTips() {
  const arr = saved.map(id => P[id]).filter(Boolean);
  return `${bookingCard()}
  <button class="banner" data-act="strategy"><span class="ic">${icon('book')}</span><span><b>Shell-finding strategy</b><span class="small muted">When, where and how to find the good ones</span></span>${UI.chev}</button>
  <div class="sec"><h2>My list</h2><span class="spacer"></span>${arr.length ? '<button class="btn sm" data-act="shareList">Share list</button>' : ''}</div>
  ${arr.length ? listOf(arr) : '<div class="empty" style="padding:12px">Tap the heart on any place to save it here. Your list stays on this phone.</div>'}
  <div class="sec"><h2>Island tips</h2></div>
  <div class="tip"><h3>Distances</h3><div class="small" style="margin-bottom:8px">Show how far things are from: <b>${origin ? esc(origin.label) : gpsPos ? 'your current location' : 'nowhere yet'}</b></div><div class="acts" style="margin-top:0"><button class="btn sm" data-act="useGPS">${UI.loc}Use my location</button><button class="btn sm" data-act="setHome">Save where I'm staying</button>${origin ? '<button class="btn sm" data-act="clearHome">Clear</button>' : ''}</div></div>
  ${C.tips.map(t => `<div class="tip"><h3>${esc(t.title)}</h3>${md(t.body)}</div>`).join('')}
  <p class="small muted">Listings checked ${esc(C.checked || '')}. Place photos from Wikipedia and shell photos from Wikimedia Commons under their Creative Commons licenses (tap a photo’s credit for details). Tides: NOAA. Weather: Open-Meteo. Maps: ${NATIVE.on ? 'Esri' : '© OpenStreetMap contributors'}, imagery © Esri. <a href="${NATIVE.on ? APP_CONFIG.webUrl : ''}privacy.html" target="_blank" rel="noopener">Privacy policy</a></p>`;
}

// ================= SHARE, BACKUP =================
const appURL = () => NATIVE.on ? NATIVE.shareUrl() : location.origin + location.pathname.replace(/index\.html$/, '');
function openShare() {
  openSheet(`${head('Share Sanibel’s Calling')}<div class="sheet-b"><p style="margin:0">Friends and family can scan this with their phone camera to get the app. It’s free.</p>
    <div class="qrbox">${qrSVG(appURL(), 240)}</div><div class="urlbox">${esc(appURL())}</div>
    <div class="dir">${NATIVE.on || navigator.share ? '<button class="btn primary" data-act="nativeShare">Send link…</button>' : ''}<button class="btn" data-act="copyLink">Copy link</button></div></div>`);
}
function download(name, text, type) {
  if (NATIVE.on) return NATIVE.saveFile(name, text).then(() => toast('Saved. Also in Files › On My iPhone › Sanibel’s Calling › Exports.', null, 4500)).catch(e => toast('Couldn’t save: ' + (e.message || e)));
  const blob = new Blob([text], { type }); const file = new File([blob], name, { type });
  if (navigator.canShare?.({ files: [file] })) return navigator.share({ files: [file], title: name }).catch(() => { });
  const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
async function exportData() { download(`sanibels-calling-backup-${isoDate(new Date())}.json`, JSON.stringify({ app: 'sanibels-calling', version: 1, exportedAt: new Date().toISOString(), walks, saved, photos: await DB.all('photos') }), 'application/json'); }
function exportCSV() {
  const cols = ['Date', 'Start', 'End', 'Beach', 'Low tide', 'Wind', 'Total', ...C.shells.map(s => s.name), 'Special finds', 'Miles', 'Notes'];
  const qq = v => { const s = String(v ?? ''); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
  const rows = walks.slice().reverse().map(w => [islandDay(w.start), fmtTime(w.start), w.end ? fmtTime(w.end) : '', w.spotName, w.low ? fmtTime(w.low.t) : '', w.wx ? compass(w.wx.dir) + ' ' + w.wx.wind : '', total(w), ...C.shells.map(s => w.finds[s.id] || ''), w.specials.map(n => SH[n.sp]?.name).join('; '), w.route?.length > 1 ? miles(w.route).toFixed(2) : '', w.notes]);
  download('sanibels-calling-shell-log.csv', [cols, ...rows].map(r => r.map(qq).join(',')).join('\n'), 'text/csv');
}
$('#importIn').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { const j = JSON.parse(await f.text()); if (j.app !== 'sanibels-calling') throw new Error('That isn’t a Sanibel’s Calling backup.');
    let n = 0; for (const p of j.photos || []) await DB.put('photos', p); for (const w of j.walks || []) { if (!W(w.id)) n++; await DB.put('walks', w); }
    if (Array.isArray(j.saved)) { saved = [...new Set([...saved, ...j.saved])]; lsSet('saved', saved); }
    await loadWalks(); render(); toast(`Restored. ${n} new walk${n === 1 ? '' : 's'} added; nothing was deleted.`);
  } catch (err) { toast('Couldn’t restore: ' + err.message); }
};

// ================= ROUTING & EVENTS =================
async function render() {
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.go === view));
  const main = $('#main');
  if (view !== 'map' && MAPV.map) { MAPV.map.destroy(); MAPV.map = null; }
  if (view === 'map') { main.innerHTML = '<div class="view map"></div>'; MAPV.mount(main.firstChild); return; }
  const y = main.scrollTop; let html;
  if (view === 'shells') html = renderShells();
  else if (view === 'tips') html = sub === 'strategy' ? renderShells() : renderTips();
  else if (view === 'log') { html = renderLog(); if (html == null) html = await walkHTML(W(openWalk) || W(activeId)); }
  else html = renderExplore();
  main.innerHTML = `<div class="view">${html}</div>`; main.scrollTop = y;
  if (view === 'log') { const w = W(openWalk) || W(activeId); if (w && logTab === 'walks') walkMiniMap(w); }
}
function go(v) { view = v; sub = null; lsSet('view', v); if (v === 'explore') { catSel = null; q = ''; } if (v === 'log' && !activeId && !openWalk) logTab = 'walks'; render(); $('#main').scrollTop = 0; }
document.addEventListener('submit', e => e.preventDefault(), true);
document.addEventListener('click', async e => {
  const b = e.target.closest('button, [data-open], [data-go], img[data-act]'); if (!b) return; const d = b.dataset;
  if (d.go) return go(d.go);
  if (d.open) { closeSheet(); return openPlace(d.open); }
  if (d.spot) return openSpot(d.spot);
  if (d.shell) return openShell(d.shell);
  if (d.cat) { catSel = d.cat; sortNear = false; await render(); $('#main').scrollTop = 0; return; }
  if (d.save) { toggleSave(d.save); if (sheet.open && $('.sheet-b [data-save]')) openPlace(d.save); return render(); }
  if (d.sf) { const [k, v] = d.sf.split(':'); shellF[k] = (k === 'shape' || k === 'color') && shellF[k] === v ? null : (k === 'g' || k === 'freq') && shellF[k] === v && v !== 'all' ? 'all' : v; return render(); }
  if (d.ltab) { logTab = d.ltab; openWalk = null; return render(); }
  if (d.sort != null) { if (d.sort === '1' && !from()) { toast('Finding your location…'); await getPos(); if (!from()) { toast('Location is off. Turn it on, or save where you’re staying in Tips.'); return; } geocodeAll(); } sortNear = d.sort === '1'; return render(); }
  if (d.mf) { MAPV.filter = d.mf; document.querySelectorAll('[data-mf]').forEach(x => x.classList.toggle('on', x === b)); MAPV.draw(); const pts = MAPV.map.markers.filter(m => m.label).map(m => [m.lat, m.lng]); if (pts.length) MAPV.map.fitBounds(pts, 60, 15); return; }
  if (d.copy) { try { await navigator.clipboard.writeText(d.copy); toast('Address copied'); } catch { toast('Press and hold the address to copy it'); } return; }
  if (d.ck || d.ptype) return;
  const saveFirst = async () => { if ($('#NF')) { const x = sheet.querySelector('[data-act=saveSpecial]'); await saveSpecialForm(x.dataset.id, x.dataset.n); } if ($('#PF')) { const x = sheet.querySelector('[data-act=savePin]'); await savePinForm(x.dataset.id, x.dataset.p); } };
  switch (d.act) {
    case 'close': return closeSheet();
    case 'back': sub = null; await render(); $('#main').scrollTop = 0; return;
    case 'backCats': catSel = null; await render(); $('#main').scrollTop = 0; return;
    case 'allNotes': sub = 'notes'; await render(); $('#main').scrollTop = 0; return;
    case 'strategy': closeSheet(); sub = 'strategy'; await render(); $('#main').scrollTop = 0; return;
    case 'toggleId': shellF.id = !shellF.id; return render();
    case 'clearId': shellF.shape = shellF.color = null; return render();
    case 'startWalk': return startWalk(false);
    case 'pastWalk': await startWalk(true); return openWalkDetails(openWalk);
    case 'openWalk': openWalk = d.id; logTab = 'walks'; view = 'log'; await render(); $('#main').scrollTop = 0; return;
    case 'backLog': openWalk = null; return render();
    case 'endWalk': return endWalk(d.id);
    case 'nameWalk': return openWalkDetails(d.id);
    case 'saveWalkDetails': { const w = W(d.id), F = $('#WF'); w.spotName = F.spot.value.trim(); const s = new Date(F.start.value).getTime(); if (s) w.start = s; const en = new Date(F.end.value).getTime(); w.end = en || (w.id === activeId ? null : w.end); w.moon = moon(w.start); if (!w.low) { await getTides(); const l = lowNear(w.start); if (l && Math.abs(l.t - w.start) < 12 * 3600e3) w.low = { t: l.t, h: l.h, rel: !!l.rel }; } await saveWalk(w); closeSheet(); return render(); }
    case 'route': return startRoute(d.id);
    case 'bump': return bump(d.id, d.sp, +d.d);
    case 'checklist': return openChecklist(d.id);
    case 'logShell': { const w = W(activeId); if (!w) return; closeSheet(); await bump(w.id, d.sp, 1); return render(); }
    case 'newSpecial': { const w = W(d.id); const sp = Object.entries(w.finds).filter(([, n]) => n > 0).sort((a, b) => b[1] - a[1])[0]?.[0] || 'junonia'; const n = { id: uid(), sp, notes: '', photos: [], t: Date.now() }; w.specials.push(n); await saveWalk(w); return openSpecial(w.id, n.id); }
    case 'openSpecial': return openSpecial(d.id, d.n);
    case 'saveSpecial': await saveSpecialForm(d.id, d.n); closeSheet(); render(); return toast('Saved.');
    case 'delSpecial': { if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = 'Tap again to delete'; return; } const w = W(d.id); w.specials = w.specials.filter(x => x.id !== d.n); await saveWalk(w); closeSheet(); return render(); }
    case 'markHere': return addPin(d.id);
    case 'openPin': return openPin(d.id, d.p);
    case 'savePin': await savePinForm(d.id, d.p); closeSheet(); render(); return toast('Saved.');
    case 'delPin': { if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = 'Tap again to delete'; return; } const w = W(d.id); w.pins = w.pins.filter(x => x.id !== d.p); await saveWalk(w); closeSheet(); return render(); }
    case 'delWalk': { if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = 'Tap again to delete this walk'; return; } const w = W(d.id); for (const pid of [...w.photos, ...w.specials.flatMap(n => n.photos || []), ...w.pins.flatMap(x => x.photos || [])]) await DB.del('photos', pid); await DB.del('walks', d.id); walks = walks.filter(x => x.id !== d.id); openWalk = null; render(); return toast('Walk deleted.'); }
    case 'shareWalk': { const t = summaryText(W(d.id)); if (NATIVE.on) { await NATIVE.shareText({ title: 'Shell walk', text: t }); return; } if (navigator.share) { try { await navigator.share({ title: 'Shell walk', text: t }); } catch { } } else { try { await navigator.clipboard.writeText(t); toast('Summary copied.'); } catch { } } return; }
    case 'addPhoto': { await saveFirst(); const tg = ctxTarget(d.ctx); photoTarget = { add: async ids => { tg.obj.photos = (tg.obj.photos || []).concat(ids); await tg.save(); tg.reopen(); } }; return (d.lib === '1' ? $('#libIn') : $('#camIn')).click(); }
    case 'delPhoto': { if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = '?'; b.style.background = '#B23A2E'; return; } await saveFirst(); const tg = ctxTarget(d.ctx); tg.obj.photos = tg.obj.photos.filter(x => x !== d.id); await DB.del('photos', d.id); photoCache.delete(d.id); await tg.save(); return tg.reopen(); }
    case 'viewPhoto': { const p = await photo(d.id); return p && openSheet(`${head(fmtDay(p.t) + ' ' + fmtTime(p.t))}<div class="sheet-b"><img src="${p.data}" alt="Photo" style="width:100%;border-radius:12px"></div>`); }
    case 'shareList': { const t = 'My Sanibel list:\n' + saved.map(id => P[id]).filter(Boolean).map(p => `• ${p.n} — ${googleSearch(p)}`).join('\n'); if (NATIVE.on) return NATIVE.shareText({ title: 'My Sanibel list', text: t }); if (navigator.share) { try { await navigator.share({ title: 'My Sanibel list', text: t }); } catch { } } else { try { await navigator.clipboard.writeText(t); toast('List copied'); } catch { } } return; }
    case 'useGPS': { toast('Finding your location…'); const p = await getPos(); if (p) { origin = null; lsSet('origin', null); geocodeAll(); toast('Distances now use your location.'); } else toast('Location is off for this app.'); return render(); }
    case 'setHome': { toast('Finding your location…'); const p = await getPos(); if (!p) return toast('Location is off for this app.'); origin = { lat: p.lat, lng: p.lng, label: 'where you’re staying' }; lsSet('origin', origin); geocodeAll(); toast('Saved. Distances now measure from where you’re staying.'); return render(); }
    case 'clearHome': origin = null; lsSet('origin', null); return render();
    case 'mapLocate': { const p = await getPos(); if (p && MAPV.map) { MAPV.map.setView(p.lat, p.lng, 15); MAPV.draw(); } else toast('Location is off for this app.'); return; }
    case 'mapLayer': MAPV.sat = !MAPV.sat; lsSet('mapSat', MAPV.sat); return MAPV.map?.setTiles((MAPV.sat ? TILE.sat : TILE.street).url, (MAPV.sat ? TILE.sat : TILE.street).attr);
    case 'share': return openShare();
    case 'nativeShare': if (NATIVE.on) return NATIVE.shareText({ title: 'Sanibel’s Calling', text: 'Free Sanibel & Captiva guide: shells, tides, sunsets and local favorites', url: appURL() }); try { await navigator.share({ title: 'Sanibel’s Calling', text: 'Free Sanibel & Captiva guide: shells, tides, sunsets and local favorites', url: appURL() }); } catch { } return;
    case 'copyLink': try { await navigator.clipboard.writeText(appURL()); toast('Link copied'); } catch { toast('Press and hold the address to copy it'); } return;
    case 'exportData': return exportData();
    case 'importData': return $('#importIn').click();
    case 'exportCSV': return exportCSV();
  }
});
document.addEventListener('input', e => {
  if (e.target.id === 'q') { q = e.target.value; const pos = e.target.selectionStart; render().then(() => { const el = $('#q'); if (el) { el.focus(); el.setSelectionRange(pos, pos); } }); }
  if (e.target.id === 'sq') { shellF.q = e.target.value; const pos = e.target.selectionStart; render().then(() => { const el = $('#sq'); if (el) { el.focus(); el.setSelectionRange(pos, pos); } }); }
  if (e.target.id === 'wNotes') { const w = W(e.target.dataset.id); w.notes = e.target.value; clearTimeout(window._nt); window._nt = setTimeout(() => saveWalk(w), 600); }
});

(async function boot() {
  await Promise.all([loadContent(), loadWalks(), loadBundled()]);
  try { await navigator.storage?.persist?.(); } catch { }
  if (!['explore', 'shells', 'log', 'map', 'tips'].includes(view)) view = 'explore';
  const hash = location.hash.slice(1); if (P[hash]) setTimeout(() => openPlace(hash), 300); else if (SH[hash]) setTimeout(() => openShell(hash), 300);
  await render(); NATIVE.ready();
  if (activeId && lsGet('routeOn', null) === activeId) startRoute(activeId);
  Promise.all([getTides(), getWx()]).then(() => { if (view === 'explore' || view === 'shells') render(); });
  loadWiki(); setTimeout(geocodeAll, 4000); checkContentUpdate();
  getPos(10000).then(p => { if (p && MAPV.map) MAPV.draw(); });
  if ('serviceWorker' in navigator && location.protocol === 'https:' && !PREVIEW) navigator.serviceWorker.register('sw.js').catch(() => { });
})();
