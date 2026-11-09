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
