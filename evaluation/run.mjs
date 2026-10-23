import {readFileSync,writeFileSync} from 'node:fs';
import {parseEnv} from 'node:util';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {createIndex} from '../lib/retrieval.mjs';
import {retrieveHybrid} from '../lib/hybrid-retrieval.mjs';
import {generateAnswer} from '../lib/answer.mjs';
import {generationConfig} from '../lib/generation-config.mjs';
const live=process.argv.includes('--live');
const env=live?{...parseEnv(readFileSync(new URL('../.dev.vars',import.meta.url),'utf8')),...process.env}:{};
const corpusText=readFileSync(new URL('../data/corpus.json',import.meta.url),'utf8');
const index=createIndex(JSON.parse(corpusText));
const allCases=JSON.parse(readFileSync(new URL('./questions.json',import.meta.url),'utf8'));
const idsAt=process.argv.indexOf('--ids');
const requestedIds=idsAt<0?null:process.argv[idsAt+1]?.split(',');
if(idsAt>=0&&(!requestedIds?.length||requestedIds.some(id=>!allCases.some(q=>q.id===id))))throw Error('Unknown or missing evaluation IDs');
const cases=requestedIds?allCases.filter(q=>requestedIds.includes(q.id)):allCases;
const config=generationConfig(env);
const result={startedAt:new Date().toISOString(),timezone:'Africa/Kampala',live,provider:config.provider,model:config.model,commit:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),corpusSha256:createHash('sha256').update(corpusText).digest('hex'),method:'Sequential local application pipeline; actual retrieval and generation functions, not HTTP/UI latency. No retries or warmup. Offline mode explicitly disables external providers.',results:[]};
const outputAt=process.argv.indexOf('--output');
const filename=outputAt<0?(live?'live-results.json':'offline-results.json'):process.argv[outputAt+1];
if(!filename||! /^[a-zA-Z0-9_-]+\.json$/.test(filename))throw Error('Output must be a JSON filename in evaluation/');
const path=new URL('./'+filename,import.meta.url);
for(const q of cases){
 const start=performance.now();let retrievalMs,generatedStart,usage,httpStatus,providerStatus,rawAnswer;
 try{
  const {sources,retrieval,corpusVersion}=await retrieveHybrid(index,q.question,q.scope,env);retrievalMs=performance.now()-start;generatedStart=performance.now();
  const answer=await generateAnswer(q.question,sources,env,async(...args)=>{
   const r=await fetch(...args);httpStatus=r.status;
   if(r.ok){const d=await r.clone().json();usage=d.usage;providerStatus=d.status;rawAnswer=(d.output||[]).flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('\n');}
   return r;
  });
  result.results.push({id:q.id,question:q.question,...answer,retrieval,corpusVersion,generatedAt:new Date().toISOString(),retrievedSources:sources,retrievalMs,generationMs:performance.now()-generatedStart,totalMs:performance.now()-start,httpStatus,providerStatus,usage,rawAnswer});
 }catch(e){result.results.push({id:q.id,question:q.question,error:e.message,retrievalMs,totalMs:performance.now()-start,httpStatus});}
 writeFileSync(path,JSON.stringify(result,null,2)+'\n');
 const last=result.results.at(-1);console.log(`${q.id}: ${last.mode||'error'}, ${Math.round(last.totalMs)} ms`);
}
result.completedAt=new Date().toISOString();writeFileSync(path,JSON.stringify(result,null,2)+'\n');
