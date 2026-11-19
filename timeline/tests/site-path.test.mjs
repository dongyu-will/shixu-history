import test from 'node:test';
import assert from 'node:assert/strict';
import {sitePath} from '../src/site-path.js';
test('Resources and PDF fragments stay under root or the published site prefix',()=>{
 for(const base of ['https://example.com:8443/','https://example.com/shixu/?event=e-29']){
  for(const path of ['/audio/timeline-zh.json','/audio/voice.m4a','/data/history.json','/sources/history.pdf#page=61']){
   const actual=new URL(sitePath(path),base);
   const prefix=new URL(base).pathname;
   assert.equal(actual.pathname,prefix+new URL(path,'https://example.invalid').pathname.slice(1));
   assert.equal(actual.origin,new URL(base).origin);
   assert.equal(actual.hash,new URL(path,'https://example.invalid').hash);
  }
 }
 assert.equal(sitePath('https://www.12371.cn/article'),'https://www.12371.cn/article');
});
