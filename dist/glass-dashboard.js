/*! Glass Dashboard 0.1.5
MIT License

Copyright (c) 2026 Glass Dashboard contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// Source: shortcut.js
// Compact, keyboard-accessible navigation without a square native-button fallback.
if(!customElements.get('glass-shortcut'))customElements.define('glass-shortcut',class extends HTMLElement{
  setConfig(config){
    const action=config.tap_action||{},value=action.action==='url'?action.url_path:action.navigation_path;
    if(typeof value!=='string')throw Error('Shortcut requires a destination.');
    const url=new URL(value,location.origin);
    if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw Error('Use an HTTP(S) destination without credentials.');
    if(action.action!=='url'&&(url.origin!==location.origin||!value.startsWith('/')||value.startsWith('//')))throw Error('Navigation must stay on this Home Assistant.');
    if(!this.shadowRoot)this.attachShadow({mode:'open'});
    this.shadowRoot.innerHTML='<style>:host{display:block}ha-card{display:block;height:72px;box-sizing:border-box}button{display:flex;align-items:center;justify-content:center;gap:12px;width:100%;height:100%;padding:10px;border:0;border-radius:24px;background:transparent;color:inherit;font:inherit;cursor:pointer}ha-icon{--mdc-icon-size:24px}button:focus-visible{outline:2px solid var(--accent-color,#c99769)}</style><ha-card><button type="button"></button></ha-card>';
    const b=this.shadowRoot.querySelector('button');
    if(/^mdi:[a-z0-9-]+$/.test(config.icon||'')){const icon=document.createElement('ha-icon');icon.icon=config.icon;b.append(icon);}
    const text=document.createElement('span');text.textContent=config.name||'Open';b.append(text);
    b.onclick=()=>{if(action.action==='url'){window.open(url.href,'_blank','noopener,noreferrer');return;}history.pushState(null,'',value);window.dispatchEvent(new CustomEvent('location-changed'));};
  }
  set hass(value){}getCardSize(){return 1;}getGridOptions(){return{columns:'full',rows:1};}
});
;

// Source: ios-theme-v2.js
// Device-local presentation preferences. No account credentials or entity data are stored.
(() => {
  const VERSION = '0.1.5';
  if (window.__glassAppearanceV2?.version === VERSION || new URLSearchParams(location.search).has('disable_ios_shell')) return;
  const previous = window.__glassAppearanceV2;
  if (previous?.dispose) previous.dispose();
  else if (previous?.apply) {
    // v2.0.0 did not expose disposal. Suppress only its known queued callback;
    // leave every other HA/browser timer untouched during this one-time upgrade.
    const originalTimeout = window.setTimeout.bind(window);
    const oldApply = previous.apply;
    window.setTimeout = (fn, delay, ...args) => fn === oldApply ? 0 : originalTimeout(fn, delay, ...args);
  }
  const KEY = 'glass-appearance-v2';
  const DEFAULTS = Object.freeze({
    cardColor: '#0d1726', cardOpacity: 0.5, buttonColor: '#1e2c3e', buttonOpacity: 0.55,
    barOpacity: 0.18, accent: '#c99769', textColor: '#f5eee4', font: 'system',
    landscape: '',
    portrait: '', fit: 'cover',
    landscapeX:50,landscapeY:50,portraitX:50,portraitY:50,backgroundDim:0,backgroundColor:'#080e18'
  });
  const FONTS = { system: '-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif', rounded: 'ui-rounded,"Arial Rounded MT Bold",system-ui,sans-serif', serif: 'Georgia,"Times New Roman",serif', mono: 'ui-monospace,SFMono-Regular,Consolas,monospace' };
  function background(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    const u = new URL(value, location.origin);
    if (u.origin !== location.origin || !['http:', 'https:'].includes(u.protocol)) throw Error('Use an image hosted by this Home Assistant, such as /local/background.png.');
    if (Array.from(u.searchParams.keys()).some(k=>/^(authsig|token|access_token|api_key|key|password)$/i.test(k))) throw Error('Use a stable image path without authentication tokens.');
    return u.pathname + u.search;
  }
  function normalize(input = {}) {
    const out = { ...DEFAULTS };
    for (const k of ['cardColor', 'buttonColor', 'accent', 'textColor','backgroundColor']) if (/^#[0-9a-f]{6}$/i.test(input[k] || '')) out[k] = input[k];
    for (const k of ['cardOpacity', 'buttonOpacity', 'barOpacity']) if (Number.isFinite(Number(input[k])) && input[k] !== undefined) out[k] = Math.max(0, Math.min(1, Number(input[k])));
    if (input.font in FONTS) out.font = input.font;
    if (['cover', 'contain'].includes(input.fit)) out.fit = input.fit;
    for (const k of ['landscape', 'portrait']) if (input[k] !== undefined) out[k] = background(input[k]);
    for(const k of ['landscapeX','landscapeY','portraitX','portraitY'])if(input[k]!==undefined&&Number.isFinite(Number(input[k])))out[k]=Math.max(0,Math.min(100,Number(input[k])));
    if(input.backgroundDim!==undefined&&Number.isFinite(Number(input.backgroundDim)))out.backgroundDim=Math.max(0,Math.min(.9,Number(input.backgroundDim)));
    return out;
  }
  function rgba(hex, alpha) { return `rgba(${parseInt(hex.slice(1, 3), 16)},${parseInt(hex.slice(3, 5), 16)},${parseInt(hex.slice(5, 7), 16)},${alpha})`; }
  let settings;
  try { settings = normalize(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { settings = { ...DEFAULTS }; }
  let pending = 0, dirty = true, alive = true, fallback = 0;
  const cards = new Set(), views = new Set();
  const roots = new WeakMap();
  const observers = [];
  const legacyHost = document.getElementById('glass-navigation');
  if (legacyHost) {
    legacyHost.id = 'glass-navigation-legacy';
    legacyHost.style.setProperty('display', 'none', 'important');
    legacyHost.setAttribute('aria-hidden', 'true');
  }
  const host = document.createElement('div');
  host.id = 'glass-navigation';
  const navRoot = host.shadowRoot || host.attachShadow({ mode: 'open' });
  const links = [['Home', '/glass-dashboard/overview'], ['Cameras', '/glass-dashboard/cameras-media'], ['Photos', '/glass-dashboard/photos'], ['System', '/glass-dashboard/system'], ['Settings', '/glass-dashboard/settings']];
  navRoot.innerHTML = `<style>
    :host{position:fixed;top:env(safe-area-inset-top,0px);left:0;right:0;z-index:9999;padding:6px max(8px,env(safe-area-inset-right));box-sizing:border-box;background:var(--glass-bar);border-bottom:1px solid #ffffff26}
    nav{display:flex;gap:5px;max-width:1100px;margin:auto;overflow-x:auto;scrollbar-width:none}button{flex:1 0 68px;min-width:0;min-height:46px;padding:6px 3px;border:1px solid #ffffff33;border-radius:13px;background:var(--glass-button);color:var(--glass-text);font:500 12px var(--glass-font);cursor:pointer}ha-icon{--mdc-icon-size:17px;display:block;margin:0 auto 2px}span{display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
    button[aria-current=page]{border-color:var(--glass-accent);box-shadow:inset 0 0 0 1px var(--glass-accent);color:var(--glass-text)}button:focus-visible{outline:2px solid var(--glass-accent);outline-offset:2px}@media(max-width:550px){button{min-height:44px;font-size:11px}}
  </style><nav aria-label="Home Assistant navigation"></nav>`;
  function setNavigation(items) {
    const safe = items.filter(x => x.enabled !== false && typeof x.path === 'string' && x.path.startsWith('/') && !x.path.startsWith('//')).slice(0, 8);
    if (!safe.some(x => x.id === 'settings')) safe.push({ id: 'settings', label: 'Settings', path: '/glass-dashboard/settings' });
    navRoot.querySelector('nav').replaceChildren();
    for (const item of safe) {
      const b = document.createElement('button'); b.dataset.path = item.path; b.dataset.role = item.id || ''; b.setAttribute('aria-label', item.label); b.title = item.label;
      if (/^mdi:[a-z0-9-]+$/.test(item.icon || '')) { const icon = document.createElement('ha-icon'); icon.icon = item.icon; b.appendChild(icon); }
      const label = document.createElement('span'); label.textContent = String(item.label).slice(0, 24); b.appendChild(label);
      b.onclick = () => { history.pushState(null, '', item.path); window.dispatchEvent(new CustomEvent('location-changed')); schedule(); };
      navRoot.querySelector('nav').appendChild(b);
    }
    schedule();
  }
  setNavigation(links.map(([label,path]) => ({ id: label.toLowerCase(), label, path })));
  const scene = document.createElement('div'); scene.id = 'glass-theme-background'; scene.setAttribute('aria-hidden', 'true');
  Object.assign(scene.style, { position: 'fixed', inset: '0', zIndex: '-1', pointerEvents: 'none', backgroundColor: '#080e18', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' });
  const CSS = `
    ha-sidebar,ha-menu-button,.sidebar-shell{display:none!important}
    :host(home-assistant-main),:host(ha-main),ha-drawer,:host(ha-drawer){--ha-sidebar-width:0px!important;--mdc-drawer-width:0px!important;--kiosk-sidebar-width:0px!important;padding-top:0!important}
    :host(ha-drawer) wa-drawer,:host(ha-drawer) .mdc-drawer,:host(ha-drawer) .mdc-drawer-scrim{display:none!important}.mdc-drawer-app-content{margin-left:0!important}
    :host(ha-panel-lovelace){padding-top:0!important;background:transparent!important}hui-view-background{background:transparent!important;background-image:none!important}
    :host(hui-root) .header{display:none!important}
    :host(hui-root) #view{position:fixed!important;top:var(--glass-content-top,64px)!important;left:0!important;right:0!important;bottom:auto!important;min-height:0!important;max-height:none!important;overflow-x:hidden!important;overflow-y:auto!important;box-sizing:border-box!important;padding-top:0!important;padding-bottom:calc(24px + env(safe-area-inset-bottom,0px))!important;scroll-padding-bottom:32px;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain}
    :host(ha-panel-config){padding-top:var(--glass-content-top,72px)!important;box-sizing:border-box!important}
  `;
  const originals=new Map(), injectedStyles=new Set();
  const active=()=>location.pathname==='/glass-dashboard'||location.pathname.startsWith('/glass-dashboard/');
  function restoreShell(){for(const [el,props]of originals){for(const [key,[value,priority]]of props){value?el.style.setProperty(key,value,priority):el.style.removeProperty(key);}}originals.clear();for(const style of injectedStyles)style.media='not all';host.remove();scene.remove();}
  function set(el, key, value) { if(!originals.has(el))originals.set(el,new Map());const props=originals.get(el);if(!props.has(key))props.set(key,[el.style.getPropertyValue(key),el.style.getPropertyPriority(key)]); if (el.style.getPropertyValue(key) !== value || el.style.getPropertyPriority(key) !== 'important') el.style.setProperty(key, value, 'important'); }
  function mediaCard(card) {
    let n = card;
    for (let i = 0; n && i < 15; i++) {
      if (/picture|camera|slideshow|family-highlight/.test(n.localName || '')) return true;
      n = n.parentElement || n.getRootNode?.().host;
    }
    return false;
  }
  function applyCard(card) {
    if(!active())return;
    if (mediaCard(card)) return;
    set(card, 'background', rgba(settings.cardColor, settings.cardOpacity));
    set(card, 'backdrop-filter', 'none'); set(card, '-webkit-backdrop-filter', 'none'); set(card, 'box-shadow', 'none');
    set(card, 'color', settings.textColor); set(card, 'font-family', FONTS[settings.font]);
    set(card, '--primary-text-color', settings.textColor); set(card, '--secondary-text-color', settings.textColor);
    set(card, '--primary-color', settings.accent); set(card, '--accent-color', settings.accent);
    set(card, '--ha-card-background', rgba(settings.cardColor, settings.cardOpacity));
    set(card, 'border', '1px solid ' + rgba(settings.accent, 0.38));
    set(card, 'border-radius', '24px');
  }
  function scan(root) {
    let style = roots.get(root);
    if (!style) {
      style = document.createElement('style'); style.dataset.glassAppearance = VERSION; style.textContent = CSS;
      root.appendChild(style); roots.set(root, style);injectedStyles.add(style);
      // Some embedded webviews expose a wrapped shadow root. The periodic pass
      // remains the fallback when that wrapper cannot be observed directly.
      try { const o = new MutationObserver(() => { dirty = true; schedule(); }); o.observe(root, { childList: true, subtree: true }); observers.push(o); } catch { if (!fallback) fallback = setInterval(() => { dirty = true; schedule(); }, 15000); }
    }
    // Retire styles from the older startup module, which may load from a cached URL.
    // Styles owned by other themes are left intact.
    for (const el of root.querySelectorAll('*')) {
      if(el.localName==='hui-view-background'){set(el,'background','transparent');set(el,'background-image','none');}
      if (el.localName === 'ha-card') { cards.add(el); applyCard(el); }
      if (el.localName === 'hui-view-container' && el.id === 'view') {
        views.add(el);
      }
      if (el.shadowRoot && el !== host) scan(el.shadowRoot);
    }
  }
  function apply() {
    if (!alive) return;
    if(!active()){restoreShell();dirty=true;return;}for(const style of injectedStyles)style.media='';
    const ha = document.querySelector('home-assistant'); if (!ha) return;
    if (!host.isConnected) document.body.appendChild(host);
    if (!scene.isConnected) document.body.prepend(scene);
    // No unrelated background elements are changed.
    for (const other of document.querySelectorAll('#glass-theme-background')) if (other !== scene) set(other, 'display', 'none');
    const vars = { '--glass-bar': rgba(settings.cardColor, settings.barOpacity), '--glass-button': rgba(settings.buttonColor, settings.buttonOpacity), '--glass-text': settings.textColor, '--glass-accent': settings.accent, '--glass-font': FONTS[settings.font] };
    for (const [k, v] of Object.entries(vars)) set(host, k, v);
    const top = Math.ceil(host.getBoundingClientRect().bottom) + 4;
    const viewport = window.visualViewport;
    const availableHeight = Math.max(120, (viewport?.height || innerHeight) + (viewport?.offsetTop || 0) - top);
    set(document.documentElement, '--glass-content-top', top + 'px'); set(ha, '--glass-content-top', top + 'px');
    set(document.body, 'isolation', 'isolate');
    const portrait = (window.visualViewport?.width || innerWidth) < (window.visualViewport?.height || innerHeight);
    const file = portrait ? settings.portrait || settings.landscape : settings.landscape || settings.portrait;
    const image = file ? `linear-gradient(rgba(0,0,0,${settings.backgroundDim}),rgba(0,0,0,${settings.backgroundDim})),url(` + JSON.stringify(new URL(file, location.origin).href) + ')' : 'none';
    set(scene, 'background-image', image); set(scene, 'background-size', settings.fit);
    set(scene,'background-position',`${settings[portrait?'portraitX':'landscapeX']}% ${settings[portrait?'portraitY':'landscapeY']}%`);set(scene,'background-color',settings.backgroundColor);
    if (ha.shadowRoot && dirty) { dirty = false; scan(ha.shadowRoot); }
    for (const view of views) {
      if (!view.isConnected) { views.delete(view); continue; }
      if (!view.hasAttribute('tabindex')) view.tabIndex = 0;
      for (const [k, v] of Object.entries({ position: 'fixed', top: top + 'px', left: '0px', right: '0px', bottom: 'auto', height: availableHeight + 'px', 'min-height': '0px', 'max-height': 'none', 'overflow-x': 'hidden', 'overflow-y': 'auto', 'box-sizing': 'border-box', 'padding-top': '0px', 'padding-bottom': 'calc(24px + env(safe-area-inset-bottom,0px))', '-webkit-overflow-scrolling': 'touch', 'overscroll-behavior-y': 'contain' })) set(view, k, v);
    }
    for (const b of navRoot.querySelectorAll('button')) {
      const selected = location.pathname === b.dataset.path || (b.dataset.role === 'settings' && (/\/(advanced-appearance|dashboard-setup|navigation-settings|background-settings)$/.test(location.pathname) || location.pathname.startsWith('/config/')));
      selected ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current');
    }
  }
  function schedule() { if (!alive || pending) return; pending = setTimeout(() => { pending = 0; apply(); }, 100); }
  function save(value) { const valid = normalize({...settings,...value}); localStorage.setItem(KEY, JSON.stringify(valid)); settings = valid; for (const card of cards) { if (card.isConnected) applyCard(card); else cards.delete(card); } apply(); window.dispatchEvent(new CustomEvent('glass-appearance-changed')); }
  function dispose() { alive = false; clearTimeout(pending); clearInterval(fallback); for (const o of observers) o.disconnect(); resizeObserver?.disconnect(); restoreShell(); }
  const api = window.__glassAppearanceV2 = { version: VERSION, apply, save, normalize, dispose, setNavigation, defaults: DEFAULTS, get settings() { return { ...settings }; } };
  // Prevent a cached v1 startup import from constructing a second navigation bar.
  window.__glassShellV1 = { apply };
  class GlassAppearanceSettings extends HTMLElement {
    setConfig() { if (!this.shadowRoot) this.attachShadow({ mode: 'open' }); this.render(); }
    set hass(value) { this._hass = value; }
    render() {
      this.shadowRoot.innerHTML = `<style>
        :host{display:block}ha-card{padding:22px}h2{margin:0 0 8px}p{line-height:1.5}label{display:grid;gap:7px;margin:18px 0}input,select,button{font:inherit;box-sizing:border-box;border-radius:10px;border:1px solid #ffffff55;background:#101b29;color:#f5eee4;padding:10px;max-width:100%}input[type=color]{width:100%;height:44px;padding:3px}input[type=range]{width:100%;padding:0;accent-color:var(--accent-color)}.colors{display:grid;grid-template-columns:1fr 1fr;gap:14px}button{min-height:44px;cursor:pointer;margin:5px 5px 5px 0}.status{min-height:24px}small{line-height:1.5;opacity:.85}details{margin-top:18px}summary{cursor:pointer;padding:12px 0}input[type=file]{width:100%}</style>
        <ha-card><h2>Advanced appearance</h2><p>Customize this browser or device. Other devices keep their own settings.</p>
        <div class="colors"><label>Panel color<input data-key="cardColor" type="color"></label><label>Button color<input data-key="buttonColor" type="color"></label><label>Accent color<input data-key="accent" type="color"></label><label>Text color<input data-key="textColor" type="color"></label></div>
        <label>Card opacity <output id="cardOpacityValue"></output><input data-key="cardOpacity" type="range" min="0" max="100" step="1"></label>
        <label>Button opacity <output id="buttonOpacityValue"></output><input data-key="buttonOpacity" type="range" min="0" max="100" step="1"></label>
        <label>Top bar opacity <output id="barOpacityValue"></output><input data-key="barOpacity" type="range" min="0" max="100" step="1"></label><small>0% is clear; 100% is solid. Camera feeds and photo images are preserved.</small>
        <label>Font<select data-key="font"><option value="system">System / iOS</option><option value="rounded">Rounded</option><option value="serif">Serif</option><option value="mono">Monospace</option></select></label>
        <button id="backgrounds">Background images & crop</button><small>Choose images, positioning, and dimming in the background editor.</small>
        <button id="save">Save appearance</button><button id="reset">Restore defaults</button><p class="status" role="status" aria-live="polite"></p>
        <details><summary>Transfer appearance settings</summary><p>Export or import appearance preferences only. No credentials or Home Assistant account data are included.</p><button id="export">Export settings</button><label>Import settings<input id="import" type="file" accept="application/json,.json"></label></details></ha-card>`;
      for (const el of this.shadowRoot.querySelectorAll('[data-key]')) {
        const key = el.dataset.key; el.value = el.type === 'range' ? Math.round(settings[key] * 100) : settings[key];
        if (el.type === 'range') { const out = this.shadowRoot.getElementById(key + 'Value'); out.textContent = el.value + '%'; el.oninput = () => { out.textContent = el.value + '%'; }; }
      }
      const status = this.shadowRoot.querySelector('.status');
      this.shadowRoot.getElementById('backgrounds').onclick=()=>{history.pushState(null,'','/glass-dashboard/background-settings');window.dispatchEvent(new CustomEvent('location-changed'));};
      this.shadowRoot.getElementById('save').onclick = () => {
        try { const value = {}; for (const el of this.shadowRoot.querySelectorAll('[data-key]')) value[el.dataset.key] = el.type === 'range' ? Number(el.value) / 100 : el.value; api.save(value); status.textContent = 'Saved on this device.'; } catch (e) { status.textContent = e.message; }
      };
      this.shadowRoot.getElementById('reset').onclick = () => { try { api.save(DEFAULTS); this.render(); this.shadowRoot.querySelector('.status').textContent = 'Default appearance restored.'; } catch(e) { status.textContent=e.message; } };
      this.shadowRoot.getElementById('export').onclick = () => { const url = URL.createObjectURL(new Blob([JSON.stringify({ version: 2, appearance: api.settings }, null, 2)], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = 'ha-appearance.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); };
      this.shadowRoot.getElementById('import').onchange = async e => { try { const file = e.target.files[0]; if (!file) return; if (file.size > 65536) throw Error('Choose an appearance settings JSON file smaller than 64 KB.'); const value = JSON.parse(await file.text()); api.save(value.appearance || value); this.render(); this.shadowRoot.querySelector('.status').textContent = 'Imported and saved on this device.'; } catch (e) { status.textContent = e.message; } };
    }
    getCardSize() { return 14; }
  }
  if (!customElements.get('glass-appearance-settings-v220')) customElements.define('glass-appearance-settings-v220', GlassAppearanceSettings);
  for (const event of ['resize', 'orientationchange', 'location-changed', 'popstate', 'pageshow']) window.addEventListener(event, schedule);
  window.visualViewport?.addEventListener('resize', schedule);
  let resizeObserver;
  try { resizeObserver = new ResizeObserver(schedule); resizeObserver.observe(host); } catch { /* resize events */ }
  schedule();
  window.dispatchEvent(new CustomEvent('glass-theme-ready'));
})();
;

