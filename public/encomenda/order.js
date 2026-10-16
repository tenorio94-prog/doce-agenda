// Vitrine da confeitaria e pedido em 3 passos. Empacotado pelo esbuild em /encomenda/order.js.
// O pedido enviado é o mesmo de antes (mesmos campos e regras no servidor), mais os itens extras opcionais.
import { VITRINE_STYLE_INFO, vitrinePalette, photoUrl, photoAttrs, initials, formatCents } from '../../cloud/vitrine-theme.js';

const $ = (s, root = document) => root.querySelector(s), $$ = (s, root = document) => [...root.querySelectorAll(s)];
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const slug = decodeURIComponent(location.pathname.split('/').filter(Boolean).at(-1) || '');
const api = `https://khvhnbopdluthpcduhqm.supabase.co/functions/v1/doce-public/p/${encodeURIComponent(slug)}`;
const PREVIEW = new URLSearchParams(location.search).has('preview');
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isCake = (name) => /\bbolos?\b/i.test(name || '');
const ICON = {
  cal: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M3 10h18M8 3v4M16 3v4"/></svg>',
  clock: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  ig: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/></svg>',
  info: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5v.5" stroke-linecap="round"/></svg>',
};

let config, dates = [], month, selected = '', chosen = null, extras = new Set(), sent = false, homeScroll = 0;

// ---- Datas (fuso de São Paulo) ----
const brDate = (d, opts = { day: 'numeric', month: 'long', year: 'numeric' }) => new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC', ...opts }).format(new Date(`${d}T12:00:00Z`));
const shortDay = (d) => brDate(d, { weekday: 'short', day: 'numeric', month: 'short' }).replace(/\./g, '');
const today = () => { const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()).map((x) => [x.type, x.value])); return `${p.year}-${p.month}-${p.day}`; };
const freeDates = () => dates.filter((d) => d.available).map((d) => d.date);

// ---- Prévia (?preview=1): rascunho dos Ajustes, nada é buscado nem enviado ----
function previewDraft() {
  let draft = null; try { draft = JSON.parse(localStorage.getItem('doce-agenda.link-preview') || 'null'); } catch { /* exemplo padrão */ }
  return draft || { displayName: 'Doces da Lu', welcome: 'Bolos e docinhos feitos em casa, sob encomenda.', products: [{ name: 'Bolo de aniversário', description: 'A partir de 1 kg.' }, { name: 'Brigadeiro (cento)', description: '' }], orderTemplate: { fields: [] }, availability: { closedWeekdays: [], minimumNoticeHours: 0 } };
}
function previewResponse(url) {
  const draft = previewDraft();
  if (url === api) return { active: true, displayName: draft.displayName, welcome: draft.welcome || '', whatsapp: '', products: Array.isArray(draft.products) ? draft.products : [], style: draft.style || 'atelie', color: draft.color || '', instagram: draft.instagram || '', logo: draft.logo || '', cover: draft.cover || '', noticeHours: Number(draft.availability?.minimumNoticeHours) || 0, orderTemplate: { fields: (draft.orderTemplate?.fields || []).map((f) => ({ ...f, options: f.options || [] })) } };
  if (url.includes('/availability')) {
    const closed = draft.availability?.closedWeekdays || [], notice = Math.ceil((Number(draft.availability?.minimumNoticeHours) || 0) / 24), start = new Date(`${today()}T12:00:00Z`);
    return Array.from({ length: 90 }, (_, i) => { const d = new Date(start); d.setUTCDate(d.getUTCDate() + i); return { date: d.toISOString().slice(0, 10), available: i >= notice && !closed.includes(d.getUTCDay()) }; });
  }
  return { code: 'DA-PREVIA', summary: 'Esta é só uma prévia: o pedido não foi enviado.\nQuando seu link estiver no ar, o pedido da cliente chega em Novos, na sua agenda, para você revisar.', whatsapp: '' };
}
async function json(url, options) {
  if (PREVIEW) return previewResponse(url);
  const response = await fetch(url, options), data = await response.json();
  if (!response.ok) throw Object.assign(new Error(data.error || 'Não foi possível continuar.'), { code: data.code, status: response.status });
  return data;
}

