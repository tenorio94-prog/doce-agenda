# Doce Agenda — contexto para continuar em outra sessão

Atualizado em **16/10/2026**. Passagem de bastão: estado real, decisões e o que depende de autorização. Confira `git log` e o site antes de agir. Relatos completos de verificação (até 16/10) estão em `docs/historico/contexto-ate-2026-10-16.md`; abra só o trecho do assunto em andamento.

**Manter curto:** ao concluir uma etapa, reescreva a parte afetada aqui (estado + pendências, poucas linhas). Detalhes longos de verificação vão para o commit ou para `docs/historico/`, não para este arquivo.

## 1. Onde paramos

- **Fotografias da demo publicadas (16/10, commit `1ea7fd6`):** 18 fotos independentes geradas e revisadas; 12 no catálogo fictício, bastidores na capa, cinco em reserva editorial fora do site. Originais, mapeamento e relatório em `assets/demo-fotografias/`. Agenda/ficha usam miniaturas coerentes com o catálogo, aliases só na demo; 21 pedidos e pagamentos idênticos à versão anterior. Demos já salvas preservam o catálogo até **Recomeçar demonstração**. `npm run check` passou (64 regras + 11 suítes); jornada local e publicada nas seis larguras 320/360/390/768/1024/1440, DPR 2 em 390, persistência/reset/backup e 39 WebP reais passaram. Capturas em `docs/fotografias-demo/`; comparação: 13 idênticas, sete alterações esperadas. Corrigido botão final da landing em 320 px. Revisão architect sem bloqueios. Nenhum acesso a conta real/Supabase; Safari/aparelho físico não testados. CLS inicial do app permanece uma limitação anterior; diagnóstico isolado de carregamento das fotos deu zero em 360/1440.
- **Tudo publicado até 16/10.** Site na Cloudflare versão `1ec3fbfd-29ac-48e0-8b03-08e7fdbd6fc3` (código `1ea7fd6`); funções Supabase `doce-api` v8 (JWT) e `doce-public` v6, sem alteração nesta missão. Rotas 5/5 no `lucast.app` e no endereço Workers; arquivos JS/CSS publicados comparados com o build local por conteúdo.
- **Última entrega (16/10, feedback de usabilidade, 3 commits `726308e`, `e3f6220`, `1064ca0`):**
  - Textos: ajudas de pagamento curtas ("Deixe R$ 0 se ainda não recebeu nada"), erros em tom de conversa, recusa sem lista de motivos (grava `reasonCode: 'outro'`) com mensagem educada pronta, formulário com 5 campos visíveis (combinado e retirada/entrega em "Mais detalhes"), cópia de segurança dentro de "Avançado".
  - Uma mão: botões de 48 px, letras de apoio 14 px, "Novo" no centro da barra do celular. Cores fixas sempre com texto: âmbar = falta sinal/conferir, verde = conferido/pronto, vermelho-tijolo (`--vn-red`) = dia lotado/"Atrasado" (Confirmado/Em produção/Pronto com horário passado), cinza = fechado; framboesa só na marca.
  - Agenda: lista do dia primeiro, depois "Ver outro dia da semana" (tocar leva à lista), depois **Falta cobrar** (sinal faltando, Pix informado sem conferir, entregue com saldo; só mostra).
  - Aceite: "Aceitar pedido" (Confirmado) / "Ainda vou passar o preço" (Orçamento) / "Recusar". Pedido com telefone ganha "Abrir conversa com o resumo" (wa.me com texto; fora da demo/exemplos). Resumo inclui a chave Pix se o Pix estiver ligado.
  - Verificado: `npm run check` passou; demo local 360/1280 e demo publicada 360 (barra, ordem da Agenda, revisão, rodapé do pedido). Não verificado: conta real, iPhone, abrir o WhatsApp de verdade.
  - Decidido não fazer: aceite único perguntando do sinal (misturaria situação com dinheiro); rosa forte para alerta (é a cor da marca).
