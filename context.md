# Doce Agenda — contexto para continuar em outra sessão

Atualizado em **14/10/2026**. Este arquivo é uma passagem de bastão, não uma lista de ações já autorizadas. Confirmar o estado real antes de mudanças externas.

## 1. Onde paramos

- O app está publicado e testado na **Cloudflare**, incluindo a feature **Meu mês**.
- O domínio `lucast.app` continua apontando para a versão anterior no Netlify. A migração de DNS **não foi feita** e acabou de ser **adiada pelo usuário**.
- O usuário pediu agora estes dois documentos, `AGENTS.md` e `context.md`, para abrir outra sessão sem recontar o projeto.
- **Não iniciar Produção, Compras, Pix ou Clientes automaticamente.** Meu mês foi entregue; a próxima feature exige autorização. Não continuar DNS sem o usuário retomar o assunto.
- **Nova landing (14/10/2026), commit `85012ce`, só local, NÃO publicada nem enviada ao GitHub.** Título "Seu caderno não te avisa que o bolo é amanhã.", ilustração CSS de caderno + celular na primeira tela, seção de dores, 3 benefícios, FAQ reduzido e fechamento "Menos caderno. Mais espaço para criar." Verificada no build local em 360 px e desktop. Depois a ilustração foi trocada por foto gerada no ChatGPT pelo usuário (`public/landing/assets/cozinha-caderno*.jpg`, comprimida de 2,4 MB para 100/270 KB), com a tela "Hoje" do app sobreposta por CSS no celular da foto. A imagem é ilustrativa e não deve ser apresentada como caderno de confeiteira real. Os PNGs originais ficaram na raiz, fora do Git. **Publicada na Cloudflare em 14/10/2026 com autorização do usuário: versão `8c8659b7-8325-45a3-8d29-b45eee5f8c3f`.** Verificado no endereço workers.dev: teste de rotas (5/5, slug preservado), landing/foto/cadastro/demo/privacidade com 200, landing em 360 px sem rolagem horizontal, fontes e foto carregadas, login carregando sem erros no console. Commits **enviados à `main` do GitHub** (`8a86d2d`) com autorização do usuário. Fotos originais em `design/fotos/`; `.gitattributes` fixa LF em dois arquivos gerados pelo build, que antes apareciam como falsamente modificados.
- **Meu mês de exemplo na demonstração (14/10/2026), commit `09426b3`, enviado ao GitHub e publicado na Cloudflare (versão `8ce86dc7-8b54-4078-ad55-033387fc5c46`), conferido na demo publicada.** Enquanto a visitante da demo não tem pedido próprio, o mês atual mostra 8 pedidos fictícios calculados pelo `monthlySummary` real (`cloud/demo-month.js`, flag `isExample`, aviso "Números de exemplo"). Conta real e servidor não mudam. Testes: 41 de nuvem e 2 do servidor local passaram; fluxo verificado no build local em 360 px (exemplo aparece e some após cadastrar pedido próprio).
- **Navegação em 4 abas (14/10/2026), autorizada pelo usuário; enviada ao GitHub e publicada na Cloudflare (versão `3d8c4f3b-390c-447b-973a-48d669d05d74`).** Verificado no ar: rotas 5/5, /, /demo/, /app/, /cadastro/ com 200; na demo publicada em 360 px, barra com 4 itens, semana na Agenda, próximo passo avançando para Em produção com Desfazer, etapas com contagem, sem rolagem lateral e sem erros no console. Barra: Agenda · Pedidos · Meu mês · + Novo. Agenda = antiga Hoje com a semana embutida (dia escolhido começa em hoje, "Voltar para hoje", navegação de semanas, "Ajustar esta data"); a aba Semana deixou de existir (`data-view="week"` cai em Agenda). Pedidos troca o menu de situação por faixa de etapas com contagem (Todos, Novos = Solicitação/Orçamento/Aguardando, Confirmados, Fazendo, Prontos, Entregues, Cancelados), **sem mudar as situações gravadas**. Pedidos Confirmado/Em produção/Pronto ganham botão de próximo passo (PUT só com `status`, histórico registrado, "Desfazer" no aviso); etapas anteriores continuam pelo formulário. Testes: 43 automáticos passaram; demo local em 360 px e 1280 px verificada (avançar, desfazer, filtros, foco, sem rolagem lateral). Scripts Playwright antigos foram adaptados aos novos seletores, mas não foram executados. Não verificado com conta real logada.
- **Demonstração completa + stories de boas-vindas (14/10/2026), pedido do usuário; publicado na Cloudflare (versão `26d1c291-dde2-4336-bdd3-8f3759a67d75`).** Incidente: a primeira publicação (`8e61db1b`) quebrava o carregamento quando o navegador usava uma página em cache sem o botão "Recomeçar"; corrigido no mesmo dia com busca opcional do botão. Verificado no ar em aba limpa: stories abrem na primeira visita, demo com 3 pedidos hoje, sem erros no console. `/demo/` usa chave própria (`doce-agenda.demo.v2`) e nasce com uma confeitaria fictícia (`cloud/demo-seed.js`): 15 pedidos relativos à data da visita, cobrindo todas as etapas, um Pix informado para conferir, uma solicitação pelo link e um dia lotado (limite 3). Esses pedidos contam como reais **só dentro da demo**, então Agenda, Pedidos e Meu mês mostram os mesmos dados. O antigo "mês de exemplo" (`demo-month.js`) foi removido. A faixa da demo ganhou "Como funciona" e "Recomeçar" (só a demo pode ser reiniciada; o piloto do navegador mantém a chave antiga e um exemplo). Stories em `public/app.js` + `style.css` (CSS e JS próprios, sem biblioteca): 7 cenas (caderno → celular, anotar pedido com digitação animada, carimbo do sinal, próximo passo, Meu mês com números subindo, link de encomenda, final com granulado). Abrem sozinhos uma vez por aparelho na demo e em conta nova sem pedidos; respeitam movimento reduzido; toque à direita avança, à esquerda volta, segurar pausa, Esc fecha. Testes: 43 automáticos passaram (3 novos validam a demo como backup real); verificado em build local a 375 px e 1280 px. Não testado em conta real logada nem em Safari/aparelho físico.
- **Próximos dias, confirmar orçamento e revisão visual dos cartões (14/10/2026), após teste do usuário com conta real; publicado na Cloudflare (versão `5833eef0-4044-4a0f-9477-da916672ae99`).** Verificado no ar: rotas 5/5; demo em 375 px com "Próximos dias" agrupado, sumindo ao escolher outro dia, botões de próximo passo e "Confirmar pedido" no orçamento, sem erros. "Logo mais" virou "Próximos dias": só aparece com hoje selecionado (não repete o dia escolhido), agrupa por "Amanhã"/dia e usa cartões compactos sem botão. Orçamento e Aguardando confirmação ganham "Confirmar pedido →" (abre o formulário já em Confirmado, mantendo checagens de data, lotação e bolo); Solicitação ganha "Revisar solicitação →"; o próximo passo também aparece no topo do pedido aberto e a tela atualiza ao avançar. Cores: "Falta o sinal" (baunilha) vence "Pronto" (pistache); Entregue sem risco (risco só em Cancelado); botão de próximo passo branco com borda ameixa; movimento ao trocar de dia e destaque no pedido que avançou (respeita movimento reduzido). "Próxima ação" saiu do lado da semana (espremia os dias) e virou cartão abaixo da agenda. Testes: 43 automáticos; demo local em 375 px e 1024 px verificada (cor prioritária, confirmar orçamento, avançar pelo detalhe).
- **Ajustes redesenhados (14/10/2026), pedido do usuário; publicado na Cloudflare (versão `9883c2d5-48ee-4fe3-b1de-f1a39f696f84`).** Verificado no ar: rotas 5/5; demo com 3 cartões e resumos; prévia publicada abre "Doces da Lu" com faixa de prévia, sem requisições ao Supabase nem erros. Entrega 1 (`f22bec1`): link de encomenda em 3 passos (vitrine, produtos em lista com + Adicionar, endereço gerado do nome e corrigido sozinho), botões "Ativar meu link"/"Salvar sem ativar"; ativo vira cartão "No ar" com Copiar, Mandar no WhatsApp (wa.me só com o texto, ela escolhe o contato) e prévia; "Pausar link". Prévia em `/encomenda/?preview=1` lê o rascunho do `localStorage` e nunca busca nem envia nada (verificado: zero requisições ao Supabase). A demo traz um link "Doces da Lu" inativo para explorar. Entrega 2: Ajustes em cartões fechados com resumo (link, "Dias e limites", "Detalhes do bolo"), antecedência em opções (sem mínimo, 1, 2, 3 dias, 1 semana; gravada em horas como antes; valor antigo diferente vira opção própria), "Mudar só uma data" dentro de Dias e limites, e "Ajustar esta data" abre direto ali. Testes: 43 automáticos; demo local em 375 px. O cartão "No ar" só foi visto simulando conta, não em conta real.
- **Domínio:** o usuário retomou o assunto em 14/10 e pediu orientação depois dos Ajustes. `lucast.app` tem e-mail ativo: MX da Name.com (mx3..mx8.name.com) e SPF `v=spf1 a mx ~all` encaminhando para o Gmail dele, que também responde por esse endereço. Esses registros precisam ser preservados na troca de nameservers. `www` aponta para o Netlify; a raiz para 75.2.60.5 (Netlify).
- Preferência atual: execução pelo agente principal, **sem delegação**; comunicação curta e simples, economia de tokens e conclusão por etapas.

