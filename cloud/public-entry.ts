import { createPublicHandler } from './public-api.ts';
Deno.serve(createPublicHandler());
