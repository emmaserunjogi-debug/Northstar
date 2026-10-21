const stop = new Set('a an the is are was were be been being i my me we our you your how what when where who why can could should would do does did about for of to in on at by with and or it this that from as have has need policy company please tell much many'.split(' '));
export function tokens(text){return (text.toLowerCase().match(/[a-z0-9]+/g)||[]).filter(w=>!stop.has(w)).map(w=>w.length>4?w.replace(/(ing|ed|s)$/,''):w)}
const synonyms={remotely:'remote',entitled:'entitlement',approval:'approve',vacation:'leave',holiday:'leave',pto:'leave',reimburse:'expenses',reimbursement:'expenses',password:'authentication',hacked:'incident security',phishing:'security incident',laptop:'device equipment',fired:'departure',resign:'departure',resignation:'departure',wfh:'remote work',buy:'purchasing procurement',purchase:'purchasing procurement',retain:'retention records',delete:'disposal retention',harassment:'conduct reporting',lost:'lost stolen'};
export function createIndex(docs){
 const chunks=[];
 for(const doc of docs)for(const section of doc.sections){
  // Paragraph boundaries keep a procedure and its qualifiers together.
  const blocks=section.text.split(/\n\s*\n/).filter(Boolean);
  blocks.forEach((text,i)=>{const terms=tokens(`${doc.title} ${section.heading} ${text}`); const tf={};for(const t of terms)tf[t]=(tf[t]||0)+1;chunks.push({id:`${section.id}-p${i+1}`,documentId:doc.id,title:doc.title,section:section.heading,sectionId:section.id,text,tf,length:terms.length})});
 }
 const df={};for(const c of chunks)for(const t of Object.keys(c.tf))df[t]=(df[t]||0)+1;
 return {chunks,df,avg:chunks.reduce((n,c)=>n+c.length,0)/chunks.length};
}
export function retrieve(index,question,documentId='all',limit=6){
 const words=question.toLowerCase().match(/[a-z0-9]+/g)||[];
 const query=[...new Set(tokens(question+' '+words.map(w=>synonyms[w]||'').join(' ')))];
 if(!query.length)return [];
 return index.chunks.filter(c=>documentId==='all'||c.documentId===documentId).map(c=>{
  let score=0,matched=0;
  for(const t of query){const f=c.tf[t]||0;if(!f)continue;matched++;const idf=Math.log(1+(index.chunks.length-(index.df[t]||0)+0.5)/((index.df[t]||0)+0.5));score+=idf*(f*2.2)/(f+1.2*(0.25+0.75*c.length/index.avg));}
  return {...c,score,coverage:matched/query.length};
 }).filter(c=>c.score>2 && c.coverage>=Math.min(0.35,2/query.length)).sort((a,b)=>b.score-a.score).slice(0,limit).map(({tf,length,...c},i)=>({...c,citation:i+1}));
}
