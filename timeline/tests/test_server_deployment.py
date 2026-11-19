"""Verify media whitelist, public-file boundaries and fixed release identity locally."""
import importlib.util,json,tempfile,threading,unittest
from pathlib import Path
from http.client import HTTPConnection
spec=importlib.util.spec_from_file_location('shixu_server',Path(__file__).resolve().parents[1]/'deploy/server.py')
server_module=importlib.util.module_from_spec(spec);spec.loader.exec_module(server_module)

class FakeSigner:
 def __init__(self):self.calls=[]
 def generate_presigned_url(self,method,**kwargs):
  self.calls.append((method,kwargs));return 'https://example.invalid/private-object?temporary-signature'

class DeploymentTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name);site=self.root/'releases/test/site';site.mkdir(parents=True)
  (site/'index.html').write_text('<h1>史序</h1>');(self.root/'releases/test/release.json').write_text('{"id":"test"}')
  (self.root/'current').symlink_to(self.root/'releases/test');(self.root/'objects.json').write_text(json.dumps({'/audio/test.m4a':{'bucket':'private','key':'shixu/public/sha256/abc/test.m4a'}}))
  self.signer=FakeSigner();self.server=server_module.create_server(self.root,self.signer,port=0)
  self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
 def tearDown(self):
  self.server.shutdown();self.server.server_close();self.thread.join();self.temp.cleanup()
 def request(self,path,method='GET'):
  c=HTTPConnection('127.0.0.1',self.server.server_port);c.request(method,path);r=c.getresponse();result=(r.status,dict(r.headers),r.read());c.close();return result
 def test_media_is_redirected_with_short_expiry_and_correct_method(self):
  for method in ['GET','HEAD']:
   status,headers,body=self.request('/audio/test.m4a',method);self.assertEqual(status,307);self.assertIn('no-store',headers['Cache-Control']);self.assertEqual(body,b'')
   _,args=self.signer.calls[-1];self.assertEqual(args['HttpMethod'],method);self.assertEqual(args['ExpiresIn'],7200);self.assertEqual(args['Params']['Key'],'shixu/public/sha256/abc/test.m4a')
 def test_private_and_unknown_resources_are_never_signed_or_listed(self):
  for path in ['/objects.json','/deploy/server.py','/.env','/%2e%2e/objects.json','/audio/unknown.m4a','/audio/']:
   self.assertEqual(self.request(path)[0],404,path)
  self.assertEqual(self.signer.calls,[])
 def test_current_html_and_retained_assets_have_correct_cache_and_identity(self):
  asset=self.root/'retained/assets/old.js';asset.parent.mkdir(parents=True);asset.write_text('old-bundle')
  self.assertIn('史序'.encode(),self.request('/?event=e-25')[2]);self.assertIn('no-store',self.request('/')[1]['Cache-Control'])
  status,headers,body=self.request('/assets/old.js');self.assertEqual(status,200);self.assertEqual(body,b'old-bundle');self.assertIn('immutable',headers['Cache-Control'])
  self.assertEqual(json.loads(self.request('/healthz')[2]),{'ready':True,'release':'test'})

if __name__=='__main__':unittest.main()
