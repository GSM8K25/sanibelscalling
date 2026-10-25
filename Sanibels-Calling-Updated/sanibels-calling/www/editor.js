/* Content editor for Sanibel's Calling.
   Edits a working copy of content.json that is saved in this browser as you go (a "draft").
   Preview shows the draft inside the app. "Download content.json" gives you the file to put on your website;
   the website and the iPhone app pick it up from there. Nothing here changes the live site by itself. */
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const lsGet = (k, d) => { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch { return d; } };
let toastT; function toast(m, ms = 2800) { const t = $('#toast'); t.textContent = m; t.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => t.hidden = true, ms); }
const uid = p => p + Date.now().toString(36).slice(-5) + Math.random().toString(36).slice(2, 5);
const slug = s => String(s).toLowerCase().normalize('NFKD').replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

let C = null, site = null, sec = lsGet('editor.sec', 'notes'), filter = '';
const save = () => { try { localStorage.setItem('content.draft', JSON.stringify(C)); return true; } catch { toast('Couldn’t save the draft: it’s too big for this browser. Use photo links instead of uploaded photos.', 6000); return false; } };
const dirty = () => site && JSON.stringify(C) !== JSON.stringify(site);

// ---------- field types ----------
const PLACE = { k: 'place', l: 'Linked place', t: 'place', h: 'Used for the picture, address and directions unless you set an exact pin below.' };
const LOC = { k: 'loc', l: 'Exact pin (optional)', t: 'loc' };
const PHOTO = [{ k: 'photo', l: 'Photo', t: 'photo' }, { k: 'photoCredit', l: 'Photo credit', t: 'text', h: 'Your name for your own photos, or the photographer and license.' }];
const BODY = { k: 'body', l: 'Text', t: 'rich' };
const SECTIONS = [
  { key: 'notes', label: 'Island notes', title: x => x.title, sub: x => (x.pinned ? '📌 ' : '') + (x.date || ''), prefix: 'n', help: 'Short updates shown on the Explore page: news, seasonal tips, “we just found…”. Pinned notes show first.',
    fields: [{ k: 'title', l: 'Title', t: 'text', req: 1 }, { k: 'date', l: 'Date', t: 'date' }, { k: 'pinned', l: 'Pin to the top', t: 'check' }, BODY], init: () => ({ date: new Date().toISOString().slice(0, 10), pinned: false }) },
  { key: 'strategy', label: 'Shell strategy', title: x => x.title, sub: x => strip(x.body), prefix: 's', help: 'The numbered steps on the Shell-finding strategy page, in this order.',
    fields: [{ k: 'title', l: 'Step title', t: 'text', req: 1 }, BODY] },
  { key: 'hotspots', label: 'Shell hotspots', title: x => x.name, sub: x => x.best || placeName(x.place), prefix: 'h', help: 'Shown on the Shells tab and the map. Tip: stand on the spot and tap “Use my location” to drop an exact pin.',
    fields: [{ k: 'name', l: 'Name', t: 'text', req: 1 }, PLACE, LOC, { k: 'best', l: 'Best time', t: 'text', h: 'e.g. Low tide after a west wind' }, BODY, { k: 'shells', l: 'Shells to look for', t: 'shells' }, ...PHOTO] },
  { key: 'sunspots', label: 'Sunrise & sunset', title: x => x.name, sub: x => x.kind, prefix: 'sun', help: 'The Sunrise & sunset spots on the Explore page and the map. Today’s sunrise or sunset time is added automatically.',
    fields: [{ k: 'name', l: 'Name', t: 'text', req: 1 }, { k: 'kind', l: 'Good for', t: 'select', o: [['sunrise', 'Sunrise'], ['sunset', 'Sunset'], ['both', 'Both']] }, PLACE, LOC, BODY, ...PHOTO], init: () => ({ kind: 'sunset' }) },
  { key: 'favorites', label: 'Local favorites', title: x => x.name, sub: x => x.tag, prefix: 'f', help: 'Your own picks, shown on the Explore page.',
    fields: [{ k: 'name', l: 'Name', t: 'text', req: 1 }, { k: 'tag', l: 'Label', t: 'text', h: 'One or two words, e.g. Breakfast, Sunset drinks' }, PLACE, LOC, BODY, ...PHOTO] },
  { key: 'tips', label: 'Island tips', title: x => x.title, sub: x => strip(x.body), prefix: 't', help: 'The tips on the Tips tab, in this order.',
    fields: [{ k: 'title', l: 'Title', t: 'text', req: 1 }, BODY] },
  { key: 'shells', label: 'Shells', title: x => x.name, sub: x => x.sci, prefix: '', idFrom: 'name', thumb: true, help: 'The shell guide. “Our tip” shows on each shell’s page. To fix a photo, open the shell and upload your own or paste a link.',
    fields: [{ k: 'name', l: 'Common name', t: 'text', req: 1 }, { k: 'sci', l: 'Scientific name', t: 'text' }, { k: 'fam', l: 'Family', t: 'text' },
      { k: 'g', l: 'Type', t: 'select', o: [['univalve', 'Snail shell'], ['bivalve', 'Clam shell'], ['other', 'Other (sand dollar etc.)']] },
      { k: 'freq', l: 'How often found', t: 'select', o: ['Common', 'Uncommon', 'Rare', 'Very rare'].map(v => [v, v]) }, { k: 'size', l: 'Size', t: 'text', h: 'e.g. up to 3"' },
      { k: 'shape', l: 'Shape (for “Help me identify”)', t: 'select', o: [['spindle', 'Spindle'], ['conch', 'Conch'], ['cone', 'Cone'], ['round', 'Round snail'], ['cylinder', 'Bullet'], ['murex', 'Spiky ridges'], ['tall spiral', 'Tall spiral'], ['ear', 'Ear'], ['slipper', 'Slipper / cup'], ['fan', 'Fan'], ['heart', 'Ribbed clam'], ['clam', 'Clam'], ['long oval', 'Long oval'], ['wedge', 'Small wedge'], ['disc', 'Flat disc']] },
      { k: 'colors', l: 'Colors', t: 'list', h: 'Comma-separated: white, cream, tan, brown, orange, red, pink, purple, yellow, gray, black, blue, green' },
      { k: 'idp', l: 'How to tell (one point per line)', t: 'lines' }, { k: 'alike', l: 'Don’t confuse with', t: 'textarea', h: 'Link another shell with its id in double brackets, e.g. [[pear-whelk]]' },
      { k: 'where', l: 'Where & when', t: 'textarea' }, { k: 'fact', l: 'Did you know?', t: 'textarea' }, { k: 'note', l: 'Our tip', t: 'rich' },
      ...PHOTO, { k: 'wiki', l: 'Wikipedia article(s) for the default photo', t: 'list', h: 'Used only when no photo is set above. Comma-separated, tried in order.' }, { k: 'ref', l: 'Reference link', t: 'text' }],
    init: () => ({ g: 'univalve', freq: 'Common', shape: 'spindle', colors: [], idp: [], wiki: [], note: '', photo: '', photoCredit: '' }) },
  { key: 'places', label: 'Places', title: x => x.n + (x.must ? ` · must-see #${x.must}` : ''), sub: x => (catName(x.c)) + ' · ' + (x.a || ''), prefix: '', idFrom: 'n', help: 'Every listing in Explore. Give something a must-see number to put it in the Must-sees row (1 shows first).',
    fields: [{ k: 'n', l: 'Name', t: 'text', req: 1 }, { k: 'c', l: 'Category', t: 'cat' }, { k: 'a', l: 'Area', t: 'text', h: 'e.g. Sanibel (west end)' }, { k: 'addr', l: 'Street address', t: 'text', req: 1, h: 'Used for directions and to place the pin automatically.' },
      { k: 'must', l: 'Must-see number', t: 'number', h: 'Leave empty if it isn’t a must-see.' }, { k: 'd', l: 'Description', t: 'textarea' }, { k: 'tip', l: 'Tip', t: 'textarea' }, { k: 'when', l: 'Hours / season note', t: 'text' },
      { k: 'tags', l: 'Tags', t: 'list', h: 'Comma-separated, e.g. Free, Kids, Sunset' }, { k: 'web', l: 'Website', t: 'text' }, LOC, ...PHOTO, { k: 'wiki', l: 'Wikipedia article for the photo', t: 'text' }],
    init: () => ({ c: 'beach' }) },
  { key: 'photocheck', label: 'Photo check', special: true },
  { key: 'settings', label: 'Booking & settings', special: true }
];
const S = k => SECTIONS.find(s => s.key === k);
const strip = s => String(s || '').replace(/\*\*|\[|\]\([^)]*\)/g, '').slice(0, 90);
const placeName = id => C.places.find(p => p.id === id)?.n || '';
const catName = id => C.cats.find(c => c.id === id)?.name || id;