## 2. Produto e público

App web para confeiteiras brasileiras autônomas e pequenas confeitarias que trabalham por encomenda. Organiza pedidos, datas, detalhes combinados e pagamentos conferidos. Público usa principalmente celular, entre tarefas da cozinha. A ideia surgiu da experiência de Lucas em gastronomia e de uma amiga confeiteira que conhece outras profissionais; validação com participantes reais ainda precisa acontecer.

Mensagem da landing: agenda de encomendas para confeiteiras; pedido, prazo e sinal no mesmo lugar. Link público reduz redigitação: a cliente preenche, a confeiteira revisa. Não inventar integração com WhatsApp, confirmação bancária, depoimentos ou resultados comerciais.

Identidade atual **Glacê + carimbo**: rosa `#f7c5d0`, ameixa `#2b1a2c`, creme `#fffaf2`, pistache `#d3e7c1`, carimbo verde `#2e6a46`. Fredoka/Figtree locais, licenças OFL. Logo tipográfico em `public/logo.svg`. A identidade antiga de serifa/terracota/calendário/trevo foi substituída.

## 3. Código, Git e endereços

- Pasta de trabalho atual: `C:/Users/Restore/Documents/doce-agenda` (clone limpo só deste projeto, com dependências instaladas). A pasta antiga `ebooks/projeto_B/web` não deve mais ser usada: mistura outros projetos e gasta tokens à toa. Há uma pasta `Documents/doceagenda` com um `.git` incompleto, criado por engano em 14/10; ignorar e não commitar nela.
- GitHub: https://github.com/tenorio94-prog/doce-agenda
- **`main` foi atualizada em 14/10/2026, com autorização do usuário, para ficar igual à versão publicada** (avanço simples a partir de `beed27d`, sem apagar nada). Branch `main` é a base de trabalho a partir daqui; `redesign-glace-carimbo` e o PR #1 ficam como histórico.
- Código no momento desta atualização: `main` e `redesign-glace-carimbo` em `d4989f9`. Consulte `git log`, sem tratar esse hash como HEAD permanente.
- Repositório estava **público** na última consulta da API. Git autenticado permitiu push; isso não implica sessão autenticada no navegador nem acesso a outros provedores.