// ---- Identidade ----
function applyTheme() {
  const style = VITRINE_STYLE_INFO[config.style] ? config.style : 'atelie', p = vitrinePalette(config.color);
  document.body.className = `st-${style}`;
  const root = document.documentElement.style;
  root.setProperty('--a', p.color); root.setProperty('--a-ink', p.ink); root.setProperty('--a-tint', p.tint); root.setProperty('--a-tint2', p.tint2); root.setProperty('--a-soft', p.soft);
  $('meta[name=theme-color]').content = style === 'moderna' ? p.ink : style === 'doceria' ? p.tint : style === 'caseira' ? '#f7f0e3' : '#ffffff';
  document.title = `${config.displayName} · encomendas`;
}
const img = (key, alt = '', eager = false, sizes = '(max-width: 600px) 50vw, 320px') => `<img class="ph" src="${esc(photoUrl(key))}" ${photoAttrs(key, key.includes('bastidores-confeitaria') ? '(max-width: 960px) 100vw, 960px' : sizes)} alt="${esc(alt)}" ${eager ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
const mono = (letter) => `<div class="mono"><span>${esc(letter)}</span></div>`;
const productPhoto = (p, alt = '', sizes) => (p.photo ? img(p.photo, alt, false, sizes) : mono(p.name[0]));
const logoHtml = () => (config.logo ? img(config.logo, `Logo de ${config.displayName}`, true) : `<div class="wordmark" aria-hidden="true">${esc(initials(config.displayName))}</div>`);
// Foto que não carrega (apagada ou sem rede) vira o monograma, sem ícone quebrado.
document.addEventListener('error', (event) => {
  const el = event.target;
  if (!(el instanceof HTMLImageElement) || !el.classList.contains('ph')) return;
  const holder = el.parentElement;
  if (holder?.classList.contains('logo')) holder.innerHTML = `<div class="wordmark" aria-hidden="true">${esc(initials(config.displayName))}</div>`;
  else if (holder?.classList.contains('cover')) { holder.classList.add('none'); el.remove(); }
  else el.outerHTML = mono((holder?.closest('[data-product]')?.querySelector('h3')?.textContent || config.displayName || '?')[0]);
}, true);

// ---- Vitrine ----
function headerHtml() {
  const name = esc(config.displayName), about = config.welcome ? `<p class="about">${esc(config.welcome)}</p>` : '';
  const logo = `<div class="logo">${logoHtml()}</div>`, cover = `<div class="cover ${config.cover ? '' : 'none'}">${config.cover ? img(config.cover, '', true) : ''}</div>`;
  const free = freeDates()[0], hours = Number(config.noticeHours) || 0;
  const notice = hours >= 24 ? `${Math.ceil(hours / 24)} ${Math.ceil(hours / 24) === 1 ? 'dia' : 'dias'}` : hours ? `${hours} ${hours === 1 ? 'hora' : 'horas'}` : '';
  const facts = `<div class="facts">${free ? `<span class="free">${ICON.cal}Próxima data livre: ${esc(shortDay(free))}</span>` : '<span>Sem datas livres nos próximos 90 dias</span>'}${notice ? `<span>${ICON.clock}Pedidos com ${notice} de antecedência</span>` : ''}${config.instagram ? `<a href="https://instagram.com/${encodeURIComponent(config.instagram)}" target="_blank" rel="noopener">${ICON.ig}@${esc(config.instagram)}</a>` : ''}</div>`;
  const style = document.body.className.slice(3);
  if (style === 'doceria') return `<header class="hero">${cover}<div class="head"><div class="brand">${logo}<h1 class="name">${name}</h1></div>${about}${facts}</div></header>`;
  if (style === 'caseira') return `<header class="hero"><div class="brand">${logo}<div><span class="kicker">Feito sob encomenda</span><h1 class="name">${name}</h1></div></div>${about}${cover}${facts}</header>`;
  if (style === 'moderna') return `<header class="hero"><div class="head"><div class="brand">${logo}<span class="kicker">Encomendas abertas</span></div><h1 class="name">${name}</h1>${about}</div>${cover}${facts}</header>`;
  return `<header class="hero">${cover}<div class="head">${logo}<h1 class="name">${name}</h1>${about}${facts}</div></header>`;
}
function cardHtml(p, tag) {
  const i = config.products.indexOf(p), price = Number.isInteger(p.priceFromCents) ? `<p class="price">a partir de ${formatCents(p.priceFromCents)}</p>` : '';
  // Sem foto: cartão só de texto (antes virava uma letra enorme no lugar da imagem, com cara de inacabado).
  if (!p.photo) return `<button type="button" class="card is-text" data-product="${i}">${tag ? `<span class="tag">${tag}</span>` : ''}<h3>${esc(p.name)}</h3>${price}${p.description ? `<p class="sub">${esc(p.description)}</p>` : ''}<span class="card-go" aria-hidden="true">Ver e pedir</span></button>`;
  return `<button type="button" class="card" data-product="${i}"><div class="img">${productPhoto(p)}${tag ? `<span class="tag">${tag}</span>` : ''}</div><h3>${esc(p.name)}</h3>${price || (p.description ? `<p class="sub">${esc(p.description)}</p>` : '')}</button>`;
}
function renderHome() {
  const all = config.products, featured = all.length >= 4 ? all.filter((p) => p.featured) : [], rest = all.filter((p) => !featured.includes(p));
  const hasCategories = rest.some((p) => p.category), groups = [];
  if (hasCategories) for (const p of rest) { const c = p.category || 'Outros'; (groups.find((g) => g[0] === c) || groups[groups.push([c, []]) - 1])[1].push(p); }
  if (groups.length) { const other = groups.findIndex((g) => g[0] === 'Outros'); if (other >= 0) groups.push(...groups.splice(other, 1)); }
  // Categories only when they help: enough products and no near-empty groups.
  const grouped = groups.length >= 2 && rest.length >= 6 && rest.length / groups.length >= 2, chips = grouped && rest.length >= 8;
  const anyPrice = all.some((p) => Number.isInteger(p.priceFromCents));
  let body = `<p class="notice">${ICON.info}<span>${anyPrice ? 'Os valores são a partir de. O valor final é combinado com a confeitaria.' : 'O valor é combinado com a confeitaria depois do pedido.'} Nada é cobrado por este link.</span></p>`;
  if (featured.length) body += `<section class="sec" aria-labelledby="sec-feat"><h2 id="sec-feat">Mais pedidos</h2><div class="feat">${featured.map((p) => cardHtml(p, 'Mais pedido')).join('')}</div></section>`;
  if (chips) body += `<nav class="chips" aria-label="Categorias">${groups.map(([c], i) => `<button type="button" data-jump="${i}" aria-pressed="${i === 0}">${esc(c)}</button>`).join('')}</nav>`;
  if (!all.length) body += `<section class="sec"><p class="empty-products">${esc(config.displayName)} ainda está montando o cardápio. Descreva o que você quer logo abaixo.</p></section>`;
  else if (grouped) body += groups.map(([c, list], i) => `<section class="sec" data-group="${i}" aria-labelledby="sec-${i}"><h2 id="sec-${i}">${esc(c)}</h2><div class="grid">${list.map((p) => cardHtml(p)).join('')}</div></section>`).join('');
  else if (rest.length) body += `<section class="sec">${featured.length ? '<h2>Todos os doces</h2>' : ''}<div class="grid ${rest.length <= 3 && !featured.length ? 'one' : ''}">${rest.map((p) => cardHtml(p)).join('')}</div></section>`;
  body += `<section class="sec" aria-labelledby="sec-how"><h2 id="sec-how">Como funciona</h2><ol class="how"><li><div><b>Escolha e conte os detalhes</b>Data, sabor, tema. Leva uns 2 minutos.</div></li><li><div><b>${esc(config.displayName)} confere a agenda</b>Seu pedido só vale depois que a confeitaria confirmar.</div></li><li><div><b>Combinem pelo WhatsApp</b>Valor final, sinal e entrega. Nada é pago por este link.</div></li></ol></section>`;
  body += `<section class="sec"><div class="other"><h3>${all.length ? 'Não achou o que queria?' : 'Faça seu pedido'}</h3><p>Descreva o doce e a confeitaria responde se consegue fazer.</p><button type="button" class="pill soft" data-other>Descrever meu pedido</button></div></section>`;
  $('#vitrine').innerHTML = headerHtml() + body;
}

// ---- Navegação: o botão Voltar do celular fecha a ficha e volta os passos ----
function show(nav) {
  const view = nav?.v || 'home', sheet = $('#product-sheet');
  if (view !== 'sheet' && sheet.open) sheet.close();
  if (sent && view === 'order') { history.replaceState({ v: 'home' }, ''); return show({ v: 'home' }); }
  const inOrder = view === 'order' || view === 'done';
  $('#vitrine').hidden = inOrder; $('#request-page').hidden = view !== 'order'; $('#confirmation').hidden = view !== 'done';
  document.body.classList.toggle('in-order', inOrder);
  if (view === 'home' || view === 'sheet') { requestAnimationFrame(() => window.scrollTo(0, homeScroll)); }
  if (view === 'sheet') openSheet(config.products[nav.p]);
  if (view === 'order') showStep(nav.s || 1);
  if (view === 'done') { window.scrollTo(0, 0); $('#confirmation').focus(); }
}
function go(nav, replace = false) {
  if (!['order', 'done'].includes(history.state?.v)) homeScroll = window.scrollY;
  history[replace ? 'replaceState' : 'pushState'](nav, ''); show(nav);
}
addEventListener('popstate', (event) => show(event.state));

function openSheet(p) {
  if (!p) return;
  const sheet = $('#product-sheet');
  $('#sheet-photo').innerHTML = productPhoto(p, p.name, '(max-width: 560px) 100vw, 560px'); $('#sheet-title').textContent = p.name;
  const priced = Number.isInteger(p.priceFromCents);
  $('#sheet-price').hidden = !priced; $('#sheet-price').textContent = priced ? `a partir de ${formatCents(p.priceFromCents)}` : '';
  $('#sheet-desc').textContent = p.description || ''; $('#sheet-desc').hidden = !p.description;
  $('#sheet-note').textContent = priced ? 'Valor final combinado depois que a confeitaria analisa o pedido.' : 'Valor combinado depois que a confeitaria analisa o pedido.';
  $('#sheet-order').dataset.product = String(config.products.indexOf(p));
  if (!sheet.open) sheet.showModal();
  sheet.scrollTop = 0;
}
$('#product-sheet').addEventListener('click', (event) => { if (event.target === event.currentTarget || event.target.closest('[data-close]')) history.back(); });
$('#product-sheet').addEventListener('cancel', (event) => { event.preventDefault(); history.back(); });
$('#sheet-order').addEventListener('click', (event) => startOrder(config.products[Number(event.currentTarget.dataset.product)], true));

// ---- Pedido ----
function startOrder(product, fromSheet = false) {
  if (sent) resetForm();
  chosen = product || null; extras = new Set([...extras].filter((n) => n !== chosen?.name));
  $('#chosen').hidden = !chosen; $('#other-field').hidden = !!chosen; $('#other-product').required = !chosen;
  if (chosen) {
    const priced = Number.isInteger(chosen.priceFromCents) ? `<small>a partir de ${formatCents(chosen.priceFromCents)}</small>` : '';
    $('#chosen').innerHTML = `<div class="t">${productPhoto(chosen)}</div><div><b>${esc(chosen.name)}</b>${priced}</div><button type="button" data-change>Trocar</button>`;
  }
  renderExtras(); renderCake();
  go({ v: 'order', s: 1 }, fromSheet);
}
function chosenName() { return chosen ? chosen.name : $('#other-product').value.trim(); }
function renderExtras() {
  const others = config.products.filter((p) => p !== chosen).sort((a, b) => (b.featured ? 1 : 0) - (a.featured ? 1 : 0)).slice(0, 6);
  $('#extras-field').hidden = !others.length;
  $('#extras').innerHTML = others.map((p) => `<button type="button" data-extra="${esc(p.name)}" aria-pressed="${extras.has(p.name)}">+ ${esc(p.name)}</button>`).join('');
}
function renderCake() {
  const show = isCake(chosenName()); $('#cake-fields').hidden = !show;
  if (!show) { $('#cake-content').innerHTML = ''; return; }
  if ($('#cake-content').children.length) return;
  $('#cake-content').innerHTML = config.orderTemplate.fields.filter((f) => f.enabled).map((f) => `<div class="field"><label for="cake-${esc(f.key)}">${esc(f.label)} <span class="opt">${f.required ? '(obrigatório)' : '(opcional)'}</span></label>${f.options.length ? `<select id="cake-${esc(f.key)}" data-cake="${esc(f.key)}" ${f.required ? 'required' : ''}><option value="">Selecione</option>${f.options.map((o) => `<option>${esc(o)}</option>`).join('')}</select>` : `<input id="cake-${esc(f.key)}" data-cake="${esc(f.key)}" maxlength="${f.key === 'foodNotes' ? 500 : 200}" ${f.required ? 'required' : ''}>`}</div>`).join('');
}
function showStep(n) {
  $$('.step').forEach((s) => { s.hidden = Number(s.dataset.step) !== n; });
  $$('.progress i').forEach((bar, i) => bar.classList.toggle('on', i < n));
  $('#step-count').textContent = `Passo ${n} de 3`; $('#step-back-label').textContent = n === 1 ? 'Vitrine' : 'Voltar';
  if (n === 2) { renderQuick(); renderCalendar(); }
  window.scrollTo(0, 0);
  $(`#step-title-${n}`).focus({ preventScroll: true });
}
function stepValid(n) {
  const step = $(`.step[data-step="${n}"]`);
  if (n === 2 && !selected) { const e = $('#step2-error'); e.textContent = 'Escolha uma data disponível.'; e.hidden = false; e.scrollIntoView({ block: 'center', behavior: REDUCED ? 'auto' : 'smooth' }); return false; }
  for (const field of $$('input,select,textarea', step)) {
    if (field.closest('[hidden]') || field.type === 'hidden') continue;
    if (!field.checkValidity()) { field.reportValidity(); return false; }
  }
  return true;
}
$('#request-page').addEventListener('click', (event) => {
  const next = event.target.closest('[data-next]');
  if (next) { const target = Number(next.dataset.next); if (stepValid(target - 1)) go({ v: 'order', s: target }); return; }
  if (event.target.closest('#step-back')) { history.back(); return; }
  if (event.target.closest('[data-change]')) { history.go(-(history.state?.s || 1)); return; }
  const extra = event.target.closest('[data-extra]');
  if (extra) {
    const name = extra.dataset.extra;
    if (extras.has(name)) extras.delete(name); else if (extras.size < 5) extras.add(name);
    extra.setAttribute('aria-pressed', String(extras.has(name))); return;
  }
  const day = event.target.closest('[data-date]');
  if (day && !day.disabled) pickDate(day.dataset.date);
});
$('#other-product').addEventListener('input', renderCake);
$('#request-form').addEventListener('change', (event) => {
  if (event.target.name === 'mode') { const delivery = event.target.value === 'Entrega'; $('#address-field').hidden = !delivery; $('#location').required = delivery; }
});

