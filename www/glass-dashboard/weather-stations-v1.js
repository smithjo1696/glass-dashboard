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
