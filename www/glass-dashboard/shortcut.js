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
