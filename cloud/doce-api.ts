import { createEmptyState, transactState } from './state-engine.js';
import { monthlySummary } from './monthly-summary.js';

const MAX_BODY_BYTES = 5 * 1024 * 1024;
const TABLE = 'pilot_agendas';
const RPC = 'commit_pilot_agenda';
const ALLOWED_ORIGINS = new Set([
  'https://doce-agenda-piloto.netlify.app',
  'https://lucast.app',
  'https://www.lucast.app',
  'https://doce-agenda.doce-agenda-local.workers.dev',
  'http://localhost:4173',
  'http://127.0.0.1:4173',
]);

type AuthUser = { id: string; user_metadata?: Record<string, unknown> };
type DbResult = { data: any; error: any };
type Client = {
  auth: { getUser(jwt?: string): Promise<{ data: { user: AuthUser | null }; error: unknown | null }> };
  from(table: string): any;
  rpc(name: string, args: Record<string, unknown>): Promise<DbResult>;
};
type CreateClient = (url: string, key: string, options?: Record<string, unknown>) => Client;
type HandlerDependencies = {
  env?: (name: string) => string | undefined;
  createClient?: CreateClient;
};
type Envelope = {
  path: string;
  method: string;
  body?: unknown;
  expectedRevision?: number;
};
type AgendaRow = { owner_user_id: string; business_name?: string; state: unknown; revision: number | string };

function headersFor(origin: string | null): Headers {
  const headers = new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Max-Age': '86400',
    'Access-Control-Expose-Headers': 'X-Agenda-Revision',
    Vary: 'Origin',
  });
  if (origin && ALLOWED_ORIGINS.has(origin)) headers.set('Access-Control-Allow-Origin', origin);
  return headers;
}

function jsonResponse(
  origin: string | null,
  body: unknown,
  status = 200,
  revision?: number,
): Response {
  const headers = headersFor(origin);
  if (revision !== undefined && Number.isSafeInteger(revision) && revision >= 0) {
    headers.set('X-Agenda-Revision', String(revision));
  }
  return new Response(JSON.stringify(body), { status, headers });
}

function apiError(message: string, status: number, code?: string): { error: string; code?: string } {
  return { error: message, ...(code ? { code } : {}) };
}

function bearerToken(request: Request): string | null {
  const value = request.headers.get('Authorization') || '';
  const match = value.match(/^Bearer\s+(\S+)$/i);
  return match?.[1] || null;
}

async function readJsonLimited(request: Request): Promise<unknown> {
  const contentLength = request.headers.get('Content-Length');
  if (contentLength && /^\d+$/.test(contentLength) && Number(contentLength) > MAX_BODY_BYTES) {
    throw Object.assign(new Error('Conteúdo muito grande.'), { status: 413 });
  }
  if (!request.body) throw Object.assign(new Error('JSON inválido.'), { status: 400 });
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let source = '';
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel().catch(() => {});
        throw Object.assign(new Error('Conteúdo muito grande.'), { status: 413 });
      }
      source += decoder.decode(value, { stream: true });
    }
    source += decoder.decode();
  } finally {
    reader.releaseLock();
  }
  try {
    return JSON.parse(source);
  } catch {
    throw Object.assign(new Error('JSON inválido.'), { status: 400 });
  }
}

function allowedRoute(path: string, method: string): boolean {
  if (method === 'GET') {
    return ['/api/state', '/api/export', '/api/availability', '/api/order-template', '/api/order-page', '/api/order-page/slug-available', '/api/order-page/metrics', '/api/resumo-mensal'].includes(path);
  }
  if (method === 'PUT') {
    return path === '/api/availability' || path === '/api/order-template' || path === '/api/order-page' || path === '/api/pix'
      || /^\/api\/orders\/[^/]+$/.test(path) || /^\/api\/payments\/[^/]+$/.test(path);
  }
  if (method === 'POST') {
    return path === '/api/import' || path === '/api/orders' || /^\/api\/orders\/[^/]+\/(payments|accept|refuse)$/.test(path);
  }
  return false;
}

function normalizedPath(input: unknown): { path: string; method: string } | null {
  if (!input || typeof input !== 'object') return null;
  const envelope = input as Partial<Envelope>;
  if (typeof envelope.path !== 'string' || typeof envelope.method !== 'string') return null;
  let parsed: URL;
  try {
    parsed = new URL(envelope.path, 'http://doce-agenda.internal');
  } catch {
    return null;
  }
  if (parsed.origin !== 'http://doce-agenda.internal' || !parsed.pathname.startsWith('/') || parsed.pathname.startsWith('//')) return null;
  const method = envelope.method.toUpperCase();
  return allowedRoute(parsed.pathname, method) ? { path: `${parsed.pathname}${parsed.search}`, method } : null;
}

