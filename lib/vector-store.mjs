// HTTP-only clients run in Node and Cloudflare Workers. Never import secrets here.
export const EMBEDDING_MODEL = 'text-embedding-3-small';
export const EMBEDDING_DIMENSIONS = 1536;
export class RetrievalError extends Error {
  constructor(code) { super(code); this.code = code; }
}
export function configured(env) { return !!(env.OPENAI_API_KEY && env.QDRANT_URL); }
export async function collectionName(index) {
  // A new corpus or embedding configuration gets its own immutable namespace.
  const content = JSON.stringify([EMBEDDING_MODEL, EMBEDDING_DIMENSIONS,
    index.chunks.map(c => [c.id, c.documentId, c.title, c.section, c.text])]);
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
  return 'northstar_' + Array.from(new Uint8Array(digest)).map(x => x.toString(16).padStart(2, '0')).join('').slice(0, 24);
}
export async function embed(texts, env, fetcher = fetch) {
  if (!env.OPENAI_API_KEY) throw new RetrievalError('embedding_not_configured');
  if (!texts.length || texts.some(t => typeof t !== 'string' || !t.trim() || t.length > 24000)) throw new RetrievalError('invalid_embedding_input');
  let response;
  try {
    response = await fetcher('https://api.openai.com/v1/embeddings', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: EMBEDDING_MODEL, dimensions: EMBEDDING_DIMENSIONS, input: texts, encoding_format: 'float' }),
    });
  } catch { throw new RetrievalError('embedding_unavailable'); }
  if (!response.ok) throw new RetrievalError('embedding_unavailable');
  let data;
  try { data = await response.json(); } catch { throw new RetrievalError('invalid_embedding_response'); }
  if (!Array.isArray(data.data) || data.data.length !== texts.length) throw new RetrievalError('invalid_embedding_response');
  const ordered = [...data.data].sort((a, b) => a.index - b.index);
  if (ordered.some((row, i) => row.index !== i || !Array.isArray(row.embedding) || row.embedding.length !== EMBEDDING_DIMENSIONS || row.embedding.some(v => !Number.isFinite(v)))) throw new RetrievalError('invalid_embedding_response');
  return ordered.map(row => row.embedding);
}
export async function qdrant(env, path, method = 'GET', body, fetcher = fetch) {
  let url;
  try { url = new URL(env.QDRANT_URL); } catch { throw new RetrievalError('invalid_vector_url'); }
  const loopback = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if ((url.protocol !== 'https:' && !(loopback && url.protocol === 'http:')) || url.username || url.password || url.search || url.hash || !['', '/'].includes(url.pathname)) throw new RetrievalError('invalid_vector_url');
  let response;
  try {
    response = await fetcher(url.origin + path, {
      method, redirect: 'error', signal: AbortSignal.timeout(10000),
      headers: { 'Content-Type': 'application/json', ...(env.QDRANT_API_KEY ? { 'api-key': env.QDRANT_API_KEY } : {}) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch { throw new RetrievalError('vector_unavailable'); }
  if (response.status === 404) throw new RetrievalError('index_missing');
  if (!response.ok) throw new RetrievalError('vector_unavailable');
  let data;
  try { data = await response.json(); } catch { throw new RetrievalError('invalid_vector_response'); }
  if (data.status !== 'ok') throw new RetrievalError('invalid_vector_response');
  return data.result;
}
export async function checkCollection(index, env, fetcher = fetch) {
  const name = await collectionName(index);
  const info = await qdrant(env, `/collections/${name}`, 'GET', undefined, fetcher);
  if (info?.config?.params?.vectors?.size !== EMBEDDING_DIMENSIONS || info?.config?.params?.vectors?.distance !== 'Cosine') throw new RetrievalError('index_incompatible');
  const result = await qdrant(env, `/collections/${name}/points/count`, 'POST', { exact: true }, fetcher);
  // Partial uploads never become the serving index. Re-running indexing resumes safely.
  if (result?.count !== index.chunks.length) throw new RetrievalError('index_incomplete');
  return name;
}
export async function semanticSearch(index, question, documentId, env, fetcher = fetch) {
  const name = await checkCollection(index, env, fetcher);
  const [vector] = await embed([question], env, fetcher);
  const threshold = env.SEMANTIC_SCORE_THRESHOLD === undefined || env.SEMANTIC_SCORE_THRESHOLD === '' ? 0.35 : Number(env.SEMANTIC_SCORE_THRESHOLD);
  if (!Number.isFinite(threshold) || threshold < 0 || threshold > 1) throw new RetrievalError('invalid_score_threshold');
  const result = await qdrant(env, `/collections/${name}/points/query`, 'POST', {
    query: vector, limit: 12, with_payload: true, with_vector: false, score_threshold: threshold,
    ...(documentId !== 'all' ? { filter: { must: [{ key: 'documentId', match: { value: documentId } }] } } : {}),
  }, fetcher);
  if (!Array.isArray(result?.points)) throw new RetrievalError('invalid_vector_response');
  const byId = new Map(index.chunks.map(c => [c.id, c]));
  const seen = new Set();
  return result.points.flatMap(point => {
    const c = byId.get(point.payload?.chunkId);
    // Canonical source text is loaded from this build, never trusted from remote payloads.
    if (!c || seen.has(c.id) || (documentId !== 'all' && c.documentId !== documentId) || !Number.isFinite(point.score) || point.score < threshold) return [];
    seen.add(c.id);
    const { tf, length, ...source } = c;
    return [{ ...source, semanticScore: point.score }];
  });
}