| Uso | Endereço/estado |
| --- | --- |
| Versão atual | https://doce-agenda.doce-agenda-local.workers.dev/ |
| Login/cadastro atual | https://doce-agenda.doce-agenda-local.workers.dev/cadastro/ |
| App com conta | https://doce-agenda.doce-agenda-local.workers.dev/app/ |
| Demo sem cadastro | https://doce-agenda.doce-agenda-local.workers.dev/demo/ |
| Privacidade atual | https://doce-agenda.doce-agenda-local.workers.dev/privacidade/ |
| Domínio canônico ainda antigo | https://lucast.app/ — Netlify |
| Alias Netlify | https://doce-agenda-piloto.netlify.app/ |
| Contato de produto/privacidade | doceagenda@lucast.app |

Commits relevantes, todos enviados ao GitHub: `c1f47d7` identidade; `588d82e` correção de recebimento zero; `616da7a` link público; `7e3cdfc` landing/privacidade; `c18074c` Meu mês; `1e13b60` publicação Cloudflare. `main` não foi atualizada por merge. **Push não publica automaticamente** em nenhum dos fluxos atuais.

## 4. Arquitetura real

- Frontend: HTML/CSS/JavaScript sem framework React. Node.js/ES modules, esbuild, `@supabase/supabase-js` fixado em `2.117.3`. Scripts no `package.json` ainda se referem ao servidor local.
- `public/app.js`: telas e fluxos. `public/index.html`: estrutura. `public/style.css`, `tokens.css`, `logo.svg`: visual. `public/landing/`: apresentação. `public/account/` + `cloud/auth-controller.js`: cadastro/login. `public/encomenda/`: formulário público. `public/privacidade/index.html`: política.
- `cloud/app-bootstrap.js` publica `window.DoceApi` para a conta autenticada e só então carrega o app. Não cair silenciosamente em armazenamento local após erro de rede/autenticação.
- `cloud/doce-api.ts`/`edge-entry.ts`: backend autenticado Supabase. Envelope HTTP POST `{path,method,body,expectedRevision}` em `/functions/v1/doce-api`. As rotas lógicas usam `/api/...`; isso não significa que existam funções equivalentes no host estático.
- `cloud/state-engine.js`: transações/validação/regras compartilhadas. `monthly-summary.js`: resumo mensal. `public-api.ts`/`public-entry.ts`, `public-orders.js`, `order-link-model.js`: link público, validação e disponibilidade.
- Estado completo da conta em `pilot_agendas.state` (JSONB), revisão otimista e RPC `commit_pilot_agenda`. Escrita exige revisão atual; conflito não deve causar sobrescrita. Restauração cria ponto anterior em `pilot_agenda_restore_points`.
- Outras entidades do recurso público: `pilot_order_pages`, `pilot_public_submissions` e `pilot_owner_activity`; acesso de serviço/RLS conforme migrações. Não criar tabela paralela de pedidos sem necessidade.
- Supabase: projeto **`khvhnbopdluthpcduhqm`**, nome “Projeto aprender”. Antes de agir, confirme que é o projeto correto. Não foi criado banco novo na Cloudflare.
- Cadastro aberto com e-mail/senha, **sem confirmação por e-mail**, autorizado para o piloto. SMTP/recuperação por e-mail não estão ativos. Não podemos ver a senha de uma pessoa; eventual redefinição é um fluxo administrativo próprio, não leitura de senha. Google não é necessário.
- `server.mjs` + `data/state.json` são versão local separada. `/demo/` usa `browser-store.js` gerado de `cloud/browser-adapter.js`, salvo somente no navegador. Essas duas versões não sincronizam com a conta na nuvem.
- Atenção: o README principal ainda contém descrições históricas de app sem login/banco. Não confundir com a arquitetura atual acima. O README de `cloud/` já foi atualizado.

