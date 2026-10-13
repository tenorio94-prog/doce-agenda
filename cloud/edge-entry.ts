import { createDoceApiHandler } from './doce-api.ts';

// Supabase Edge runtime entrypoint; core handler remains injectable in Node tests.
Deno.serve(createDoceApiHandler());
