// Meu link na tela nova: o assistente de 3 passos do app.js (O4) e o editor completo da vitrine (Etapa 3B).
// Nome e endereço, WhatsApp opcional; até 3 doces no assistente rápido ou até 30 doces, estilo, cor e fotos
// no editor completo. Salvar manda o orderPage inteiro lido do servidor agora, só com a mudança.
// Na demonstração o último passo só mostra a prévia (/encomenda/?preview=1), e nada é ativado.
import { usesCakeFields } from '../../cloud/order-link-model.js';
import { orderSlots } from '../../cloud/state-engine.js';
import { DEFAULT_COLOR, VITRINE_PRESETS, VITRINE_STYLE_INFO, formatCents, initials, photoAttrs, photoUrl, vitrinePalette } from '../../cloud/vitrine-theme.js';
import { blobToBase64, dominantColor, preparePhoto, shareImage } from '../photo-prep.js';
import * as M from './model.js';
import { $, api, app, closeSheet, copy, esc, openSheet, reload, toast } from './ui.js';

const LINK_BASE = 'lucast.app/p/';
const LINK_PREVIEW_KEY = 'doce-agenda.link-preview';
const TITLES = ['Como a cliente te encontra', 'O que você vende', 'Pronto para ir ao ar'];
let wizard = null;
const vitrineCanvases = { logo: null, cover: null };

export function openLink() {
  const page = app.state.orderPage || {};
  if (!page.active || !page.slug) { openWizard(); return; }
  wizard = null;
  const url = `${LINK_BASE}${page.slug}`;
  // Na demonstração o link não está no servidor: "Ver como a cliente vê" é a prévia, não o endereço.
  const see = app.demo
    ? '<button class="btn btn-outline" type="button" data-act="preview-link">Ver como a cliente vê</button>'
    : `<a class="btn btn-outline" href="/p/${esc(page.slug)}" target="_blank" rel="noopener">Ver como a cliente vê</a>`;
  openSheet(`<h2 id="sheet-title" tabindex="-1">Meu link</h2><p>Mande este endereço para a cliente escolher o doce e a data.</p>
    <p class="link-url" id="link-url">${esc(url)}</p>
    <button class="btn btn-primary" type="button" data-act="copy-link">Copiar link</button>
    ${see}
    <button class="btn btn-outline" type="button" data-act="open-vitrine">Fotos, estilo e doces</button>
    <button class="btn btn-outline" type="button" data-act="edit-link">Editar nome e doces</button>`);
}
export async function copyLink() {
  toast(await copy(`https://${LINK_BASE}${app.state.orderPage.slug}`) ? 'Link copiado.' : 'Não deu para copiar. Selecione o endereço e copie.');
}

export function openWizard(back = null) {
  const page = app.state.orderPage || {}, first = (page.products || []).slice(0, 3);
  wizard = {
    step: 1, back, displayName: page.displayName || '', slug: page.slug || '', slugEdited: !!page.slug, whatsapp: page.whatsapp || '',
    products: [0, 1, 2].map((i) => ({ name: first[i]?.name || '', price: Number.isInteger(first[i]?.priceFromCents) ? M.centsInput(first[i].priceFromCents) : '' })),
  };
  renderWizard();
}

