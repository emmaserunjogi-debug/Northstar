import {readdir,readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const docs=[];
for(const file of (await readdir('corpus')).filter(f=>f.endsWith('.md')).sort()){
 const raw=await readFile(`corpus/${file}`,'utf8');
 const heading=raw.match(/^# (.+)/m)[1];
 const code=heading.match(/^([A-Z]+-\d+):/)?.[1]||`DOC-${file.slice(0,2)}`;
 const title=heading.replace(/^[A-Z]+-\d+: /,'');
 const sections=raw.split(/^## /m).slice(1).map((part,i)=>{const [heading,...body]=part.split('\n');return {id:`${code}-${i+1}`,heading,text:body.join('\n').replace(/<!--.*?-->/gs,'').trim()}});
 docs.push({id:code,title,file,owner:raw.match(/\*\*Owner:\*\* ([^\n]+)/)?.[1]?.trim()||'Not specified in document',effective:raw.match(/\*\*Effective:\*\* ([^|\n]+)/)?.[1]?.trim()||'Not specified',version:raw.match(/\*\*Version:\*\* ([^|\n]+)/)?.[1]?.trim()||'Not specified',hash:createHash('sha256').update(raw).digest('hex'),sections});
}
await writeFile('data/corpus.json',JSON.stringify(docs,null,2)+'\n');
console.log(`Indexed ${docs.length} documents, ${docs.reduce((n,d)=>n+d.sections.length,0)} sections.`);
