import { useCallback, useEffect, useRef, useState } from 'react';
import { savedPlaybackPreference } from './narration.js';
import { sitePath } from './site-path.js';

/** One local audio track per volume, sampled by the map clock; no browser speech queues. */
export function useNarration({clock,playing,rate,onNotice,manifestUrl='/audio/timeline-zh.json'}) {
  const audioRef=useRef(null),loadAbort=useRef(null);
  const [manifest,setManifest]=useState(null),[voice,setVoice]=useState(()=>savedPlaybackPreference('shixu-voice'));
  const [captionsVisible,setCaptionsVisible]=useState(()=>savedPlaybackPreference('shixu-captions'));
  const [loading,setLoading]=useState(Boolean(manifestUrl)),[waiting,setWaiting]=useState(false);
  const hasAudioTrack = Boolean(manifestUrl);
  const loadManifest=useCallback(async()=>{
    loadAbort.current?.abort();
    if (!manifestUrl) {
      setManifest(null);
      setLoading(false);
      setWaiting(false);
      if (audioRef.current) audioRef.current.pause();
      return;
    }
    const abort=new AbortController();loadAbort.current=abort;setLoading(true);
    try {
      const response=await fetch(sitePath(manifestUrl),{signal:abort.signal});
      if(!response.ok)throw Error('配音资料暂不可用');
      const next=await response.json();
      if(next.version!==1||!next.audio||!next.cues?.length)throw Error('配音资料不完整');
      const audioURL=new URL(sitePath(next.audio),window.location.href);
      // Do not reuse a cached pre-fix response that advertised no seekable range.
      audioURL.searchParams.set('delivery','static-v2');
      setManifest({...next,audio:audioURL.href,captions:sitePath(next.captions)});
    }catch(error){if(error.name!=='AbortError'){setVoice(false);onNotice('配音暂未载入，字幕和地图仍可播放。点击配音按钮可重试。');}}
    finally{if(!abort.signal.aborted)setLoading(false);}
  },[manifestUrl,onNotice]);
  useEffect(()=>{loadManifest();return()=>loadAbort.current?.abort();},[loadManifest]);
  useEffect(()=>{try{localStorage.setItem('shixu-voice',String(voice));localStorage.setItem('shixu-captions',String(captionsVisible));}catch{}},[voice,captionsVisible]);
  const fail=useCallback(()=>{setVoice(false);setWaiting(false);onNotice('配音播放失败，已保留字幕。点击配音按钮可重试。');},[onNotice]);
  useEffect(()=>{
    const audio=audioRef.current;if(!audio||!manifest||!hasAudioTrack)return;
    audio.playbackRate=rate;audio.preservesPitch=true;
    if(playing&&voice){
      audio.currentTime=clock.current.time;
      audio.play().catch(error=>{if(error.name!=='AbortError')fail();});
    }else{audio.pause();setWaiting(false);}
    return()=>audio.pause();
  },[playing,voice,rate,manifest,hasAudioTrack,clock,fail]);
  const syncSeek=useCallback(time=>{if(audioRef.current&&manifest&&hasAudioTrack)audioRef.current.currentTime=time;},[manifest,hasAudioTrack]);
  const toggleVoice=()=>{
    if (!hasAudioTrack) {
      onNotice('新中国史下篇当前为字幕与拟音模式，5 分钟克隆配音将于文案定稿后接入。');
      return;
    }
    if(!voice){onNotice('');if(!manifest)loadManifest();else if(audioRef.current?.error)audioRef.current.load();}
    setVoice(v=>!v);
  };
  return {audioRef,manifest,voice: hasAudioTrack ? voice : false,voicePreference:voice,hasAudioTrack,captionsVisible,loading,waiting,fail,syncSeek,toggleVoice,toggleCaptions:()=>setCaptionsVisible(v=>!v),setWaiting};
}
