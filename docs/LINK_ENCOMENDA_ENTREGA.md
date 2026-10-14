# Link de encomenda — entrega e verificação

MVP de 13/10/2026, implementado diretamente, sem subagentes.

## Como usar

1. Entrar no Doce Agenda e abrir Ajustes → Link de encomenda.
2. Informar nome, endereço, produtos e WhatsApp opcional; ativar e salvar.
3. Copiar https://lucast.app/p/<endereço> e compartilhar.
4. Revisar o destaque de Solicitações em Hoje/Pedidos. Aceitar como Orçamento, confirmar após conferir data/valor, editar e aceitar, ou recusar.

Todos os links começam desativados. Não há pagamento, mensagem automática, login de cliente, IA ou acompanhamento público de pedidos.

## Arquitetura

- `pilot_agendas.state` continua sendo o único modelo de pedidos. Solicitações têm status Solicitação, origem link, protocolo, consentimento e histórico. Solicitações pendentes não contam na capacidade.
- `pilot_order_pages`: uma configuração por conta; slug único; nunca acessível diretamente ao público. A configuração também vai no backup JSON.
- `doce-api`: JWT e identificação de usuário preservados; rotas de configuração, revisão e métricas autenticadas. CORS agora inclui lucast.app.
- `doce-public`: função explicitamente anônima, limitada a apresentação da página, disponibilidade e criação de solicitação. Não tem rota de leitura de pedidos.
- Rotas efetivas na função pública: `/functions/v1/doce-public/p/:slug`, `/availability?from=&to=`, `/requests`. Os nomes sugeridos na spec foram adaptados ao modelo Supabase existente. A URL visual é `/p/:slug`, via rewrite do Netlify.
- Mesmo motor de disponibilidade para público, nuvem e demo. Gravação serializada por revisão/RPC; conflito recarrega a disponibilidade no envio e exige nova revisão na aceitação.
- Limites duráveis: 5 envios por IP na janela móvel de uma hora, 50 por página no dia de America/Sao_Paulo. Usa CF-Connecting-IP do proxy, nunca IP do corpo ou X-Forwarded-For do cliente; armazena somente identificador derivado com segredo do servidor. Honeypot descarta sem gravar. Registros de limite são removidos após dois dias.
- Cron diário de retenção: remove nome/contato/endereço/detalhes/bolo/histórico e textos livres de recusadas após 90 dias, inclusive da cópia de restauração no banco. O motivo geral em categoria é preservado; texto livre é removido porque também pode conter dados pessoais. Cópias que a confeiteira já baixou ficam sob responsabilidade dela.

## Política

