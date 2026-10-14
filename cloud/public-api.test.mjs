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
