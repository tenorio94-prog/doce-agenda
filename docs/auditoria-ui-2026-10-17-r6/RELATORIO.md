# Doce Agenda — iteração 6 de UI/UX (autônoma)

17/10/2026 · base `main` em `5c5b9bf` (igual ao GitHub e ao site da rodada 5) · método: demo montada localmente, Playwright em 320/360/390/768/1024/1280/1440 px com relógio fixo em 15/10 12h, axe-core 4.10.3, `npm run check`, `npm run screens` antes/depois.

## 1. Diagnóstico

**As cinco rodadas anteriores cuidaram de como o pedido aparece. Nenhuma cuidou do momento em que ele entra.** Agenda, Pedidos, ficha e carimbo foram refinados várias vezes. Os dois formulários em que a confeiteira *declara um fato* continuavam como na primeira versão: Nova encomenda ("está fechado?") e Registrar recebimento ("o dinheiro caiu?"). São as duas perguntas que decidem o que o produto mostra depois: vaga, Meu mês, recebido. Os dois tratavam essas perguntas como um campo qualquer.

Evidências (demo, 360 px, usando o app de verdade):

- **Pedido fechado salvo como orçamento, sem aviso.** Cadastrei "Marina, bolo de chocolate, sábado 15h, R$ 150", como quem acabou de fechar pelo WhatsApp. A "Situação" já vinha em **Orçamento**, num seletor de 7 opções, e o pedido foi salvo assim. Ele não entra em Meu mês, não ocupa vaga e fica em Novos.
- **Dia lotado passou em silêncio.** Sábado já tinha 3 de 3 vagas. Como orçamento não ocupa vaga, o formulário não disse nada. Quem marcava Confirmado só descobria ao salvar.
- **No celular, o aviso de lotação aparecia fora da tela.** Ao confirmar num dia lotado, o aviso e o campo do motivo surgiam no topo da janela, e ela estava no fim do formulário. Tocar em "Confirmar pedido" parecia não fazer nada.
- **O aviso de confirmação ficava atrás da ficha.** "Pagamento marcado como conferido", "Mensagem copiada" e o **"Desfazer"** de "Começar a fazer" apareciam por baixo da ficha aberta. Medido: o ponto central do aviso caía no canhoto do dinheiro. O "Desfazer" existia, mas não dava para tocar.
- **Em 320 px o formulário passava da janela.** Campos cortados à direita e "Salvar encomenda" truncado. Os campos do Web Awesome tinham largura mínima própria e a grade usava `1fr` (mínimo automático).
- **Erros no balão do navegador**, no idioma e no estilo do sistema. O resto do app fala em tom de conversa.
- **Depois de salvar**, só "Encomenda salva." O pedido novo não aparecia na tela e nada dizia onde ele tinha ido parar.

A primeira auditoria (16/10, §3.5) já propunha "Situação como um controle de duas opções". A proposta tratava o sintoma (o campo fica abaixo da dobra). A causa é outra: **o formulário pergunta o que o banco precisa saber ("qual status?"), não o que a confeiteira sabe ("já está combinado?")**, e ainda responde por ela.

O que já estava bem resolvido: o formulário curto com "Mais detalhes", os atalhos Hoje/Amanhã, o "R$" dentro do campo, a exceção de lotação com motivo, o "Desfazer". Também o desenho geral das telas, que não toquei.

## 2. O que preservei

Toda a direção Comanda e o trabalho das rodadas 1–5. Agenda, Pedidos, ficha, carimbos, Clientes, Meu mês, Ajustes, landing e vitrine **não mudaram**: `npm run screens` dá diferença só na captura da janela "Nova encomenda". Também ficaram iguais as nove situações gravadas, os `name` dos campos (`status` continua `status`), as rotas `/api`, o formato dos dados, a regra do dinheiro e a exceção de lotação, que segue sendo decidida no servidor. Ao **editar** um pedido existente continua o seletor completo, porque é por ele que se cancela ou se volta uma etapa.

## 3. O que mudei

