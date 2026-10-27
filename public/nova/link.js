// Meu link na tela nova: o assistente de 3 passos do app.js (O4), com as mesmas validações e textos.
// Nome e endereço, WhatsApp opcional; até 3 doces com valor opcional; ativar e copiar. Salvar manda o orderPage
// inteiro lido do servidor agora, só com a mudança: fotos, estilo, cor, categorias e os outros doces ficam.
// Na demonstração o último passo só mostra a prévia (/encomenda/?preview=1), e nada é ativado.
import * as M from './model.js';
import { $, api, app, closeSheet, copy, esc, openSheet, reload, toast } from './ui.js';

const LINK_BASE = 'lucast.app/p/';
const LINK_PREVIEW_KEY = 'doce-agenda.link-preview';
const TITLES = ['Como a cliente te encontra', 'O que você vende', 'Pronto para ir ao ar'];
const fullVersion = () => (app.demo ? '/demo/completa/' : '/app/completa/');
let wizard = null;

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
    <a class="btn btn-outline" href="${fullVersion()}#vitrine">Mudar doces e fotos</a>`);
}
export async function copyLink() {
  toast(await copy(`https://${LINK_BASE}${app.state.orderPage.slug}`) ? 'Link copiado.' : 'Não deu para copiar. Selecione o endereço e copie.');
}

export function openWizard() {
  const page = app.state.orderPage || {}, first = (page.products || []).slice(0, 3);
  wizard = {
    step: 1, displayName: page.displayName || '', slug: page.slug || '', slugEdited: !!page.slug, whatsapp: page.whatsapp || '',
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
        <p class="muted">${cloud ? 'Os pedidos chegam no aviso do topo da Agenda e só entram no dia quando você aceita. Fotos, estilo e cor você ajusta depois, na versão completa.' : 'No exemplo o link não vai ao ar. Na sua conta, este passo liga o link e já copia o endereço.'}</p>`;
  const primary = w.step < 3 ? 'Continuar' : cloud ? 'Ativar e copiar link' : 'Ver como a cliente vê';
  openSheet(`<form id="link-wizard" novalidate><p class="lw-step">Passo ${w.step} de 3</p><h2 id="sheet-title" tabindex="-1">${TITLES[w.step - 1]}</h2>
    ${body}
    <p class="form-error" id="link-wizard-error" role="alert"${errorText ? '' : ' hidden'}>${esc(errorText)}</p>
    <div class="f-main">${w.step > 1 ? '<button class="btn btn-outline" type="submit" value="back">Voltar</button>' : ''}${w.step === 3 && cloud ? '<button class="btn btn-outline" type="submit" value="preview">Ver prévia</button>' : ''}<button class="btn btn-primary" type="submit" value="next">${primary}</button></div>
    ${w.step === 1 && app.demo ? '<button class="link-btn" type="button" data-act="preview-link">Ver como a cliente vê o exemplo da Doces da Lu</button>' : ''}
  </form>`);
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

// "Ver como a cliente vê" do link salvo (na demo, a Doces da Lu); volta para onde estava.
export const previewSaved = () => showPreview(app.state.orderPage, wizard ? () => renderWizard() : openLink);

// Prévia: a página da cliente lê o rascunho deste navegador e nunca envia nada. Sem rascunho, o link salvo.
export function showPreview(values = app.state.orderPage, back = null) {
  const draft = { ...values, displayName: values.displayName || 'Sua confeitaria', orderTemplate: app.state.orderTemplate, availability: app.state.availability };
  try { localStorage.setItem(LINK_PREVIEW_KEY, JSON.stringify(draft)); } catch { /* a prévia usa o exemplo padrão */ }
  openSheet(`<h2 id="sheet-title" tabindex="-1">Como a cliente vê</h2><p class="muted">Prévia: nada é enviado daqui.</p>
    <iframe class="preview-frame" id="link-preview-frame" title="Prévia da vitrine" src="/encomenda/?preview=1&amp;t=${Date.now()}"></iframe>`, back);
}
