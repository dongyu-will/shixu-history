"""Read-only ASR checks on each generated line. Never replace subtitles with ASR output."""
import argparse,hashlib,json,re,time
from pathlib import Path
from difflib import SequenceMatcher
from opencc import OpenCC
from pypinyin import lazy_pinyin,Style
from faster_whisper import WhisperModel
p=argparse.ArgumentParser();p.add_argument('--work',required=True);p.add_argument('--wait',action='store_true');p.add_argument('--expected-events',type=int,default=100);a=p.parse_args()
work=Path(a.work).resolve();manifest=work/'raw-manifest.json';cache_file=work/'audit-cache.json';cc=OpenCC('t2s')
cache=json.loads(cache_file.read_text()) if cache_file.exists() else {}
print('Loading local speech-content checker…',flush=True)
model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=2,local_files_only=True)
def normalize(text):
 text=cc.convert(text);digits='零一二三四五六七八九'
 text=re.sub(r'\d{4}(?=年)',lambda m:''.join(digits[int(c)] for c in m[0]),text)
 text=re.sub(r'\b([1-9])(?=月)',lambda m:digits[int(m[0])],text)
 return re.sub(r'[^\u4e00-\u9fff]','',text)
def ratio(x,y):return SequenceMatcher(None,x,y,autojunk=False).ratio()
def save(path,value):
 temp=path.with_suffix('.tmp.json');temp.write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n');temp.replace(path)
last=-1;started=time.time()
while True:
 if not manifest.exists():
  if not a.wait:raise FileNotFoundError(manifest)
  time.sleep(2);continue
 raw=json.loads(manifest.read_text());clips=[c for e in raw['events'] for c in e['clips']]
 results=[]
 for clip in clips:
  key=clip['audioHash']
  if key not in cache or cache[key].get('expected')!=clip['text']:
   segments,_=model.transcribe(clip['path'],language='zh',beam_size=5,vad_filter=True,condition_on_previous_text=False,initial_prompt='以下为简体中文历史讲解。')
   actual=''.join(s.text for s in segments)
   expected=normalize(clip['text']);recognized=normalize(actual)
   text_score=ratio(expected,recognized)
   phones=lambda s:lazy_pinyin(s,style=Style.NORMAL)
   phonetic_score=ratio(phones(expected),phones(recognized))
   missing_polarity=any(token in expected for token in ['不','未','没有','只有']) and not any(token in recognized for token in ['不','未','没','只有','仅'])
   reasons=[]
   if not recognized or len(recognized)<len(expected)*.65:reasons.append('possible missing words')
   if phonetic_score<.84 or text_score<.65:reasons.append('text/phonetic mismatch')
   if missing_polarity:reasons.append('check negation or limitation')
   cache[key]={'id':clip['id'],'rawHash':key,'expected':clip['text'],'transcript':actual,'textSimilarity':text_score,'phoneticSimilarity':phonetic_score,'reasons':reasons}
   save(cache_file,cache)
  result={**cache[key],'id':clip['id']};results.append(result)
 if len(results)!=last:
  print(f'Checked {len(results)} spoken clips · {sum(bool(r["reasons"]) for r in results)} flagged for review · {time.time()-started:.1f}s',flush=True);last=len(results)
 if len(raw['events'])==a.expected_events:
  review_file=work/'audit-review.json';reviews=json.loads(review_file.read_text()) if review_file.exists() else {}
  unresolved=[r['id'] for r in results if r['reasons'] and not (reviews.get(r['rawHash'],{}).get('reason') and reviews[r['rawHash']].get('resolved'))]
  report={'note':'Automatic content-consistency diagnostics, not human listening or proof of voice likeness. Caption text remains the source script.','checked':len(results),'rawHash':hashlib.sha256(manifest.read_bytes()).hexdigest(),'unresolved':unresolved,'flagged':[r for r in results if r['reasons']],'results':results}
  save(work/'audit.json',report)
  print(json.dumps({'checked':len(results),'unresolved':unresolved,'minimumPhoneticSimilarity':min(r['phoneticSimilarity'] for r in results)},ensure_ascii=False),flush=True);break
 if not a.wait:raise RuntimeError('Synthesis is incomplete; use --wait for the running renderer')
 time.sleep(2)
