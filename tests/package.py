"""Create a checksummed release archive without Git metadata or private runtime data."""
from pathlib import Path
import hashlib,zipfile
ROOT=Path(__file__).resolve().parents[1]
EXCLUDE={'.git','__pycache__','node_modules','test-runtime'}
def include(p):
    return p.is_file()and not any(part in EXCLUDE for part in p.relative_to(ROOT).parts)and not p.name.endswith(('.local.json','.pyc'))
def package(version):
    files=sorted(p for p in ROOT.rglob('*')if include(p)and p.name!='SHA256SUMS')
    (ROOT/'SHA256SUMS').write_text(''.join(hashlib.sha256(p.read_bytes()).hexdigest()+'  '+p.relative_to(ROOT).as_posix()+'\n'for p in files),encoding='utf-8')
    archive=ROOT.parent/f'glass-dashboard-{version}-preview.zip'
    with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED)as z:
        for p in sorted(ROOT.rglob('*')):
            if include(p):z.write(p,'glass-dashboard/'+p.relative_to(ROOT).as_posix())
    with zipfile.ZipFile(archive)as z:
        assert z.testzip()is None
        assert not any('/.git/'in n or '/test-runtime/'in n for n in z.namelist())
        for p in files:assert z.read('glass-dashboard/'+p.relative_to(ROOT).as_posix())==p.read_bytes()
    print(archive.name,hashlib.sha256(archive.read_bytes()).hexdigest(),archive.stat().st_size,'bytes')
if __name__=='__main__':
    import argparse
    parser=argparse.ArgumentParser();parser.add_argument('--version',default='0.1.6');args=parser.parse_args()
    if not __import__('re').fullmatch(r'\d+\.\d+\.\d+',args.version):parser.error('Use a numeric semantic version')
    package(args.version)
