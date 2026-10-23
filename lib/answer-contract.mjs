import {z} from 'zod';
export const ANSWER_SCHEMA={"type": "object", "additionalProperties": false, "required": ["status", "statements"], "properties": {"status": {"type": "string", "enum": ["answer", "refusal"]}, "statements": {"type": "array", "items": {"type": "object", "additionalProperties": false, "required": ["text", "citations"], "properties": {"text": {"type": "string"}, "citations": {"type": "array", "items": {"type": "integer"}}}}}}};
const contract=z.object({status:z.enum(['answer','refusal']),statements:z.array(z.object({text:z.string().trim().min(1).max(3000),citations:z.array(z.number().int()).min(1).max(6)}).strict()).max(12)}).strict();
export function parseAnswerContract(text,sources){
 let result;try{result=contract.parse(JSON.parse(text));}catch{return null;}
 if(result.status==='refusal')return result.statements.length===0?result:null;
 if(!result.statements.length)return null;
 const allowed=new Set(sources.map(s=>s.citation));
 for(const s of result.statements){
  if(/\[\d+\]|\n|<[^>]*>/.test(s.text)||s.citations.some(c=>!allowed.has(c))||new Set(s.citations).size!==s.citations.length)return null;
 }
 return result;
}
export function renderStatements(statements){return statements.map(s=>`${s.text} ${s.citations.map(c=>`[${c}]`).join('')}`).join('\n\n');}
