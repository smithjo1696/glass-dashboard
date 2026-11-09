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
