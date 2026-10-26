# Monitor do site (melhoria O2)

Objetivo: saber em minutos se o site ou o servidor caírem, e manter o Supabase gratuito em uso para ele não pausar (o plano gratuito pausa projetos com pouca atividade em 7 dias; já aconteceu em 26/10/2026).

Nada disso muda o código. Criar a conta no serviço é um passo externo: **só com Lucas acompanhando e aprovando** (AGENTS.md).

## Serviço sugerido

**UptimeRobot, plano gratuito** ([preços](https://uptimerobot.com/pricing/), conferido em 26/10/2026): 50 monitores, checagem a cada 5 minutos, monitor de palavra-chave. Alternativa: **OpenStatus** gratuito, com 1 monitor a cada 10 minutos ([preços](https://www.openstatus.dev/pricing)); serve só para o monitor 2.

Ao criar a conta, conferir se o aviso por e-mail está incluído no plano gratuito.

## Os dois monitores

| # | O que vigia | Tipo | Endereço | Falha quando |
| --- | --- | --- | --- | --- |
| 1 | Site na Cloudflare | HTTP(s) | `https://lucast.app/` | não responde 200 |
| 2 | Servidor e banco (Supabase) | Palavra-chave | `https://khvhnbopdluthpcduhqm.supabase.co/functions/v1/doce-public/p/<endereço-da-loja>?visita=0` | a palavra `"active"` não aparece |

- `<endereço-da-loja>` é o endereço do link de uma loja que exista (a de Lucas serve). A resposta é a mesma vitrine pública que qualquer cliente vê; nenhum dado pessoal, senha ou chave passa pelo monitor.
- `?visita=0` faz a checagem não contar como visita nas métricas do link.
- A resposta tem `"active"` com o link ativo ou pausado; ela some quando o servidor ou o banco falham.
- **Por que não vigiar `lucast.app/p/...`:** se o Supabase cair, o código da Cloudflare entrega a página sem os dados com 200, e o monitor não perceberia.
- A cada checagem o servidor consulta o banco. **A conferir no primeiro dia:** o painel do Supabase deve mostrar essas requisições como uso do projeto.

## Teste de queda (uma vez)

1. Criar um terceiro monitor temporário igual ao 2, com um endereço de loja que não existe (a resposta é 404).
2. Esperar o e-mail de aviso (até 10 minutos).
3. Apagar o monitor temporário e registrar no `context.md` que o aviso chegou.
