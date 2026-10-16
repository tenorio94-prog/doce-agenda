import { checkCapacity, wallTimeEpoch } from './state-engine.js';
import { limitedText, normalizeWhatsApp, linkError, requestSummary } from './order-link-model.js';

export function validPublicDay(day) { return typeof day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(`${day}T00:00:00Z`)) && new Date(`${day}T00:00:00Z`).toISOString().slice(0,10) === day; }
export function availabilityDates(state, from, to) {
  if (!validPublicDay(from) || !validPublicDay(to)) linkError('Período inválido.');
  const start = Date.parse(`${from}T00:00:00Z`), end = Date.parse(`${to}T00:00:00Z`);
  if (end < start || (end-start)/86400000 >= 90) linkError('Consulte no máximo 90 dias por vez.');
  const dates = [];
  for (let time=start;time<=end;time+=86400000) {
    const date = new Date(time).toISOString().slice(0,10); let available = true;
    try { checkCapacity({status:'Confirmado',dueAt:`${date}T23:59`},state,null); } catch { available = false; }
    dates.push({date,available});
  }
  return dates;
}
// What the customer sees. Never the owner, orders or counts; only the page and the rule she needs to pick a date.
export function publicPageView(page, state) {
  if (!page.active) return {active:false,message:'Esta confeitaria não está recebendo pedidos pelo link no momento'};
  return {active:true,displayName:page.displayName,welcome:page.welcome,products:page.products,whatsapp:page.whatsapp,
    style:page.style||'atelie',color:page.color||'',instagram:page.instagram||'',logo:page.logo||'',cover:page.cover||'',share:page.share||'',
    noticeHours:state.availability?.minimumNoticeHours||0,orderTemplate:state.orderTemplate,privacyUrl:'/privacidade/'};
}
export function createPublicRequest(state, input, code, now = new Date().toISOString()) {
  const page = state.orderPage;
  if (!page?.active) linkError('Esta confeitaria não está recebendo pedidos pelo link no momento',403,'LINK_DISABLED');
  if (!input || typeof input !== 'object' || Array.isArray(input)) linkError('Solicitação inválida.');
  if (input.consent !== true) linkError('Autorize o envio dos dados para continuar.');
  const productName = limitedText(input.product,80,'Produto',true);
  const custom = input.other === true;
  if (!custom && !page.products.some(p=>p.name===productName)) linkError('Escolha um produto disponível ou Outro.');
  const client = limitedText(input.client,120,'Nome',true), contact = normalizeWhatsApp(input.contact,true);
  let details = limitedText(input.details ?? '',1000,'Detalhes');
  // "Incluir mais alguma coisa?": other products of the page, kept as text in the details (one order, no cart).
  if (input.extras !== undefined) {
    if (!Array.isArray(input.extras) || input.extras.length > 5 || input.extras.some(name=>typeof name!=='string'||name===productName||!page.products.some(p=>p.name===name))) linkError('Escolha itens extras da lista da confeitaria.');
    const extras=[...new Set(input.extras)];
    if (extras.length) details=[details,`Também quero: ${extras.join(', ')}`].filter(Boolean).join('\n');
  }
  if (!validPublicDay(input.date) || typeof input.time !== 'string' || !/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) linkError('Escolha a data e o horário desejados.');
  if (!['Retirada','Entrega'].includes(input.mode)) linkError('Escolha retirada ou entrega.');
  const location = input.mode==='Entrega' ? limitedText(input.location,300,'Endereço',true) : '';
  const dueAt = `${input.date}T${input.time}`;
  if (wallTimeEpoch(dueAt)<Date.now()) linkError('Escolha uma data e horário futuros.',409,'DATE_UNAVAILABLE');
  try {checkCapacity({status:'Confirmado',dueAt},state,null);} catch {linkError('Esta data ficou indisponível. Escolha outra data.',409,'DATE_UNAVAILABLE');}
  let cake = null;
  if (/\bbolos?\b/i.test(productName)) {
    const values = {}, labels = {};
    for (const field of state.orderTemplate.fields.filter(f=>f.enabled)) {
      const value = limitedText(input.cake?.[field.key] ?? '',field.key==='foodNotes'?500:200,field.label,field.required);
      if(value && field.options.length && !field.options.includes(value)) linkError(`Escolha uma opção válida em ${field.label}.`);
      values[field.key]=value;labels[field.key]=field.label;
    }
    cake={templateVersion:state.orderTemplate.version,values,labels};
  }
  const order = {id:crypto.randomUUID(),client,contact,product:productName,details,dueAt,mode:input.mode,location,total:0,totalKnown:false,status:'Solicitação',origin:'link',publicCode:code,
    consentAt:now,consentVersion:'2026-10-13',createdAt:now,updatedAt:now,cake,nextAction:'Revisar solicitação recebida pelo link',nextAt:'',pendingChange:'',
    history:[{at:now,text:'Solicitação recebida pelo link. Dados enviados com consentimento; aguardando revisão.'}]};
  const next = structuredClone(state);
  const duplicates=next.orders.filter(o=>o.origin==='link'&&o.contact===contact&&o.product===productName&&o.dueAt.slice(0,10)===input.date&&Math.abs(Date.parse(now)-Date.parse(o.createdAt))<=600000);
  if(duplicates.length){order.possibleDuplicate=true;for(const previous of duplicates)previous.possibleDuplicate=true;}
  next.orders.push(order);
  return {state:next,order,confirmation:{code,summary:requestSummary(order,page.displayName),whatsapp:page.whatsapp,
    message:'Seu pedido ainda não está confirmado. A confeitaria vai responder pelo WhatsApp.'}};
}
