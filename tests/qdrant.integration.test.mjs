import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {QdrantClient} from '@qdrant/js-client-rest';
import {createIndex} from '../lib/retrieval.mjs';
import {collectionName,indexDocuments,semanticSearch,EMBEDDING_DIMENSIONS} from '../lib/vector-store.mjs';
test('LangChain indexes and retrieves through real Qdrant; repeat indexing is idempotent',{skip:!process.env.QDRANT_TEST_URL},async()=>{
 const env={QDRANT_URL:process.env.QDRANT_TEST_URL,OPENAI_API_KEY:'test-only'};
 const title='Temporary integration '+randomUUID();
 const index=createIndex([{id:'TEST-A',title,sections:[{id:'s1',heading:'Test',text:'First isolated test passage.'}]},{id:'TEST-B',title,sections:[{id:'s2',heading:'Test',text:'Second isolated test passage.'}]}]);
 const name=await collectionName(index);
 const client=new QdrantClient({url:env.QDRANT_URL,checkCompatibility:false});
 const vector=Array.from({length:EMBEDDING_DIMENSIONS},(_,i)=>i===0?1:0);
 let embeddingCalls=0;
 const embeddings={embedDocuments:async texts=>{embeddingCalls++;return texts.map(()=>vector)},embedQuery:async()=>vector};
 try{
  const first=await indexDocuments(index,env,{client,embeddings});assert.equal(first.reused,false);
  const again=await indexDocuments(index,env,{client,embeddings});assert.equal(again.reused,true);assert.equal(embeddingCalls,1);
  const rows=await client.scroll(name,{with_payload:true});assert.equal(rows.points.length,2);assert.ok(rows.points[0].payload.metadata.chunkId);assert.ok(rows.points[0].payload.content);
  const hits=await semanticSearch(index,'sample','TEST-A',env,{client,embeddings});assert.equal(hits.length,1);assert.equal(hits[0].text,'First isolated test passage.');
 }finally{await client.deleteCollection(name)}
});
