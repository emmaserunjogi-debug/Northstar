import {readFile} from 'node:fs/promises';
import {parseEnv} from 'node:util';
import {createIndex} from '../lib/retrieval.mjs';
import {indexDocuments,RetrievalError} from '../lib/vector-store.mjs';
let local={};try{local=parseEnv(await readFile('.dev.vars','utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
const env={...local,...process.env};
try{
 if(!env.OPENAI_API_KEY||!env.QDRANT_URL)throw new RetrievalError('Set OPENAI_API_KEY and QDRANT_URL in .dev.vars or the environment first.');
 const index=createIndex(JSON.parse(await readFile('data/corpus.json','utf8')));
 const result=await indexDocuments(index,env,{onProgress:(n,total)=>console.log(`Indexed ${n}/${total} passages with LangChain.`)});
 console.log(`${result.reused?'Reused':'Ready'}: ${result.collection}, ${result.count} passages. Legacy collections are retained.`);
}catch(e){console.error(e instanceof RetrievalError?e.code:'Vector indexing failed. Check service availability and configuration.');process.exitCode=1}
