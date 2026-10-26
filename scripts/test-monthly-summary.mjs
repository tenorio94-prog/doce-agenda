import assert from 'node:assert/strict';
import { readFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { chromium, serveSite, siteRoot as root } from './lib/browser-test.mjs';
import { createEmptyState } from '../cloud/state-engine.js';

const output=await mkdtemp(path.join(os.tmpdir(),'doce-month-qa-'));
const seed=createEmptyState();
seed.orders=[['a',100.1,'Confirmado','Bolo de Cenoura'],['b',50.2,'Entregue','BOLO DE CENÓURA'],['c',0,'Confirmado','bolo de cenoura']].map(([id,total,status,product])=>({id,total,status,product,client:'QA fictícia',dueAt:'2026-10-14T15:00',createdAt:'2026-10-12T12:00:00Z',history:[],mode:'Retirada',...(id==='c'?{totalKnown:false}:{})}));
seed.payments=[{id:'p1',orderId:'a',amount:30.1,status:'Conferido',createdAt:'2026-10-13T12:00:00Z'},{id:'p2',orderId:'b',amount:10.2,status:'Conferido',createdAt:'2026-10-13T12:00:00Z'},{id:'p3',orderId:'a',amount:99,status:'Informado',createdAt:'2026-10-13T12:00:00Z'}];
const server=await serveSite(root),{origin}=server;
const browser=await chromium.launch();
const errors=[],results=[];
async function open(data,width=360,inject='') {
 const context=await browser.newContext({viewport:{width,height:900},timezoneId:'Pacific/Auckland',locale:'pt-BR'});
 await context.addInitScript(s=>{localStorage.setItem('doce-agenda.demo.v2',JSON.stringify(s));},data);
 if(inject)await context.route('**/browser-store.js',async route=>route.fulfill({contentType:'text/javascript',body:(await readFile(path.join(root,'browser-store.js'),'utf8'))+inject}));
 const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.clock.install({time:new Date('2026-10-13T12:00:00Z')});await page.goto(origin+'/demo/');await page.locator('#today-title').waitFor();
 await page.locator('.nav-item[data-view="month"]').click();await page.locator('#view-month .month-content').waitFor();
 return {page,context};
}
try {
 for(const width of [360,1440]){
  const {page,context}=await open(seed,width);await page.locator('.month-stats').waitFor();await page.evaluate(()=>document.fonts.ready);
  assert.deepEqual(await page.locator('.month-stats .stat-value').allTextContents(),['R$\u00a040,30','R$\u00a0110,00','R$\u00a0150,30','3']);
  assert.match(await page.locator('.month-content').innerText(),/1 pedido sem valor informado/);assert.equal(await page.locator('.month-details section').count(),3);
  assert.equal(await page.locator('body').evaluate(b=>b.scrollWidth<=innerWidth),true);assert.equal(await page.getByRole('button',{name:'Próximo mês',exact:true}).isDisabled(),true);
  // O que ela já guardou: todos os meses, mesmas regras (só conferido no dinheiro).
  const life=page.locator('#view-month .month-lifetime');assert.match(await life.innerText(),/O que você já guardou aqui[\s\S]*Desde outubro de 2026/);
  assert.deepEqual(await life.locator('.month-lifetime-list strong').allTextContents(),['3','1','1','R$\u00a040,30']);
  assert.deepEqual(await life.locator('.month-lifetime-list span').allTextContents(),['encomendas','entregue','cliente','recebido e conferido']);
  await page.screenshot({path:path.join(output,`month-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'Mês anterior',exact:true}).click();await page.getByRole('heading',{name:'Seu mês começa com uma encomenda'}).waitFor();assert.equal(await page.locator('.month-stats').count(),0);
  assert.equal(await page.locator('#view-month .month-lifetime').count(),1,'mês vazio ainda mostra o que ela guardou');
  assert.equal(await page.locator('.month-range').innerText(),'Setembro de 2026');await page.getByRole('button',{name:'Próximo mês',exact:true}).click();await page.locator('.month-stats').waitFor();
  await page.locator('[data-action="new-order"]:visible').first().click();await page.locator('#order-form wa-input[name=client] input').fill('QA sem preço');await page.locator('#order-form wa-input[name=product] input').fill('Bolo sem valor');await page.locator('#order-form wa-input[name=dueDate] input').fill('2026-10-14');await page.locator('#order-form wa-input[name=dueTime] input').fill('16:00');await page.locator('#status-choice input[value=Confirmado]').check();await page.locator('#save-order-button').click();await page.waitForFunction(()=>!document.querySelector('#order-dialog').open);
  await page.getByText(/2 pedidos sem valor informado não entraram/).waitFor();assert.equal(await page.locator('.month-stats .stat-value').last().innerText(),'4');
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('doce-agenda.demo.v2')));assert.equal(stored.orders.at(-1).totalKnown,false);assert.equal(stored.orders.at(-1).total,0);
  results.push({case:'populated, lifetime, month navigation, blank price',width,passed:true});await context.close();
 }
 const small={...seed,orders:seed.orders.slice(0,2)};let {page,context}=await open(small);await page.getByText('Com mais pedidos, mostramos aqui os dias e produtos que mais saem.').waitFor();assert.equal(await page.locator('.month-details').count(),0);await context.close();results.push({case:'under 3 orders',passed:true});
 ({page,context}=await open(createEmptyState()));await page.getByRole('heading',{name:'Seu mês começa com uma encomenda'}).waitFor();assert.equal(await page.locator('.month-stats').count(),0);assert.equal(await page.locator('.month-lifetime').count(),0,'conta vazia sem histórico de zeros');await context.close();results.push({case:'empty without misleading zeros',passed:true});
 ({page,context}=await open(seed,360,`;const original=window.DoceStore.fetch;window.DoceStore.fetch=async(url,opts)=>{const response=await original(url,opts);if(!url.includes('resumo-mensal'))return response;const body=await response.json();delete body.lifetime;return new Response(JSON.stringify(body),{status:response.status});};`));
 await page.locator('.month-stats').waitFor();assert.equal(await page.locator('.month-lifetime').count(),0);await context.close();results.push({case:'older server without lifetime hides the section',passed:true});
 ({page,context}=await open(seed,360,`;const original=window.DoceStore.fetch;let failed=false;window.DoceStore.fetch=async(url,opts)=>{if(url.includes('resumo-mensal')&&!failed){failed=true;return new Response(JSON.stringify({error:'Falha temporária de teste'}),{status:503});}return original(url,opts)};`));
 await page.getByRole('button',{name:'Tentar de novo',exact:true}).click();await page.locator('.month-stats').waitFor();await context.close();results.push({case:'error and retry',passed:true});
 ({page,context}=await open(seed,360,`;const original=window.DoceStore.fetch;window.DoceStore.fetch=async(url,opts)=>{if(url.includes('mes=2026-09'))await new Promise(r=>setTimeout(r,400));return original(url,opts)};`));
 await page.locator('.month-stats').waitFor();await page.getByRole('button',{name:'Mês anterior',exact:true}).click();await page.getByRole('button',{name:'Mês anterior',exact:true}).click();await page.getByRole('heading',{name:'Seu mês começa com uma encomenda'}).waitFor();await new Promise(r=>setTimeout(r,500));assert.equal(await page.locator('.month-range').innerText(),'Agosto de 2026');await context.close();results.push({case:'stale response cannot overwrite selected month',passed:true});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({output,results,errors,browser:'Playwright (Browser plugin not available)',deviceTimezone:'Pacific/Auckland'},null,2));
}finally{await browser.close();server.close();}
