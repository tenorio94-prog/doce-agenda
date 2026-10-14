import assert from 'node:assert/strict';
import http from 'node:http';
import {readFile,mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {chromium} from 'file:///C:/Users/Restore/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const files={'/':'demo/index.html','/app.js':'app.js','/data-client.js':'data-client.js','/browser-store.js':'browser-store.js','/tokens.css':'tokens.css','/style.css':'style.css','/logo.svg':'logo.svg','/favicon.svg':'favicon.svg','/fonts/Fredoka.ttf':'fonts/Fredoka.ttf','/fonts/Figtree.ttf':'fonts/Figtree.ttf'};
let server;let origin=process.env.DEPLOY_TEST_ORIGIN;
if(!origin){server=http.createServer(async(req,res)=>{const pathname=new URL(req.url,'http://localhost').pathname;const f=files[pathname];if(!f){res.writeHead(404);res.end();return;}const contentType={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf'}[path.extname(f)];res.writeHead(200,{'Content-Type':contentType});res.end(await readFile(path.join(root,'deploy-cloud/public',f)));});await new Promise(r=>server.listen(0,'127.0.0.1',r));origin=`http://localhost:${server.address().port}`;}
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const ctx=await browser.newContext({viewport:{width:430,height:932},isMobile:true,hasTouch:true,acceptDownloads:true});
const page=await ctx.newPage();await page.clock.install({time:new Date('2026-10-01T12:00:00-03:00')});const errors=[];const apiNetwork=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(new URL(r.url()).pathname.startsWith('/api/'))apiNetwork.push(r.url());});
try{
 await page.goto(origin);await page.locator('#view-today h1').waitFor();await page.locator('.nav-new-order').click();await page.waitForFunction(()=>document.querySelector('#order-dialog').open);assert.equal(await page.locator('#order-dialog').evaluate(el=>el.open),true,'The mobile new-order navigation should open the form.');
 await page.locator('#order-form [name=client]').fill('Cliente teste • fictícia');await page.locator('#order-form [name=product]').fill('Bolo de cenoura • teste');
 await page.locator('#order-form [name=dueDate]').fill('2026-10-01');await page.locator('#order-form [name=dueTime]').fill('16:00');await page.locator('#order-form [name=total]').fill('150');await page.locator('#order-form [name=status]').selectOption('Confirmado');
 await page.locator('#save-order-button').click();await page.waitForFunction(()=>!document.querySelector('#order-dialog').open);
 assert.equal(await page.evaluate(async()=>{await document.fonts.ready;return (await Promise.all([document.fonts.load('16px Fredoka'),document.fonts.load('16px Figtree')])).every((faces)=>faces.length>0);}),true,'Local Fredoka and Figtree fonts must load from the test server.');
 let state=await page.evaluate(async()=>await(await window.DoceStore.fetch('/api/state')).json());const o=state.orders.find(x=>x.client==='Cliente teste • fictícia');assert.ok(o);
 await page.reload();await page.locator('#view-today h1').waitFor();state=await page.evaluate(async()=>await(await window.DoceStore.fetch('/api/state')).json());assert.ok(state.orders.some(x=>x.id===o.id));
 await page.locator('[data-view="orders"].nav-item').click();await page.locator(`#view-orders [data-open-order="${o.id}"]`).first().click();await page.locator('#detail-dialog').waitFor();
 await page.locator('[data-action="add-payment"]').click();await page.locator('#payment-form [name=amount]').fill('50');await page.locator('#payment-form [name=note]').fill('Teste');await page.locator('#save-payment-button').click();await page.waitForFunction(()=>!document.querySelector('#payment-dialog').open);
 const payment=await page.evaluate(async id=>(await(await window.DoceStore.fetch('/api/state')).json()).payments.find(p=>p.orderId===id),o.id);
 assert.match(await page.locator('#detail-content').innerText(),/Ainda não conferido/);await page.locator(`[data-action="confirm-payment"][data-id="${payment.id}"]`).click();
 await page.waitForFunction(()=>document.querySelector('#detail-content').innerText.replace(/\s/g,' ').includes('R$ 100,00'));
 assert.match(await page.locator('#detail-content').innerText(),/Saldo a receber[\s\S]*R\$\s*100,00/);
 const first=await page.evaluate(async()=>await(await window.DoceStore.fetch('/api/state')).json());
 await page.evaluate(async id=>await window.DoceStore.fetch(`/api/payments/${id}`,{method:'PUT',body:JSON.stringify({status:'Conferido'})}),payment.id);
 const second=await page.evaluate(async()=>await(await window.DoceStore.fetch('/api/state')).json());assert.equal(second.orders.find(x=>x.id===o.id).history.length,first.orders.find(x=>x.id===o.id).history.length);

 // A confirmed balance stays attached to the order as its production status advances.
 for(const status of ['Em produção','Pronto','Entregue']){
  await page.evaluate(async({id,status})=>window.DoceStore.fetch(`/api/orders/${id}`,{method:'PUT',body:JSON.stringify({status})}),{id:o.id,status});
  await page.reload();await page.locator('#view-today h1').waitFor();
  await page.locator('[data-view="orders"].nav-item').click();await page.locator(`#view-orders [data-open-order="${o.id}"]`).first().click();
  const detail=await page.locator('#detail-content').innerText();assert.match(detail,/Saldo a receber[\s\S]*R\$\s*100,00/,`Saldo deve permanecer em ${status}.`);
  await page.locator('#detail-dialog [data-close]').click();
 }

 // Unknown receipts stay out of the numeric sum; a confirmed zero payment means a full balance is known.
 const extraOrders=await page.evaluate(async()=>{
  const post=async(body)=>(await window.DoceStore.fetch('/api/orders',{method:'POST',body:JSON.stringify(body)})).json();
  const base={client:'Cliente regressão',product:'Encomenda regressão',dueAt:'2026-10-02T16:00',total:80,status:'Confirmado'};
  const unknown=await post({...base,client:'Saldo desconhecido'});
  const zero=await post({...base,client:'Conferência zero',total:40});
  const payment=await window.DoceStore.fetch(`/api/orders/${zero.id}/payments`,{method:'POST',body:JSON.stringify({amount:0,status:'Conferido',note:'Conferido sem recebimento'})});
  return {unknown,zero,paymentStatus:payment.status};
 });
 assert.equal(extraOrders.paymentStatus,200);
 await page.reload();await page.locator('#view-today h1').waitFor();
 await page.locator('[data-view="orders"].nav-item').click();await page.locator(`#view-orders [data-open-order="${extraOrders.unknown.id}"]`).click();
 assert.match(await page.locator('#detail-content').innerText(),/Ainda não conferido/);await page.locator('#detail-dialog [data-close]').click();
 await page.locator(`#view-orders [data-open-order="${extraOrders.zero.id}"]`).click();
 assert.match(await page.locator('#detail-content').innerText(),/Saldo a receber[\s\S]*R\$\s*40,00/);await page.locator('#detail-dialog [data-close]').click();
 // Only real orders contribute: known balances 100 + 40; the sample balance 100 is excluded.
 const aggregate=await page.locator('#view-today .finance-summary').innerText();
 assert.match(aggregate,/R\$\s*140,00/);assert.match(aggregate,/Saldo parcial conhecido.*1 pedido ainda sem recebimento conferido/i,'O resumo deve sinalizar quantos pedidos ainda não têm recebimento conferido.');

 const edgeCases=await page.evaluate(async()=>{
  const post=async(body)=>(await window.DoceStore.fetch('/api/orders',{method:'POST',body:JSON.stringify(body)})).json();
  const cancelled=await post({client:'Pedido cancelado',product:'Não entra no resumo',total:500,status:'Cancelado'});
  const overpaid=await post({client:'Pedido excedente',product:'Pagamento maior que o total',dueAt:'2026-10-04T16:00',total:20,status:'Confirmado'});
  await window.DoceStore.fetch(`/api/orders/${overpaid.id}/payments`,{method:'POST',body:JSON.stringify({amount:200,status:'Conferido',note:'Excedente fictício'})});
  return {cancelled,overpaid};
 });
 await page.reload();await page.locator('#view-today h1').waitFor();
 const afterEdgeCases=await page.locator('#view-today .finance-summary').innerText();
 assert.match(afterEdgeCases,/R\$\s*140,00/,'Cancelados ficam fora do resumo e excedentes não reduzem o saldo de outros pedidos.');
 assert.match(afterEdgeCases,/Saldo parcial conhecido.*1 pedido ainda sem recebimento conferido/i);
 await page.locator('[data-view="orders"].nav-item').click();await page.locator(`#view-orders [data-open-order="${edgeCases.overpaid.id}"]`).click();
 assert.match(await page.locator('#detail-content').innerText(),/Excedente R\$\s*180,00/);await page.locator('#detail-dialog [data-close]').click();
 assert.equal(await page.locator(`#view-orders [data-open-order="${edgeCases.cancelled.id}"]`).count(),1);

 // Editing an order without touching optional fields must retain them in the detail view.
 const optionalOrder=await page.evaluate(async()=>{
  const body={client:'Campos opcionais',product:'Bolo teste',details:'Massa de baunilha e flores azuis',dueAt:'2026-10-03T16:00',mode:'Entrega',location:'Rua das Flores, 123',total:90,status:'Em produção',nextAction:'Confirmar decoração',nextAt:'2026-10-02T12:00',pendingChange:'Trocar a cor da fita',contact:'(11) 98888-7777'};
  return (await window.DoceStore.fetch('/api/orders',{method:'POST',body:JSON.stringify(body)})).json();
 });
 await page.reload();await page.locator('#view-today h1').waitFor();
 await page.locator('[data-view="orders"].nav-item').click();await page.locator(`#view-orders [data-open-order="${optionalOrder.id}"]`).click();
 await page.locator('#detail-content [data-action="edit-order"]').click();await page.locator('#order-form [name=product]').fill('Bolo de baunilha atualizado');await page.locator('#save-order-button').click();await page.waitForFunction(()=>!document.querySelector('#order-dialog').open);
 await page.locator(`#view-orders [data-open-order="${optionalOrder.id}"]`).click();
 const editedDetails=await page.locator('#detail-content').innerText();for(const text of ['Massa de baunilha e flores azuis','Entrega','Rua das Flores, 123','Confirmar decoração','Trocar a cor da fita','(11) 98888-7777'])assert.ok(editedDetails.includes(text),`Campo opcional preservado: ${text}`);
 await page.locator('#detail-dialog [data-close]').click();
 const invalid=await page.evaluate(async id=>(await window.DoceStore.fetch(`/api/orders/${id}/payments`,{method:'POST',body:JSON.stringify({amount:-1,status:'Conferido'})})).status,o.id);assert.equal(invalid,400);
 await page.locator('.settings-button').click();await page.locator('#view-settings h1').waitFor();const downloadPromise=page.waitForEvent('download');await page.locator('#export-button').click();const download=await downloadPromise;const exported=JSON.parse(await readFile(await download.path(),'utf8'));assert.equal(exported.orders.length,7);assert.ok(exported.orders.some(order=>order.id===o.id));assert.ok(exported.orders.some(order=>order.isSample));
 const isolated=await browser.newContext();const other=await isolated.newPage();await other.goto(origin);await other.locator('#view-today h1').waitFor();const own=await other.evaluate(async()=>await(await window.DoceStore.fetch('/api/state')).json());assert.equal(own.orders.length,1);await isolated.close();
 await page.locator('[data-view="today"].nav-item').click();await page.locator('[data-select-day="2026-10-01"]').click();assert.ok((await page.locator('#view-today').innerText()).includes('Cliente teste'));
 // Exercise the new capacity, cake-template and restore flows in a fresh browser profile.
 await mkdir(path.join(root,'deploy-demo-check'),{recursive:true});
 const regressionContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const regressionPage=await regressionContext.newPage();await regressionPage.clock.install({time:new Date('2026-10-01T12:00:00-03:00')});regressionPage.on('pageerror',e=>errors.push(e.message));
 await regressionPage.goto(origin);await regressionPage.locator('#view-today h1').waitFor();
 const stateOf=()=>regressionPage.evaluate(async()=>await(await window.DoceStore.fetch('/api/state')).json());
 const waitForState=async(check)=>{for(let i=0;i<60;i++){const current=await stateOf();if(check(current))return current;await regressionPage.waitForTimeout(50);}throw new Error(`Timed out waiting for browser state: ${JSON.stringify(await stateOf())}`);};
 const fillOrder=async({client,product,dueAt,cake=false})=>{
  await regressionPage.locator('.nav-new-order').click();await regressionPage.locator('#order-form [name=client]').fill(client);await regressionPage.locator('#order-form [name=product]').fill(product);await regressionPage.locator('#order-form [name=dueDate]').fill(dueAt.slice(0,10));await regressionPage.locator('#order-form [name=dueTime]').fill(dueAt.slice(11,16));await regressionPage.locator('#order-form [name=total]').fill('75');await regressionPage.locator('#order-form [name=status]').selectOption('Confirmado');
  await regressionPage.locator('#order-form .optional-fields > summary').click();const toggle=regressionPage.locator('#order-form [name=hasCake]');if(cake)await toggle.check();else if(await toggle.isChecked())await toggle.uncheck();
 };
 await regressionPage.locator('.settings-button').click();await regressionPage.locator('#view-settings h1').waitFor();await regressionPage.locator('#availability-form').waitFor();
 await regressionPage.locator('#availability-form input[name="closedWeekdays"][value="6"]').check();await regressionPage.locator('#availability-form [name="minimumNoticeHours"]').fill('0');await regressionPage.locator('#availability-form [name="dailyOrderLimit"]').fill('1');assert.deepEqual(await regressionPage.locator('#availability-form').evaluate(form=>new FormData(form).getAll('closedWeekdays')),['6']);await regressionPage.locator('#availability-form').evaluate(form=>form.requestSubmit());await waitForState(s=>s.availability.closedWeekdays.includes(6)&&s.availability.dailyOrderLimit===1);
 await regressionPage.locator('#settings-date').fill('2026-10-10');await regressionPage.locator('#date-availability-form[data-date="2026-10-10"]').waitFor();
 const dateForm=regressionPage.locator('#date-availability-form');assert.equal(await dateForm.locator('[name=closed]').isChecked(),true,`Saturday should inherit weekly closure; day=${await dateForm.locator('h3').innerText()}, settings=${JSON.stringify((await stateOf()).availability)}.`);
 await dateForm.locator('[name=closed]').uncheck();await dateForm.locator('[name=limit]').fill('2');await dateForm.evaluate(form=>form.requestSubmit());await waitForState(s=>s.availability.dateOverrides?.['2026-10-10']?.closed===false&&s.availability.dateOverrides?.['2026-10-10']?.limit===2);
 let availabilityState=await stateOf();assert.deepEqual(availabilityState.availability.closedWeekdays,[6]);assert.deepEqual(availabilityState.availability.dateOverrides['2026-10-10'],{closed:false,limit:2});
 await regressionPage.locator('.order-template-settings > summary').click();
 const sizeField=regressionPage.locator('#order-template-form .template-field').filter({has:regressionPage.locator('input[name="label.size"]')});await sizeField.locator('summary').click();await sizeField.locator('[name=required][value=size]').check();await sizeField.locator('[name="options.size"]').fill('20 cm');await regressionPage.locator('#order-template-form').evaluate(form=>form.requestSubmit());await waitForState(s=>s.orderTemplate.fields.find(f=>f.key==='size')?.required===true);let configuredTemplate=(await stateOf()).orderTemplate;assert.equal(configuredTemplate.version,2);
 await regressionPage.locator('.order-template-settings > summary').click();await regressionPage.locator('#view-settings h1').waitFor();await regressionPage.screenshot({path:path.join(root,'deploy-demo-check/availability-mobile.png'),fullPage:true});
 // No-cake orders remain valid even when the optional cake model has required fields.
 await fillOrder({client:'Docinhos sem modelo',product:'Caixa de brigadeiros',dueAt:'2026-10-11T16:00'});await regressionPage.locator('#save-order-button').click();await regressionPage.waitForFunction(()=>!document.querySelector('#order-dialog').open);
 let regressionState=await stateOf();assert.ok(regressionState.orders.some(x=>x.client==='Docinhos sem modelo'&&x.cake===null));
 // Reopening a weekly-closed Saturday with a limit of two allows two orders; the third requires an explicit reason.
 for(const client of ['Bolo sábado 1','Bolo sábado 2']){await fillOrder({client,product:'Bolo simples',dueAt:'2026-10-10T15:00'});await regressionPage.locator('#save-order-button').click();await regressionPage.waitForFunction(()=>!document.querySelector('#order-dialog').open);}
 await fillOrder({client:'Exceção sábado',product:'Bolo excepcional',dueAt:'2026-10-10T16:00'});await regressionPage.locator('#save-order-button').click();await regressionPage.locator('#order-form-error').waitFor({state:'visible'});assert.match(await regressionPage.locator('#order-form-error').innerText(),/limite de pedidos/i);assert.equal(await regressionPage.locator('#capacity-override-box').isVisible(),true);
 await regressionPage.locator('#capacity-override-box [name=overrideReason]').fill('Exceção combinada com a cliente');await regressionPage.locator('#save-order-button').click();await regressionPage.waitForFunction(()=>!document.querySelector('#order-dialog').open);
 regressionState=await stateOf();assert.ok(regressionState.orders.find(x=>x.client==='Exceção sábado').history.some(item=>item.text.includes('Exceção combinada com a cliente')));
 // Confirming an active cake model without its required size shows an inline error; a valid select saves the label snapshot.
 await fillOrder({client:'Bolo com tamanho obrigatório',product:'Bolo de aniversário',dueAt:'2026-10-12T16:00',cake:true});await regressionPage.locator('#cake-order-fields').scrollIntoViewIfNeeded();await regressionPage.screenshot({path:path.join(root,'deploy-demo-check/cake-form-mobile.png')});
 await regressionPage.locator('#save-order-button').click();await regressionPage.locator('#order-form-error').waitFor({state:'visible'});assert.match(await regressionPage.locator('#order-form-error').innerText(),/Tamanho/);
 const optionalDetails=regressionPage.locator('#order-form .optional-fields');if(!await optionalDetails.evaluate(el=>el.open))await optionalDetails.locator('summary').click();await regressionPage.locator('#order-form [name="cake.size"]').selectOption({label:'20 cm'});await regressionPage.locator('#save-order-button').click();await regressionPage.waitForFunction(()=>!document.querySelector('#order-dialog').open);
 regressionState=await stateOf();const cakeOrder=regressionState.orders.find(x=>x.client==='Bolo com tamanho obrigatório');assert.equal(cakeOrder.cake.values.size,'20 cm');assert.equal(cakeOrder.cake.labels.size,'Tamanho');assert.equal(cakeOrder.cake.templateVersion,configuredTemplate.version);
 await regressionPage.locator('[data-view="orders"].nav-item').click();await regressionPage.locator(`#view-orders [data-open-order="${cakeOrder.id}"]`).click();assert.match(await regressionPage.locator('#detail-content').innerText(),/Tamanho[\s\S]*20 cm/);await regressionPage.locator('#detail-dialog [data-close]').click();
 // Renaming the global template and editing an old cake must preserve its original label snapshot.
 await regressionPage.locator('.settings-button').click();await regressionPage.locator('#view-settings h1').waitFor();await regressionPage.locator('.order-template-settings > summary').click();const renameField=regressionPage.locator('#order-template-form .template-field').filter({has:regressionPage.locator('input[name="label.size"]')});const renameSizeInput=renameField.locator('input[name="label.size"]');if(!(await renameSizeInput.isVisible()))await renameField.locator('summary').click();await renameSizeInput.fill('Diâmetro');await regressionPage.locator('#order-template-form').evaluate(form=>form.requestSubmit());await waitForState(s=>s.orderTemplate.fields.find(f=>f.key==='size')?.label==='Diâmetro');const renamedTemplate=(await stateOf()).orderTemplate;assert.equal(renamedTemplate.version,configuredTemplate.version+1);
 await regressionPage.locator('[data-view="orders"].nav-item').click();await regressionPage.locator(`#view-orders [data-open-order="${cakeOrder.id}"]`).click();await regressionPage.locator('#detail-content [data-action="edit-order"]').click();await regressionPage.locator('#save-order-button').click();await regressionPage.waitForFunction(()=>!document.querySelector('#order-dialog').open);const editedCake=(await stateOf()).orders.find(x=>x.id===cakeOrder.id);assert.equal(editedCake.cake.templateVersion,cakeOrder.cake.templateVersion);await regressionPage.locator(`#view-orders [data-open-order="${cakeOrder.id}"]`).click();assert.match(await regressionPage.locator('#detail-content').innerText(),/Tamanho[\s\S]*20 cm/);await regressionPage.locator('#detail-dialog [data-close]').click();
 // The restore modal keeps confirmation disabled for invalid JSON and preserves the prior browser state on a valid replacement.
 await regressionPage.locator('.settings-button').click();await regressionPage.locator('#view-settings h1').waitFor();const oldState=await stateOf(),restorePage=regressionPage.locator('#restore-file');await regressionPage.locator('#restore-button').click();await restorePage.setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{bad json')});assert.equal(await regressionPage.locator('#restore-confirm').isDisabled(),true);
 const replacement=structuredClone(oldState);replacement.orders=[{...cakeOrder,id:'RESTORED-ONLY',client:'Pedido restaurado',history:[{at:new Date().toISOString(),text:'Importado no teste.'}]}];replacement.payments=[];
 await restorePage.setInputFiles({name:'backup-valid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(replacement))});await regressionPage.waitForFunction(()=>!document.querySelector('#restore-confirm').disabled);assert.equal(await regressionPage.locator('#restore-confirm').isDisabled(),false);await regressionPage.locator('#restore-confirm').click();await regressionPage.waitForFunction(()=>!document.querySelector('#restore-dialog').open);
 const restored=await stateOf();assert.equal(restored.orders.length,1);assert.equal(restored.orders[0].id,'RESTORED-ONLY');const preserved=await regressionPage.evaluate(()=>JSON.parse(localStorage.getItem('doce-agenda.pilot.v1.pre-import')));assert.deepEqual(preserved,oldState);
 await regressionContext.close();
 // A fresh first-use context can start an order even while the welcome experience is shown.
 await mkdir(path.join(root,'deploy-demo-check'),{recursive:true});
 const firstUse=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});await firstUse.addInitScript(()=>localStorage.removeItem('doce-agenda.pilot.v1'));const firstPage=await firstUse.newPage();await firstPage.goto(origin);await firstPage.locator('#view-today h1').waitFor();await firstPage.screenshot({path:path.join(root,'deploy-demo-check/first-use-mobile.png'),fullPage:true});await firstPage.screenshot({path:path.join(root,'deploy-demo-check/first-use-mobile-viewport.png')});await firstPage.locator('.welcome-actions [data-action="new-order"]').click();assert.equal(await firstPage.locator('#order-dialog').evaluate(el=>el.open),true,'A primeira visita não deve bloquear a criação de um pedido.');await firstPage.screenshot({path:path.join(root,'deploy-demo-check/form-390.png'),fullPage:true});await firstUse.close();
 // Mobile layouts stay inside common narrow widths, form controls remain readable, and reduced motion is respected.
 await page.locator('#detail-dialog').evaluate(el=>{if(el.open)el.close();});
 for(const width of [320,390]){
  await page.setViewportSize({width,height:844});await page.locator('[data-view="today"].nav-item').click();
  const mobile=await page.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth}));assert.ok(mobile.scrollWidth<=mobile.width,`Overflow at ${width}px: ${mobile.scrollWidth}px.`);
  await page.locator('.nav-new-order').click();const inputSize=await page.locator('#order-form input[name=client]').evaluate(el=>parseFloat(getComputedStyle(el).fontSize));assert.ok(inputSize>=16,`Form input font size is ${inputSize}px at ${width}px.`);if(width===320)await page.screenshot({path:path.join(root,'deploy-demo-check/form-320.png'),fullPage:true});if(width===390)await page.screenshot({path:path.join(root,'deploy-demo-check/form-390-registered-data.png'),fullPage:true});await page.locator('#order-dialog [data-close]').first().click();
 }
 await page.setViewportSize({width:430,height:932});await page.locator('.nav-new-order').click();await page.screenshot({path:path.join(root,'deploy-demo-check/form-430.png'),fullPage:true});await page.locator('#order-dialog [data-close]').first().click();
 await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.evaluate(()=>matchMedia('(prefers-reduced-motion: reduce)').matches),true);const reducedDuration=await page.locator('.spinner').evaluate(el=>parseFloat(getComputedStyle(el).animationDuration));assert.ok(reducedDuration<=0.00002,`Reduced-motion animation duration remains ${reducedDuration}s.`);
 assert.deepEqual(errors,[]);assert.deepEqual(apiNetwork,[]);await mkdir(path.join(root,'deploy-demo-check'),{recursive:true});await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(root,'deploy-demo-check/mobile.png'),fullPage:true});
 const desktop=await browser.newContext({viewport:{width:1440,height:1000}});const desktopPage=await desktop.newPage();await desktopPage.goto(origin);await desktopPage.locator('#view-today h1').waitFor();await desktopPage.screenshot({path:path.join(root,'deploy-demo-check/desktop.png'),fullPage:true});await desktop.close();
 console.log('OK: cadastro, persistência, pagamentos e saldo, edição, welcome, fontes, layouts/reduced motion, disponibilidade semanal e por data, capacidade/exceção, campos de bolo e rótulos antigos, restauração/backup e isolamento. Zero requisições de dados à rede.');
}finally{await browser.close();if(server)await new Promise(r=>server.close(r));}