// ---------- load ----------
async function load() {
  try { site = await (await fetch('content.json', { cache: 'no-store' })).json(); } catch { site = null; }
  const draft = lsGet('content.draft', null);
  C = draft && draft.places ? draft : JSON.parse(JSON.stringify(site));
  if (!C) { $('#app').innerHTML = '<div class="banner err">Couldn’t load content.json. Open this editor from your website (the same folder as the app).</div>'; return; }
  render();
}

// ---------- main view ----------
function render() {
  const s = S(sec) || SECTIONS[0];
  const tabs = `<div class="tabs">${SECTIONS.map(x => `<button class="tab ${x.key === s.key ? 'on' : ''}" data-sec="${x.key}">${esc(x.label)}${!x.special ? ` <span class="n">${(C[x.key] || []).length}</span>` : ''}</button>`).join('')}</div>`;
  const status = statusHTML();
  let body = '';
  if (s.key === 'photocheck') body = photoCheck();
  else if (s.key === 'settings') body = settings();
  else {
    const list = (C[s.key] || []).map((x, i) => ({ x, i })).filter(({ x }) => !filter || JSON.stringify(x).toLowerCase().includes(filter.toLowerCase()));
    body = `<div class="small muted">${esc(s.help)}</div>
      <div style="display:flex;gap:8px">${(C[s.key] || []).length > 8 ? `<input class="search" id="flt" placeholder="Search ${esc(s.label.toLowerCase())}" value="${esc(filter)}">` : '<span style="flex:1"></span>'}<button class="btn pri" data-act="add">+ Add</button></div>
      <div class="list">${list.map(({ x, i }) => `<div class="row"><div class="ord"><button data-mv="${i}:-1" aria-label="Move up">▲</button><button data-mv="${i}:1" aria-label="Move down">▼</button></div>
        <button style="background:none;border:0;text-align:left;padding:0;min-width:0;cursor:pointer;display:flex;gap:10px;align-items:center" data-edit="${i}">${s.thumb ? (x.photo ? `<img class="thumb" src="${esc(x.photo)}" alt="">` : '<span class="thumb"></span>') : ''}<span style="min-width:0"><div class="t">${esc(s.title(x) || '(untitled)')}</div><div class="s">${esc(s.sub(x) || '')}</div></span></button>
        <button class="btn sm" data-edit="${i}">Edit</button></div>`).join('') || '<div class="muted">Nothing here yet.</div>'}</div>`;
  }
  $('#app').innerHTML = `<div id="status">${status}</div>` + tabs + body;
  const f = $('#flt'); if (f) f.oninput = e => { filter = e.target.value; const p = e.target.selectionStart; render(); const g = $('#flt'); g.focus(); g.setSelectionRange(p, p); };
}
function statusHTML() {
  return dirty() ? `<div class="banner draft"><b>You have changes that aren’t on your website yet.</b> They’re saved in this browser. When you’re done: <b>Download content.json</b>, then upload it to your site (tap ⋯ for how). <button class="btn sm" data-act="discard" style="margin-left:6px">Discard changes</button></div>` : `<div class="banner">Everything matches your website. Edits are saved in this browser as you go.</div>`;
}
function settings() {
  const b = C.booking || {};
  return `<div class="db" style="padding:0">
    <h3>Booking link</h3>
    <label class="f">Booking site URL<input data-set="booking.url" value="${esc(b.url)}"></label>
    <label class="f">Heading<input data-set="booking.title" value="${esc(b.title)}"></label>
    <label class="f">Text<textarea data-set="booking.text">${esc(b.text)}</textarea></label>
    <label class="f">Button label<input data-set="booking.button" value="${esc(b.button)}"></label>
    <h3>Other</h3>
    <label class="f">“Listings checked” date<span class="h">Shown under the place lists, e.g. “October 2026”.</span><input data-set="checked" value="${esc(C.checked)}"></label>
    <label class="f">NOAA tide station ID (optional)<span class="h">Leave empty to use the nearest station automatically.</span><input data-set="tideStation" value="${esc(C.tideStation || '')}"></label>
    <div class="banner"><b>How publishing works</b><br>1. Make your changes here. They’re saved in this browser.<br>2. Tap <b>Preview in app</b> to see them in the app.<br>3. Tap <b>Download content.json</b>.<br>4. Put that file in your app folder (replace the old one) and upload the folder to your website the usual way.<br>Everyone’s app picks up the new content the next time they open it with a signal. No App Store update needed.</div></div>`;
}
function photoCheck() {
  return `<div class="small muted">Every shell with the photo the app will show. Wikipedia photos load from the internet; if one is wrong or poor, open the shell and upload your own.</div>
    <div class="grid">${C.shells.map((s, i) => `<div class="cell"><span data-pc="${i}">${s.photo ? `<img src="${esc(s.photo)}" alt="">` : '<div class="noimg">Loading…</div>'}</span><div class="b"><b>${esc(s.name)}</b><span class="muted"><i>${esc(s.sci)}</i></span><span class="small">${s.photo ? 'Your photo' : '<span data-src="' + i + '">Wikipedia</span>'}</span><button class="btn sm" data-sec2="shells" data-edit="${i}">Edit</button></div></div>`).join('')}</div>`;
}
async function fillPhotoCheck() {
  for (const [i, s] of C.shells.entries()) {
    if (s.photo || sec !== 'photocheck') continue; const box = document.querySelector(`[data-pc="${i}"]`); if (!box) continue; let got = null;
    for (const t of (s.wiki || [])) { try { const j = await (await fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(t.replace(/ /g, '_'))}`)).json(); if (j.thumbnail) { got = { src: j.thumbnail.source.replace(/\/\d+px-/, '/400px-'), page: j.content_urls?.desktop?.page }; break; } } catch { } }
    box.innerHTML = got ? `<img src="${esc(got.src)}" alt="">` : '<div class="noimg">No photo found</div>';
    const src = document.querySelector(`[data-src="${i}"]`); if (src && got?.page) src.innerHTML = `<a href="${esc(got.page)}" target="_blank" rel="noopener">Wikipedia article</a>`;
  }
}

// ---------- edit dialog ----------
const dlg = $('#dlg');
let cur = null; // { s, i, x }
function fieldHTML(f, x) {
  const v = x[f.k], h = f.h ? `<span class="h">${esc(f.h)}</span>` : '';
  switch (f.t) {
    case 'text': return `<label class="f">${esc(f.l)}${f.req ? ' *' : ''}${h}<input data-k="${f.k}" value="${esc(v)}"></label>`;
    case 'number': return `<label class="f">${esc(f.l)}${h}<input data-k="${f.k}" type="number" min="1" value="${esc(v ?? '')}"></label>`;
    case 'date': return `<label class="f">${esc(f.l)}${h}<input data-k="${f.k}" type="date" value="${esc(v)}"></label>`;
    case 'check': return `<label class="chk"><input type="checkbox" data-k="${f.k}" ${v ? 'checked' : ''}> ${esc(f.l)}</label>`;
    case 'textarea': return `<label class="f">${esc(f.l)}${h}<textarea data-k="${f.k}">${esc(v)}</textarea></label>`;
    case 'rich': return `<label class="f">${esc(f.l)}<span class="h">Blank line = new paragraph · start a line with <code>- </code> for a bullet · <code>**bold**</code> · <code>[link text](https://…)</code></span><textarea data-k="${f.k}" style="min-height:150px">${esc(v)}</textarea></label>`;
    case 'lines': return `<label class="f">${esc(f.l)}${h}<textarea data-k="${f.k}" data-lines="1">${esc((v || []).join('\n'))}</textarea></label>`;
    case 'list': return `<label class="f">${esc(f.l)}${h}<input data-k="${f.k}" data-list="1" value="${esc((Array.isArray(v) ? v : v ? [v] : []).join(', '))}"></label>`;
    case 'select': return `<label class="f">${esc(f.l)}${h}<select data-k="${f.k}">${f.o.map(([a, b]) => `<option value="${esc(a)}" ${a === v ? 'selected' : ''}>${esc(b)}</option>`).join('')}</select></label>`;
    case 'cat': return `<label class="f">${esc(f.l)}<select data-k="${f.k}">${C.cats.map(c => `<option value="${c.id}" ${c.id === v ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select></label>`;
    case 'place': return `<label class="f">${esc(f.l)}${h}<select data-k="${f.k}"><option value="">(none)</option>${C.cats.map(c => `<optgroup label="${esc(c.name)}">${C.places.filter(p => p.c === c.id).map(p => `<option value="${p.id}" ${p.id === v ? 'selected' : ''}>${esc(p.n)}</option>`).join('')}</optgroup>`).join('')}</select></label>`;
    case 'shells': return `<div class="f"><div class="small muted" style="font-weight:800;text-transform:uppercase;letter-spacing:.04em;margin-bottom:6px">${esc(f.l)}</div><div class="ms">${C.shells.map(s => `<label><input type="checkbox" data-shellpick="${s.id}" ${(v || []).includes(s.id) ? 'checked' : ''}>${esc(s.name)}</label>`).join('')}</div></div>`;
    case 'loc': return `<div class="loc"><div class="small muted" style="font-weight:800;text-transform:uppercase;letter-spacing:.04em">${esc(f.l)}</div>
      <div class="small muted">Without a pin, the linked place’s address is used. Set a pin for a precise spot on the beach.</div>
      <div class="two"><input class="search" data-k="lat" placeholder="Latitude" inputmode="decimal" value="${esc(x.lat ?? '')}"><input class="search" data-k="lng" placeholder="Longitude" inputmode="decimal" value="${esc(x.lng ?? '')}"></div>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="btn sm" data-act="gps">📍 Use my location</button><button type="button" class="btn sm" data-act="pick">Pick on map</button><button type="button" class="btn sm" data-act="clearLoc">Clear pin</button></div>
      <div id="pickwrap" hidden><div class="pickmap" id="pickmap"></div><div class="small muted" style="margin-top:6px">Tap the map to place the pin. Drag to move, pinch or double-tap to zoom.</div></div></div>`;
    case 'photo': return `<div class="loc"><div class="small muted" style="font-weight:800;text-transform:uppercase;letter-spacing:.04em">${esc(f.l)}</div>
      ${v ? `<img class="photoprev" src="${esc(v)}" alt="">` : '<div class="small muted">No photo set (the default picture is used).</div>'}
      <input class="search" data-k="photo" placeholder="Paste a photo link (https://…) or leave empty" value="${esc(String(v || '').startsWith('data:') ? '' : v)}" ${String(v || '').startsWith('data:') ? 'data-keepdata="1"' : ''}>
      <div style="display:flex;gap:6px;flex-wrap:wrap"><button type="button" class="btn sm" data-act="upload">Upload a photo</button>${v ? '<button type="button" class="btn sm" data-act="clearPhoto">Remove photo</button>' : ''}</div>
      <div class="small muted">Uploaded photos are shrunk and stored inside content.json, so there are no extra files to manage. Use your own photos, or ones you have permission to use.</div></div>`;
  }
  return '';
}
function openEdit(sKey, i) {
  const s = S(sKey); const isNew = i == null; const x = isNew ? Object.assign({}, s.init ? s.init() : {}) : JSON.parse(JSON.stringify(C[sKey][i]));
  cur = { s, i, x, isNew };
  dlg.innerHTML = `<div class="dh"><h2>${isNew ? 'Add to ' + esc(s.label) : esc(s.title(x) || 'Edit')}</h2><button class="btn sm" data-act="cancel">Close</button></div>
    <form class="db" id="ef">${s.fields.map(f => fieldHTML(f, x)).join('')}<div id="ferr"></div></form>
    <div class="df">${isNew ? '' : '<button class="btn bad" data-act="delete">Delete</button>'}<button class="btn pri" data-act="saveItem">${isNew ? 'Add' : 'Save'}</button></div>`;
  if (!dlg.open) dlg.showModal(); dlg.scrollTop = 0;
}
function readForm() {
  const x = cur.x, F = $('#ef');
  F.querySelectorAll('[data-k]').forEach(el => {
    const k = el.dataset.k;
    if (el.type === 'checkbox') x[k] = el.checked;
    else if (el.dataset.lines) x[k] = el.value.split('\n').map(s => s.trim()).filter(Boolean);
    else if (el.dataset.list) x[k] = el.value.split(',').map(s => s.trim()).filter(Boolean);
    else if (el.type === 'number') { if (el.value === '') delete x[k]; else x[k] = +el.value; }
    else if (k === 'photo' && el.dataset.keepdata && !el.value) { /* keep uploaded photo */ }
    else if (k === 'lat' || k === 'lng') { if (el.value.trim() === '') delete x[k]; else x[k] = +(+el.value).toFixed(6); }
    else x[k] = el.value.trim();
  });
  if (F.querySelector('[data-shellpick]')) x.shells = [...F.querySelectorAll('[data-shellpick]:checked')].map(c => c.dataset.shellpick);
  if (cur.s.key === 'places' && x.wiki === '') delete x.wiki;
  return x;
}
function validate(x) {
  const errs = [];
  for (const f of cur.s.fields) if (f.req && !String(x[f.k] || '').trim()) errs.push(`${f.l} is required.`);
  if ((x.lat != null) !== (x.lng != null)) errs.push('Enter both latitude and longitude, or neither.');
  if (x.lat != null && (isNaN(x.lat) || isNaN(x.lng) || Math.abs(x.lat - 26.45) > 3 || Math.abs(x.lng + 82.1) > 3)) errs.push('That pin isn’t near Southwest Florida. Check the numbers.');
  if (x.photo && !/^(https?:\/\/|data:image\/|photos\/|img\/)/.test(x.photo)) errs.push('Photo should be a link starting with https:// (or upload one).');
  if (cur.s.key === 'places' && x.must != null && C.places.some((p, i) => i !== cur.i && p.must === x.must)) errs.push(`Must-see #${x.must} is already used by ${C.places.find((p, i) => i !== cur.i && p.must === x.must).n}.`);
  return errs;
}
function saveItem() {
  const x = readForm(), errs = validate(x);
  if (errs.length) { $('#ferr').innerHTML = `<div class="banner err">${errs.map(esc).join('<br>')}</div>`; $('#ferr').scrollIntoView({ block: 'center' }); return; }
  const s = cur.s, list = C[s.key];
  if (cur.isNew) {
    if (s.idFrom) { let id = slug(x[s.idFrom]) || uid('x'); while (list.some(o => o.id === id)) id += '-2'; x.id = id; } else x.id = uid(s.prefix);
    list.push(x);
  } else list[cur.i] = x;
  save(); dlg.close(); render(); toast(cur.isNew ? 'Added.' : 'Saved.');
}
function refsTo(id) { const r = []; for (const k of ['hotspots', 'sunspots', 'favorites']) for (const x of C[k]) if (x.place === id) r.push(x.name); for (const h of C.hotspots) if ((h.shells || []).includes(id)) r.push(h.name); return r; }

// map picker
let pick = null;
function openPicker() {
  $('#pickwrap').hidden = false; const x = readForm();
  const p = C.places.find(v => v.id === x.place); const geo = lsGet('geo.v1', {}); const g = p ? (p.lat != null ? p : geo[p.id + '|' + p.addr]) : null;
  const start = x.lat != null ? [x.lat, x.lng, 17] : g && g.lat ? [g.lat, g.lng, 16] : [26.445, -82.09, 12];
  pick?.destroy(); pick = new TinyMap($('#pickmap'), { lat: start[0], lng: start[1], zoom: start[2], tileUrl: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Imagery © Esri' });
  const mark = () => { const la = $('[data-k=lat]').value, lo = $('[data-k=lng]').value; pick.setOverlay([], la && lo ? [{ lat: +la, lng: +lo, anchor: [11, 11], html: '<span style="display:block;width:22px;height:22px;border-radius:50%;background:#EE6A3C;border:3px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.5)"></span>' }] : []); };
  pick.on('click', ll => { $('[data-k=lat]').value = ll.lat.toFixed(6); $('[data-k=lng]').value = ll.lng.toFixed(6); mark(); });
  mark(); $('#pickwrap').scrollIntoView({ block: 'center' });
}
// photo upload → resized JPEG data URL
function shrink(file, max = 1000) {
  return new Promise((res, rej) => { const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => { const k = Math.min(1, max / Math.max(img.width, img.height)); const c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k); c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url); res(c.toDataURL('image/jpeg', .78)); };
    img.onerror = () => { URL.revokeObjectURL(url); rej(new Error('Couldn’t read that image')); }; img.src = url; });
}
$('#photoFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f || !cur) return; try { readForm(); cur.x.photo = await shrink(f); reopenWith(cur.x, dlg.scrollTop); toast('Photo added. Remember to Save.'); } catch (err) { toast(err.message); } };
function reopenWith(x, y) { const s = cur.s, i = cur.i, isNew = cur.isNew; cur = { s, i, x, isNew }; $('#ef').innerHTML = s.fields.map(f => fieldHTML(f, x)).join('') + '<div id="ferr"></div>'; dlg.scrollTop = y || 0; }

// export / import
function exportFile() {
  const out = JSON.parse(JSON.stringify(C)); out.updated = new Date().toISOString(); out.version = (+out.version || 0) + 1;
  const blob = new Blob([JSON.stringify(out, null, 1)], { type: 'application/json' }); const a = document.createElement('a');
  a.href = URL.createObjectURL(blob); a.download = 'content.json'; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  C = out; save(); render();
  toast('Downloaded content.json. Replace the one in your app folder and upload the folder to your site.', 6000);
}
$('#importFile').onchange = async e => { const f = e.target.files[0]; e.target.value = ''; if (!f) return; try { const j = JSON.parse(await f.text()); if (!j.places || !j.shells) throw new Error('That isn’t a content.json file.'); C = j; save(); render(); toast('Loaded. Preview it, then download when you’re happy.'); } catch (err) { toast(err.message, 5000); } };

// ---------- events ----------
document.addEventListener('click', async e => {
  const b = e.target.closest('button'); if (!b) return; const d = b.dataset;
  if (d.sec) { sec = d.sec; filter = ''; localStorage.setItem('editor.sec', JSON.stringify(sec)); render(); if (sec === 'photocheck') fillPhotoCheck(); return; }
  if (d.edit != null) { if (d.sec2) { sec = d.sec2; render(); } return openEdit(sec, +d.edit); }
  if (d.mv) { const [i, dir] = d.mv.split(':').map(Number), list = C[sec], j = i + dir; if (j < 0 || j >= list.length) return; [list[i], list[j]] = [list[j], list[i]]; save(); return render(); }
  switch (d.act) {
    case 'add': return openEdit(sec, null);
    case 'cancel': return dlg.close();
    case 'saveItem': return saveItem();
    case 'delete': { const x = C[sec][cur.i]; const refs = x.id ? refsTo(x.id) : []; if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = refs.length ? `Used by ${refs.length}: tap again to delete anyway` : 'Tap again to delete'; return; } C[sec].splice(cur.i, 1); save(); dlg.close(); render(); return toast('Deleted.'); }
    case 'gps': { toast('Finding your location…'); navigator.geolocation?.getCurrentPosition(p => { $('[data-k=lat]').value = p.coords.latitude.toFixed(6); $('[data-k=lng]').value = p.coords.longitude.toFixed(6); toast(`Pin set (accurate to about ${Math.round(p.coords.accuracy)} m). Remember to Save.`); if (pick) openPicker(); }, () => toast('Couldn’t get your location. Allow location for this site.'), { enableHighAccuracy: true, timeout: 15000 }); return; }
    case 'pick': return openPicker();
    case 'clearLoc': $('[data-k=lat]').value = ''; $('[data-k=lng]').value = ''; if (pick) openPicker(); return;
    case 'upload': return $('#photoFile').click();
    case 'clearPhoto': { readForm(); cur.x.photo = ''; const y = dlg.scrollTop; reopenWith(cur.x, y); return; }
    case 'preview': save(); return window.open('index.html?preview=1', '_blank');
    case 'export': return exportFile();
    case 'discard': if (!b.dataset.armed) { b.dataset.armed = 1; b.textContent = 'Tap again to discard all changes'; return; } C = JSON.parse(JSON.stringify(site)); localStorage.removeItem('content.draft'); render(); return toast('Changes discarded.');
    case 'more': dlg.innerHTML = `<div class="dh"><h2>More</h2><button class="btn sm" data-act="cancel">Close</button></div><div class="db">
        <button class="btn" data-act="import">Open a content.json file…</button><div class="small muted">Load a file you downloaded earlier (for example, to continue on another computer).</div>
        <div class="banner"><b>Publishing your changes</b><br>1. Download content.json.<br>2. Replace the content.json in your app folder with it.<br>3. Upload the folder to your website the same way you did the first time (Netlify: Deploys › drag the folder in).<br>The app on everyone’s phone checks for new content when it opens.</div></div>`; return dlg.open || dlg.showModal();
    case 'import': dlg.close(); return $('#importFile').click();
  }
});
document.addEventListener('input', e => { const k = e.target.dataset.set; if (!k) return; const [a, b2] = k.split('.'); if (b2) { C[a] = C[a] || {}; C[a][b2] = e.target.value; } else { if (e.target.value === '' && a === 'tideStation') delete C[a]; else C[a] = e.target.value; } save(); const st = $('#status'); if (st) st.innerHTML = statusHTML(); });
window.addEventListener('beforeunload', () => save());
load();
