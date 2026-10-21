import { retrieve } from './retrieval.mjs';
import { configured, semanticSearch } from './vector-store.mjs';
export function fuseRanks(lexical, semantic, limit = 6) {
  const scores = new Map();
  for (const list of [lexical, semantic]) {
    const seen = new Set();
    list.forEach((source, rank) => {
      if (seen.has(source.id)) return;
      seen.add(source.id);
      const previous = scores.get(source.id);
      scores.set(source.id, { ...previous, ...source, fusionScore: (previous?.fusionScore || 0) + 1 / (60 + rank + 1) });
    });
  }
  return [...scores.values()].sort((a,b) => b.fusionScore-a.fusionScore || a.id.localeCompare(b.id))
    .slice(0,limit).map((s,i) => ({...s,citation:i+1}));
}
export async function retrieveHybrid(index, question, documentId, env, fetcher = fetch) {
  const lexical = retrieve(index, question, documentId, 12);
  if (!configured(env)) return { sources: lexical.slice(0,6), retrieval: { mode: 'keyword', reason: 'not_configured' } };
  try {
    const semantic = await semanticSearch(index, question, documentId, env, fetcher);
    return { sources: fuseRanks(lexical,semantic), retrieval: { mode: 'hybrid', reason: null } };
  } catch (error) {
    return { sources: lexical.slice(0,6), retrieval: { mode: 'keyword', reason: error.code || 'semantic_unavailable' } };
  }
}
