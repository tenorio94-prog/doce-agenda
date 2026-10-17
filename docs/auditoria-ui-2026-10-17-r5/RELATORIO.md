# Doce Agenda — iteração 5 de UI/UX (autônoma)

17/10/2026 · base `main` em `e4a1e85` (igual ao site no ar, rodada 4) · método: demo montada localmente, Playwright em 320/360/1024/1280/1440 px com relógio fixo em 15/10 12h, axe-core 4.10, `npm run check`, `npm run screens` antes/depois.

## 1. Diagnóstico

**O produto trata todo pedido do mesmo jeito, não importa quando ele é.** O pedido de hoje, o de sábado e um entregue em junho usam o mesmo cartão grande, com o mesmo carimbo de duas linhas e (nos abertos) o mesmo botão framboesa cheio. As quatro rodadas anteriores afinaram muito bem *o cartão*; nenhuma olhou para *a lista* como um todo. A causa é estrutural: um componente só, sem noção de tempo, usado em todos os contextos.

Evidências (demo, 360 px):

- **Pedidos tinha 4.626 px** (5.348 px em 320). Mais da metade era histórico: 12 encerrados, cada um com ~170 px, cabeçalho de dia próprio e "1 pedido" repetido. Achar o que fazer exigia rolar por dentro do que já acabou.
- **Nove botões framboesa cheios iguais** na lista aberta. "Começar a fazer" no bolo de sábado tinha o mesmo peso que "Marcar entregue" no bolo atrasado de hoje. O princípio "um pedido, um botão" funcionava no cartão e se diluía na lista: quando tudo é ação principal, nada é.
- **No computador**, a coluna lateral da Agenda guardava só o aviso da cópia de segurança, enquanto "Pedem sua atenção" (Pix a conferir, pedido novo pelo link, cobrança) ficava abaixo dos pedidos de hoje, fora da primeira tela.
- Inconsistências menores, com a mesma raiz de cada tela decidir sozinha: a ficha não dizia "Atrasado" quando o cartão dizia; Clientes punha um selo framboesa (cor da marca) em todas as linhas para dizer "Próximo pedido: sáb", o contrário de "cor é significado".

Avaliação de design, não defeito: o carimbo grande em cada cartão é pesado, mas é a identidade Comanda e diz quanto falta. Mantive.

## 2. O que preservei

A direção Comanda inteira: hora como eixo, carimbo que diz quanto, canhoto da ficha, verbo da etapa no botão, cores com significado, semana no topo, "Pedem sua atenção", WhatsApp com verbo do momento, regra de dinheiro (só o conferido conta). Agenda no celular e a ficha ficaram como estavam, fora o aviso "Atrasado". Nenhuma regra, situação gravada, contrato de API ou dado mudou.

## 3. O que mudei

1. **Encerrados viram linhas** (`historyLineMarkup`). Dia e mês grandes no lugar da hora (no histórico, *quando* importa mais que *a que horas*), produto, cliente e situação, total e o carimbo pequeno. Oito à vista, o resto em "Ver mais N pedidos encerrados"; com busca ou com o filtro Entregues/Cancelados, tudo aparece. Cancelado fica riscado e cinza. "Recebido pelo link" continua visível (era requisito da caixa de entrada).
2. **Entregue que ainda deve continua cartão**, com o dia no cabeçalho e "falta receber". O pedido acabou, o dinheiro não; ele não pode virar uma linha discreta. Vale também quando nada foi conferido ainda ou só há Pix informado: aí o saldo é indefinido (`null`), não zero. A primeira versão tratava esse caso como quitado; Lucas encontrou antes de publicar, e um teste agora cobre os cinco casos (sem pagamento, só informado, parcial, quitado, sem valor).
3. **O peso do botão segue o tempo** (`actionIsDue`). Cheio quando a ação é para agora: hoje, amanhã, atrasado, sem data ou decisão (confirmar orçamento, revisar pedido do link). Dias mais distantes mostram o mesmo verbo em botão calmo (o secundário que já existia). O botão continua lá e funciona igual; só deixa de disputar atenção.
4. **No computador (≥ 1001 px), "Pedem sua atenção" vai para a coluna ao lado do dia** (340 px, botão abaixo do texto) e o atalho "6 pedem sua atenção" do topo sai, porque a lista já está à vista. No celular nada muda.
5. **"Atrasado" também na ficha**, em tijolo, ao lado da situação.
6. **Clientes:** a situação da ficha virou texto de apoio; "Faz N dias que não pede" ganha só peso, sem cor nova.