1. **"Já está combinado?"** (Nova encomenda, Confirmar orçamento, Aceitar solicitação). Duas opções grandes, cada uma com a consequência: "Sim, confirmado · Ocupa vaga na agenda" / "Ainda é orçamento · Fica em Novos". **Nenhuma vem marcada** ao criar. Sem resposta, o app pede a escolha ao lado do campo. Fica logo depois de "O quê?", porque decide se data e horário são obrigatórios. Aceitar solicitação continua começando em Orçamento, como antes.
2. **A vaga da data aparece enquanto ela escolhe.** Exemplo: "Sábado, 17 de outubro: 3 de 3 vagas ocupadas, dia lotado. Para confirmar, você vai anotar o motivo da exceção." Ou "… Orçamento não ocupa vaga." Dia lotado ou fechado aparece em tijolo, com palavras. A conta é a mesma da Agenda (`availabilityFor`, só confirmados, sem exemplos) e, ao editar, o próprio pedido não conta duas vezes.
3. **O botão diz o que vai acontecer:** "Confirmar pedido" ou "Salvar orçamento".
4. **O aviso diz onde o pedido foi parar:** "Marina está na agenda: seg, 19 out, 15h." ou "Orçamento de Lia salvo em Pedidos, em Novos." Ao editar: "Alterações salvas."
5. **"Já viu o dinheiro na conta?"** no registro de pagamento, com o mesmo padrão: "Ainda não, a cliente avisou · Não conta como recebido" / "Sim, conferi · Conta como recebido". Aqui **"Ainda não" continua marcado de início** (ver §4). O aviso depois de salvar repete a regra: "R$ 60,00 conferido. Já conta como recebido."
6. **Erros ao lado do campo, em português do app** ("Escreva quem pediu.", "Pedido confirmado precisa de horário."), nos dois formulários.
7. **O aviso de lotação aparece ao salvar no celular:** a janela rola até ele e o foco vai para o motivo.
8. **O aviso fica por cima da ficha e o "Desfazer" funciona.** O aviso virou popover (camada de cima) e passa a morar dentro da janela aberta, porque uma janela modal deixa o resto da página inerte. Se a janela fecha com o aviso à vista, ele volta para a página.
9. **320 px:** a grade usa `minmax(0, 1fr)` e os campos `min-width: 0`. Em ≤ 340 px o "Cancelar" sai do rodapé, e o X do topo continua fechando a janela.

## 4. Alternativas consideradas

- **Trocar o padrão de Orçamento para Confirmado.** Inverteria o erro: quem anota um orçamento rápido seria barrada por "precisa de data e horário" sem entender por quê. Um padrão errado é pior que nenhum quando os dois erros custam caro.
- **Deduzir a situação ("tem data, horário e valor → confirmado").** É mágico demais para uma decisão que mexe em vaga e em dinheiro, e ela não veria a regra. Perguntar custa um toque.
- **Mesma regra para o pagamento (nenhum marcado).** Aqui os dois erros não custam igual: marcar "conferido" sem ter visto o dinheiro infla o recebido, que é a regra central do produto. Deixar "Ainda não" marcado nunca mente sobre dinheiro. Por isso as duas escolhas ficam visíveis, mas só o pagamento tem um lado padrão. **Critério: só vem marcado o lado que não pode causar dano.**
- **Mostrar as vagas em uma fileira de dias no formulário (seletor próprio).** Seria mais bonito, mas troca o seletor de data do sistema, com risco no Safari e mais código. A frase debaixo da data dá a mesma informação no momento certo.
- **Aviso só fora da janela, com `inert` desligado.** Não existe forma de deixar um elemento fora do `<dialog>` modal tocável. Morar dentro da janela de cima é o caminho previsto pela especificação.

## 5. Evidências

Imagens em `img/` (360 px salvo indicação; "Antes" = build da rodada 5):

