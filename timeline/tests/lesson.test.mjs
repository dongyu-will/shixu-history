import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { AUTHORED_STORIES, playbackTime, storyboardEvents } from '../src/stories.js';
import { CHAPTERS, NARRATION, LESSON_SECONDS, DECISION_AT, ANSWERS, lessonEvents, lessonFrame, boundedTime, scoreReconstruction } from '../src/lesson.js';
const data=JSON.parse(readFileSync(new URL('../public/data/history.json',import.meta.url)));
const selected=lessonEvents(data.events);
test('90-second sample preserves every original field and all twelve phases',()=>{
  const before=JSON.stringify(data.events);
  assert.equal(selected.reduce((sum,e)=>sum+e.duration,0),90);
  assert.equal(CHAPTERS.at(-1).start+CHAPTERS.at(-1).duration,LESSON_SECONDS);
  assert.equal(selected.reduce((sum,e)=>sum+AUTHORED_STORIES[e.id].beats.length,0),12);
  for(const e of selected){
    const original=data.events.find(item=>item.id===e.id);
    assert.deepEqual({...e,duration:original.duration},original);
    AUTHORED_STORIES[e.id].beats.forEach((b,i)=>{
      const time=CHAPTERS.find(c=>c.id===e.id).start+playbackTime(e,b.at)+.001;
      assert.equal(lessonFrame(selected,time).phase,i);
    });
  }
  assert.equal(JSON.stringify(data.events),before);
  assert.equal(Math.round(storyboardEvents(data.events).reduce((s,e)=>s+e.duration,0)),720);
});
test('Decision gate catches timeline, chapter, keyboard and large-frame seeks before the answer',()=>{
  for(const t of [20,21,36,66,90,900])assert.equal(boundedTime(t,false),DECISION_AT);
  const f=lessonFrame(selected,DECISION_AT);
  assert.equal(f.index,0);assert.equal(f.phase,2);
  assert.equal(AUTHORED_STORIES[selected[0].id].beats[f.phase].short,'会合');
  assert.equal(boundedTime(66,true),66);assert.equal(boundedTime(95,true),90);
  assert.equal(boundedTime(-2,false),0);
});
test('Narration has no gaps or overlaps and follows chapter clock',()=>{
  assert.equal(NARRATION[0][0],0);assert.equal(NARRATION.at(-1)[1],90);
  NARRATION.forEach(([from,to,text],i)=>{assert(to>from&&text);if(i)assert.equal(from,NARRATION[i-1][1]);});
  assert.equal(lessonFrame(selected,36).index,1);assert.equal(lessonFrame(selected,66).index,2);
});
test('Reconstruction distinguishes chronology from conceptual matching without changing answers',()=>{
  const order=CHAPTERS.map(c=>c.id),matches={...ANSWERS},before=JSON.stringify({order,matches});
  assert.equal(scoreReconstruction(order,matches).total,6);
  assert.equal(scoreReconstruction([...order].reverse(),matches).total,4);
  assert.equal(scoreReconstruction(order,{}).total,3);
  assert.equal(scoreReconstruction([],{}).total,0);
  assert.equal(JSON.stringify({order,matches}),before);
  const confused={...matches,'meeting-50':'thought','e-32':'organization'};
  assert.deepEqual(scoreReconstruction(order,confused).matched,[true,false,false]);
});