## 5. O que já funciona

- Landing, cadastro/login, Hoje, Pedidos, Semana, Ajustes, formulário/detalhes do pedido, recebimentos, histórico, cópia do resumo, backup/restauração e Meu mês.
- Disponibilidade: dias da semana fechados, antecedência mínima, limite de pedidos por data, exceções de data e justificativa ao abrir exceção em pedido manual. Modelo de bolo configurável em Ajustes. Semana abre na data atual e ajustes ficam em área própria.
- Situações existentes: Solicitação, Orçamento, Aguardando confirmação, Confirmado, Em produção, Pronto, Entregue, Cancelado, Recusado. **Cada recurso possui critérios próprios**; não reutilizar indiscriminadamente a lista de situações comprometidas.
- Pagamentos Informado/Conferido: só conferidos contam. Zero conferido registra a conferência, preserva histórico e não gera carimbo de sinal pago. Saldo/excedente considera os recebimentos reais.
- `totalKnown: false` diferencia novos valores em branco de zero informado. Legado ainda usa `total`/`amount` em reais, sem conversão global da base. Zeros históricos não foram reclassificados. Campo preservado em backup e compatível com clientes antigos.

### Link de encomenda

- Ajustes → Link de encomenda: ativar, slug único, nome, boas-vindas, produtos simples e WhatsApp opcional. Padrão desativado.
- `/p/<slug>` sem login, datas disponíveis, personalização de bolo, consentimento e protocolo. Entra como **Solicitação**, origem `link`, na mesma lista de pedidos. A confeiteira aceita como Orçamento/Confirmado, ajusta ou recusa. Pendentes não ocupam capacidade; confirmar revalida a vaga.
- WhatsApp apenas `wa.me` com resumo: **a cliente toca em enviar**. Sem número configurado, o botão não aparece. Não há mensagens automáticas, Pix nem acompanhamento público.
- Duplicatas possíveis em 10 minutos são sinalizadas. Rate limit: 5/IP/hora e 50/página/dia, honeypot e validação no servidor. Rotas públicas não retornam outras clientes nem contagens privadas.
- Consentimento registrado; rotina diária remove dados pessoais/textos livres de solicitações recusadas após 90 dias. Política publicada e ligada na landing/formulário.
- A cópia do link ainda usa `https://lucast.app/p/<slug>`; a rota equivalente também funciona na Cloudflare. A mudança do domínio não foi feita.

