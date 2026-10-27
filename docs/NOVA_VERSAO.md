# Doce Agenda — versão nova das telas da confeiteira (Etapa 1: demonstração)

Plano aprovado por Lucas em 27/10/2026. Autorizada só a Etapa 1. Pedido registrado como foi recebido; o estado da execução fica em `context.md`.

## Por quê
A confeiteira abre o app e não entende de cara. O visual está bom. O problema é a quantidade de conceitos:
- Na primeira tela, antes de rolar, ela já vê uns 8: pedido pelo link, vaga, Pix informado, conferir, cobrar, dia lotado, vagas ocupadas e prontas.
- O mesmo pedido aparece em 4 lugares: Hoje, Lista, Semana e Produção.
- Cada pedido tem situação, etapa e dinheiro andando juntos.
- "Combinado" é ao mesmo tempo uma situação e o nome do campo de anotações.
- No pedido do link, Aceitar e Recusar aparecem antes do que a cliente pediu.

Objetivo: uma versão nova só das telas da confeiteira, com o modelo do caderno. Ela vê uma agenda por dia e, em cada pedido, quanto falta receber.

## O que NÃO muda (regra dura)
- A versão atual (/demo/, /app/), a landing, a página da cliente (/p/, /encomenda/) e a privacidade ficam sem nenhuma mudança visível. Prova: `npm run screens` antes e depois, zero diferenças.
- Nada muda no Supabase: funções, tabelas e dados ficam como estão. As regras de cloud/ não mudam de comportamento. Se algo parecer exigir isso, parar e perguntar.
- Formato dos dados, rotas /api, chaves do localStorage e backups continuam iguais. As 9 situações gravadas continuam existindo.

## Onde fica
- Endereço: lucast.app/demo/nova/, com noindex, dentro de /demo para usar o mesmo armazenamento e o mesmo exemplo da demo atual (o browser-store decide pelo caminho). /demo/ e /demo/nova/ mostram os mesmos pedidos.
- Código separado do app.js, em pasta própria (public/nova/), poucos módulos por tela, montado pelo esbuild no build.
- HTML e JS simples, sem Web Awesome, como a página da cliente. Tokens, fontes e cores da marca (public/tokens.css); nada de identidade nova.
- Dados só por DoceApi.fetch e pelas rotas /api existentes.
- Dinheiro em centavos inteiros. Datas e "hoje" no fuso de São Paulo.
- Alvos de toque de 48 px. Um único botão cheio por tela.

## Situações, dinheiro e palavras
- Só 3 situações na tela: **Para decidir** (Solicitação, Orçamento, Aguardando confirmação), **Confirmado** (Confirmado, Em produção, Pronto) e **Entregue**. Cancelado e Recusado ficam fora da agenda.
- "Entregue" vale direto a partir de Confirmado, Em produção ou Pronto (PUT com status Entregue).
- Pagamento novo é sempre Conferido. Pagamento Informado antigo aparece na ficha como anotação ("A cliente avisou que pagou R$ 60. Já viu na conta?") com o botão "Vi na conta" (PUT /api/payments/:id); não entra no recebido.
- Palavras que não aparecem: vaga, informado, solicitação, carimbo, etapa, fazendo, em produção, aguardando confirmação. "Combinado" não é nome de situação.
- Sem tutorial nem caixas de dica. Na demo, uma linha no topo: "Exemplo de uma semana de encomendas."