// Source: dashboard-setup-v1.js
// Dashboard configuration stays on this device. No API credentials are accepted.
(() => {
  if (window.__glassDashboardV1) return;
  const KEY = 'glass-dashboard-v1';
  const BASE = '/glass-dashboard';
  const DEFAULT_NAV = [
    ['home','Home','overview'],['cameras','Cameras','cameras-media'],['photos','Photos','photos'],['system','System','system'],['settings','Settings','settings']
  ].map(([id,label,path]) => ({ id,label,path:BASE+'/'+path,icon:'',enabled:true }));
  const EMPTY_PROFILE = { configured:false, weather:'', cameras:[], players:[], sensors:[], enableWeather:false, enableCameras:false, enableMedia:false, enablePhotos:false, enableServices:false, enableSystem:false, keepWeatherExtras:false, photoMode:'link', photoURL:'', services:[] };
  const clone = value => JSON.parse(JSON.stringify(value));
  function path(value) {
    if (typeof value !== 'string' || !/^\/(?!\/)/.test(value) || value.includes('\\') || /[\u0000-\u001f]/.test(value)) throw Error('Navigation destinations must be Home Assistant paths beginning with /.');
    const url = new URL(value,location.origin); if (url.origin !== location.origin) throw Error('Choose a path on this Home Assistant.');
    return url.pathname + url.search + url.hash;
  }
  function serviceURL(value) {
    if (!value) return '';
    const url = new URL(value,location.origin);
    if (!['http:','https:'].includes(url.protocol) || url.username || url.password) throw Error('Service links must be HTTP(S) links without usernames or passwords.');
    return value.startsWith('/') ? path(value) : url.href;
  }
  function nav(input) {
    if (!Array.isArray(input)) return clone(DEFAULT_NAV);
    const ids = new Set();
    const out = input.slice(0,8).map((item,i) => {
      const id = String(item.id || 'custom-'+i).replace(/[^a-z0-9-]/gi,'').slice(0,40);
      if (!id || ids.has(id)) throw Error('Each navigation button needs a unique identity.'); ids.add(id);
      const label = String(item.label || '').trim().slice(0,24); if (!label) throw Error('Give each navigation button a label.');
      return { id,label,path:id==='settings'?BASE+'/settings':path(item.path),icon:/^mdi:[a-z0-9-]+$/.test(item.icon||'')?item.icon:'',enabled:id==='settings'||item.enabled!==false };
    });
    if (!out.some(x=>x.id==='settings')) out.push(clone(DEFAULT_NAV[4]));
    if (out.length>8) throw Error('Use at most eight buttons, including Settings.');
    return out;
  }
  function profile(input={}) {
    const out={...EMPTY_PROFILE};
    for (const k of ['configured','enableWeather','enableCameras','enableMedia','enablePhotos','enableServices','enableSystem','keepWeatherExtras']) if(typeof input[k]==='boolean')out[k]=input[k];
    out.weather=/^weather\.[a-z0-9_]+$/.test(input.weather||'')?input.weather:'';
    out.cameras=Array.isArray(input.cameras)?[...new Set(input.cameras.filter(x=>/^camera\.[a-z0-9_]+$/.test(x)))].slice(0,24):[];
    out.players=Array.isArray(input.players)?[...new Set(input.players.filter(x=>/^media_player\.[a-z0-9_]+$/.test(x)))].slice(0,24):[];
    out.sensors=Array.isArray(input.sensors)?[...new Set(input.sensors.filter(x=>/^sensor\.[a-z0-9_]+$/.test(x)))].slice(0,24):[];
    out.photoMode='link';out.photoURL=serviceURL(input.photoURL||'');
    out.services=Array.isArray(input.services)?input.services.slice(0,12).filter(x=>String(x.name||'').trim()&&x.url).map(x=>({name:String(x.name).trim().slice(0,40),url:serviceURL(x.url),icon:/^mdi:[a-z0-9-]+$/.test(x.icon||'')?x.icon:'mdi:open-in-new'})):[];
    return out;
  }
  let state;
  try { const s=JSON.parse(localStorage.getItem(KEY)||'{}');state={navigation:nav(s.navigation),profile:profile(s.profile)}; } catch { state={navigation:clone(DEFAULT_NAV),profile:clone(EMPTY_PROFILE)}; }
  function navigationApply() {
    const p=state.profile;
    const items=state.navigation.filter(x=>!p.configured || x.id==='settings' || !((x.id==='cameras'&&!p.enableCameras&&!p.enableMedia)||(x.id==='photos'&&!p.enablePhotos)||(x.id==='system'&&!p.enableSystem)));
    window.__glassAppearanceV2?.setNavigation?.(items);
  }
  function save(next) { const valid={navigation:nav(next.navigation),profile:profile(next.profile)};localStorage.setItem(KEY,JSON.stringify(valid));state=valid;navigationApply();window.dispatchEvent(new CustomEvent('glass-dashboard-changed')); }
  const api=window.__glassDashboardV1={get state(){return clone(state)},save,nav,profile,defaults:clone(DEFAULT_NAV)};
  window.addEventListener('glass-theme-ready',navigationApply);navigationApply();
  window.addEventListener('storage',e=>{if(e.key!==KEY||!e.newValue)return;try{const next=JSON.parse(e.newValue);state={navigation:nav(next.navigation),profile:profile(next.profile)};navigationApply();window.dispatchEvent(new CustomEvent('glass-dashboard-changed'));}catch{/* retain last valid settings */}});
  const STYLE=`:host{display:block}ha-card{padding:20px}h2{margin:0 0 10px}p,small{line-height:1.5}label{display:grid;gap:6px;margin:14px 0}input,select,button{font:inherit;box-sizing:border-box;border:1px solid #ffffff55;border-radius:10px;padding:10px;background:#101b29;color:#f5eee4;max-width:100%}input:not([type=checkbox]),select{width:100%}input[type=checkbox]{width:20px;height:20px;margin-right:8px;vertical-align:middle}.check{display:block}button{min-height:44px;cursor:pointer;margin:4px 4px 4px 0}button:disabled{opacity:.45;cursor:default}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent-color,#c99769)}.row{border:1px solid #ffffff33;border-radius:14px;padding:14px;margin:14px 0}.pair{display:grid;grid-template-columns:1fr 1fr;gap:12px}.status{min-height:24px}.steps{display:flex;gap:6px;flex-wrap:wrap;margin:12px 0}.steps span{padding:6px 8px;border-radius:8px;border:1px solid #ffffff33}.steps [aria-current]{border-color:var(--accent-color,#c99769)}small{display:block;opacity:.85}.actions{margin-top:18px}select[multiple]{min-height:130px}@media(max-width:500px){.pair{grid-template-columns:1fr}}`;
  function field(root,labelText,value,onchange,type='text') {
    const label=document.createElement('label');label.append(document.createTextNode(labelText));const input=document.createElement('input');input.type=type;
    if(type==='checkbox'){input.checked=!!value;label.className='check';input.onchange=()=>onchange(input.checked);label.prepend(input);}else{input.value=value||'';input.oninput=()=>onchange(input.value);label.append(input);}root.append(label);return input;
  }
  function button(root,text,fn,disabled=false){const b=document.createElement('button');b.textContent=text;b.disabled=disabled;b.onclick=fn;root.append(b);return b;}
  class GlassNavigationEditor extends HTMLElement {
    setConfig(){if(!this.shadowRoot)this.attachShadow({mode:'open'});this.draft=api.state.navigation;this.render();}
    set hass(h){this._hass=h;}
    render(){
      this.shadowRoot.innerHTML=`<style>${STYLE}</style><ha-card><h2>Navigation buttons</h2><p>Rename, reorder, add, or hide buttons on this device. Settings always remains available.</p><div class="rows"></div><div class="actions"></div><p class="status" role="status"></p></ha-card>`;
      const rows=this.shadowRoot.querySelector('.rows');
      this.draft.forEach((item,i)=>{
        const row=document.createElement('div');row.className='row';rows.append(row);
        field(row,'Button label',item.label,v=>item.label=v);
        const pair=document.createElement('div');pair.className='pair';row.append(pair);
        field(pair,'Icon (optional mdi:name)',item.icon,v=>item.icon=v);
        const route=field(pair,'Destination',item.path,v=>item.path=v);if(item.id==='settings'){route.disabled=true;route.title='Settings is the recovery route.';}
        const enabled=field(row,'Show this button',item.enabled,v=>item.enabled=v,'checkbox');enabled.disabled=item.id==='settings';
        button(row,'Move up',()=>{[this.draft[i-1],this.draft[i]]=[this.draft[i],this.draft[i-1]];this.render();},i===0);
        button(row,'Move down',()=>{[this.draft[i+1],this.draft[i]]=[this.draft[i],this.draft[i+1]];this.render();},i===this.draft.length-1);
        button(row,'Remove',()=>{this.draft.splice(i,1);this.render();},item.id==='settings');
      });
      const actions=this.shadowRoot.querySelector('.actions'),status=this.shadowRoot.querySelector('.status');
      button(actions,'Add button',()=>{this.draft.push({id:'custom-'+Date.now().toString(36),label:'New button',path:BASE+'/overview',icon:'',enabled:true});this.render();},this.draft.length>=8);
      button(actions,'Save navigation',()=>{try{api.save({...api.state,navigation:this.draft});this.draft=api.state.navigation;status.textContent='Navigation saved on this device.';}catch(e){status.textContent=e.message;}});
      button(actions,'Cancel changes',()=>{this.draft=api.state.navigation;this.render();});
      button(actions,'Restore navigation defaults',()=>{api.save({...api.state,navigation:api.defaults});this.draft=api.state.navigation;this.render();this.shadowRoot.querySelector('.status').textContent='Default navigation restored.';});
    }
    getCardSize(){return 10;}getGridOptions(){return{columns:'full',rows:'auto'};}
  }
  class GlassSetupWizard extends HTMLElement {
    setConfig(config){this.config=config;if(!this.shadowRoot)this.attachShadow({mode:'open'});this.step=0;this.draft=api.state.profile.configured?api.state.profile:profile({...config.defaults,configured:false});this.render();}
    set hass(h){const first=!this._hass;this._hass=h;if(first&&this.config)this.render();}
    entitySelect(root,labelText,domain,key,multiple=false){
      const label=document.createElement('label');label.textContent=labelText;const select=document.createElement('select');select.multiple=multiple;if(multiple)select.size=5;
      if(!multiple){const blank=document.createElement('option');blank.value='';blank.textContent='Not selected';select.append(blank);}
      const entities=Object.values(this._hass?.states||{}).filter(e=>e.entity_id.startsWith(domain+'.')).sort((a,b)=>String(a.attributes.friendly_name||a.entity_id).localeCompare(String(b.attributes.friendly_name||b.entity_id)));
      for(const e of entities){const o=document.createElement('option');o.value=e.entity_id;o.textContent=e.attributes.friendly_name||e.entity_id;o.selected=multiple?this.draft[key].includes(e.entity_id):this.draft[key]===e.entity_id;select.append(o);}
      select.onchange=()=>{this.draft[key]=multiple?Array.from(select.selectedOptions).map(o=>o.value):select.value;};label.append(select);root.append(label);
      if(!entities.length){const p=document.createElement('small');p.textContent=`No ${domain.replace('_',' ')} entities found. You can leave this section off.`;root.append(p);}
    }
    render(){
      if(!this.config)return;
      this.shadowRoot.innerHTML=`<style>${STYLE}</style><ha-card><h2>Dashboard setup</h2><p>Choose the sections and devices shown in this browser. Your existing selections stay in place until you finish and save.</p><div class="steps"></div><div class="body"></div><div class="actions"></div><p class="status" role="status"></p></ha-card>`;
      ['Sections','Entities','Services & photos','Review'].forEach((name,i)=>{const s=document.createElement('span');s.textContent=`${i+1}. ${name}`;if(i===this.step)s.setAttribute('aria-current','step');this.shadowRoot.querySelector('.steps').append(s);});
      const body=this.shadowRoot.querySelector('.body'),d=this.draft;
      if(this.step===0){for(const [key,label]of [['enableWeather','Weather'],['enableCameras','Cameras'],['enableMedia','Media playback'],['enablePhotos','Photos'],['enableServices','Service shortcuts'],['enableSystem','System monitoring']])field(body,label,d[key],v=>d[key]=v,'checkbox');}
      if(this.step===1){
        if(d.enableWeather){this.entitySelect(body,'Weather entity','weather','weather');field(body,'Keep existing extra weather cards',d.keepWeatherExtras,v=>d.keepWeatherExtras=v,'checkbox');}
        if(d.enableSystem)this.entitySelect(body,'System sensors','sensor','sensors',true);
        if(d.enableCameras)this.entitySelect(body,'Camera entities','camera','cameras',true);
        if(d.enableMedia){this.entitySelect(body,'Media players','media_player','players',true);const p=document.createElement('small');p.textContent='Leave media players unselected to keep the existing playback cards.';body.append(p);}
      }
      if(this.step===2){
        if(d.enablePhotos){const l=document.createElement('label');l.textContent='Photo source';const s=document.createElement('select');for(const [value,text]of [['link','Open a photo service link']]){const o=document.createElement('option');o.value=value;o.textContent=text;o.selected=d.photoMode===value;s.append(o);}s.onchange=()=>{d.photoMode=s.value;this.render();};l.append(s);body.append(l);if(d.photoMode==='link')field(body,'Photo service URL',d.photoURL,v=>d.photoURL=v);}
        if(d.enableServices){const h=document.createElement('h3');h.textContent='Service shortcuts';body.append(h);d.services.forEach((service,i)=>{const row=document.createElement('div');row.className='row';body.append(row);field(row,'Service name',service.name,v=>service.name=v);field(row,'Service URL',service.url,v=>service.url=v);field(row,'Service icon',service.icon,v=>service.icon=v);button(row,'Remove service',()=>{d.services.splice(i,1);this.render();});});button(body,'Add service',()=>{d.services.push({name:'',url:'',icon:'mdi:open-in-new'});this.render();},d.services.length>=12);}
      }
      if(this.step===3){
        const p=document.createElement('p');p.textContent='Saving updates this device’s configured sections and menu visibility. It does not create integrations, change devices, or alter media originals.';body.append(p);
        const list=document.createElement('ul');for(const text of [`Weather: ${d.enableWeather?(d.weather||'not selected'):'off'}`,`Cameras: ${d.enableCameras?d.cameras.length+' selected':'off'}`,`Media: ${d.enableMedia?(d.players.length?d.players.length+' selected':'existing playback cards'):'off'}`,`Photos: ${d.enablePhotos?(d.photoMode==='existing'?'existing photo cards':'service link'):'off'}`,`Services: ${d.enableServices?d.services.filter(s=>s.name&&s.url).length+' shortcuts':'off'}`,`System monitoring: ${d.enableSystem?'on':'off'}`]){const li=document.createElement('li');li.textContent=text;list.append(li);}body.append(list);
      }
      const actions=this.shadowRoot.querySelector('.actions'),status=this.shadowRoot.querySelector('.status');
      button(actions,'Back',()=>{this.step--;this.render();},this.step===0);
      if(this.step<3)button(actions,'Next',()=>{this.step++;this.render();});
      else button(actions,'Save dashboard setup',()=>{try{
        if(d.enableWeather&&!d.weather)throw Error('Select a weather entity or turn Weather off.');
        if(d.enableWeather&&!this._hass?.states[d.weather])throw Error('The selected weather entity is unavailable. Go Back and select an available entity.');
        if(d.enableCameras&&!d.cameras.length)throw Error('Select at least one camera or turn Cameras off.');
        if(d.enableCameras&&d.cameras.some(id=>!this._hass?.states[id]))throw Error('A selected camera is unavailable. Go Back and update the camera selection.');
        if(d.enablePhotos&&d.photoMode==='link'&&!d.photoURL)throw Error('Enter a photo service URL or keep the existing photo cards.');
        api.save({...api.state,profile:{...d,configured:true}});status.textContent='Dashboard setup saved on this device.';
      }catch(e){status.textContent=e.message;}});
      button(actions,'Cancel changes',()=>{this.step=0;this.draft=api.state.profile.configured?api.state.profile:profile({...this.config.defaults,configured:false});this.render();});
      button(actions,'Use original dashboard cards',()=>{api.save({...api.state,profile:{...api.state.profile,configured:false}});this.step=0;this.draft=profile({...this.config.defaults,configured:false});this.render();this.shadowRoot.querySelector('.status').textContent='Original dashboard cards restored on this device.';});
    }
    getCardSize(){return 10;}getGridOptions(){return{columns:'full',rows:'auto'};}
  }
  class GlassConfiguredSection extends HTMLElement {
    constructor(){super();this._change=()=>this.rebuild();this._revision=0;this._children=[];}
    setConfig(c){this.config=c;if(!this.shadowRoot)this.attachShadow({mode:'open'});this.rebuild();}
    set hass(h){const first=!this._hass;this._hass=h;if(first&&this.config)this.rebuild();else for(const child of this._children)child.hass=h;}
    connectedCallback(){window.addEventListener('glass-dashboard-changed',this._change);if(this.config)this.rebuild();}
    disconnectedCallback(){window.removeEventListener('glass-dashboard-changed',this._change);this._revision++;}
    async rebuild(){
      if(!this.config)return;const revision=++this._revision,p=api.state.profile,mode=this.config.mode;let configs=this.config.cards||[];
      const enabled={weather:p.enableWeather,cameras:p.enableCameras,media:p.enableMedia,photos:p.enablePhotos,services:p.enableServices,system:p.enableSystem}[mode];
      if(p.configured&&!enabled)configs=[];
      else if(p.configured){
        if(mode==='weather'){configs=p.weather&&this._hass?.states[p.weather]?[{type:'weather-forecast',entity:p.weather,show_forecast:true,forecast_type:'daily'}]:[];if(p.keepWeatherExtras)configs.push(...(this.config.cards||[]).filter(c=>c.type!=='weather-forecast'));}
        if(mode==='weather')configs.push({type:'custom:glass-shortcut',name:'Local station readings',icon:'mdi:weather-station',tap_action:{action:'navigate',navigation_path:'/glass-dashboard/local-weather'}});
        if(mode==='cameras'){const ids=p.cameras.filter(id=>this._hass?.states[id]);configs=ids.length?[{type:'grid',columns:2,square:false,cards:ids.map(entity=>({type:'picture-entity',entity,name:this._hass.states[entity].attributes.friendly_name||entity,camera_view:'auto',show_state:false,aspect_ratio:'16:9',tap_action:{action:'more-info'}}))}]:[];}
        if(mode==='system')configs=p.sensors.filter(entity=>this._hass?.states[entity]).length?[{type:'entities',title:'System monitoring',show_header_toggle:false,entities:p.sensors.filter(entity=>this._hass?.states[entity])}]:[];
        if(mode==='media')configs=p.players.filter(entity=>this._hass?.states[entity]).map(entity=>({type:'media-control',entity}));
        if(mode==='photos'&&p.photoMode==='link')configs=p.photoURL?[{type:'custom:glass-shortcut',name:'Open photos',icon:'mdi:image-multiple',tap_action:{action:'url',url_path:p.photoURL}}]:[];
        if(mode==='services')configs=p.services.length?[{type:'grid',columns:2,square:false,cards:p.services.map(s=>({type:'custom:glass-shortcut',name:s.name,icon:s.icon,tap_action:s.url.startsWith('/')?{action:'navigate',navigation_path:s.url}:{action:'url',url_path:s.url}}))}]:[];
      }
      this._children=[];this.style.display=configs.length?'block':'none';this.shadowRoot.innerHTML='<style>:host{display:block}.stack{display:grid;gap:16px}.error{padding:16px}</style><div class="stack"></div>';
      let outer=this;
      for(let i=0;outer&&i<15;i++){
        if(outer.localName==='hui-section'){outer.style.display=configs.length?'':'none';break;}
        outer=outer.parentElement||outer.getRootNode?.().host;
      }
      if(!configs.length)return;
      try{const helpers=await window.loadCardHelpers();if(revision!==this._revision||!this.isConnected)return;for(const config of configs){const card=helpers.createCardElement(config);
        // Native helpers may return a not-yet-defined lazy card. Their whenDefined
        // callback upgrades it and sets its config before our continuation runs.
        if(!customElements.get(card.localName))await customElements.whenDefined(card.localName);
        if(revision!==this._revision||!this.isConnected)return;
        card.hass=this._hass;this._children.push(card);this.shadowRoot.querySelector('.stack').append(card);}}
      catch{if(revision!==this._revision)return;const p=document.createElement('p');p.className='error';p.textContent='This section could not load. Open Settings → Setup to review its selections.';this.shadowRoot.querySelector('.stack').append(p);}
    }
    getCardSize(){return this._children.reduce((total,c)=>total+(Number(c.getCardSize?.())||3),0)||1;}getGridOptions(){return{columns:'full',rows:'auto'};}
  }
  for(const [name,card]of [['glass-navigation-editor',GlassNavigationEditor],['glass-setup-wizard',GlassSetupWizard],['glass-configured-section',GlassConfiguredSection]])if(!customElements.get(name))customElements.define(name,card);
})();
;

