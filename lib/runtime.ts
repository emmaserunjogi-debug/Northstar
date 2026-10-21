import { AsyncLocalStorage } from 'node:async_hooks';
export type Runtime = { OPENAI_API_KEY?: string; OPENAI_MODEL?: string; QDRANT_URL?: string; QDRANT_API_KEY?: string; SEMANTIC_SCORE_THRESHOLD?: string };
const runtime = new AsyncLocalStorage<Runtime>();
export const withRuntime = <T,>(env: Runtime, run: () => T) => runtime.run(env, run);
export const getRuntime = (): Runtime => runtime.getStore() || { OPENAI_API_KEY: process.env.OPENAI_API_KEY, OPENAI_MODEL: process.env.OPENAI_MODEL, QDRANT_URL: process.env.QDRANT_URL, QDRANT_API_KEY: process.env.QDRANT_API_KEY, SEMANTIC_SCORE_THRESHOLD: process.env.SEMANTIC_SCORE_THRESHOLD };