### Meu mês — etapa 1 entregue

- Pedidos: só **Confirmado e Entregue**, pela data de retirada/entrega no mês; Em produção/Pronto ficam fora por definição da spec atual. Exemplos, solicitações, cancelados, recusados e orçamentos não entram.
- Vendido: soma dos totais conhecidos; pedido sem preço conta em Pedidos, com aviso, mas não em Vendido. Recebido: pagamentos conferidos desses pedidos, mesmo recebidos em outro mês. A receber: `max(0, Vendido - Recebido)`.
- Três dias da semana mais cheios; cinco produtos mais frequentes agrupados sem maiúsculas/acentos; prazo médio em dias de calendário entre criação e entrega, no fuso de São Paulo.
- Menos de três pedidos: cartões e explicação; mês vazio: estado vazio sem zeros enganosos. Seletor sem mês futuro e protegido de respostas atrasadas.
- Cálculo no servidor, rota lógica `/api/resumo-mensal?mes=AAAA-MM`. Sem tabela nova. Ver `docs/MEU_MES_ENTREGA.md`.

## 6. Publicação e autenticação das ferramentas

- Cloudflare: Workers Static Assets, Worker `doce-agenda`. Versão final verificada `7034e89d-ecef-4b9d-93f5-439ba3c27dc1`. Conta configurada em `wrangler.jsonc`.
- Publicar somente `deploy-cloud/public`. `wrangler.jsonc` executa `node scripts/build-cloudflare.mjs`; esse build prepara os fontes e adapta `_redirects` para **`/p/:slug /encomenda/ 200`**. Destino `/encomenda/index.html` causa redirecionamento e perde o slug na Cloudflare; bug corrigido e testado.
- API Supabase publicada: `doce-api` v7 (JWT obrigatório), `doce-public` v5 (anônima por definição, rotas estritas). Origem Cloudflare liberada de forma exata, junto de lucast.app/Netlify/localhost permitidos; sem wildcard para qualquer Workers.
- Em 14/10/2026 o login do Wrangler havia expirado e foi **renovado** pelo usuário via device flow; `wrangler deployments status` confirmou a versão `7034e89d` no ar.
- O usuário autorizou o Wrangler **pelo celular** via device flow. Credenciais criptografadas fora do repositório, com chave no Windows Credential Manager. Não assumir que estarão disponíveis em outra máquina ou que o painel web estará logado.
- Escopos atuais: leitura de conta/usuário e escrita de scripts Workers. Não presumir acesso de gestão de DNS/zonas. Avisos do Wrangler sobre escopos adicionais não impediram a publicação; não ampliá-los sem necessidade.
- Para renovar, quando necessário: `npx --yes --package wrangler@4.119.0 wrangler login --device --browser=false --use-keyring --scopes account:read user:read workers_scripts:write`. O usuário abre o link, aprova o código temporário; não pedir senha ou token no chat. No Windows foi instalado `@napi-rs/keyring@1.3.0` global para o cofre.
- Netlify: site `doce-agenda-piloto`, ID `9a87a009-0bdc-4651-9e65-9bc68f78ab4b`; versão antiga `6acecdaa34b7500b6803ecce`. Novos deploys foram bloqueados por limite de créditos. Não contratar créditos nem voltar a insistir no upload sem mudança externa.
- Guia completo: `docs/CLOUDFLARE_PUBLICACAO.md`.