function renderWizard(errorText = '') {
  const w = wizard, cloud = !app.demo;
  const body = w.step === 1
    ? `<label class="field"><span>Nome da confeitaria</span><input name="displayName" maxlength="60" value="${esc(w.displayName)}" placeholder="Ex.: Doces da Ana" autocomplete="organization"></label>
      <label class="field"><span>Endereço do link</span><span class="slug-field"><span class="slug-prefix" aria-hidden="true">${esc(LINK_BASE)}</span><input name="slug" maxlength="40" value="${esc(w.slug)}" autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="preenche sozinho" aria-label="Endereço do link, depois de ${esc(LINK_BASE)}"></span></label>
      <label class="field"><span>Seu WhatsApp <small>(opcional)</small></span><input name="whatsapp" type="tel" maxlength="30" value="${esc(w.whatsapp)}" placeholder="(11) 99999-9999" autocomplete="tel" aria-describedby="lw-whatsapp-help"><small class="muted" id="lw-whatsapp-help">A cliente pode te avisar no WhatsApp depois de mandar o pedido.</small></label>`
    : w.step === 2
      ? `<p class="muted">Até 3 doces para começar. O valor é opcional: sem ele, a vitrine diz que o preço é combinado depois.</p>
        ${w.products.map((product, i) => `<div class="lw-product"><label class="field"><span>Doce ${i + 1}${i ? ' <small>(opcional)</small>' : ''}</span><input data-product="name" data-index="${i}" maxlength="80" value="${esc(product.name)}" placeholder="${['Ex.: Bolo de aniversário', 'Ex.: Brigadeiro (cento)', 'Ex.: Torta de limão'][i]}"></label><label class="field lw-price"><span>A partir de</span><input data-product="price" data-index="${i}" inputmode="decimal" maxlength="12" value="${esc(product.price)}" placeholder="R$"></label></div>`).join('')}`
      : `<p class="link-url">${esc(LINK_BASE)}<b>${esc(w.slug)}</b></p>
        <ul class="lw-summary"><li><b>${esc(w.displayName)}</b>${w.whatsapp ? ` · ${esc(w.whatsapp)}` : ''}</li><li>${esc(w.products.filter((p) => p.name.trim()).map((p) => p.name.trim()).join(', '))}</li></ul>
        <p class="muted">${cloud ? 'Os pedidos chegam no aviso do topo da Agenda e só entram no dia quando você aceita.' : 'No exemplo o link não vai ao ar. Na sua conta, este passo liga o link e já copia o endereço.'}</p>`;
  const primary = w.step < 3 ? 'Continuar' : cloud ? 'Ativar e copiar link' : 'Ver como a cliente vê';
  openSheet(`<form id="link-wizard" novalidate><p class="lw-step">Passo ${w.step} de 3</p><h2 id="sheet-title" tabindex="-1">${TITLES[w.step - 1]}</h2>
    ${body}
    <p class="form-error" id="link-wizard-error" role="alert"${errorText ? '' : ' hidden'}>${esc(errorText)}</p>
    <div class="f-main">${w.step > 1 ? '<button class="btn btn-outline" type="submit" value="back">Voltar</button>' : ''}${w.step === 3 && cloud ? '<button class="btn btn-outline" type="submit" value="preview">Ver prévia</button>' : ''}<button class="btn btn-primary" type="submit" value="next">${primary}</button></div>
    ${w.step === 1 ? '<button class="link-btn" type="button" data-act="open-vitrine">Fotos, estilo e todos os doces</button>' : ''}
    ${w.step === 1 && app.demo ? '<button class="link-btn" type="button" data-act="preview-link">Ver como a cliente vê o exemplo da Doces da Lu</button>' : ''}
  </form>`, w.step === 1 ? w.back : null);
  if (errorText) $('#link-wizard-error').scrollIntoView({ block: 'nearest' });
  else $('#link-wizard input')?.focus({ preventScroll: true });
}

// O que ela digita fica no assistente ao voltar e avançar; o endereço segue o nome até ela mexer nele.
export function onWizardInput(field) {
  const w = wizard;
  if (!w) return;
  if (field.name === 'displayName') {
    w.displayName = field.value;
    if (!w.slugEdited) { w.slug = M.slugFrom(field.value); $('#link-wizard [name=slug]').value = w.slug; }
  } else if (field.name === 'slug') { w.slugEdited = true; w.slug = field.value; } else if (field.name === 'whatsapp') w.whatsapp = field.value;
  else if (field.dataset.product) w.products[Number(field.dataset.index)][field.dataset.product] = field.value;
}

// Os 3 primeiros doces são os do passo 2 (foto, descrição e categoria continuam); os outros ficam como estão.
function wizardValues(page) {
  const w = wizard, typed = [];
  for (const product of w.products) {
    const name = product.name.trim(), price = M.parseMoney(product.price);
    if (!name) continue;
    if (Number.isNaN(price)) throw new Error(`Confira o valor de ${name}: use só números, como 150 ou 89,90.`);
    typed.push({ name, price });
  }
  const list = page.products || [], kept = list.slice(0, 3);
  const products = typed.map(({ name, price }, i) => {
    const before = kept.find((item) => item.name === name) || (kept[i] && !typed.some((t) => t.name === kept[i].name) ? kept[i] : {});
    const product = { ...before, name };
    if (price === null) delete product.priceFromCents; else product.priceFromCents = price;
    return product;
  });
  return { ...page, displayName: w.displayName.trim(), slug: M.slugFrom(w.slug), whatsapp: w.whatsapp.trim(), products: [...products, ...list.slice(3)] };
}

