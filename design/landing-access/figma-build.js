// Run using Figma MCP use_figma. LOGO_SVG is injected from public/logo.svg.
// Doce Agenda foundations. Tailark login card structure adapted under MIT;
// see references/TAILARK-LICENCE.md. This is an editable concept, not live auth.
const createdNodeIds=[];
const page=figma.currentPage;
page.name='Doce Agenda · descoberta e acesso';
const fonts=[{family:'Manrope',style:'Regular'},{family:'Manrope',style:'Bold'},{family:'Lora',style:'Regular'}];
await Promise.all(fonts.map(f=>figma.loadFontAsync(f)));
const hex=h=>({r:parseInt(h.slice(1,3),16)/255,g:parseInt(h.slice(3,5),16)/255,b:parseInt(h.slice(5,7),16)/255});
const palette={paper:'#FBF7F0',card:'#FFFEFA',ink:'#392923',muted:'#6F5B51',line:'#E7DCD1',action:'#A34432',cream:'#F3EADC',sage:'#42644C',sageSoft:'#E8F0E8',white:'#FFFFFF'};
const collection=figma.variables.createVariableCollection('Doce Agenda · cores');
const vars={};
for(const [name,value] of Object.entries(palette)){
 const v=figma.variables.createVariable(name,collection,'COLOR');
 v.scopes=['FRAME_FILL','SHAPE_FILL','TEXT_FILL','STROKE_COLOR'];
 v.setValueForMode(collection.defaultModeId,hex(value));vars[name]=v;
}
const paint=name=>figma.variables.setBoundVariableForPaint({type:'SOLID',color:hex(palette[name])},'color',vars[name]);
const textStyles={};
for(const [name,f,size,line] of [['body',fonts[0],16,26],['label',fonts[1],14,22],['title',fonts[2],32,40],['hero',fonts[2],56,64],['small',fonts[0],12,19]]){
 const s=figma.createTextStyle();s.name='Doce Agenda/'+name;s.fontName=f;s.fontSize=size;s.lineHeight={unit:'PIXELS',value:line};textStyles[name]=s;
}
const shadow=figma.createEffectStyle();shadow.name='Doce Agenda/cartão';shadow.effects=[{type:'DROP_SHADOW',color:{r:.29,g:.18,b:.14,a:.08},offset:{x:0,y:12},radius:32,spread:0,visible:true,blendMode:'NORMAL'}];
function add(node){createdNodeIds.push(node.id);return node;}
function al(parent,name,width,gap=16,pad=0,fill=null,direction='VERTICAL'){
 const n=add(figma.createAutoLayout(direction));n.name=name;n.resize(width,100);n.primaryAxisSizingMode=direction==='VERTICAL'?'AUTO':'FIXED';n.counterAxisSizingMode=direction==='VERTICAL'?'FIXED':'AUTO';n.itemSpacing=gap;n.paddingLeft=n.paddingRight=n.paddingTop=n.paddingBottom=pad;n.fills=fill?[paint(fill)]:[];n.clipsContent=false;
 if(parent){parent.appendChild(n);if(parent.layoutMode==='VERTICAL')n.layoutSizingHorizontal='FILL';}return n;
}
function text(parent,value,width,style='body',color='ink'){
 const n=add(figma.createText());n.name=value.slice(0,60);n.fontName=textStyles[style].fontName;n.textStyleId=textStyles[style].id;n.characters=value;n.fills=[paint(color)];n.resize(width,20);parent.appendChild(n);if(parent.layoutMode==='VERTICAL')n.layoutSizingHorizontal='FILL';n.textAutoResize='HEIGHT';n.layoutSizingVertical='HUG';return n;
}
function brand(parent,width=170){const n=figma.createNodeFromSvg(LOGO_SVG.replaceAll('currentColor','#A34432'));n.name='Marca · Doce Agenda';n.resize(width,width*48/213.8);parent.appendChild(n);createdNodeIds.push(n.id,...n.findAll(()=>true).map(x=>x.id));return n;}
function card(parent,name,width,pad=20){const n=al(parent,name,width,16,pad,'card');n.cornerRadius=16;n.strokes=[paint('line')];return n;}

