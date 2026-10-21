import { AsyncLocalStorage } from 'node:async_hooks';
export type Runtime = { OPENAI_API_KEY?: string; OPENAI_MODEL?: string };
const runtime = new AsyncLocalStorage<Runtime>();
export const withRuntime = <T,>(env: Runtime, run: () => T) => runtime.run(env, run);
export const getRuntime = (): Runtime => runtime.getStore() || { OPENAI_API_KEY: process.env.OPENAI_API_KEY, OPENAI_MODEL: process.env.OPENAI_MODEL };