- **Direção visual "Comanda" (16/10), aprovada por Lucas, 7 fases publicadas** (relatório em `docs/auditoria-ui-2026-10-16/`, regras em `BRAND.md`): 0 defeitos (cartão cortado a 360 px, WhatsApp na demo, valores quebrados, contraste); 1 cores/fontes (Bricolage + Plus Jakarta, fundo farinha); 2 cartão Comanda + carimbo do dinheiro; 3 ficha + WhatsApp com verbo do momento (sinal sugerido do Pix, padrão 30%); 4 cabeçalhos curtos, contador só do que pede ação, Meu mês com Recebido em destaque; 5 cartão sem interativo aninhado (axe 0 em Agenda/Pedidos), Fredoka/Figtree fora do site; 6 vitrine sem foto em cartão de texto, landing e privacidade na nova paleta. `npm run check` passou até a fase 5; na 6 rodaram vitrine, landing e carimbos. **Pendente:** remover o CSS Glacê morto de `style.css` com comparação de capturas; landing ainda carrega Outfit; ninguém real testou. Scripts da auditoria em `Documents/doce-agenda-auditoria/`.
- Antes: **caixa de entrada** em Pedidos → Novos (Para revisar / Em negociação, origem "Recebido pelo link" mantida após revisão, valor e ocupação da data).
- Antes dela, publicados em 16/10: **nova identidade vnext** (`public/ui/vnext.css`, fontes Outfit e Plus Jakarta Sans, barra lateral a partir de 1100 px), **Vitrine V1** (estilos, fotos no Storage, Worker com `og:` por confeitaria, kit de divulgação), **Clientes** e **Pix escondido** (`?pix=teste`).
- 16/10: único subagente permitido é o `triagem-haiku`, só leitura (commit `4cdebbc`).
- **Não iniciar outra melhoria sem pedido.**

## 2. Pendências (nenhuma autoriza execução)

1. **Pix:** Lucas testa em dois apps de banco: abrir `lucast.app/app/?pix=teste`, cadastrar a chave em Ajustes → Pix, "Cobrar por Pix" num pedido, ler o QR e colar o copia e cola, conferir nome e valor, sem pagar. Só depois tirar o `?pix=teste` (`pixEnabled` em `public/app.js`).
2. **Analytics da Cloudflare:** `lucast.app` carrega `static.cloudflareinsights.com` (injetado pela zona, não pelo código). Contraria a política. Desligar no painel (lucast.app → Web Analytics/RUM) só com Lucas.
3. **Política de privacidade** ainda cita Netlify (atualizar só com aprovação). `www` não redireciona para a raiz.
4. **Aguardam decisão:** engenharia etapa 3 (regras compartilhadas app/servidor); Compras B (quantidade, vínculo com produtos do link, data de produção); limpar o visual Glacê antigo de `style.css` com comparação de capturas; `app.js` grande em arquivo único.
5. **Pedido anunciado por Lucas:** personalizar mais a loja da cliente (ele manda o prompt).
5b. **Notificação de pedido novo pelo link** (do feedback de 16/10): adiada, exige decisão própria. E-mail precisa de serviço de envio e talvez DNS; aviso no celular só funciona no iPhone com o app instalado na tela inicial. Mexe no Supabase.
6. **Nunca verificado:** conta real de confeiteira, Safari/iPhone, aparelho físico, prévia real no WhatsApp. Sugestão em aberto: mostrar o app à amiga confeiteira antes de grandes mudanças.
7. Antigas: duas contas sintéticas `.invalid` com páginas desativadas; aviso de RLS em `public.n8n_chat_histories` (fora do app, não mexer); Netlify antigo pode ser desativado quando Lucas quiser.

## 3. Como trabalhar com Lucas

- Não técnico, usa muito o celular. Português simples, curto, sem jargão. Execução pelo agente principal; único subagente permitido é o `triagem-haiku`, só leitura.
- **Fluxo:** ele aprova → o agente constrói, testa, commit, push na `main`, **publica direto**, confere o endereço publicado, atualiza este arquivo e relata. Não perguntar "posso publicar?" de novo.
- **Pedir autorização antes de:** algo não aprovado; banco/Supabase (schema, funções); dados de contas reais; política de privacidade; DNS/domínio/e-mail; serviço pago; apagar dados; publicar com teste falhando ou sem verificar.
- Em mudanças de interface, ele gosta de uma análise "de designer" honesta antes de construir.

## 4. Produto

App web para confeiteiras autônomas que trabalham por encomenda: pedidos, datas, combinados e pagamentos conferidos. Público no celular, com receio de "app complicado". O **link de encomenda** é visto como principal canal de clientes novos.

