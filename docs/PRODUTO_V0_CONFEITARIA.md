# Produto v0 — Kit de encomendas pelo celular

Data: 30/09/2026. Estado: desenho inicial para discussão e iteração, não produto pronto para venda.

O usuário autorizou desenhar o produto antes de contatar a amiga. A ordem anterior de observar usuárias antes de produzir não impede este esboço. Não houve publicação, contato com terceiros, contratação, implementação de aplicativo ou produção de planilha.

## Proposta

**Um kit para transformar o pedido recebido pelo WhatsApp em uma encomenda registrada, confirmada e fácil de acompanhar até a entrega.**

Nome de trabalho: Kit de encomendas pelo celular. Não é marca definitiva. A promessa inicial descreve organização, sem assegurar ausência de erros, aumento de vendas ou resultado financeiro.

Compradora inicial a investigar: confeiteira que já vende bolos e doces personalizados por encomenda, trabalha sozinha ou com ajuda pequena e organiza pedidos em conversas/caderno. Iniciantes sem pedidos e lojas com uma operação/sistema estabelecido não são a prioridade do primeiro desenho.

## Produto principal e entrega

O produto principal é um **controle de encomendas com um fluxo de uso**, apoiado por modelos de mensagem. Um e-book não é necessário nessa primeira versão.

Hipótese de formato: arquivo duplicável de Google Sheets, organizado para celular, acompanhado de mensagens copiáveis e guia de início curto. Esta escolha é provisória: validar o aparelho, familiaridade e rotina antes de construir. A base pode mudar se a amiga demonstrar uma alternativa mais simples. Não exigir Notion, assinatura de IA ou uso simultâneo de vários sistemas.

| Componente | O que entrega | Por que existe |
|---|---|---|
| Controle único de encomendas | Um registro por pedido, valores, data/horário, situação e próxima ação | Evitar depender da memória ou procurar o combinado em toda a conversa |
| Visão da semana | Lista dos pedidos do mesmo controle, ordenada por entrega/retirada | Consultar o que vem a seguir sem recadastrar |
| Mensagens copiáveis | Coleta inicial, resumo para confirmação, alteração, lembrete de saldo/retirada e encerramento | Reduzir reescrita e perguntas esquecidas |
| Guia e exemplos | Instruções curtas, três encomendas fictícias e gravação de tela sem rosto em eventual versão comercial | Ajudar a começar com um pedido real, em vez de ler um manual extenso |

O resumo da cliente deve usar os mesmos dados do pedido. Não manter duas bases que precisam ser atualizadas manualmente a cada alteração. Imagens de referência podem permanecer na conversa original, identificadas no registro; não exigir arquivo e upload duplicados.

## Campos da versão inicial

Separar o registro mínimo das informações condicionais. Não obrigar a preencher um formulário enorme antes de saber se haverá encomenda.

- Identificação do pedido e da cliente, apenas os dados necessários ao atendimento.
- Produto/quantidade ou tamanho e descrição do que foi combinado.
- Data e horário de retirada/entrega; modalidade. Endereço só quando necessário.
- Valor total acordado, recebido e saldo restante; pagamento confirmado versus apenas informado pela cliente.
- Situação: orçamento / aguardando confirmação / confirmado / em produção / pronto / entregue / cancelado.
- Próxima ação e seu prazo quando houver: confirmar referência, responder alteração, conferir pagamento, avisar retirada etc.
- Última alteração confirmada: o que mudou e quando. Mudança solicitada ainda não aceita não substitui o combinado anterior.
- Referência visual e observações específicas, quando aplicáveis.

Confirmado não significa automaticamente pago. Status de atendimento e recebimento são informações separadas. Critérios de confirmação/sinal pertencem à operação da confeiteira, não serão impostos pelo kit.

## Exemplo de uso — inteiramente fictício

1. A cliente pede um bolo pelo WhatsApp.
2. A confeiteira usa uma mensagem para obter as informações faltantes.
3. Registra o que foi combinado em um único pedido.
4. Envia o resumo e solicita confirmação.
5. Registra confirmação e recebimento efetivamente conferido.
6. Consulta o pedido na visão da semana.
7. Se houver alteração, confirma a mudança e atualiza o mesmo registro.
8. Registra entrega e eventual saldo recebido.

### Registro de exemplo

