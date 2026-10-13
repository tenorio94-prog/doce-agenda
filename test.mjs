import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,readdir} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createApp} from './server.mjs';
test('pedido, parcelas, conferência, histórico, persistência e validação',async(t)=>{
 t.mock.timers.enable({apis:['Date'],now:new Date('2026-10-01T12:00:00-03:00')});
 const dataDir=await mkdtemp(join(tmpdir(),'doce-agenda-test-'));let server=await createApp({dataDir});
 const listen=async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${server.address().port}`;};let base=await listen();
 const call=async(path,body,method='POST')=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 try{
 const bad=await call('/api/orders',{client:'Ana',product:'Bolo',total:100,status:'Confirmado'});assert.equal(bad.status,400);
 const {data:o,status}=await call('/api/orders',{client:'Ana',product:'Bolo',total:100,status:'Confirmado',dueAt:'2026-10-03T14:00'});assert.equal(status,201);
 const {data:p}=await call(`/api/orders/${o.id}/payments`,{amount:30,status:'Informado'});
 let state=await (await fetch(base+'/api/state')).json();assert.equal(state.payments.filter(p=>p.orderId===o.id&&p.status==='Conferido').length,0);
 await call('/api/payments/'+p.id,{status:'Conferido'},'PUT');await call('/api/payments/'+p.id,{status:'Conferido'},'PUT');
 await call(`/api/orders/${o.id}/payments`,{amount:20,status:'Conferido'});
 await call('/api/orders/'+o.id,{pendingChange:'Mudar horário para 15h'},'PUT');
 state=await (await fetch(base+'/api/state')).json();assert.equal(state.payments.filter(p=>p.orderId===o.id&&p.status==='Conferido').reduce((s,p)=>s+p.amount,0),50);assert.equal(state.orders.find(x=>x.id===o.id).dueAt,o.dueAt);assert.equal(state.orders.find(x=>x.id===o.id).history.length,5);
 const negative=await call(`/api/orders/${o.id}/payments`,{amount:-1,status:'Conferido'});assert.equal(negative.status,400);
 const forbidden=await fetch(base+'/api/orders',{method:'POST',headers:{Origin:'http://external.example','Content-Type':'application/json'},body:'{}'});assert.equal(forbidden.status,403);
 await call('/api/orders/'+o.id,{status:'Cancelado'},'PUT');
 await new Promise(r=>server.close(r));server=await createApp({dataDir});base=await listen();state=await (await fetch(base+'/api/state')).json();assert.equal(state.orders.find(x=>x.id===o.id).status,'Cancelado');assert.equal(state.payments.filter(p=>p.orderId===o.id).length,2);
 const exported=await (await fetch(base+'/api/export')).json();assert.deepEqual(exported,state);
 }finally{await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true});}
});

test('disponibilidade, exceções, capacidade, antecedência e importação validada',async(t)=>{
 t.mock.timers.enable({apis:['Date'],now:new Date('2026-10-01T12:00:00-03:00')});
 const dataDir=await mkdtemp(join(tmpdir(),'doce-availability-test-'));let server=await createApp({dataDir});
 const listen=async()=>{await new Promise(r=>server.listen(0,'127.0.0.1',r));return `http://127.0.0.1:${server.address().port}`;};let base=await listen();
 const call=async(path,body,method='POST')=>{const r=await fetch(base+path,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});return {status:r.status,data:await r.json()};};
 const order=(dueAt,status='Confirmado',extras={})=>({client:'Ana',product:'Bolo',total:80,status,dueAt,...extras});
 try{
  let state=await (await fetch(base+'/api/state')).json();assert.deepEqual(state.availability,{closedWeekdays:[],minimumNoticeHours:0,dailyOrderLimit:null,dateOverrides:{}});assert.equal(state.orderTemplate.version,1);
  const closedDay='2032-04-10',weekday=new Date(closedDay+'T00:00:00Z').getUTCDay();
  let config={closedWeekdays:[weekday],minimumNoticeHours:0,dailyOrderLimit:null,dateOverrides:{}};
  assert.equal((await call('/api/availability',config,'PUT')).status,200);
  let blocked=await call('/api/orders',order(closedDay+'T15:00'));assert.equal(blocked.status,409);assert.equal(blocked.data.code,'DATE_CLOSED');
  let overridden=await call('/api/orders',order(closedDay+'T15:00','Confirmado',{capacityOverride:{allowed:true,reason:'Feriado especial'}}));assert.equal(overridden.status,201);assert.match(overridden.data.history.at(-1).text,/Feriado especial/);
  config={closedWeekdays:[weekday],minimumNoticeHours:0,dailyOrderLimit:1,dateOverrides:{[closedDay]:{closed:false,limit:2}}};await call('/api/availability',config,'PUT');
  let allowed=await call('/api/orders',order(closedDay+'T16:00'));assert.equal(allowed.status,201);
  let allowed2=await call('/api/orders',order(closedDay+'T17:00'));assert.equal(allowed2.status,409);assert.equal(allowed2.data.code,'DAILY_LIMIT');
  const another='2026-10-02';config={closedWeekdays:[],minimumNoticeHours:240,dailyOrderLimit:null,dateOverrides:{}};await call('/api/availability',config,'PUT');
  let tooSoon=await call('/api/orders',order(another+'T15:00'));assert.equal(tooSoon.status,409);assert.equal(tooSoon.data.code,'NOTICE');
  config.minimumNoticeHours=0;config.dailyOrderLimit=1;await call('/api/availability',config,'PUT');
  const withSample=await (await fetch(base+'/api/state')).json();withSample.orders.find(o=>o.isSample).dueAt=another+'T15:00';await call('/api/import',withSample);
  const cancel=await call('/api/orders',order(another+'T16:00','Cancelado'));assert.equal(cancel.status,201);
  const real=await call('/api/orders',order(another+'T17:00','Em produção'));assert.equal(real.status,201);
  const overflow=await call('/api/orders',order(another+'T18:00'));assert.equal(overflow.status,409);assert.equal(overflow.data.code,'DAILY_LIMIT');
  const template=await (await fetch(base+'/api/order-template')).json();template.fields[0].required=true;const templateUpdate=await call('/api/order-template',template,'PUT');assert.equal(templateUpdate.status,200);assert.equal(templateUpdate.data.version,2);
  const withoutCake=await call('/api/orders',order('2032-04-12T15:00'));assert.equal(withoutCake.status,201);
  const nullCake=await call('/api/orders',order('2032-04-13T15:00','Confirmado',{cake:null}));assert.equal(nullCake.status,201);
  const incompleteCake=await call('/api/orders',order('2032-04-14T15:00','Confirmado',{cake:{templateVersion:1,values:{}}}));assert.equal(incompleteCake.status,400);
  const completeCake=await call('/api/orders',order('2032-04-15T15:00','Confirmado',{cake:{templateVersion:1,values:{size:'20 cm'},labels:{size:'Tamanho original'}}}));assert.equal(completeCake.status,201);
  template.fields[0].label='Dimensão';const templateRename=await call('/api/order-template',template,'PUT');assert.equal(templateRename.data.version,3);
  const before=await (await fetch(base+'/api/state')).json(),backupCount=(await readdir(dataDir)).filter(name=>name.startsWith('state.json.backup-')).length;const invalid=structuredClone(before);invalid.payments.push({id:'bad',orderId:'missing',amount:10,status:'Informado',createdAt:new Date().toISOString()});
  assert.equal((await call('/api/import',invalid)).status,400);assert.deepEqual(await (await fetch(base+'/api/state')).json(),before);assert.equal((await readdir(dataDir)).filter(name=>name.startsWith('state.json.backup-')).length,backupCount);
  assert.equal((await call('/api/import',before)).status,200);
  assert.ok((await readdir(dataDir)).some(name=>name.startsWith('state.json.backup-')));
  await new Promise(r=>server.close(r));server=await createApp({dataDir});base=await listen();assert.deepEqual(await (await fetch(base+'/api/state')).json(),before);
  const restored=await (await fetch(base+'/api/state')).json();assert.deepEqual(restored.orders.find(o=>o.id===completeCake.data.id).cake.labels,{size:'Tamanho original'});assert.equal(restored.orders.find(o=>o.id===completeCake.data.id).cake.templateVersion,1);assert.equal(restored.orderTemplate.version,3);
 }finally{await new Promise(r=>server.close(r));await rm(dataDir,{recursive:true,force:true});}
});
