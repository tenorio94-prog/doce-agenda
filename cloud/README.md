# Cloud — Doce Agenda

Backend Supabase e frontend com login publicados. Versão atual, incluindo Meu mês: https://doce-agenda.doce-agenda-local.workers.dev/ . Publicação e verificações em [CLOUDFLARE_PUBLICACAO.md](../docs/CLOUDFLARE_PUBLICACAO.md). O domínio `lucast.app` ainda aponta para a versão anterior no Netlify.

`edge-entry.ts` serve `doce-api.ts`, com dependências `state-engine.js`, `order-link-model.js` e `monthly-summary.js`; incluir todas no deploy. JWT obrigatório. API recebe POST `{path,method,body,expectedRevision}` com bearer da sessão e apikey pública; body é objeto. `X-Agenda-Revision` informa revisão. Escritas exigem revisão atual; conflito bloqueia novas gravações até leitura completa de `/api/state`. Nenhuma credencial admin no frontend.

`auth-controller.js` usa SDK fixo com PKCE. `app-bootstrap.js` verifica sessão antes de carregar o app; conta sem sessão vai para entrada. `public/account/config.js` contém apenas configuração pública. O piloto usa e-mail/senha com cadastro aberto e sem confirmação por e-mail, conforme autorizado. SMTP/recuperação por e-mail não estão ativos (`emailDeliveryReady: false`). Google não é necessário ao fluxo do piloto.

Build Netlify: `node scripts/build-cloud-preview.mjs`; Cloudflare: `node scripts/build-cloudflare.mjs`, na pasta `web`; saída `deploy-cloud/public`. Esses builds não publicam sozinhos. Landing mantém demonstração `/demo/`; `/cadastro/`, `/app/` e `/agenda.html` usam cloud. CORS aceita as origens exatas de `lucast.app`, `www.lucast.app`, produção Netlify, o endereço publicado da Cloudflare e localhost/127.0.0.1:4173; novas prévias autenticadas precisam de origem exata adicional, sem wildcard.

Testes: `node --test cloud/state-engine.test.mjs cloud/app-bootstrap.test.mjs`; `node --experimental-strip-types --test cloud/doce-api.test.mjs`; `node scripts/test-account-ui.mjs`. Teste real requer fixtures temporários via env; ver documento de estado. Não versionar credenciais.

Migração aplicada: `supabase/migrations/20261008013322_open_registration.sql`; não reaplicar com outro nome. Uma agenda JSON por conta, limite 5 MiB, sem equipes/Realtime. Backup JSON manual disponível. Importação preserva atomicamente um ponto anterior em `pilot_agenda_restore_points`, sem acesso público. Recuperar esse ponto exige ação administrativa com autorização da participante e conferência do proprietário/revisão; ainda não há botão para isso. Não há backup externo agendado nesta versão.