// Source: background-settings-v1.js
// Native HA image library + device-local crop preferences. Selected files upload only on Apply.
(() => {
  if(customElements.get('glass-background-settings-v103'))return;
  const KEYS=['landscape','portrait','landscapeX','landscapeY','portraitX','portraitY','backgroundDim','backgroundColor','fit'];
  const COPY={landscape:'Landscape',portrait:'Portrait'};
  const getAPI=()=>window.__glassAppearanceV2;
  const pick=s=>Object.fromEntries(KEYS.map(k=>[k,s[k]]));
  function paint(source,dim){return source?`linear-gradient(rgba(0,0,0,${dim}),rgba(0,0,0,${dim})),url(${JSON.stringify(source)})`:'none';}
  class GlassBackgroundSettings extends HTMLElement {
    constructor(){super();this._files={};this._blobs={};this._decoded={};this._seq={};this._epoch=0;this._device=innerWidth/innerHeight<.65?'phone':'tablet';this._busy=false;this._ready=()=>{if(!this._draft)this.initialize();};}
    setConfig(){if(!this.shadowRoot)this.attachShadow({mode:'open'});this.initialize();}
    set hass(hass){this._hass=hass;}
    connectedCallback(){window.addEventListener('glass-theme-ready',this._ready);if(!this._draft&&this.shadowRoot)this.initialize();}
    disconnectedCallback(){window.removeEventListener('glass-theme-ready',this._ready);this._controller?.abort();this.clearFiles();}
    initialize(){const api=getAPI();if(!api?.defaults||api.defaults.portraitX===undefined){this.shadowRoot.textContent='Loading background controls…';return;}this._draft=pick(api.settings);this.render();}
    clearFiles(){this._epoch++;for(const url of Object.values(this._blobs))URL.revokeObjectURL(url);this._files={};this._blobs={};this._decoded={};}
    status(text){const p=this.shadowRoot.querySelector('.status');if(p)p.textContent=text;}
    render(){
      const d=this._draft;
      this.shadowRoot.innerHTML=`<style>
        :host{display:block}ha-card{padding:20px}h2{margin:0 0 8px}p,small{line-height:1.5}small{display:block;opacity:.9}label{display:grid;gap:7px;margin:14px 0}input,select,button{font:inherit;border:1px solid #ffffff55;background:#101b29;color:#f5eee4;border-radius:10px;padding:10px;box-sizing:border-box;max-width:100%}input:not([type=range]),select{width:100%}input[type=range]{width:100%;padding:0;accent-color:var(--accent-color,#c99769)}input[type=color]{height:44px;padding:3px}input[type=file]{padding:8px}button{min-height:44px;margin:4px 6px 4px 0;cursor:pointer}button:disabled{opacity:.5;cursor:default}.sources{display:grid;grid-template-columns:1fr 1fr;gap:18px}.source{border:1px solid #ffffff33;border-radius:16px;padding:14px;min-width:0}h3{margin:0 0 10px}.previews{display:grid;grid-template-columns:1.5fr 1fr;gap:18px;align-items:center}.preview{position:relative;border:1px solid #ffffff66;border-radius:14px;overflow:hidden;background-repeat:no-repeat;min-width:0}.preview.landscape{aspect-ratio:19.5/9}.preview.portrait{aspect-ratio:9/19.5;max-height:360px}.safe{position:absolute;inset:0 0 auto;height:10%;min-height:16px;background:#080e1855;color:white;text-shadow:0 1px 3px black;font:10px system-ui;display:flex;align-items:center;justify-content:center;border-bottom:1px dashed #ffffff88;pointer-events:none}.status{min-height:28px}.library{margin:10px 0}.file-info{overflow-wrap:anywhere}details{margin:16px 0}summary{cursor:pointer;padding:8px 0}fieldset{border:0;padding:0;margin:0;min-width:0}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent-color,#c99769)}@media(max-width:650px){.sources{grid-template-columns:1fr}.previews{grid-template-columns:1fr 1fr;gap:12px}.preview.portrait{max-height:320px}}
      </style><ha-card><h2>Background images & crop</h2><p>Preview changes before applying them. Your current background stays in place until you press Apply.</p>
      <fieldset><div class="presets" role="group" aria-label="Starting images"><p>Starting images — tap to preview</p><button type="button" data-preset="custom">Current selection</button><button type="button" data-preset="solid">Solid color</button></div><small>Choose a starting image, then press Apply backgrounds to save it.</small><div class="sources"></div>
      <label>Preview screen<select id="device"><option value="phone">Phone</option><option value="tablet">Tablet</option></select></label>
      <div class="previews"><div><small>Landscape preview</small><div class="preview landscape" aria-label="Landscape crop preview"><span class="safe">Navigation safe area</span></div></div><div><small>Portrait preview</small><div class="preview portrait" aria-label="Portrait crop preview"><span class="safe">Navigation safe area</span></div></div></div>
      <label>Image fit<select id="fit"><option value="cover">Fill screen — edges may crop</option><option value="contain">Show entire image — may leave space</option></select></label>
      <label>Background dimming <output id="dim-value"></output><input id="dim" aria-label="Background dimming" type="range" min="0" max="90" step="1"></label>
      <label>Solid / edge color<input id="edge-color" aria-label="Solid or edge color" type="color"></label>
      <small>Leaving one image blank uses the other in both orientations. Uploads use Home Assistant’s image library. Choosing a file previews it locally; Apply uploads it. Uploaded images remain in the library if later replaced.</small>
      <button id="apply">Apply backgrounds</button><button id="cancel">Cancel changes</button><button id="defaults">Restore default backgrounds</button></fieldset><p class="status" role="status" aria-live="polite"></p></ha-card>`;
      const sources=this.shadowRoot.querySelector('.sources');
      for(const slot of ['landscape','portrait']){
        const box=document.createElement('section');box.className='source';sources.append(box);const h=document.createElement('h3');h.textContent=COPY[slot]+' image';box.append(h);
        const fileLabel=document.createElement('label');fileLabel.textContent='Choose '+slot+' file';const file=document.createElement('input');file.type='file';file.accept='image/jpeg,image/png,image/gif';file.setAttribute('aria-label','Choose '+slot+' file');file.onchange=()=>this.stageFile(slot,file.files[0]);fileLabel.append(file);box.append(fileLabel);
        const hint=document.createElement('small');hint.textContent='JPG, PNG or GIF, up to 9 MB.';box.append(hint);
        const info=document.createElement('small');info.className='file-info';info.dataset.slot=slot;box.append(info);
        const libraryButton=document.createElement('button');libraryButton.textContent='Choose '+slot+' from HA library';libraryButton.onclick=()=>this.loadLibrary(slot,box);box.append(libraryButton);
        const advanced=document.createElement('details'),summary=document.createElement('summary');summary.textContent='Use an existing HA image path';advanced.append(summary);const label=document.createElement('label');label.textContent=COPY[slot]+' image path';const input=document.createElement('input');input.type='text';input.dataset.path=slot;input.value=d[slot]||'';input.setAttribute('aria-label',COPY[slot]+' image path');input.oninput=()=>{this.clearSlot(slot);d[slot]=input.value;file.value='';this.updatePreview();};label.append(input);advanced.append(label);box.append(advanced);
        for(const [axis,title]of [['X','Horizontal focus'],['Y','Vertical focus']]){const key=slot+axis,l=document.createElement('label');l.textContent=title;const out=document.createElement('output');out.textContent=d[key]+'%';const range=document.createElement('input');range.type='range';range.min='0';range.max='100';range.value=d[key];range.setAttribute('aria-label',COPY[slot]+' '+title.toLowerCase());range.oninput=()=>{d[key]=Number(range.value);out.textContent=range.value+'%';this.updatePreview();};l.append(out,range);box.append(l);}
      }
      this.shadowRoot.getElementById('fit').value=d.fit;this.shadowRoot.getElementById('fit').onchange=e=>{d.fit=e.target.value;this.updatePreview();};
      this.shadowRoot.getElementById('dim').value=Math.round(d.backgroundDim*100);this.shadowRoot.getElementById('dim').oninput=e=>{d.backgroundDim=Number(e.target.value)/100;this.updatePreview();};
      this.shadowRoot.getElementById('edge-color').value=d.backgroundColor;this.shadowRoot.getElementById('edge-color').oninput=e=>{d.backgroundColor=e.target.value;this.updatePreview();};
      this.shadowRoot.getElementById('device').value=this._device;this.shadowRoot.getElementById('device').onchange=e=>{this._device=e.target.value;this.updatePreview();};
      for(const b of this.shadowRoot.querySelectorAll('[data-preset]')){
        const selected=b.dataset.preset===(this._preset||'custom');b.setAttribute('aria-pressed',String(selected));if(selected){b.style.borderColor='var(--accent-color,#c99769)';b.style.boxShadow='inset 0 0 0 1px var(--accent-color,#c99769)';}
        b.onclick=()=>this.choosePreset(b.dataset.preset);
      }
      this.shadowRoot.getElementById('apply').onclick=()=>this.applyChanges();
      this.shadowRoot.getElementById('cancel').onclick=()=>{this.clearFiles();this._preset='custom';this._draft=pick(getAPI().settings);this.render();this.status('Changes cancelled. Your saved background is unchanged.');};
      this.shadowRoot.getElementById('defaults').onclick=()=>{this.clearFiles();this._preset='solid';this._draft=pick(getAPI().defaults);this.render();this.status('Default backgrounds are ready to preview. Press Apply to save them.');};
      this.updatePreview();
    }
    choosePreset(preset){
      if(this._busy)return;
      this.clearFiles();this._preset=preset;const d=this._draft;
      if(preset==='custom')this._draft=pick(getAPI().settings);
      else{
        if(preset==='solid')d.landscape=d.portrait='';
        for(const k of ['landscapeX','landscapeY','portraitX','portraitY'])d[k]=50;
      }
      this.render();this.status(preset==='custom'?'Saved selection restored for preview.':'Starting images selected for preview. Press Apply backgrounds to save.');
    }
    clearSlot(slot){this._seq[slot]=(this._seq[slot]||0)+1;if(this._blobs[slot])URL.revokeObjectURL(this._blobs[slot]);delete this._blobs[slot];delete this._files[slot];delete this._decoded[slot];}
    async stageFile(slot,file){
      if(!file)return;
      const epoch=this._epoch,seq=this._seq[slot]=(this._seq[slot]||0)+1;
      try{
        if(!['image/jpeg','image/png','image/gif'].includes(file.type))throw Error('Choose a JPG, PNG, or GIF image.');
        if(file.size>9*1024*1024)throw Error('Choose an image smaller than 9 MB.');
        const url=URL.createObjectURL(file),image=new Image();image.src=url;
        try{await image.decode();}catch{URL.revokeObjectURL(url);throw Error('This file could not be read as an image.');}
        if(!this.isConnected||epoch!==this._epoch||seq!==this._seq[slot]){URL.revokeObjectURL(url);return;}
        this.clearSlot(slot);this._files[slot]=file;this._blobs[slot]=url;this._decoded[slot]={width:image.naturalWidth,height:image.naturalHeight};this.status(COPY[slot]+' image selected. It has not been uploaded or applied.');this.updatePreview();
      }catch(e){this.status(e.message);}
    }
    async loadLibrary(slot,box){
      try{
        if(!this._hass?.callWS)throw Error('The image library is not available in this session.');
        const images=await this._hass.callWS({type:'image/list'});box.querySelector('.library')?.remove();
        const label=document.createElement('label');label.className='library';label.textContent='Saved '+slot+' image';const select=document.createElement('select');select.setAttribute('aria-label','Saved '+slot+' image');const empty=document.createElement('option');empty.value='';empty.textContent=images.length?'Choose an image…':'No uploaded images yet';select.append(empty);
        for(const image of images){if(!/^[a-f0-9]{32}$/.test(image.id))continue;const o=document.createElement('option');o.value=image.id;o.textContent=image.name||'Uploaded image';select.append(o);}
        select.onchange=()=>{if(!select.value)return;this.clearSlot(slot);this._draft[slot]='/api/image/serve/'+select.value+'/original';this.shadowRoot.querySelector(`[data-path="${slot}"]`).value=this._draft[slot];this.status('Library image selected for preview. Press Apply to save it.');this.updatePreview();};label.append(select);box.append(label);
      }catch(e){this.status(e.message||'The Home Assistant image library could not load.');}
    }
    updatePreview(){
      const d=this._draft,tablet=this.shadowRoot.getElementById('device').value==='tablet';
      this.shadowRoot.getElementById('dim-value').textContent=Math.round(d.backgroundDim*100)+'%';
      let normalized;try{normalized=getAPI().normalize({...getAPI().settings,...d});}catch(e){this.status(e.message);return;}
      for(const slot of ['landscape','portrait']){
        const other=slot==='landscape'?'portrait':'landscape';const source=this._blobs[slot]||normalized[slot]||this._blobs[other]||normalized[other];const preview=this.shadowRoot.querySelector('.preview.'+slot);
        preview.style.aspectRatio=tablet?(slot==='landscape'?'4 / 3':'3 / 4'):(slot==='landscape'?'19.5 / 9':'9 / 19.5');preview.style.backgroundImage=paint(source,d.backgroundDim);preview.style.backgroundSize=d.fit;preview.style.backgroundPosition=d[slot+'X']+'% '+d[slot+'Y']+'%';preview.style.backgroundColor=d.backgroundColor;
        const info=this.shadowRoot.querySelector(`.file-info[data-slot="${slot}"]`);info.textContent=this._files[slot]?'Selected: '+this._files[slot].name+' · '+this._decoded[slot].width+' × '+this._decoded[slot].height+' · not uploaded':'';
      }
    }
    async applyChanges(){
      if(this._busy)return;this._busy=true;this.shadowRoot.querySelector('fieldset').disabled=true;this._controller=new AbortController();const timeout=setTimeout(()=>this._controller.abort(),45000);
      try{
        const api=getAPI(),value=pick(api.normalize({...api.settings,...this._draft}));
        for(const slot of ['landscape','portrait'])if(this._files[slot]){
          if(!this._hass?.fetchWithAuth)throw Error('Uploads are unavailable in this session. Choose an existing library image or HA image path.');
          this.status('Uploading '+slot+' image to Home Assistant…');const form=new FormData();form.append('file',this._files[slot]);
          const response=await this._hass.fetchWithAuth('/api/image/upload',{method:'POST',body:form,signal:this._controller.signal});
          if(!response.ok)throw Error(response.status===413?'The image is too large for Home Assistant.':'Image upload failed ('+response.status+'). Your saved background is unchanged.');
          const image=await response.json();if(!/^[a-f0-9]{32}$/.test(image.id||''))throw Error('Home Assistant returned an invalid image reference.');
          value[slot]='/api/image/serve/'+image.id+'/original';this._draft[slot]=value[slot];this.clearSlot(slot);
          if(!this.isConnected)return;
        }
        api.save(value);this._draft=pick(api.settings);this.render();this.status('Backgrounds applied and saved on this device.');
      }catch(e){this.status(e.name==='AbortError'?'Upload stopped. Your saved background is unchanged.':e.message);this.updatePreview();}
      finally{clearTimeout(timeout);this._controller=null;this._busy=false;const fieldset=this.shadowRoot.querySelector('fieldset');if(fieldset)fieldset.disabled=false;}
    }
    getCardSize(){return 16;}getGridOptions(){return{columns:'full',rows:'auto'};}
  }
  customElements.define('glass-background-settings-v103',GlassBackgroundSettings);
})();
;

