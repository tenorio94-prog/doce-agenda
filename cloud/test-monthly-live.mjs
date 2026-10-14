// Real backend test. Only .invalid synthetic accounts; restore their state afterwards.
// DOCE_QA_SESSION points to a private local JSON {email,password,id,config}.
// DOCE_QA_SECOND optionally points to a second synthetic account for isolation checks.
// DOCE_MONTHLY_ASSETS=local verifies the prepared UI while the public deploy is blocked.
import assert from 'node:assert/strict';
import { readFile, writeFile, mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'file:///C:/Users/Restore/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import { createEmptyState } from './state-engine.js';
import { monthlySummary, saoPauloDay } from './monthly-summary.js';

assert.ok(process.env.DOCE_QA_SESSION,'Provide a synthetic QA session file.');
const session=JSON.parse(await readFile(process.env.DOCE_QA_SESSION,'utf8'));
assert.ok(session.email.endsWith('.invalid'),'Never mutate a real pilot account.');
const out=await mkdtemp(path.join(os.tmpdir(),'doce-month-live-'));
const siteOrigin=process.env.DOCE_TEST_ORIGIN||'https://lucast.app';
const config=session.config,client=createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});
let revision,original,browser,secondClient;const checks=[],errors=[];
async function authenticate(s,c=client){const result=await c.auth.signInWithPassword({email:s.email,password:s.password});assert.equal(result.error,null,'Synthetic login failed');return result.data.session.access_token;}
let token=await authenticate(session);
async function call(route,method='GET',body,bearer=token){
 const response=await fetch(config.url+'/functions/v1/doce-api',{method:'POST',headers:{apikey:config.publishableKey,Authorization:`Bearer ${bearer}`,Origin:siteOrigin,'Content-Type':'application/json'},body:JSON.stringify({path:route,method,body,...(method!=='GET'?{expectedRevision:revision}:{})})});
 assert.equal(response.headers.get('Access-Control-Allow-Origin'),siteOrigin,'Exact site origin must be allowed');
 const data=await response.json();if(response.ok&&(route==='/api/state'||method!=='GET'))revision=Number(response.headers.get('X-Agenda-Revision'));return {status:response.status,data};
}
try{
 const loaded=await call('/api/state');assert.equal(loaded.status,200);original=loaded.data;await writeFile(path.join(out,'synthetic-original.json'),JSON.stringify(original));
 const month=saoPauloDay(new Date()).slice(0,7),state=createEmptyState();state.orderPage={...original.orderPage,active:false};
 const order=(id,more={})=>({id,client:'QA fictícia',product:'Bolo de Cenoura',dueAt:`${month}-14T15:00`,status:'Confirmado',mode:'Retirada',total:100.1,createdAt:`${month}-12T12:00:00Z`,updatedAt:new Date().toISOString(),history:[],...more});
 state.orders=[order('monthly-a'),order('monthly-b',{status:'Entregue',product:'BOLO DE CENÓURA',total:50.2}),order('monthly-c',{total:0,totalKnown:false}),order('monthly-cancelled',{status:'Cancelado'}),order('monthly-quote',{status:'Orçamento',dueAt:''})];
 state.payments=[['a',30.1,'Conferido'],['b',10.2,'Conferido'],['a',99,'Informado']].map(([id,amount,status],index)=>({id:`monthly-payment-${index}`,orderId:`monthly-${id}`,amount,status,createdAt:new Date().toISOString()}));
 assert.equal((await call('/api/import','POST',state)).status,200);checks.push('synthetic fixture imported, real accounts untouched');
 const result=await call(`/api/resumo-mensal?mes=${month}`);assert.equal(result.status,200);assert.deepEqual(result.data,monthlySummary(state,month));assert.equal(result.data.soldCents,15030);assert.equal(result.data.receivedCents,4030);assert.equal(result.data.receivableCents,11000);assert.ok(!JSON.stringify(result.data).includes('QA fictícia'));checks.push('real server totals and seven definitions match');
 const exported=await call('/api/export');assert.equal(exported.data.orders.find(o=>o.id==='monthly-c').totalKnown,false);assert.equal((await call('/api/import','POST',exported.data)).status,200);checks.push('cloud backup/restore preserves optional price marker');
 if(process.env.DOCE_QA_SECOND){const second=JSON.parse(await readFile(process.env.DOCE_QA_SECOND,'utf8'));assert.ok(second.email.endsWith('.invalid'));secondClient=createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}});const otherToken=await authenticate(second,secondClient);const otherState=await call('/api/state','GET',undefined,otherToken);const otherSummary=await call(`/api/resumo-mensal?mes=${month}&owner_user_id=${session.id}`,'GET',undefined,otherToken);assert.equal(otherSummary.status,200);assert.deepEqual(otherSummary.data,monthlySummary(otherState.data,month));assert.equal(otherState.data.orders.some(o=>o.id==='monthly-a'),false);checks.push('second real QA account cannot access first owner through query parameters');await call('/api/state');}
 const unauthorized=await fetch(config.url+'/functions/v1/doce-api',{method:'POST',headers:{apikey:config.publishableKey,'Content-Type':'application/json'},body:JSON.stringify({path:`/api/resumo-mensal?mes=${month}`,method:'GET'})});assert.equal(unauthorized.status,401);checks.push('anonymous monthly read rejected');
 browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const root=path.resolve(fileURLToPath(new URL('../deploy-cloud/public/',import.meta.url))),types={'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.ttf':'font/ttf','.png':'image/png','.webmanifest':'application/manifest+json'};
 for(const width of [360,1440]){
  const context=await browser.newContext({viewport:{width,height:900},locale:'pt-BR',timezoneId:'Pacific/Auckland',serviceWorkers:'block'});
  if(process.env.DOCE_MONTHLY_ASSETS==='local')await context.route(siteOrigin+'/**',async route=>{let pathname=new URL(route.request().url()).pathname;if(pathname.endsWith('/'))pathname+='index.html';const file=path.resolve(root,'.'+pathname);assert.ok(file.startsWith(root+path.sep));try{await route.fulfill({contentType:types[path.extname(file)]||'application/octet-stream',body:await readFile(file)});}catch{await route.fulfill({status:404,body:'not found'});}});
  const page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(siteOrigin+'/cadastro/?mode=login');await page.locator('#login-email').fill(session.email);await page.locator('#login-password').fill(session.password);await page.locator('#login-submit').click();await page.locator('#today-title').waitFor({timeout:30000});
  await page.locator('[data-view=month]').click();await page.locator('.month-stats').waitFor();assert.deepEqual(await page.locator('.month-stats .stat-value').allTextContents(),['3','R$\u00a0150,30','R$\u00a040,30','R$\u00a0110,00']);
  assert.equal(await page.locator('body').evaluate(b=>b.scrollWidth<=innerWidth),true);await page.evaluate(()=>document.fonts.ready);await page.screenshot({path:path.join(out,`authenticated-${width}.png`),fullPage:true});
  await page.getByRole('button',{name:'Mês anterior',exact:true}).click();await page.getByRole('heading',{name:'Seu mês começa com uma encomenda'}).waitFor();assert.equal(await page.locator('.month-stats').count(),0);await context.close();checks.push(`authenticated UI ${width}px with real Supabase responses`);
 }
 assert.deepEqual(errors,[]);
}finally{
 if(browser)await browser.close();
 if(original){await call('/api/state');const restored=await call('/api/import','POST',original);assert.equal(restored.status,200,'Failed to restore synthetic QA state');checks.push('original synthetic state restored');}
 await client.auth.signOut({scope:'local'});if(secondClient)await secondClient.auth.signOut({scope:'local'});
 await writeFile(path.join(out,'result.json'),JSON.stringify({checks,errors,uiAssets:process.env.DOCE_MONTHLY_ASSETS||'published'},null,2));
 console.log(JSON.stringify({checks,errors,output:out,uiAssets:process.env.DOCE_MONTHLY_ASSETS||'published'},null,2));
}