- `formulario-360-sabado-lotado.jpg`: mesmo pedido em sábado lotado. Antes: "Orçamento" já escolhido e nenhum aviso. Depois: a escolha e a vaga em tijolo.
- `formulario-360-ao-salvar.jpg`: antes, o pedido virou orçamento e o aviso só dizia "Encomenda salva."; depois, o aviso de lotação e o campo do motivo à vista.
- `formulario-360-erro.jpg`: balão do navegador × erro ao lado do campo.
- `formulario-320.jpg`: campos e botão cortados × tudo dentro da janela.
- `pagamento-360.jpg`: seletor fechado × as duas respostas com a consequência.
- `ficha-360-aviso-desfazer.jpg`: depois de "Começar a fazer" na ficha, sem aviso × "Juliana: Em produção. Desfazer".

Nas capturas o campo de data aparece como `10/17/2026` porque o navegador de teste usa o formato dos EUA. No celular de uma confeiteira brasileira ele segue o idioma do aparelho.

| Demo, 15/10 12h | Antes | Depois |
|---|---|---|
| Pedido com data, hora e valor sem mexer na situação | salvo como **Orçamento** | não salva sem a resposta |
| Vaga da data antes de salvar | nenhuma | frase sob a data; tijolo se lotado/fechado |
| Aviso visível com a ficha aberta | não (ponto central caía no canhoto) | sim, e "Desfazer" volta a etapa |
| Largura do conteúdo da janela em 320 px | 308 px numa janela de 282 | 282 de 282 |

## 6. Resultados técnicos

- `npm run check`: **64 regras + build + 12 suítes de tela passaram** (rodado depois de cada commit e no fim).
- `test-order-form` ampliado de 14 para **27 casos** (agora também em 320 px). Casos novos: nada marcado ao criar, erro ao lado da escolha, botão e aviso que dizem o que aconteceu, vaga lotada antes de salvar, editar mantém o seletor completo, orçamento novo diz onde ficou, nada passa da janela, foco no motivo da exceção, aviso por cima da ficha e "Desfazer" funcionando.
- `test-payment-stamps`: padrão seguro "Ainda não", erro de valor vazio, aviso com a regra. `test-monthly-summary` usa a escolha nova; `test-ux-improvements` (fora do check, sem manutenção) acompanha o campo.
- axe-core (WCAG 2/2.1 A e AA) na janela de encomenda (aberta e com erro), no pagamento e na ficha com o aviso, em 360 e 1280: **zero violações, igual ao antes**.
- `npm run screens` antes/depois: das 20 capturas, **só `demo-novo-360` e `demo-novo-1280` mudaram**, como esperado.
- Sem rolagem lateral na janela de 320 a 1440 px; sem erro de console.
- Não verificado: Safari/iPhone, aparelho físico, conta real e confeiteira real. O popover existe no Safari a partir da versão 17. Em navegador mais antigo o aviso continua aparecendo, posicionado dentro da janela.

## 7. Estado

Revisão antes da publicação: encontrado conflito de `name="status"` entre rádios ocultos/desabilitados e o seletor de edição. Editar um Confirmado podia gravar Orçamento; editar Pronto podia bloquear o salvamento. A correção mantém o nome apenas no controle ativo. O teste reproduziu a mudança indevida antes do ajuste e passou depois; agora verifica a situação persistida de Confirmado, Pronto e Entregue, em 320/360/1280 (33 casos no formulário).

Quatro commits na `main` local (autor Lucas, coautor Claude):

1. `feat(pedido)`: "Já está combinado?", vaga da data, botão, aviso, erros, 320 px.
2. `feat(pagamento)`: "Já viu o dinheiro na conta?".
3. `fix(ui)`: aviso por cima da ficha, "Desfazer" funcionando.
4. `fix(pedido)`: aviso de dia lotado à vista ao salvar no celular.

Mais este relatório e a atualização do `context.md`. Arquivos: `public/index.html`, `public/app.js`, `public/ui/vnext.css` e os testes. **Não enviados ao GitHub nem publicados**: a sessão não tinha as credenciais do GitHub nem da Cloudflare. Os comandos estão no `context.md`.

## 8. Oportunidades que continuam

