# Contrato de armazenamento — Doce Agenda web

Levantamento operacional para orientar uma integração Supabase + Netlify sem interromper o piloto. Estado observado nos arquivos atuais; nenhum dado de `data/` foi consultado.

## Arquiteturas e fronteira

- **Execução local (`server.mjs`)**: servidor HTTP Node, limitado a `localhost`/`127.0.0.1` e origem correspondente. Armazena o estado inteiro em `data/state.json`, grava via arquivo temporário + rename e serializa mutações numa fila em memória. Não tem autenticação. Os testes instanciam o servidor em diretório temporário.
- **Piloto estático (`scripts/build-deploy.mjs`)**: copia `public/` para `deploy-demo/public`, injeta `browser-store.js` antes de `data-client.js` e `app.js`; o cliente `window.DoceApi.fetch` seleciona o armazenamento na inicialização, sem substituir chamadas de rede no código gerado. O adaptador simula as mesmas rotas usando uma chave única de `localStorage` (`doce-agenda.pilot.v1`); `navigator.locks` serializa transações quando disponível. Netlify hospeda os arquivos estáticos; não há serviço de dados remoto.
- **Ponto de compatibilidade**: `app.js` assume respostas `fetch` padrão (`ok`, `status`, `json()`, `blob()`), URLs sob `/api`, JSON de erro `{error, code?}` e o objeto agregado de estado abaixo. Uma migração pouco invasiva pode preservar essa interface e trocar o adaptador carregado pelo build estático. O servidor local pode continuar independente.

## Contrato de estado e rotas

Estado agregado v1: `{version, orders[], payments[], availability, orderTemplate}`. `GET /api/state` e `GET /api/export` retornam esse objeto; export tem disposição de anexo no servidor. `GET /api/availability` retorna apenas disponibilidade; `GET /api/order-template`, apenas o modelo.

| Rota | Entrada | Saída/efeito |
|---|---|---|
| `POST /api/orders` | pedido; opcional `cake` e `capacityOverride` | 201, pedido com UUID, timestamps e `history` inicial |
| `PUT /api/orders/:id` | campos parciais mesclados ao pedido | 200, pedido; registra diferenças no histórico |
| `POST /api/orders/:id/payments` | `{amount,status:'Informado'|'Conferido',note?}` | 200, pagamento com `orderId`, UUID e `createdAt`; atualiza pedido/histórico |
| `PUT /api/payments/:id` | `{status:'Conferido'}` | 200, confirma uma vez, acrescenta `confirmedAt` e histórico |
| `PUT /api/availability` | `{closedWeekdays,minimumNoticeHours,dailyOrderLimit,dateOverrides}` | 200, configuração normalizada |
| `PUT /api/order-template` | `{version,fields[]}` (seis chaves de bolo) | 200, configuração; versão aumenta se campos mudarem |
| `POST /api/import` | backup v1 completo | valida vínculos e limites, substitui o estado; 200 `{ok,orders,payments}` |

Pedido: `client`, `product`, `details`, `dueAt` (`YYYY-MM-DDTHH:mm` local), `mode` (`Retirada`/`Entrega`), `location`, `total`, `status`, `nextAction`, `nextAt`, `pendingChange`, `contact`, opcional `cake:{templateVersion,values,labels}`; inclui `id`, `createdAt`, `updatedAt`, `history[]` após salvar. `cake` preserva rótulos e versão do modelo no momento do pedido. Pagamentos pertencem a um pedido; estados válidos são `Informado` e `Conferido`.

Regras centrais hoje no servidor e duplicadas no adaptador: valores monetários não negativos até 1.000.000; estados de pedido enumerados; pedidos confirmados/em produção/prontos/entregues exigem data; disponibilidade impede fechamento, antecedência curta e excesso do limite diário, salvo exceção com motivo de 4–300 caracteres. Exemplos (`isSample`/`isDemo`/`sample`) não contam na capacidade. Erros de capacidade retornam 409 com `DATE_CLOSED`, `NOTICE` ou `DAILY_LIMIT`; demais validações usam 400, IDs inexistentes 404.