- **Abas:** Agenda (hoje, semana com Lotado/Fechado, Próximos dias, chave Dia a dia | Lista da semana), Pedidos (etapas; Novos com caixa de entrada), Clientes, Meu mês (só Confirmado/Entregue; recebido = só conferido; calculado no servidor `/api/resumo-mensal`), Ajustes (Link/Sua vitrine, Dias e limites, Detalhes do bolo, Pix, cópia de segurança).
- **Próximo passo do pedido:** Confirmado → Em produção → Pronto → Entregue, com "Desfazer". Solicitação → "Revisar pedido". As 9 situações gravadas não mudaram.
- **Link/vitrine** (`/p/<slug>`): entra como Solicitação, origem `link`; não ocupa vaga; confirmar revalida; rate limit, honeypot, consentimento, recusadas limpas após 90 dias; nenhum pagamento pelo link. Estilos Ateliê/Doceria/Caseira/Moderna, fotos preparadas no aparelho (sem EXIF, ≤1 MB, bucket `vitrine`), "Também quero" até 5 itens.
- **Clientes:** ficha pelo WhatsApp do pedido (pelo nome só sugerido), "faz tempo" = 90 dias, datas que se repetem, anonimizar.
- **Demo** `/demo/` (só no navegador, chave `doce-agenda.demo.v2`, `cloud/demo-seed.js`): boas-vindas "Experimente em 1 minuto" com 4 tarefas; conta nova vê "Primeiros passos".
- **Landing** `public/landing/`: Web Awesome + Motion, demonstrações em HTML (`setupLinkDemo`, `setupWeekDemo`, `setupMoneyDemo`); botões "Experimentar sem cadastro" abrem `/demo/?de=landing`. Não afirmar o que não foi comprovado (ex.: "feito com confeiteiras").

## 5. Código e endereços

- Pasta: `C:/Users/Restore/Documents/doce-agenda`. Ignorar `Documents/doceagenda` (pasta velha) e `ebooks/projeto_B/web`.
- GitHub: https://github.com/tenorio94-prog/doce-agenda, base `main`.
- Site: https://lucast.app/ (também `www` e `doce-agenda.doce-agenda-local.workers.dev`). `/cadastro/`, `/app/` (exige conta), `/demo/`, `/encomenda/?preview=1`, `/privacidade/`. Contato `doceagenda@lucast.app` (encaminha para o Gmail).
- Frontend HTML/CSS/JS sem framework, esbuild, `@supabase/supabase-js`, Web Awesome, Motion. Visual atual em `public/ui/vnext.css` (escopo `body.vnext`); Glacê antigo ainda em `style.css` por baixo. Laboratório visual de referência: worktree `C:/Users/Restore/.codex/worktrees/laboratorio-visual/doce-agenda-stitch` (`lab/HANDOFF.md`); não alterar sem pedido.
- Regras em `cloud/` (`state-engine.js`, `monthly-summary.js`, `order-link-model.js`, `public-orders.js`, `clients.js`, `pix-code.js`, `vitrine-*.js`). `public/browser-store.js` é gerado pelo build. Mapa: `docs/ARQUITETURA.md`.
- Supabase projeto `khvhnbopdluthpcduhqm`: estado em `pilot_agendas.state` (JSONB) com revisão otimista; tabelas do link `pilot_order_pages`, `pilot_public_submissions`, `pilot_owner_activity`. Cadastro sem confirmação de e-mail; recuperação por e-mail não ativa.

## 6. Publicar e testar

- **Site:** `npx --yes --package wrangler@4.119.0 wrangler deploy --config wrangler.jsonc` (build `scripts/build-cloudflare.mjs` roda sozinho; publica só `deploy-cloud/public`). Guia: `docs/CLOUDFLARE_PUBLICACAO.md`. Logo após publicar, arquivos novos podem levar segundos.
- **Funções Supabase** (só com autorização): `node scripts/build-edge-api.mjs`, depois `npx supabase functions deploy doce-api --project-ref khvhnbopdluthpcduhqm --use-api --workdir deploy-supabase` (JWT) e `doce-public` com `--no-verify-jwt`. Publicar funções **antes** do site quando o site depende de rota nova. Conferir 401 sem login e CORS 204.
- **Logins** (feitos por Lucas, nunca pedir senha/token no chat): Wrangler `npx --yes --package wrangler@4.119.0 wrangler login --device --browser=false --use-keyring --scopes account:read user:read workers_scripts:write`; Supabase `npx supabase login`.
- **Testes:** `npm run check` (61 regras, build, 11 suítes de tela); `node scripts/test-cloudflare-routing.mjs` (5/5 no ar); `scripts/test-worker.mjs` fica fora do check. Provar que nada mudou: `npm run screens -- <pasta>` antes/depois + `node scripts/capture-screens.mjs --compare`. Scripts sem manutenção: `test-ux-improvements.mjs`, `test-deploy.mjs`, `review-today.mjs`, `test-account-ui.mjs`, `cloud/test-order-link-e2e.mjs`.
- **Lições:** ao adicionar ao `index.html` elementos que o JS usa, buscar de forma opcional (cache antigo quebrou os stories). Campos Web Awesome validam no próximo render (`updateValidity()` após `updateComplete`).
- **DNS:** Cloudflare (plano grátis), registro na Name.com. Registros `*` A, MX `mx3..mx8.name.com` e TXT SPF são do e-mail `@lucast.app`: **não apagar**.
