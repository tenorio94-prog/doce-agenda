# Publicação na Cloudflare — 14/10/2026

## Estado

> Atualização de 15/10/2026: `lucast.app` e `www.lucast.app` já são servidos por este Worker, o código vive na `main` e as versões publicadas ficam registradas em `context.md`. Os itens abaixo são o registro da primeira publicação; os comandos de reprodução continuam valendo (rodar na raiz do repositório).

- App: https://doce-agenda.doce-agenda-local.workers.dev/
- Worker: `doce-agenda`, versão `7034e89d-ecef-4b9d-93f5-439ba3c27dc1`, tráfego 100% nessa versão. A primeira publicação foi `b72bc580-32fe-4a17-8448-1cce8916768d`; a segunda corrigiu somente o destino do proxy público, mantendo os arquivos do app idênticos.
- Serviço: Workers Static Assets, plano gratuito, sem banco ou funções de negócio novos na Cloudflare. Login e API permanecem no Supabase.
- `lucast.app` ainda aponta para o Netlify. Conectar o domínio à Cloudflare é uma etapa separada: conferir DNS e preservar todos os registros do e-mail antes de qualquer mudança. Não foi feita alteração de DNS nesta publicação.
- Links de encomenda copiados no app continuam usando o endereço canônico `https://lucast.app/p/<slug>`. A rota equivalente `/p/<slug>` também funciona na Cloudflare.
- Código está na branch `redesign-glace-carimbo`, PR #1. Push ao GitHub ainda **não** publica automaticamente; a publicação atual é via Wrangler.

## Reproduzir a publicação

Na pasta `web`:

```powershell
node scripts/build-cloudflare.mjs
npx --yes --package wrangler@4.119.0 wrangler deploy --config wrangler.jsonc --dry-run
npx --yes --package wrangler@4.119.0 wrangler deploy --config wrangler.jsonc
npx --yes --package wrangler@4.119.0 wrangler deployments status --config wrangler.jsonc
```

`wrangler.jsonc` fixa a conta, o nome do Worker e a pasta de arquivos públicos. Não contém segredo. Nunca apontar assets para a raiz do repositório. A publicação inclui somente `deploy-cloud/public`; `.env`, dados, credenciais e código privado do servidor não entram no pacote.

A regra `_redirects` `/p/:slug /encomenda/ 200` é reconhecida como proxy interno pela Cloudflare. O destino precisa ser o diretório: `/encomenda/index.html` dispara a canonicalização de HTML, redireciona a URL e perde o slug. `scripts/build-cloudflare.mjs` adapta apenas o pacote Cloudflare; o build Netlify permanece separado. O Wrangler executa esse build automaticamente antes de cada deploy. Demais rotas são diretórios reais, com barra final automática. Não há fallback que mostre a landing para rotas inexistentes.

## Código da vitrine (desde 16/10/2026)

O Worker deixou de ser só arquivos: `worker/index.js` roda **apenas** em `/p/*` e `/fotos/*` (`run_worker_first` em `wrangler.jsonc`); o resto continua estático.

- `/p/<slug>`: busca a vitrine na `doce-public`, troca título e etiquetas `og:` (nome, frase e imagem 1200×630 da confeitaria, para a prévia do WhatsApp) e embute os dados na página (`#vitrine-data`). Robôs de prévia chamam a `doce-public` com `?visita=0` e não contam visita. Qualquer falha (Supabase fora, 404, tempo de 3 s) entrega a página de sempre. O `_redirects` não vale para rotas atendidas pelo Worker; o Worker busca `/encomenda/` explicitamente.
- `/fotos/<pasta>/<uuid>.webp|jpg`: busca no Storage público `vitrine` do Supabase e guarda em cache por um ano (nomes nunca se repetem). Caminho fora do padrão dá 404 sem consultar nada.
- Teste local antes de publicar: `node scripts/test-worker.mjs` (wrangler dev com Supabase simulado; usa `--compatibility-date 2026-08-08` porque o runtime local da versão fixada não aceita a data de produção).
- Depois de publicar: `node scripts/test-cloudflare-routing.mjs` no endereço real.

## Autenticação

Autorização por dispositivo concluída pelo próprio usuário no celular. Permissões solicitadas: leitura de conta/usuário e escrita de scripts Workers. Credenciais criptografadas pelo Wrangler, com chave no Windows Credential Manager; não são versionadas. A pasta `.wrangler/` está no `.gitignore`.

Para renovar a autorização, somente quando necessário:

```powershell
npx --yes --package wrangler@4.119.0 wrangler login --device --browser=false --use-keyring --scopes account:read user:read workers_scripts:write
```

Não ampliar permissões para bancos, e-mail, filas ou outros produtos apenas para remover os avisos genéricos do Wrangler: a publicação de arquivos estáticos já funciona com os escopos escolhidos.

## Servidor e privacidade

O CORS de `doce-api`/`doce-public` inclui `https://doce-agenda.doce-agenda-local.workers.dev` de forma exata. Outro hostname arbitrário em `workers.dev` continua bloqueado. Nenhuma política de acesso a dados foi enfraquecida. A API autenticada mantém JWT obrigatório; a API pública mantém as rotas e proteções existentes.

A política de privacidade publicada cita Cloudflare e Netlify como provedores das versões do site e o processamento técnico necessário à entrega das páginas. Contato: `doceagenda@lucast.app`.

## Verificação

- Deploy ativo confirmado pela CLI e HTTPS com validação normal respondendo 200.
- `node scripts/test-cloudflare-routing.mjs` verifica a entrega de `/p/<slug>` sem redirecionamento/perda do slug, além de app, cadastro, demo e política. O slug desse teste é fictício; nenhum envio ou leitura de pedido é feito.
- Testes de CORS/autorização: 12 passaram, incluindo rejeição de outra origem Workers.
- Teste integrado no site publicado: cálculos esperados, isolamento entre duas contas fictícias, leitura anônima negada, backup/restauração e interface autenticada em 360/1440 px; nenhum erro JavaScript. Dados sintéticos restaurados.
- Após a correção do proxy, passaram os cinco testes HTTP e a verificação no navegador de landing mobile, privacidade/contato, demonstração, Meu mês vazio, detalhes de pedido, redirecionamento anônimo e página pública desativada consultando a API real. Nenhum erro JavaScript ou rolagem horizontal. Não houve alteração no corpo do app entre as duas publicações.
- O teste integrado aceita `DOCE_TEST_ORIGIN` para verificar a publicação real:

```powershell
$env:DOCE_TEST_ORIGIN = 'https://doce-agenda.doce-agenda-local.workers.dev'
# DOCE_QA_SESSION e DOCE_QA_SECOND apontam para sessões fictícias locais privadas.
Remove-Item Env:DOCE_MONTHLY_ASSETS -ErrorAction SilentlyContinue
node cloud/test-monthly-live.mjs
```

Não criar contas de confeiteiras reais para testes nem versionar os arquivos de sessões fictícias.
