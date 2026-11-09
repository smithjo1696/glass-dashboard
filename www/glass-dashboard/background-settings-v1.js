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