## As telas
1. **Agenda:** topo com a data de hoje, "Meu link" e menu; aviso de decisão (um: "Camila pediu pelo link: bolo de aniversário, dom 1/11 · Ver"; vários: "3 pedidos para decidir · Ver"); aviso "Ficou para trás" (confirmado com data passada); faixa da semana seg–dom com número de pedidos e "cheio"/"fechado", tocar rola até o dia, setas para outras semanas; lista por dia desde hoje até pelo menos o fim da semana seguinte ("Hoje", "Amanhã", "Quinta, 29/10"), "N pedidos" e "cheio" pela regra de cloud/state-engine.js, dia vazio em linha curta "nada marcado"; cada pedido numa linha (hora · o quê · quem · retirada/entrega · etiqueta de dinheiro "Pago"/"Falta R$ X"/"Valor a combinar" · botão redondo de entregue com "Desfazer"; entregue riscado no fim do dia); barra de baixo Agenda · [+ Novo pedido] · Dinheiro.
2. **Ficha:** hora, dia, o quê, quem, retirada/entrega e local; tocar no nome mostra telefone, WhatsApp e pedidos anteriores (/api/clientes); "O combinado" logo depois (anotações e detalhes do bolo, só leitura); dinheiro "Total · Recebido · Falta", "Recebi" (sugere o que falta, editável) e "Cobrar no WhatsApp" (na demo só mostra o texto); botão principal por situação (Aceitar/Recusar, Entregue, nenhum); no fim, discretos, "Editar" e "Cancelar pedido".
3. **Pedido pelo link:** primeiro o que a cliente pediu, depois Aceitar/Recusar. Aceitar pergunta "Valor combinado (opcional)" se não houver valor; data cheia ou fechada mostra a mensagem do servidor e oferece mudar a data ou aceitar mesmo assim, só com as rotas existentes. Recusar pede confirmação com motivo opcional e oferece "Avisar no WhatsApp" (na demo só o texto). Orçamento anotado por ela: "Confirmar" (pede a data se faltar) e "Cancelar".
4. **Novo pedido e Editar:** Quem pediu? · O quê? · Quando? (Hoje, Amanhã, data e hora) · Valor (opcional) · Anotações (`details`); depois WhatsApp da cliente e Retirada/Entrega (entrega mostra endereço); caixinha "Ainda é orçamento" desmarcada (sem ela nasce Confirmado; sempre enviar `status`). Nada escondido; sem vagas, próxima ação, prazo, alteração pendente, modelo de bolo. Dia cheio/fechado/antecedência: mensagem do servidor e "Salvar mesmo assim" com `capacityOverride` (motivo padrão de 4 a 300 caracteres). Editar manda só o que mudou.
5. **Dinheiro:** mês com setas; "Recebido" (só conferido, /api/resumo-mensal) e "Falta receber"; lista dos confirmados ou entregues com saldo, mais antigos primeiro, cada um com "Recebi".
6. **Meu link e menu:** link ativo mostra endereço, "Copiar link" e "Ver como a cliente vê"; inativo, uma frase e botão para montar na versão atual. Menu: "Dias e limite" (salva a disponibilidade inteira lida do servidor só com a mudança), "Ver versão completa"; na demo, "Recomeçar exemplo" e "Criar conta grátis".

## Critérios de aceite
Testes de tela com o Playwright do projeto, em 360, 390 e 1280 px.
1. Em /demo/nova/, a 360×640, os pedidos de hoje aparecem sem rolar além dos avisos e da faixa da semana.
2. Anotar "Ana, bolo de cenoura, sábado 15h, R$ 120" faz o pedido aparecer no sábado com "Falta R$ 120".
3. "Recebi" de R$ 50 nessa ficha mostra "Falta R$ 70", e o Dinheiro soma R$ 50 em Recebido.
4. Tocar em amanhã na faixa mostra os pedidos de amanhã.
5. Aceitar o pedido da Camila tira o pedido do aviso e o coloca no dia como Confirmado. Recusar também funciona.
6. Marcar entregue e desfazer funcionam.
7. Um pedido criado em /demo/nova/ aparece em /demo/, e vice-versa.
8. Editar pela tela nova um pedido com bolo, vagas e próxima ação não apaga esses campos.
9. Nenhuma palavra proibida no texto visível; sem rolagem lateral em 320, 360, 390 e 1280 px, sem erro no console, axe sem violações.
10. `npm run check` passa, e `npm run screens` antes e depois não mostra diferença nas telas atuais.

## Entrega e quando parar
- Commits separados por tela. Ao fim da Etapa 1, push na main e publicação (só acrescenta /demo/nova/), conferida no endereço publicado em 360 px. Atualizar context.md.
- Parar e relatar: link, o que mudou, o que ficou de fora e um roteiro com 3 tarefas para confeiteiras ("anote um bolo para sábado", "a Ana pagou R$ 50", "o que você entrega amanhã?").
- Sem OK de Lucas, não começar: **Etapa 2** (mesma tela para conta real em /app/nova/, com o mesmo cloud/app-bootstrap.js, que hoje carrega fixo /cloud-app.js e procura .topbar-actions) nem **Etapa 3** (a tela nova vira padrão; a antiga fica em outro endereço por um tempo). Até a Etapa 3, nenhuma feature nova na versão atual.

## Ajustes de 27/10

Aprovado por Lucas em 27/10/2026, uma etapa só, com as mesmas regras acima (mesmos dados e rotas /api, nada no Supabase, palavras proibidas, centavos e fuso de São Paulo, um botão cheio e alvos de 48 px). Commits por assunto e uma publicação no fim.

