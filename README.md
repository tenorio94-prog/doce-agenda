# Doce Agenda

App web para confeiteiras autônomas que trabalham por encomenda: pedidos, datas, combinados e pagamentos conferidos, pensado para o celular.

- Site publicado: https://doce-agenda.doce-agenda-local.workers.dev/ (landing, `/cadastro/`, `/app/`, `/demo/`, link de encomenda em `/p/<endereço>`).
- Estado atual, decisões e pendências: `context.md`. Regras para quem trabalha no código: `AGENTS.md`.

## Onde fica cada coisa

- `public/` — telas: app (`index.html`, `app.js`, `style.css`, `tokens.css`), landing, cadastro/login (`account/`), link de encomenda (`encomenda/`) e privacidade.
- `cloud/` — regras do app (`state-engine.js`, `monthly-summary.js`, `public-orders.js`…), funções do Supabase (`doce-api.ts`, `public-api.ts`), demonstração (`demo-seed.js`) e testes.
- `supabase/migrations/` — estrutura do banco.
- `scripts/` — montagem do site e testes de verificação.
- `docs/` — guias vigentes (publicação, entregas recentes, próximas features); `docs/historico/` guarda os antigos.
- `brand/`, `design/`, `video-launch/` — material de marca, prints de revisão e vídeo. Não entram no site.

## Testar e publicar

```
node --test cloud/*.test.mjs
node scripts/build-cloudflare.mjs
npx --yes --package wrangler@4.119.0 wrangler deploy --config wrangler.jsonc
node scripts/test-cloudflare-routing.mjs
```

O build gera `deploy-cloud/public`, a única pasta publicada. Detalhes em `docs/CLOUDFLARE_PUBLICACAO.md`.