| Campo | Exemplo fictício |
|---|---|
| Pedido | 001 |
| Cliente | Marina — cliente fictícia |
| Produto | 1 bolo de 2 kg, massa de chocolate e recheio de brigadeiro |
| Personalização | Cobertura branca; nome Marina; referência recebida na conversa |
| Retirada | 10/10/2026, às 15h |
| Total acordado | R$ 180 |
| Recebimento conferido | R$ 60 |
| Saldo | R$ 120 |
| Situação | Confirmado |
| Próxima ação | Avisar quando estiver pronto para retirada |

Valores e características são inventados apenas para demonstrar o uso. Não são preço recomendado, ficha de custo ou instrução técnica de produção.

### Mensagem 1 — coleta inicial

> Oi, [nome]! Para montar seu orçamento, me diga a data e o horário, o produto e a quantidade/tamanho que você quer. Vai retirar ou precisa de entrega? Se tiver uma referência de decoração, pode mandar também.

### Mensagem 2 — resumo para confirmação

> Marina, confira se registrei certinho seu pedido 001:
>
> 1 bolo de 2 kg, massa de chocolate e recheio de brigadeiro. Cobertura branca, com o nome Marina, conforme a referência que combinamos.
>
> Retirada em 10/10, às 15h. Total: R$ 180. Recebimento já conferido: R$ 60. Saldo restante: R$ 120.
>
> Está tudo correto? Se precisar ajustar alguma informação, me diga antes de eu seguir com o pedido.

### Mensagem 3 — alteração

> Sobre o pedido [número]: você pediu a mudança de [combinado anterior] para [novo combinado]. O valor fica [valor] e a retirada/entrega fica [data e horário]. Confirma essa alteração?

Só atualizar a versão confirmada depois de obter resposta. Se a mudança não foi aceita, registrar como solicitação pendente.

## Valor a provar

O motivo para comprar precisaria ser menos esforço para começar e manter um processo de encomendas. Ter muitas abas, mensagens ou modelos não comprova esse valor.

A pesquisa já encontrou softwares baratos com pedidos, agenda e recebimentos (E006/E010). Portanto, uma ferramenta manual só merece avançar se usuárias demonstrarem preferência pelo seu fluxo, clareza ou adaptação. Não presumir que um kit sem mensalidade ganha automaticamente de um aplicativo.

## Escopo inicial

Ficam para eventual expansão: ficha de custos, estoque, lista de compras por receita, planejamento técnico de produção, catálogo, campanhas sazonais e automação de atendimento. Cada expansão depende de evidência de necessidade e custo de suporte.

Na v0, não incluir chatbot, leitura automática de conversa/áudio, integração com WhatsApp, receitas, instruções de conservação, laudos, contratos ou termos jurídicos. IA pode ajudar nossa produção de rascunhos, mas o uso do kit deve funcionar sem ela.

## Qualidade e pontos de iteração

- A usuária consegue cadastrar e consultar um pedido no próprio celular?
- Consegue atualizar data/valor/personalização sem manter informações contraditórias?
- A semana e o resumo refletem o mesmo pedido, sem duplicação de cadastro?
- Distingue confirmação do pedido, pagamento informado e recebimento conferido?
- O kit substitui uma parte do trabalho ou vira mais uma obrigação de preenchimento?
- Que tarefa importante não cabe nos campos? Que campos ficam sempre vazios?
- O exemplo atende o que de fato mais pesa na rotina da amiga?

Não há metas de tempo, taxa de erro, preço ou rentabilidade definidos. Medir e calcular depois, em vez de apresentar números imaginados como resultado.

## Como mostrar à amiga

Apresentar o registro e as mensagens de exemplo e pedir que ela compare com uma encomenda recente, sem dados identificáveis da cliente. Perguntar primeiro onde sua rotina se diferencia. Evitar usar apenas 'você gostou?' como critério.

Se ela apontar que a dor principal é custo/precificação, estoque ou compra de ingredientes, registrar a mudança e rever o produto. A hipótese não deve prender a pesquisa.

## Contexto e decisões

O usuário informou ter feito gastronomia e já conversado sobre essa dor com uma amiga que conhece outras confeiteiras. Isso oferece contexto de domínio e possibilidade de acesso a usuárias. Ainda não é confirmação independente, compromisso de participação ou demanda pagante. Não inferir diploma específico, profissão, certificação ou depoimento da amiga.

D004: desenhar essa v0 antes do contato, conforme pedido do usuário; depois iterar com dados de rotina real. Produto final, formato, nome e preço permanecem provisórios. Documentar as próximas revisões como v1, v2 etc., indicando o que mudou e qual observação causou a mudança.