## Adaptação Supabase + Netlify

1. Manter no cliente o contrato de `fetch` para reduzir alterações no app, mas criar um modo de conta separado com funções/API autenticada, mantendo o piloto local explicitamente disponível. Netlify estático não pode persistir estado em disco. Usar sessão Supabase do usuário e políticas RLS por proprietário em pedidos, pagamentos, disponibilidade e modelo; nunca colocar `service_role` no bundle. URL e chave publishable podem estar no cliente; elas não substituem as políticas RLS.
2. Trocar o estado agregado local por leitura/escrita remota. O app espera `/api/state` coerente e após mutações chama novamente `loadState`; uma função agregadora evita leituras inconsistentes entre várias tabelas. Manter formato das datas, campos opcionais e erros/códigos, ou ajustar `apiRequest` de modo uniforme.
3. Implementar validação também no limite confiável do servidor/função e no banco. A validação em JS do navegador serve UX, não controle de acesso. Capacidade precisa ser transacional no banco/função: checar limite e inserir sob concorrência; fila local e Web Locks não coordenam usuários/dispositivos. Confirmar pagamento precisa ser idempotente. Histórico deve continuar atômico com cada mutação.
4. Planejar migração opcional de `localStorage` para conta: importar backup v1 validado como transação, definir comportamento para dados do exemplo fictício, evitar duplicação em repetição e conservar export/restauração. Piloto atual tem isolamento por navegador e não contém sincronização; mudança de UX precisa deixar claro login, sincronização e recuperação.
5. Preservar caminho piloto sem conta enquanto a sessão ou backend ainda não estiver pronto, se essa for a estratégia de rollout: adaptador local e remoto selecionáveis no build/configuração, sem enviar estado ao servidor silenciosamente. Não substituir o artefato de produção durante configuração não verificada.

Riscos de contrato: o backup substitui o estado inteiro; `browser-store.js` guarda uma cópia pré-importação na mesma origem, sem persistência fora do navegador. `localStorage` pode ser removido, bloqueado ou exceder cota. O mock e `server.mjs` já divergem em detalhes (limites de importação, erro genérico, cabeçalhos e serialização), então não presumir equivalência perfeita. `GET /api/state` expõe todo o estado à origem local; no remoto, a resposta deve conter somente dados do usuário autenticado. Datas de pedido são horário de parede local de São Paulo, enquanto timestamps são ISO UTC.

## Cobertura existente e testes a acrescentar

- `test.mjs`: rotas de pedido/pagamento, validação, histórico/idempotência de confirmação, persistência após reiniciar servidor e export; disponibilidade, exceções/capacidade/antecedência, template de bolo, validação e substituição de backup. Usa `mkdtemp` e remove seu diretório temporário.
- `scripts/test-deploy.mjs`: fluxo no Chrome contra artefato local, persistência após reload, pagamentos/saldo, capacidade, disponibilidade, template, restauração e cópia pré-importação; verifica isolamento entre contextos e zero requisições `/api/` à rede. O teste é explicitamente para armazenamento local. Gera capturas sob `deploy-demo-check/`.
- Para Supabase: acrescentar testes de autorização/RLS (usuário A nunca lê nem altera dados de B), sessão expirada/sem sessão, deploy de função e configuração ausente, criação+histórico atômicos, confirmação duplicada, dois pedidos concorrentes no último slot, import v1 transacional/idempotente, export/restauração e reconexão/reload em dois dispositivos. Separar testes remotos de dados reais e usar projeto/contas de teste isolados; os testes atuais não validam Supabase nem autenticação.

## Fontes examinadas

`server.mjs`, `public/browser-store.js`, `public/app.js`, `scripts/build-deploy.mjs`, `test.mjs`, `scripts/test-deploy.mjs`, `package.json`, `README.md` e `.gitignore`. Não foram lidos arquivos de credenciais nem `data/state.json`; nenhum código de aplicação foi alterado.
