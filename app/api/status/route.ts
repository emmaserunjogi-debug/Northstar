import {getRuntime} from '@/lib/runtime';
export const dynamic='force-dynamic';
export async function GET(){return Response.json({generation:!!getRuntime().OPENAI_API_KEY},{headers:{'Cache-Control':'private, no-store'}})}
