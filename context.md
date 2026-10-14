# Doce Agenda — contexto para continuar em outra sessão

Atualizado em **14/10/2026**, ao fim de uma sessão longa de melhorias. Este arquivo é a passagem de bastão: descreve o estado real, as decisões e o que depende de autorização. Confira `git log` e o site antes de agir; hashes e versões abaixo são um retrato.

## 1. Onde paramos

- Tudo o que foi feito está **no GitHub (`main`) e publicado na Cloudflare**. Última versão publicada e conferida no ar: `bd4358cf-44b7-4589-9293-1549b5d83cb6`. Pasta e GitHub sincronizados, sem alterações pendentes.
- **Próximo assunto combinado: domínio `lucast.app`** (seção 7). O usuário retomou o tema e pediu para ser guiado passo a passo quando disser "vamos ao domínio". Ainda não houve nenhuma alteração de DNS.
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
- **Pedidos:** busca + faixa de etapas com contagem (Todos, Novos = Solicitação/Orçamento/Aguardando, Confirmados, Fazendo, Prontos, Entregues, Cancelados). As 9 situações gravadas **não mudaram**; as etapas só agrupam.
- **Próximo passo:** Confirmado → "Começar a fazer" → Em produção → "Ficou pronto" → Pronto → "Marcar entregue" (PUT só com `status`, histórico, "Desfazer" no aviso). Orçamento/Aguardando → "Confirmar pedido" (abre o formulário já em Confirmado, mantendo checagens de data, lotação e bolo). Solicitação → "Revisar solicitação". O botão também aparece no topo do pedido aberto.
- **Meu mês:** só Confirmado e Entregue no mês; vendido, recebido (só conferido), a receber, dias mais cheios, produtos, prazo médio. Cálculo no servidor (`/api/resumo-mensal`). Ver `docs/MEU_MES_ENTREGA.md`.
- **Ajustes** em cartões fechados com resumo de uma linha: **Link de encomenda**, **Dias e limites** (dias fechados, antecedência em opções Sem mínimo/1/2/3 dias/1 semana — gravada em horas como antes —, limite por dia, "Mudar só uma data"), **Detalhes do bolo**. Cópia de segurança abaixo.
- **Link de encomenda:** passo a passo (1 vitrine, 2 produtos em lista com "+ Adicionar", 3 endereço gerado do nome e corrigido sozinho + WhatsApp opcional), "Ativar meu link"/"Salvar sem ativar". Ativo vira cartão verde "No ar" com Copiar, "Mandar no WhatsApp" (`wa.me/?text=` só com o texto; ela escolhe contato e envia) e prévia; "Pausar link". **Prévia** em `/encomenda/?preview=1` lê o rascunho do `localStorage` e nunca busca nem envia nada; avisa se faltam produtos/nome. O link copiado usa `https://lucast.app/p/<slug>` (hoje servido pelo Netlify antigo, mas funciona porque usa o mesmo backend).
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
| Site atual | https://doce-agenda.doce-agenda-local.workers.dev/ |
| Cadastro/login | …/cadastro/ |
| App com conta | …/app/ |
| Demonstração | …/demo/ |
| Prévia do link | …/encomenda/?preview=1 |
| Domínio ainda antigo | https://lucast.app/ — Netlify (versão antiga) |
| Contato | doceagenda@lucast.app (encaminha para o Gmail do usuário) |

## 6. Arquitetura

- Frontend HTML/CSS/JS sem framework; esbuild; `@supabase/supabase-js` 2.117.3.
- `cloud/app-bootstrap.js` publica `window.DoceApi` para a conta autenticada. Não cair em armazenamento local após erro.
- Backend Supabase (projeto `khvhnbopdluthpcduhqm`, "Projeto aprender"): `doce-api` (JWT) e `doce-public` (anônima, rotas estritas). Estado da conta em `pilot_agendas.state` (JSONB) com revisão otimista (`commit_pilot_agenda`); restauração cria ponto anterior. Tabelas do link: `pilot_order_pages`, `pilot_public_submissions`, `pilot_owner_activity`.
- `cloud/state-engine.js` (regras/validação), `monthly-summary.js`, `order-link-model.js`, `public-orders.js`, `demo-seed.js`, `browser-adapter.js`.
- Cadastro e-mail/senha sem confirmação (piloto); recuperação por e-mail não ativa.
- O README principal ainda descreve o piloto antigo sem login; não confiar nele.

## 7. Domínio `lucast.app` — próximo assunto, aguardando o usuário

