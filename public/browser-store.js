"use strict";
// Adapter for the separate hosted pilot. The desktop server does not load this file.
(() => {
 const KEY = 'doce-agenda.pilot.v1';
 const statuses = ['Orçamento','Aguardando confirmação','Confirmado','Em produção','Pronto','Entregue','Cancelado'];
 const draft = ['Orçamento','Aguardando confirmação','Cancelado'];
 const committed = ['Confirmado','Em produção','Pronto','Entregue'];
 const BACKUP_KEY = KEY + '.pre-import';
 const labels = {client:'Cliente',product:'Produto',details:'Detalhes',dueAt:'Data e horário',mode:'Modalidade',location:'Local',total:'Valor total',status:'Situação',nextAction:'Próxima ação',nextAt:'Prazo da ação',pendingChange:'Alteração pendente',contact:'Contato'};
 const fail = (message,status=400,code) => {throw Object.assign(new Error(message),{status,code});};
 const text = (v,max=2000) => {if(v!==undefined&&typeof v!=='string')fail('Texto inválido.');return (v||'').trim().slice(0,max);};
 const money = v => {if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1000000)fail('Valor deve ser entre zero e R$ 1.000.000.');return Math.round(v*100)/100;};
 function date(v){v=text(v,30);if(v){const n=Date.parse(v+'Z');if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)||!Number.isFinite(n)||new Date(n).toISOString().slice(0,16)!==v)fail('Data e horário inválidos.');}return v;}
 function orderInput(body){
  const o={client:text(body.client,120),product:text(body.product,300),details:text(body.details),dueAt:date(body.dueAt),mode:text(body.mode,30)||'Retirada',location:text(body.location,400),total:money(body.total),status:text(body.status,40)||'Orçamento',nextAction:text(body.nextAction,300),nextAt:date(body.nextAt),pendingChange:text(body.pendingChange),contact:text(body.contact,120)};
  if(!o.client||!o.product)fail('Preencha cliente e produto.');
  if(!statuses.includes(o.status))fail('Situação inválida.');
  if(!['Retirada','Entrega'].includes(o.mode))fail('Modalidade inválida.');
  if(!draft.includes(o.status)&&!o.dueAt)fail('Defina data e horário para este pedido.');
 if(body.cake===null)o.cake=null;else if(body.cake!==undefined){const v=body.cake,keys=['size','flavor','filling','decoration','inscription','foodNotes'];if(!v||typeof v!=='object'||!Number.isSafeInteger(v.templateVersion)||v.templateVersion<1||!v.values||typeof v.values!=='object'||Object.keys(v.values).some(k=>!keys.includes(k))||v.labels!==undefined&&(!v.labels||typeof v.labels!=='object'||Object.keys(v.labels).some(k=>!keys.includes(k))))fail('Dados do bolo inválidos.');const values={};for(const k of keys)if(v.values[k]!==undefined)values[k]=text(v.values[k],k==='foodNotes'?500:200);const labels={};for(const [k,label] of Object.entries(v.labels||{}))labels[k]=text(label,80);o.cake={templateVersion:v.templateVersion,values,labels};}
  return o;
 }
 const defaultAvailability=()=>({closedWeekdays:[],minimumNoticeHours:0,dailyOrderLimit:null,dateOverrides:{}});
 const defaultOrderTemplate=()=>({version:1,fields:[['size','Tamanho'],['flavor','Sabor'],['filling','Recheio'],['decoration','Decoração'],['inscription','Inscrição'],['foodNotes','Observações alimentares']].map(([key,label])=>({key,label,enabled:true,required:false,options:[]}))});
 const dayValid=v=>typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
 function limitValue(v){if(v===null)return null;if(!Number.isInteger(v)||v<1||v>50)fail('Limite diário deve ser um número entre 1 e 50 ou ilimitado.');return v;}
 function availabilityInput(v){if(!v||typeof v!=='object'||Array.isArray(v)||!Array.isArray(v.closedWeekdays)||v.closedWeekdays.some(x=>!Number.isInteger(x)||x<0||x>6)||new Set(v.closedWeekdays).size!==v.closedWeekdays.length||!Number.isSafeInteger(v.minimumNoticeHours)||v.minimumNoticeHours<0||v.minimumNoticeHours>8760||!v.dateOverrides||typeof v.dateOverrides!=='object'||Array.isArray(v.dateOverrides))fail('Configuração de disponibilidade inválida.');const dateOverrides={};for(const [day,item] of Object.entries(v.dateOverrides)){if(!dayValid(day)||!item||typeof item!=='object'||Array.isArray(item)||typeof item.closed!=='boolean')fail('Exceção de data inválida.');dateOverrides[day]={closed:item.closed,limit:limitValue(item.limit)};}return {closedWeekdays:[...v.closedWeekdays].sort((a,b)=>a-b),minimumNoticeHours:v.minimumNoticeHours,dailyOrderLimit:limitValue(v.dailyOrderLimit),dateOverrides};}
 function templateInput(v){const keys=['size','flavor','filling','decoration','inscription','foodNotes'];if(!v||!Number.isSafeInteger(v.version)||v.version<1||!Array.isArray(v.fields)||v.fields.length!==keys.length)fail('Modelo de bolo inválido.');const fields=[];for(const f of v.fields){if(!f||!keys.includes(f.key)||fields.some(x=>x.key===f.key)||typeof f.label!=='string'||!f.label.trim()||f.label.length>80||typeof f.enabled!=='boolean'||typeof f.required!=='boolean'||!Array.isArray(f.options)||f.options.length>30||f.options.some(x=>typeof x!=='string'||!x.trim()||x.length>80)||new Set(f.options).size!==f.options.length)fail('Campo do modelo de bolo inválido.');fields.push({key:f.key,label:f.label.trim(),enabled:f.enabled,required:f.required,options:f.options.map(x=>x.trim())});}if(keys.some(k=>!fields.some(f=>f.key===k)))fail('O modelo precisa conter todos os campos de bolo.');return {version:v.version,fields:keys.map(k=>fields.find(f=>f.key===k))};}
 function wallTimeEpoch(value){const [d,t]=value.split('T'),[y,m,day]=d.split('-').map(Number),[h,min]=t.split(':').map(Number),guess=Date.UTC(y,m-1,day,h,min),fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}),parts=Object.fromEntries(fmt.formatToParts(new Date(guess)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)])),represented=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute);return guess+(guess-represented);}
 function checkCapacity(input,s,currentId,override){if(!committed.includes(input.status))return;const day=input.dueAt.slice(0,10),cfg=s.availability,ov=cfg.dateOverrides[day],weekday=new Date(day+'T00:00:00Z').getUTCDay();let conflict=ov?.closed||(!ov&&cfg.closedWeekdays.includes(weekday))?['DATE_CLOSED','Esta data está marcada como fechada.']:null;if(!conflict&&wallTimeEpoch(input.dueAt)-Date.now()<cfg.minimumNoticeHours*3600000)conflict=['NOTICE','O pedido precisa respeitar a antecedência mínima.'];const limit=ov?.limit??cfg.dailyOrderLimit,count=s.orders.filter(o=>o.id!==currentId&&committed.includes(o.status)&&!o.isSample&&!o.isDemo&&!o.sample&&o.dueAt?.slice(0,10)===day).length;if(!conflict&&limit!==null&&count>=limit)conflict=['DAILY_LIMIT','O limite de pedidos para esta data foi atingido.'];if(!conflict)return;if(override?.allowed===true){const reason=text(override.reason,301);if(reason.length<4||reason.length>300)fail('Informe o motivo da exceção (4 a 300 caracteres).');return {reason,conflict};}fail(conflict[1],409,conflict[0]);}
 function validBackup(value){if(!value||typeof value!=='object'||value.version!==1||!Array.isArray(value.orders)||!Array.isArray(value.payments))fail('Backup inválido.');const s={...structuredClone(value),availability:availabilityInput(value.availability??defaultAvailability()),orderTemplate:templateInput(value.orderTemplate??defaultOrderTemplate())},ids=new Set();for(const o of s.orders){if(!o||typeof o!=='object'||typeof o.id!=='string'||!o.id.trim()||ids.has(o.id))fail('Pedido inválido ou identificador duplicado.');ids.add(o.id);orderInput(o);if(!Array.isArray(o.history))fail('Histórico de pedido inválido.');}const pids=new Set();for(const p of s.payments){if(!p||typeof p!=='object'||typeof p.id!=='string'||!p.id.trim()||pids.has(p.id)||ids.has(p.id)||!ids.has(p.orderId)||!Number.isFinite(p.amount)||p.amount<0||p.amount>1000000||!['Informado','Conferido'].includes(p.status)||!Number.isFinite(Date.parse(p.createdAt)))fail('Pagamento inválido, duplicado ou sem pedido associado.');pids.add(p.id);}return s;}
 function checkRequiredCake(input,template){if(!input.cake)return;const values=input.cake.values||{};for(const f of template.fields)if(f.enabled){const value=text(values[f.key],500);if(f.required&&!value)fail(`Preencha o campo obrigatório: ${f.label}.`);if(value&&f.options.length&&!f.options.includes(value))fail(`Escolha uma opção válida para: ${f.label}.`);}}
 function seed(){
  const d=new Date();d.setDate(d.getDate()+1);const dueAt=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}T16:00`;const now=new Date().toISOString();
  return {version:1,orders:[{...orderInput({client:'Marina • exemplo fictício',product:'Bolo de chocolate • 1,5 kg',details:'Cobertura rosa e nome na decoração. Dados fictícios para conhecer a aplicação.',dueAt,total:150,status:'Confirmado',nextAction:'Confirmar detalhes da decoração',mode:'Retirada'}),isSample:true,id:'EXEMPLO-001',createdAt:now,updatedAt:now,history:[{at:now,text:'Exemplo fictício criado para demonstração.'}]}],payments:[{id:'EXEMPLO-REC-001',orderId:'EXEMPLO-001',amount:50,status:'Conferido',note:'Entrada fictícia para demonstração',createdAt:now}]};
 }
 function load(){
  const raw=localStorage.getItem(KEY);
  if(raw===null){const initial=seed();localStorage.setItem(KEY,JSON.stringify(initial));return initial;}
  let s;try{s=JSON.parse(raw);}catch{fail('Os dados deste navegador não puderam ser lidos. Não limpe o armazenamento antes de guardar uma cópia.',500);}
  if(s?.version!==1||!Array.isArray(s.orders)||!Array.isArray(s.payments))fail('Formato dos dados deste navegador inválido.',500);
  s.availability=availabilityInput(s.availability??defaultAvailability());s.orderTemplate=templateInput(s.orderTemplate??defaultOrderTemplate());return s;
 }
 const response=(value,status=200)=>new Response(JSON.stringify(value),{status,headers:{'Content-Type':'application/json; charset=utf-8'}});
 function transact(url,options={}){
  try{
   const path=new URL(url,location.origin).pathname;const method=(options.method||'GET').toUpperCase();const s=load();
   if(method==='GET'&&['/api/state','/api/export'].includes(path))return response(s);
   if(method==='GET'&&path==='/api/availability')return response(s.availability);
   if(method==='GET'&&path==='/api/order-template')return response(s.orderTemplate);
   let body;try{body=JSON.parse(options.body||'{}');}catch{fail('JSON inválido.');}
   if(!body||typeof body!=='object'||Array.isArray(body))fail('Dados inválidos.');
   const now=new Date().toISOString();let result;let status=200;
   if(path==='/api/availability'&&method==='PUT'){s.availability=availabilityInput(body);result=s.availability;}
   else if(path==='/api/order-template'&&method==='PUT'){const requested=templateInput(body),changed=JSON.stringify(s.orderTemplate.fields)!==JSON.stringify(requested.fields);s.orderTemplate={...requested,version:changed?s.orderTemplate.version+1:s.orderTemplate.version};result=s.orderTemplate;}
   else if(path==='/api/import'&&method==='POST'){const imported=validBackup(body);localStorage.setItem(BACKUP_KEY,JSON.stringify(s));localStorage.setItem(KEY,JSON.stringify(imported));return response({ok:true,orders:imported.orders.length,payments:imported.payments.length});}
   else if(path==='/api/orders'&&method==='POST'){
    const input=orderInput(body),allowed=checkCapacity(input,s,null,body.capacityOverride);if(committed.includes(input.status)&&input.cake)checkRequiredCake(input,s.orderTemplate);
    result={...input,id:crypto.randomUUID(),createdAt:now,updatedAt:now,history:[{at:now,text:'Pedido cadastrado.'}]};if(allowed)result.history.push({at:now,text:`Exceção de disponibilidade (${allowed.conflict[0]}): ${allowed.reason}`});s.orders.push(result);status=201;
   }else{
    const match=path.match(/^\/api\/orders\/([^/]+)(\/payments)?$/);const pm=path.match(/^\/api\/payments\/([^/]+)$/);
    if(match){
     const o=s.orders.find(x=>x.id===decodeURIComponent(match[1]));if(!o)fail('Pedido não encontrado.',404);
     if(match[2]&&method==='POST'){
      const amount=money(body.amount);const paymentStatus=text(body.status,30);if(!['Informado','Conferido'].includes(paymentStatus))fail('Estado do pagamento inválido.');
      result={id:crypto.randomUUID(),orderId:o.id,amount,status:paymentStatus,note:text(body.note,500),createdAt:now};s.payments.push(result);o.updatedAt=now;o.history.push({at:now,text:`Pagamento registrado: R$ ${amount.toFixed(2)} • ${paymentStatus}.`});
     }else if(!match[2]&&method==='PUT'){
      const input=orderInput({...o,...body}),changes=Object.keys(input).filter(k=>JSON.stringify(input[k])!==JSON.stringify(o[k])),needsCheck=committed.includes(input.status)&&(!committed.includes(o.status)||input.dueAt!==o.dueAt);let allowed;if(needsCheck)allowed=checkCapacity(input,s,o.id,body.capacityOverride);if(committed.includes(input.status)&&!committed.includes(o.status)&&input.cake)checkRequiredCake(input,s.orderTemplate);
      if(changes.length){o.history.push({at:now,text:changes.map(k=>`${labels[k]||'Bolo'}: ${o[k]===0?0:o[k]||'—'} → ${input[k]===0?0:input[k]||'—'}`).join('; ')});Object.assign(o,input,{updatedAt:now});}if(allowed)o.history.push({at:now,text:`Exceção de disponibilidade (${allowed.conflict[0]}): ${allowed.reason}`});result=o;
     }else fail('Rota não encontrada.',404);
    }else if(pm&&method==='PUT'){
     const p=s.payments.find(x=>x.id===decodeURIComponent(pm[1]));if(!p)fail('Pagamento não encontrado.',404);if(body.status!=='Conferido')fail('Só é possível confirmar o recebimento.');
     if(p.status!=='Conferido'){p.status='Conferido';p.confirmedAt=now;const o=s.orders.find(x=>x.id===p.orderId);o.history.push({at:now,text:`Recebimento conferido: R$ ${p.amount.toFixed(2)}.`});o.updatedAt=now;}result=p;
    }else fail('Rota não encontrada.',404);
   }
   localStorage.setItem(KEY,JSON.stringify(s));return response(result,status);
  }catch(e){return response({error:e.status?e.message:'Não foi possível salvar neste navegador. Verifique o espaço disponível e se o armazenamento está permitido.',...(e.code?{code:e.code}:{})},e.status||500);}
 }
 window.DoceStore={fetch:(url,options)=>navigator.locks?navigator.locks.request(KEY,()=>transact(url,options)):Promise.resolve(transact(url,options))};
})();
