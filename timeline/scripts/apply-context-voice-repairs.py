"""Split locally checked full-scene repairs without changing source lines."""
import hashlib,json,re
from pathlib import Path
from difflib import SequenceMatcher
import numpy as np,soundfile as sf
from pypinyin import lazy_pinyin
work=Path(__file__).resolve().parents[2]/'output/voice-timeline';directory=work/'repair-context'
raw=json.loads((work/'raw-manifest.json').read_text());repairs=json.loads((directory/'raw-manifest.json').read_text());asr={e['eventId']:e['result'][0] for e in json.loads((directory/'asr.json').read_text())}
sha=lambda p:hashlib.sha256(Path(p).read_bytes()).hexdigest()
norm=lambda s:re.sub(r'[^\u4e00-\u9fff]','',s)
assert raw['recipe']==repairs['recipe']
for replacement in repairs['events']:
 event=next(e for e in raw['events'] if e['eventId']==replacement['eventId']);clip=replacement['clips'][0];check=asr[event['eventId']]
 expected=norm(''.join(event['lines']));actual=norm(check['text'])
 assert ''.join(event['lines'])==replacement['lines'][0]
 assert len(expected)==len(actual)==len(check['timestamp'])
 assert SequenceMatcher(None,lazy_pinyin(expected),lazy_pinyin(actual),autojunk=False).ratio()>=.99
 audio,rate=sf.read(clip['path']);boundaries=[0];count=0
 for line in event['lines'][:-1]:
  count+=len(norm(line));pair=check['timestamp'];target=(pair[count-1][1]+pair[count][0])/2000
  # Cut in the quietest 15-ms window close to the recognized sentence boundary.
  radius=int(.09*rate);center=int(target*rate);width=int(.015*rate)
  candidates=range(max(boundaries[-1]+width,center-radius),min(len(audio)-width,center+radius),max(1,int(.005*rate)))
  cut=min(candidates,key=lambda i:np.mean(audio[i-width//2:i+width//2]**2));boundaries.append(cut)
 boundaries.append(len(audio));new=[]
 context={'recipeHash':hashlib.sha256(json.dumps(raw['recipe'],sort_keys=True).encode()).hexdigest(),'sourceAudio':clip['path'],'sourceHash':clip['audioHash'],'sourceText':replacement['lines'][0],'asr':check,'splitSamples':boundaries}
 for i,text in enumerate(event['lines']):
  key=hashlib.sha256(json.dumps({'source':clip['audioHash'],'start':boundaries[i],'end':boundaries[i+1]}).encode()).hexdigest();path=work/'raw'/f'{event["eventId"]}-{i}-context-{key[:16]}.wav'
  sf.write(path,audio[boundaries[i]:boundaries[i+1]],rate,subtype='PCM_16')
  new.append({'id':f'{event["eventId"]}-{i}','lineIndex':i,'text':text,'path':str(path),'duration':sf.info(path).duration,'sampleRate':rate,'seed':clip['seed'],'cacheKey':key,'audioHash':sha(path),'context':context})
 event['clips']=new
 print(f'{event["eventId"]}: complete context preserved in {len(new)} aligned clips')
temp=work/'raw-manifest.tmp.json';temp.write_text(json.dumps(raw,ensure_ascii=False,indent=2)+'\n');temp.replace(work/'raw-manifest.json')