function safeBusinessName(user: AuthUser): string {
  const candidate = user.user_metadata?.business_name;
  if (typeof candidate === 'string') {
    const value = candidate.trim().slice(0, 120);
    if (value) return value;
  }
  return 'Minha agenda';
}

function readRevision(value: unknown): number | null {
  const candidate = typeof value === 'object' && value !== null && 'revision' in value
    ? (value as { revision: unknown }).revision : value;
  const revision = typeof candidate === 'string' && /^\d+$/.test(candidate) ? Number(candidate) : candidate;
  return typeof revision === 'number' && Number.isSafeInteger(revision) && revision >= 0 ? revision : null;
}

function isConflict(error: any): boolean {
  return error?.code === '40001';
}

export function createDoceApiHandler(dependencies: HandlerDependencies = {}) {
  const env = dependencies.env ?? ((name: string) => Deno.env.get(name));
  const injectedCreateClient = dependencies.createClient;

  async function createClient(url: string, key: string, options: Record<string, unknown>): Promise<Client> {
    if (injectedCreateClient) return injectedCreateClient(url, key, options);
    const sdk = await import('npm:@supabase/supabase-js@2.117.3');
    return sdk.createClient(url, key, options) as Client;
  }

  return async function handle(request: Request): Promise<Response> {
    const origin = request.headers.get('Origin');
    if (origin && !ALLOWED_ORIGINS.has(origin)) return jsonResponse(null, apiError('Origem não permitida.', 403), 403);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: headersFor(origin) });
    if (request.method !== 'POST') return jsonResponse(origin, apiError('Método não permitido.', 405), 405);

    const token = bearerToken(request);
    if (!token) return jsonResponse(origin, apiError('Autenticação necessária.', 401), 401);

    let url: string;
    let anonKey: string;
    let serviceRoleKey: string;
    try {
      url = env('SUPABASE_URL') || '';
      anonKey = env('SUPABASE_ANON_KEY') || '';
      serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY') || '';
    } catch {
      return jsonResponse(origin, apiError('Serviço temporariamente indisponível.', 503), 503);
    }
    if (!url || !anonKey || !serviceRoleKey) {
      return jsonResponse(origin, apiError('Serviço temporariamente indisponível.', 503), 503);
    }

    let user: AuthUser;
    let admin: Client;
    let verified: { data: { user: AuthUser | null }; error: any };
    try {
      const authClient = await createClient(url, anonKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      verified = await authClient.auth.getUser(token);
    } catch {
      return jsonResponse(origin, apiError('Serviço de autenticação temporariamente indisponível.', 503), 503);
    }
    if (verified.error) {
      const status = Number(verified.error?.status) >= 500 ? 503 : 401;
      return jsonResponse(origin, apiError(status === 503 ? 'Serviço de autenticação temporariamente indisponível.' : 'Autenticação inválida.', status), status);
    }
    if (!verified.data?.user || typeof verified.data.user.id !== 'string' || !verified.data.user.id) {
      return jsonResponse(origin, apiError('Autenticação inválida.', 401), 401);
    }
    user = verified.data.user;
    try {
      admin = await createClient(url, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
      });
    } catch {
      return jsonResponse(origin, apiError('Serviço temporariamente indisponível.', 503), 503);
    }

    let input: unknown;
    try {
      input = await readJsonLimited(request);
    } catch (error: any) {
      const status = error?.status === 413 ? 413 : 400;
      return jsonResponse(origin, apiError(status === 413 ? 'Conteúdo muito grande.' : 'JSON inválido.', status), status);
    }
    const route = normalizedPath(input);
    if (!route) return jsonResponse(origin, apiError('Rota não encontrada.', 404), 404);
    const envelope = input as Envelope;
    if (envelope.expectedRevision !== undefined
      && (!Number.isSafeInteger(envelope.expectedRevision) || envelope.expectedRevision < 0)) {
      return jsonResponse(origin, apiError('Revisão inválida.', 400), 400);
    }
    const isWrite = route.method !== 'GET';
    if (isWrite && envelope.expectedRevision === undefined) {
      return jsonResponse(origin, apiError('Informe a revisão esperada.', 400), 400);
    }

    let row: AgendaRow;
    try {
      const selected = await admin.from(TABLE).select('owner_user_id,business_name,state,revision')
        .eq('owner_user_id', user.id).maybeSingle();
      if (selected.error) return jsonResponse(origin, apiError('Não foi possível carregar os dados.', 503), 503);
      if (selected.data) {
        row = selected.data as AgendaRow;
      } else {
        const initial = createEmptyState();
        const inserted = await admin.from(TABLE).upsert({
          owner_user_id: user.id,
          business_name: safeBusinessName(user),
          state: initial,
          revision: 0,
        }, { onConflict: 'owner_user_id', ignoreDuplicates: true });
        if (inserted.error) return jsonResponse(origin, apiError('Não foi possível inicializar os dados.', 503), 503);
        const reread = await admin.from(TABLE).select('owner_user_id,business_name,state,revision')
          .eq('owner_user_id', user.id).single();
        if (reread.error || !reread.data) return jsonResponse(origin, apiError('Não foi possível carregar os dados.', 503), 503);
        row = reread.data as AgendaRow;
      }
    } catch {
      return jsonResponse(origin, apiError('Não foi possível carregar os dados.', 503), 503);
    }

    const revision = readRevision(row.revision);
    if (revision === null || !row.state || typeof row.state !== 'object') {
      return jsonResponse(origin, apiError('Estado armazenado inválido.', 500), 500);
    }
    if (isWrite && envelope.expectedRevision !== revision) {
      return jsonResponse(origin, apiError('O estado mudou em outra sessão. Atualize e tente novamente.', 409, 'REVISION_CONFLICT'), 409, revision);
    }

    if (route.path.split('?')[0] === '/api/resumo-mensal') {
      try {
        return jsonResponse(origin, monthlySummary(row.state, new URL(route.path, 'http://internal').searchParams.get('mes')), 200, revision);
      } catch (error: any) {
        return jsonResponse(origin, apiError(error.status === 400 ? error.message : 'Não foi possível calcular o resumo.', error.status === 400 ? 400 : 500), error.status === 400 ? 400 : 500, revision);
      }
    }
    if (route.path.split('?')[0] === '/api/order-page/slug-available') {
      const slug = new URL(route.path, 'http://internal').searchParams.get('slug') || '';
      if (!/^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$/.test(slug)) return jsonResponse(origin,{available:false},200,revision);
      const found = await admin.from('pilot_order_pages').select('owner_user_id').eq('slug',slug).maybeSingle();
      if(found.error)return jsonResponse(origin,apiError('Não foi possível verificar o endereço.',503),503,revision);
      return jsonResponse(origin,{available:!found.data || found.data.owner_user_id===user.id},200,revision);
    }
    if(route.path==='/api/order-page/metrics'){
      const metrics=await admin.from('pilot_order_pages').select('visits').eq('owner_user_id',user.id).maybeSingle();
      if(metrics.error)return jsonResponse(origin,apiError('Não foi possível carregar as métricas.',503),503,revision);
      return jsonResponse(origin,{visits:Number(metrics.data?.visits||0)},200,revision);
    }

    const transaction = transactState(row.state as ReturnType<typeof createEmptyState>, route.path, {
      method: route.method,
      body: JSON.stringify(envelope.body ?? {}),
    });
    if (transaction.status >= 400) {
      return jsonResponse(origin, transaction.body, transaction.status, revision);
    }
    if (!isWrite || !transaction.mutated) {
      if(route.path==='/api/state')await admin.rpc('record_pilot_owner_visit',{p_owner:user.id});
      return jsonResponse(origin, transaction.body, transaction.status, revision);
    }

    const isImport = route.path.split('?')[0] === '/api/import' && route.method === 'POST';
    try {
      const committed = await admin.rpc(RPC, {
        p_owner: user.id,
        p_expected_revision: revision,
        p_state: transaction.state,
        p_backup: isImport,
      });
      if (committed.error) {
        if(committed.error.code==='23505') return jsonResponse(origin,apiError('Este endereço já está em uso. Escolha outro.',409,'SLUG_TAKEN'),409,revision);
        if (isConflict(committed.error)) {
          const latest = await admin.from(TABLE).select('revision').eq('owner_user_id', user.id).maybeSingle();
          const currentRevision = latest.error ? revision : (readRevision(latest.data?.revision) ?? revision);
          return jsonResponse(origin, apiError('O estado mudou em outra sessão. Atualize e tente novamente.', 409, 'REVISION_CONFLICT'), 409, currentRevision);
        }
        return jsonResponse(origin, apiError('Não foi possível salvar os dados.', 503), 503, revision);
      }
      const nextRevision = readRevision(committed.data);
      if (nextRevision === null) return jsonResponse(origin, apiError('Não foi possível salvar os dados.', 503), 503, revision);
      return jsonResponse(origin, transaction.body, transaction.status, nextRevision);
    } catch {
      return jsonResponse(origin, apiError('Não foi possível salvar os dados.', 503), 503, revision);
    }
  };
}

const defaultHandler = createDoceApiHandler();
export default { fetch: defaultHandler };