// ---- Datas ----
async function refreshDates() {
  const start = today(), end = new Date(`${start}T12:00:00Z`); end.setUTCDate(end.getUTCDate() + 89);
  dates = await json(`${api}/availability?from=${start}&to=${end.toISOString().slice(0, 10)}`);
  if (!dates.some((d) => d.date === selected && d.available)) selected = '';
  month = month || (freeDates()[0] || start).slice(0, 7);
}
function pickDate(date) {
  selected = date; $('#date').value = date; $('#step2-error').hidden = true;
  if (date.slice(0, 7) !== month) month = date.slice(0, 7);
  $('#chosen-date').textContent = `Data escolhida: ${brDate(date, { weekday: 'long', day: 'numeric', month: 'long' })}. A vaga é conferida de novo no envio.`;
  renderQuick(); renderCalendar();
  $(`#calendar-days [data-date="${date}"]`)?.focus({ preventScroll: true });
}
function renderQuick() {
  const free = freeDates().slice(0, 6); $('#quick-field').hidden = !free.length;
  $('#quick-dates').innerHTML = free.map((d) => `<button type="button" data-date="${d}" aria-pressed="${d === selected}" aria-label="${esc(brDate(d, { weekday: 'long', day: 'numeric', month: 'long' }))}"><small>${esc(brDate(d, { weekday: 'short' }).replace('.', ''))}</small><b>${Number(d.slice(8))}</b></button>`).join('');
}
function renderCalendar() {
  const [year, m] = month.split('-').map(Number), first = new Date(Date.UTC(year, m - 1, 1)), count = new Date(Date.UTC(year, m, 0)).getUTCDate();
  const title = new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(first);
  $('#month-title').textContent = title[0].toUpperCase() + title.slice(1);
  let html = '<span></span>'.repeat((first.getUTCDay() + 6) % 7);
  for (let day = 1; day <= count; day++) {
    const value = `${month}-${String(day).padStart(2, '0')}`, available = dates.find((d) => d.date === value)?.available;
    html += `<button type="button" data-date="${value}" ${available ? '' : 'disabled'} aria-label="${esc(brDate(value))}${available ? '' : ', indisponível'}" aria-pressed="${value === selected}">${day}</button>`;
  }
  $('#calendar-days').innerHTML = html;
  $('#previous-month').disabled = month <= dates[0]?.date.slice(0, 7); $('#next-month').disabled = month >= dates.at(-1)?.date.slice(0, 7);
}
for (const [id, step] of [['previous-month', -1], ['next-month', 1]]) $('#' + id).addEventListener('click', () => { const [y, m] = month.split('-').map(Number); month = new Date(Date.UTC(y, m - 1 + step, 1)).toISOString().slice(0, 7); renderCalendar(); });

