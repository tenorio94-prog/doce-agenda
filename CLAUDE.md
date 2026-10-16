@AGENTS.md

## Só para o Claude Code

- As regras acima valem integralmente; este arquivo só acrescenta o que é específico desta ferramenta.
- Subagente permitido: só o `triagem-haiku` (somente leitura), para exploração, pesquisa e resumo de saídas longas. Todo o resto fica no principal.
- Verificação visual: monte com `npm run build`, sirva `deploy-cloud/public` e abra no navegador embutido do app (painel do navegador), em 360 px e 1280 px. Para provar que nada mudou, use `npm run screens` antes e depois.
- Documentação de bibliotecas: consulte a oficial (Web Awesome, Motion, Supabase, Cloudflare) antes de supor uma API; a versão instalada está em `package.json`.
- Memória pessoal do Claude não substitui `context.md`: decisões do projeto vão para lá.
