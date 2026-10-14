import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';import fs from 'node:fs/promises';import vm from 'node:vm';import crypto from 'node:crypto';
const root=fileURLToPath(new URL('..',import.meta.url));const {createClient}=createRequire(root+'/package.json')('@supabase/supabase-js');const sandbox={window:{}};vm.runInNewContext(await fs.readFile(root+'/public/account/config.js','utf8'),sandbox);const config=sandbox.window.DoceCloudConfig;
const client=createClient(config.url,config.publishableKey,{auth:{persistSession:false,autoRefreshToken:false}}),tag=crypto.randomBytes(4).toString('hex');
const email=`qa-link-${tag}@doce-agenda.invalid`,password=crypto.randomBytes(24).toString('base64url');
const result=await client.auth.signUp({email,password,options:{data:{business_name:'Confeitaria QA fictícia'}}});
if(result.error)throw Error(result.error.message);if(!result.data.session)throw Error('Synthetic account requires email confirmation; stopping before further changes');
const session={id:result.data.user.id,email,password,token:result.data.session.access_token,config,slug:`qa-link-${tag}`};await fs.writeFile('C:/Users/Restore/AppData/Local/Temp/doce-order-link-qa-session.json',JSON.stringify(session),{mode:0o600});
let revision;async function owner(path,method='GET',body){const r=await fetch(config.url+'/functions/v1/doce-api',{method:'POST',headers:{Origin:'https://lucast.app',apikey:config.publishableKey,Authorization:'Bearer '+session.token,'Content-Type':'application/json'},body:JSON.stringify({path,method,body,...(method==='GET'?{}:{expectedRevision:revision})})});const data=await r.json();if(!r.ok)throw Error(`Owner API ${r.status}: ${data.error}`);revision=Number(r.headers.get('X-Agenda-Revision'));return data;}
await owner('/api/state');await owner('/api/order-page','PUT',{active:true,slug:session.slug,displayName:'Confeitaria QA fictícia',welcome:'Página temporária de testes, sem encomendas reais.',whatsapp:'+5511999999999',products:[{name:'Bolo de teste',description:'Exemplo fictício'}]});
const api=config.url+'/functions/v1/doce-public/p/'+session.slug;
const page=await fetch(api).then(r=>r.json());const from=new Date();from.setDate(from.getDate()+2);const date=from.toISOString().slice(0,10);
const payload={product:'Bolo de teste',client:'Cliente QA fictícia',contact:'+5511998887777',date,time:'15:00',mode:'Retirada',location:'',details:'Teste automatizado fictício',consent:true};
const sent=await fetch(api+'/requests',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://lucast.app'},body:JSON.stringify(payload)});const confirmation=await sent.json();
await fs.writeFile('C:/Users/Restore/AppData/Local/Temp/doce-order-link-qa-progress.json',JSON.stringify({slug:session.slug,id:session.id,date,page,sentStatus:sent.status,confirmation},null,2));
console.log(JSON.stringify({syntheticUser:session.id,slug:session.slug,pageActive:page.active,postStatus:sent.status,confirmation}));

