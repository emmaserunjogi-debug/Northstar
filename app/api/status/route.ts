import {indexVersion} from '@/lib/policy-version.mjs';
import {generationConfig} from '@/lib/generation-config.mjs';
import {getRuntime} from '@/lib/runtime';
import {configured,checkCollection,EMBEDDING_MODEL} from '@/lib/vector-store.mjs';
import {createIndex} from '@/lib/retrieval.mjs';
import corpus from '@/data/corpus.json';
export const dynamic='force-dynamic';
const index=createIndex(corpus);
export async function GET(){
 const env=getRuntime();
 const generation=generationConfig(env);
 const semantic={configured:configured(env),ready:false,reason:'not_configured' as string|null,model:EMBEDDING_MODEL,database:'Qdrant'};
 if(semantic.configured){try{await checkCollection(index,env);semantic.ready=true;semantic.reason=null}catch{semantic.reason='index_unavailable'}}
 return Response.json({corpusVersion:await indexVersion(index),generation:!!generation.key,provider:generation.provider,model:generation.model,semantic},{headers:{'Cache-Control':'private, no-store'}});
}
