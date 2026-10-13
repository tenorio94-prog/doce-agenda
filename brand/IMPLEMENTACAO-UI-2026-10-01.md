# Doce Agenda — refinamento da interface

Implementação da revisão `REVISAO-UI-KOWALSKI-21ST.md`, orientada pela skill Emil Design Engineering. O catálogo 21st.dev foi usado como referência de padrões; não foram importados componentes ou assets de terceiros.

| Antes | Depois | Motivo |
| --- | --- | --- |
| Quatro indicadores e aviso extenso antes da agenda | Hoje compacto, agenda e ações primeiro; financeiro abaixo | Priorizar a rotina operacional |
| Todos os campos abertos no cadastro | Cinco campos essenciais e seção opcional expansível | Simplificar o primeiro registro, mantendo o combinado |
| Navegação móvel acima do conteúdo | Barra inferior com Hoje, Pedidos, Semana e Novo | Facilitar ações frequentes |
| Saldo dependia exclusivamente da situação Confirmado | Confirmado, Em produção, Pronto e Entregue mantêm o saldo | A entrega não comprova recebimento |
| Saldo parcial sem identificação | Nota com quantidade de pedidos sem conferência | Explicitar os limites do número mostrado |
| Histórico sempre expandido | Histórico expansível; valores com números tabulares | Dar destaque ao combinado e à conferência |

## Regras preservadas e explicitadas

- Orçamento, Aguardando confirmação e Cancelado ficam fora do financeiro dos compromissos confirmados.
- Sem nenhum registro Conferido, o saldo permanece desconhecido. Um registro Conferido de R$ 0,00 permite mostrar o saldo integral.
- Informado não é recebido conferido. Pagamentos excedentes aparecem no detalhe e não descontam o saldo de outros pedidos.
- O exemplo fictício permanece identificado e participa do resumo enquanto existir. A orientação inicial desaparece após o primeiro pedido próprio.
- Campos opcionais preenchidos são revelados ao editar; nenhum dado ou chave de armazenamento foi apagado ou migrado.
- A versão hospedada guarda dados no navegador, sem sincronização entre aparelhos, com backup manual.

## Arquivos e verificação

Fonte em `public/index.html`, `public/style.css` e `public/app.js`. O staging hospedável é preparado por `node scripts/build-deploy.mjs` e validado por `node scripts/test-deploy.mjs`; o serviço local é validado por `node --test test.mjs`.

As capturas de teste usam dados fictícios em contextos isolados. O layout deve ser validado com confeiteiras; a emulação não substitui uso em aparelho físico nem auditoria completa de acessibilidade.

## Publicação verificada

- Produção: https://doce-agenda-piloto.netlify.app
- Deploy: `6abe6b68c488ad3a0903b99d`, publicado em 2026-10-01.
- `node --test test.mjs`: passou.
- `node scripts/test-deploy.mjs`: passou no staging local e novamente na URL de produção, em contextos isolados.
- Cobertura: cadastro, persistência, pagamentos Informado/Conferido, idempotência, saldo nas etapas seguintes, conferência zero, desconhecidos, excedentes, cancelados, edição dos campos opcionais, backup, agenda semanal, isolamento entre navegadores, fontes locais, movimento reduzido e largura móvel de 320/390 px.
- Capturas finais mobile, desktop e formulário em `deploy-demo-check/`, examinadas pelo agente principal. Nenhuma requisição de dados da aplicação à rede ou erro de execução foi identificado nesses testes.