// ---- Envio ----
$('#request-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const error = $('#form-error'); error.hidden = true;
  if (!stepValid(3)) return;
  const send = $('#send'); send.disabled = true; send.textContent = 'Enviando…';
  try {
    const data = await json(`${api}/requests`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({
      product: chosenName(), other: !chosen, extras: [...extras], date: selected, time: $('#time').value, mode: $('input[name=mode]:checked').value, location: $('#location').value,
      details: $('#details').value, client: $('#client').value, contact: $('#contact').value, consent: $('#consent').checked, website: $('#website').value,
      cake: Object.fromEntries($$('[data-cake]').map((el) => [el.dataset.cake, el.value])) }) });
    sent = true;
    $('#done-title').textContent = `Pedido enviado para ${config.displayName}`; $('#code').textContent = data.code; $('#summary').textContent = data.summary;
    const wa = $('#whatsapp-link');
    if (data.whatsapp) { wa.href = `https://wa.me/${data.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(data.summary)}`; wa.hidden = false; $('#no-whatsapp').hidden = true; } else { wa.hidden = true; $('#no-whatsapp').hidden = false; }
    go({ v: 'done' }, true);
  } catch (failure) {
    if (failure.code === 'DATE_UNAVAILABLE') {
      await refreshDates().catch(() => {});
      go({ v: 'order', s: 2 });
      const e = $('#step2-error'); e.textContent = failure.message; e.hidden = false;
    } else { error.textContent = failure.message; error.hidden = false; }
  } finally { send.disabled = false; send.textContent = 'Enviar pedido'; }
});
function resetForm() {
  $('#request-form').reset(); $('#cake-content').innerHTML = ''; $('#address-field').hidden = true; $('#location').required = false;
  selected = ''; extras = new Set(); sent = false; $('#form-error').hidden = true; $('#step2-error').hidden = true;
  $('#chosen-date').textContent = 'Riscado: fechado, lotado ou sem antecedência. A vaga é conferida de novo no envio.';
}
$('#back-home').addEventListener('click', () => { resetForm(); go({ v: 'home' }); });

