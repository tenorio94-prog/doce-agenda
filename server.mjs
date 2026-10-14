import http from 'node:http';
import {readFile,writeFile,rename,mkdir,copyFile} from 'node:fs/promises';
import {dirname,join,extname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {monthlySummary} from './cloud/monthly-summary.js';

const root=dirname(fileURLToPath(import.meta.url));
const statuses=['Orçamento','Aguardando confirmação','Confirmado','Em produção','Pronto','Entregue','Cancelado'];
const draft=['Orçamento','Aguardando confirmação','Cancelado'];
const committed=['Confirmado','Em produção','Pronto','Entregue'];
const defaultAvailability=()=>({closedWeekdays:[],minimumNoticeHours:0,dailyOrderLimit:null,dateOverrides:{}});
const cakeKeys=['size','flavor','filling','decoration','inscription','foodNotes'];
const defaultOrderTemplate=()=>({version:1,fields:cakeKeys.map(key=>({key,label:({size:'Tamanho',flavor:'Sabor',filling:'Recheio',decoration:'Decoração',inscription:'Inscrição',foodNotes:'Observações alimentares'})[key],enabled:true,required:false,options:[]}))});
const labels={client:'Cliente',product:'Produto',details:'Detalhes',dueAt:'Data e horário',mode:'Modalidade',location:'Local',total:'Valor total',status:'Situação',nextAction:'Próxima ação',nextAt:'Prazo da ação',pendingChange:'Alteração pendente',contact:'Contato'};
const fail=(message,status=400,code)=>{throw Object.assign(new Error(message),{status,code});};
const text=(v,max=2000)=>{if(v!==undefined&&typeof v!=='string')fail('Texto inválido.');return (v||'').trim().slice(0,max);};
const money=v=>{if(typeof v!=='number'||!Number.isFinite(v)||v<0||v>1000000)fail('Valor deve ser entre zero e R$ 1.000.000.');return Math.round(v*100)/100;};
function date(v){v=text(v,30);if(v){const n=Date.parse(v+'Z');if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)||!Number.isFinite(n)||new Date(n).toISOString().slice(0,16)!==v)fail('Data e horário inválidos.');}return v;}
function orderInput(body){
 if(body.totalKnown!==undefined&&typeof body.totalKnown!=='boolean')fail('Indicação de valor inválida.');
 const o={client:text(body.client,120),product:text(body.product,300),details:text(body.details),dueAt:date(body.dueAt),mode:text(body.mode,30)||'Retirada',location:text(body.location,400),total:money(body.total),status:text(body.status,40)||'Orçamento',nextAction:text(body.nextAction,300),nextAt:date(body.nextAt),pendingChange:text(body.pendingChange),contact:text(body.contact,120)};
 if(body.totalKnown!==undefined)o.totalKnown=body.totalKnown;
 if(o.totalKnown===false&&o.total>0)o.totalKnown=true;
 if(!o.client||!o.product)fail('Preencha cliente e produto.');
 if(!statuses.includes(o.status))fail('Situação inválida.');
 if(!['Retirada','Entrega'].includes(o.mode))fail('Modalidade inválida.');
 if(!draft.includes(o.status)&&!o.dueAt)fail('Defina data e horário para este pedido.');
 if(body.cake===null)o.cake=null;else if(body.cake!==undefined)o.cake=cakeInput(body.cake);
 return o;
}
function cakeInput(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||!Number.isSafeInteger(value.templateVersion)||value.templateVersion<1||!value.values||typeof value.values!=='object'||Array.isArray(value.values))fail('Dados do bolo inválidos.');
 if(Object.keys(value.values).some(k=>!cakeKeys.includes(k)))fail('Campo de bolo desconhecido.');
 const values={};for(const key of cakeKeys)if(value.values[key]!==undefined)values[key]=text(value.values[key],key==='foodNotes'?500:200);
 const labels={};if(value.labels!==undefined){if(!value.labels||typeof value.labels!=='object'||Array.isArray(value.labels)||Object.keys(value.labels).some(k=>!cakeKeys.includes(k)))fail('Rótulos do bolo inválidos.');for(const [key,label] of Object.entries(value.labels))labels[key]=text(label,80);}
 return {templateVersion:value.templateVersion,values,labels};
}
function validDay(v){return typeof v==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(v)&&Number.isFinite(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;}
function limitValue(v){if(v===null)return null;if(!Number.isInteger(v)||v<1||v>50)fail('Limite diário deve ser um número entre 1 e 50 ou ilimitado.');return v;}
function availabilityInput(value){
 if(!value||typeof value!=='object'||Array.isArray(value))fail('Configuração de disponibilidade inválida.');
 const weekdays=value.closedWeekdays;if(!Array.isArray(weekdays)||weekdays.some(x=>!Number.isInteger(x)||x<0||x>6)||new Set(weekdays).size!==weekdays.length)fail('Dias fechados inválidos.');
 const notice=value.minimumNoticeHours;if(!Number.isSafeInteger(notice)||notice<0||notice>8760)fail('Antecedência mínima deve estar entre 0 e 8.760 horas.');
 const globalLimit=limitValue(value.dailyOrderLimit);const overrides=value.dateOverrides;
 if(!overrides||typeof overrides!=='object'||Array.isArray(overrides))fail('Exceções de data inválidas.');
 const dateOverrides={};for(const [day,item] of Object.entries(overrides)){
  if(!validDay(day)||!item||typeof item!=='object'||Array.isArray(item)||typeof item.closed!=='boolean')fail('Exceção de data inválida.');
  dateOverrides[day]={closed:item.closed,limit:limitValue(item.limit)};
 }
 return {closedWeekdays:[...weekdays].sort((a,b)=>a-b),minimumNoticeHours:notice,dailyOrderLimit:globalLimit,dateOverrides};
}
function templateInput(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||!Number.isSafeInteger(value.version)||value.version<1||!Array.isArray(value.fields)||value.fields.length!==cakeKeys.length)fail('Modelo de bolo inválido.');
 const seen=new Set(),fields=[];for(const f of value.fields){if(!f||typeof f!=='object'||Array.isArray(f)||!cakeKeys.includes(f.key)||seen.has(f.key)||typeof f.label!=='string'||!f.label.trim()||f.label.length>80||typeof f.enabled!=='boolean'||typeof f.required!=='boolean'||!Array.isArray(f.options)||f.options.length>30)fail('Campo do modelo de bolo inválido.');seen.add(f.key);const options=f.options.map(x=>{if(typeof x!=='string'||!x.trim()||x.length>80)fail('Opção do modelo inválida.');return x.trim();});if(new Set(options).size!==options.length)fail('Opções duplicadas no modelo.');fields.push({key:f.key,label:f.label.trim(),enabled:f.enabled,required:f.required,options});}
 if(cakeKeys.some(k=>!seen.has(k)))fail('O modelo precisa conter todos os campos de bolo.');return {version:value.version,fields:cakeKeys.map(k=>fields.find(f=>f.key===k))};
}
function checkRequiredCake(input,template){if(!input.cake)return;const values=input.cake.values||{};for(const f of template.fields)if(f.enabled){const value=text(values[f.key],500);if(f.required&&!value)fail(`Preencha o campo obrigatório: ${f.label}.`);if(value&&f.options.length&&!f.options.includes(value))fail(`Escolha uma opção válida para: ${f.label}.`);}}
function orderDay(dueAt){return dueAt.slice(0,10);}
function weekday(day){return new Date(day+'T00:00:00Z').getUTCDay();}
function wallTimeEpoch(value){
 const [day,time]=value.split('T'),[year,month,dateNum]=day.split('-').map(Number),[hour,minute]=time.split(':').map(Number);
 const guess=Date.UTC(year,month-1,dateNum,hour,minute);const fmt=new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
 const parts=Object.fromEntries(fmt.formatToParts(new Date(guess)).filter(p=>p.type!=='literal').map(p=>[p.type,Number(p.value)]));
 const represented=Date.UTC(parts.year,parts.month-1,parts.day,parts.hour,parts.minute);return guess+(guess-represented);
}
function sampleOrder(o){return o.isSample===true||o.isDemo===true||o.sample===true;}
function committedOrder(o){return committed.includes(o.status)&&!sampleOrder(o);}
function checkCapacity(input,availability,orders,currentId,override){
 if(!committed.includes(input.status))return;
 const day=orderDay(input.dueAt),dayOverride=availability.dateOverrides[day];let conflict=null;
 if(dayOverride?.closed||(!dayOverride&&availability.closedWeekdays.includes(weekday(day))))conflict=['DATE_CLOSED','Esta data está marcada como fechada.'];
 if(!conflict&&wallTimeEpoch(input.dueAt)-Date.now()<availability.minimumNoticeHours*3600000)conflict=['NOTICE','O pedido precisa respeitar a antecedência mínima.'];
 const limit=dayOverride?.limit??availability.dailyOrderLimit;
 const count=orders.filter(o=>o.id!==currentId&&committedOrder(o)&&orderDay(o.dueAt)===day).length;
 if(!conflict&&limit!==null&&count>=limit)conflict=['DAILY_LIMIT','O limite de pedidos para esta data foi atingido.'];
 if(!conflict)return;
 if(override?.allowed===true){const reason=text(override.reason,301);if(reason.length<4||reason.length>300)fail('Informe o motivo da exceção (4 a 300 caracteres).');return {reason,conflict};}
 const [code,message]=conflict;fail(message,409,code);
}
function validateBackup(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||value.version!==1||!Array.isArray(value.orders)||!Array.isArray(value.payments))fail('Backup inválido.');
 const availability=availabilityInput(value.availability??defaultAvailability());const ids=new Set();
 for(const o of value.orders){if(!o||typeof o!=='object'||Array.isArray(o)||typeof o.id!=='string'||!o.id.trim()||ids.has(o.id))fail('Pedido inválido ou identificador duplicado.');ids.add(o.id);orderInput(o);if(!Array.isArray(o.history))fail('Histórico de pedido inválido.');}
 const paymentIds=new Set();for(const p of value.payments){if(!p||typeof p!=='object'||Array.isArray(p)||typeof p.id!=='string'||!p.id.trim()||paymentIds.has(p.id)||ids.has(p.id)||!ids.has(p.orderId))fail('Pagamento inválido, duplicado ou sem pedido associado.');paymentIds.add(p.id);money(p.amount);if(!['Informado','Conferido'].includes(p.status))fail('Estado do pagamento inválido.');if(typeof p.createdAt!=='string'||!Number.isFinite(Date.parse(p.createdAt)))fail('Data de pagamento inválida.');}
 const orderTemplate=templateInput(value.orderTemplate??defaultOrderTemplate());return {...structuredClone(value),availability,orderTemplate};
}
function seed(){const day=new Date();day.setDate(day.getDate()+1);const future=`${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}T16:00`;const now=new Date().toISOString();return {version:1,availability:defaultAvailability(),orderTemplate:defaultOrderTemplate(),orders:[{...orderInput({client:'Marina • exemplo fictício',product:'Bolo de chocolate • 1,5 kg',details:'Cobertura rosa e nome na decoração. Dados fictícios para conhecer a aplicação.',dueAt:future,total:150,status:'Confirmado',nextAction:'Confirmar detalhes da decoração',mode:'Retirada'}),isSample:true,id:'EXEMPLO-001',createdAt:now,updatedAt:now,history:[{at:now,text:'Exemplo fictício criado para demonstração.'}]}],payments:[{id:'EXEMPLO-REC-001',orderId:'EXEMPLO-001',amount:50,status:'Conferido',note:'Entrada fictícia para demonstração',createdAt:now}]};}
export async function createApp({dataDir=join(root,'data')}={}){
 await mkdir(dataDir,{recursive:true});const db=join(dataDir,'state.json');
 let state;try{state=JSON.parse(await readFile(db,'utf8'));if(!Array.isArray(state.orders)||!Array.isArray(state.payments))throw new Error('Arquivo de dados inválido.');}catch(e){if(e.code!=='ENOENT')throw e;state=seed();await writeFile(db,JSON.stringify(state,null,2));}
 state.availability=availabilityInput(state.availability??defaultAvailability());state.orderTemplate=templateInput(state.orderTemplate??defaultOrderTemplate());
 const save=async next=>{await writeFile(db+'.tmp',JSON.stringify(next,null,2));await rename(db+'.tmp',db);state=next;};
 let queue=Promise.resolve();
 const mutate=fn=>{const task=queue.then(async()=>{const next=structuredClone(state);const result=fn(next);await save(next);return result;});queue=task.catch(()=>{});return task;};
 const send=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers});res.end(JSON.stringify(data));};
 return http.createServer(async(req,res)=>{try{
  const host=req.headers.host||'';if(!/^localhost(?::\d+)?$/i.test(host)&&!/^127\.0\.0\.1(?::\d+)?$/.test(host))fail('Endereço local inválido.',403);
  const origin=req.headers.origin;if(origin){let u;try{u=new URL(origin);}catch{fail('Origem inválida.',403);}if(!['localhost','127.0.0.1'].includes(u.hostname)||u.host!==host)fail('Origem não permitida.',403);}
  const url=new URL(req.url,'http://localhost');const path=url.pathname;
  if(req.method==='GET'&&['/api/state','/api/export'].includes(path)){send(res,200,state,path==='/api/export'?{'Content-Disposition':'attachment; filename="doce-agenda-backup.json"'}:{});return;}
  if(path.startsWith('/api/')){
   if(req.method==='GET'&&path==='/api/resumo-mensal'){send(res,200,monthlySummary(state,url.searchParams.get('mes')));return;}
   if(req.method==='GET'&&path==='/api/availability'){send(res,200,state.availability);return;}
   if(req.method==='GET'&&path==='/api/order-template'){send(res,200,state.orderTemplate);return;}
   if(!['POST','PUT'].includes(req.method))fail('Rota não encontrada.',404);
   if(!(req.headers['content-type']||'').includes('application/json'))fail('Envie JSON.',415);
   let raw='';const maxBytes=path==='/api/import'?5*1024*1024:64000;for await(const chunk of req){raw+=chunk;if(Buffer.byteLength(raw)>maxBytes)fail('Conteúdo muito grande.',413);}let body;try{body=JSON.parse(raw);}catch{fail('JSON inválido.');}if(!body||typeof body!=='object'||Array.isArray(body))fail('Dados inválidos.');
   if(path==='/api/availability'&&req.method==='PUT'){const config=availabilityInput(body);await mutate(s=>{s.availability=config;});send(res,200,config);return;}
   if(path==='/api/order-template'&&req.method==='PUT'){const requested=templateInput(body);const config=await mutate(s=>{const version=JSON.stringify(s.orderTemplate.fields)!==JSON.stringify(requested.fields)?s.orderTemplate.version+1:s.orderTemplate.version;s.orderTemplate={...requested,version};return s.orderTemplate;});send(res,200,config);return;}
   if(path==='/api/import'&&req.method==='POST'){
    const imported=validateBackup(body);let task=queue.then(async()=>{const backupPath=`${db}.backup-${Date.now()}-${randomUUID()}`;await copyFile(db,backupPath);await writeFile(db+'.tmp',JSON.stringify(imported,null,2));await rename(db+'.tmp',db);state=imported;return imported;});queue=task.catch(()=>{});const result=await task;send(res,200,{ok:true,orders:result.orders.length,payments:result.payments.length});return;
   }
   if(path==='/api/orders'&&req.method==='POST'){const input=orderInput(body);const result=await mutate(s=>{const now=new Date().toISOString();const allowed=checkCapacity(input,s.availability,s.orders,null,body.capacityOverride);if(committed.includes(input.status)&&input.cake)checkRequiredCake(input,s.orderTemplate);const o={...input,id:randomUUID(),createdAt:now,updatedAt:now,history:[{at:now,text:'Pedido cadastrado.'}]};if(allowed)o.history.push({at:now,text:`Exceção de disponibilidade (${allowed.conflict[0]}): ${allowed.reason}`});s.orders.push(o);return o;});send(res,201,result);return;}
   const match=path.match(/^\/api\/orders\/([^/]+)(\/payments)?$/);
   if(match){const result=await mutate(s=>{const o=s.orders.find(o=>o.id===match[1]);if(!o)fail('Pedido não encontrado.',404);const now=new Date().toISOString();
    if(match[2]&&req.method==='POST'){const amount=money(body.amount);const status=text(body.status,30);if(!['Informado','Conferido'].includes(status))fail('Estado do pagamento inválido.');const p={id:randomUUID(),orderId:o.id,amount,status,note:text(body.note,500),createdAt:now};s.payments.push(p);o.updatedAt=now;o.history.push({at:now,text:`Pagamento registrado: R$ ${amount.toFixed(2)} • ${status}.`});return p;}
    if(!match[2]&&req.method==='PUT'){const input=orderInput({...o,...body});const changes=Object.keys(input).filter(k=>JSON.stringify(input[k])!==JSON.stringify(o[k]));const needsCheck=committed.includes(input.status)&&(!committed.includes(o.status)||input.dueAt!==o.dueAt);let allowed;if(needsCheck)allowed=checkCapacity(input,s.availability,s.orders,o.id,body.capacityOverride);if(committed.includes(input.status)&&!committed.includes(o.status)&&input.cake)checkRequiredCake(input,s.orderTemplate);if(changes.length){o.history.push({at:now,text:changes.map(k=>`${labels[k]||'Bolo'}: ${o[k]===0?0:o[k]||'—'} → ${input[k]===0?0:input[k]||'—'}`).join('; ')});Object.assign(o,input,{updatedAt:now});}if(allowed)o.history.push({at:now,text:`Exceção de disponibilidade (${allowed.conflict[0]}): ${allowed.reason}`});return o;}fail('Rota não encontrada.',404);
   });send(res,200,result);return;}
   const pm=path.match(/^\/api\/payments\/([^/]+)$/);if(pm&&req.method==='PUT'){const result=await mutate(s=>{const p=s.payments.find(p=>p.id===pm[1]);if(!p)fail('Pagamento não encontrado.',404);if(body.status!=='Conferido')fail('Só é possível confirmar o recebimento.');if(p.status!=='Conferido'){p.status='Conferido';p.confirmedAt=new Date().toISOString();const o=s.orders.find(o=>o.id===p.orderId);o.history.push({at:p.confirmedAt,text:`Recebimento conferido: R$ ${p.amount.toFixed(2)}.`});o.updatedAt=p.confirmedAt;}return p;});send(res,200,result);return;}
   fail('Rota não encontrada.',404);
  }
  if(req.method!=='GET')fail('Rota não encontrada.',404);
  const assets={'/':'index.html','/index.html':'index.html','/app.js':'app.js','/data-client.js':'data-client.js','/styles.css':'styles.css','/style.css':'style.css','/logo.svg':'logo.svg','/favicon.svg':'favicon.svg','/fonts/Lora.ttf':'fonts/Lora.ttf','/fonts/Manrope.ttf':'fonts/Manrope.ttf'};const asset=assets[path];if(!asset)fail('Rota não encontrada.',404);
  const content=await readFile(join(root,'public',asset));res.writeHead(200,{'Content-Type':({'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf'})[extname(asset)],'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'"});res.end(content);
 }catch(e){if(!res.headersSent)send(res,e.status||500,{error:e.status?e.message:'Não foi possível salvar ou carregar os dados.',...(e.code?{code:e.code}:{})});else res.end();if(!e.status)console.error(e);}});
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===process.argv[1]){const server=await createApp();server.listen(Number(process.env.PORT||4173),'127.0.0.1',()=>console.log('Doce Agenda rodando em http://localhost:4173 • somente neste computador'));}
