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
