# Doce Agenda — contexto para continuar em outra sessão

Atualizado em **15/10/2026**, após ligar o domínio `lucast.app`. Este arquivo é a passagem de bastão: descreve o estado real, as decisões e o que depende de autorização. Confira `git log` e o site antes de agir; hashes e versões abaixo são um retrato.

## 1. Onde paramos

- Tudo o que foi feito está **no GitHub (`main`) e publicado na Cloudflare**. Última versão publicada e conferida no ar: `6c2afe14-cbc0-445f-9565-75e039ba7e82` (Lista da semana). Pasta e GitHub sincronizados, sem alterações pendentes.
- **Domínio `lucast.app` ligado ao app em 15/10/2026** (seção 7): DNS na Cloudflare, site novo no ar em `lucast.app` e `www.lucast.app`, e-mail testado pelo usuário. Landing refeita em duas etapas no mesmo dia (seção 4). Conversa em aberto: polimento visual "estilo shadcn" (regras de raio/espaço/sombra) para landing e app, e bibliotecas. **Decidido em 15/10:** HTML/JS puro continua, agora com bibliotecas locais (Web Awesome + Motion; Bootstrap/UIkit descartados). BRAND.md atualizado (regra de dependências e escala de polimento). Landing já usa `<wa-button>`, `<wa-details>` e animações Motion no topo e nos passos. Polimento do app em andamento (seção 7d): etapas A e B publicadas; **etapa C (Agenda e cartões) aguarda aprovação**.
- **Engenharia, etapa 1 (15/10, sem mudança no site):** `CLAUDE.md` (inclui o `AGENTS.md`), fluxo de trabalho dos agentes no `AGENTS.md`, `docs/ARQUITETURA.md` (mapa, riscos e plano gradual em 6 etapas), Playwright `1.62.1` fixo no projeto, base comum dos testes de tela (`scripts/lib/browser-test.mjs`), capturas antes/depois (`scripts/capture-screens.mjs`, 10 telas × 360/1280) e comandos `npm run build | test:ui | check | screens`. README, `cloud/README.md` e o guia da Cloudflare deixaram de dizer que o domínio está no Netlify. Verificado: `npm run check` passou, build idêntico arquivo a arquivo (md5) e 20 capturas iguais. Sem nova publicação (o site não mudou). **Etapa 2 (app passa pelo esbuild, modo demo/conta em tempo de execução) aguarda aprovação.**
- Lucas deixou o domínio para depois e pediu para enxugar o código. Os grupos 1 a 3 do diagnóstico foram feitos e publicados em 14/10 (seção 7b), sem mudança visível no site.
- Depois disso, as features planejadas (seção 8) continuam **não iniciadas** e exigem aprovação.
- Sugestão feita ao usuário e ainda não realizada: mostrar o app à amiga confeiteira e observar o uso real antes de grandes mudanças.

## 2. Como trabalhar com o usuário (decisões vigentes)

- Lucas não é técnico, usa muito o celular. Português simples, curto, sem jargão. Execução pelo agente principal, **sem subagentes**.
- **Fluxo combinado:** ele aprova uma mudança planejada → o agente constrói, testa, faz commit, push para `main` e **publica no site direto**, confere o endereço publicado, atualiza este arquivo e relata. Não perguntar "posso publicar?" de novo.
- **Ainda pedir autorização antes de:** começar algo não aprovado; mexer em banco/Supabase (schema, funções), dados de contas reais ou política de privacidade; DNS, domínio ou e-mail; qualquer serviço pago; apagar dados; publicar com teste falhando ou sem conseguir verificar.
- Ao propor mudanças de interface, ele gosta de uma análise "de designer" honesta (o que funciona, o que confunde, o que eu faria) antes de construir.

## 3. Produto e público

App web para confeiteiras brasileiras autônomas que trabalham por encomenda: pedidos, datas, combinados e pagamentos conferidos. Público no celular, entre tarefas da cozinha, com receio de "app complicado". Validação com confeiteiras reais ainda não aconteceu.

Identidade **Glacê + carimbo**: rosa `#f7c5d0`, ameixa `#2b1a2c`, creme `#fffaf2`, pistache `#d3e7c1`, baunilha `#fbe9a9`, carimbo `#2e6a46`. Fredoka/Figtree locais. Regra de cor nos cartões: **baunilha = falta o sinal** (vence qualquer outra), pistache = pronto, entregue apagado sem risco, risco só em cancelado.

