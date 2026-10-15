# Doce Agenda — contexto para continuar em outra sessão

Atualizado em **15/10/2026**, após ligar o domínio `lucast.app`. Este arquivo é a passagem de bastão: descreve o estado real, as decisões e o que depende de autorização. Confira `git log` e o site antes de agir; hashes e versões abaixo são um retrato.

## 1. Onde paramos

- Tudo o que foi feito está **no GitHub (`main`) e publicado na Cloudflare**. Última versão publicada e conferida no ar: `6c2afe14-cbc0-445f-9565-75e039ba7e82` (Lista da semana). Pasta e GitHub sincronizados, sem alterações pendentes.
- **Domínio `lucast.app` ligado ao app em 15/10/2026** (seção 7): DNS na Cloudflare, site novo no ar em `lucast.app` e `www.lucast.app`, e-mail testado pelo usuário.
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

**Landing** (`public/landing/`): título "Seu caderno não te avisa que o bolo é amanhã.", foto ilustrativa gerada pelo usuário no ChatGPT (`landing/assets/cozinha-caderno*.jpg`, originais em `design/fotos/`) com a tela "Hoje" do app sobreposta por CSS no celular da foto. A foto é ilustrativa: não apresentar como caderno de confeiteira real. Seções de dores, 3 benefícios, FAQ curto, fechamento "Menos caderno. Mais espaço para criar."

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
- Pendências: `www` não redireciona para a raiz (serve o mesmo site); a política de privacidade ainda cita Netlify entre os provedores (atualizar só com aprovação); Netlify antigo pode ser desativado quando o usuário quiser.

## 7b. Enxugar o código — feito em 14/10

Lucas aprovou os três grupos do diagnóstico e a aposentadoria do servidor local. Tudo foi feito sem mudança visível: as capturas antes/depois saíram idênticas e os arquivos publicados conferem com o build.
1. **Faxina** (commit `74f754d`, publicado): 11 classes sem uso removidas de `style.css`; 4 scripts de revisão antigos removidos; 15 documentos antigos movidos para `docs/historico/`; README reescrito.
2. **Montagem única** (commit `cbc0417`, publicado): `build-cloudflare.mjs` substituiu a cadeia de quatro scripts. A saída ficou idêntica byte a byte. A landing tem na fonte o texto publicado; as trocas que restam (demo e app com conta) falham com erro se o texto sumir. As pastas `deploy-demo` e `deploy-launch` deixaram de existir.
3. **Servidor local aposentado** (commit seguinte): removidos `server.mjs`, `test.mjs` (as regras seguem cobertas pelos testes de `cloud/`), `iniciar.ps1`, `capturar_prints.mjs` e `video-launch/scripts/capture.mjs`; `npm start` saiu e `npm test` roda os testes de `cloud/`. O site não mudou, então não houve nova publicação.

Ainda **não mexido** (decisão de 14/10): `style.css` (cerca de 100 KB, em camadas que se sobrepõem) e `app.js` (112 KB, arquivo único). Mexer neles junto com Produção A, com comparação de telas. Os 30 MB de prints em `design/` não afetam o site.

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
- Testes a escolher pela mudança: `npm test` (= `node --test cloud/*.test.mjs`, 41 passando), `node scripts/build-cloudflare.mjs`, `node scripts/test-cloudflare-routing.mjs` (5/5 no ar). Testes de tela atualizados em 14/10 e passando: `scripts/test-production-list.mjs` (Lista da semana, 360 e 1280 px), `test-monthly-summary.mjs` (6 casos) e `test-payment-stamps.mjs` (10 casos); usam a chave `doce-agenda.demo.v2` e marcam a apresentação como vista. Rodar depois de `node scripts/build-cloudflare.mjs`. `test-ux-improvements.mjs`, `test-deploy.mjs`, `review-today.mjs` e `cloud/test-order-link-e2e.mjs` seguem sem execução.
- Comparação usada em 14/10 para provar que nada mudou: guardar o `deploy-cloud/public` anterior, comparar arquivo por arquivo (md5) e tirar capturas de 11 telas em 360 e 1280 px (landing, cadastro, privacidade, prévia do link, demo: agenda, pedidos, mês, ajustes, pedido, novo), comparando pixel por pixel.
- Verificação de interface tem sido feita no painel do navegador: build local servido por um servidor estático simples e a demo publicada em 360–1280 px. Logo após publicar, o site pode levar alguns segundos para servir arquivos novos.
- **Lição:** a publicação dos stories quebrou para quem tinha a página antiga em cache (botão novo ausente). Ao adicionar elementos ao `index.html` que o JS usa, buscar de forma opcional.
- Não verificado: conta real logada com as mudanças de hoje (o usuário testou parte no computador), Safari/iPhone, aparelho físico, confeiteiras reais. Cartão "No ar" só visto simulando conta.
- Pendências antigas: duas contas sintéticas `.invalid` com páginas desativadas; aviso de RLS em `public.n8n_chat_histories` (fora do app, não mexer sem mapear).

## 10. Como abrir a próxima sessão

Abrir a pasta `C:/Users/Restore/Documents/doce-agenda` (carrega `AGENTS.md`). Mensagem sugerida:

> Leia AGENTS.md e context.md e me diga em poucas linhas onde paramos.

Manter este arquivo coerente: ao concluir uma etapa, **reescrever** a parte afetada em vez de só acrescentar linhas.
