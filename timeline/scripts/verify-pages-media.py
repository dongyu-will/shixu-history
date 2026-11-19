"""Check real audio delivery, including the byte ranges used for mobile seeking."""
import argparse
import hashlib
import json
import os
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path


def verify(base, files, direct=False, media_host=None):
    manifest = json.loads((files / 'audio/timeline-zh.json').read_text())
    expected_host = media_host or os.environ.get('SHIXU_MEDIA_HOST') or (
        urllib.parse.urlsplit(base).hostname if direct else 'media.example.com'
    )
    results = []
    for name in ['road-90.m4a', Path(manifest['audio']).name]:
        expected = (files / 'audio' / name).read_bytes()
        digest = hashlib.sha256(expected).hexdigest()
        path = f'media/{digest}/{name}' if direct else f'audio/{name}?delivery=static-v2'
        url = urllib.parse.urljoin(base.rstrip('/') + '/', path)

        def request(method='GET', headers=None):
            request_headers = {'User-Agent': 'Mozilla/5.0'}
            request_headers.update(headers or {})
            return urllib.request.urlopen(urllib.request.Request(url, method=method, headers=request_headers), timeout=20)

        with request('HEAD') as response:
            assert response.status == 200, (name, 'HEAD', response.status)
            assert int(response.headers['Content-Length']) == len(expected), (name, 'HEAD length')
            assert response.headers.get('Accept-Ranges') == 'bytes', (name, 'Accept-Ranges')
            assert response.headers['Content-Type'].startswith('audio/'), (name, 'Content-Type')
            final = urllib.parse.urlsplit(response.url)
            assert final.hostname == expected_host and final.path.endswith(f'/{digest}/{name}'), (name, 'static destination')
            etag = response.headers.get('ETag')

        ranges = [(0, 1), (len(expected) // 2, len(expected) // 2 + 1023), (len(expected) - 1024, len(expected) - 1)]
        for start, end in ranges:
            with request(headers={'Range': f'bytes={start}-{end}'}) as response:
                assert response.status == 206, (name, 'Range', response.status)
                assert response.headers['Content-Range'] == f'bytes {start}-{end}/{len(expected)}'
                assert int(response.headers['Content-Length']) == end - start + 1
                assert response.read() == expected[start:end + 1], (name, 'Range bytes')
        with request(headers={'Range': 'bytes=-1024'}) as response:
            assert response.status == 206 and response.read() == expected[-1024:], (name, 'suffix Range')
        if etag:
            with request(headers={'Range': 'bytes=0-1', 'If-Range': etag}) as response:
                assert response.status == 206 and response.read() == expected[:2], (name, 'If-Range')
        try:
            request(headers={'Range': f'bytes={len(expected)}-'})
        except urllib.error.HTTPError as error:
            assert error.code == 416 and error.headers.get('Content-Range') == f'bytes */{len(expected)}'
        else:
            raise AssertionError((name, 'unsatisfiable Range must return 416'))
        with request() as response:
            assert response.status == 200
            assert hashlib.sha256(response.read()).hexdigest() == digest, (name, 'complete file hash')
        results.append({'audio': name, 'bytes': len(expected), 'sha256': digest, 'head': True, 'ranges': 6, 'fullHash': True, 'host': final.hostname})
    print(json.dumps({'base': base, 'audio': results}, ensure_ascii=False))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('base', help='Published site root, including a path prefix when applicable')
    parser.add_argument('--files', type=Path, default=Path(__file__).resolve().parents[1] / 'dist/client')
    parser.add_argument('--direct', action='store_true', help='Verify the static media host before switching Pages')
    parser.add_argument('--media-host', default=None, help='Expected final hostname for redirected media (default: SHIXU_MEDIA_HOST or media.example.com)')
    args = parser.parse_args()
    verify(args.base, args.files, args.direct, args.media_host)
