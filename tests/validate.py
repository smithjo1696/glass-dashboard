from pathlib import Path
import json,re,subprocess
root=Path(__file__).resolve().parents[1]
modules=root/'www/glass-dashboard'
for f in modules.glob('*.js'):
    subprocess.run(['node','--check',str(f)],check=True)
    for forbidden in ['192.168.', '/Users/', 'C:\\Users\\']:
        assert forbidden.lower() not in f.read_text(encoding='utf-8').lower(),(f.name,forbidden)
if (root/'dist/glass-dashboard.js').exists():
    subprocess.run(['node','--check',str(root/'dist/glass-dashboard.js')],check=True)
    bundle=(root/'dist/glass-dashboard.js').read_text(encoding='utf-8')
    assert not re.search(r'\bimport\s*\(',bundle),'HACS bundle must not require sibling modules'
    metadata=json.loads((root/'hacs.json').read_text())
    assert metadata['filename']=='glass-dashboard.js' and metadata['render_readme']is True
config=json.loads((root/'dashboard.yaml').read_text())
paths=[v['path']for v in config['views']]
assert len(paths)==len(set(paths))
registered=set()
for f in modules.glob('*.js'):
    registered.update(re.findall(r"(?:define|get)\('([a-z][a-z0-9-]+)'",f.read_text(encoding='utf-8')))
registered.update(['glass-navigation-editor','glass-setup-wizard','glass-configured-section'])
def walk(x):
    if isinstance(x,dict):
        if x.get('type','').startswith('custom:'):assert x['type'][7:]in registered,x['type']
        if 'entity'in x:raise AssertionError('Default dashboard must not require any entities')
        for value in x.values():walk(value)
    elif isinstance(x,list):
        for value in x:walk(value)
walk(config)
for m in re.findall(r"import\('./([^?]+)", (modules/'glass-dashboard.js').read_text()):assert(modules/m).is_file(),m
example=json.loads((root/'examples/shareable-preset.json').read_text());assert example['format']=='glass-dashboard';assert all('source'not in s for s in example['slots'])
print('PASS module syntax, no personal references, entity-free demo, custom-element/resource manifest and generic import example')
