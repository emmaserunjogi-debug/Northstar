// Convert legacy answer fixtures into the new wire contract; malformed fixtures
// remain malformed, so negative tests still exercise validation boundaries.
export function wireText(text){
 if(/^i can only answer about our policies[.!?]?$/i.test(text.trim().replace(/\s+/g,' ')))return text;
 return JSON.stringify({status:'answer',statements:text.split(/\n\s*\n/).map(p=>({text:p.replace(/\[\d+\]/g,'').trim(),citations:[...p.matchAll(/\[(\d+)\]/g)].map(m=>Number(m[1]))}))});
}
