import test from 'node:test';
import assert from 'node:assert/strict';
import {parseAnswerContract,renderStatements} from '../lib/answer-contract.mjs';
import {prepareEvidence,estimateTokens} from '../lib/prompt-budget.mjs';
import {corpusVersion,answerVersionState} from '../lib/policy-version.mjs';
import {generateAnswer} from '../lib/answer.mjs';
const s=[{id:'p1',text:'Notify IT.',citation:1}];
test('structured statuses and citations validated independently of prose',()=>{
 assert.deepEqual(parseAnswerContract('{"status":"refusal","statements":[]}',s),{status:'refusal',statements:[]});
 for(const data of [{status:'answer',statements:[]},{status:'refusal',statements:[{text:'invented',citations:[1]}]},{status:'answer',statements:[{text:'invented',citations:[99]}]},{status:'answer',statements:[{text:'invented [1]',citations:[1]}]},{status:'answer',statements:[{text:'invented',citations:[]}]}])assert.equal(parseAnswerContract(JSON.stringify(data),s),null);
 const a=parseAnswerContract(JSON.stringify({status:'answer',statements:[{text:'Notify IT.',citations:[1]}]}),s);
 assert.equal(renderStatements(a.statements),'Notify IT. [1]');
});
test('budget keeps required passages whole, omits optional context and renumbers',()=>{
 const primary={...s[0],citation:2};const context={id:'p0',text:'long '.repeat(2000),citation:1,evidenceRole:'context'};
 const b=prepareEvidence('question',[context,primary],'system',{},512,1200);
 assert.ok(b.ok);assert.equal(b.sources.length,1);assert.equal(b.sources[0].text,primary.text);assert.equal(b.sources[0].citation,1);
 assert.ok(b.budget.inputEstimate+b.budget.outputReserve+b.budget.protocolReserve<=1200);
 assert.ok(estimateTokens('中文 🧭')>0);
});
test('over-budget required evidence falls back without model call',async()=>{
 const r=await generateAnswer('question',[{...s[0],text:'policy '.repeat(10000)}],{XAI_API_KEY:'test'},()=>{throw Error('must not call')});assert.equal(r.mode,'retrieval');assert.equal(r.budget.reason,'required_evidence_exceeds_budget');
});
test('content and effective-date changes invalidate version even with unchanged declared version',async()=>{
 const docs=[{id:'a',version:'1.0',effective:'2026-01-01',sections:[{id:'a1',heading:'Rule',text:'original'}]}];
 const before=await corpusVersion(docs);assert.equal(before,await corpusVersion(structuredClone(docs)));
 const changed=structuredClone(docs);changed[0].sections[0].text='updated';assert.notEqual(before,await corpusVersion(changed));
 changed[0].sections[0].text='original';changed[0].effective='2026-02-01';assert.notEqual(before,await corpusVersion(changed));
 assert.equal(answerVersionState({corpusVersion:before},before),'current');assert.equal(answerVersionState({corpusVersion:before},'new'),'stale');assert.equal(answerVersionState({},before),'unknown');assert.equal(answerVersionState({corpusVersion:before},''),'unchecked');
});
test('structured refusal and generated statements drive server-rendered answers',async()=>{
 for(const status of ['refusal','answer']){
 const r=await generateAnswer('question',s,{XAI_API_KEY:'test'},async(url,opts)=>{
  const b=JSON.parse(opts.body);assert.equal(b.text.format.type,'json_schema');assert.equal(b.text.format.strict,true);
  return Response.json({status:'completed',output:[{content:[{type:'output_text',text:JSON.stringify({status,statements:status==='refusal'?[]:[{text:'Notify IT.',citations:[1]}]})}]}]});
 });assert.equal(r.answer,status==='refusal'?'i can only answer about our policies':'Notify IT. [1]');
 }
});
