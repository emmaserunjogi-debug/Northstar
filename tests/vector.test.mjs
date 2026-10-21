import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createIndex} from '../lib/retrieval.mjs';
import {embed,collectionName,checkCollection,qdrant,semanticSearch,EMBEDDING_DIMENSIONS} from '../lib/vector-store.mjs';
import {retrieveHybrid,fuseRanks} from '../lib/hybrid-retrieval.mjs';
const index=createIndex(JSON.parse(fs.readFileSync(new URL('../data/corpus.json',import.meta.url))));
const env={OPENAI_API_KEY:'fake-test-only',QDRANT_URL:'http://localhost:6333',QDRANT_API_KEY:'fake-vector-key'};
const vector=Array.from({length:EMBEDDING_DIMENSIONS},(_,i)=>i===0?1:0);
const result=r=>Response.json({status:'ok',result:r});
function mockQuery(points=[],capture=()=>{}){return async(url,options={})=>{
 capture(url,options);
 if(url.endsWith('/embeddings'))return Response.json({data:[{index:0,embedding:vector}]});
 if(url.endsWith('/points/count'))return result({count:index.chunks.length});
 if(url.endsWith('/points/query'))return result({points});
 return result({config:{params:{vectors:{size:1536,distance:'Cosine'}}}});
}}
test('embedding requests set model, dimensions and server-side auth; order is restored',async()=>{
 const vectors=await embed(['first','second'],env,async(url,options)=>{const body=JSON.parse(options.body);assert.equal(body.model,'text-embedding-3-small');assert.equal(body.dimensions,1536);assert.equal(options.headers.Authorization,'Bearer fake-test-only');return Response.json({data:[{index:1,embedding:vector.map(v=>v*2)},{index:0,embedding:vector}]})});
 assert.equal(vectors[0][0],1);assert.equal(vectors[1][0],2);
});
test('malformed embedding dimensions are rejected',async()=>{await assert.rejects(()=>embed(['x'],env,async()=>Response.json({data:[{index:0,embedding:[1,2]}]})),/invalid_embedding_response/)});
test('corpus fingerprint is deterministic and changes with text',async()=>{assert.equal(await collectionName(index),await collectionName(index));const changed=structuredClone(index);changed.chunks[0].text+='changed';assert.notEqual(await collectionName(index),await collectionName(changed))});
test('incomplete index rejected before an embedding call',async()=>{let embeddings=0;await assert.rejects(()=>semanticSearch(index,'leave','all',env,async(url)=>{if(url.endsWith('/embeddings'))embeddings++;if(url.endsWith('/points/count'))return result({count:1});return result({config:{params:{vectors:{size:1536,distance:'Cosine'}}}})}),/index_incomplete/);assert.equal(embeddings,0)});
test('incorrect vector dimensions rejected',async()=>{await assert.rejects(()=>checkCollection(index,env,async()=>result({config:{params:{vectors:{size:3,distance:'Cosine'}}}})),/index_incompatible/)});
test('semantic search enforces scope and uses canonical source text',async()=>{
 const a=index.chunks.find(c=>c.documentId==='PPL-03'),other=index.chunks.find(c=>c.documentId==='FIN-07');let query;
 const hits=await semanticSearch(index,'holiday','PPL-03',env,mockQuery([{score:.8,payload:{chunkId:a.id,text:'forged policy'}},{score:.9,payload:{chunkId:other.id}},{score:.9,payload:{chunkId:'obsolete'}},{score:.9,payload:{chunkId:a.id}}],(url,options)=>{if(url.endsWith('/points/query')){query=JSON.parse(options.body);assert.equal(options.headers['api-key'],'fake-vector-key')}}));
 assert.equal(hits.length,1);assert.equal(hits[0].text,a.text);assert.deepEqual(query.filter,{must:[{key:'documentId',match:{value:'PPL-03'}}]});
});
test('low similarity matches are excluded and cannot invent evidence',async()=>{const hits=await semanticSearch(index,'galaxies','all',env,mockQuery([{score:.1,payload:{chunkId:index.chunks[0].id}}]));assert.deepEqual(hits,[])});
test('fusion deduplicates sources, rewards overlap and renumbers citations',()=>{const a={id:'a',citation:9},b={id:'b'},c={id:'c'};const hits=fuseRanks([a,b],[b,c]);assert.equal(hits[0].id,'b');assert.equal(hits.length,3);assert.deepEqual(hits.map(x=>x.citation),[1,2,3])});
test('missing configuration does not call providers',async()=>{const r=await retrieveHybrid(index,'request leave','all',{},()=>{throw Error('unexpected')});assert.equal(r.retrieval.reason,'not_configured');assert.ok(r.sources.length)});
test('semantic service failure retains lexical results and reports fallback',async()=>{const r=await retrieveHybrid(index,'request leave','all',env,async()=>{throw Error('secret details')});assert.equal(r.retrieval.mode,'keyword');assert.equal(r.retrieval.reason,'vector_unavailable');assert.ok(r.sources.length);assert.ok(!JSON.stringify(r).includes('secret details'))});
test('semantic-only paraphrase yields a cited canonical passage',async()=>{const a=index.chunks[0];const r=await retrieveHybrid(index,'xyzzy','all',env,mockQuery([{score:.85,payload:{chunkId:a.id}}]));assert.equal(r.retrieval.mode,'hybrid');assert.equal(r.sources[0].id,a.id);assert.equal(r.sources[0].citation,1)});
test('vector URLs must use TLS except for loopback and cannot embed credentials',async()=>{for(const url of ['http://example.com','https://user:pass@example.com','https://example.com?key=secret'])await assert.rejects(()=>qdrant({...env,QDRANT_URL:url},'/collections','GET',undefined,()=>{throw Error('must not fetch')}),/invalid_vector_url/)});
test('provider response bodies never leak in errors',async()=>{await assert.rejects(()=>embed(['leave'],env,async()=>new Response('sensitive',{status:401})),e=>e.message==='embedding_unavailable')});