## 7. DNS — pendência explicitamente adiada

`lucast.app` está registrado na Name.com, **somente domínio**, sem hospedagem contratada. NS consultados: `ns1hwy.name.com`, `ns2jqz.name.com`, `ns3ckl.name.com`, `ns4cjp.name.com`. Isso é um retrato de 14/10; consultar novamente ao retomar.

Para conectar o Worker ao domínio principal, cadastrar/ativar uma zona na Cloudflare, revisar/importar todos os registros atuais (inclusive MX, SPF, DKIM e DMARC do e-mail), receber os dois nameservers atribuídos e depois mudar **Manage Nameservers** na Name.com. Não inventar Answer/IP/TTL nem nameservers; não é simplesmente um CNAME para o endereço Workers. Depois vincular o domínio ao Worker e conferir HTTPS/rotas/login. O registro do domínio permanece na Name.com.

**Não sabemos se a zona chegou a ser criada pelo usuário.** A última mensagem foi “não vou fazer isso ainda”. Não houve alteração de DNS nesta sessão.

## 8. Próximas features — nenhuma iniciada

Ordem aprovada de planejamento: **Produção A → Pix → Clientes**. A subetapa Compras B fica para depois de validar Produção A em uso e obter autorização específica. Uma entrega por vez, publicada/testada, commits separados e pausa antes da seguinte.

- **Produção A:** semana segunda–domingo, apenas Confirmados, agrupados por dia e horário; cliente, produto, quantidade e detalhes. Quantidade opcional inteira/padrão 1 em Mais detalhes; `producao_feita` persistente; copiar lista. Vínculo opcional com produto do catálogo do link, preservando texto livre. Usar uma única lista de produtos por conta; hoje ela é JSON sem entidade de catálogo completa, então adaptar sem quebrar o legado. Incluir campos novos no backup e testar outro aparelho.
- **Compras B:** receitas simples por produto (ingrediente/quantidade/unidade por unidade de produto), multiplicar pela quantidade dos Confirmados da semana, somar somente mesmo nome/unidade; g e kg separados. Avisar produtos sem receita, checkbox Comprado por semana. Sem estoque, custos ou conversão de unidades. Ainda adiada.
- **Pix:** estático BR Code oficial, gerado localmente sem provedor/custódia. Ajustes com tipo/chave validada, recebedor até 25 caracteres e cidade até 15, normalizados. Sinal sugerido 30%, editável/configurável; valor e txid sem dados da cliente, CRC16, copiar código/mensagem e QR. Não criar recebimento por padrão; opção explícita de registrar aguardando usa o fluxo existente sem confirmar dinheiro. Chave privada à dona, nunca pública/logs; backup avisa que contém chave. Atualizar política. Exige fontes oficiais/testes CRC e validação humana em **dois apps de banco** antes de liberar; não alegar isso a partir de teste automatizado.
- **Clientes:** ficha por conta, vínculo por WhatsApp normalizado; nome igual sem telefone gera sugestão, nunca união automática. Legado só ligado após aprovação; pedidos do link podem identificar pela regra de telefone. Busca/histórico, anotações até 500 caracteres, datas importantes dia/mês e lembretes manuais em Hoje (até 5; próximas datas em 14 dias e recorrência do ano anterior), dispensáveis sem voltar. Meu mês ganha clientes novas/recorrentes. Excluir ficha anonimiza pedidos mantendo valores/datas. Backup completo, isolamento e política antes de liberar; revisão jurídica sugerida pelo usuário ainda depende de decisão/profissional. Sem IA, importação de contatos ou envio automático.

