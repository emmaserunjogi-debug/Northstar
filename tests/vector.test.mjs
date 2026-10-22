import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BaseRetriever} from '@langchain/core/retrievers';
import {OpenAIEmbeddings} from '@langchain/openai';
import {QdrantVectorStore} from '@langchain/qdrant';
import {createIndex,PolicyKeywordRetriever} from '../lib/retrieval.mjs';
import {embed,createEmbeddings,createVectorStore,collectionName,checkCollection,semanticSearch,indexDocuments,EMBEDDING_DIMENSIONS} from '../lib/vector-store.mjs';
import {retrieveHybrid,PolicyHybridRetriever} from '../lib/hybrid-retrieval.mjs';
const index=createIndex(JSON.parse(fs.readFileSync(new URL('../data/corpus.json',import.meta.url))));
const env={OPENAI_API_KEY:'test-only',QDRANT_URL:'http://localhost:6333'};
const vector=Array.from({length:EMBEDDING_DIMENSIONS},(_,i)=>i===0?1:0);
function client(points=[]){return {
 getCollection:async()=>({config:{params:{vectors:{size:1536,distance:'Cosine'}}}}),
 count:async()=>({count:index.chunks.length}),
 query:async()=>({points}),
};}
const embeddings={embedQuery:async()=>vector,embedDocuments:async texts=>texts.map(()=>vector)};
function point(c,score=.8){return {id:1,score,payload:{content:'untrusted remote text',metadata:{chunkId:c.id,documentId:c.documentId}}};}
test('production components use LangChain classes',async()=>{
 assert.ok(createEmbeddings(env) instanceof OpenAIEmbeddings);
 assert.ok(await createVectorStore(index,env) instanceof QdrantVectorStore);
 assert.ok(new PolicyKeywordRetriever(index) instanceof BaseRetriever);
 assert.ok(new PolicyHybridRetriever(index,'all',env) instanceof BaseRetriever);
});
test('LangChain embeddings set model and dimensions and restore response order',async()=>{
 const out=await embed(['a','b'],env,async(url,options)=>{
  const body=JSON.parse(options.body);assert.equal(body.model,'text-embedding-3-small');assert.equal(body.dimensions,1536);
  return Response.json({data:[{index:1,embedding:vector.map(v=>v*2)},{index:0,embedding:vector}]});
 });assert.equal(out[0][0],1);assert.equal(out[1][0],2);
});
test('invalid embedding dimensions are rejected',async()=>{
 await assert.rejects(()=>embed(['x'],env,async()=>Response.json({data:[{index:0,embedding:[1]}]})),/invalid_embedding_response/);
});
test('fingerprint includes new schema and changes with corpus',async()=>{
 const name=await collectionName(index);assert.match(name,/^northstar_lc_/);assert.equal(name,await collectionName(index));
 const changed=structuredClone(index);changed.chunks[0].text+='changed';assert.notEqual(name,await collectionName(changed));
});
test('incomplete index fails before query embedding',async()=>{
 const c=client();c.count=async()=>({count:0});let calls=0;
 await assert.rejects(()=>semanticSearch(index,'leave','all',env,{client:c,embeddings:{embedQuery:async()=>{calls++;return vector}}}),/index_incomplete/);assert.equal(calls,0);
});
test('incorrect dimensions rejected',async()=>{
 const c=client();c.getCollection=async()=>({config:{params:{vectors:{size:3,distance:'Cosine'}}}});
 await assert.rejects(()=>checkCollection(index,env,{client:c,embeddings}),/index_incompatible/);
});
test('LangChain vector retriever applies nested scope and canonical source validation',async()=>{
 const a=index.chunks.find(c=>c.documentId==='PPL-03'),b=index.chunks.find(c=>c.documentId==='FIN-07');
 const c=client();c.query=async(name,params)=>{assert.deepEqual(params.filter,{must:[{key:'metadata.documentId',match:{value:'PPL-03'}}]});return {points:[point(a),point(b),point({id:'obsolete'}),point(a)]}};
 const hits=await semanticSearch(index,'leave','PPL-03',env,{client:c,embeddings});assert.equal(hits.length,1);assert.equal(hits[0].text,a.text);
});
test('similarity cutoff rejects low-score evidence',async()=>{
 const hits=await semanticSearch(index,'galaxies','all',env,{client:client([point(index.chunks[0],.1)]),embeddings});assert.deepEqual(hits,[]);
});
test('missing config does not invoke semantic dependencies',async()=>{
 const result=await retrieveHybrid(index,'request leave','all',{}, {client:{getCollection:()=>{throw Error('unexpected')}}});assert.equal(result.retrieval.reason,'not_configured');assert.ok(result.sources.length);
});
test('semantic outage and empty results preserve honest fallback status',async()=>{
 const c=client();c.getCollection=async()=>{throw Error('PRIVATE_PROVIDER_ERROR_98')};
 for(const q of ['request leave','xyzzy']){const r=await retrieveHybrid(index,q,'all',env,{client:c,embeddings});assert.equal(r.retrieval.mode,'keyword');assert.equal(r.retrieval.reason,'vector_unavailable');assert.ok(!JSON.stringify(r).includes('PRIVATE_PROVIDER_ERROR_98'))}
});
test('ensemble merges semantic-only hits and renumbers citations',async()=>{
 const r=await retrieveHybrid(index,'xyzzy','all',env,{client:client([point(index.chunks[0])]),embeddings});assert.equal(r.retrieval.mode,'hybrid');assert.equal(r.sources[0].id,index.chunks[0].id);assert.equal(r.sources[0].citation,1);
});
test('ensemble deduplicates overlap while preserving distinct source IDs',async()=>{
 const lexical=await new PolicyKeywordRetriever(index).invoke('request leave');
 const c=client(lexical.slice(0,2).map(d=>point(d.metadata)));
 const r=await retrieveHybrid(index,'request leave','all',env,{client:c,embeddings});assert.equal(new Set(r.sources.map(s=>s.id)).size,r.sources.length);assert.equal(r.sources[0].id,lexical[0].metadata.id);
 assert.deepEqual(r.sources.map(s=>s.citation),r.sources.map((_,i)=>i+1));
});
test('invalid vector URLs fail before client calls',async()=>{
 for(const url of ['http://example.com','https://user:pass@example.com','https://example.com?key=x'])await assert.rejects(()=>createVectorStore(index,{...env,QDRANT_URL:url}),/invalid_vector_url/);
});
test('upstream errors do not expose response bodies',async()=>{
 await assert.rejects(()=>embed(['leave'],env,async()=>new Response('sensitive',{status:401})),/embedding_unavailable/);
});
test('complete index is reused without embedding or writes',async()=>{
 const r=await indexDocuments(index,env,{client:client(),embeddings:{embedDocuments:()=>{throw Error('must not embed')}}});assert.equal(r.reused,true);
});
test('read path never creates a missing collection',async()=>{
 const c=client();let writes=0;c.getCollection=async()=>{throw {status:404}};c.createCollection=async()=>{writes++};
 await assert.rejects(()=>semanticSearch(index,'leave','all',env,{client:c,embeddings}),/index_missing/);assert.equal(writes,0);
});