// ---- Vitrine: cliques ----
$('#vitrine').addEventListener('click', (event) => {
  const card = event.target.closest('[data-product]');
  if (card) { go({ v: 'sheet', p: Number(card.dataset.product) }); return; }
  if (event.target.closest('[data-other]')) { startOrder(null); return; }
  const jump = event.target.closest('[data-jump]');
  if (jump) {
    $$('.chips button').forEach((b) => b.setAttribute('aria-pressed', String(b === jump)));
    const target = $(`[data-group="${jump.dataset.jump}"]`), offset = $('.chips').offsetHeight + 8;
    if (target) window.scrollTo({ top: target.getBoundingClientRect().top + window.scrollY - offset, behavior: REDUCED ? 'auto' : 'smooth' });
  }
});

// ---- Início ----
function readInjected() {
  // B3: o servidor da Cloudflare pode entregar a página já com os dados, sem esperar outra busca.
  const el = document.getElementById('vitrine-data');
  if (!el || PREVIEW) return null;
  try { return JSON.parse(el.textContent); } catch { return null; }
}
async function start() {
  try {
    config = readInjected() || await json(api);
    if (!config.active) {
      $('#loading').hidden = true; $('#unavailable').hidden = false;
      $('#unavailable-title').textContent = 'Encomendas pausadas'; $('#unavailable-message').textContent = config.message; return;
    }
    config.products = Array.isArray(config.products) ? config.products : [];
    config.orderTemplate = config.orderTemplate || { fields: [] };
    applyTheme();
    await refreshDates();
    renderHome();
    $('#consent-business').textContent = config.displayName;
    $('#send-note').textContent = `Nenhum pagamento agora. Enviar não confirma nem reserva a data: ${config.displayName} responde pelo WhatsApp.`;
    $('#loading').hidden = true; $('#vitrine').hidden = false;
    history.replaceState({ v: 'home' }, '');
  } catch (error) {
    $('#loading').hidden = true; $('#unavailable').hidden = false;
    $('#unavailable-message').textContent = error.status === 404 ? 'Não encontramos esta página de encomenda. Confira o endereço do link.' : 'Não conseguimos abrir a confeitaria agora. Verifique a internet e tente de novo.';
    $('#retry').hidden = error.status === 404;
  }
}
$('#retry').addEventListener('click', () => location.reload());
// Inside the app the preview window already says it is a preview; opened alone, the page says it.
if (PREVIEW && window.top === window) document.addEventListener('DOMContentLoaded', () => {
  const draft = previewDraft(), missing = [!draft.products?.length && 'seus produtos', (!draft.displayName || draft.displayName === 'Sua confeitaria') && 'o nome da confeitaria'].filter(Boolean);
  document.body.insertAdjacentHTML('afterbegin', `<div class="preview-banner" role="note"><strong>Prévia.</strong> É assim que sua cliente vê o link. Nada é enviado.${missing.length ? `<br>Falta preencher ${missing.join(' e ')} nos Ajustes.` : ''}</div>`);
});
start();