## 4. Alternativas consideradas

- **Esconder o botão até a véspera** (ideia registrada na rodada 4). Descartei: muda o que a confeiteira pode fazer e depende de como cada uma trabalha (bolo de 3 andares começa dias antes). Mudar só o peso resolve o ruído sem tirar nada.
- **Levar o histórico para outra aba ou filtro.** Esconderia o que ela às vezes precisa (o que a Paula pediu da última vez) e criaria mais um lugar para procurar. A linha baixa já existia (Próximos dias, ficha da cliente); reaproveitá-la deixa o histórico perto e leve.
- **Mover a lista de atenção para a coluna só com CSS** (`display: contents`/`order`). A ordem de leitura e de teclado deixaria de acompanhar a tela. Montar o HTML conforme a largura (`matchMedia`) mantém as duas coerentes.
- **"Atrasado" em pedido Pronto para retirada.** Quando o bolo está pronto e a cliente não veio, "Atrasado" em tijolo sugere culpa da confeiteira. É uma decisão de linguagem do produto (registrada em 16/10 a pedido de Lucas), então não mudei; fica como oportunidade.

## 5. Evidências

Imagens em `img/`: `pedidos-360-pagina-inteira.jpg`, `pedidos-360-dias-futuros.jpg`, `pedidos-360-encerrados.jpg`, `agenda-1280-primeira-tela.jpg`, `ficha-atrasado.jpg`, `clientes.jpg`.

| Demo, relógio em 15/10 12h | Antes | Depois |
|---|---|---|
| Pedidos, altura em 320 px | 5.348 px | 3.618 px (−32%) |
| Pedidos, altura em 360 px | 4.626 px | 3.322 px (−28%) |
| Pedidos, altura em 1280 px | 4.249 px | 2.965 px (−30%) |
| Botões framboesa cheios na lista aberta | 9 | 6 (hoje, amanhã e as duas decisões) |
| Altura de um encerrado (360 px) | ~170 px | ~64 px |
| "Pedem sua atenção" no computador (1280×800) | abaixo da dobra | na primeira tela, ao lado de hoje |

## 6. Resultados técnicos

- `npm run check`: 64 regras + build + 12 suítes de tela passaram (rodado três vezes; ver abaixo).
- `test-rodada2` ajustado de propósito: "grupos por dia ≥ 8" passou a "≥ 6" (o histórico não tem mais um cabeçalho por dia) e ganhou verificações novas: histórico em linhas (≥ 8, altura ≤ 80 px), entregue com saldo como cartão, botão calmo no sábado, cheio hoje e nas decisões, lista de atenção na coluna no computador e à vista.
- `test-inbox` pegou uma regressão na primeira versão: a linha do histórico perdia "Recebido pelo link" de um pedido recusado. Corrigido antes do commit.
- `test-payment-stamps` falhou uma vez em três rodadas completas, lendo o carimbo antes de a ficha se redesenhar ("SINAL PAGO" em vez de "PAGO"). Passou 4/4 isolado, também no código de antes. Era uma corrida no próprio teste: agora ele espera o texto (commit separado).
- axe-core (WCAG 2/2.1 AA + boas práticas) em Agenda, Pedidos, Clientes e ficha, 360 e 1280: **idêntico ao antes**. Zero violações WCAG. Os avisos de boas práticas (`region`, `heading-order`, `landmark-complementary-is-top-level`) já existiam.
- `npm run screens` antes/depois: landing, cadastro, privacidade e prévia do link **idênticos**; mudaram só as telas da demo, como esperado.
- Sem erro de console e sem rolagem lateral em 320/360/1024/1280. Linha do histórico abre a ficha, "Ver mais" abre, foco de teclado visível.