// Shared local components match this product rather than adopting a generic kit's brand.
const components=al(null,'Componentes · Doce Agenda',440,20,24,'cream');components.x=200;components.y=-1300;
const buttonDefs={};
for(const variant of ['primary','secondary']){
 const c=add(figma.createComponent());c.name='Botão/'+variant;c.layoutMode='HORIZONTAL';c.resize(320,48);c.primaryAxisSizingMode='FIXED';c.counterAxisSizingMode='FIXED';c.primaryAxisAlignItems='CENTER';c.counterAxisAlignItems='CENTER';c.cornerRadius=10;c.fills=[paint(variant==='primary'?'action':'card')];c.strokes=variant==='primary'?[]:[paint('line')];c.description='Ação de 48 px; pressão .97 por ponteiro; ease-out 160 ms; foco visível. Adaptação ao Doce Agenda.';
 components.appendChild(c);const t=text(c,'Continuar',280,'label',variant==='primary'?'white':'action');t.textAlignHorizontal='CENTER';const prop=c.addComponentProperty('Rótulo','TEXT','Continuar');t.componentPropertyReferences={characters:prop};buttonDefs[variant]={id:c.id,prop,c};
}
const input=add(figma.createComponent());input.name='Campo/texto';input.layoutMode='VERTICAL';input.resize(320,80);input.primaryAxisSizingMode='AUTO';input.counterAxisSizingMode='FIXED';input.itemSpacing=6;input.fills=[];components.appendChild(input);
const label=text(input,'E-mail',320,'label');const box=card(input,'Controle',320,12);box.cornerRadius=9;const value=text(box,'voce@exemplo.com',296,'body','muted');
const labelProp=input.addComponentProperty('Rótulo','TEXT','E-mail');label.componentPropertyReferences={characters:labelProp};const valueProp=input.addComponentProperty('Valor','TEXT','voce@exemplo.com');value.componentPropertyReferences={characters:valueProp};
input.description='Rótulo persistente, texto de entrada 16 px, controle ≥48 px. Configurar autocomplete na implementação; erros em texto junto ao campo.';
const links=[];
function button(parent,label,width,target,variant='primary'){
 const def=buttonDefs[variant];const n=add(def.c.createInstance());parent.appendChild(n);n.resize(width,48);n.setProperties({[def.prop]:label});if(target)links.push({node:n,target});return n;
}
function field(parent,label,value,width){const n=add(input.createInstance());parent.appendChild(n);n.resize(width,n.height);n.setProperties({[labelProp]:label,[valueProp]:value});return n;}
const screens={};
function screen(key,title,width,x,y){const n=al(null,title,width,0,0,'paper');n.x=x;n.y=y;screens[key]=n;const head=al(n,'Cabeçalho',width,16,20,null,'HORIZONTAL');brand(head,170);return n;}
function note(parent,width,copy){const n=al(parent,'Informação',width,0,14,'cream');n.cornerRadius=10;text(n,copy,width-28,'small','muted');return n;}
function order(parent,width){const p=card(parent,'Demonstração · dados fictícios',width,20);brand(p,160);text(p,'Hoje    Pedidos    Semana',width-40,'label','action');text(p,'Agenda do dia',width-40,'title');
 for(const [client,product,time,total,balance] of [['Marina · exemplo','Bolo de aniversário','15h · Retirada','R$ 280,00','R$ 80,00'],['Joana · exemplo','Caixa de doces','17h · Entrega','R$ 150,00','Ainda não conferido']]){
  const r=card(p,'Pedido de exemplo',width-40,14);text(r,client,width-68,'label');text(r,product,width-68,'small','muted');text(r,time+'  ·  '+total,width-68,'label');text(r,client.startsWith('Marina')?'Confirmado':'Orçamento',width-68,'small','sage');text(r,'Saldo: '+balance,width-68,'small','muted');
 }text(p,'Dados fictícios para demonstração',width-40,'small','muted');p.effectStyleId=shadow.id;return p;
}
function landing(width,x,y,key){const mobile=width<700;const s=screen(key,'Página inicial · '+width,width,x,y);const pad=mobile?24:120;const inner=width-pad*2;
 const hero=al(s,'Abertura',width,mobile?32:64,pad,null,mobile?'VERTICAL':'HORIZONTAL');const cw=mobile?inner:540;const copy=al(hero,'Promessa e ações',cw,24);
 text(copy,'ORGANIZAÇÃO FEITA PARA A SUA ROTINA',cw,'small','sage');const h=text(copy,'O combinado de cada encomenda, em um só lugar.',cw,mobile?'title':'hero');if(mobile){h.fontSize=40;h.lineHeight={unit:'PIXELS',value:48};}
 text(copy,'Pedidos, prazos, detalhes e pagamentos reunidos para saber o que já está combinado e o que pede atenção.',cw,'body','muted');button(copy,'Conhecer o piloto',cw,'pilot');button(copy,'Criar minha agenda',cw,'signup','secondary');text(copy,'Piloto em desenvolvimento. Os dados ficam neste navegador.',cw,'small','muted');order(hero,mobile?inner:456);
 const benefits=al(s,'Benefícios',width,24,pad,'cream');text(benefits,'Da conversa ao pedido, com clareza no caminho.',inner,'title');
 const topics=[['Prazos à vista','Veja entrega ou retirada, situação e próxima ação de cada pedido.'],['Combinados organizados','Anote detalhes, alterações pendentes e consulte o histórico.'],['Pagamentos conferidos','Registre e confira pagamentos antes de atualizar o saldo.'],['Sua semana, do seu jeito','Configure dias fechados, antecedência mínima e limite por data.']];
 for(let i=0;i<topics.length;i+=mobile?1:2){const row=al(benefits,'Benefícios '+i,inner,16,0,null,mobile?'VERTICAL':'HORIZONTAL');for(const [title,body] of topics.slice(i,i+(mobile?1:2))){const w=mobile?inner:(inner-16)/2;const c=card(row,title,w,24);text(c,title,w-48,'title');text(c,body,w-48,'body','muted');}}
 const steps=al(s,'Como funciona',width,24,pad);text(steps,'Seu primeiro pedido começa pelo essencial.',inner,'title');for(const a of ['01 · Identifique cliente, produto e valor.','02 · Marque a data e o horário combinados.','03 · Acompanhe detalhes, próxima ação e pagamentos.'])text(steps,a,inner,'body');
 const faq=al(s,'Perguntas frequentes',width,20,pad,'cream');text(faq,'Antes de começar',inner,'title');for(const [q,a] of [['Funciona no celular?','Sim. O piloto pode ser aberto no navegador do celular.'],['Meus dados aparecem em outros aparelhos?','Ainda não. Os dados ficam neste navegador. Baixe um backup e restaure uma cópia quando precisar.'],['Confirma pagamentos automaticamente?','Não. Você registra e confere cada pagamento.'],['Envia mensagens pelo WhatsApp?','O resumo é para copiar e colar; não há envio automático.']]){text(faq,q,inner,'label');text(faq,a,inner,'body','muted');}
 const foot=al(s,'Fechamento',width,24,pad);text(foot,'Seu combinado, em um só lugar.',inner,'title');button(foot,'Conhecer o piloto',mobile?inner:320,'pilot');brand(foot);return s;
}
landing(1440,200,200,'landing-desktop');landing(390,1800,200,'landing');
const specs=[
 ['signup','Crie sua conta','Tenha um espaço para organizar os pedidos da sua confeitaria.',['Seu nome|Ex.: Marina','E-mail|voce@exemplo.com','Senha|Pelo menos 8 caracteres'],'Criar conta','verify','Já tem uma conta? Entrar','login'],
 ['login','Entre na sua conta','Que bom ter você de volta.',['E-mail|voce@exemplo.com','Senha|Sua senha'],'Entrar','done','Esqueci minha senha','recovery'],
 ['recovery','Vamos ajudar você a entrar','Informe o e-mail usado no cadastro.',['E-mail|voce@exemplo.com'],'Enviar instruções','recovery-sent','Voltar para entrar','login'],
 ['verify','Confira sua caixa de entrada','Confirme seu e-mail para continuar. Nenhum e-mail é enviado por este protótipo.',[],'Continuar','setup','Voltar ao cadastro','signup'],
 ['setup','Vamos organizar sua agenda','Dê um nome ao seu espaço. Você pode fazer isso depois.',['Nome da confeitaria · opcional|Ex.: Ateliê da Marina'],'Cadastrar primeiro pedido','firstorder','Fazer isso depois','firstorder'],
 ['firstorder','Cadastre o primeiro pedido','Comece pelo essencial. Complete os outros detalhes depois.',['Nome da cliente|Ex.: Marina','Produto|Ex.: bolo de aniversário','Data e horário · opcional|dd/mm/aaaa --:--','Valor total (R$)|0,00','Situação|Orçamento','Detalhes do combinado · opcional|Tamanho, sabores, decoração…'],'Salvar pedido','done','Voltar','setup'],
 ['done','Prévia do pedido na agenda','Exemplo fictício. Nenhum pedido é salvo neste protótipo.',[],'Voltar ao início','landing','Registrar outro pedido','firstorder'],
 ['recovery-sent','Confira seu e-mail','Se houver uma conta com esse e-mail, você receberá instruções de recuperação. Nenhum e-mail foi enviado nesta prévia.',[],'Voltar para entrar','login','Voltar ao início','landing']
];
for(let i=0;i<specs.length;i++){
 const [key,title,intro,fields,cta,next,second,target]=specs[i];const s=screen(key,title+' · mobile',390,2300+(i%4)*470,200+Math.floor(i/4)*1600);const wrap=al(s,'Conteúdo',390,24,20);const c=card(wrap,'Acesso e primeiro uso',350,24);brand(c,160);text(c,title,302,'title');text(c,intro,302,'body','muted');
 for(const f of fields){const [label,value]=f.split('|');field(c,label,value,302);}
 if(key==='firstorder')note(c,302,'A data pode ficar em branco enquanto for orçamento. Só pagamentos conferidos entram no saldo.');
 if(key==='done'){const demo=card(c,'Pedido fictício',302,16);text(demo,'Marina · exemplo',270,'label');text(demo,'Bolo de aniversário\nValor total: R$ 280,00\nSituação: Orçamento\nPagamento: Ainda não conferido',270,'body','muted');}
 button(c,cta,302,next);button(c,second,302,target,'secondary');note(wrap,350,'Conceito de acesso · etapa C. Cadastro e login ainda não disponíveis no piloto.');
}
const cover=al(null,'LEIA PRIMEIRO · escopo e referências',1440,24,48,'cream');cover.x=200;cover.y=-600;text(cover,'Doce Agenda · página inicial e acesso',1344,'hero');text(cover,'Telas editáveis · mobile 390 px e desktop 1440 px. Fluxo conceitual; acesso com conta ainda depende de autenticação e dados no servidor.',1344,'body');text(cover,'Base: marca existente (Lora + Manrope), skill Emil Kowalski e estrutura Tailark encontrada no 21st.dev. Código de referência MIT preservado no projeto. Componentes genéricos das bibliotecas consultadas não substituem os tokens próprios da marca.',1344,'body','muted');text(cover,'Motion para implementação: ease-out 160–220 ms; pressão 0,97 apenas com ponteiro; foco visível, teclado sem movimento e respeito a reduced-motion. Navegação neste Figma é instantânea.',1344,'body','muted');
for(const {node,target} of links){await node.setReactionsAsync([{trigger:{type:'ON_CLICK'},actions:[target==='pilot'?{type:'URL',url:'https://doce-agenda-piloto.netlify.app'}:{type:'NODE',destinationId:screens[target].id,navigation:'NAVIGATE',transition:null,preserveScrollPosition:false}]}]);}
return {createdNodeIds,mutatedNodeIds:[page.id],fileKey:figma.fileKey,screens:Object.fromEntries(Object.entries(screens).map(([k,n])=>[k,{id:n.id,width:n.width,height:n.height}])),variables:Object.values(vars).map(v=>v.id),styles:Object.values(textStyles).map(s=>s.id),components:[buttonDefs.primary.id,buttonDefs.secondary.id,input.id],coverId:cover.id};
