"""Independent local Mandarin ASR for short clips flagged by Whisper. No script prompt."""
import hashlib,json,re
from pathlib import Path
from difflib import SequenceMatcher
from funasr import AutoModel
from opencc import OpenCC
from pypinyin import lazy_pinyin,Style
work=Path(__file__).resolve().parents[2]/'output/voice-timeline'
raw=json.loads((work/'raw-manifest.json').read_text());audit=json.loads((work/'audit.json').read_text())
flagged=set(audit['unresolved']);cc=OpenCC('t2s')
model=AutoModel(model='paraformer',device='cpu',disable_update=True,disable_pbar=True,ncpu=4,check_latest=False)
reviews=json.loads((work/'audit-review.json').read_text()) if (work/'audit-review.json').exists() else {}
def norm(s):
 s=cc.convert(s);s=re.sub(r'\d{4}(?=年)',lambda m:''.join('零一二三四五六七八九'[int(c)] for c in m[0]),s)
 return re.sub(r'[^\u4e00-\u9fff]','',s)
evidence=[]
for event in raw['events']:
 for clip in event['clips']:
  if clip['id'] not in flagged:continue
  result=model.generate(input=clip['path'],batch_size_s=30)
  actual=''.join(r.get('text','') for r in result);x=norm(clip['text']);y=norm(actual)
  p=SequenceMatcher(None,lazy_pinyin(x,style=Style.NORMAL),lazy_pinyin(y,style=Style.NORMAL),autojunk=False).ratio()
  t=SequenceMatcher(None,x,y,autojunk=False).ratio()
  polarity=not(any(k in x for k in ['不','未','没有','只有']) and not any(k in y for k in ['不','未','没','只有','仅']))
  # Exact phonetic alignment also covers rare place names transcribed as common homophones.
  passed=polarity and len(y)>=len(x)*.9 and (p>=.99 or (p>=.94 and t>=.8))
  item={'id':clip['id'],'audioHash':clip['audioHash'],'expected':clip['text'],'transcript':actual,'phoneticSimilarity':p,'textSimilarity':t,'passed':passed}
  evidence.append(item)
  if passed:reviews[clip['audioHash']]={'resolved':True,'reason':'独立本地中文 Paraformer 识别核对通过；未提供原讲稿或热词提示。自动复查不等同真人听审。','evidence':item}
  print(json.dumps(item,ensure_ascii=False),flush=True)
(work/'mandarin-audit.json').write_text(json.dumps({'rawHash':hashlib.sha256((work/'raw-manifest.json').read_bytes()).hexdigest(),'results':evidence},ensure_ascii=False,indent=2)+'\n')
(work/'audit-review.json').write_text(json.dumps(reviews,ensure_ascii=False,indent=2)+'\n')
