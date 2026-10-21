import corpus from '@/data/corpus.json';
import {createIndex,retrieve} from '@/lib/retrieval.mjs';
import {generateAnswer} from '@/lib/answer.mjs';
import {getRuntime} from '@/lib/runtime';
export const dynamic='force-dynamic';
const index=createIndex(corpus);
const json=(body:unknown,status=200)=>Response.json(body,{status,headers:{'Cache-Control':'private, no-store'}});
export async function POST(req:Request){
 if(req.headers.get('origin')!==new URL(req.url).origin)return json({error:'Request origin is not allowed.'},403);
 if(!req.headers.get('content-type')?.includes('application/json'))return json({error:'JSON required.'},415);
 let body;try{const text=await req.text();if(text.length>12000)return json({error:'Request too large.'},413);body=JSON.parse(text)}catch{return json({error:'Invalid request.'},400)}
 if(!body || typeof body!=='object'||typeof body.question!=='string'||!body.question.trim()||body.question.length>1500)return json({error:'Enter a question between 1 and 1,500 characters.'},400);
 const scope=body.documentId||'all';
 if(scope!=='all'&&!corpus.some(d=>d.id===scope))return json({error:'Unknown policy.'},400);
 const sources=retrieve(index,body.question,scope);
 try{return json(await generateAnswer(body.question,sources,getRuntime()))}catch(e){return json({error:e instanceof Error?e.message:'Unable to generate an answer.',sources},502)}
}
