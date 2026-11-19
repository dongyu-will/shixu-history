"""Deploy Shixu standalone static site and optional S3-compatible media redirects."""
import argparse,hashlib,json,os,shutil,socket,subprocess,time,urllib.request
from pathlib import Path
import boto3
from botocore.config import Config
from botocore.exceptions import ClientError

ROOT=Path('/srv/shixu')
def run(*args):return subprocess.check_output(args,text=True).strip()
def digest(path):return hashlib.sha256(Path(path).read_bytes()).hexdigest()
def atomic(path,data,mode=0o644):
 path=Path(path);path.parent.mkdir(parents=True,exist_ok=True);temp=path.with_name(path.name+'.new');temp.write_text(data);temp.chmod(mode);temp.replace(path)
def link(target):
 temp=ROOT/'current.new';temp.unlink(missing_ok=True);temp.symlink_to(target);temp.replace(ROOT/'current')
def wait_health(release):
 for _ in range(30):
  try:
   with urllib.request.urlopen('http://127.0.0.1:8418/healthz',timeout=2) as r:body=json.load(r)
   if body.get('ready') and body.get('release')==release:return
  except Exception:pass
  time.sleep(.5)
 raise RuntimeError('New Shixu service did not become healthy')

def main():
 p=argparse.ArgumentParser();p.add_argument('--artifact',required=True);p.add_argument('--nginx-image',required=True);a=p.parse_args()
 if os.getuid()!=0:raise RuntimeError('Run on the authorized application server as root')
 source=Path(a.artifact).resolve();release=json.loads((source/'release.json').read_text())
 expected_id=hashlib.sha256(json.dumps(release['files'],separators=(',',':')).encode()).hexdigest()[:20]
 # JSON order is defined by package-server-release.mjs's sorted file list.
 if release['id']!=expected_id:raise RuntimeError('Release identity mismatch')
 for name,sha in release['files'].items():
  path=source/name
  if not path.resolve().is_relative_to(source) or path.is_symlink() or digest(path)!=sha:raise RuntimeError('Artifact checksum mismatch: '+name)
 if release['duration']!=720 or release['events']!=100 or release['cues']!=164:raise RuntimeError('Unexpected content coverage')
 if ROOT.exists() and ROOT.is_symlink():raise RuntimeError('Unexpected deployment root')
 ROOT.mkdir(exist_ok=True);(ROOT/'releases').mkdir(exist_ok=True)
 previous=os.readlink(ROOT/'current') if (ROOT/'current').is_symlink() else None
 for port in [8418,8443]:
  with socket.socket() as s:
   if s.connect_ex(('127.0.0.1',port))==0 and not previous:raise RuntimeError(f'Port {port} already in use')
 # Read S3 settings from standard environment variables. No credentials in the artifact, CLI or report.
 endpoint=os.environ.get('S3_ENDPOINT') or os.environ['SHIXU_OBJECT_ENDPOINT']
 endpoint=endpoint if endpoint.startswith('https://') else 'https://'+endpoint
 region=os.environ.get('S3_REGION') or os.environ.get('SHIXU_OBJECT_REGION','us-east-1')
 bucket=os.environ.get('S3_BUCKET') or os.environ['SHIXU_OBJECT_BUCKET']
 values={
  'SHIXU_OBJECT_ENDPOINT':endpoint,
  'SHIXU_OBJECT_REGION':region,
  'SHIXU_OBJECT_ACCESS_KEY':os.environ.get('S3_ACCESS_KEY') or os.environ['SHIXU_OBJECT_ACCESS_KEY'],
  'SHIXU_OBJECT_SECRET_KEY':os.environ.get('S3_SECRET_KEY') or os.environ['SHIXU_OBJECT_SECRET_KEY'],
 }
 client=boto3.client('s3',endpoint_url=endpoint,region_name=region,aws_access_key_id=values['SHIXU_OBJECT_ACCESS_KEY'],aws_secret_access_key=values['SHIXU_OBJECT_SECRET_KEY'],config=Config(signature_version='s3v4',s3={'addressing_style':'path'},connect_timeout=5,read_timeout=30,retries={'max_attempts':2}))
 objects_path=ROOT/'objects.json';objects=json.loads(objects_path.read_text()) if objects_path.exists() else {}
 uploaded=[]
 for obj in release['objects']:
  key=f'shixu/public/sha256/{obj["sha256"]}/{Path(obj["path"]).name}'
  try:
   head=client.head_object(Bucket=bucket,Key=key)
   if head.get('Metadata',{}).get('sha256')!=obj['sha256']:raise RuntimeError('Existing immutable object differs')
  except ClientError as e:
   if str(e.response['Error']['Code']) not in ['404','NoSuchKey','NotFound']:raise
   client.put_object(Bucket=bucket,Key=key,Body=(source/obj['file']).read_bytes(),ContentType=obj['contentType'],CacheControl='public, max-age=31536000, immutable',Metadata={'sha256':obj['sha256']})
  response=client.get_object(Bucket=bucket,Key=key);body=response['Body'].read()
  if len(body)!=obj['size'] or hashlib.sha256(body).hexdigest()!=obj['sha256']:raise RuntimeError('Object read-back verification failed')
  objects[obj['path']]={'bucket':bucket,'key':key,'sha256':obj['sha256'],'size':obj['size']};uploaded.append({'path':obj['path'],'size':obj['size'],'sha256':obj['sha256']})
 # Only the two published audio files get immutable local replicas for native Range delivery.
 public_audio=ROOT/'public-audio';public_audio.mkdir(exist_ok=True)
 audio_objects={obj['sha256']:obj for obj in release['objects'] if obj['path'].startswith('/audio/') and obj['contentType']=='audio/mp4'}
 for item in release.get('publicAudio',[]):
  obj=audio_objects.get(item['sha256']);name=Path(obj['path']).name if obj else ''
  expected=f'public-audio/{item["sha256"]}/{name}'
  if not obj or item['file']!=expected or release['files'].get(expected)!=item['sha256'] or item['size']!=obj['size']:raise RuntimeError('Unexpected public audio replica')
  destination=ROOT/expected
  if not destination.resolve().is_relative_to(public_audio.resolve()):raise RuntimeError('Public audio path outside its root')
  destination.parent.mkdir(parents=True,exist_ok=True)
  if destination.exists() and digest(destination)!=item['sha256']:raise RuntimeError('Existing immutable audio differs')
  if not destination.exists():
   temporary=destination.with_name(destination.name+'.new');shutil.copy2(source/expected,temporary);temporary.chmod(0o644);temporary.replace(destination)
 target=ROOT/'releases'/release['id']
 if not target.exists():
  target.mkdir()
  for name in release['files']:
   if not name.startswith(('site/','deploy/')):continue
   destination=target/name;destination.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source/name,destination)
  shutil.copy2(source/'release.json',target/'release.json')
 for name,sha in release['files'].items():
  if name.startswith(('objects/','public-audio/')):continue
  if digest(target/name)!=sha:raise RuntimeError('Release directory differs')
  if name.startswith(('site/assets/','site/audio/')) and name!='site/audio/timeline-zh.json':
   retained=ROOT/'retained'/name.removeprefix('site/');retained.parent.mkdir(parents=True,exist_ok=True)
   if retained.exists() and digest(retained)!=sha:raise RuntimeError('Retained immutable resource differs')
   if not retained.exists():shutil.copy2(target/name,retained)
 atomic(objects_path,json.dumps(objects,indent=2)+'\n')
 atomic('/etc/shixu-object-storage.env','\n'.join(k+'='+json.dumps(v) for k,v in values.items())+'\n',0o600)
 # Validate the independent proxy configuration without stopping the existing entry point.
 config=target/'deploy/nginx.conf'
 mounts=['--network','host','--read-only','--tmpfs','/var/cache/nginx','--tmpfs','/run','--tmpfs','/tmp','-v',f'{config}:/etc/nginx/nginx.conf:ro','-v','/etc/letsencrypt:/etc/letsencrypt:ro','-v',f'{public_audio}:/srv/shixu/public-audio:ro']
 run('docker','run','--rm',*mounts,'--entrypoint','nginx',a.nginx_image,'-t')
 old_unit=Path('/etc/systemd/system/shixu-site.service').read_text() if previous else None
 old_proxy=None;firewall_added=False
 try:
  link(target)
  atomic('/etc/systemd/system/shixu-site.service',(target/'deploy/shixu-site.service').read_text())
  run('systemctl','daemon-reload');run('systemctl','enable','shixu-site.service');run('systemctl','restart','shixu-site.service');wait_health(release['id'])
  exists=run('docker','ps','-a','--filter','name=^/shixu-web$','--format','{{.Names}}')
  old_proxy=json.loads(run('docker','inspect','shixu-web'))[0] if exists else None
  if exists:run('docker','rm','-f','shixu-web')
  run('docker','run','-d','--name','shixu-web','--restart','unless-stopped','--memory','96m','--cpus','0.5','--pids-limit','64','--security-opt','no-new-privileges:true',*mounts,'--entrypoint','nginx',a.nginx_image,'-g','daemon off;')
  # The sole new firewall rule belongs to this separately authorized public site.
  firewall_added='8443/tcp' not in run('ufw','status')
  run('ufw','allow','8443/tcp','comment','Shixu HTTPS')
  atomic('/etc/letsencrypt/renewal-hooks/deploy/reload-shixu-nginx.sh','#!/bin/sh\nset -eu\nif docker inspect shixu-web >/dev/null 2>&1; then docker exec shixu-web nginx -t && docker kill --signal HUP shixu-web >/dev/null; fi\n',0o755)
  health_url=os.environ.get('SHIXU_HEALTHCHECK_URL') or release.get('url','https://example.com:8443/').rstrip('/')+'/healthz'
  with urllib.request.urlopen(health_url,timeout=15) as r:online=json.load(r)
  if online['release']!=release['id']:raise RuntimeError('Public release identity differs')
  receipt={'id':release['id'],'url':release['url'],'previous':previous,'nginxImage':a.nginx_image,'objects':uploaded,'publicAudio':release.get('publicAudio',[]),'health':online,'switchedAt':time.strftime('%Y-%m-%dT%H:%M:%SZ',time.gmtime())}
  atomic(ROOT/'release-receipt.json',json.dumps(receipt,indent=2)+'\n')
  print(json.dumps(receipt))
 except Exception:
  if previous:
   link(previous)
   if old_unit:atomic('/etc/systemd/system/shixu-site.service',old_unit)
   run('systemctl','daemon-reload');run('systemctl','restart','shixu-site.service')
   if old_proxy:
    if run('docker','ps','-a','--filter','name=^/shixu-web$','--format','{{.Names}}'):run('docker','rm','-f','shixu-web')
    old_mounts=mounts.copy();old_mounts[old_mounts.index(f'{config}:/etc/nginx/nginx.conf:ro')]=f'{Path(previous)/"deploy/nginx.conf"}:/etc/nginx/nginx.conf:ro'
    run('docker','run','-d','--name','shixu-web','--restart','unless-stopped','--memory','96m','--cpus','0.5','--pids-limit','64','--security-opt','no-new-privileges:true',*old_mounts,'--entrypoint','nginx',old_proxy['Image'],'-g','daemon off;')
  else:
   run('systemctl','stop','shixu-site.service');run('systemctl','disable','shixu-site.service')
   if run('docker','ps','-a','--filter','name=^/shixu-web$','--format','{{.Names}}'):run('docker','rm','-f','shixu-web')
   if firewall_added:run('ufw','delete','allow','8443/tcp')
  raise

if __name__=='__main__':main()
