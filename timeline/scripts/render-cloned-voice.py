"""Offline GPT-SoVITS renderer. Exact source lines are never rewritten or dropped."""
import argparse,contextlib,hashlib,json,os,subprocess,sys,time
from pathlib import Path
p=argparse.ArgumentParser()
for name in ['backend','plan','work','reference','prompt','audition']:p.add_argument('--'+name,required=True)
p.add_argument('--only',nargs='*',default=[])
p.add_argument('--seed',type=int,default=42)
a=p.parse_args();backend=Path(a.backend).resolve();work=Path(a.work).resolve();work.mkdir(parents=True,exist_ok=True)
os.chdir(backend);sys.path[:0]=[str(backend),str(backend/'GPT_SoVITS')]
import numpy as np,soundfile as sf,torch
torch.set_num_threads(4)
(backend/'GPT_SoVITS/pretrained_models/fast_langdetect').mkdir(parents=True,exist_ok=True)
sha=lambda path:hashlib.sha256(Path(path).read_bytes()).hexdigest()
plan=json.loads(Path(a.plan).read_text());prompt=Path(a.prompt).read_text().strip()
config={'version':'v2ProPlus','device':'cpu','is_half':False,'bert_base_path':'GPT_SoVITS/pretrained_models/chinese-roberta-wwm-ext-large','cnhuhbert_base_path':'GPT_SoVITS/pretrained_models/chinese-hubert-base','t2s_weights_path':'GPT_SoVITS/pretrained_models/s1v3.ckpt','vits_weights_path':'GPT_SoVITS/pretrained_models/v2Pro/s2Gv2ProPlus.pth'}
recipe={'engine':'GPT-SoVITS','model':'v2ProPlus','device':'cpu','speedFactor':.92,'textSplitMethod':'cut2','topK':15,'topP':.9,'temperature':1.,'referenceHash':sha(a.reference),'promptHash':sha(a.prompt),'approvedAuditionHash':sha(a.audition),'backendCommit':subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()}
cache=work/'raw';cache.mkdir(exist_ok=True)
old={}
manifest_path=work/'raw-manifest.json'
if manifest_path.exists():
 old=json.loads(manifest_path.read_text()).get('events',[])
 old={e['eventId']:e for e in old}
tts=None;rendered=[];count=0;started=time.time()
with (work/'synthesis.log').open('a') as log:
 for event_index,event in enumerate(plan):
  lines=[]
  for line_index,text in enumerate(event['lines']):
   identifier=f'{event["eventId"]}-{line_index}'
   previous=next((x for x in old.get(event['eventId'],{}).get('clips',[]) if x['lineIndex']==line_index),None)
   seed=a.seed if identifier in a.only else (previous or {}).get('seed',42)
   digest=hashlib.sha256(json.dumps({'recipe':recipe,'seed':seed,'text':text},ensure_ascii=False,sort_keys=True).encode()).hexdigest()
   audio_path=cache/f'{identifier}-{digest[:16]}.wav'
   # Validated context-generated splits retain their own immutable audio and provenance.
   context=None
   if previous and previous.get('context') and identifier not in a.only and previous['text']==text:
    candidate=Path(previous['path'])
    if previous['context']['recipeHash']==hashlib.sha256(json.dumps(recipe,sort_keys=True).encode()).hexdigest() and candidate.exists() and sha(candidate)==previous['audioHash']:
     audio_path=candidate;digest=previous['cacheKey'];context=previous['context']
   if not audio_path.exists():
    if tts is None:
     print('Loading approved GPT-SoVITS voice on CPU…',flush=True)
     with contextlib.redirect_stdout(log),contextlib.redirect_stderr(log):
      from GPT_SoVITS.TTS_infer_pack.TTS import TTS,TTS_Config
      tts=TTS(TTS_Config({'custom':config}))
    params={'text':text,'text_lang':'zh','ref_audio_path':str(Path(a.reference).resolve()),'prompt_text':prompt,'prompt_lang':'zh','top_k':15,'top_p':.9,'temperature':1.,'text_split_method':'cut2','batch_size':1,'split_bucket':False,'speed_factor':.92,'fragment_interval':.35,'seed':seed,'parallel_infer':True,'use_cuda_graph':False,'use_flash_attention':False,'repetition_penalty':1.35,'streaming_mode':False}
    parts=[];rate=None
    with contextlib.redirect_stdout(log),contextlib.redirect_stderr(log):
     for rate,audio in tts.run(params):parts.append(audio)
    if not parts:raise RuntimeError(f'{identifier}: empty synthesis')
    audio=np.concatenate(parts)
    if len(audio)/rate<.25 or len(audio)/rate>max(20,event['duration']*2):raise RuntimeError(f'{identifier}: abnormal speech duration')
    temp=audio_path.with_suffix('.tmp.wav');sf.write(temp,audio,rate,subtype='PCM_16');os.replace(temp,audio_path)
   info=sf.info(audio_path);audio,rate=sf.read(audio_path)
   if not np.isfinite(audio).all() or np.sqrt(np.mean(audio**2))<.001:raise RuntimeError(f'{identifier}: silent or invalid speech')
   clip={'id':identifier,'lineIndex':line_index,'text':text,'path':str(audio_path),'duration':info.duration,'sampleRate':info.samplerate,'seed':seed,'cacheKey':digest,'audioHash':sha(audio_path)}
   if context:clip['context']=context
   lines.append(clip)
   count+=1
  rendered.append({**event,'clips':lines})
  temp=manifest_path.with_suffix('.tmp.json');temp.write_text(json.dumps({'recipe':recipe,'events':rendered},ensure_ascii=False,indent=2)+'\n');os.replace(temp,manifest_path)
  if (event_index+1)%10==0 or event_index==len(plan)-1:print(f'{event_index+1}/{len(plan)} events · {count} complete spoken clips · {time.time()-started:.1f}s',flush=True)
print('All source lines synthesized without cuts.',flush=True)
