# Conteúdo — landing e acesso

## Landing page

### Hero

**Os pedidos da sua confeitaria, com cada combinado à vista.**

Anote encomendas, acompanhe prazos e pagamentos e veja o saldo de cada pedido. Uma agenda prática para saber o que precisa de atenção hoje e o que vem pela frente.

**Botão:** Conhecer o piloto

*O piloto é uma demonstração. Os dados ficam salvos neste navegador.*

### O que você acompanha

- **Pedidos e prazos:** cliente, produto, data de entrega ou retirada, situação e próxima ação.
- **Combinados:** detalhes do pedido, alterações ainda pendentes e histórico do que foi ajustado.
- **Pagamentos e saldo:** registre valores recebidos e confira cada pagamento antes de somá-lo ao total recebido.
- **Semana e disponibilidade:** visualize os próximos dias e configure dias fechados, antecedência mínima e limite de pedidos por data.

### Um começo simples

1. Cadastre um pedido com cliente, produto, valor e prazo.
2. Acrescente os detalhes do combinado e a próxima ação, se precisar.
3. Registre pagamentos e confira o saldo conforme receber.

**Botão:** Conhecer o piloto

*Você pode começar com o essencial e completar os outros detalhes depois.*

### Chamada final

**Deixe os pedidos mais fáceis de acompanhar.**

Conheça o piloto da Doce Agenda e veja como ele funciona na rotina da sua confeitaria.

**Botão:** Conhecer o piloto

## Acesso futuro — proposta de produto

> Cadastro e entrada com conta são uma proposta para uma versão futura. Não fazem parte do piloto atual.

### Criar conta

**Título:** Crie sua conta

**Texto:** Tenha um espaço para organizar os pedidos da sua confeitaria.

**Campos:** Nome, e-mail, senha e confirmação de senha.

**Botão:** Criar conta

**Link:** Já tem uma conta? Entrar

### Entrar

**Título:** Que bom ter você de volta

**Campos:** E-mail e senha.

**Botão:** Entrar

**Link:** Esqueci minha senha

### Recuperar senha

**Título:** Vamos ajudar você a entrar

**Texto:** Informe o e-mail usado no cadastro. Se houver uma conta associada, enviaremos as instruções para criar outra senha.

**Campo:** E-mail

**Botão:** Enviar instruções

**Confirmação:** Se houver uma conta com esse e-mail, você receberá as instruções de recuperação.

## Onboarding futuro — proposta de produto

### Boas-vindas

**Título:** Vamos organizar sua agenda

**Texto:** Cadastre o primeiro pedido para acompanhar prazo, combinado e pagamentos em um só lugar.

**Botão:** Cadastrar primeiro pedido

**Ação secundária:** Fazer isso depois

### Primeiro pedido

Comece com **nome da cliente**, **produto**, **data e horário** e **valor total**. A data e o valor podem ficar para depois quando ainda forem um orçamento. Em mais detalhes, inclua combinado, retirada ou entrega, próxima ação e prazo dessa ação. Para bolos, é possível usar um modelo de personalização.

**Botão:** Salvar pedido

**Confirmação:** Pedido salvo. Você pode registrar um pagamento quando receber e conferir o saldo na agenda.

**Ação secundária:** Ver minha agenda

## Notas de handoff

- O app atual é estático e grava os dados no `localStorage` do navegador. Não há contas, login, recuperação de senha, servidor de dados ou sincronização entre navegadores e dispositivos.
- O piloto público tem uma agenda independente em cada navegador. A versão local grava dados neste computador; nenhuma das duas compartilha agenda entre aparelhos.
- Cadastro, entrada, recuperação de senha e onboarding com conta são textos de proposta futura, sujeitos a implementação de autenticação e armazenamento no servidor.
- O fluxo atual permite cadastrar pedidos, acompanhar datas e situações, registrar pagamentos informados e conferidos, anotar alterações pendentes e ver histórico, semana e saldo. Pagamento informado só entra no recebido depois de conferido.
- Não prometer integração com WhatsApp, calendário, envio automático de mensagens, anexos, leitura de prints ou sincronização. O resumo para WhatsApp é para copiar e colar.
- No produto futuro, estados de carregamento devem anunciar progresso com `role="status"`; erros devem ser claros, associados ao campo ou formulário e anunciados com `role="alert"`. Preservar os dados digitados quando possível, indicar como corrigir e oferecer nova tentativa quando fizer sentido.
- Formulários devem ter rótulos persistentes, ordem de foco previsível, controles acessíveis por teclado e mensagens que não dependam apenas de cor. Recuperação de senha deve confirmar de forma neutra para não revelar se um e-mail está cadastrado.
