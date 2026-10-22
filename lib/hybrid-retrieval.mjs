import { BaseRetriever } from '@langchain/core/retrievers';
import { EnsembleRetriever } from '@langchain/classic/retrievers/ensemble';
import { PolicyKeywordRetriever,sourceDocument } from './retrieval.mjs';
import { configured,PolicySemanticRetriever,RetrievalError } from './vector-store.mjs';
class FallbackRetriever extends BaseRetriever {
  lc_namespace=['northstar','retrievers','fallback'];
  reason=null;
  constructor(delegate){super();this.delegate=delegate;}
  async _getRelevantDocuments(question,runManager){
    try{return await this.delegate.invoke(question,{callbacks:runManager?.getChild()})}
    catch(e){this.reason=e instanceof RetrievalError?e.code:'semantic_unavailable';return []}
  }
}
export class PolicyHybridRetriever extends BaseRetriever {
  lc_namespace=['northstar','retrievers','hybrid'];
  constructor(index,documentId,env,options={}){super();Object.assign(this,{index,documentId,env,options});}
  async _getRelevantDocuments(question,runManager){
    const lexical=new PolicyKeywordRetriever(this.index,this.documentId,12);
    let docs,mode='keyword',reason='not_configured';
    if(configured(this.env)){
      // Fallback state belongs to this invocation, never shared between requests.
      const semantic=new FallbackRetriever(new PolicySemanticRetriever(this.index,this.documentId,this.env,this.options));
      docs=await new EnsembleRetriever({retrievers:[lexical,semantic],weights:[.5,.5],c:60}).invoke(question,{callbacks:runManager?.getChild()});
      reason=semantic.reason;mode=reason?'keyword':'hybrid';
    }else docs=await lexical.invoke(question,{callbacks:runManager?.getChild()});
    this.options.onStatus?.({mode,reason});
    return docs.slice(0,6).map((d,i)=>sourceDocument({...d.metadata,citation:i+1,retrieval:{mode,reason}}));
  }
}
export async function retrieveHybrid(index,question,documentId,env,options={}){
  let retrieval={mode:'keyword',reason:'not_configured'};
  const retriever=new PolicyHybridRetriever(index,documentId,env,{...options,onStatus:status=>{retrieval=status;}});
  const docs=await retriever.invoke(question);
  return {sources:docs.map(d=>{const {retrieval,...source}=d.metadata;return source;}),retrieval};
}
