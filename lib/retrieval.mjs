import { Document } from '@langchain/core/documents';
import { BaseRetriever } from '@langchain/core/retrievers';
import { BM25Retriever } from '@langchain/community/retrievers/bm25';
const stop = new Set('a an the is are was were be been being i my me we our you your how what when where who why can could should would do does did about for of to in on at by with and or it this that from as have has need policy company please tell much many'.split(' '));
export function tokens(text){return (text.toLowerCase().match(/[a-z0-9]+/g)||[]).filter(w=>!stop.has(w)).map(w=>w.length>4?w.replace(/(ing|ed|s)$/,''):w)}
const synonyms={remotely:'remote',entitled:'entitlement',approval:'approve',vacation:'leave',holiday:'leave',pto:'leave',reimburse:'expenses',reimbursement:'expenses',password:'authentication',hacked:'incident security',phishing:'security incident',laptop:'device equipment',fired:'departure',resign:'departure',resignation:'departure',wfh:'remote work',buy:'purchasing procurement',purchase:'purchasing procurement',retain:'retention records',delete:'disposal retention',harassment:'conduct reporting',lost:'lost stolen'};

export function createIndex(docs) {
  return { documents:docs, chunks: docs.flatMap(doc => doc.sections.flatMap(section =>
    section.text.split(/\n\s*\n/).filter(Boolean).map((text,i) => ({
      id:`${section.id}-p${i+1}`,documentId:doc.id,title:doc.title,
      section:section.heading,sectionId:section.id,text,documentVersion:doc.version,effective:doc.effective,documentHash:doc.hash,
    })))) };
}
export function sourceDocument(source) {
  // EnsembleRetriever deduplicates by pageContent. Include the source ID so
  // identical policy wording in different sections retains its own citation.
  return new Document({id:source.id,pageContent:`${source.id}\n${source.title}\n${source.section}\n${source.text}`,metadata:{...source,chunkId:source.id}});
}
function queryTokens(question) {
  const words=question.toLowerCase().match(/[a-z0-9]+/g)||[];
  return [...new Set(tokens(question+' '+words.map(w=>synonyms[w]||'').join(' ')))];
}
class NormalizedBM25Retriever extends BM25Retriever {
  preprocessFunc(query) { return queryTokens(query).map(t=>`_${t}_`); }
}
export class PolicyKeywordRetriever extends BaseRetriever {
  lc_namespace=['northstar','retrievers','keyword'];
  constructor(index,documentId='all',k=12) {
    super();this.index=index;this.k=k;
    this.chunks=index.chunks.filter(c=>documentId==='all'||c.documentId===documentId);
    this.byId=new Map(this.chunks.map(c=>[c.id,c]));
    this.delegate=new NormalizedBM25Retriever({
      docs:index.chunks.map(c=>new Document({pageContent:tokens(`${c.title} ${c.section} ${c.text}`).map(t=>`_${t}_`).join(' '),metadata:{chunkId:c.id}})),
      k:index.chunks.length,includeScore:true,
    });
  }
  async _getRelevantDocuments(query,runManager) {
    const terms=queryTokens(query);if(!terms.length||!this.chunks.length)return [];
    const docs=await this.delegate.invoke(query,{callbacks:runManager?.getChild()});
    return docs.flatMap(d=>{
      const c=this.byId.get(d.metadata.chunkId);if(!c)return [];
      const present=new Set(tokens(`${c.title} ${c.section} ${c.text}`));
      const coverage=terms.filter(t=>present.has(t)).length/terms.length;
      // Relevance gating is policy-specific; LangChain owns all BM25 scoring.
      if(!(d.metadata.bm25Score>2)||coverage<Math.min(.35,2/terms.length))return [];
      return [sourceDocument({...c,score:d.metadata.bm25Score,coverage})];
    }).slice(0,this.k);
  }
}
export async function retrieve(index,question,documentId='all',limit=6) {
  const docs=await new PolicyKeywordRetriever(index,documentId,limit).invoke(question);
  return docs.map((d,i)=>({...d.metadata,citation:i+1}));
}
