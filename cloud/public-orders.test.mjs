import test from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyState,transactState } from './state-engine.js';
import { availabilityDates,createPublicRequest,productSlots,publicPageView,trackView } from './public-orders.js';
import { orderPageInput } from './order-link-model.js';
const page={active:true,slug:'doces-da-ana',displayName:'Doces da Ana',welcome:'Bem-vinda',whatsapp:'+5511999999999',products:[{name:'Bolo',description:''}]};
const initial=()=>({...createEmptyState(),orderPage:page});
const body={client:'Cliente fictícia',contact:'11988887777',product:'Bolo',other:false,date:'2099-01-31',time:'15:00',mode:'Entrega',location:'Rua de teste',details:'Chocolate',consent:true};
test('public page does not expose owner, orders, or counts; inactive is minimal',()=>{
  const data=publicPageView(page,initial());assert.deepEqual(Object.keys(data).sort(),['active','color','cover','displayName','instagram','logo','noticeHours','orderTemplate','privacyUrl','products','share','style','welcome','whatsapp'].sort());
  assert.equal(data.style,'atelie');assert.equal(data.noticeHours,0);
  assert.deepEqual(Object.keys(publicPageView({...page,active:false},initial())).sort(),['active','message']);
});
test('page validates slug, lengths, product count and WhatsApp',()=>{
  assert.equal(orderPageInput(page).slug,page.slug);
  for(const slug of ['ab','../p','Doces','a'.repeat(41),'-abc'])assert.throws(()=>orderPageInput({...page,slug}));
  assert.throws(()=>orderPageInput({...page,products:Array(31).fill(page.products[0])}));
  assert.throws(()=>orderPageInput({...page,welcome:'x'.repeat(281)}));
});
test('vitrine fields are optional, validated and old pages keep working',()=>{
  const old=orderPageInput(page);assert.equal(old.style,'atelie');assert.equal(old.color,'');assert.deepEqual(old.products,[{name:'Bolo',description:''}]);
  const full=orderPageInput({...page,style:'caseira',color:'#AABBCC',instagram:'https://instagram.com/doces.da_ana/',logo:'exemplo/logo-lu.svg',
    products:[{name:'Bolo',description:'',category:'Bolos',priceFromCents:15000,featured:true,photo:`${'a'.repeat(32)}/${'1'.repeat(8)}-1111-1111-1111-${'1'.repeat(12)}.webp`}]});
  assert.equal(full.color,'#aabbcc');assert.equal(full.instagram,'doces.da_ana');assert.equal(full.products[0].priceFromCents,15000);assert.equal(full.products[0].featured,true);
  for(const bad of [{style:'neon'},{color:'red'},{instagram:'não vale'},{logo:'../outra-conta/x.webp'},{cover:'https://evil.test/x.jpg'}])assert.throws(()=>orderPageInput({...page,...bad}));
  for(const p of [{priceFromCents:1.5},{priceFromCents:-1},{category:'x'.repeat(31)},{photo:'a/b.png'}])assert.throws(()=>orderPageInput({...page,products:[{name:'Bolo',description:'',...p}]}));
  const four=['A','B','C','D'].map(name=>({name,description:'',featured:true}));assert.throws(()=>orderPageInput({...page,products:four}),/até 3/);
});
test('extras become text in the details of a single request',()=>{
  const s={...initial(),orderPage:{...page,products:[{name:'Bolo',description:''},{name:'Brigadeiro',description:''}]}};
  const made=createPublicRequest(s,{...body,extras:['Brigadeiro']},'DA-ABC234');
  assert.equal(made.order.product,'Bolo');assert.equal(made.order.details,'Chocolate\nTambém quero: Brigadeiro');assert.match(made.confirmation.summary,/Também quero: Brigadeiro/);
  for(const extras of [['Bolo'],['Inventado'],'Brigadeiro',Array(6).fill('Brigadeiro')])assert.throws(()=>createPublicRequest(s,{...body,extras},'DA-ABC234'));
  assert.equal(createPublicRequest(s,body,'DA-ABC234').order.details,'Chocolate');
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
test('cake details follow the product mark; old products still follow the name',()=>{
  assert.equal(orderPageInput({...page,products:[{name:'Naked cake',description:'',cakeFields:true}]}).products[0].cakeFields,true);
  assert.equal('cakeFields' in orderPageInput(page).products[0],false,'sem marca continua sem marca');
  assert.throws(()=>orderPageInput({...page,products:[{name:'Bolo',description:'',cakeFields:'sim'}]}),/Detalhes do bolo/);
  const template={...createEmptyState().orderTemplate,fields:[{key:'flavor',label:'Sabor',enabled:true,required:true,options:[]}]};
  const s=(products)=>({...initial(),orderTemplate:template,orderPage:{...page,products}});
  const ask=(products,product,cake)=>createPublicRequest(s(products),{...body,product,...(cake?{cake}:{})},'DA-ABC234').order.cake;
  assert.throws(()=>ask([{name:'Naked cake',description:'',cakeFields:true}],'Naked cake'),/[Ss]abor/,'marcado: exige o obrigatório');
  assert.equal(ask([{name:'Naked cake',description:'',cakeFields:true}],'Naked cake',{flavor:'Ninho'}).values.flavor,'Ninho');
  assert.equal(ask([{name:'Bolo de pote',description:'',cakeFields:false}],'Bolo de pote'),null,'desmarcado: sem perguntas, mesmo com "bolo" no nome');
  assert.throws(()=>ask([{name:'Bolo',description:''}],'Bolo'),/[Ss]abor/,'sem marca: o nome com bolo ainda pede');
  assert.equal(ask([{name:'Torta',description:''}],'Torta'),null);
});

test('big products take more slots on the link: dates and requests follow',()=>{
  assert.equal(orderPageInput({...page,products:[{name:'Bolo de casamento',description:'',slots:3}]}).products[0].slots,3);
  assert.equal('slots' in orderPageInput({...page,products:[{name:'Bolo',description:'',slots:1}]}).products[0],false,'1 é o normal e não é guardado');
  for(const slots of [0,11,2.5])assert.throws(()=>orderPageInput({...page,products:[{name:'Bolo',description:'',slots}]}),/Vagas/);
  const s={...initial(),availability:{...createEmptyState().availability,dailyOrderLimit:3},orderPage:{...page,products:[{name:'Bolo',description:''},{name:'Bolo de casamento',description:'',slots:3}]}};
  s.orders.push({id:'x',client:'A',product:'Doces',details:'',dueAt:'2099-01-31T10:00',mode:'Retirada',location:'',total:50,status:'Confirmado',nextAction:'',nextAt:'',pendingChange:'',contact:'',history:[]});
  const day=(slots)=>availabilityDates(s,'2099-01-31','2099-01-31',slots)[0].available;
  assert.equal(day(1),true);assert.equal(day(3),false,'1 vaga usada: casamento (3) não cabe');
  assert.equal(productSlots(s.orderPage.products[1]),3);assert.equal(productSlots(undefined),1);
  assert.throws(()=>createPublicRequest(s,{...body,product:'Bolo de casamento'},'DA-ABC234'),/indisponível/);
  const made=createPublicRequest(s,{...body,product:'Bolo de casamento',date:'2099-02-01'},'DA-ABC234');
  assert.equal(made.order.slots,3,'o pedido do link leva as vagas do doce');
  assert.equal('slots' in createPublicRequest(s,body,'DA-ABC234').order,false);
});

test('special dates close the link for the limited product only',()=>{
  const s={...initial(),availability:{...createEmptyState().availability,specialDates:[{id:'esp-1',name:'Páscoa',from:'2099-04-01',to:'2099-04-05',limits:[{product:'Ovo de colher',max:1}]}]},
    orderPage:{...page,products:[{name:'Bolo',description:''},{name:'Ovo de colher',description:''}]}};
  s.orders.push({id:'x',client:'A',product:'Ovo de colher',details:'',dueAt:'2099-04-02T10:00',mode:'Retirada',location:'',total:80,status:'Confirmado',nextAction:'',nextAt:'',pendingChange:'',contact:'',history:[]});
  const open=(product,day)=>availabilityDates(s,day,day,1,product)[0].available;
  assert.equal(open('Ovo de colher','2099-04-03'),false,'esgotado no período');
  assert.equal(open('Ovo de colher','2099-04-06'),true,'depois do período volta');
  assert.equal(open('Bolo','2099-04-03'),true,'outro doce segue livre');
  assert.equal(open('','2099-04-03'),true,'sem doce, só as regras do dia');
  assert.throws(()=>createPublicRequest(s,{...body,product:'Ovo de colher',date:'2099-04-03'},'DA-ABC234'),/indisponível/);
  assert.equal(createPublicRequest(s,{...body,product:'Bolo',date:'2099-04-03'},'DA-ABC234').order.product,'Bolo');
});

test('my order page: a secret link shows only the situation, never personal data',()=>{
  const token='abcdefghijkmnpqrstuvwxyz2';
  const made=createPublicRequest(initial(),{...body,details:'Sem glúten'},'DA-ABC234',undefined,token);
  assert.equal(made.order.trackToken,token);
  assert.equal(made.confirmation.trackUrl,`https://lucast.app/p/doces-da-ana?pedido=${token}`);
  assert.match(made.confirmation.summary,/Acompanhe o pedido: https:\/\/lucast\.app\/p\/doces-da-ana\?pedido=/);
  assert.throws(()=>createPublicRequest(initial(),body,'DA-ABC234',undefined,'curto'),/acompanhamento/);
  const s=made.state;
  const view=trackView(s,token);
  assert.deepEqual(Object.keys(view).sort(),['code','displayName','dueAt','mode','product','stage','whatsapp']);
  assert.equal(view.stage,'decidir');assert.equal(view.code,'DA-ABC234');
  assert.doesNotMatch(JSON.stringify(view),/Cliente fictícia|11988887777|Rua de teste|glúten/,'sem nome, WhatsApp, endereço nem detalhes');
  const order=s.orders.find(o=>o.trackToken===token);
  Object.assign(order,{status:'Em produção',total:200,totalKnown:true});
  s.payments.push({id:'p1',orderId:order.id,amount:60,status:'Conferido',createdAt:'2099-01-01T10:00:00Z'},{id:'p2',orderId:order.id,amount:40,status:'Informado',createdAt:'2099-01-01T10:00:00Z'});
  assert.deepEqual([trackView(s,token).stage,trackView(s,token).totalCents,trackView(s,token).paidCents],['fazendo',20000,6000],'só o conferido conta');
  for(const bad of ['', 'abc', token.toUpperCase(), 'zzzzzzzzzzzzzzzzzzzzzzzz'])assert.equal(trackView(s,bad),null);
});
