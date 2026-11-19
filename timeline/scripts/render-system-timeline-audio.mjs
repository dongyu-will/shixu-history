// Generate the complete timeline voice track locally, using the same event durations as playback.
import { readFile, writeFile, mkdir, mkdtemp, rm, copyFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { storyboardEvents } from '../src/stories.js';
import { narrationPlan } from '../src/narration.js';
const events=storyboardEvents(JSON.parse(await readFile('public/data/history.json','utf8')).events);
const plan=narrationPlan(events),dir=await mkdtemp(join(tmpdir(),'shixu-voice-'));
const sampleRate=44100,voice='Tingting',spokenRate=185,cues=[],parts=[],metrics=[];
let globalSample=0;
const vttTime=seconds=>{const ms=Math.round(seconds*1000);return `${String(Math.floor(ms/3600000)).padStart(2,'0')}:${String(Math.floor(ms/60000)%60).padStart(2,'0')}:${String(Math.floor(ms/1000)%60).padStart(2,'0')}.${String(ms%1000).padStart(3,'0')}`;};
try {
  for(let eventIndex=0;eventIndex<plan.length;eventIndex++) {
    const event=plan[eventIndex],raw=[];
    for(let lineIndex=0;lineIndex<event.lines.length;lineIndex++) {
      const stem=join(dir,`${eventIndex}-${lineIndex}`);
      await writeFile(stem+'.txt',event.lines[lineIndex]);
      execFileSync('/usr/bin/say',['-v',voice,'-r',String(spokenRate),'-o',stem+'.aiff','-f',stem+'.txt']);
      const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',stem+'.aiff'],{encoding:'utf8'}).trim());
      raw.push({stem,duration,text:event.lines[lineIndex]});
    }
    const nativeDuration=raw.reduce((s,c)=>s+c.duration,0);
    const tempo=Math.max(1,nativeDuration/(event.duration-.18-.12*(raw.length-1)));
    if(tempo>1.75)throw Error(`${event.eventId}: narration too dense (${tempo.toFixed(2)}×); shorten the spoken script, retain full source text.`);
    const targetSamples=Math.round(event.duration*sampleRate);let used=0;
    for(let i=0;i<raw.length;i++) {
      const item=raw[i],samples=i===raw.length-1?targetSamples-used:Math.round((item.duration/tempo+.12)*sampleRate);
      const output=item.stem+'.wav';
      execFileSync('ffmpeg',['-v','error','-y','-i',item.stem+'.aiff','-af',`atempo=${tempo},aresample=${sampleRate},apad,atrim=end_sample=${samples}`,'-ar',String(sampleRate),'-ac','1',output]);
      cues.push({eventId:event.eventId,start:globalSample/sampleRate,end:(globalSample+samples)/sampleRate,text:item.text});
      globalSample+=samples;used+=samples;parts.push(output);
    }
    metrics.push({eventId:event.eventId,nativeDuration,tempo});
    if((eventIndex+1)%10===0)console.log(`${eventIndex+1}/${plan.length} events rendered`);
  }
  await mkdir('public/audio',{recursive:true});
  await writeFile(join(dir,'concat.txt'),parts.map(p=>`file '${p}'`).join('\n'));
  execFileSync('ffmpeg',['-v','error','-y','-f','concat','-safe','0','-i',join(dir,'concat.txt'),'-c:a','aac','-b:a','96k','-movflags','+faststart',join(dir,'timeline-zh.m4a')]);
  const audioDuration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',join(dir,'timeline-zh.m4a')],{encoding:'utf8'}).trim());
  if(Math.abs(audioDuration-globalSample/sampleRate)>.01)throw Error(`Rendered audio length ${audioDuration} does not match the map clock`);
  await copyFile(join(dir,'timeline-zh.m4a'),'public/audio/timeline-zh.m4a');
  const audioHash=createHash('sha256').update(await readFile(join(dir,'timeline-zh.m4a'))).digest('hex');
  const manifest={version:1,audio:`/audio/timeline-zh.m4a?v=${audioHash.slice(0,16)}`,audioHash,captions:'/audio/timeline-zh.vtt',duration:globalSample/sampleRate,voice,spokenRate,scriptHash:createHash('sha256').update(JSON.stringify(plan)).digest('hex'),cues,metrics};
  await writeFile('public/audio/timeline-zh.json',JSON.stringify(manifest,null,2)+'\n');
  await writeFile('public/audio/timeline-zh.vtt','WEBVTT\n\n'+cues.map((c,i)=>`${i+1}\n${vttTime(c.start)} --> ${vttTime(c.end)}\n${c.text}\n`).join('\n'));
  console.log(JSON.stringify({events:plan.length,cues:cues.length,duration:manifest.duration,maxTempo:Math.max(...metrics.map(m=>m.tempo)),audio:manifest.audio}));
} finally {await rm(dir,{recursive:true,force:true});}
