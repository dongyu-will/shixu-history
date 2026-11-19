import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AUTHORED_STORIES, beatAt, storyboardEvents, storyTime, playbackTime, PLAYBACK_SECONDS } from '../src/stories.js';
import { PROCESS_PLACES } from '../src/storyboards/places.js';

const events=JSON.parse(readFileSync(new URL('../public/data/history.json',import.meta.url))).events;
const ids=new Set(events.map(e=>e.id));

test('Every retained event has a complete, navigable, source-linked storyboard',()=>{
  assert.equal(events.length,100);
  assert.deepEqual(new Set(Object.keys(AUTHORED_STORIES)),ids);
  for(let i=1;i<=47;i++)assert(ids.has(`e-${i}`));
  for(const e of events){
    const s=AUTHORED_STORIES[e.id];
    assert(e.original.length&&e.pages.length&&e.sourceUrl,e.id);
    assert(s.beats.length>=3,e.id);
    assert.equal(s.beats[0].at,0,e.id);
    assert.equal(new Set(s.beats.map(b=>b.short)).size,s.beats.length,e.id);
    s.beats.forEach((b,i)=>{
      assert(b.title&&b.text&&b.short,e.id);
      assert(b.at<s.duration&&(!i||b.at>s.beats[i-1].at),e.id);
      assert.equal(beatAt(s,b.at),i,e.id);
      if(i)assert.equal(beatAt(s,b.at-.001),i-1,e.id);
    });
    assert.equal(beatAt(s,-1),0,e.id);
    assert.equal(beatAt(s,s.duration),s.beats.length-1,e.id);
    for(const sourceId of s.evidence||[])assert(ids.has(sourceId),`${e.id}: ${sourceId}`);
    for(const p of s.locations||[])assert(PROCESS_PLACES[p.place]?.every(Number.isFinite),`${e.id}: ${p.place}`);
    if(s.anchor)assert(PROCESS_PLACES[s.anchor],e.id);
    for(const [from,to,phase] of s.edges||[]){assert(s.locations[from]&&s.locations[to],e.id);assert(phase>=0&&phase<s.beats.length,e.id);}
  }
});

test('Playback durations do not mutate or replace retained historical material',()=>{
  const before=JSON.stringify(events);
  const playback=storyboardEvents(events);
  assert.equal(JSON.stringify(events),before);
  playback.forEach((e,i)=>{
    assert.deepEqual({...e,duration:events[i].duration},events[i]);
    assert(e.duration>0&&e.duration<AUTHORED_STORIES[e.id].duration);
  });
});

test('The 12 minute cut preserves all stages and maps seeks in both directions',()=>{
  const playback=storyboardEvents(events);
  assert.equal(Math.round(playback.reduce((sum,e)=>sum+e.duration,0)*10),PLAYBACK_SECONDS*10);
  const autumn=playback.find(e=>e.id==='e-29');
  const writing=playback.find(e=>e.id==='writing-80');
  assert(autumn.duration>writing.duration*2);
  for(const e of playback){
    const s=AUTHORED_STORIES[e.id];
    assert.equal(storyTime(e,0),0);
    assert.equal(storyTime(e,e.duration),s.duration);
    assert.equal(playbackTime(e,s.duration),e.duration);
    for(const b of s.beats){
      const t=playbackTime(e,b.at);
      assert.equal(beatAt(s,storyTime(e,t)),beatAt(s,b.at),e.id);
      assert(Math.abs(storyTime(e,t)-b.at)<1e-7,e.id);
    }
    assert(storyTime(e,e.duration*.8)>storyTime(e,e.duration*.2));
  }
});

test('Policy and strategic distinctions remain explicit in the visual model',()=>{
  assert.equal(AUTHORED_STORIES['land-70'].unimplemented,true);
  assert.equal(AUTHORED_STORIES['land-71'].allocation,'value');
  assert.equal(AUTHORED_STORIES['land-77'].allocation,'rent');
  assert(AUTHORED_STORIES['land-75'].protected);
  assert(AUTHORED_STORIES['land-75'].beats[2].text.includes('使用权'));
  assert.equal(AUTHORED_STORIES['land-76'].recipient,'农民个人私有');
  assert.deepEqual(AUTHORED_STORIES['writing-88'].labels,['战略防御','战略相持','战略反攻']);
  assert.deepEqual(AUTHORED_STORIES['e-45'].labels,['战略防御','战略进攻','战略决战']);
  assert(AUTHORED_STORIES['e-23'].relation.includes('非先后'));
  assert(AUTHORED_STORIES['e-38'].relation.includes('非长征全程路线'));
});
