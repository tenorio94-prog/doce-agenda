import { createEmptyState, transactState } from './state-engine.js';
import { demoSeedState } from './demo-seed.js';
// /demo/ gets its own key and a full fictitious bakery; the browser-only pilot keeps one example.
const IS_DEMO=location.pathname.startsWith('/demo');
const KEY=IS_DEMO?'doce-agenda.demo.v2':'doce-agenda.pilot.v1', BACKUP_KEY=KEY+'.pre-import';
function initialState(){
  if(IS_DEMO)return demoSeedState(new Date());
  const state=createEmptyState(), day=new Date();day.setDate(day.getDate()+1);
  const dueAt=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}T16:00`,now=new Date().toISOString();
  state.orders.push({id:'EXEMPLO-001',client:'Marina',product:'Bolo de chocolate • 1,5 kg',details:'Cobertura rosa e nome na decoração. Dados fictícios para conhecer a aplicação.',dueAt,total:150,status:'Confirmado',mode:'Retirada',origin:'manual',isSample:true,createdAt:now,updatedAt:now,history:[{at:now,text:'Exemplo fictício criado para demonstração.'}]});
  state.payments.push({id:'EXEMPLO-REC-001',orderId:'EXEMPLO-001',amount:50,status:'Conferido',note:'Entrada fictícia para demonstração',createdAt:now});return state;
}
function execute(url,options={}){
  try{
    let raw=localStorage.getItem(KEY);if(raw===null){raw=JSON.stringify(initialState());localStorage.setItem(KEY,raw);}
    let state;try{state=JSON.parse(raw);}catch{return new Response(JSON.stringify({error:'Os dados deste navegador não puderam ser lidos. Não limpe o armazenamento antes de guardar uma cópia.'}),{status:500});}
    // Demos created before the example link existed get it once, if the link was never filled in.
    const page=state.orderPage;
    if(IS_DEMO&&(!page||(!page.displayName&&!page.slug&&!(page.products||[]).length))){state.orderPage=demoSeedState(new Date()).orderPage;localStorage.setItem(KEY,JSON.stringify(state));}
    const transaction=transactState(state,url,options);
    if(transaction.mutated){if(new URL(url,location.origin).pathname==='/api/import')localStorage.setItem(BACKUP_KEY,raw);localStorage.setItem(KEY,JSON.stringify(transaction.state));}
    return new Response(JSON.stringify(transaction.body),{status:transaction.status,headers:{'Content-Type':'application/json'}});
  }catch{return new Response(JSON.stringify({error:'Não foi possível salvar neste navegador.'}),{status:500});}
}
window.DoceStore={
  isDemo:IS_DEMO,
  fetch:(url,options)=>navigator.locks?navigator.locks.request(KEY,()=>execute(url,options)):Promise.resolve(execute(url,options)),
  // Only the demonstration can be reset; the browser pilot may hold someone's real orders.
  ...(IS_DEMO?{resetDemo(){localStorage.removeItem(KEY);localStorage.removeItem(BACKUP_KEY);}}:{}),
};
