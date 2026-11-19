"""Static Shixu site with allowlisted, short-lived private-object redirects.

No model, reference voice, unrelated application API, database or user credentials are served.
"""
import functools
import json
import os
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import unquote, urlsplit


class Handler(SimpleHTTPRequestHandler):
    server_version = 'Shixu'
    sys_version = ''

    def _route(self, head=False):
        path = unquote(urlsplit(self.path).path)
        if path == '/healthz':
            body = json.dumps({'ready': True, 'release': self.server.release}).encode()
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            if not head:
                self.wfile.write(body)
            return
        if '..' in path.split('/') or any(p.startswith('.') for p in path.split('/') if p):
            self.send_error(404)
            return
        obj = self.server.objects.get(path)
        if obj:
            try:
                url = self.server.object_client.generate_presigned_url(
                    'get_object', Params={'Bucket': obj['bucket'], 'Key': obj['key']},
                    # Cover the 12-minute track plus reading pauses and later range requests.
                    ExpiresIn=7200, HttpMethod='HEAD' if head else 'GET',
                )
            except Exception:
                self.send_error(503, 'Media temporarily unavailable')
                return
            self.send_response(307)
            self.send_header('Location', url)
            self.send_header('Cache-Control', 'no-store')
            self.send_header('Referrer-Policy', 'no-referrer')
            self.send_header('Content-Length', '0')
            self.end_headers()
            return
        if head:
            super().do_HEAD()
        else:
            super().do_GET()

    def do_GET(self):
        self._route()

    def do_HEAD(self):
        self._route(head=True)

    def translate_path(self, path):
        # Current HTML/JSON is atomic. Old hashed assets remain readable by open pages.
        relative = unquote(urlsplit(path).path).lstrip('/')
        root = self.server.root
        current = root / 'current' / 'site'
        candidate = (current / relative).resolve()
        if not candidate.is_relative_to(current.resolve()):
            return str(root / 'not-found')
        if not candidate.exists() and relative.startswith(('assets/', 'audio/')):
            retained = root / 'retained' / relative
            if retained.is_file():
                return str(retained)
        return str(candidate)

    def list_directory(self, path):
        self.send_error(404)
        return None

    def end_headers(self):
        if self.path.startswith('/assets/') or (self.path.startswith('/audio/') and '.vtt' in self.path):
            self.send_header('Cache-Control', 'public, max-age=31536000, immutable' if self._headers_buffer[0].split()[1] == b'200' else 'no-store')
        elif self.path != '/healthz':
            self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    def log_message(self, fmt, *args):
        # Never log signed destination URLs or user-supplied query parameters.
        print(json.dumps({'path': urlsplit(self.path).path, 'method': self.command,
                          'status': str(args[1]) if len(args) > 1 else '-'}), flush=True)


def create_server(root, object_client, port=8418):
    root = Path(root).resolve()
    release = json.loads((root / 'current' / 'release.json').read_text())
    objects = json.loads((root / 'objects.json').read_text())
    for path, obj in objects.items():
        if not path.startswith(('/audio/', '/sources/')) or not obj['key'].startswith('shixu/public/sha256/'):
            raise ValueError('Object outside the published Shixu allowlist')
    server = ThreadingHTTPServer(('127.0.0.1', port), functools.partial(Handler, directory=str(root / 'current' / 'site')))
    server.root, server.release, server.objects, server.object_client = root, release['id'], objects, object_client
    server.daemon_threads = True
    return server


if __name__ == '__main__':
    import boto3
    from botocore.config import Config
    client = boto3.client('s3', endpoint_url=os.environ['SHIXU_OBJECT_ENDPOINT'],
                          region_name=os.environ['SHIXU_OBJECT_REGION'],
                          aws_access_key_id=os.environ['SHIXU_OBJECT_ACCESS_KEY'],
                          aws_secret_access_key=os.environ['SHIXU_OBJECT_SECRET_KEY'],
                          config=Config(signature_version='s3v4', s3={'addressing_style': 'path'},
                                        retries={'max_attempts': 2}, connect_timeout=3, read_timeout=8))
    create_server(os.environ.get('SHIXU_ROOT', '/srv/shixu'), client).serve_forever()