Publicado `/privacidade/`, com contato doceagenda@lucast.app, finalidade, operadores de infraestrutura, consentimento, direitos e retenção. A separação entre controladora da encomenda e operador segue o [guia da ANPD](https://www.gov.br/anpd/pt-br/assuntos/titular-de-dados). Isso documenta o comportamento do piloto; não constitui uma auditoria jurídica de conformidade.

## Verificações realizadas

- 28 testes Node: validação, fuso, antecedência, virada de mês, limite, pending sem vaga, meta/backup, revisão, autorização, allowlist pública, tamanho de payload e honeypot.
- Teste financeiro anterior repetido: dez cenários/transições passaram com o motor compartilhado.
- Fluxo no Chrome a 360px com contas exclusivamente fictícias e API/banco reais: login, envio da cliente, protocolo/wa.me, duplicata nas duas solicitações, revisão, bloqueio de data lotada, editar/aceitar, recusa, desativar sem apagar pendentes, sexto envio e backup/restauração. Nenhum erro de página.
- Concorrência REAL na mesma revisão: dois aceites para a última vaga → um 200, um 409; retry do perdedor → DAILY_LIMIT. Sem dupla confirmação.
- Segunda conta: slug duplicado retorna mensagem amigável; leitura RLS da primeira agenda retorna vazia; tentativa de editar pedido de outra conta falha; importar backup com slug de outra conta não substitui os dados.
- X-Forwarded-For forjado não contorna o limite de IP. Limite diário de 50 e função de retenção verificados no banco com registros somente de QA.
- Configuração inicial, cópia do link canônico e métricas testadas pela interface. Confirmação sem WhatsApp foi verificada na interface com resposta simulada; a configuração sem número e o retorno vazio do modelo foram verificados separadamente. Essa parte visual não é apresentada como envio real adicional.
- Novas tabelas: RLS ligado e sem grants anon/authenticated. RPC público de gravação não pode ser chamado diretamente por anon. Rotina diária agendada.

## Métricas

`pilot_order_pages.visits` conta carregamentos (não visitantes únicos); `pilot_owner_activity.last_seen_at` registra a última leitura autenticada da agenda. Origem, createdAt, reviewedAt e reviewOutcome permitem solicitações/conta/semana, taxa de aceite, tempo de revisão e participação de pedidos aceitos vindos do link. Interface Ajustes → Ver métricas do link mostra métricas da própria conta.

Para percentagem de contas ativas com link ativado, operação pode consultar no banco, sem divulgar identidades:

```sql
select 100.0 * count(*) filter (where coalesce((p.config->>'active')::boolean,false)) / nullif(count(*),0) as pct
from public.pilot_owner_activity a
join auth.users u on u.id=a.owner_user_id
left join public.pilot_order_pages p using(owner_user_id)
where a.last_seen_at >= now()-interval '7 days' and u.email not like '%@doce-agenda.invalid';
```

## Comandos

```powershell
node scripts/build-cloud-preview.mjs
node --test cloud/*.test.mjs
node scripts/test-payment-stamps.mjs
```

As migrações estão em `supabase/migrations/20261013231617_order_request_links.sql` e `20261013233523_order_link_metrics.sql`. Composições, telas e regras editáveis em `public/encomenda`, `public/app.js`, `cloud/public-api.ts`, `cloud/public-orders.js` e `cloud/order-link-model.js`.

## Limitações e próximo passo do piloto

- Teste com 3–5 confeiteiras REAIS ainda depende das participantes. Não foram inventados resultados de adesão ou produtividade. Liberar de forma gradual, compartilhando o convite e pedindo que ativem o link em Ajustes.
- Emulação Chrome 360px não substitui aparelho físico/Safari nem auditoria integral WCAG. Não foi executado benchmark cronometrado de rede 3G.
- O aviso de segurança do Supabase sobre `public.n8n_chat_histories` sem RLS e grants amplos em tabelas antigas foi identificado fora do escopo. Essas tabelas não foram lidas nem alteradas; o novo serviço público não as consulta. Consultar [remediação do aviso de RLS](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public) em trabalho separado.
- Contas, páginas e pedidos sintéticos usados nas verificações serão removidos após a checagem final da publicação.

## Publicação e encerramento

- Netlify publicado: `6acec39ed845b3c9296d1846`, confirmado ready/current em https://lucast.app.
- Checagem na versão publicada sem interceptar arquivos: rota pública, política, login real da conta sintética, Ajustes e métricas, a 360px, passaram sem erros de página.
- As duas contas de QA tiveram sessões encerradas e páginas desativadas. A remoção definitiva falhou duas vezes na integração Supabase com `Invalid or expired requestState`; o CLI não tinha access token configurado. Permanecem somente os registros fictícios, com links impedidos de receber envios. Nenhum registro de confeiteira real foi removido.
- A limpeza exata está preparada fora do repositório em `C:/Users/Restore/AppData/Local/Temp/doce-order-link-qa-cleanup.sql`, com IDs e verificação do domínio `.invalid`. É uma pendência operacional, não uma limitação do fluxo de encomenda.

Para reproduzir o E2E com nova conta exclusivamente fictícia: `node cloud/test-order-link-setup.mjs`, depois `node cloud/test-order-link-e2e.mjs`. O setup grava credenciais sintéticas somente no diretório temporário, cria uma página de QA e envia uma solicitação de teste. A execução usa a API real e serve o build local no navegador; exige o controlador de login em modo piloto sem confirmação. Não usar esse fluxo com contas de clientes. A remoção deve ser feita ao final.

