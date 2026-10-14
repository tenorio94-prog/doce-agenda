import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState,transactState } from './state-engine.js';
import { availabilityDates,createPublicRequest,publicPageView } from './public-orders.js';
import { orderPageInput } from './order-link-model.js';
const page={active:true,slug:'doces-da-ana',displayName:'Doces da Ana',welcome:'Bem-vinda',whatsapp:'+5511999999999',products:[{name:'Bolo',description:''}]};
const initial=()=>({...createEmptyState(),orderPage:page});
const body={client:'Cliente fictícia',contact:'11988887777',product:'Bolo',other:false,date:'2099-01-31',time:'15:00',mode:'Entrega',location:'Rua de teste',details:'Chocolate',consent:true};
test('public page does not expose owner, orders, or counts; inactive is minimal',()=>{
  const data=publicPageView(page,initial());assert.deepEqual(Object.keys(data).sort(),['active','displayName','orderTemplate','privacyUrl','products','welcome','whatsapp'].sort());
  assert.deepEqual(Object.keys(publicPageView({...page,active:false},initial())).sort(),['active','message']);
});
test('page validates slug, lengths, product count and WhatsApp',()=>{
  assert.equal(orderPageInput(page).slug,page.slug);
  for(const slug of ['ab','../p','Doces','a'.repeat(41),'-abc'])assert.throws(()=>orderPageInput({...page,slug}));
  assert.throws(()=>orderPageInput({...page,products:Array(31).fill(page.products[0])}));
  assert.throws(()=>orderPageInput({...page,welcome:'x'.repeat(281)}));
});
test('availability spans month, excludes full dates and ignores requests',()=>{
  const s=initial();s.availability.dailyOrderLimit=1;
  s.orders=[{status:'Solicitação',dueAt:'2099-01-31T15:00'}];
  assert.deepEqual(availabilityDates(s,'2099-01-31','2099-02-01').map(x=>x.available),[true,true]);
  s.orders[0].status='Confirmado';assert.equal(availabilityDates(s,'2099-01-31','2099-02-01')[0].available,false);
  s.availability.dateOverrides['2099-02-01']={closed:true,limit:null};assert.equal(availabilityDates(s,'2099-02-01','2099-02-01')[0].available,false);
  assert.throws(()=>availabilityDates(s,'2099-01-01','2099-05-01'));
});
test('São Paulo notice boundary uses requested time and calendar end-of-day',()=>{
  const real=Date.now;Date.now=()=>Date.parse('2099-01-31T12:00:00-03:00');
  try {const s=initial();s.availability.minimumNoticeHours=4;assert.equal(availabilityDates(s,body.date,body.date)[0].available,true);
    assert.throws(()=>createPublicRequest(s,body,'DA-ABC234'),/indisponível/);
    assert.equal(createPublicRequest(s,{...body,time:'16:00'},'DA-ABC234').order.status,'Solicitação');
  }finally{Date.now=real;}
});
test('request validates consent/address, records metadata, flags BOTH duplicates',()=>{
  assert.throws(()=>createPublicRequest(initial(),{...body,consent:false},'DA-ABC234'));
  assert.throws(()=>createPublicRequest(initial(),{...body,location:''},'DA-ABC234'));
  assert.throws(()=>createPublicRequest(initial(),{...body,details:'x'.repeat(1001)},'DA-ABC234'));
  const first=createPublicRequest(initial(),body,'DA-ABC234','2026-10-13T12:00:00Z');
  const second=createPublicRequest(first.state,body,'DA-DEF234','2026-10-13T12:05:00Z');
  assert.equal(second.state.orders.length,2);assert.ok(second.state.orders.every(o=>o.possibleDuplicate));assert.equal(second.order.origin,'link');assert.ok(second.order.consentAt);
  assert.equal(second.confirmation.whatsapp,page.whatsapp);assert.match(second.confirmation.summary,/ainda|Ainda/);
});
test('accept last-slot race revalidates capacity, refusal/history and backup preserve page',()=>{
  let s=initial();s.availability.dailyOrderLimit=1;
  const one=createPublicRequest(s,body,'DA-ABC234'),two=createPublicRequest(one.state,{...body,client:'Outra'},'DA-DEF234');
  const accept=(state,id)=>transactState(state,`/api/orders/${id}/accept`,{method:'POST',body:JSON.stringify({status:'Confirmado'})});
  const a=accept(two.state,one.order.id);assert.equal(a.status,200);
  const b=accept(a.state,two.order.id);assert.equal(b.status,409);assert.equal(b.body.code,'DAILY_LIMIT');
  const refused=transactState(a.state,`/api/orders/${two.order.id}/refuse`,{method:'POST',body:JSON.stringify({reason:'Agenda sem vaga'})});
  assert.equal(refused.body.status,'Recusado');assert.match(refused.body.history.at(-1).text,/Agenda sem vaga/);
  const imported=transactState(initial(),'/api/import',{method:'POST',body:JSON.stringify(refused.state)});
  assert.equal(imported.status,200);assert.equal(imported.state.orderPage.slug,page.slug);assert.equal(imported.state.orders[0].origin,'link');
  const disabled={...two.state,orderPage:{...page,active:false}};assert.equal(disabled.orders.length,2);assert.throws(()=>createPublicRequest(disabled,body,'DA-GHI234'));
});
