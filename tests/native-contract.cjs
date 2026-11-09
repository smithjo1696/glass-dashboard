// HA card helpers assign `preview` as a boolean. It must not replace editor logic.
const fs=require('fs'),vm=require('vm'),assert=require('node:assert/strict');
const classes=new Map();
const scope={HTMLElement:class{},innerWidth:390,innerHeight:844,window:{},customElements:{get:n=>classes.get(n),define:(n,c)=>classes.set(n,c)}};
vm.runInNewContext(fs.readFileSync(__dirname+'/../www/glass-dashboard/background-settings-v1.js','utf8'),scope);
const Editor=[...classes.entries()].find(([name])=>name.startsWith('glass-background-settings-'))[1];
const card=new Editor();card.preview=false;assert.equal(typeof card.updatePreview,'function');card.preview=true;assert.equal(typeof card.updatePreview,'function');
console.log('PASS native HA preview boolean does not overwrite background preview method');
