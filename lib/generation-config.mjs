export function generationConfig(env){
 const provider=env.LLM_PROVIDER||'xai';
 if(provider==='xai')return {provider,label:'Grok',model:env.XAI_MODEL||'grok-4.7',key:env.XAI_API_KEY?.trim(),url:'https://api.x.ai/v1/responses'};
 if(provider==='openai')return {provider,label:'OpenAI',model:env.OPENAI_MODEL||'gpt-4.1-mini',key:env.OPENAI_API_KEY?.trim(),url:'https://api.openai.com/v1/responses'};
 throw new Error('Unsupported LLM_PROVIDER. Use xai or openai.');
}
