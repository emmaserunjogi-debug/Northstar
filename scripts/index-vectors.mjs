import { readFile } from 'node:fs/promises';
import { parseEnv } from 'node:util';
import { createIndex } from '../lib/retrieval.mjs';
import { collectionName, embed, qdrant, checkCollection, EMBEDDING_DIMENSIONS, RetrievalError } from '../lib/vector-store.mjs';
let local={};
try { local=parseEnv(await readFile('.dev.vars','utf8')); } catch(e) { if(e.code!=='ENOENT')throw e; }
const env={...local,...process.env};
try {
  if(!env.OPENAI_API_KEY || !env.QDRANT_URL) throw new RetrievalError('Set OPENAI_API_KEY and QDRANT_URL in .dev.vars or the environment first.');
  const index=createIndex(JSON.parse(await readFile('data/corpus.json','utf8')));
  const name=await collectionName(index);
  // Verify the destination before making any paid embedding calls.
  try {
    const info=await qdrant(env,`/collections/${name}`);
    if(info?.config?.params?.vectors?.size!==EMBEDDING_DIMENSIONS || info?.config?.params?.vectors?.distance!=='Cosine')throw new RetrievalError('index_incompatible');
    await checkCollection(index,env);
    console.log(`Vector index is already complete: ${index.chunks.length} passages in ${name}.`);
    process.exit(0);
  } catch(e) {
    if(e.code==='index_missing') await qdrant(env,`/collections/${name}`,'PUT',{vectors:{size:EMBEDDING_DIMENSIONS,distance:'Cosine'}});
    else if(e.code!=='index_incomplete')throw e;
  }
  await qdrant(env,`/collections/${name}/index?wait=true`,'PUT',{field_name:'documentId',field_schema:'keyword'});
  for(let start=0;start<index.chunks.length;start+=24){
    const chunks=index.chunks.slice(start,start+24);
    const vectors=await embed(chunks.map(c=>`${c.title}\n${c.section}\n${c.text}`),env);
    const points=chunks.map((c,i)=>({id:start+i+1,vector:vectors[i],payload:{chunkId:c.id,documentId:c.documentId}}));
    await qdrant(env,`/collections/${name}/points?wait=true`,'PUT',{points});
    console.log(`Indexed ${Math.min(start+24,index.chunks.length)}/${index.chunks.length} passages.`);
  }
  await checkCollection(index,env);
  console.log(`Ready: ${name}. Old corpus collections are retained; no data was deleted.`);
} catch(e) { console.error(e instanceof RetrievalError?e.message:'Vector indexing failed. Check service availability and configuration.'); process.exitCode=1; }
