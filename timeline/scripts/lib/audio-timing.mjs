/** Allocate complete spoken clips to one fixed map scene, with room between sentences. */
export function fitEventSegments(durations, seconds, sampleRate=44100, maximumTempo=1.75) {
  if(!durations.length||durations.some(d=>!Number.isFinite(d)||d<=0)||!Number.isFinite(seconds)||seconds<=0)throw Error('Invalid spoken segment duration');
  const gap=.12,tail=.18,available=seconds-gap*(durations.length-1)-tail;
  if(available<=0)throw Error('Scene has no room for complete narration');
  const nativeDuration=durations.reduce((s,d)=>s+d,0),tempo=Math.max(1,nativeDuration/available);
  if(tempo>maximumTempo)throw Error(`Narration requires ${tempo.toFixed(3)}×; regenerate audio instead of removing words`);
  const totalSamples=Math.round(seconds*sampleRate);let used=0;
  const samples=durations.map((duration,i)=>{
    const count=i===durations.length-1?totalSamples-used:Math.ceil((duration/tempo+gap)*sampleRate);
    if(count/sampleRate<duration/tempo+.02)throw Error('Segment would cut off speech');
    used+=count;return count;
  });
  return {nativeDuration,tempo,samples,totalSamples};
}
