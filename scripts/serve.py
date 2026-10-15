#!/usr/bin/env python3
"""Serve only this project's static site on localhost and open its home page."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import webbrowser,threading,argparse
p=argparse.ArgumentParser();p.add_argument('--port',type=int,default=8765);p.add_argument('--no-browser',action='store_true');a=p.parse_args()
site=Path(__file__).resolve().parents[1]/'site'
server=ThreadingHTTPServer(('127.0.0.1',a.port),partial(SimpleHTTPRequestHandler,directory=str(site)))
url=f'http://127.0.0.1:{a.port}/'
print(f'Packrat Midden Explorer: {url}\nPress Ctrl+C to stop.',flush=True)
if not a.no_browser:threading.Timer(.3,lambda:webbrowser.open(url)).start()
try:server.serve_forever()
except KeyboardInterrupt:pass
finally:server.server_close()
