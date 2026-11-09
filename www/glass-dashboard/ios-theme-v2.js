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
