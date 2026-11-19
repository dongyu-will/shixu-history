import assert from 'node:assert/strict';
import test from 'node:test';
import { motionClock } from '../src/motion-clock.js';

function fixture() {
  let writes=0, time=0;
  const animation={
    get currentTime(){return time;},
    set currentTime(value){time=value;writes++;},
    playbackRate:1,playState:'paused',
    play(){this.playState='running';},pause(){this.playState='paused';},
  };
  return {animation,clock:motionClock([animation],35),writes:()=>writes,advance:ms=>{time+=ms;}};
}

test('native motion advances without rewriting effect time on every clock sample',()=>{
  const f=fixture();
  f.clock.seek(0,{playing:true,rate:2});
  const writes=f.writes();
  for(let i=1;i<=120;i++){
    f.advance(1000/60*2);
    f.clock.seek(i/60*2,{playing:true,rate:2});
  }
  assert.equal(f.writes(),writes);
  assert.equal(f.animation.playbackRate,2);
});

test('seeks, rate changes, pause and resume land on the authoritative clock',()=>{
  const f=fixture();
  f.clock.seek(12,{playing:true,rate:2});
  f.clock.seek(3,{playing:true,rate:.5});
  assert.equal(f.animation.currentTime,3000);
  assert.equal(f.animation.playbackRate,.5);
  f.clock.seek(3.04);
  assert.equal(f.animation.currentTime,3040);
  assert.equal(f.animation.playState,'paused');
  const writes=f.writes();
  f.clock.seek(3.04);
  assert.equal(f.writes(),writes);
  f.clock.seek(3.04,{playing:true});
  assert.equal(f.animation.playState,'running');
});

test('media buffering and accumulated drift are corrected within 80ms',()=>{
  const f=fixture();
  f.clock.seek(0,{playing:true});
  f.advance(120);
  f.clock.seek(0,{playing:true});
  assert.equal(f.animation.currentTime,0);
  f.clock.seek(1.2);
  assert.equal(f.animation.playState,'paused');
  assert.equal(f.animation.currentTime,1200);
});

test('reduced motion samples beat results and avoids repeating unchanged writes',()=>{
  let writes=0;
  const animation={set currentTime(value){writes++;this.time=value;}};
  const clock=motionClock([animation],35,t=>t<7?6.95:13.95);
  clock.seek(1);clock.seek(2);
  assert.equal(writes,1);
  assert.equal(animation.time,6950);
  clock.seek(7);
  assert.equal(animation.time,13950);
});
