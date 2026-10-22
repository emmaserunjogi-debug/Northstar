import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createIndex} from '../lib/retrieval.mjs';
import {retrieveHybrid} from '../lib/hybrid-retrieval.mjs';
import {subquestions} from '../lib/evidence-selection.mjs';
import {generateAnswer,POLICY_REFUSAL} from '../lib/answer.mjs';
const index=createIndex(JSON.parse(fs.readFileSync(new URL('../data/corpus.json',import.meta.url))));
const cases=JSON.parse(fs.readFileSync(new URL('../evaluation/questions.json',import.meta.url)));
const source=[{citation:1,text:'Report loss immediately. Do not wipe the device.'}];
const response=text=>async()=>Response.json({status:'completed',output:[{content:[{type:'output_text',text}]}]});
test('Q18/Q20 refusal variants normalize without allowing additional text',async()=>{
 for(const text of [POLICY_REFUSAL+'.',' I CAN ONLY ANSWER ABOUT OUR POLICIES! ','i can only\nanswer about our policies?']){
  const r=await generateAnswer('unknown',source,{XAI_API_KEY:'test'},response(text));assert.equal(r.mode,'no_evidence');assert.equal(r.answer,POLICY_REFUSAL);assert.deepEqual(r.sources,[]);
 }
 for(const text of [POLICY_REFUSAL+'. Paris is the capital.',POLICY_REFUSAL+' [99]',POLICY_REFUSAL+'...']){
  const r=await generateAnswer('unknown',source,{XAI_API_KEY:'test'},response(text));assert.equal(r.mode,'retrieval');
 }
});
test('Q10 uncited closing instructions fall back, cited instructions are accepted',async()=>{
 for(const [text,mode] of [['Report loss immediately. [1]\n\nNext: do not wipe the device.','retrieval'],['Report loss immediately. [1]\n\nNext: do not wipe the device. [1]','generated']]){
  assert.equal((await generateAnswer('lost device',source,{XAI_API_KEY:'test'},response(text))).mode,mode);
 }
});
test('citation prompt requires support for every clause and timing start points',async()=>{
 await generateAnswer('lost device',source,{XAI_API_KEY:'test'},async(url,opts)=>{const prompt=JSON.parse(opts.body).input[0].content;assert.match(prompt,/support every clause/);assert.match(prompt,/Cite closing recommendations/);assert.match(prompt,/start point of deadlines/);return response('Report loss immediately. [1]')();});
});
test('Q17 reserves evidence for both topics and adjacent disposal procedure',async()=>{
 const {sources}=await retrieveHybrid(index,cases.find(c=>c.id==='Q17').question,'all',{});
 const ids=sources.map(s=>s.id);
 for(const id of ['DOC-12-8-p1','DOC-12-8-p2','DOC-13-2-p1','DOC-13-2-p2'])assert.ok(ids.includes(id),id);
 assert.ok(sources.length<=6);assert.equal(new Set(ids).size,ids.length);
 assert.deepEqual(sources.map(s=>s.citation),sources.map((_,i)=>i+1));
 for(const s of sources)assert.equal(s.text,index.chunks.find(c=>c.id===s.id).text);
});
test('Q11 retrieves retention start point and hold override',async()=>{
 const {sources}=await retrieveHybrid(index,cases.find(c=>c.id==='Q11').question,'all',{});
 assert.ok(sources.some(s=>s.text.includes('90 days from creation')));
 assert.ok(sources.some(s=>s.text.includes('hold suspends deletion')));
});
test('compound retrieval stays within document scope and does not invent evidence',async()=>{
 const {sources}=await retrieveHybrid(index,cases.find(c=>c.id==='Q17').question,'DOC-12',{});
 assert.ok(sources.length);assert.ok(sources.every(s=>s.documentId==='DOC-12'));
 assert.deepEqual((await retrieveHybrid(index,'What is the capital of France?','all',{})).sources,[]);
});
test('new phrasing covers separate support and expense topics without paid decomposition',async()=>{
 const {sources}=await retrieveHybrid(index,'What is the deadline for expense claims, and how quickly must P1 support acknowledge a case?','all',{});
 assert.ok(sources.some(s=>s.text.includes('within 30 calendar days')));
 assert.ok(sources.some(s=>s.text.includes('30 elapsed minutes')));
 assert.equal(subquestions('What are rules for cash and gifts?').length,0);
 assert.equal(subquestions('What is A? What is B? What is C? What is D?').length,3);
});

test('Q16 context expansion preserves the no-guarantee qualification',async()=>{
 const {sources}=await retrieveHybrid(index,cases.find(c=>c.id==='Q16').question,'all',{});
 assert.ok(sources.some(s=>s.text.includes('Neither is a guarantee')));
 assert.ok(sources.some(s=>s.text.includes('four-hour recovery time objective')));
});