O usuário vê o **link de encomenda** como possível principal canal de clientes novos (aquisição barata). Tratar como ferramenta de maior valor.

## 4. O que o app faz hoje (publicado)

**Landing** (`public/landing/`), refeita em 15/10 (etapa 1 de 2, inspirada na enxovaly.com): topo com "App de encomendas para confeiteiras" / "Pedidos, datas e sinais da sua confeitaria, num app só.", botão "Experimentar sem cadastro" e um celular em CSS com a **tela real da Agenda** (`landing/assets/app-agenda.jpg`, captura da demo em 375 px ×2 sem a faixa da demo e sem o aviso de solicitação; mostra a semana 12–18 out. 2026 e vai envelhecer) e três cartões animados (Dia lotado, carimbo Sinal pago, Nova encomenda pelo link; respeitam movimento reduzido). Logo abaixo, a seção das dores ganhou o título antigo "Seu caderno não te avisa que o bolo é amanhã." com a foto ilustrativa do caderno (`landing/assets/cozinha-caderno*.jpg`, gerada pelo usuário no ChatGPT, originais em `design/fotos/`, tela "Hoje" sobreposta por CSS; não apresentar como caderno real). Saiu o bloco "Abriu o celular, já sabe o dia". Seguem 3 benefícios, FAQ curto e fechamento. Canonical/og apontam para `lucast.app`. **Etapa 2 (publicada em 15/10):** os 3 benefícios e o "E mais" saíram; entrou "Como funciona" (`#como-funciona`) em 4 passos alternados, cada um com tela real da demo num celular (`landing/assets/passo-1-novo/2-semana/3-mes/4-link.jpg`, capturas de 15/10 em 375 px ×2) e um cartão flutuante: anotar pedido, lista da semana, Meu mês + carimbo, link da cliente. Botões (`<wa-button>`) e perguntas (`<wa-details name="faq">`) da Web Awesome, tema em `public/ui/doce-wa.css` (montado em `/ui/doce-wa.css`); script único `public/landing/main.js` → `/landing/landing.js` (~43 KB gzip, Web Awesome + Motion). Topo também animado pela Motion (antes era CSS). Animação ao rolar com **Motion** (`motion@13.4.6`, `inView`/`stagger` + `animate` de `motion/mini`; fonte `public/landing/main.js`). Um script no `<head>` só esconde os elementos se não houver movimento reduzido e os reexibe em 3 s se o JS falhar. Na versão mini, `rotate` não anima (só `y`, `scale`, `opacity`). FAQ reescrito sem jargão (5 perguntas, incluindo a do link da cliente).

