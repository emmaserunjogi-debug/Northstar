import {Tiktoken} from 'js-tiktoken/lite';
import ranks from 'js-tiktoken/ranks/cl100k_base';
let tokenizer;
export const PROMPT_TOKEN_BUDGET=6000;
export const PROTOCOL_RESERVE=512;
// A consistent local estimate, NOT the xAI or GPT-4.1 model's exact tokenizer.
export function estimateTokens(text){tokenizer??=new Tiktoken(ranks);return tokenizer.encode(text,[],[]).length;}
export function evidencePayload(question,sources){return JSON.stringify({question,evidence:sources.map(s=>({citation:s.citation,source_id:s.id,document:s.documentId,document_version:s.documentVersion,effective:s.effective,title:s.title,section:s.section,text:s.text}))});}
export function prepareEvidence(question,sources,instructions,schema,outputReserve,budget=PROMPT_TOKEN_BUDGET){
 const inputLimit=budget-outputReserve-PROTOCOL_RESERVE;
 const fixed=estimateTokens(instructions+JSON.stringify(schema));
 const measure=docs=>fixed+estimateTokens(evidencePayload(question,docs));
 // Reject large inputs cheaply before tokenization; never truncate a policy rule.
 if(question.length>12000||sources.some(s=>s.text.length>100000))return {ok:false,reason:'evidence_too_large'};
 const primary=sources.filter(s=>s.evidenceRole!=='context');
 let selected=[...primary];
 if(!primary.length||measure(primary)>inputLimit)return {ok:false,reason:'required_evidence_exceeds_budget'};
 for(const s of sources.filter(s=>s.evidenceRole==='context'))if(measure([...selected,s])<=inputLimit)selected.push(s);
 // Keep retrieval order and assign citations only after selection.
 const keep=new Set(selected);selected=sources.filter(s=>keep.has(s)).map((s,i)=>({...s,citation:i+1}));
 const inputEstimate=measure(selected);
 if(inputEstimate>inputLimit)return {ok:false,reason:'required_evidence_exceeds_budget'};
 return {ok:true,sources:selected,payload:evidencePayload(question,selected),budget:{tokenizer:'cl100k_base estimate; not model-exact',totalBudget:budget,inputEstimate,outputReserve,protocolReserve:PROTOCOL_RESERVE,droppedContext:sources.length-selected.length}};
}