- **Editar um pedido ainda mostra 7 situações num seletor.** É também o único jeito de cancelar. Uma ação "Cancelar pedido" na ficha, com confirmação, deixaria a edição só para os dados. Isso mexe no fluxo de cancelamento, por isso ficou de fora.
- **Antecedência mínima** ainda só aparece ao salvar. A frase da data poderia avisar também ("menos que os 2 dias que você pede"), repetindo a regra do servidor.
- **Clientes** ordena pela atividade mais recente, incluindo pedidos futuros. Quem pediu para daqui a cinco dias aparece antes de quem retira hoje. Vale decidir qual ordem ajuda mais.
- **O formulário de pagamento** ainda usa `type=number` nativo, e o de encomenda usa campos Web Awesome com "R$" dentro. Unificar a aparência dos dois é cosmético; não misturei.
- **CSS:** esta rodada adicionou um bloco curto perto das regras do formulário, não no fim do arquivo. A consolidação das seções de rodadas do `vnext.css` (registrada na rodada 5) continua valendo como trabalho próprio.

## 9. Três decisões, explicadas

**1. Perguntar em vez de presumir.**
*Problema:* o formulário respondia "Orçamento" pela confeiteira, e um pedido fechado sumia de Meu mês e da contagem de vagas sem aviso. *Alternativas:* manter o padrão, trocar o padrão para Confirmado, deduzir pela presença de data e valor, ou perguntar. *Escolha:* perguntar ("Já está combinado?"), sem resposta pronta, com a consequência escrita em cada opção. *Princípio:* um padrão é uma decisão tomada por quem usa. Quando a resposta muda o que o sistema faz depois e errar para qualquer lado custa caro, o padrão vira armadilha. *Para outros projetos:* olhe cada campo com valor pré-preenchido e pergunte "se a pessoa não mexer aqui, o que acontece de errado?". Se a resposta for "dados errados em silêncio", tire o padrão e faça a pergunta.

**2. Padrão só do lado seguro.**
*Problema:* aplicar a mesma regra ao pagamento parecia coerente. *Alternativas:* nenhum marcado, como no pedido, ou "Ainda não" marcado. *Escolha:* "Ainda não" marcado, com as duas respostas à vista. *Princípio:* um padrão é aceitável quando é o lado *fail-safe*, isto é, quando errar por ele não causa dano. Marcar "conferido" sem ter visto o dinheiro quebra a regra mais importante do produto; deixar "informado" no máximo atrasa uma conferência. *Como cheguei:* a tentação era aplicar a mesma regra aos dois formulários, por consistência. Antes de mudar o pagamento, escrevi o que cada erro causaria nos dois casos. Só no pagamento um dos lados é inofensivo, e isso decidiu. *Para outros projetos:* "consistência" não quer dizer tratar igual dois casos com riscos diferentes. A regra consistente aqui é "só vem marcado o que não pode causar dano", e ela produz respostas diferentes nos dois formulários.

**3. O aviso que ninguém via.**
*Problema:* com a ficha aberta, os avisos (inclusive o "Desfazer") ficavam atrás dela. *Alternativas:* aumentar o `z-index`, mudar o aviso de lugar ou usar a camada de cima do navegador. *Escolha:* popover dentro da janela aberta. *Descoberta técnica:* um `<dialog>` aberto com `showModal()` vai para a "camada de cima" (*top layer*), acima de qualquer `z-index`, por isso subir o `z-index` não funcionaria. Virar popover resolveu a parte visual, mas o teste mostrou que o "Desfazer" continuava sem responder ao toque. Uma janela modal deixa **inerte** tudo o que está fora dela, mesmo o que aparece por cima. A solução foi mover o aviso para dentro da janela aberta antes de mostrá-lo, e devolvê-lo à página quando a janela fecha. *Princípio:* "aparecer" e "poder ser usado" são verificações diferentes. *Para outros projetos:* em todo app com janelas modais, teste um aviso com ação ("Desfazer") com a janela aberta, e teste **tocando**, não só olhando. O teste automático daqui (`elementFromPoint` no centro do aviso e clique no botão) pegou as duas metades do problema.
