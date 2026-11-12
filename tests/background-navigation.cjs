const fs=require('fs'),vm=require('vm'),assert=require('assert');
const s=fs.readFileSync(__dirname+'/../www/glass-dashboard/ios-theme-v2.js','utf8');
const block=s.slice(s.indexOf('  function settingsBack('),s.indexOf('  function nativeBackground('));
const style=()=>({v:{},getPropertyValue(k){return this.v[k]||''},getPropertyPriority(){return ''},setProperty(k,v){this.v[k]=v},removeProperty(k){delete this.v[k]}});
let inserted;
const ctx={adminReturnEnabled:true,location:{pathname:'/config/dashboard'},replacedMenus:new Map(),document:{createElement(){return {style:style(),setAttribute(k,v){this[k]=v},remove(){this.removed=true}}}},history:{pushState(a,b,path){ctx.location.pathname=path}},window:{dispatchEvent(){}},CustomEvent:class{},schedule(){},set(el,k,v){el.style.setProperty(k,v)}};
vm.createContext(ctx);vm.runInContext(block,ctx);
function menu(){return {style:style(),hasAttribute(){return true},getAttribute(){return 'navigationIcon'},parentNode:{insertBefore(b){inserted=b}}}}
const m=menu();ctx.settingsBack(m);assert.equal(inserted.textContent,'←');assert.equal(inserted.slot,'navigationIcon');assert.equal(m.style.v.display,'none');inserted.onclick({preventDefault(){},stopPropagation(){}});assert.equal(ctx.location.pathname,'/glass-dashboard/settings');ctx.restoreMenus();assert.equal(m.style.v.display,undefined);assert.equal(inserted.removed,true);
for(const path of ['/config/automation/dashboard','/config/devices/dashboard','/hassio/dashboard']){ctx.location.pathname=path;ctx.settingsBack(menu());assert.equal(ctx.replacedMenus.size,0,path)}
console.log('Passed: main Settings arrow returns to custom Settings; existing submenu navigation untouched.');

const bgScope={URL,location:{origin:'https://example.invalid'}};
vm.createContext(bgScope);vm.runInContext(s.slice(s.indexOf('  function nativeBackground('),s.indexOf('  function apply()')),bgScope);
const prefs={portrait:'/portrait.png',landscape:'/landscape.png',portraitX:25,portraitY:75,landscapeX:60,landscapeY:40,fit:'contain',backgroundDim:.3,backgroundColor:'#123456'};
const portrait=bgScope.nativeBackground(prefs,true),landscape=bgScope.nativeBackground(prefs,false);
assert.ok(portrait.includes('portrait.png')&&portrait.includes('25% 75% / contain')&&portrait.includes('rgba(0,0,0,0.3)'));
assert.ok(landscape.includes('landscape.png')&&landscape.includes('60% 40%'));
assert.equal(bgScope.nativeBackground({...prefs,portrait:'',landscape:''},true),'#123456');
ctx.adminReturnEnabled=false;ctx.location.pathname='/config/dashboard';ctx.settingsBack(menu());assert.equal(ctx.replacedMenus.size,0,'direct native settings entry must remain untouched');
console.log('PASS native background orientations/crop/dimming/solid defaults and scoped Settings return');