// Source: camera-gallery-v1.js
// All camera entities available to the signed-in HA user; uses native cards and permissions.
(() => {
  if(customElements.get('glass-all-cameras'))return;
  class GlassAllCameras extends HTMLElement {
    constructor(){super();this._revision=0;this._cards=[];}
    setConfig(config){this.config=config;if(!this.shadowRoot)this.attachShadow({mode:'open'});this.build();}
    set hass(hass){
      this._hass=hass;
      const ids=Object.keys(hass?.states||{}).filter(id=>id.startsWith('camera.')).sort();
      if(ids.join('|')!==this._ids?.join('|')){this._ids=ids;this.build();}
      else for(const card of this._cards)card.hass=hass;
    }
    connectedCallback(){if(this.config)this.build();}
    disconnectedCallback(){this._revision++;}
    async build(){
      if(!this.config||!this._hass)return;
      const revision=++this._revision;this._cards=[];
      this.shadowRoot.innerHTML='<style>:host{display:block}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}h2{margin:0 0 16px}p{padding:16px}@media(max-width:450px){.grid{grid-template-columns:1fr}}</style><h2>All cameras</h2><div class="grid"></div>';
      const grid=this.shadowRoot.querySelector('.grid');
      if(!this._ids?.length){grid.textContent='No camera entities are available.';return;}
      try{
        const helpers=await window.loadCardHelpers();if(revision!==this._revision||!this.isConnected)return;
        for(const entity of this._ids){
          const state=this._hass.states[entity];if(!state)continue;
          const card=helpers.createCardElement({type:'picture-entity',entity,name:state.attributes.friendly_name||entity,camera_view:'auto',show_name:true,show_state:true,aspect_ratio:'16:9',tap_action:{action:'more-info'}});
          card.hass=this._hass;this._cards.push(card);grid.append(card);
        }
      }catch{grid.textContent='Camera cards could not load. Return to Cameras and try again.';}
    }
    getCardSize(){return Math.max(3,(this._ids?.length||0)*3);}getGridOptions(){return{columns:'full',rows:'auto'};}
  }
  class GlassAllCamerasLink extends HTMLElement {
    constructor(){super();this._change=()=>this.build();this._revision=0;}
    setConfig(){if(!this.shadowRoot)this.attachShadow({mode:'open'});this.build();}
    set hass(hass){this._hass=hass;if(this._card)this._card.hass=hass;else this.build();}
    connectedCallback(){window.addEventListener('glass-dashboard-changed',this._change);this.build();}
    disconnectedCallback(){window.removeEventListener('glass-dashboard-changed',this._change);this._revision++;}
    async build(){
      if(!this.shadowRoot)return;const revision=++this._revision;
      const configured=!!window.__glassDashboardV1?.state.profile.configured&&window.__glassDashboardV1.state.profile.enableCameras;this.style.display=configured?'block':'none';
      if(!configured||!this._hass)return;
      if(this._card){this._card.hass=this._hass;return;}
      const helpers=await window.loadCardHelpers();if(revision!==this._revision||!this.isConnected)return;
      this._card=helpers.createCardElement({type:'custom:glass-shortcut',name:'All cameras',icon:'mdi:cctv',icon_height:'28px',tap_action:{action:'navigate',navigation_path:'/glass-dashboard/all-cameras'}});this._card.hass=this._hass;this.shadowRoot.replaceChildren(this._card);
    }
    getCardSize(){return 2;}getGridOptions(){return{columns:'full',rows:'auto'};}
  }
  customElements.define('glass-all-cameras',GlassAllCameras);
  customElements.define('glass-all-cameras-link',GlassAllCamerasLink);
})();
;

