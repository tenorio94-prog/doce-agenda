import { availabilityDates, createPublicRequest, publicPageView } from './public-orders.js';

const origins = new Set(['https://lucast.app','https://www.lucast.app','https://doce-agenda-piloto.netlify.app','http://localhost:4173','http://127.0.0.1:4173']);
export function createPublicHandler(deps:any={}) {
  const env=deps.env ?? ((name:string)=>Deno.env.get(name));
  return async(request:Request)=>{
    const origin=request.headers.get('Origin');
    const headers:any={'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','Vary':'Origin','Access-Control-Allow-Methods':'GET, POST, OPTIONS','Access-Control-Allow-Headers':'content-type','X-Content-Type-Options':'nosniff'};
    if(origin && origins.has(origin))headers['Access-Control-Allow-Origin']=origin;
    const reply=(body:any,status=200)=>new Response(JSON.stringify(body),{status,headers});
    if(origin && !origins.has(origin))return reply({error:'Origem não permitida.'},403);
    if(request.method==='OPTIONS')return new Response(null,{status:204,headers});
    const url=new URL(request.url), path=url.pathname.replace(/^.*\/doce-public/,'');
    const match=path.match(/^\/p\/([a-z0-9][a-z0-9-]{1,38}[a-z0-9])(\/(availability|requests))?$/);
    if(!match || !['GET','POST'].includes(request.method) || (request.method==='POST' && match[3]!=='requests') || (request.method==='GET' && match[3]==='requests'))return reply({error:'Página não encontrada.'},404);
    try{
      const createClient=deps.createClient ?? (await import('npm:@supabase/supabase-js@2.117.3')).createClient;
      const admin=createClient(env('SUPABASE_URL'),env('SUPABASE_SERVICE_ROLE_KEY'),{auth:{persistSession:false,autoRefreshToken:false}});
      let body:any;
      if(request.method==='POST'){
        if(Number(request.headers.get('content-length'))>8192)return reply({error:'Solicitação muito grande.'},413);
        if(!request.body)return reply({error:'Solicitação inválida.'},400);
        const reader=request.body.getReader(),parts=[];let bytes=0;
        while(true){const part=await reader.read();if(part.done)break;bytes+=part.value.byteLength;if(bytes>8192){await reader.cancel();return reply({error:'Solicitação muito grande.'},413);}parts.push(part.value);}
        const joined=new Uint8Array(bytes);let offset=0;for(const part of parts){joined.set(part,offset);offset+=part.length;}
        try{body=JSON.parse(new TextDecoder().decode(joined));}catch{return reply({error:'Solicitação inválida.'},400);}
        if(body?.website)return reply({code:'DA-RECEBIDO',summary:'Solicitação recebida para análise.',whatsapp:'',message:'Seu pedido ainda não está confirmado. A confeitaria vai responder pelo WhatsApp.'},201);
      }
      const found=await admin.from('pilot_order_pages').select('owner_user_id,config').eq('slug',match[1]).maybeSingle();
      if(found.error)throw new Error('Serviço indisponível');
      if(!found.data)return reply({error:'Página não encontrada.'},404);
      const page=found.data.config, owner=found.data.owner_user_id;
      if(!page.active){if(request.method==='GET'&&!match[3])return reply(publicPageView(page,{}));return reply({error:'Esta confeitaria não está recebendo pedidos pelo link no momento'},403);}
      for(let attempt=0;attempt<4;attempt++){
        const loaded=await admin.from('pilot_agendas').select('state,revision').eq('owner_user_id',owner).single();
        if(loaded.error||!loaded.data)throw new Error('Serviço indisponível');
        const state={...loaded.data.state,orderPage:loaded.data.state.orderPage ?? page};
        if(state.orderPage.slug!==match[1])return reply({error:'Página não encontrada.'},404);
        if(!state.orderPage.active)return reply({error:'Esta confeitaria não está recebendo pedidos pelo link no momento'},403);
        if(request.method==='GET'){
          if(match[3]==='availability')return reply(availabilityDates(state,url.searchParams.get('from'),url.searchParams.get('to')));
          await admin.rpc('record_pilot_page_visit',{p_owner:owner});
          return reply(publicPageView(state.orderPage,state));
        }
        // CF-Connecting-IP is replaced by Cloudflare's edge. Never trust a client-provided X-Forwarded-For/body IP.
        const ip=deps.clientIP ? deps.clientIP(request) : request.headers.get('cf-connecting-ip');
        if(!ip || !/^[a-fA-F0-9:.]{3,64}$/.test(ip))return reply({error:'Não foi possível verificar a conexão. Tente novamente.'},503);
        const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${env('SUPABASE_SERVICE_ROLE_KEY')}:${ip}`));
        const hash=Array.from(new Uint8Array(digest),n=>n.toString(16).padStart(2,'0')).join('');
        const code=`DA-${Array.from(crypto.getRandomValues(new Uint8Array(6)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('')}`;
        const created=createPublicRequest(state,body,code);
        const committed=await admin.rpc('submit_pilot_request',{p_owner:owner,p_slug:match[1],p_expected_revision:Number(loaded.data.revision),p_state:created.state,p_ip_hash:hash});
        if(!committed.error)return reply(created.confirmation,201);
        if(committed.error.code==='40001')continue;
        if(committed.error.code==='P0001')return reply({error:'Limite de solicitações atingido. Tente mais tarde ou fale com a confeitaria.'},429);
        if(committed.error.code==='42501')return reply({error:'Esta confeitaria não está recebendo pedidos pelo link no momento'},403);
        throw new Error('Não foi possível enviar');
      }
      return reply({error:'A agenda mudou durante o envio. Escolha a data novamente.',code:'DATE_UNAVAILABLE'},409);
    }catch(error:any){return reply({error:error.status?error.message:'Não foi possível enviar agora. Tente novamente.',...(error.code?{code:error.code}:{})},error.status||503);}
  };
}
