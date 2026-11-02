"""Serve the built client preview and proxy to the isolated localhost API."""

from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import http.client

ROOT = Path(__file__).resolve().parents[2] / "apps/web/build/client"


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def proxy(self):
        connection = http.client.HTTPConnection("127.0.0.1", 4385, timeout=45)
        headers = {
            k: v for k, v in self.headers.items()
            if k.lower() not in ("connection", "accept-encoding")
        }
        body = (
            self.rfile.read(int(self.headers.get("Content-Length", "0")))
            if self.command in ("POST", "PATCH", "PUT") else None
        )
        try:
            connection.request(self.command, self.path, body=body, headers=headers)
            response = connection.getresponse()
            data = response.read()
            self.send_response(response.status)
            for key, value in response.getheaders():
                if key.lower() not in ("transfer-encoding", "content-length", "connection"):
                    self.send_header(key, value)
            self.send_header("Content-Length", str(len(data)))
            self.end_headers()
            self.wfile.write(data)
        finally:
            connection.close()

    def do_GET(self):
        if self.path.startswith(("/api/", "/auth/")):
            return self.proxy()
        if not (ROOT / self.path.split("?")[0].lstrip("/")).is_file():
            self.path = "/index.html"
        super().do_GET()

    def do_POST(self):
        self.proxy()

    def do_PATCH(self):
        self.proxy()

    def log_message(self, *args):
        pass


if __name__ == "__main__":
    ThreadingHTTPServer(("127.0.0.1", 4382), Handler).serve_forever()
