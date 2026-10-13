# Cloud — Doce Agenda

Backend Supabase publicado. Frontend somente em prévia; login público pendente. Estado e comandos em [CADASTRO_ABERTO.md](../../CADASTRO_ABERTO.md); ativação em [ATIVAR_LOGIN_PILOTO.md](../../ATIVAR_LOGIN_PILOTO.md).

`edge-entry.ts` serve `doce-api.ts` e `state-engine.js`. Deploy inclui os três arquivos, JWT obrigatório. API recebe POST `{path,method,body,expectedRevision}` com bearer da sessão e apikey pública; body é objeto. `X-Agenda-Revision` informa revisão. Escritas exigem revisão atual; conflito bloqueia novas gravações até leitura completa de `/api/state`. Nenhuma credencial admin no frontend.

`auth-controller.js` usa SDK fixo com PKCE. `app-bootstrap.js` verifica sessão antes de carregar o app; conta sem sessão vai para entrada. `public/account/config.js` contém apenas URL/chave pública e flag `emailReady`; só ativar e-mail após SMTP/entrega validados. Google é detectado pelas configurações reais do Auth.

Build: `node scripts/build-cloud-preview.mjs`, na pasta `web`; saída `deploy-cloud/public`. Não publica. Landing mantém demonstração `/demo/`; `/cadastro/`, `/app/` e `/agenda.html` usam cloud. Atualizar CTAs/FAQ quando login estiver ativo. CORS aceita produção Netlify e localhost/127.0.0.1:4173; prévias autenticadas precisam de origem exata adicional, sem wildcard.

Testes: `node --test cloud/state-engine.test.mjs cloud/app-bootstrap.test.mjs`; `node --experimental-strip-types --test cloud/doce-api.test.mjs`; `node scripts/test-account-ui.mjs`. Teste real requer fixtures temporários via env; ver documento de estado. Não versionar credenciais.

Migração aplicada: `supabase/migrations/20261008013322_open_registration.sql`; não reaplicar com outro nome. Uma agenda JSON por conta, limite 5 MiB, sem equipes/Realtime. Backup JSON manual disponível. Importação preserva atomicamente um ponto anterior em `pilot_agenda_restore_points`, sem acesso público. Recuperar esse ponto exige ação administrativa com autorização da participante e conferência do proprietário/revisão; ainda não há botão para isso. Não há backup externo agendado nesta versão.
