import test from 'node:test';import assert from 'node:assert/strict';
import {createPublicHandler} from './public-api.ts';
test('public handler strictly denies private routes/methods and arbitrary origins',async()=>{
 const handle=createPublicHandler({env:()=>'',createClient:()=>{throw Error('Should not touch database');}});
 for(const [path,method]of [['/p/test/orders','GET'],['/p/test/requests','GET'],['/p/test','DELETE']]){
  const r=await handle(new Request('https://edge.test/doce-public'+path,{method}));assert.equal(r.status,404);
 }
 const denied=await handle(new Request('https://edge.test/doce-public/p/test',{headers:{Origin:'https://evil.test'}}));assert.equal(denied.status,403);
});
test('honeypot creates no records and never reaches tables or RPC',async()=>{
 let accessed=false;const handle=createPublicHandler({env:()=>'',createClient:()=>({from(){accessed=true;throw Error('DB access');}})});
 const r=await handle(new Request('https://edge.test/doce-public/p/test/requests',{method:'POST',body:JSON.stringify({website:'bot.test'})}));assert.equal(r.status,201);assert.equal(accessed,false);
});
test('oversized public payload is rejected before database access',async()=>{
 const handle=createPublicHandler({env:()=>'',createClient:()=>({from(){throw Error('Should not reach DB');}})});
 const r=await handle(new Request('https://edge.test/doce-public/p/test/requests',{method:'POST',body:'x'.repeat(9000)}));assert.equal(r.status,413);
});
test('funnel start only adds to the page counter, and a missing counter changes nothing',async()=>{
 const calls=[];
 const client=(rpcError=null)=>()=>({from(table){assert.equal(table,'pilot_order_pages');return{select(){return this;},eq(column,value){calls.push([column,value]);return this;},async maybeSingle(){return{data:{owner_user_id:'dona-id'},error:null};}};},
  async rpc(name,args){calls.push([name,args.p_owner]);return{data:null,error:rpcError};}});
 const ok=await createPublicHandler({env:()=>'',createClient:client()})(new Request('https://edge.test/doce-public/p/doces-da-ana/inicio',{method:'POST'}));
 assert.equal(ok.status,204);assert.deepEqual(calls,[['slug','doces-da-ana'],['record_pilot_page_start','dona-id']]);
 const missing=await createPublicHandler({env:()=>'',createClient:client({code:'PGRST202',message:'function not found'})})(new Request('https://edge.test/doce-public/p/doces-da-ana/inicio',{method:'POST'}));
 assert.equal(missing.status,204,'sem a migração, a cliente não percebe nada');
 const get=await createPublicHandler({env:()=>'',createClient:()=>{throw Error('Should not touch database');}})(new Request('https://edge.test/doce-public/p/doces-da-ana/inicio'));
 assert.equal(get.status,404,'só POST');
});

test('my order route reads only the matching store and answers 404 for unknown links',async()=>{
 const token='abcdefghijkmnpqrstuvwxyz2';
 const state={version:1,orderPage:{active:true,slug:'doces-da-ana',displayName:'Doces da Ana',whatsapp:'+5511999999999',products:[]},payments:[],
  orders:[{id:'o1',client:'Cliente fictícia',contact:'11988887777',product:'Bolo',dueAt:'2099-01-31T15:00',mode:'Retirada',status:'Confirmado',total:150,totalKnown:true,publicCode:'DA-ABC234',trackToken:token}]};
 const client=()=>({from(table){const q={table,filters:[]};const b={select(){return b;},eq(c,v){q.filters.push([c,v]);return b;},
  async maybeSingle(){assert.equal(table,'pilot_order_pages');return{data:q.filters[0][1]==='doces-da-ana'?{owner_user_id:'dona'}:null,error:null};},
  async single(){assert.equal(table,'pilot_agendas');return{data:{state},error:null};}};return b;}});
 const handle=createPublicHandler({env:()=>'',createClient:client});
 const ok=await handle(new Request(`https://edge.test/doce-public/p/doces-da-ana/pedido/${token}`));
 assert.equal(ok.status,200);const view=await ok.json();
 assert.equal(view.stage,'combinado');assert.equal(view.totalCents,15000);assert.doesNotMatch(JSON.stringify(view),/Cliente fictícia|11988887777/);
 assert.equal((await handle(new Request(`https://edge.test/doce-public/p/doces-da-ana/pedido/${'x'.repeat(24)}`))).status,404);
 assert.equal((await handle(new Request(`https://edge.test/doce-public/p/outra-loja/pedido/${token}`))).status,404,'o link vale só na loja do pedido');
 assert.equal((await handle(new Request(`https://edge.test/doce-public/p/doces-da-ana/pedido/${token}`,{method:'POST'}))).status,404);
});
