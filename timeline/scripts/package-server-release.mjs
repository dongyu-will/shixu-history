// Build an explicit public allowlist; never package reference voices, models or old audio.
import { existsSync } from 'node:fs';
import { readFile, writeFile, mkdir, copyFile, readdir } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const project=resolve(fileURLToPath(new URL('..',import.meta.url)));
const dist=resolve(project,'dist/client'),manifest=JSON.parse(await readFile(resolve(dist,'audio/timeline-zh.json'),'utf8'));
const prcManifestPath=resolve(dist,'audio/timeline-prc-zh.json');
const prcManifest=existsSync(prcManifestPath)?JSON.parse(await readFile(prcManifestPath,'utf8')):null;
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const audio=manifest.audio.replace(/^\//,'');
const objects=[audio,...(prcManifest?[prcManifest.audio.replace(/^\//,'')]:[]),'audio/road-90.m4a',...(existsSync(resolve(dist,'sources/history.pdf'))?['sources/history.pdf']:[])];
const files=['index.html','theme-init.js','data/history.json','data/history-prc.json','data/china-d3.json','data/exam-questions.json','audio/timeline-zh.json',manifest.captions.slice(1),...(prcManifest?['audio/timeline-prc-zh.json',prcManifest.captions.slice(1)]:[])];
for(const file of await readdir(resolve(dist,'assets')))files.push(`assets/${file}`);
const inputs={};
for(const file of files)inputs[`site/${file}`]=await readFile(resolve(dist,file));
for(const file of objects)inputs[`objects/${file}`]=await readFile(resolve(dist,file));
const publicAudio=objects.filter(file=>file.endsWith('.m4a')).map(file=>{
 const bytes=inputs[`objects/${file}`],hash=sha(bytes),name=file.split('/').at(-1);
 const copy=`public-audio/${hash}/${name}`;inputs[copy]=bytes;
 return {file:copy,sha256:hash,size:bytes.length};
});
for(const file of ['server.py','nginx.conf','shixu-site.service','install.py'])inputs[`deploy/${file}`]=await readFile(resolve(project,'deploy',file));
const hashes=Object.fromEntries(Object.keys(inputs).sort().map(f=>[f,sha(inputs[f])]));
const id=sha(JSON.stringify(hashes)).slice(0,20);
const output=resolve(project,'../output/server-releases',id);await mkdir(output,{recursive:true});
for(const [file,bytes] of Object.entries(inputs)){await mkdir(dirname(resolve(output,file)),{recursive:true});await writeFile(resolve(output,file),bytes);}
const release={version:1,id,createdAt:new Date().toISOString(),host:process.env.SHIXU_DEPLOY_HOST||'app-server',url:process.env.SHIXU_SITE_URL||'https://example.com/',duration:720,events:100,cues:manifest.cues.length,scriptHash:manifest.scriptHash,files:hashes,publicAudio,
 objects:objects.map(path=>({path:`/${path}`,file:`objects/${path}`,sha256:hashes[`objects/${path}`],size:inputs[`objects/${path}`].length,contentType:path.endsWith('.pdf')?'application/pdf':'audio/mp4'}))};
await writeFile(resolve(output,'release.json'),JSON.stringify(release,null,2)+'\n');
console.log(JSON.stringify({id,directory:output,staticBytes:files.reduce((s,f)=>s+inputs[`site/${f}`].length,0),objects:release.objects.map(({path,size})=>({path,size}))}));
