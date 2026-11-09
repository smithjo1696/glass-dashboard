from pathlib import Path
from http.server import SimpleHTTPRequestHandler,HTTPServer
ROOT=Path(__file__).resolve().parents[1]
class Handler(SimpleHTTPRequestHandler):
    def translate_path(self,path):
        path=path.split('?')[0]
        if path=='/hacsfiles/glass-dashboard/glass-dashboard.js':return str(ROOT/'dist/glass-dashboard.js')
        if path.startswith('/local/glass-dashboard/'):return str(ROOT/'www/glass-dashboard'/path.rsplit('/',1)[-1])
        if path=='/dashboard.json':return str(ROOT/'dashboard.yaml')
        if path.startswith('/glass-dashboard')or path.startswith('/config/'):return str(ROOT/'tests/demo.html')
        return str(ROOT/'tests/demo.html')
HTTPServer(('127.0.0.1',8771),Handler).serve_forever()
