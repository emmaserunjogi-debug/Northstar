import {wireText} from './structured-fixture.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {generateAnswer} from '../lib/answer.mjs';
import {generationConfig} from '../lib/generation-config.mjs';
const sources=[{citation:1,documentId:'PPL-03',title:'Leave',section:'Procedure',text:'Submit leave ten business days ahead when possible.'}];
test('Grok is default and never uses the OpenAI key',async()=>{
 assert.equal(generationConfig({}).provider,'xai');
 const r=await generateAnswer('leave',sources,{OPENAI_API_KEY:'must-not-use'},()=>{throw Error('must not call')});assert.equal(r.mode,'retrieval');
});
test('Grok receives bounded policy evidence with system instructions and own key',async()=>{
 const r=await generateAnswer('leave',sources,{XAI_API_KEY:'xai-test'},async(url,options)=>{
  assert.equal(url,'https://api.x.ai/v1/responses');assert.equal(options.headers.Authorization,'Bearer xai-test');
  const b=JSON.parse(options.body);assert.equal(b.model,'grok-4.7');assert.equal(b.store,false);assert.equal(b.input[0].role,'system');assert.equal(JSON.parse(b.input[1].content).evidence.length,1);assert.equal(b.tools,undefined);
  return Response.json({status:'completed',output:[{content:[{type:'output_text',text:wireText('Submit leave ten business days ahead when possible. [1]')}]}]});
 });assert.equal(r.mode,'generated');assert.equal(r.provider,'xai');
});
test('Grok retains invalid citation and incomplete answer safeguards',async()=>{
 for(const data of [{status:'completed',text:'Invented [99]'},{status:'incomplete',text:'Truncated [1]'}]){
  const r=await generateAnswer('leave',sources,{XAI_API_KEY:'test'},async()=>Response.json({status:data.status,output:[{content:[{type:'output_text',text:wireText(data.text)}]}]}));assert.equal(r.mode,'retrieval');
 }
});
test('provider selection is explicit; unknown providers fail closed',()=>{assert.equal(generationConfig({LLM_PROVIDER:'openai',OPENAI_API_KEY:'o',XAI_API_KEY:'x'}).key,'o');assert.throws(()=>generationConfig({LLM_PROVIDER:'unknown'}),/Unsupported/)});
test('Grok errors explain auth or quota without exposing response content',async()=>{
 for(const status of [401,429])await assert.rejects(()=>generateAnswer('leave',sources,{XAI_API_KEY:'test'},async()=>new Response('secret',{status})),e=>e.message.includes('Grok')&&!e.message.includes('secret'));
});
