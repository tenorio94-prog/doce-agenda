# Hoje — informação antes da decoração

Feedback do usuário em 08/10/2026: tela parecia genérica, com flor/trevo e calendário decorativo. Referência foi o print enviado pelo próprio usuário, não outra marca. Refinamento dentro da identidade existente; tipografia Lora/Manrope, creme/terracota, logo e navegação mantidos.

| Before | After | Why |
| --- | --- | --- |
| Flor ao lado de Hoje | Hoje + data sem símbolo | Data comunica contexto; símbolo não comunicava estado |
| Mensagem vaga em cartão destacado | Primeiro pedido com instrução concreta e curta | Orienta a ação inicial sem consumir a primeira tela |
| Cartão dentro de cartão, borda pontilhada e calendário | Estado vazio em texto alinhado à esquerda | Não dar mais destaque à ausência de pedidos do que aos próprios pedidos |
| Próxima ação vazia e seta decorativa | Seção só com ação real e botão nativo Ver pedido | Menos ruído; elimina interação aninhada no cartão |
| Cards financeiros em zero antes de cadastrar | Financeiro aparece quando existe pedido; valores em lista dividida | Prioriza começar a agenda; cálculos anteriores preservados |
| Rodapé de marca no mobile operacional | Rodapé omitido no mobile | Marca já está no cabeçalho; evita texto atrás da barra fixa |

Cabeçalho usa serifa da marca. Títulos operacionais e valores usam sans legível. Separadores organizam seções; cartões continuam em pedidos, onde delimitam um item acionável. Calendário na navegação Semana continua funcional; o calendário ornamental dos estados vazios foi removido. Não há ilustração substituta nem nova animação.

Luna fez os estilos iniciais e a revisão operacional. Principal revisou HTML, semântica da ação, hierarquia, layout financeiro, estados e capturas. Nenhuma API, permissão, autenticação ou dado real foi alterado. Regras de pagamentos/saldo/capacidade e edição continuam no motor existente.

Verificações: `node scripts/test-deploy.mjs` e `node scripts/review-today.mjs`, depois de `node scripts/build-cloud-preview.mjs`. QA em perfis limpos com hora fixa Oct8 10h São Paulo, dados fictícios locais: zero pedidos, amostra futura e dois pedidos com pagamento conferido. 320/390/768/1440px, assets/fontes, overflow, criação, detalhes, próxima ação e semana. Sem requisições ao banco ou cadastro de contas reais. Capturas viewport em today-first-use-390.png, today-demo-390.png, today-active-390.png e today-active-1440.png.

Não houve teste com confeiteiras nem em aparelho físico nesta revisão. O print do usuário motivou a direção; aprovação do uso real continua sendo aprendizado do piloto.