// Source: weather-stations-v1.js
// Public NWS observations; home coordinates are sent only to api.weather.gov.
(() => {
  if(customElements.get('glass-weather-stations'))return;
  const KEY='glass-weather-station-v1';
  const read=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'null');return /^[A-Z0-9]{3,8}$/.test(x?.id||'')?x:null;}catch{return null;}};
  const distance=(a,b,c,d)=>{const r=x=>x*Math.PI/180,s=Math.sin((r(c)-r(a))/2)**2+Math.cos(r(a))*Math.cos(r(c))*Math.sin((r(d)-r(b))/2)**2;return 6371*2*Math.atan2(Math.sqrt(s),Math.sqrt(Math.max(0,1-s)));};
  const el=(tag,text,parent)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;parent?.append(e);return e;};
  async function json(url,signal){const u=new URL(url);if(u.origin!=='https://api.weather.gov')throw Error('Invalid weather provider URL.');const r=await fetch(u,{signal,credentials:'omit',headers:{Accept:'application/geo+json'}});if(!r.ok)throw Error(r.status===404?'NWS does not cover this location. Choose an existing weather integration below.':'Weather service unavailable ('+r.status+'). Try again later.');const data=await r.json();if(!data||typeof data!=='object')throw Error('The weather service returned an invalid response. Try again later.');return data;}
  function value(p,key,unit){const x=p[key]?.value;if(!Number.isFinite(x))return 'Unavailable';if(key==='temperature')return unit==='°F'?(x*9/5+32).toFixed(1)+' °F':x.toFixed(1)+' °C';if(key==='windSpeed')return x.toFixed(1)+' km/h';return x.toFixed(0)+' %';}
  class Stations extends HTMLElement{
    constructor(){super();this._change=()=>this.config?.mode==='observations'&&this.loadObservation();}
    setConfig(c){this.config=c;if(!this.shadowRoot)this.attachShadow({mode:'open'});this.render();}
    set hass(h){this._hass=h;if(!this._initialized&&this.config){this._initialized=true;this.render();if(this.config.mode!=='observations')this.search();else this.loadObservation();}}
    connectedCallback(){window.addEventListener('glass-station-changed',this._change);window.addEventListener('storage',this._change);if(this._initialized&&this.config?.mode==='observations')this.loadObservation();}
    disconnectedCallback(){this._controller?.abort();window.removeEventListener('glass-station-changed',this._change);window.removeEventListener('storage',this._change);}
    action(root,text,fn){const b=el('button',text,root);b.onclick=fn;return b;}
    status(text){this.shadowRoot.querySelector('[role=status]').textContent=text;}
    render(){
      this.shadowRoot.innerHTML='<style>:host{display:block}ha-card{display:block;padding:20px}h2{margin:0 0 12px}p,small{line-height:1.5}small{display:block}button,input{font:inherit;color:var(--primary-text-color,#fff);background:#101b29;border:1px solid #ffffff55;border-radius:10px;padding:10px;min-height:44px;box-sizing:border-box;max-width:100%}button{cursor:pointer;margin:6px 8px 6px 0}label{display:grid;gap:6px;margin:12px 0}.row{border:1px solid #ffffff33;border-radius:14px;padding:12px;margin:12px 0}.row p{margin:6px 0}.fields{display:grid;grid-template-columns:1fr 1fr;gap:12px}button:focus-visible,input:focus-visible{outline:2px solid var(--accent-color,#c99769)}</style><ha-card><h2></h2><div class="body"></div><p role="status" aria-live="polite"></p><div class="results"></div></ha-card>';
      const body=this.shadowRoot.querySelector('.body');this.shadowRoot.querySelector('h2').textContent=this.config.mode==='observations'?'Selected nearby station':'Nearby weather stations';
      if(this.config.mode==='observations'){this.action(body,'Refresh readings',()=>this.loadObservation());return;}
      el('p','Find public NWS stations using Home Assistant’s saved home location. The search sends those coordinates to weather.gov. US coverage only; existing weather integrations remain available in the setup wizard.',body);
      this.action(body,'Find using HA home location',()=>this.search());
      const details=el('details',undefined,body);el('summary','Use another location',details);const fields=el('div',undefined,details);fields.className='fields';
      for(const [key,name,min,max]of [['lat','Latitude',-90,90],['lon','Longitude',-180,180]]){const l=el('label',name,fields),i=el('input',undefined,l);i.type='number';i.min=min;i.max=max;i.step='any';i.id=key;i.value=this._hass?.config?.[key==='lat'?'latitude':'longitude']??'';}
      this.action(details,'Search this location',()=>{const a=this.shadowRoot.getElementById('lat').value,b=this.shadowRoot.getElementById('lon').value;if(!a.trim()||!b.trim())return this.status('Enter both latitude and longitude.');this.search(Number(a),Number(b));});
      this.action(body,'Keep existing station cards',()=>{localStorage.removeItem(KEY);window.dispatchEvent(new CustomEvent('glass-station-changed'));this.status('Nearby station selection cleared. Existing weather cards are unchanged.');});
      const saved=read();if(saved)el('small','Saved on this device: '+saved.name+' ('+saved.id+')',body);
    }
    async search(lat=this._hass?.config?.latitude,lon=this._hass?.config?.longitude){
      this._controller?.abort();const controller=this._controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),30000);const results=this.shadowRoot.querySelector('.results');results.replaceChildren();
      try{
        if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)throw Error('Set HA’s home location or enter valid latitude and longitude.');
        this.status('Finding nearby stations…');
        const point=await json('https://api.weather.gov/points/'+lat.toFixed(4)+','+lon.toFixed(4),controller.signal);
        if(!point.properties?.observationStations)throw Error('No NWS stations available here. Use an existing weather integration.');
        const data=await json(point.properties.observationStations,controller.signal);
        const stations=(data.features||[]).filter(f=>/^[A-Z0-9]{3,8}$/.test(f.properties?.stationIdentifier||'')&&f.geometry?.type==='Point'&&f.geometry.coordinates?.length>=2&&f.geometry.coordinates.slice(0,2).every(Number.isFinite)).map(f=>({id:f.properties.stationIdentifier,name:String(f.properties.name||f.properties.stationIdentifier),km:distance(lat,lon,f.geometry.coordinates[1],f.geometry.coordinates[0])})).sort((a,b)=>a.km-b.km).slice(0,8);
        if(!stations.length)throw Error('No compatible stations returned. Your existing weather selection is unchanged.');
        for(const s of stations){
          const row=el('div',undefined,results);row.className='row';el('strong',s.name+' · '+s.id,row);el('p',s.km.toFixed(1)+' km away',row);const report=el('small','Checking latest report…',row);
          this.action(row,'Use this station',()=>{try{localStorage.setItem(KEY,JSON.stringify({id:s.id,name:s.name}));window.dispatchEvent(new CustomEvent('glass-station-changed'));this.status('Saved '+s.id+' on this device. Open Home → Local station readings to see observations. Forecast integration is unchanged.');}catch{this.status('Browser storage is unavailable. Station selection was not saved.');}});
          s.report=report;
        }
        await Promise.all(stations.map(async s=>{try{const data=await json('https://api.weather.gov/stations/'+s.id+'/observations/latest',controller.signal),stamp=data.properties?.timestamp,age=(Date.now()-Date.parse(stamp))/3600000;s.recent=Number.isFinite(age)&&age>=-0.25&&age<=3;s.report.textContent=Number.isFinite(age)?'Latest report: '+new Date(stamp).toLocaleString()+(s.recent?'':' · may be stale'):'No recent report available';}catch(e){if(e.name!=='AbortError')s.report.textContent='Reporting status unavailable';}}));
        const recommended=stations.find(s=>s.recent);if(recommended)recommended.report.textContent='Recommended: nearest station reporting recently. '+recommended.report.textContent;
        if(controller.signal.aborted)return;if(this.isConnected)this.status('Found '+stations.length+' compatible NWS stations, nearest first. Choose a station to save it.');
      }catch(e){if(this.isConnected)this.status(e.name==='AbortError'?'Search stopped or timed out. Try again.':e.message);}finally{clearTimeout(timeout);}
    }
    async loadObservation(){
      const s=read(),results=this.shadowRoot.querySelector('.results');if(!results)return;results.replaceChildren();if(!s){this.status('No nearby station selected. Choose one in Settings → Setup. Your existing station cards remain below.');return;}
      this._controller?.abort();const controller=this._controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);this.status('Loading '+s.id+'…');
      try{const data=await json('https://api.weather.gov/stations/'+s.id+'/observations/latest',controller.signal);if(controller.signal.aborted||!this.isConnected)return;const p=data.properties||{},row=el('div',undefined,results);row.className='row';el('strong',s.name+' · '+s.id,row);el('p',p.textDescription||'Current observations',row);for(const [key,label,unit]of [['temperature','Temperature',this._hass?.config?.unit_system?.temperature],['relativeHumidity','Humidity','%'],['windSpeed','Wind','km/h']])el('p',label+': '+value(p,key,unit),row);const stamp=Date.parse(p.timestamp),age=Date.now()-stamp;el('small',Number.isFinite(stamp)?'Reported '+new Date(stamp).toLocaleString()+(age>10800000?' · stale report':''):'Report time unavailable',row);this.status('Public NWS observations. Forecast and existing station integrations are unchanged.');}catch(e){if(this.isConnected)this.status(e.name==='AbortError'?'Readings timed out. Try Refresh.':e.message);}finally{clearTimeout(timeout);}
    }
    getCardSize(){return this.config?.mode==='observations'?4:12;}getGridOptions(){return{columns:'full',rows:'auto'};}
  }
  customElements.define('glass-weather-stations',Stations);
})();
;