## 7. Estado

Commits na `main` (código): `feat(pedidos)`, `feat(agenda)`, `fix(ui)` e `test(pagamentos)` da rodada 5, mais este relatório. A publicação está registrada em `context.md`.

## 8. Oportunidades que continuam

- **Linguagem do atraso:** separar "passou da hora e ainda não está pronto" (problema da cozinha) de "está pronto e a cliente ainda não retirou" (lembrete). Decisão de produto.
- **Entregue sem nada conferido** não tem carimbo nem entra em "Pedem sua atenção", que só olham saldo conferido maior que zero. Isso já era assim antes desta rodada; agora o pedido ao menos fica como cartão sob "falta receber". Mostrar "Falta R$ X, já entregue" e incluí-lo na lista de cobrança mexe em como o dinheiro aparece, então fica para uma decisão.
- **Histórico longo de verdade:** uma conta real com 300 entregues vai precisar agrupar por mês ou buscar melhor. A linha e o "Ver mais" aguentam bem algumas dezenas.
- **Cartão no computador:** em 1280 px o cartão aberto tem ~600 px de largura com o miolo vazio entre o carimbo e o botão. Dá para usar melhor, mas o público está no celular.
- **CSS em camadas:** `vnext.css` agora tem seções de cinco rodadas no fim do arquivo. Vale uma rodada própria de consolidação, com `npm run screens` antes/depois. Não misturei com esta.
- Nada disto foi visto por uma confeiteira de verdade, nem testado no Safari ou num aparelho físico.

## 9. Três decisões, explicadas

**1. Tempo como hierarquia.**
*Problema:* a lista de Pedidos era um muro de cartões iguais. *Alternativas:* deixar o cartão menor para todos, esconder o histórico, esconder botões. *Escolha:* o peso visual de cada pedido depende de quando ele é: histórico em linhas e botão cheio só para o que é para agora. *Princípio:* hierarquia visual deve seguir a relevância real para quem usa. Se tudo tem a mesma ênfase, a ênfase deixa de informar. *Para outros projetos:* antes de mexer num componente, pergunte se ele deveria ter **variantes por contexto**. Uma caixa de e-mail, um extrato bancário ou um painel de chamados têm o mesmo problema: o mesmo item pede tratamentos diferentes conforme a idade dele.

**2. Mudar o peso em vez de tirar a função.**
*Problema:* nove botões framboesa iguais. *Alternativas:* remover o botão de dias futuros (sugestão anterior) ou manter tudo. *Escolha:* o mesmo botão, no estilo secundário que já existia. *Princípio:* reduzir ênfase é reversível e não tira poder de quem usa; remover uma ação é decisão de produto e exige ouvir quem trabalha. *Para outros projetos:* diante de "tem coisa demais na tela", tente primeiro mudar o peso (cor, tamanho, posição) antes de esconder ou apagar. É mais seguro e quase sempre resolve a parte visual.

**3. Ordem do HTML igual à ordem da tela.**
*Problema:* levar "Pedem sua atenção" para a coluna lateral só no computador. *Alternativas:* duplicar a lista (dois elementos com o mesmo id, leitor de tela lendo duas vezes) ou rearrumar só com CSS (visualmente certo, mas o Tab e o leitor de tela seguem a ordem antiga). *Escolha:* montar o HTML no lugar certo conforme a largura, com `matchMedia`, e remontar quando a largura cruza 1000 px. *Princípio:* acessibilidade (WCAG 1.3.2 e 2.4.3): a ordem de leitura e de foco deve acompanhar o que se vê. *Como cheguei:* o primeiro impulso foi `display: contents` no CSS; ao desenhar a grade percebi que a lista ficaria visualmente antes dos "Próximos dias" e, no teclado, depois. Isso decidiu pela solução no JavaScript. *Para outros projetos:* sempre que um layout responsivo "muda as coisas de lugar", confira com Tab se o foco ainda percorre a tela numa ordem que faz sentido.
