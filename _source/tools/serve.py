"""Local preview server for the portfolio. Serves files and accepts
POST /frame/<name>/<index> (JPEG body) so the capture page can save video frames."""
import http.server, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
FRAMES = os.path.join(ROOT, "tools", "frames")


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def do_POST(self):
        m = re.fullmatch(r"/frame/([a-z0-9_]+)/(\d+)", self.path)
        if not m:
            self.send_error(404); return
        d = os.path.join(FRAMES, m.group(1))
        os.makedirs(d, exist_ok=True)
        body = self.rfile.read(int(self.headers["Content-Length"]))
        with open(os.path.join(d, "%05d.jpg" % int(m.group(2))), "wb") as f:
            f.write(body)
        self.send_response(204); self.end_headers()

    def log_message(self, *a):
        pass


port = int(sys.argv[1]) if len(sys.argv) > 1 else 8765
http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler).serve_forever()
