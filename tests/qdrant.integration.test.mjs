// Opt-in: actual Qdrant storage/query, deterministic vectors (not a real model test).
import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createIndex} from '../lib/retrieval.mjs';
import {collectionName,qdrant,checkCollection,semanticSearch,EMBEDDING_DIMENSIONS} from '../lib/vector-store.mjs';
test('Qdrant creates, persists, filters and queries vectors over HTTP',{skip:!process.env.QDRANT_TEST_URL},async()=>{
 const env={QDRANT_URL:process.env.QDRANT_TEST_URL,OPENAI_API_KEY:'test-only'};
 const title='Temporary integration '+randomUUID();
 const index=createIndex([{id:'TEST-A',title,sections:[{id:'s1',heading:'Test',text:'First isolated test passage.'}]},{id:'TEST-B',title,sections:[{id:'s2',heading:'Other',text:'Second isolated test passage.'}]}]);
 const name=await collectionName(index);
 const vector=Array.from({length:EMBEDDING_DIMENSIONS},(_,i)=>i===0?1:0);
 let created=false;
 try{
  await qdrant(env,`/collections/${name}`,'PUT',{vectors:{size:EMBEDDING_DIMENSIONS,distance:'Cosine'}});created=true;
  await assert.rejects(()=>checkCollection(index,env),/index_incomplete/);
  await qdrant(env,`/collections/${name}/points?wait=true`,'PUT',{points:index.chunks.map((c,i)=>({id:i+1,vector,payload:{chunkId:c.id,documentId:c.documentId}}))});
  assert.equal(await checkCollection(index,env),name);
  const hits=await semanticSearch(index,'sample','TEST-A',env,(url,options)=>url.endsWith('/embeddings')?Promise.resolve(Response.json({data:[{index:0,embedding:vector}]})):fetch(url,options));
  assert.equal(hits.length,1);assert.equal(hits[0].documentId,'TEST-A');assert.equal(hits[0].text,'First isolated test passage.');
 }finally{if(created)await qdrant(env,`/collections/${name}`,'DELETE')}
});
