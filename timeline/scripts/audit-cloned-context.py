"""Recheck flagged short clips in their actual, complete scene context."""
import hashlib,json,re,subprocess
from pathlib import Path
from difflib import SequenceMatcher
from faster_whisper import WhisperModel
from opencc import OpenCC
from pypinyin import lazy_pinyin,Style
work=Path(__file__).resolve().parents[2]/'output/voice-timeline';raw=json.loads((work/'raw-manifest.json').read_text());audit=json.loads((work/'audit.json').read_text());flagged=set(audit['unresolved']);directory=work/'context-checks';directory.mkdir(exist_ok=True)
model=WhisperModel('small',device='cpu',compute_type='int8',cpu_threads=4,local_files_only=True);cc=OpenCC('t2s');reviews=json.loads((work/'audit-review.json').read_text()) if (work/'audit-review.json').exists() else {};evidence=[]
def norm(s):
 s=cc.convert(s);s=re.sub(r'\d{4}(?=年)',lambda m:''.join('零一二三四五六七八九'[int(c)] for c in m[0]),s);return re.sub(r'[^\u4e00-\u9fff]','',s)
for event in raw['events']:
 targets=[c for c in event['clips'] if c['id'] in flagged]
 if not targets:continue
 concat=directory/f'{event["eventId"]}.txt';wav=directory/f'{event["eventId"]}.wav';concat.write_text('\n'.join(f"file '{c['path']}'" for c in event['clips']))
 subprocess.run(['ffmpeg','-v','error','-y','-f','concat','-safe','0','-i',str(concat),'-ar','16000','-ac','1',str(wav)],check=True)
 segments,_=model.transcribe(str(wav),language='zh',beam_size=8,vad_filter=True,condition_on_previous_text=False,initial_prompt='简体中文历史讲解。')
 actual=''.join(s.text for s in segments);expected=''.join(event['lines']);x=norm(expected);y=norm(actual);r=SequenceMatcher(None,lazy_pinyin(x,style=Style.NORMAL),lazy_pinyin(y,style=Style.NORMAL),autojunk=False).ratio();t=SequenceMatcher(None,x,y,autojunk=False).ratio()
 polarity=not(any(k in x for k in ['不','未','没有','只有']) and not any(k in y for k in ['不','未','没','只有','仅']))
 passed=polarity and len(y)>=len(x)*.9 and (r>=.97 or (r>=.91 and t>=.8))
 item={'eventId':event['eventId'],'expected':expected,'transcript':actual,'phoneticSimilarity':r,'textSimilarity':t,'passed':passed};evidence.append(item)
 for c in targets:
  individual=next(v for v in audit['flagged'] if v['id']==c['id'])
  exact_homophones=individual['phoneticSimilarity']>=.99 and len(norm(individual['transcript']))>=len(norm(c['text']))*.95
  if passed or exact_homophones:reviews[c['audioHash']]={'resolved':True,'reason':'完整场景语音复查通过，或逐字声韵序列一致、仅ASR同音字替换；不等同真人听审。','evidence':item,'individualExactPhonetics':exact_homophones}
 print(json.dumps(item,ensure_ascii=False),flush=True)
(work/'context-audit.json').write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n');(work/'audit-review.json').write_text(json.dumps(reviews,ensure_ascii=False,indent=2)+'\n')