1. **Conta nova: tela vazia com convite.** Sem nenhum pedido na agenda, em Para decidir ou em Ficou para trás (cancelados e recusados não contam), no lugar da faixa e da lista: título "Anote sua primeira encomenda", frase "Quem pediu, o quê, quando e o valor. Leva um minuto.", botão em contorno "Anotar encomenda" (abre o Novo pedido; o cheio continua sendo o da barra) e link discreto "Ou monte seu link para as clientes pedirem sozinhas" (abre o item 2). Com o primeiro pedido, a agenda normal volta.
2. **Meu link montado na tela nova.** Trazer o assistente de 3 passos do app.js (O4: openLinkWizard, linkWizardNext, previewOrderLink): nome e endereço; WhatsApp opcional; até 3 doces com valor opcional; ativar e copiar. Mesmas validações e textos, no estilo novo. Salvar manda o orderPage inteiro lido do servidor só com a mudança (fotos, estilo, cor, categorias e outros doces ficam). Na demo, o último passo mostra a prévia (/encomenda/?preview=1 com a chave doce-agenda.link-preview) e nada é ativado; "Meu link" na demo também oferece "Ver como a cliente vê" com a Doces da Lu. Com o link ativo, a janela ganha "Mudar doces e fotos", que abre a versão completa direto em Ajustes > Sua vitrine (ex.: /app/completa/#vitrine); a abertura direta pode entrar no app.js, e a versão completa sem esse endereço continua idêntica.
3. **Landing igual ao app novo.** Refazer as telas de exemplo (public/landing/index.html e setupLinkDemo, setupWeekDemo, setupMoneyDemo do main.js) com a agenda por dia, "Falta R$ X", "Pago", ✓ de entregue, "Recebi", o aviso "pediu pelo link" e a ficha com "O que ela pediu". Textos: subtítulo "anote o que recebeu" no lugar de "marque o sinal que você conferiu"; passo 2 sem "etapa"; passo 3 "Viu o dinheiro na conta? Toque em Recebi. O Dinheiro mostra quanto entrou e quem já levou e ainda deve."; aviso de pedido novo "no topo da Agenda"; perguntas frequentes sem "Ajustes, Aviso de pedido novo" (com o app aberto aparece um aviso quando chega pedido; fechado, o pedido espera no aviso do topo da Agenda). Só prometer o que funciona; manter o aviso de exemplos fictícios.
4. **Pedido do link: responder antes de decidir.** No pedido do link o bloco se chama "O que ela pediu" (nos outros, "O combinado"). Com WhatsApp, o bloco Contato ganha "Responder no WhatsApp" (contorno) com mensagem curta, ex.: "Oi, Camila! Vi seu pedido do bolo de aniversário para domingo, 1/11."; na demo só mostra o texto. O pedido continua em Para decidir.
5. **Dinheiro: quem deve separado do que vai entrar.** Topo: "Recebido" do mês (as setas mudam só ele) e "Entregue, falta receber" = soma da lista 1. Lista 1 "Já entregue, falta receber": todos os Entregue com saldo, de qualquer mês, mais antigos primeiro, com "Recebi" e, com WhatsApp, "Cobrar". Lista 2 "Ainda vai entrar": confirmados não entregues com saldo, por data, soma no título. Botão Dinheiro da barra com o número de entregues com saldo (some no zero). Números grandes batem com as listas.
6. **Linha da agenda.** Sem "Retirada" (o normal); "Entrega" só quando for. Nome do doce em até 2 linhas, sem "…".

**Fora:** marcar "sem sinal" na agenda; Clientes, Pix, backup e aviso de sistema na tela nova; Supabase, banco e política; pedir senha ou login (Lucas confere a conta real).

**Critérios de aceite** (Playwright, 320/360/390/1280): 1) demo vazia mostra "Anote sua primeira encomenda" sem faixa nem "nada marcado", e salvar um pedido traz a agenda; 2) sem link ativo "Meu link" abre o assistente, na demo o fim abre a prévia com o nome digitado, nenhum caminho do link leva à tela Hoje da versão completa, "Mudar doces e fotos" abre Sua vitrine; 3) landing sem informado, carimbo, Meu mês, Fazendo, Ficou pronto, vaga, "coisas pedem você", Marcar conferido, "Ainda vou passar o preço", "topo de Hoje", "Aviso de pedido novo", e "Experimentar sem cadastro" abre /demo/; 4) na ficha da Camila "O que ela pediu" antes de Aceitar/Recusar e "Responder no WhatsApp" com nome e doce; 5) Roberta em "Já entregue, falta receber" com R$ 55, quinta em "Ainda vai entrar", somas iguais aos números grandes, número no botão Dinheiro; 6) linha sem "Retirada" e nome longo em 2 linhas sem "…"; 7) `npm run check` passa, `npm run screens` só muda landing e telas novas, versão completa sem endereço extra idêntica; 8) sem rolagem lateral, sem erro no console, axe 0 e um botão cheio por tela.

**Entrega:** push na main, publicar, conferir no ar em 360 px (landing, /demo/, ficha da Camila, Dinheiro, Meu link na demo), atualizar context.md e relatar curto: o que mudou, o que ficou de fora e o que Lucas confere em /app/.
