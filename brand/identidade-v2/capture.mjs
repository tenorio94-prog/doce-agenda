import {chromium} from 'file:///C:/Users/Restore/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs';
import {fileURLToPath,pathToFileURL} from 'node:url';
import path from 'node:path';
import {mkdir,access} from 'node:fs/promises';
const root=path.dirname(fileURLToPath(import.meta.url));
await mkdir(path.join(root,'prints'),{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
try {
 if(!process.argv.includes('--preview-only')) {
  const ctx=await browser.newContext({viewport:{width:430,height:932},isMobile:true,hasTouch:true});
  const page=await ctx.newPage();
  await page.goto('https://doce-agenda-piloto.netlify.app');
  await page.locator('#view-today h1').waitFor();
  await page.screenshot({path:path.join(root,'prints/app-atual-mobile.png'),fullPage:true,animations:'disabled'});
  await ctx.close();
 }
 if(await access(path.join(root,'index.html')).then(()=>true,()=>false)) {
  const page=await browser.newPage({viewport:{width:1440,height:1000}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  const requests=[];page.on('request',r=>{if(r.url().startsWith('http'))requests.push(r.url());});
  await page.goto(pathToFileURL(path.join(root,'index.html')).href);
  await page.evaluate(()=>document.fonts.ready);
  await page.locator('#board').screenshot({path:path.join(root,'prints/marca-visao-geral.png')});
  await page.locator('#logos').screenshot({path:path.join(root,'prints/logos-comparacao.png')});
  await page.setViewportSize({width:390,height:844});
  await page.screenshot({path:path.join(root,'prints/proposta-mobile.png'),fullPage:true});
  await page.locator('.phone').screenshot({path:path.join(root,'prints/proposta-app-mobile.png')});
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  if(errors.length||requests.length||overflow)throw new Error(JSON.stringify({errors,requests,overflow}));
  for(const [file,width,height] of [['compartilhamento',1200,630],['resumo-pedido',720,920]]) {
   await page.setViewportSize({width,height});
   await page.goto(pathToFileURL(path.join(root,'assets',file+'.svg')).href);
   await page.screenshot({path:path.join(root,'prints',file+'.png')});
  }
  console.log('OK: proposta sem dependências externas, fontes locais carregadas e sem overflow em 390px.');
 }
}finally{await browser.close();}
