import { OpenAIEmbeddings } from '@langchain/openai';
import { QdrantVectorStore } from '@langchain/qdrant';
import { QdrantClient } from '@qdrant/js-client-rest';
import { BaseRetriever } from '@langchain/core/retrievers';
import { sourceDocument } from './retrieval.mjs';
export const EMBEDDING_MODEL='text-embedding-3-small';
export const EMBEDDING_DIMENSIONS=1536;
export class RetrievalError extends Error { constructor(code){super(code);this.code=code;} }
export function configured(env){return !!(env.OPENAI_API_KEY&&env.QDRANT_URL);}
export async function collectionName(index){
  // LangChain uses content + nested metadata. Never serve legacy payloads as new.
  const content=JSON.stringify(['langchain-v1',EMBEDDING_MODEL,EMBEDDING_DIMENSIONS,index.chunks.map(c=>[c.id,c.documentId,c.title,c.section,c.text])]);
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(content));
  return 'northstar_lc_'+Array.from(new Uint8Array(hash)).map(n=>n.toString(16).padStart(2,'0')).join('').slice(0,24);
}
function validateTexts(texts){if(!texts.length||texts.some(t=>typeof t!=='string'||!t.trim()||t.length>24000))throw new RetrievalError('invalid_embedding_input');}
// Keep response validation, but delegate requests/batching to OpenAIEmbeddings.
export class PolicyEmbeddings extends OpenAIEmbeddings {
  async embeddingWithRetry(request){
    let result;try{result=await super.embeddingWithRetry(request)}catch{throw new RetrievalError('embedding_unavailable')}
    const count=Array.isArray(request.input)?request.input.length:1;
    if(!Array.isArray(result.data)||result.data.length!==count)throw new RetrievalError('invalid_embedding_response');
    const rows=[...result.data].sort((a,b)=>a.index-b.index);
    if(rows.some((row,i)=>row.index!==i||!Array.isArray(row.embedding)||row.embedding.length!==EMBEDDING_DIMENSIONS||row.embedding.some(v=>!Number.isFinite(v))))throw new RetrievalError('invalid_embedding_response');
    return {...result,data:rows};
  }
  async embedDocuments(texts){validateTexts(texts);return super.embedDocuments(texts);}
  async embedQuery(text){validateTexts([text]);return super.embedQuery(text);}
}
export function createEmbeddings(env,fetcher=fetch){
  if(!env.OPENAI_API_KEY)throw new RetrievalError('embedding_not_configured');
  return new PolicyEmbeddings({apiKey:env.OPENAI_API_KEY,model:EMBEDDING_MODEL,dimensions:EMBEDDING_DIMENSIONS,
    encodingFormat:'float',stripNewLines:false,batchSize:24,maxRetries:0,maxConcurrency:1,timeout:20000,
    configuration:{fetch:fetcher,fetchOptions:{redirect:'error'},dangerouslyAllowBrowser:false}});
}
export async function embed(texts,env,fetcher=fetch){return createEmbeddings(env,fetcher).embedDocuments(texts);}
function vectorUrl(env){
  let url;try{url=new URL(env.QDRANT_URL)}catch{throw new RetrievalError('invalid_vector_url')}
  const loopback=['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if((url.protocol!=='https:'&&!(loopback&&url.protocol==='http:'))||url.username||url.password||url.search||url.hash||!['','/'].includes(url.pathname))throw new RetrievalError('invalid_vector_url');
  return url.origin;
}
export function safeVectorError(error){
  if(error instanceof RetrievalError)return error;
  return new RetrievalError(error?.status===404?'index_missing':'vector_unavailable');
}
function validateCollection(info){
  const v=info?.config?.params?.vectors;
  if(v?.size!==EMBEDDING_DIMENSIONS||v?.distance!=='Cosine')throw new RetrievalError('index_incompatible');
}
class PolicyVectorStore extends QdrantVectorStore {
  threshold=0;
  // Upstream auto-creates missing collections on search. Serving is read-only:
  // only the explicit indexing command may create a collection.
  async ensureCollection(){try{validateCollection(await this.client.getCollection(this.collectionName))}catch(e){throw safeVectorError(e)}}
  async similaritySearchVectorWithScore(vector,k,filter){
    try{return (await super.similaritySearchVectorWithScore(vector,k,filter)).filter(([,score])=>Number.isFinite(score)&&score>=this.threshold)}catch(e){throw safeVectorError(e)}
  }
}
export async function createVectorStore(index,env,options={}){
  const url=vectorUrl(env);
  const store=new PolicyVectorStore(options.embeddings||createEmbeddings(env,options.fetcher),{
    url,apiKey:env.QDRANT_API_KEY||undefined,collectionName:await collectionName(index),
    client:options.client||new QdrantClient({url,apiKey:env.QDRANT_API_KEY||undefined,timeout:10000,checkCompatibility:false}),
    collectionConfig:{vectors:{size:EMBEDDING_DIMENSIONS,distance:'Cosine'}},
  });
  // The official Qdrant REST client uses a configurable request timeout.
  return store;
}
export async function checkCollection(index,env,options={}){
  const store=options.store||await createVectorStore(index,env,options);
  try{
    await store.ensureCollection();
    const result=await store.client.count(store.collectionName,{exact:true});
    if(result.count!==index.chunks.length)throw new RetrievalError('index_incomplete');
  }catch(e){throw safeVectorError(e)}
  return store.collectionName;
}
export class PolicySemanticRetriever extends BaseRetriever {
  lc_namespace=['northstar','retrievers','semantic'];
  constructor(index,documentId,env,options={}){super();Object.assign(this,{index,documentId,env,options});}
  async _getRelevantDocuments(question,runManager){
    const store=await createVectorStore(this.index,this.env,this.options);
    await checkCollection(this.index,this.env,{store});
    const raw=this.env.SEMANTIC_SCORE_THRESHOLD;
    const threshold=(raw===undefined||raw==='') ? 0.35 : Number(raw);
    if(!Number.isFinite(threshold)||threshold<0||threshold>1)throw new RetrievalError('invalid_score_threshold');
    store.threshold=threshold;
    const filter=this.documentId==='all'?undefined:{must:[{key:'metadata.documentId',match:{value:this.documentId}}]};
    const docs=await store.asRetriever({k:12,filter}).invoke(question,{callbacks:runManager?.getChild()});
    const canonical=new Map(this.index.chunks.map(c=>[c.id,c]));const seen=new Set();
    return docs.flatMap(d=>{
      const c=canonical.get(d.metadata.chunkId);
      if(!c||seen.has(c.id)||(this.documentId!=='all'&&c.documentId!==this.documentId))return [];
      seen.add(c.id);return [sourceDocument(c)];
    });
  }
}
export async function semanticSearch(index,question,documentId,env,options={}){
  return (await new PolicySemanticRetriever(index,documentId,env,options).invoke(question)).map(d=>d.metadata);
}
export async function indexDocuments(index,env,options={}){
  const store=await createVectorStore(index,env,options);
  try{await checkCollection(index,env,{store});return {collection:store.collectionName,count:index.chunks.length,reused:true};}
  catch(e){
    if(e.code==='index_missing')await store.client.createCollection(store.collectionName,{vectors:{size:EMBEDDING_DIMENSIONS,distance:'Cosine'}});
    else if(e.code!=='index_incomplete')throw e;
  }
  await store.client.createPayloadIndex(store.collectionName,{field_name:'metadata.documentId',field_schema:'keyword',wait:true});
  for(let start=0;start<index.chunks.length;start+=24){
    const docs=index.chunks.slice(start,start+24).map(sourceDocument);
    // Stable numeric IDs are accepted by Qdrant; Documents' source IDs stay in metadata.
    for(const d of docs)delete d.id;
    await store.addDocuments(docs,{ids:docs.map((_,i)=>start+i+1)});
    options.onProgress?.(Math.min(start+24,index.chunks.length),index.chunks.length);
  }
  await checkCollection(index,env,{store});
  return {collection:store.collectionName,count:index.chunks.length,reused:false};
}