**Navegação em 4 abas:** Agenda · Pedidos · Meu mês · + Novo. Ajustes fica no topo.
- **Agenda** (antiga Hoje + Semana): resumo de hoje, semana com contagem e "Lotado/Fechado" por dia, lista do dia escolhido (começa em hoje, "Voltar para hoje"), "Ajustar esta data", cartão de Próxima ação e **Próximos dias** (só com hoje selecionado; agrupado por "Amanhã"/dia; cartões compactos sem botão). A aba Semana não existe mais (`data-view="week"` cai em Agenda).
- **Lista da semana** (chave Dia a dia | Lista da semana no topo da Agenda, 14/10): pedidos Confirmado/Em produção/Pronto/Entregue da semana seg–dom, agrupados pelo **dia da entrega** (versão simples aprovada; data de produção própria ficou para depois, perguntar à confeiteira). Marcar = o pedido vira **Pronto** (sem campo novo nem mudança no Supabase); desmarcar volta para Em produção; "Desfazer" no aviso. Copiar lista gera texto para WhatsApp. Quantidade e vínculo com produtos do link ficaram para Compras (exigem campos no servidor).
- **Pedidos:** busca + faixa de etapas com contagem (Todos, Novos = Solicitação/Orçamento/Aguardando, Confirmados, Fazendo, Prontos, Entregues, Cancelados). As 9 situações gravadas **não mudaram**; as etapas só agrupam.
- **Próximo passo:** Confirmado → "Começar a fazer" → Em produção → "Ficou pronto" → Pronto → "Marcar entregue" (PUT só com `status`, histórico, "Desfazer" no aviso). Orçamento/Aguardando → "Confirmar pedido" (abre o formulário já em Confirmado, mantendo checagens de data, lotação e bolo). Solicitação → "Revisar solicitação". O botão também aparece no topo do pedido aberto.
- **Meu mês:** só Confirmado e Entregue no mês; vendido, recebido (só conferido), a receber, dias mais cheios, produtos, prazo médio. Cálculo no servidor (`/api/resumo-mensal`). Ver `docs/MEU_MES_ENTREGA.md`.
- **Ajustes** em cartões fechados com resumo de uma linha: **Link de encomenda**, **Dias e limites** (dias fechados, antecedência em opções Sem mínimo/1/2/3 dias/1 semana — gravada em horas como antes —, limite por dia, "Mudar só uma data"), **Detalhes do bolo**. Cópia de segurança abaixo.
- **Link de encomenda:** passo a passo (1 vitrine, 2 produtos em lista com "+ Adicionar", 3 endereço gerado do nome e corrigido sozinho + WhatsApp opcional), "Ativar meu link"/"Salvar sem ativar". Ativo vira cartão verde "No ar" com Copiar, "Mandar no WhatsApp" (`wa.me/?text=` só com o texto; ela escolhe contato e envia) e prévia; "Pausar link". **Prévia** em `/encomenda/?preview=1` lê o rascunho do `localStorage` e nunca busca nem envia nada; avisa se faltam produtos/nome. O link copiado usa `https://lucast.app/p/<slug>` (servido pelo app novo desde 15/10).
- Regras do link (inalteradas): entra como Solicitação, origem `link`; pendentes não ocupam vaga; confirmar revalida; rate limit, honeypot, consentimento, limpeza de recusadas após 90 dias.
- Pagamentos Informado/Conferido: só conferido conta. `totalKnown:false` separa valor em branco de zero.

**Demonstração `/demo/`** (só no navegador, chave `doce-agenda.demo.v2`): confeitaria fictícia com 15 pedidos relativos à data da visita (todas as etapas, um Pix informado, uma solicitação pelo link, dia lotado com limite 3) e link "Doces da Lu" inativo para explorar a prévia (`cloud/demo-seed.js`). Demos antigas sem link recebem o exemplo uma vez. Faixa da demo com "Como funciona" e "Recomeçar". O piloto só-navegador (fora de `/demo/`) mantém a chave antiga e um exemplo; não pode ser reiniciado.

**Stories de boas-vindas** (`public/app.js` + `style.css`, CSS/JS próprios, sem biblioteca): 7 cenas animadas (caderno → celular, anotar pedido, carimbo do sinal, próximo passo, Meu mês, link, final com granulado). Abrem uma vez por aparelho na demo e em conta nova sem pedidos; "Como funciona" reabre; respeitam movimento reduzido.

## 5. Código, Git e endereços

- Pasta: `C:/Users/Restore/Documents/doce-agenda`. Ignorar `Documents/doceagenda` (`.git` incompleto criado por engano) e a pasta antiga `ebooks/projeto_B/web`.
- GitHub: https://github.com/tenorio94-prog/doce-agenda — base de trabalho `main`. `.gitattributes` fixa LF em dois arquivos gerados pelo build (`public/browser-store.js`, `public/account/account-controller.js`).
- Edite fontes em `public/` e `cloud/`; `deploy-*/` são builds ignorados. `public/browser-store.js` é gerado de `cloud/browser-adapter.js` pelo build.

| Uso | Endereço |
| --- | --- |
| Site atual | https://lucast.app/ (também `www.lucast.app` e https://doce-agenda.doce-agenda-local.workers.dev/) |
| Cadastro/login | …/cadastro/ |
| App com conta | …/app/ |
| Demonstração | …/demo/ |
| Prévia do link | …/encomenda/?preview=1 |
| Contato | doceagenda@lucast.app (encaminha para o Gmail do usuário) |

## 6. Arquitetura

