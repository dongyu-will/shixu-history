import test from 'node:test';
import assert from 'node:assert/strict';
import { fitEventSegments } from '../scripts/lib/audio-timing.mjs';
test('Whole spoken sentences fit each scene without removing trailing words',()=>{
 for(const [raw,seconds] of [[[2.4,3.1],7],[[3.7,4.2],6.6],[[4.8],4.8],[[4.1,5.8,3.6],14.9]]){
  const result=fitEventSegments(raw,seconds);
  assert.equal(result.samples.reduce((s,n)=>s+n,0),Math.round(seconds*44100));
  raw.forEach((length,i)=>assert(result.samples[i]/44100>=length/result.tempo+.02));
 }
});
test('Excessively long speech must be regenerated rather than silently cut',()=>{
 assert.throws(()=>fitEventSegments([25],4.8),/regenerate/);
 assert.throws(()=>fitEventSegments([0],5),/Invalid/);
 assert.throws(()=>fitEventSegments([NaN],5),/Invalid/);
});
test('Unneeded acceleration is avoided and fractional scene lengths stay exact',()=>{
 const relaxed=fitEventSegments([1.1,1.2],10.5);assert.equal(relaxed.tempo,1);
 assert.equal(relaxed.totalSamples,463050);
 assert.equal(fitEventSegments([1.25],5.3).totalSamples,233730);
});
