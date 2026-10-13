import http from 'node:http';
import path from 'node:path';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import assert from 'node:assert/strict';
import {chromium} from 'file:///C:/Users/Restore/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';

const here=path.dirname(fileURLToPath(import.meta.url));
const root=path.resolve(here,'../..');
const server=http.createServer(async(req,res)=>{
  const route=new URL(req.url,'http://localhost').pathname;
  const file=path.resolve(root,'.'+decodeURIComponent(route));
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  try{const bytes=await readFile(file); const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.ttf':'font/ttf'}[path.extname(file)]||'application/octet-stream';res.writeHead(200,{'Content-Type':mime});res.end(bytes);}catch{res.writeHead(404).end();}
});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
const origin=`http://127.0.0.1:${server.address().port}/design/landing-access/index.html`;
await mkdir(path.join(here,'prints'),{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
const page=await browser.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const report=[];
try{
 for(const width of [320,390,430,1440]){
  await page.setViewportSize({width,height:width===1440?1000:844});
  for(const screen of ['landing','signup','login','recovery','verify','setup','firstorder','done']){
   await page.goto(origin+(screen==='landing'?'':`?screen=${screen}`));
   await page.evaluate(()=>document.fonts.ready);
   const info=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,heading:[...document.querySelectorAll('main h1')].find(el=>el.getClientRects().length)?.textContent,fonts:document.fonts.check('16px Manrope')&&document.fonts.check('32px Lora')}));
   assert.ok(info.scroll<=width,`Horizontal overflow: ${screen} at ${width}`);
   assert.ok(info.fonts,'Brand fonts must load');
   assert.ok(info.heading,'Each screen must have a visible heading');
   report.push({screen,width,...info});
   if(width===390||width===1440) await page.screenshot({path:path.join(here,'prints',`${screen}-${width}.png`),fullPage:true});
  }
 }
 // Exercise the editable prototype, never the real application or real user data.
 await page.goto(origin+'?screen=signup');
 await page.getByRole('button',{name:'Criar conta',exact:true}).click();
 assert.ok(await page.locator('.form-error').isVisible(),'Blank signup must explain the error');
 await page.locator('[name=name]').fill('Pessoa fictícia');
 await page.locator('[name=email]').fill('teste@example.com');
 await page.locator('[name=password]').fill('SenhaFicticia123');
 await page.getByRole('button',{name:'Mostrar',exact:true}).click();
 assert.equal(await page.locator('[name=password]').getAttribute('type'),'text');
 await page.getByRole('button',{name:'Criar conta',exact:true}).click();
 await page.waitForURL('**screen=verify');
 await page.goto(origin+'?screen=recovery');
 await page.locator('[name=email]').fill('teste@example.com');
 await page.getByRole('button',{name:'Enviar instruções',exact:true}).click();
 await page.locator('#recovery-result').waitFor({state:'visible'});
 assert.match(await page.locator('#recovery-result').innerText(),/não envia e-mails/);
 await page.goto(origin+'?screen=firstorder');
 await page.locator('[name=client]').fill('Cliente fictícia de revisão');
 await page.locator('[name=product]').fill('Bolo de cenoura');
 await page.locator('[name=total]').fill('125');
 await page.getByRole('button',{name:'Salvar pedido',exact:true}).click();
 await page.getByRole('heading',{name:'Prévia do pedido na agenda',exact:true}).waitFor();
 assert.match(await page.locator('.demo-order').innerText(),/Cliente fictícia de revisão/);
 assert.match(await page.locator('.demo-order').innerText(),/Bolo de cenoura/);
 assert.match(await page.locator('.demo-order').innerText(),/125,00/);
 assert.match(await page.locator('.demo-order').innerText(),/Ainda não conferido/);
 assert.equal(await page.evaluate(()=>localStorage.length),0,'Prototype must not store personal data');
 assert.deepEqual(errors,[]);
 await writeFile(path.join(here,'VERIFICACAO.json'),JSON.stringify({date:new Date().toISOString(),checks:report,pageErrors:errors},null,2));
 console.log(`Reviewed ${report.length} layouts; no horizontal overflow, local fonts loaded, no page errors.`);
}finally{await browser.close();await new Promise(r=>server.close(r));}