Retrato de 14/10 (consultar de novo ao começar): registrado na Name.com; NS `ns1hwy/ns2jqz/ns3ckl/ns4cjp.name.com`; raiz A `75.2.60.5` e `www` CNAME `doce-agenda-piloto.netlify.app` (Netlify); **e-mail ativo**: MX `mx3..mx8.name.com` (prioridades 10–60) e TXT `v=spf1 a mx ~all`. O usuário recebe e responde `doceagenda@lucast.app` pelo Gmail; isso precisa continuar funcionando.

Plano explicado e aceito em princípio (cada passo externo com o usuário):
1. Usuário adiciona `lucast.app` na conta Cloudflare (plano grátis); a Cloudflare importa os registros.
2. Conferir juntos que MX e SPF vieram completos.
3. Usuário troca os nameservers na Name.com pelos dois indicados pela Cloudflare (registro do domínio continua na Name.com).
4. Após propagar: ligar o domínio ao Worker `doce-agenda`, conferir HTTPS, rotas (`/p/:slug`), login, link das clientes e **teste de envio e resposta do e-mail**.
Não é um simples CNAME. Wrangler atual só tem escopo de Workers (sem DNS/zonas); não ampliar escopos sem necessidade. Liberar a origem `lucast.app` no CORS do Supabase já existe; conferir.

## 8. Próximas features — nenhuma iniciada

Ordem planejada: **Produção A → Pix → Clientes** (Compras B adiada). Detalhes em `docs/PROXIMAS_FEATURES_ETAPAS.md`. Resumo:
- **Produção A:** semana seg–dom, só Confirmados, por dia/horário, quantidade opcional, `producao_feita`, copiar lista, vínculo opcional com produtos do link.
- **Pix:** BR Code estático gerado localmente, sinal sugerido 30%, chave privada, atualizar política; validar em **dois apps de banco** antes de liberar.
- **Clientes:** ficha por WhatsApp normalizado, sem união automática, lembretes de datas, anonimizar ao excluir; política antes de liberar.
Regras comuns: centavos, fuso São Paulo, cálculo no servidor, isolamento, backups compatíveis, 360 px.

## 9. Publicação, testes e limites

- Cloudflare Workers Static Assets, Worker `doce-agenda`, conta em `wrangler.jsonc`. Publicar só `deploy-cloud/public` via `npx --yes --package wrangler@4.119.0 wrangler deploy --config wrangler.jsonc` (o build roda sozinho e mantém `_redirects` `/p/:slug /encomenda/ 200`). Guia: `docs/CLOUDFLARE_PUBLICACAO.md`.
- Login do Wrangler foi feito pelo usuário via device flow, credenciais no Windows Credential Manager. Se expirar: `npx --yes --package wrangler@4.119.0 wrangler login --device --browser=false --use-keyring --scopes account:read user:read workers_scripts:write` e o usuário aprova no celular. Nunca pedir senha/token no chat.
- Netlify (`doce-agenda-piloto`) bloqueado por créditos; não contratar nem insistir.
- Testes a escolher pela mudança: `node --test cloud/*.test.mjs test.mjs` (43 passando), `node scripts/build-cloudflare.mjs`, `node scripts/test-cloudflare-routing.mjs` (5/5 no ar). Scripts Playwright antigos (`scripts/test-ux-improvements.mjs`, `test-deploy.mjs`, `review-today.mjs`, `cloud/test-order-link-e2e.mjs`) foram adaptados à nova navegação mas **não executados**.
- Verificação de interface tem sido feita no painel do navegador: build local servido por um servidor estático simples e a demo publicada em 360–1280 px. Logo após publicar, o site pode levar alguns segundos para servir arquivos novos.
- **Lição:** a publicação dos stories quebrou para quem tinha a página antiga em cache (botão novo ausente). Ao adicionar elementos ao `index.html` que o JS usa, buscar de forma opcional.
- Não verificado: conta real logada com as mudanças de hoje (o usuário testou parte no computador), Safari/iPhone, aparelho físico, confeiteiras reais. Cartão "No ar" só visto simulando conta.
- Pendências antigas: duas contas sintéticas `.invalid` com páginas desativadas; aviso de RLS em `public.n8n_chat_histories` (fora do app, não mexer sem mapear).

## 10. Como abrir a próxima sessão

Abrir a pasta `C:/Users/Restore/Documents/doce-agenda` (carrega `AGENTS.md`). Mensagem sugerida:

> Leia AGENTS.md e context.md e me diga em poucas linhas onde paramos.

Manter este arquivo coerente: ao concluir uma etapa, **reescrever** a parte afetada em vez de só acrescentar linhas.
