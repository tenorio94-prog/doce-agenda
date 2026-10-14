import test from 'node:test';
import assert from 'node:assert/strict';
import { monthlySummary, saoPauloDay } from './monthly-summary.js';
import { createEmptyState, transactState } from './state-engine.js';

const now = new Date('2026-10-13T12:00:00Z');
const makeOrder = (id, changes = {}) => ({ id, client: 'Cliente fictícia', product: 'Bolo de Cenoura', status: 'Confirmado', dueAt: '2026-10-06T15:00', total: 100.1, createdAt: '2026-10-03T12:00:00Z', history: [], ...changes });
const payment = (orderId, amount, status = 'Conferido') => ({ id: `p-${orderId}-${amount}-${status}`, orderId, amount, status, createdAt: '2026-09-01T12:00:00Z' });
const summary = state => monthlySummary(state, '2026-10', now);

test('all seven definitions use eligible orders, integer cents and checked payments', () => {
  const state = createEmptyState();
  state.orders = [makeOrder('a'), makeOrder('b', { product: 'BOLO DE CENÓURA', total: 50.2, status: 'Entregue', createdAt: '2026-10-05T12:00:00Z' }), makeOrder('c', { product:'bolo de cenoura', total:0, totalKnown:false, dueAt:'2026-10-07T17:00', createdAt:'2026-10-05T12:00:00Z' }),
    ...['Cancelado','Recusado','Orçamento','Solicitação','Aguardando confirmação','Em produção','Pronto'].map(status => makeOrder(status, {status})), makeOrder('no-date',{dueAt:''}), makeOrder('other-month',{dueAt:'2026-09-30T23:30'}),makeOrder('sample',{isSample:true})];
  state.payments = [payment('a',30.1),payment('b',10.2),payment('a',500,'Informado'),payment('Cancelado',100),payment('unknown-order',100)];
  const result = summary(state);
  assert.equal(result.ordersCount,3);assert.equal(result.soldCents,15030);assert.equal(result.receivedCents,4030);assert.equal(result.receivableCents,11000);assert.equal(result.ordersWithoutValue,1);
  assert.deepEqual(result.busiestDays,[{weekday:2,name:'Terça-feira',count:2},{weekday:3,name:'Quarta-feira',count:1}]);
  assert.deepEqual(result.topProducts,[{name:'Bolo de Cenoura',count:3}]);assert.equal(result.averageNoticeDays,2);assert.equal(result.noticeOrdersCount,3);
});
test('São Paulo month boundaries support wall times and explicit offsets, independent of host timezone', () => {
  assert.equal(saoPauloDay('2026-11-01T02:30:00Z'),'2026-10-31');assert.equal(saoPauloDay('2026-10-31T23:30'),'2026-10-31');
  assert.equal(saoPauloDay('2026-10-01T02:30:00Z'),'2026-09-30');assert.equal(saoPauloDay('2026-02-30T23:30'),null);
  const result=summary({orders:[makeOrder('wall',{dueAt:'2026-10-31T23:30'}),makeOrder('utc',{dueAt:'2026-11-01T02:30:00Z'}),makeOrder('before',{dueAt:'2026-10-01T02:30:00Z'})],payments:[]});assert.equal(result.ordersCount,2);
  assert.throws(()=>monthlySummary(createEmptyState(),'2026-11',new Date('2026-11-01T02:30:00Z')),/mês válido/);
});
test('excess checked receipts never make receivable negative, including unknown totals', () => {
  const result=summary({orders:[makeOrder('a',{total:0.3}),makeOrder('b',{total:null})],payments:[payment('a',0.1),payment('a',0.2),payment('b',50)]});
  assert.equal(result.soldCents,30);assert.equal(result.receivedCents,5030);assert.equal(result.receivableCents,0);assert.equal(result.ordersWithoutValue,1);
});
test('empty and small months return truthful counts, missing dates are not treated as zero notice', () => {
  const empty=summary(createEmptyState());assert.equal(empty.ordersCount,0);assert.deepEqual(empty.busiestDays,[]);assert.deepEqual(empty.topProducts,[]);assert.equal(empty.averageNoticeDays,null);
  const small=summary({orders:[makeOrder('a',{createdAt:undefined}),makeOrder('b',{total:0})],payments:[]});assert.equal(small.ordersCount,2);assert.equal(small.ordersWithoutValue,0);assert.equal(small.noticeOrdersCount,1);assert.equal(small.averageNoticeDays,3);
});
test('top 3 weekdays and top 5 products have stable ties ordered Monday through Sunday and by product',()=>{
  const orders=Array.from({length:7},(_,i)=>makeOrder(String(i),{product:`Produto ${i}`,dueAt:`2026-10-${String(5+i).padStart(2,'0')}T12:00`}));
  const result=summary({orders,payments:[]});assert.deepEqual(result.busiestDays.map(d=>d.weekday),[1,2,3]);assert.equal(result.topProducts.length,5);
});
test('invalid/missing/future months fail; reading the route never mutates state',()=>{
  for(const month of [null,'','2026-00','2026-13','2026-1','2027-01','x','0001-01'])assert.throws(()=>monthlySummary(createEmptyState(),month,now),/mês válido/);
  const state=createEmptyState(),before=structuredClone(state),month=saoPauloDay(new Date()).slice(0,7);
  const result=transactState(state,`/api/resumo-mensal?mes=${month}`);assert.equal(result.status,200);assert.equal(result.mutated,false);assert.deepEqual(state,before);
});
test('new missing-value marker survives export/import; old backups keep original totals',()=>{
  const state=createEmptyState();state.orders=[makeOrder('unknown',{total:0,totalKnown:false}),makeOrder('legacy',{total:0})];
  const exported=transactState(state,'/api/export').body;
  const restored=transactState(createEmptyState(),'/api/import',{method:'POST',body:JSON.stringify(exported)});
  assert.equal(restored.status,200);assert.equal(restored.state.orders[0].totalKnown,false);assert.equal(restored.state.orders[1].totalKnown,undefined);assert.equal(summary(restored.state).ordersWithoutValue,1);
});
test('thousands of orders and receipts are aggregated in linear passes',()=>{
  const state={orders:Array.from({length:5000},(_,i)=>makeOrder(String(i))),payments:Array.from({length:20000},(_,i)=>payment(String(i%5000),0.1))};
  const start=performance.now(),result=summary(state),elapsed=performance.now()-start;
  assert.equal(result.ordersCount,5000);assert.equal(result.soldCents,50050000);assert.equal(result.receivedCents,200000);assert.ok(elapsed<2500,`Took ${elapsed}ms`);
  console.log(`Monthly aggregation: 5000 orders + 20000 receipts in ${Math.round(elapsed)} ms`);
});
test('older clients can price a request without sending the new optional marker',()=>{
  const state=createEmptyState();state.orders=[makeOrder('public',{status:'Solicitação',total:0,totalKnown:false,origin:'link',dueAt:'2099-10-06T15:00'})];
  const accepted=transactState(state,'/api/orders/public/accept',{method:'POST',body:JSON.stringify({status:'Confirmado',order:{total:150}})});
  assert.equal(accepted.status,200);assert.equal(accepted.body.total,150);assert.equal(accepted.body.totalKnown,true);
});
