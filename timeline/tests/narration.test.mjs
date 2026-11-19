import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { storyboardEvents } from '../src/stories.js';
import { NARRATION_SCRIPTS, narrationPlan, captionAt, fallbackCaptions } from '../src/narration.js';
const source=JSON.parse(readFileSync(new URL('../public/data/history.json',import.meta.url)));
const events=storyboardEvents(source.events),plan=narrationPlan(events);
const manifest=JSON.parse(readFileSync(new URL('../public/audio/timeline-zh.json',import.meta.url)));

test('Every retained event has authored spoken explanations without replacing source content',()=>{
  assert.deepEqual(new Set(Object.keys(NARRATION_SCRIPTS)),new Set(events.map(e=>e.id)));
  assert.equal(plan.length,100);
  for(const [i,event] of events.entries()){
    assert.equal(plan[i].eventId,event.id);
    assert(plan[i].lines.every(line=>typeof line==='string'&&line.trim().length));
    assert.deepEqual({...event,duration:source.events[i].duration},source.events[i]);
    assert(Math.abs(plan[i].start+event.duration-(plan[i+1]?.start||720))<1e-6);
  }
});

test('Generated captions match the current scripts and cover exactly the same 720-second clock',()=>{
  assert.equal(manifest.scriptHash,createHash('sha256').update(JSON.stringify(plan)).digest('hex'));
  assert.equal(manifest.duration,720);
  assert.equal(manifest.cues[0].start,0);
  assert.equal(manifest.cues.at(-1).end,720);
  for(const [i,cue] of manifest.cues.entries()){
    assert(cue.end>cue.start);
    if(i)assert(Math.abs(cue.start-manifest.cues[i-1].end)<1e-8);
    assert.equal(captionAt(manifest.cues,cue.start),i);
    assert.equal(captionAt(manifest.cues,(cue.start+cue.end)/2),i);
  }
  for(const item of plan){
    const cues=manifest.cues.filter(c=>c.eventId===item.eventId);
    assert.deepEqual(cues.map(c=>c.text),item.lines);
    assert(Math.abs(cues[0].start-item.start)<1e-6);
    assert(Math.abs(cues.at(-1).end-item.start-item.duration)<1e-6);
  }
  assert.equal(captionAt(manifest.cues,-1),-1);
  assert.equal(captionAt(manifest.cues,720),-1);
  assert.equal(captionAt([],0),-1);
});

test('Text-only fallback captions cover all events if voice assets fail',()=>{
  const fallback=fallbackCaptions(events);
  assert.equal(fallback[0].start,0);
  assert.equal(Math.round(fallback.at(-1).end),720);
  for(const e of plan)assert.deepEqual(fallback.filter(c=>c.eventId===e.eventId).map(c=>c.text),e.lines);
  for(const e of plan)assert.equal(fallback[captionAt(fallback,e.start+.001)].eventId,e.eventId);
});

test('Final audio duration and exported WebVTT agree with the clock, with bounded speech acceleration',()=>{
  const audio=new URL('../public'+manifest.audio.split('?')[0],import.meta.url);
  assert(statSync(audio).size>100000);
  const hash=createHash('sha256').update(readFileSync(audio)).digest('hex');
  assert.equal(manifest.audioHash,hash);
  assert.equal(manifest.audio,`/audio/timeline-zh-gpt-${hash.slice(0,16)}.m4a`);
  const duration=Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',audio.pathname],{encoding:'utf8'}).trim());
  assert(Math.abs(duration-720)<.01,`Audio is ${duration}s, expected 720s`);
  const vtt=readFileSync(new URL('../public'+manifest.captions,import.meta.url),'utf8');
  assert(vtt.startsWith('WEBVTT\n'));
  assert.equal((vtt.match(/ --> /g)||[]).length,manifest.cues.length);
  manifest.cues.forEach(c=>assert(vtt.includes(c.text)));
  assert.equal(manifest.metrics.length,100);
  assert(manifest.metrics.every(m=>m.tempo>=1&&m.tempo<=1.75));
});


test('The default track uses the approved audition voice and unchanged source content',()=>{
  const profileBytes=readFileSync(new URL('../scripts/approved-voice.json',import.meta.url));
  const profile=JSON.parse(profileBytes);
  assert.equal(manifest.engine,'GPT-SoVITS');
  assert.equal(manifest.model,'v2ProPlus');
  assert.equal(manifest.voiceProfileId,profile.id);
  assert.equal(manifest.voiceProfileHash,createHash('sha256').update(profileBytes).digest('hex'));
  for(const field of ['referenceHash','promptHash','approvedAuditionHash'])assert.equal(manifest.synthesis[field],profile[field]);
  for(const [field,value] of Object.entries(profile.parameters))assert.equal(manifest.synthesis[field],value);
  assert(manifest.disclosure.includes('AI合成'));
  for(const [file,hash] of Object.entries(manifest.contentHashes))assert.equal(createHash('sha256').update(readFileSync(new URL('../'+file,import.meta.url))).digest('hex'),hash,file);
});