Regras comuns: centavos, fuso São Paulo, cálculo no servidor com dados completos, isolamento, compatibilidade de backups, campos opcionais e telas de 360 px. Resumo do plano em `docs/PROXIMAS_FEATURES_ETAPAS.md`; confirmar interpretações que não estejam definidas antes de implementar.

## 9. Verificações conhecidas e limites

Na entrega anterior: 38 testes de nuvem, 2 do servidor local, 6 cenários UI de Meu mês e 10 de pagamentos passaram. CORS/autorização: 12 testes dirigidos passaram na migração. Agregação de 5 mil pedidos/20 mil recebimentos ficou em aproximadamente 100 ms **só de cálculo local**, sem promessa de latência total.

Na Cloudflare publicada, sem interceptar arquivos locais: login real das contas fictícias, cálculo/backup/restauração/isolamento de duas contas e telas em 360/1440 px passaram. Depois da correção do proxy, cinco testes HTTP e smoke no navegador (landing, privacidade, demo, detalhes, login e link público desativado) passaram. Capturas foram examinadas. Não foram testes físicos de celular/Safari nem validação com confeiteiras reais.

Comandos, a partir desta pasta (selecionar conforme a mudança; não rodar tudo só por iniciar sessão):

```powershell
node --test cloud/*.test.mjs
node --test test.mjs
node scripts/build-cloudflare.mjs
node scripts/test-monthly-summary.mjs
node scripts/test-payment-stamps.mjs
node scripts/test-cloudflare-routing.mjs
npx --yes --package wrangler@4.119.0 wrangler deployments status --config wrangler.jsonc
```

Testes visuais usam Playwright do runtime local e Chrome instalado; conferir disponibilidade antes de executar em outra máquina. `cloud/test-monthly-live.mjs` exige sessões sintéticas privadas apontadas por `DOCE_QA_SESSION`/`DOCE_QA_SECOND`, `DOCE_TEST_ORIGIN` e ausência de `DOCE_MONTHLY_ASSETS=local` para verificar publicação real. Ele escreve só em contas `.invalid` e restaura o estado original; não executar contra pessoas reais.

Pendências operacionais: duas contas sintéticas e seus registros ainda existem, com páginas desativadas. A limpeza definitiva falhou anteriormente por `Invalid or expired requestState`; não foram confundidas com dados reais. Scripts/sessões de QA podem estar na pasta temporária do Windows e **não são versionados**; sua disponibilidade futura não é garantida. Há aviso antigo de RLS em `public.n8n_chat_histories`, fora das tabelas do app, não corrigido nem manipulado nesta tarefa. Não alterar tabelas antigas alheias sem mapear dependências.

## 10. Como abrir a próxima sessão

Abrir como projeto a pasta `C:/Users/Restore/Documents/doce-agenda`, para carregar `AGENTS.md`. Uma sessão nova não recebe automaticamente o histórico inteiro nem as credenciais de outra máquina. Mensagem sugerida:

> Leia AGENTS.md e context.md. Confirme em poucas linhas o estado do Doce Agenda e aguarde eu escolher a próxima tarefa. Não altere o DNS nem comece a próxima feature ainda.

Manter este arquivo atualizado no encerramento das etapas, separando o que foi observado, o que continua pendente e o que depende de autorização.
