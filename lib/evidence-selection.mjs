import {PolicyKeywordRetriever,sourceDocument} from './retrieval.mjs';

// Split only explicit new questions, not ordinary noun lists. Keep at most three
// branches; the original query still drives the existing hybrid search.
export function subquestions(question){
 const parts=question.split(/(?:\?\s+|;\s*|,?\s+and\s+)(?=(?:what|how|when|where|who|why|can|may|should|does|do|is|are)\b)/i)
  .map(p=>p.trim()).filter(p=>p.length>=8);
 return parts.length>1?parts.slice(0,3):[];
}
export async function selectEvidence(index,question,documentId,ranked,callbacks){
 const parts=subquestions(question);
 if(!parts.length||!ranked.length)return ranked.slice(0,6);
 const retriever=new PolicyKeywordRetriever(index,documentId,12);
 const branches=await Promise.all(parts.map(part=>retriever.invoke(part,{callbacks})));
 const selected=[],seen=new Set();
 function add(doc){if(doc&&!seen.has(doc.metadata.id)){selected.push(doc);seen.add(doc.metadata.id);}}
 // Preserve the top fused hit, then reserve coverage for each branch before
 // adding lower-ranked candidates. No scoring replaces LangChain's rankings.
 add(ranked[0]);
 for(let rank=0;rank<12&&selected.length<4;rank++){
  for(const branch of branches){if(selected.length===4)break;add(branch[rank]);}
 }
 for(const doc of ranked){if(selected.length===4)break;add(doc);}
 // At most two adjacent paragraphs, one per section, preserve qualifications
 // without relabeling or changing the canonical chunk text or identifiers.
 const contextualized=new Set();
 const rankById=new Map(ranked.map((doc,i)=>[doc.metadata.id,i]));
 for(const seed of [...selected]){
  if(selected.length>=6)break;
  const s=seed.metadata;if(contextualized.has(s.sectionId))continue;
  const section=index.chunks.filter(c=>c.sectionId===s.sectionId&&c.documentId===s.documentId&&(documentId==='all'||c.documentId===documentId));
  const at=section.findIndex(c=>c.id===s.id);
  const neighbor=[section[at-1],section[at+1]].filter(c=>c&&!seen.has(c.id))
   .sort((a,b)=>(rankById.get(a.id)??Infinity)-(rankById.get(b.id)??Infinity))[0];
  if(neighbor){add(sourceDocument(neighbor));contextualized.add(s.sectionId);}
 }
 for(const doc of ranked){if(selected.length===6)break;add(doc);}
 return selected;
}