- Frontend HTML/CSS/JS sem framework; esbuild; `@supabase/supabase-js` 2.117.3.
- `cloud/app-bootstrap.js` publica `window.DoceApi` para a conta autenticada. Não cair em armazenamento local após erro.
- Backend Supabase (projeto `khvhnbopdluthpcduhqm`, "Projeto aprender"): `doce-api` (JWT) e `doce-public` (anônima, rotas estritas). Estado da conta em `pilot_agendas.state` (JSONB) com revisão otimista (`commit_pilot_agenda`); restauração cria ponto anterior. Tabelas do link: `pilot_order_pages`, `pilot_public_submissions`, `pilot_owner_activity`.
- `cloud/state-engine.js` (regras/validação), `monthly-summary.js`, `order-link-model.js`, `public-orders.js`, `demo-seed.js`, `browser-adapter.js`.
- Cadastro e-mail/senha sem confirmação (piloto); recuperação por e-mail não ativa.
- README reescrito em 14/10 para o estado atual. Documentos antigos ficam em `docs/historico/` (só como registro).
- Não há mais servidor local (`server.mjs` aposentado em 14/10). O modo "server" de `data-client.js`/`app.js` ficou sem uso; os textos do modo navegador ainda são trocados no build.

## 7. Domínio `lucast.app` — feito em 15/10/2026

- Registro continua na **Name.com**; DNS passou para a **Cloudflare** (plano grátis), nameservers `ada.ns.cloudflare.com` e `langston.ns.cloudflare.com`. DNSSEC estava e segue desligado.
- Registros na Cloudflare, todos "DNS only": coringa `*` A `167.71.22.102` (Name.com, usado por `mail.`/`webmail.`), MX `mx3..mx8.name.com` (10–60) e TXT `v=spf1 a mx ~all`. **Não apagar**: são do e-mail `doceagenda@lucast.app`, que encaminha para o Gmail. O usuário testou o recebimento depois da troca; resposta pelo Gmail não foi testada.
- A antiga raiz A `75.2.60.5` e o `www` CNAME do Netlify foram apagados pelo usuário. `wrangler.jsonc` agora tem `routes` com `lucast.app` e `www.lucast.app` como custom domains do Worker `doce-agenda` (o Wrangler criou os registros; o escopo atual bastou).
- Verificado no ar: `scripts/test-cloudflare-routing.mjs` 5/5 em `lucast.app` e `www.lucast.app` (slug do `/p/` preservado); CORS do Supabase (`doce-api` e `doce-public`) responde 204 para as duas origens; landing, cadastro, demo, prévia do link e privacidade abrem em 360 px sem rolagem lateral.
- **Achado em 15/10:** desde que o domínio passou para a Cloudflare, as páginas em `lucast.app` carregam `static.cloudflareinsights.com` (Web Analytics/RUM da Cloudflare, injetado pela zona, não pelo nosso código; o `workers.dev` não tinha). Contraria a regra "sem analytics" e a política de privacidade. Desligar no painel (lucast.app → Web Analytics/RUM) só com o usuário; não foi alterado.
- Pendências: `www` não redireciona para a raiz (serve o mesmo site); a política de privacidade ainda cita Netlify entre os provedores (atualizar só com aprovação); Netlify antigo pode ser desativado quando o usuário quiser.

## 7b. Enxugar o código — feito em 14/10

Lucas aprovou os três grupos do diagnóstico e a aposentadoria do servidor local. Tudo foi feito sem mudança visível: as capturas antes/depois saíram idênticas e os arquivos publicados conferem com o build.
1. **Faxina** (commit `74f754d`, publicado): 11 classes sem uso removidas de `style.css`; 4 scripts de revisão antigos removidos; 15 documentos antigos movidos para `docs/historico/`; README reescrito.
2. **Montagem única** (commit `cbc0417`, publicado): `build-cloudflare.mjs` substituiu a cadeia de quatro scripts. A saída ficou idêntica byte a byte. A landing tem na fonte o texto publicado; as trocas que restam (demo e app com conta) falham com erro se o texto sumir. As pastas `deploy-demo` e `deploy-launch` deixaram de existir.
3. **Servidor local aposentado** (commit seguinte): removidos `server.mjs`, `test.mjs` (as regras seguem cobertas pelos testes de `cloud/`), `iniciar.ps1`, `capturar_prints.mjs` e `video-launch/scripts/capture.mjs`; `npm start` saiu e `npm test` roda os testes de `cloud/`. O site não mudou, então não houve nova publicação.

Ainda **não mexido** (decisão de 14/10): `style.css` (cerca de 100 KB, em camadas que se sobrepõem) e `app.js` (112 KB, arquivo único). Mexer neles junto com Produção A, com comparação de telas. Os 30 MB de prints em `design/` não afetam o site.