export async function wizardNext(intent) {
  const w = wizard, cloud = !app.demo;
  if (!w) return;
  if (intent === 'back') { w.step -= 1; renderWizard(); return; }
  if (w.step === 1) {
    const slug = M.slugFrom(w.slug), digits = w.whatsapp.replace(/\D/g, '');
    if (!w.displayName.trim()) return renderWizard('Escreva o nome da confeitaria.');
    if (!/^[a-z0-9](?:[a-z0-9-]{1,38})[a-z0-9]$/.test(slug)) return renderWizard('O endereço precisa de pelo menos 3 letras ou números.');
    if (w.whatsapp.trim() && (digits.length < 10 || digits.length > 13)) return renderWizard('Confira o WhatsApp: com DDD, como (11) 99999-9999.');
    w.slug = slug; w.step = 2; renderWizard(); return;
  }
  let values;
  try { values = wizardValues(app.state.orderPage); } catch (failure) { return renderWizard(failure.message); }
  if (w.step === 2) {
    if (!values.products.length) return renderWizard('Escreva pelo menos um doce.');
    w.step = 3; renderWizard(); return;
  }
  if (intent === 'preview' || !cloud) { showPreview(values, () => renderWizard()); return; }
  const buttons = [...document.querySelectorAll('#link-wizard [type=submit]')];
  buttons.forEach((button) => { button.disabled = true; });
  try {
    // A vitrine inteira como está no servidor agora, só com o que o assistente muda.
    const current = await api('/order-page');
    await api('/order-page', { method: 'PUT', body: { ...wizardValues(current), active: true } });
    await reload();
    wizard = null;
    closeSheet();
    const copied = await copy(`https://${LINK_BASE}${app.state.orderPage.slug}`);
    toast(copied ? 'Seu link está no ar! O endereço foi copiado: cole na bio ou no WhatsApp.' : 'Seu link está no ar! Toque em Meu link para copiar o endereço.');
  } catch (failure) {
    if (failure.code === 'SLUG_TAKEN') { w.step = 1; renderWizard('Este endereço já está em uso. Troque por outro, como o nome com a cidade.'); } else renderWizard(failure.message);
  } finally { buttons.forEach((button) => { button.disabled = false; }); }
}

// ---- Editor completo da vitrine (Fotos, estilo e todos os doces) ----
const productThumb = (product) => product.photo
  ? `<img src="${esc(photoUrl(product.photo))}" ${photoAttrs(product.photo, '64px')} alt="" loading="lazy" decoding="async">`
  : `<span aria-hidden="true">${esc((product.name || '?')[0])}</span>`;
const productMeta = (product) => [
  product.category,
  Number.isInteger(product.priceFromCents) ? `a partir de ${formatCents(product.priceFromCents)}` : '',
  product.featured ? 'mais pedido' : '',
].filter(Boolean).join(' · ') || 'Toque para editar';

function productRowMarkup(product = { name: '', description: '' }, open = false) {
  const cloud = !app.demo, slots = orderSlots(product);
  const slotOptions = [...new Set([1, 2, 3, 4, 5, ...(slots > 5 ? [slots] : [])])];
  return `<details class="product-item"${open ? ' open' : ''}>
    <summary><span class="pi-thumb">${productThumb(product)}</span><span class="pi-text"><b>${esc(product.name || 'Novo doce')}</b><small>${esc(productMeta(product))}</small></span></summary>
    <div class="pi-body">
      <input type="hidden" name="productPhoto" value="${esc(product.photo || '')}">
      <div class="media-pick"><span class="media-preview pi-photo">${productThumb(product)}</span><span class="media-actions"><label class="btn btn-outline btn-small upload-button">${product.photo ? 'Trocar foto' : 'Pôr foto'}<input type="file" accept="image/*" data-photo="product" ${cloud ? '' : 'disabled'}></label><button class="link-btn" type="button" data-act="remove-photo" data-target="product" ${product.photo ? '' : 'hidden'}>Tirar foto</button></span><small class="photo-status" role="status"></small></div>
      <label class="field"><span>Nome</span><input name="productName" maxlength="80" value="${esc(product.name)}" placeholder="Ex.: Bolo de aniversário"></label>
      <label class="field"><span>Descrição <small>(opcional)</small></span><textarea name="productDescription" maxlength="160" rows="2" placeholder="Ex.: massa e recheio à sua escolha, a partir de 1 kg">${esc(product.description)}</textarea></label>
      <div class="pi-two">
        <label class="field"><span>Categoria <small>(opcional)</small></span><input name="productCategory" maxlength="30" list="product-categories" value="${esc(product.category || '')}" placeholder="Ex.: Bolos"></label>
        <label class="field"><span>A partir de <small>(opcional)</small></span><span class="money-field"><span aria-hidden="true">R$</span><input name="productPrice" inputmode="decimal" maxlength="12" value="${esc(Number.isInteger(product.priceFromCents) ? M.centsInput(product.priceFromCents) : '')}" placeholder="0"></span></label>
      </div>
      <label class="check"><input type="checkbox" name="productFeatured" ${product.featured ? 'checked' : ''}><span>Mostrar em <b>Mais pedidos</b> <small>(até 3)</small></span></label>
      <label class="field pi-slots"><span>Tamanho no dia</span><select name="productSlots">${slotOptions.map((n) => `<option value="${n}" ${slots === n ? 'selected' : ''}>${n === 1 ? '1 pedido (normal)' : `Vale por ${n} pedidos`}</option>`).join('')}</select></label>
      <label class="check"><input type="checkbox" name="productCakeFields" ${usesCakeFields(product) ? 'checked' : ''} ${typeof product.cakeFields === 'boolean' ? '' : 'data-auto="true"'}><span>Pedir os <b>detalhes do bolo</b> <small>(sabor, recheio e tamanho)</small></span></label>
      <div class="pi-actions"><button class="btn btn-outline btn-small" type="button" data-act="move-product" data-step="-1">Subir</button><button class="btn btn-outline btn-small" type="button" data-act="move-product" data-step="1">Descer</button><button class="link-btn pi-remove" type="button" data-act="remove-product">Remover</button></div>
    </div></details>`;
}

