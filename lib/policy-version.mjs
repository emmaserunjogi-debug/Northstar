export async function corpusVersion(docs){
 const canonical=[...docs].sort((a,b)=>a.id.localeCompare(b.id)).map(d=>({id:d.id,title:d.title,owner:d.owner,version:d.version,effective:d.effective,hash:d.hash,sections:d.sections.map(s=>({id:s.id,heading:s.heading,text:s.text}))}));
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(canonical)));
 return 'corpus-v1-'+Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join('');
}
export function answerVersionState(answer,currentVersion){
 if(!answer.corpusVersion)return 'unknown';
 if(!currentVersion)return 'unchecked';
 return answer.corpusVersion===currentVersion?'current':'stale';
}

const versions=new WeakMap();
export function indexVersion(index){if(!versions.has(index))versions.set(index,corpusVersion(index.documents));return versions.get(index);}
