"""Deterministic, dependency-free single-file HACS frontend distribution."""
from pathlib import Path
import argparse,json
ROOT=Path(__file__).resolve().parents[1]
ORDER=['shortcut.js','ios-theme-v2.js','dashboard-setup-v1.js','background-settings-v1.js','camera-gallery-v1.js','weather-stations-v1.js','portable-settings-v1.js']
def build():
    version=json.loads((ROOT/'package.json').read_text())['version']
    license=(ROOT/'LICENSE').read_text(encoding='utf-8').strip()
    return '/*! Glass Dashboard '+version+'\n'+license+'\n*/\n'+''.join('\n// Source: '+name+'\n'+(ROOT/'www/glass-dashboard'/name).read_text(encoding='utf-8').rstrip()+'\n;\n'for name in ORDER)
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('--check',action='store_true');args=parser.parse_args()
    target=ROOT/'dist/glass-dashboard.js';text=build()
    if args.check:
        assert target.read_text(encoding='utf-8')==text,'Rebuild dist/glass-dashboard.js before release'
        print('PASS single-file bundle matches reviewed module sources')
    else:
        target.parent.mkdir(exist_ok=True);target.write_text(text,encoding='utf-8');print('Built dist/glass-dashboard.js')