## 7d. Polimento do app estilo shadcn + Web Awesome (iniciado 15/10)

Plano aprovado em 5 etapas, cada uma com aprovação própria: **A base** (feita) → **B formulário de encomenda** (feita) → C Agenda e cartões de pedido → D Pedidos, Meu mês e Ajustes → E cadastro/login e página do link da cliente. Nada de regra, dado, conta ou Supabase muda; só aparência.

**Etapa A (publicada 15/10):** sem mudar telas de lugar.
1. `style.css`: 199 declarações sobrescritas por regras idênticas mais abaixo e 46 blocos vazios removidos (PostCSS, `postcss@8.5.28` como devDependency); 22 capturas idênticas pixel a pixel.
2. Escala nova em `tokens.css`: `--fs-xs..5xl` (12,14,16,18,20,24,28,32,40), `--r-xs/s/m/l` (8,12,16,24), `--shadow-s/m/l`, `--hairline`. Aplicada a 207 tamanhos de letra, 77 raios e 7 sombras do `style.css` (antes 42 tamanhos e 25 raios). Textos de 7–11 px subiram para 12 px (regra do BRAND.md). A seção das boas-vindas (celular em miniatura) e os @keyframes ficaram de fora de propósito.
3. `index.html` do app carrega `/ui/doce-wa.css` (tema Web Awesome; sem componentes ainda, sem mudança visível).
Verificação: capturas antes/depois de 11 telas em 360 e 1280 px (demo), sem rolagem lateral; `npm test` 41/41, `test-production-list` 2/2, `test-monthly-summary` 6/6, `test-payment-stamps` 10/10 (o teste ainda procurava o título antigo da landing; atualizado). Conferido no ar em `lucast.app`. Não testado: conta real logada, Safari/iPhone.
**Etapa B (publicada 15/10):** formulário de encomenda com Web Awesome. `public/ui/app-wa.js` (montado em `/ui/app-wa.js`, ~63 KB gzip, carregado no `<head>` antes do app) registra wa-button, wa-input, wa-textarea, wa-select/wa-option e wa-checkbox. Campos do `#order-form` viraram `<wa-input>`/`<wa-textarea>`/`<wa-select>`/`<wa-checkbox>` com os mesmos `name` (o app continua usando `form.elements`, `FormData`, `reset` e `reportValidity`); `populateStatusOptions` gera `<wa-option>`; os campos do modelo de bolo (gerados por `cakeFormMarkup`) seguem nativos. Título 28 px, perguntas em Fredoka 18 px, borda fina, "Salvar encomenda" em uma linha, R$ dentro do campo de valor. **Cuidado:** a validação dos campos Web Awesome usa o input interno, atualizado só no próximo render; `syncDateRequirement` chama `updateValidity()` depois de `updateComplete` (sem isso, Orçamento sem data era bloqueado). Novo teste `scripts/test-order-form.mjs` (14 casos: criar, editar, erros de data, bolo, exceção de lotação, aceitar solicitação, confirmar orçamento, em 360 e 1280 px); `test-monthly-summary.mjs` atualizado para os campos novos. Logo após publicar, `/ui/app-wa.js` deu 404 por alguns segundos (propagação); conferir de novo antes de concluir que quebrou.
Observações para as próximas etapas: faixa "1 solicitação para revisar" ocupa meia tela; título "Seus pedidos" grande demais; vários estilos de cartão na Agenda; campos com borda grossa.

## 7c. Vídeo de motion UI (14/10)

Pasta `video-motion/` (projeto HyperFrames, fluxo general-video, sem revisão a pedido do Lucas): loop quadrado 1440×1440 de 16 s, 120 BPM, 8 compassos, uma forma só que passa por 11 estados do app (novo pedido → data → sinal conferido com carimbo → produção → limite do dia "Lotado" → Meu mês → link → solicitação → confirmado → volta). Tudo calculado por `render(t)` com molas em forma fechada e periódicas; música e sons gerados por `scripts/make_audio.py` (numpy). Render a 240 fps + `tmix` 4→1 = 60 fps com desfoque de movimento. Verificado: `hyperframes check` passou, emenda do loop imperceptível, áudio -13,9 LUFS. O vídeo final (`renders/doce-agenda-loop.mp4`) não vai para o Git; regenerar com `npx hyperframes@0.8.157 render --fps 240 --crf 12 -o renders/raw-240.mp4 .` e o comando ffmpeg do tmix registrado no BRIEF/histórico.

