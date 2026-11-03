// Código da Cloudflare que roda só em /p/*, /fotos/* e nos vídeos .mp4 (wrangler.jsonc, run_worker_first). Todo o
// resto do site continua sendo arquivo estático. Se algo aqui falhar, a cliente recebe a página de sempre.
//   /p/<slug>  vitrine com nome, frase e imagem da confeitaria na prévia do WhatsApp/Instagram, e os dados já na
//              página (abre sem esperar outra busca; a visita é contada uma vez, aqui).
//   /fotos/... fotos da vitrine guardadas no Supabase, entregues pelo nosso endereço e guardadas em cache.
//   *.mp4      o mesmo arquivo publicado, inteiro ou no pedaço pedido (Range): os arquivos estáticos ignoram Range,
//              e o Safari do iPhone só toca vídeo de servidor que entrega pedaços.
// VITRINE_SUPABASE só existe no teste local (scripts/test-worker.mjs), para usar um Supabase simulado.
const SUPABASE = 'https://khvhnbopdluthpcduhqm.supabase.co';
const SLUG = /^\/p\/([a-z0-9][a-z0-9-]{1,38}[a-z0-9])\/?$/;
const PHOTO = /^\/fotos\/([a-f0-9]{32}\/[a-f0-9-]{36}\.(?:webp|jpg))$/;
// Robôs que só leem a prévia do link: não contam como visita.
const PREVIEW_BOT = /WhatsApp|facebookexternalhit|Facebot|Instagram|Twitterbot|TelegramBot|Slackbot|Discordbot|LinkedInBot|Googlebot|bingbot|Applebot/i;

export function vitrineMeta(config, origin) {
  if (!config?.active) return { title: 'Encomendas pausadas', description: 'Esta confeitaria não está recebendo pedidos pelo link no momento.', image: '' };
  const name = String(config.displayName || 'Confeitaria').slice(0, 60);
  const description = (String(config.welcome || '').trim() || `Escolha o doce e a data e faça sua encomenda com ${name}.`).replace(/\s+/g, ' ').slice(0, 200);
  const key = [config.share, config.cover, config.logo].find((k) => typeof k === 'string' && /\.(?:jpg|webp)$/.test(k) && !k.startsWith('exemplo/'));
  return { title: `${name} · encomendas`, name, description, image: key ? `${origin}/fotos/${key}` : '' };
}
// JSON dentro de <script>: sem "<" cru, nada fecha a tag antes da hora.
const UNSAFE_IN_SCRIPT = new RegExp('[<' + String.fromCharCode(0x2028, 0x2029) + ']', 'g');
export const safeJson = (value) => JSON.stringify(value).replace(UNSAFE_IN_SCRIPT, (c) => '\\u' + c.charCodeAt(0).toString(16).padStart(4, '0'));

async function vitrinePage(request, env, slug) {
  const url = new URL(request.url), base = env.VITRINE_SUPABASE || SUPABASE;
  const page = await env.ASSETS.fetch(new URL('/encomenda/', url));
  if (!page.ok) return page;
  let config;
  try {
    const bot = PREVIEW_BOT.test(request.headers.get('User-Agent') || '');
    // Robô de prévia e a página "Meu pedido" (?pedido=) não contam como visita da vitrine.
    const response = await fetch(`${base}/functions/v1/doce-public/p/${slug}${bot || url.searchParams.has('pedido') ? '?visita=0' : ''}`, { signal: AbortSignal.timeout(3000) });
    if (!response.ok) return page;
    config = await response.json();
  } catch { return page; }
  const meta = vitrineMeta(config, url.origin);
  const setContent = (value) => ({ element(el) { el.setAttribute('content', value); } });
  const rewriter = new HTMLRewriter()
    .on('title', { element(el) { el.setInnerContent(meta.title); } })
    .on('meta[name=description]', setContent(meta.description))
    .on('meta[property="og:title"]', setContent(meta.name || meta.title))
    .on('meta[property="og:description"]', setContent(meta.description))
    .on('head', { element(el) {
      el.append(`<meta property="og:url" content="${url.origin}/p/${slug}">`, { html: true });
      if (meta.image) el.append(`<meta property="og:image" content="${meta.image}"><meta name="twitter:card" content="summary_large_image">`, { html: true });
      el.append(`<script id="vitrine-data" type="application/json">${safeJson(config)}</script>`, { html: true });
    } });
  const response = rewriter.transform(page);
  const headers = new Headers(response.headers);
  headers.set('Cache-Control', 'no-store');
  return new Response(response.body, { status: 200, headers });
}

