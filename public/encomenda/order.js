'use strict';
const $=s=>document.querySelector(s),esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const slug=decodeURIComponent(location.pathname.split('/').filter(Boolean).at(-1)||'');
const api=`https://khvhnbopdluthpcduhqm.supabase.co/functions/v1/doce-public/p/${encodeURIComponent(slug)}`;
let config,dates=[],month,selected='';
const brDate=d=>new Intl.DateTimeFormat('pt-BR',{day:'numeric',month:'long',year:'numeric',timeZone:'UTC'}).format(new Date(`${d}T12:00:00Z`));
const today=()=>{const p=Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date()).map(x=>[x.type,x.value]));return `${p.year}-${p.month}-${p.day}`;};
// Preview (?preview=1): the baker's current draft, opened from Ajustes. Nothing is sent or fetched.
const PREVIEW=new URLSearchParams(location.search).has('preview');
function previewDraft(){
 let draft=null;try{draft=JSON.parse(localStorage.getItem('doce-agenda.link-preview')||'null');}catch{}
 return draft||{displayName:'Doces da Lu',welcome:'Oi! Escolha o doce e a data, eu confirmo tudo pelo WhatsApp.',products:[{name:'Bolo de aniversário',description:'A partir de 1 kg.'},{name:'Brigadeiro (cento)',description:''}],orderTemplate:{fields:[]},availability:{closedWeekdays:[],minimumNoticeHours:0}};
}
function previewResponse(url){
 const draft=previewDraft();
 if(url===api)return{active:true,displayName:draft.displayName,welcome:draft.welcome||'',products:Array.isArray(draft.products)?draft.products:[],orderTemplate:{fields:(draft.orderTemplate?.fields||[]).map(f=>({...f,options:f.options||[]}))}};
 if(url.includes('/availability')){
  const closed=draft.availability?.closedWeekdays||[],notice=Math.ceil((Number(draft.availability?.minimumNoticeHours)||0)/24),start=new Date(`${today()}T12:00:00Z`);
  return Array.from({length:90},(_,i)=>{const d=new Date(start);d.setUTCDate(d.getUTCDate()+i);return{date:d.toISOString().slice(0,10),available:i>=notice&&!closed.includes(d.getUTCDay())};});
 }
 return{code:'DA-PREVIA',summary:'Esta é só uma prévia: o pedido não foi enviado.\nQuando seu link estiver no ar, o pedido da cliente chega em Novos, na sua agenda, para você revisar.',whatsapp:''};
}
if(PREVIEW)document.addEventListener('DOMContentLoaded',()=>{
 const draft=previewDraft(),missing=[!draft.products?.length&&'seus produtos',(!draft.displayName||draft.displayName==='Sua confeitaria')&&'o nome da confeitaria'].filter(Boolean);
 document.body.insertAdjacentHTML('afterbegin',`<div class="preview-banner" role="note"><strong>Prévia.</strong> É assim que sua cliente vê o link. Nada é enviado.${missing.length?`<br>Falta preencher ${missing.join(' e ')} nos Ajustes para aparecer aqui.`:''}</div>`);
});
async function json(url,options){if(PREVIEW)return previewResponse(url);const response=await fetch(url,options),data=await response.json();if(!response.ok)throw Object.assign(new Error(data.error||'Não foi possível continuar.'),{code:data.code,status:response.status});return data;}
async function refreshDates(){const start=today(),end=new Date(`${start}T12:00:00Z`);end.setUTCDate(end.getUTCDate()+89);dates=await json(`${api}/availability?from=${start}&to=${end.toISOString().slice(0,10)}`);if(!dates.some(d=>d.date===selected&&d.available)){selected='';$('#date').value='';$('#chosen-date').textContent='Escolha outra data disponível.';}renderCalendar();}
function renderCalendar(){
 const [year,m]=month.split('-').map(Number),first=new Date(Date.UTC(year,m-1,1)),count=new Date(Date.UTC(year,m,0)).getUTCDate();
 $('#month-title').textContent=new Intl.DateTimeFormat('pt-BR',{month:'long',year:'numeric',timeZone:'UTC'}).format(first);
 let html='<span></span>'.repeat(first.getUTCDay());
 for(let day=1;day<=count;day++){const value=`${year}-${String(m).padStart(2,'0')}-${String(day).padStart(2,'0')}`,available=dates.find(d=>d.date===value)?.available;html+=`<button type="button" data-date="${value}" ${!available?'disabled':''} aria-label="${esc(brDate(value))}" aria-pressed="${value===selected}">${day}</button>`;}
 $('#calendar-days').innerHTML=html;$('#previous-month').disabled=month<=dates[0]?.date.slice(0,7);$('#next-month').disabled=month>=dates.at(-1)?.date.slice(0,7);
}
function chosenProduct(){return $('#product').value==='__other__'?$('#other-product').value:$('#product').value;}
function renderCake(){
 const show=/\bbolos?\b/i.test(chosenProduct());$('#cake-fields').hidden=!show;if(!show){$('#cake-content').innerHTML='';return;}
 if($('#cake-content').children.length)return;
 $('#cake-content').innerHTML=config.orderTemplate.fields.filter(f=>f.enabled).map(f=>`<div class="field"><label for="cake-${esc(f.key)}">${esc(f.label)}${f.required?' (obrigatório)':' (opcional)'}</label>${f.options.length?`<select id="cake-${esc(f.key)}" data-cake="${esc(f.key)}" ${f.required?'required':''}><option value="">Selecione</option>${f.options.map(o=>`<option>${esc(o)}</option>`).join('')}</select>`:`<input id="cake-${esc(f.key)}" data-cake="${esc(f.key)}" maxlength="${f.key==='foodNotes'?500:200}" ${f.required?'required':''}>`}</div>`).join('');
}
async function start(){
 try{config=await json(api);$('#loading').hidden=true;if(!config.active){$('#unavailable').hidden=false;$('#unavailable-message').textContent=config.message;return;}
 $('#business').textContent=config.displayName;document.title=`${config.displayName} — solicite sua encomenda`;$('#welcome').textContent=config.welcome;$('#consent-business').textContent=config.displayName;
 $('#product').innerHTML='<option value="">Escolha um produto</option>'+config.products.map(p=>`<option>${esc(p.name)}</option>`).join('')+'<option value="__other__">Outro</option>';
 month=today().slice(0,7);await refreshDates();$('#request-page').hidden=false;
 }catch(error){$('#loading').hidden=true;$('#unavailable').hidden=false;$('#unavailable-message').textContent=error.status===404?'Não encontramos esta página de encomenda. Confira o endereço do link.':'Não conseguimos abrir a confeitaria agora. Tente novamente.';$('#retry').hidden=false;}
}
$('#retry').onclick=()=>location.reload();
$('#product').onchange=()=>{$('#other-field').hidden=$('#product').value!=='__other__';$('#other-product').required=!$('#other-field').hidden;$('#product-description').textContent=config.products.find(p=>p.name===$('#product').value)?.description||'';renderCake();};$('#other-product').oninput=renderCake;
$('#mode').onchange=()=>{$('#address-field').hidden=$('#mode').value!=='Entrega';$('#location').required=!$('#address-field').hidden;};
$('#calendar-days').onclick=e=>{const button=e.target.closest('[data-date]');if(!button||button.disabled)return;selected=button.dataset.date;$('#date').value=selected;$('#chosen-date').textContent=brDate(selected);renderCalendar();$('#calendar-days').querySelector(`[data-date="${selected}"]`)?.focus();};
for(const [id,step]of [['previous-month',-1],['next-month',1]])$('#'+id).onclick=()=>{const [y,m]=month.split('-').map(Number);month=new Date(Date.UTC(y,m-1+step,1)).toISOString().slice(0,7);renderCalendar();};
$('#request-form').onsubmit=async e=>{
 e.preventDefault();const error=$('#form-error');error.hidden=true;if(!selected){error.textContent='Escolha uma data disponível.';error.hidden=false;$('#calendar-days').scrollIntoView({block:'center'});return;}if(!e.target.reportValidity())return;
 const send=$('#send');send.disabled=true;send.textContent='Enviando…';
 try{const data=await json(`${api}/requests`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({product:chosenProduct(),other:$('#product').value==='__other__',date:selected,time:$('#time').value,mode:$('#mode').value,location:$('#location').value,details:$('#details').value,client:$('#client').value,contact:$('#contact').value,consent:$('#consent').checked,website:$('#website').value,cake:Object.fromEntries([...document.querySelectorAll('[data-cake]')].map(el=>[el.dataset.cake,el.value]))})});
 $('#request-page').hidden=true;$('#confirmation').hidden=false;$('#code').textContent=data.code;$('#summary').textContent=data.summary;
 if(data.whatsapp){$('#whatsapp-link').href=`https://wa.me/${data.whatsapp.replace(/\D/g,'')}?text=${encodeURIComponent(data.summary)}`;$('#whatsapp-link').hidden=false;}else $('#no-whatsapp').hidden=false;
 $('#confirmation').focus();window.scrollTo(0,0);
 }catch(failure){error.textContent=failure.message;error.hidden=false;if(failure.code==='DATE_UNAVAILABLE'){await refreshDates().catch(()=>{});}}
 finally{send.disabled=false;send.textContent='Enviar solicitação';}
};
start();