## 8. Próximas features — nenhuma iniciada

Ordem planejada: ~~Produção A~~ (feita) → **Pix → Clientes** (Compras B adiada). Detalhes em `docs/PROXIMAS_FEATURES_ETAPAS.md`. Lucas considera Clientes importante para previsões futuras (ficha automática a partir dos pedidos, datas que se repetem, clientes sumidas; sem campos extras; política antes). Resumo:
- **Produção A:** feita e publicada em 14/10 na versão simples (ver seção 4, Lista da semana). Pendentes para Compras B: quantidade separada, vínculo com produtos do link, data de produção.
- **Pix:** BR Code estático gerado localmente, sinal sugerido 30%, chave privada, atualizar política; validar em **dois apps de banco** antes de liberar.
- **Clientes:** ficha por WhatsApp normalizado, sem união automática, lembretes de datas, anonimizar ao excluir; política antes de liberar.
Regras comuns: centavos, fuso São Paulo, cálculo no servidor, isolamento, backups compatíveis, 360 px.

## 9. Publicação, testes e limites

- Cloudflare Workers Static Assets, Worker `doce-agenda`, conta em `wrangler.jsonc`. Publicar só `deploy-cloud/public` via `npx --yes --package wrangler@4.119.0 wrangler deploy --config wrangler.jsonc` (o build `scripts/build-cloudflare.mjs` roda sozinho, monta o site inteiro num único script, para com erro se alguma troca de texto não achar o texto, e mantém `_redirects` `/p/:slug /encomenda/ 200`). Guia: `docs/CLOUDFLARE_PUBLICACAO.md`.
- Login do Wrangler foi feito pelo usuário via device flow, credenciais no Windows Credential Manager. Se expirar: `npx --yes --package wrangler@4.119.0 wrangler login --device --browser=false --use-keyring --scopes account:read user:read workers_scripts:write` e o usuário aprova no celular. Nunca pedir senha/token no chat.
- Netlify (`doce-agenda-piloto`) bloqueado por créditos; não contratar nem insistir.
- Testes a escolher pela mudança: `npm test` (41 regras), `npm run build`, `npm run test:ui` (Lista da semana 2, formulário 14, Meu mês 6, pagamentos 10; na demo, chave `doce-agenda.demo.v2`, apresentação marcada como vista), `npm run check` (os três) e `node scripts/test-cloudflare-routing.mjs` (5/5 no ar). Playwright vem do projeto (antes era importado de uma pasta do Codex). `test-ux-improvements.mjs`, `test-deploy.mjs`, `review-today.mjs`, `test-account-ui.mjs` e `cloud/test-order-link-e2e.mjs` seguem sem manutenção e com o caminho antigo.
- Provar que nada mudou: comparar o `deploy-cloud/public` arquivo por arquivo (md5) e `npm run screens -- <pasta>` antes e depois + `node scripts/capture-screens.mjs --compare <antes> <depois>` (landing, cadastro, privacidade, prévia do link e demo: agenda, pedidos, mês, ajustes, pedido, novo; relógio fixo, movimento reduzido; duas rodadas seguidas dão imagens idênticas).
- Verificação de interface tem sido feita no painel do navegador: build local servido por um servidor estático simples e a demo publicada em 360–1280 px. Logo após publicar, o site pode levar alguns segundos para servir arquivos novos.
- **Lição:** a publicação dos stories quebrou para quem tinha a página antiga em cache (botão novo ausente). Ao adicionar elementos ao `index.html` que o JS usa, buscar de forma opcional.
- Não verificado: conta real logada com as mudanças de hoje (o usuário testou parte no computador), Safari/iPhone, aparelho físico, confeiteiras reais. Cartão "No ar" só visto simulando conta.
- Pendências antigas: duas contas sintéticas `.invalid` com páginas desativadas; aviso de RLS em `public.n8n_chat_histories` (fora do app, não mexer sem mapear).

## 10. Como abrir a próxima sessão

Abrir a pasta `C:/Users/Restore/Documents/doce-agenda` (carrega `AGENTS.md`). Mensagem sugerida:

> Leia AGENTS.md e context.md e me diga em poucas linhas onde paramos.

Manter este arquivo coerente: ao concluir uma etapa, **reescrever** a parte afetada em vez de só acrescentar linhas.