// Source: portable-settings-v1.js
// Versioned device-local preferences. Imports are reviewed and mapped before applying.
(() => {
  if(customElements.get('glass-portable-settings'))return;
  const FORMAT='glass-dashboard',VERSION=1,BACKUP='glass-dashboard-backup-v1';
  const AKEYS=['cardColor','cardOpacity','buttonColor','buttonOpacity','barOpacity','accent','textColor','font','fit','landscapeX','landscapeY','portraitX','portraitY','backgroundDim','backgroundColor'];
  const api=()=>({a:window.__glassAppearanceV2,d:window.__glassDashboardV1});
  const copy=x=>JSON.parse(JSON.stringify(x));
  const node=(tag,text,parent)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;parent?.append(e);return e;};
  const secret=/[?&#](?:token|access_token|api_key|authsig|password|key)=/i;
  function safeURL(value){if(typeof value!=='string'||value.length>2048||secret.test(value))throw Error('Remove credential parameters from links before exporting or importing.');const u=new URL(value,location.origin);if(!['https:','http:'].includes(u.protocol)||u.username||u.password)throw Error('Only HTTP(S) links without credentials are supported.');return value;}
  function snapshot(){const {a,d}=api();return {appearance:a.settings,dashboard:d.state,station:localStorage.getItem('glass-weather-station-v1')};}
  function backgrounds(s,include){
    const def=api().a.defaults;

    if(!s.landscape&&!s.portrait)return {preset:'solid'};
    if(!include)return {preset:'keep',note:'Custom images are not included. Choose images on the destination device.'};
    return {preset:'paths',landscape:s.landscape,portrait:s.portrait};
  }
  function exportConfig(include=false){
    const {a,d}=api(),s=d.state,p=s.profile;
    const slots=[];
    for(const [key,domain,ids]of [['weather','weather',p.weather?[p.weather]:[]],['cameras','camera',p.cameras],['players','media_player',p.players],['sensors','sensor',p.sensors]])ids.forEach((id,i)=>slots.push({key:key+'-'+i,target:key,domain,label:domain.replace('_',' ')+' '+(i+1),...(include?{source:id}:{})}));
    const out={format:FORMAT,version:VERSION,appearance:Object.fromEntries(AKEYS.map(k=>[k,a.settings[k]])),background:backgrounds(a.settings,include),navigation:include?s.navigation:d.defaults,profile:{...p,weather:'',cameras:[],players:[],sensors:[],photoURL:include?p.photoURL:'',services:p.services.map((x,i)=>({name:include?x.name:'Service '+(i+1),icon:x.icon,url:include?x.url:''}))},slots};
    if(!include){out.profile.photoMode='link';out.profile.enablePhotos=false;out.profile.keepWeatherExtras=false;}
    if(include){for(const s of out.profile.services)if(s.url)safeURL(s.url);if(out.profile.photoURL)safeURL(out.profile.photoURL);for(const n of out.navigation)if(secret.test(n.path))throw Error('Remove credential parameters from navigation links before exporting.');}
    return out;
  }
  function parse(raw){
    if(!raw||raw.format!==FORMAT||raw.version!==VERSION)throw Error('Choose a supported dashboard configuration (version 1).');
    const {a,d}=api();if(!raw.appearance||!raw.profile||!Array.isArray(raw.navigation)||!Array.isArray(raw.slots)||raw.slots.length>73)throw Error('Incomplete dashboard configuration.');
    const appearance=a.normalize({...a.settings,...Object.fromEntries(AKEYS.filter(k=>raw.appearance[k]!==undefined).map(k=>[k,raw.appearance[k]]))});
    const b=raw.background||{preset:'keep'};
    if(!['keep','solid','paths'].includes(b.preset))throw Error('Unknown background preset.');
    if(b.preset==='solid')appearance.landscape=appearance.portrait='';
    if(b.preset==='paths'){for(const k of ['landscape','portrait']){const v=b[k]||'';if(v&&(!v.startsWith('/')||v.startsWith('//')||secret.test(v)))throw Error('Backgrounds must use stable local HA paths.');appearance[k]=v;}a.normalize(appearance);}
    const p=d.profile({...raw.profile,weather:'',cameras:[],players:[],sensors:[],services:[],photoURL:''});
    p.services=(Array.isArray(raw.profile.services)?raw.profile.services:[]).slice(0,12).map((x,i)=>({name:String(x.name||'Service '+(i+1)).slice(0,40),icon:/^mdi:[a-z0-9-]+$/.test(x.icon||'')?x.icon:'mdi:open-in-new',url:x.url?safeURL(x.url):''}));
    p.photoURL=raw.profile.photoURL?safeURL(raw.profile.photoURL):'';
    const seen=new Set();let weather=0;
    const slots=raw.slots.map(s=>{if(!s||!['weather','cameras','players','sensors'].includes(s.target)||!['weather','camera','media_player','sensor'].includes(s.domain)||({weather:'weather',cameras:'camera',players:'media_player',sensors:'sensor'})[s.target]!==s.domain||!/^[-a-z0-9]{1,40}$/.test(s.key)||seen.has(s.key))throw Error('Invalid entity mapping slots.');seen.add(s.key);if(s.target==='weather'&&++weather>1)throw Error('Only one weather slot is supported.');return {key:s.key,target:s.target,domain:s.domain,label:String(s.label||s.key).slice(0,80),source:typeof s.source==='string'&&s.source.startsWith(s.domain+'.')?s.source:''};});
    for(const n of raw.navigation)if(secret.test(n.path||''))throw Error('Navigation links must not contain credentials.');
    return {appearance:a.normalize(appearance),navigation:d.nav(raw.navigation),profile:p,slots,background:b.preset};
  }
  function apply(value){
    const {a,d}=api(),before=snapshot();
    // Keep exactly one recoverable local backup; no credentials or HA server settings.
    localStorage.setItem(BACKUP,JSON.stringify({version:1,savedAt:new Date().toISOString(),...before}));
    try{a.save(value.appearance);d.save(value.dashboard);if(value.station===null)localStorage.removeItem('glass-weather-station-v1');else if(typeof value.station==='string')localStorage.setItem('glass-weather-station-v1',value.station);window.dispatchEvent(new CustomEvent('glass-station-changed'));}
    catch(e){try{a.save(before.appearance);d.save(before.dashboard);if(before.station===null)localStorage.removeItem('glass-weather-station-v1');else localStorage.setItem('glass-weather-station-v1',before.station);}catch{}throw Error('Could not apply settings. The previous configuration was retained in the local backup. '+e.message);}
  }
  class Portable extends HTMLElement{
    setConfig(){if(!this.shadowRoot)this.attachShadow({mode:'open'});this.render();}
    set hass(h){this._hass=h;}
    action(parent,text,fn){const b=node('button',text,parent);b.type='button';b.onclick=fn;return b;}
    status(text){this.shadowRoot.querySelector('[role=status]').textContent=text;}
    field(parent,text,value,fn){const l=node('label',text,parent),i=node('input',undefined,l);i.value=value;i.oninput=()=>fn(i.value);return i;}
    render(){
      if(!api().a||!api().d){this.shadowRoot.textContent='Open Settings again after dashboard controls finish loading.';return;}
      this.shadowRoot.innerHTML='<style>:host{display:block}ha-card{padding:20px}h2{margin:0 0 12px}p,small{line-height:1.5}small{display:block}button,input,select{font:inherit;border:1px solid #ffffff55;border-radius:10px;background:#101b29;color:var(--primary-text-color,#fff);padding:10px;box-sizing:border-box;max-width:100%}button{min-height:44px;margin:6px 8px 6px 0;cursor:pointer}label{display:grid;gap:6px;margin:14px 0}input:not([type=checkbox]),select{width:100%}.row{border:1px solid #ffffff33;border-radius:14px;padding:14px;margin:14px 0}input[type=checkbox]{width:20px;height:20px}.check{display:flex;align-items:center;gap:10px}button:focus-visible,input:focus-visible,select:focus-visible{outline:2px solid var(--accent-color,#c99769)}</style><ha-card><h2>Backup & sharing</h2><div class="body"></div><p role="status" aria-live="polite"></p><div class="review"></div></ha-card>';
      const body=this.shadowRoot.querySelector('.body');
      node('p','Export a shareable preset, or include this device’s entity IDs and service links for a personal backup. Import lets you map devices and review changes before applying. Uploaded image files and integrations are not bundled.',body);
      const label=node('label',undefined,body);label.className='check';const include=node('input',undefined,label);include.type='checkbox';label.append(document.createTextNode('Include personal entity IDs, navigation and service links'));
      node('small','Leave unchecked before sharing publicly. Personal exports can contain private hostnames, entity IDs, names and image-library paths. Inspect the JSON before sharing. Account credentials and precise location are never requested by this tool.',body);
      this.action(body,'Export configuration',()=>{try{const data=exportConfig(include.checked),url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})),a=node('a');a.href=url;a.download=include.checked?'ha-dashboard-personal.json':'ha-dashboard-shareable.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);this.status('Configuration exported. Image files are separate.');}catch(e){this.status(e.message);}});
      const fileLabel=node('label','Import configuration',body),file=node('input',undefined,fileLabel);file.type='file';file.accept='.json,application/json';file.onchange=async()=>{try{const f=file.files[0];if(!f)return;if(f.size>131072)throw Error('Choose a JSON file smaller than 128 KB.');this._pending=parse(JSON.parse(await f.text()));this.review();this.status('File loaded for review. Nothing has been applied.');}catch(e){this._pending=null;this.shadowRoot.querySelector('.review').replaceChildren();this.status(e.message);}};
      node('h3','Presets & recovery',body);
      for(const [label,changes]of [['Dark glass',{cardColor:'#0d1726',cardOpacity:.5,buttonColor:'#1e2c3e',buttonOpacity:.55,barOpacity:.18,textColor:'#f5eee4'}],['High contrast',{cardColor:'#080e18',cardOpacity:.92,buttonColor:'#101b29',buttonOpacity:.95,barOpacity:.95,textColor:'#ffffff'}]])this.action(body,'Preview '+label,()=>{const {a,d}=api();this._pending={appearance:{...a.settings,...changes},navigation:d.state.navigation,profile:d.state.profile,slots:[],appearanceOnly:true};this.review();this.status(label+' ready for review; press Apply reviewed configuration to save.');});
      this.action(body,'Review reset to defaults',()=>{const {a,d}=api();this._pending={appearance:copy(a.defaults),navigation:copy(d.defaults),profile:d.profile({configured:false}),slots:[],reset:true};this.review();this.status('Reset is staged. Apply to save; a backup will be kept.');});
      this.action(body,'Restore previous local backup',()=>{try{const b=JSON.parse(localStorage.getItem(BACKUP)||'null');if(!b||b.version!==1)throw Error('No previous local backup is available.');this._pending={appearance:api().a.normalize(b.appearance),navigation:api().d.nav(b.dashboard.navigation),profile:api().d.profile(b.dashboard.profile),slots:[],restore:true,station:b.station};this.review();this.status('Previous backup staged for review. Apply to restore it.');}catch(e){this.status(e.message);}});
      node('small','Applying an import, preset, reset or restore saves the current configuration as one previous backup in this browser. Reset restores original dashboard cards; it does not remove HA integrations, files or media.',body);
    }
    review(){
      const p=this._pending,root=this.shadowRoot.querySelector('.review');root.replaceChildren();node('h3','Review configuration',root);
      node('p','Applies to this browser only. Navigation: '+p.navigation.map(x=>x.label).join(', ')+'. Background: '+(p.background||'reviewed settings')+'.',root);
      const mapping={};
      for(const s of p.slots){const l=node('label','Map '+s.label+' ('+s.domain+')',root),select=node('select',undefined,l);const blank=node('option','Skip / unavailable',select);blank.value='';for(const entity of Object.values(this._hass?.states||{}).filter(e=>e.entity_id.startsWith(s.domain+'.')).sort((a,b)=>a.entity_id.localeCompare(b.entity_id))){const o=node('option',entity.attributes.friendly_name||entity.entity_id,select);o.value=entity.entity_id;o.selected=s.source===entity.entity_id;}mapping[s.key]=select.value;select.onchange=()=>mapping[s.key]=select.value;}
      for(const service of p.profile.services)this.field(root,'Service link: '+service.name,service.url,v=>service.url=v);
      if(p.profile.photoMode==='link')this.field(root,'Photo service link',p.profile.photoURL,v=>p.profile.photoURL=v);
      node('small','Skipped weather or camera mappings turn that section off. No mapped media players turns media playback off. Empty service links are omitted. System sensors can be mapped too. Photo modules use a service link; credentials stay in Home Assistant integrations.',root);
      this.action(root,'Apply reviewed configuration',()=>{try{
        const profile=copy(p.profile);
        if(p.slots.length){profile.weather='';profile.cameras=[];profile.players=[];profile.sensors=[];for(const s of p.slots){const id=mapping[s.key];if(!id)continue;if(!this._hass?.states[id]||!id.startsWith(s.domain+'.'))throw Error('An entity is unavailable. Review its mapping.');if(s.target==='weather')profile.weather=id;else profile[s.target].push(id);}}
        if(!p.reset&&!p.restore&&!p.appearanceOnly){profile.configured=true;if(!profile.weather)profile.enableWeather=false;if(!profile.cameras.length)profile.enableCameras=false;if(!profile.players.length)profile.enableMedia=false;if(!profile.sensors.length)profile.enableSystem=false;profile.services=profile.services.filter(s=>s.url);for(const s of profile.services)safeURL(s.url);if(!profile.services.length)profile.enableServices=false;if(profile.photoMode==='link'&&!profile.photoURL)profile.enablePhotos=false;}
        const value={appearance:p.appearance,dashboard:{navigation:p.navigation,profile:api().d.profile(profile)}};if(p.reset)value.station=null;if(p.restore)value.station=p.station;
        apply(value);this._pending=null;root.replaceChildren();this.status('Configuration applied on this device. Previous settings are available under Restore previous local backup.');
      }catch(e){this.status(e.message);}});
      this.action(root,'Cancel import or preset',()=>{this._pending=null;root.replaceChildren();this.status('Cancelled. Saved settings are unchanged.');});
    }
    getCardSize(){return 12;}getGridOptions(){return{columns:'full',rows:'auto'};}
  }
  customElements.define('glass-portable-settings',Portable);
  window.__glassPortableV1={exportConfig,parse};
})();
;
