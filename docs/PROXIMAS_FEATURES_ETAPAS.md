# Entregas por etapa — 13/10/2026

Concluir, testar e publicar cada etapa; pedir autorização antes da próxima.

1. **Meu mês**: resumo autenticado no servidor, navegação, sete definições, testes e publicação. Sem tabelas novas. Confirmado e Entregue são situações existentes e serão as únicas incluídas, conforme a definição da spec; Em produção e Pronto ficam fora nesta versão.
2. **Produção A**: quantidade opcional (padrão 1), lista por dia/horário, Feito persistente, cópia da semana, vínculo opcional com uma única lista de produtos por conta. Só iniciar após aprovação da etapa 1.
3. **Pix**: chave privada por conta, BR Code/CRC16, QR, 30% sugerido/editável/configurável; política e aviso no backup. Exige validação humana em dois aplicativos de banco antes de liberar. Sem provedor nem confirmação automática. Só iniciar após autorização.
4. **Clientes**: fichas privadas, identidade por telefone, sugestões sem vínculo automático por nome, histórico, lembretes e exclusão/anonimização. Atualizar política antes de liberar; a revisão jurídica sugerida depende de profissional indicado pelo usuário. Só iniciar após autorização.

**Subetapa 2B — Compras**: aguardar validação da produção A em uso e autorização específica, conforme a sugestão da spec. Receitas simples, soma por ingrediente/unidade, avisos de receitas ausentes, Comprado por semana e backup. Não bloqueia Pix/Clientes se o usuário optar por adiar Compras.

## Decisões e validação da etapa 1

- Reutilizar `pilot_agendas.state`; o servidor autentica a sessão, seleciona somente `owner_user_id` verificado e devolve o resumo pronto pela rota lógica `GET /api/resumo-mensal?mes=AAAA-MM` no envelope já usado pela função `doce-api`. Nenhuma chave administrativa é enviada ao navegador.
- Uma passagem pelos pedidos e uma pelos recebimentos; sem filtrar todos os pagamentos para cada pedido e sem clonar o estado completo para gerar o resumo.
- Converter os valores legados em reais para centavos uma vez; somar/subtrair somente inteiros. Nenhum valor antigo será regravado.
- `dueAt` legado sem offset representa horário de São Paulo. Datas com offset são convertidas ao fuso. Antecedência usa dias de calendário entre criação em São Paulo e entrega; registros criados depois da entrega podem ter prazo negativo, preservando a definição.
- Empates dos dias seguem segunda a domingo; produtos empatados seguem ordem alfabética. Exemplos fictícios não entram no resumo da conta.
- Campo opcional `totalKnown` diferencia novos pedidos com valor vazio de um zero informado. Backups preservam o campo; backups antigos continuam válidos. Zeros históricos são mantidos como valores informados porque não há evidência para reclassificá-los. Solicitações públicas sem preço recebem `totalKnown: false`.
- Testar sete definições, limite de mês/fuso, isolamento de contas, meses inválidos/futuros, ausência de dados, excesso recebido, backup/legado, troca rápida de mês, falha/repetição e layout 360 px. Verificar API e tela publicadas antes de encerrar a etapa.
- Riscos principais: mês pelo fuso do aparelho, pagamentos Informado somados indevidamente, zeros históricos reclassificados, resposta antiga sobrescrevendo mês selecionado, navegação estreita. Cada risco terá verificação direcionada.
- LGPD: não adiciona dados pessoais nem novo uso público; política atual permanece aplicável.