async function photo(request, env, ctx, key) {
  const cache = caches.default, cacheKey = new Request(new URL(`/fotos/${key}`, request.url));
  const cached = await cache.match(cacheKey);
  if (cached) return cached;
  const origin = await fetch(`${env.VITRINE_SUPABASE || SUPABASE}/storage/v1/object/public/vitrine/${key}`);
  if (!origin.ok) return new Response('Foto não encontrada.', { status: 404, headers: { 'Cache-Control': 'public, max-age=60', 'Content-Type': 'text/plain; charset=utf-8' } });
  const response = new Response(origin.body, { status: 200, headers: {
    'Content-Type': key.endsWith('.jpg') ? 'image/jpeg' : 'image/webp',
    // Cada foto nova tem nome novo; o arquivo nunca muda, então pode ficar guardado por um ano.
    'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff',
  } });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

// Entrega o vídeo inteiro (200) ou só os bytes pedidos (206), lendo o arquivo publicado aos poucos, sem guardar tudo.
export function byteRange(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec((header || '').trim());
  if (!match || (match[1] === '' && match[2] === '')) return null;
  if (match[1] === '') return { start: Math.max(0, size - Number(match[2])), end: size - 1 };
  return { start: Number(match[1]), end: match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1) };
}
// O arquivo publicado chega aqui sem Content-Length: o tamanho é medido uma vez por versão (ETag) e guardado.
const videoSizes = new Map();
async function video(request, env) {
  const asset = await env.ASSETS.fetch(new Request(request.url));
  if (!asset.ok) return asset;
  const headers = new Headers(asset.headers);
  headers.set('Accept-Ranges', 'bytes');
  const header = request.headers.get('Range');
  if (!header) return new Response(request.method === 'HEAD' ? null : asset.body, { status: 200, headers });
  const tag = asset.headers.get('ETag') || request.url;
  let size = Number(asset.headers.get('Content-Length')) || videoSizes.get(tag), whole = null;
  if (!size) {
    whole = new Uint8Array(await asset.arrayBuffer());
    size = whole.byteLength;
    videoSizes.set(tag, size);
  }
  const range = byteRange(header, size);
  if (!range) return new Response(request.method === 'HEAD' ? null : whole ?? asset.body, { status: 200, headers });
  if (range.start >= size || range.start > range.end) {
    if (!whole) asset.body?.cancel();
    return new Response(null, { status: 416, headers: { 'Content-Range': `bytes */${size}` } });
  }
  headers.set('Content-Range', `bytes ${range.start}-${range.end}/${size}`);
  headers.set('Content-Length', String(range.end - range.start + 1));
  if (request.method === 'HEAD') { if (!whole) asset.body?.cancel(); return new Response(null, { status: 206, headers }); }
  if (whole) return new Response(whole.subarray(range.start, range.end + 1), { status: 206, headers });
  let offset = 0;
  const body = asset.body.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      const from = Math.max(range.start - offset, 0), to = Math.min(range.end + 1 - offset, chunk.byteLength);
      if (from < to) controller.enqueue(chunk.subarray(from, to));
      offset += chunk.byteLength;
      if (offset > range.end) controller.terminate();
    },
  }));
  return new Response(body, { status: 206, headers });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (!['GET', 'HEAD'].includes(request.method)) return new Response('Método não permitido.', { status: 405 });
    const photoKey = url.pathname.match(PHOTO)?.[1];
    if (photoKey) return photo(request, env, ctx, photoKey);
    if (url.pathname.startsWith('/fotos/')) return new Response('Foto não encontrada.', { status: 404 });
    if (url.pathname.endsWith('.mp4')) return video(request, env);
    const slug = url.pathname.match(SLUG)?.[1];
    if (slug) {
      try { return await vitrinePage(request, env, slug); } catch { /* cai na página de sempre */ }
    }
    return env.ASSETS.fetch(new URL('/encomenda/', url));
  },
};