function mediaPickMarkup(kind, label, key, displayName, cloud) {
  const preview = key ? `<img src="${esc(photoUrl(key))}" alt="">` : `<span aria-hidden="true">${kind === 'logo' ? esc(initials(displayName)) : 'Sem capa'}</span>`;
  return `<div class="field"><span>${label} <small>(opcional)</small></span><div class="media-pick media-${kind}"><span class="media-preview" data-preview="${kind}">${preview}</span><span class="media-actions"><label class="btn btn-outline btn-small upload-button">${key ? 'Trocar' : 'Enviar'}<input type="file" accept="image/*" data-photo="${kind}" ${cloud ? '' : 'disabled'}></label><button class="link-btn" type="button" data-act="remove-photo" data-target="${kind}" ${key ? '' : 'hidden'}>Remover</button></span><small class="photo-status" role="status"></small></div></div>`;
}

function vitrineStyleMarkup(p) {
  const chosenStyle = p.style || 'atelie', color = p.color || DEFAULT_COLOR, preset = VITRINE_PRESETS.some(([, value]) => value === color);
  const palette = vitrinePalette(color);
  return `<div class="style-cards" role="radiogroup" aria-label="Estilo da vitrine">${Object.entries(VITRINE_STYLE_INFO).map(([key, info]) => `<label class="style-card"><input type="radio" name="style" value="${key}" ${chosenStyle === key ? 'checked' : ''}><span class="style-aa" style="font-family:${info.font.replace(/"/g, "'")};font-weight:${info.weight};color:${palette.ink}">Aa</span><b>${info.name}</b><small>${info.hint}</small></label>`).join('')}</div>
    <div class="field"><span>Cor</span><div class="color-row" role="radiogroup" aria-label="Cor da vitrine">${VITRINE_PRESETS.map(([name, value]) => `<label class="swatch" title="${name}"><input type="radio" name="color" value="${value}" ${color === value ? 'checked' : ''} aria-label="${name}"><i style="background:${value}"></i></label>`).join('')}<label class="swatch custom-swatch"><input type="radio" name="color" value="${preset ? '#f2c94c' : esc(color)}" ${preset ? '' : 'checked'} aria-label="Outra cor"><input type="color" class="color-picker" value="${preset ? '#f2c94c' : esc(color)}" aria-label="Escolher outra cor"><span>Outra</span></label></div>
    <small id="color-note" class="color-note muted"${palette.adjusted ? '' : ' hidden'}>Essa cor deixaria o texto dos botões difícil de ler. A vitrine usa um tom mais escuro dela nos botões.</small></div>`;
}

export function openVitrineEditor(back = null, draft = null) {
  const p = draft || app.state.orderPage || {}, cloud = !app.demo, live = cloud && p.active && p.slug;
  const backFn = back || (wizard ? () => renderWizard() : (p.active && p.slug ? openLink : () => openWizard()));
  if (!draft) { vitrineCanvases.logo = null; vitrineCanvases.cover = null; }
  const products = (p.products || []).length ? p.products : [{ name: '', description: '' }];
  const categories = [...new Set(['Bolos', 'Docinhos', 'Tortas', 'Presentes', ...(p.products || []).map((item) => item.category).filter(Boolean)])];
  const actions = !cloud
    ? '<div class="f-main"><button class="btn btn-primary" type="button" data-act="preview-vitrine">Ver como a cliente vê</button></div>'
    : live
      ? '<div class="f-main"><button class="btn btn-primary" type="submit" name="intent" value="save">Salvar alterações</button><button class="btn btn-outline" type="button" data-act="preview-vitrine">Ver prévia</button></div><div class="f-footer"><button class="link-btn pi-remove" type="submit" name="intent" value="pause">Pausar link</button></div>'
      : '<div class="f-main"><button class="btn btn-primary" type="submit" name="intent" value="activate">Ativar meu link</button><button class="btn btn-outline" type="button" data-act="preview-vitrine">Ver como a cliente vê</button></div><div class="f-footer"><button class="link-btn" type="submit" name="intent" value="save">Salvar sem ativar</button></div>';
  openSheet(`<form id="vitrine-form" class="vitrine-form" novalidate>
    <h2 id="sheet-title" tabindex="-1">Fotos, estilo e doces</h2>
    <p class="muted">${cloud ? 'Escolha as fotos, o estilo e todos os doces que aparecem no seu link.' : 'No exemplo você pode testar o estilo, a cor e os doces e abrir a prévia. Com sua conta, você envia suas próprias fotos e publica o link.'}</p>
    <input type="hidden" name="logo" value="${esc(p.logo || '')}"><input type="hidden" name="cover" value="${esc(p.cover || '')}"><input type="hidden" name="share" value="${esc(p.share || '')}">
    <fieldset class="f-block link-step"><legend>1. Sua marca</legend>
      <label class="field"><span>Nome da confeitaria</span><input name="displayName" maxlength="60" value="${esc(p.displayName || '')}" placeholder="Como sua confeitaria se chama?" autocomplete="organization"></label>
      <label class="field"><span>Frase de apresentação <small>(opcional)</small></span><textarea name="welcome" maxlength="280" rows="2" placeholder="Ex.: Bolos e docinhos feitos em casa, sob encomenda, em Campinas.">${esc(p.welcome || '')}</textarea></label>
      <label class="field"><span>Instagram <small>(opcional)</small></span><input name="instagram" maxlength="60" value="${p.instagram ? '@' + esc(p.instagram.replace(/^@/, '')) : ''}" placeholder="@suaconfeitaria" autocapitalize="none" spellcheck="false"></label>
      ${mediaPickMarkup('logo', 'Logo', p.logo, p.displayName, cloud)}${mediaPickMarkup('cover', 'Foto de capa', p.cover, p.displayName, cloud)}
      <p class="muted link-step-note">${cloud ? 'Sem logo, o nome vira a marca, na letra do estilo. As fotos são reduzidas no seu celular e perdem a localização antes de enviar.' : 'Na demonstração, as fotos são exemplos. Com sua conta, você envia as suas.'}</p></fieldset>
    <fieldset class="f-block link-step"><legend>2. Estilo e cor</legend>${vitrineStyleMarkup(p)}</fieldset>
    <fieldset class="f-block link-step"><legend>3. Seus doces</legend>
      <p class="muted link-step-note">Valor "a partir de" é opcional: sem ele, a vitrine diz que o valor é combinado depois. Categorias aparecem quando há doces suficientes.</p>
      <datalist id="product-categories">${categories.map((c) => `<option value="${esc(c)}"></option>`).join('')}</datalist>
      <div class="product-list" id="product-list">${products.map((item) => productRowMarkup(item, !item.name)).join('')}</div>
      <button class="btn btn-outline btn-small add-product" type="button" data-act="add-product">+ Adicionar doce</button>
      <p class="muted link-step-note">A cliente também pode descrever um doce que não está na lista.</p></fieldset>
    <fieldset class="f-block link-step"><legend>4. Seu link</legend>
      <label class="field"><span>Endereço</span><span class="slug-field"><span class="slug-prefix" aria-hidden="true">${esc(LINK_BASE)}</span><input name="slug" maxlength="40" value="${esc(p.slug || '')}" ${p.slug ? 'data-edited="true"' : ''} autocapitalize="none" autocomplete="off" spellcheck="false" placeholder="preenche sozinho com o nome" aria-label="Endereço do link, depois de ${esc(LINK_BASE)}"></span><small class="muted">Criado a partir do nome. Pode trocar: letras, números e hífen.</small></label>
      <label class="field"><span>Seu WhatsApp <small>(opcional)</small></span><input name="whatsapp" type="tel" maxlength="30" value="${esc(p.whatsapp || '')}" placeholder="(11) 99999-9999" autocomplete="tel"><small class="muted">Com o número, a cliente pode te avisar no WhatsApp depois de mandar o pedido.</small></label></fieldset>
    <p class="muted link-step-note">Ao ativar, você recebe os dados da cliente para atender a encomenda, conforme a <a href="/privacidade/" target="_blank" rel="noopener">política de privacidade</a>.</p>
    <p id="vitrine-error" class="form-error" role="alert" hidden></p>
    ${actions}
  </form>`, backFn);
}

export function vitrineFormValues(form = $('#vitrine-form')) {
  const data = new FormData(form), value = (name) => String(data.get(name) || '').trim();
  const products = [...form.querySelectorAll('.product-item')].map((row) => {
    const field = (name) => row.querySelector(`[name=${name}]`), name = field('productName').value.trim();
    const product = { name, description: field('productDescription').value.trim() };
    const category = field('productCategory').value.trim(), price = M.parseMoney(field('productPrice').value), photo = field('productPhoto').value;
    if (Number.isNaN(price)) throw new Error(`Confira o valor "a partir de" de ${name || 'um doce'}: use só números, como 150 ou 89,90.`);
    if (category) product.category = category;
    if (price !== null) product.priceFromCents = price;
    if (field('productFeatured').checked) product.featured = true;
    const slots = Number(field('productSlots')?.value) || 1;
    if (slots > 1) product.slots = slots;
    const cake = field('productCakeFields');
    if (cake && !cake.dataset.auto) product.cakeFields = cake.checked;
    if (photo) product.photo = photo;
    return product;
  }).filter((product) => product.name);
  return {
    displayName: value('displayName'), slug: M.slugFrom(value('slug')), welcome: value('welcome'), whatsapp: value('whatsapp'), products,
    style: value('style') || 'atelie', color: value('color'), instagram: value('instagram'), logo: value('logo'), cover: value('cover'), share: value('share'),
  };
}

export function addProductRow() {
  const list = $('#product-list');
  if (!list) return;
  if (list.children.length >= 30) { toast('O link aceita até 30 doces.'); return; }
  list.insertAdjacentHTML('beforeend', productRowMarkup(undefined, true));
  list.lastElementChild.querySelector('[name=productName]')?.focus();
}

export function removeProductRow(button) {
  const list = $('#product-list'), row = button.closest('.product-item');
  if (!list || !row) return;
  row.remove();
  if (!list.children.length) list.insertAdjacentHTML('beforeend', productRowMarkup(undefined, true));
}

export function moveProductRow(button) {
  const row = button.closest('.product-item'), step = Number(button.dataset.step);
  const sibling = step < 0 ? row?.previousElementSibling : row?.nextElementSibling;
  if (!row || !sibling) return;
  if (step < 0) sibling.before(row); else sibling.after(row);
  button.focus();
}

export function onVitrineInput(event) {
  const target = event.target, form = target.closest('#vitrine-form');
  if (!form) return;
  if (target.name === 'slug') target.dataset.edited = 'true';
  if (target.name === 'displayName') {
    const slug = form.querySelector('[name=slug]');
    if (slug && !slug.dataset.edited) slug.value = M.slugFrom(target.value);
    if (!form.elements.logo.value) {
      const preview = form.querySelector('[data-preview="logo"]');
      if (preview) preview.innerHTML = `<span aria-hidden="true">${esc(initials(target.value))}</span>`;
    }
  }
  if (target.name === 'productName') {
    const cake = target.closest('.product-item')?.querySelector('[name=productCakeFields]');
    if (cake?.dataset.auto) cake.checked = usesCakeFields(null, target.value);
  }
  if (target.name === 'productCakeFields') delete target.dataset.auto;
  const row = target.closest('.product-item');
  if (row) {
    const name = row.querySelector('[name=productName]').value.trim(), price = M.parseMoney(row.querySelector('[name=productPrice]').value);
    const product = { name, category: row.querySelector('[name=productCategory]').value.trim(), priceFromCents: Number.isNaN(price) ? null : price, featured: row.querySelector('[name=productFeatured]').checked, photo: row.querySelector('[name=productPhoto]').value };
    row.querySelector('.pi-text b').textContent = name || 'Novo doce';
    row.querySelector('.pi-text small').textContent = productMeta(product);
    if (!product.photo) row.querySelector('.pi-thumb').innerHTML = row.querySelector('.pi-photo').innerHTML = productThumb(product);
    if (target.name === 'productFeatured' && target.checked && form.querySelectorAll('[name=productFeatured]:checked').length > 3) {
      target.checked = false;
      toast('Escolha até 3 doces para Mais pedidos.');
      row.querySelector('.pi-text small').textContent = productMeta({ ...product, featured: false });
    }
  }
  if (target.classList?.contains('color-picker')) {
    const radio = target.closest('.custom-swatch').querySelector('[name=color]');
    radio.value = target.value; radio.checked = true;
  }
  if (target.name === 'color' || target.classList?.contains('color-picker')) {
    const color = form.querySelector('[name=color]:checked')?.value;
    const palette = vitrinePalette(color);
    $('#color-note').hidden = !palette.adjusted;
    form.querySelectorAll('.style-aa').forEach((sample) => { sample.style.color = palette.ink; });
  }
}

export function onVitrineChange(event) {
  const target = event.target;
  if (target.name === 'slug') target.value = M.slugFrom(target.value);
  if (target.matches('[data-photo]')) handlePhotoPick(target);
}

const kb = (bytes) => bytes >= 1048576 ? `${(bytes / 1048576).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`;
async function uploadPhoto(blob) {
  const { key } = await api('/vitrine/fotos', { method: 'POST', body: { type: blob.type, data: await blobToBase64(blob) } });
  return key;
}
async function refreshShareImage(form) {
  const share = form.elements.share;
  if (!vitrineCanvases.cover && !vitrineCanvases.logo) { if (!form.elements.cover.value && !form.elements.logo.value) share.value = ''; return; }
  const tint = vitrinePalette(form.querySelector('[name=color]:checked')?.value).tint;
  share.value = await uploadPhoto(await shareImage({ cover: vitrineCanvases.cover, logo: vitrineCanvases.logo, tint }));
}
function suggestLogoColor(form, color) {
  const row = form.querySelector('.color-row');
  let label = row.querySelector('.logo-swatch');
  if (!label) {
    row.insertAdjacentHTML('afterbegin', '<label class="swatch logo-swatch" title="Cor do seu logo"><input type="radio" name="color" aria-label="Cor do seu logo"><i></i><span>Do logo</span></label>');
    label = row.querySelector('.logo-swatch');
  }
  const radio = label.querySelector('input');
  radio.value = color; label.querySelector('i').style.background = color; radio.checked = true;
  radio.dispatchEvent(new Event('input', { bubbles: true }));
}

export async function handlePhotoPick(input) {
  const file = input.files?.[0], kind = input.dataset.photo, form = input.form, row = input.closest('.product-item'), pick = input.closest('.media-pick');
  const status = pick.querySelector('.photo-status');
  input.value = '';
  if (!file) return;
  const buttons = [...form.querySelectorAll('[type=submit]')];
  buttons.forEach((button) => { button.disabled = true; });
  status.textContent = 'Preparando a foto…';
  try {
    const prepared = await preparePhoto(file, kind === 'product' ? 'product' : kind);
    status.textContent = 'Enviando…';
    const key = await uploadPhoto(prepared.blob), url = URL.createObjectURL(prepared.blob);
    if (row) {
      row.querySelector('[name=productPhoto]').value = key;
      row.querySelector('.pi-thumb').innerHTML = row.querySelector('.pi-photo').innerHTML = `<img src="${url}" alt="">`;
    } else {
      form.elements[kind].value = key;
      pick.querySelector('.media-preview').innerHTML = `<img src="${url}" alt="">`;
      vitrineCanvases[kind] = prepared.canvas;
      if (kind === 'logo') { const color = dominantColor(prepared.canvas); if (color) suggestLogoColor(form, color); }
      await refreshShareImage(form);
    }
    pick.querySelector('[data-act=remove-photo]').hidden = false;
    pick.querySelector('.upload-button').firstChild.textContent = kind === 'product' ? 'Trocar foto' : 'Trocar';
    status.textContent = `Foto pronta (${kb(prepared.before)} → ${kb(prepared.blob.size)}). Toque em Salvar para publicar.`;
  } catch (failure) {
    status.textContent = failure.status === 0 || failure instanceof TypeError ? 'Sem internet. A foto não foi enviada; tente de novo.' : (failure.message || 'Não deu para enviar a foto. Tente de novo.');
  } finally { buttons.forEach((button) => { button.disabled = false; }); }
}

export async function removePhoto(button) {
  const form = button.form || button.closest('form'), kind = button.dataset.target, row = button.closest('.product-item'), pick = button.closest('.media-pick');
  if (row) {
    row.querySelector('[name=productPhoto]').value = '';
    const product = { name: row.querySelector('[name=productName]').value };
    row.querySelector('.pi-thumb').innerHTML = row.querySelector('.pi-photo').innerHTML = productThumb(product);
  } else {
    form.elements[kind].value = ''; vitrineCanvases[kind] = null;
    pick.querySelector('.media-preview').innerHTML = `<span aria-hidden="true">${kind === 'logo' ? esc(initials(form.elements.displayName.value)) : 'Sem capa'}</span>`;
    try { await refreshShareImage(form); } catch { form.elements.share.value = ''; }
  }
  button.hidden = true;
  pick.querySelector('.upload-button').firstChild.textContent = kind === 'product' ? 'Pôr foto' : 'Enviar';
  pick.querySelector('.photo-status').textContent = 'Foto retirada. Toque em Salvar para publicar.';
}

export function previewFromVitrine() {
  const form = $('#vitrine-form');
  if (!form) return;
  let values;
  try { values = vitrineFormValues(form); } catch (failure) {
    const error = $('#vitrine-error');
    if (error) { error.textContent = failure.message; error.hidden = false; error.scrollIntoView({ block: 'nearest' }); }
    toast(failure.message);
    return;
  }
  const back = app.back;
  showPreview({ ...app.state.orderPage, ...values }, () => openVitrineEditor(back, { ...app.state.orderPage, ...values }));
}

export async function submitVitrine(form, intent = 'save') {
  if (app.demo) { previewFromVitrine(); return; }
  const error = $('#vitrine-error');
  error.hidden = true;
  let values;
  try { values = vitrineFormValues(form); } catch (failure) {
    error.textContent = failure.message; error.hidden = false; error.scrollIntoView({ block: 'nearest' }); return;
  }
  const buttons = [...form.querySelectorAll('[type=submit]')];
  buttons.forEach((button) => { button.disabled = true; });
  try {
    const current = await api('/order-page');
    const active = intent === 'activate' ? true : intent === 'pause' ? false : Boolean(current?.active);
    if (active && (!values.displayName || !values.slug)) {
      error.textContent = 'Para ativar, preencha o nome da confeitaria e o endereço do link.';
      error.hidden = false; error.scrollIntoView({ block: 'nearest' });
      return;
    }
    await api('/order-page', { method: 'PUT', body: { ...current, ...values, active } });
    await reload();
    if (intent === 'activate' || (active && app.state.orderPage.slug)) {
      openLink();
      if (intent === 'activate') {
        const copied = await copy(`https://${LINK_BASE}${app.state.orderPage.slug}`);
        toast(copied ? 'Seu link está no ar! O endereço foi copiado: cole na bio ou no WhatsApp.' : 'Seu link está no ar!');
      } else toast('Vitrine salva.');
    } else {
      closeSheet();
      toast(intent === 'pause' ? 'Link pausado. Pedidos novos não chegam até você ativar de novo.' : 'Vitrine salva.');
    }
  } catch (failure) {
    error.textContent = failure.code === 'SLUG_TAKEN' ? 'Este endereço já está em uso. Troque por outro, como o nome com a cidade.' : failure.message;
    error.hidden = false; error.scrollIntoView({ block: 'nearest' });
  } finally { buttons.forEach((button) => { button.disabled = false; }); }
}

// "Ver como a cliente vê" do link salvo (na demo, a Doces da Lu); volta para onde estava.
export const previewSaved = () => showPreview(app.state.orderPage, wizard ? () => renderWizard() : openLink);

// Prévia: a página da cliente lê o rascunho deste navegador e nunca envia nada. Sem rascunho, o link salvo.
export function showPreview(values = app.state.orderPage, back = null) {
  const draft = { ...values, displayName: values.displayName || 'Sua confeitaria', orderTemplate: app.state.orderTemplate, availability: app.state.availability };
  try { localStorage.setItem(LINK_PREVIEW_KEY, JSON.stringify(draft)); } catch { /* a prévia usa o exemplo padrão */ }
  openSheet(`<h2 id="sheet-title" tabindex="-1">Como a cliente vê</h2><p class="muted">Prévia: nada é enviado daqui.</p>
    <iframe class="preview-frame" id="link-preview-frame" title="Prévia da vitrine" src="/encomenda/?preview=1&amp;t=${Date.now()}"></iframe>`, back);
}
