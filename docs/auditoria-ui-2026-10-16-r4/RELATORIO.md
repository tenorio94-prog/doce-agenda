# Doce Agenda — iteração 4 de UI/UX (autônoma)

16/10/2026 · base `main` em `6d3e930` (igual ao site no ar) · método: demo montada localmente, Playwright em 320/360/390/1280 px com relógio fixo, axe-core, `npm run check`.

## 1. Diagnóstico

**O que mais pesava não era cor nem estilo. Era a peça que mais se repete: o cartão do pedido.** No celular o carimbo do dinheiro ficava preso no canto de cima, por cima do texto. Para ele não cobrir o nome, quatro regras acumuladas nas rodadas anteriores reservavam de 94 a 136 px à direita (`padding-right`). Resultado em 360 px: o produto (o que a confeiteira procura primeiro) ficava com uns 100 a 140 px de largura e quebrava em até 3 linhas ("Docinhos / sortidos / (50 un.)"), e o detalhe era cortado. Enquanto isso, o rodapé do cartão tinha um botão à direita e um espaço vazio à esquerda.

Causa: cada rodada corrigiu um sintoma (carimbo maior quando passou a mostrar o valor, depois mais recuo) em vez de dar ao carimbo um lugar próprio.

Outros achados com a mesma natureza, de espaço gasto antes do conteúdo:

- **Ficha do pedido:** uma regra do visual antigo (Glacê) ainda punha 150 px de recuo na linha da hora. No celular, "Quinta-feira, 15 out" quebrava em duas linhas e o topo da ficha tinha 103 px em vez de ~31.
- **Aviso da demonstração:** 157 px no celular (o link "Criar conta grátis" caía numa terceira linha). Na demo, que é o que a landing vende, o primeiro pedido só começava em 675 px de uma tela de 780.
- **"Dia lotado" repetido** duas vezes na primeira tela da Agenda (resumo do topo e cabeçalho do dia).

## 2. O que preservei

A direção Comanda funciona: hora como eixo, um botão por pedido com o verbo da etapa, carimbo que diz quanto, cores com significado, ficha na ordem do trabalho, WhatsApp com verbo do momento. Também a Agenda com a semana no topo e "Pedem sua atenção", e a regra de dinheiro (só o conferido conta). Nada disso mudou.

## 3. O que mudei

1. **Rodapé do cartão = dinheiro + ação.** O carimbo desceu para a esquerda do botão, como no canhoto da ficha (valor e a ação juntos). O produto e a cliente usam a largura toda. No celular o rodapé ocupa o cartão inteiro, porque a coluna do texto (238 px) não comporta carimbo + botão (≈ 270 px).
2. **Foto no canto do texto**, à direita do produto, em vez de embaixo da hora. Na primeira tentativa, com o carimbo no rodapé, a foto debaixo da hora deixava a coluna da esquerda mais alta que o texto e sobrava um vão (cartão do Brigadeiro passou de 155 para 175 px). Corrigido.
3. **"Atrasado" junto da hora** (que já fica tijolo), como texto pequeno; o rodapé fica só com dinheiro e ação e não quebra em duas linhas.
4. **Removidas as quatro regras de recuo** do carimbo (`padding-right` 94/104/112/136 px) — o problema deixou de existir em vez de ser compensado.
5. **Ficha:** anulado o recuo herdado do Glacê; hora, dia e situação numa linha.
6. **Aviso da demo** em duas linhas no celular (texto mais curto, links 13 px, alvos de 44 px mantidos).
7. **"Dia lotado"** sai do resumo do topo quando o cabeçalho do dia logo abaixo já mostra hoje.

## 4. Alternativa descartada

Carimbo em versão de uma linha no rodapé ("Sinal conferido" numa linha só): em 360 px, "R$ 28,50 falta o sinal" + "Começar a fazer" não cabem lado a lado. Usar o carimbo pequeno ("Sem sinal") tiraria o valor, que a rodada 2 decidiu mostrar. Ficou o carimbo de duas linhas.

Também considerei e não fiz: ocupar a coluna lateral vazia da Agenda no computador com "Pedem sua atenção" (a coluna tem 300 px, apertado para essas linhas; o computador é secundário).

## 5. Evidências

Imagens antes/depois em `img/`: `agenda-primeira-tela.jpg`, `agenda-cartoes.jpg`, `pedidos-sabado.jpg`, `ficha.jpg`.

Medidas na demo (relógio fixo em 15/10 12h):

| | 360 antes | 360 depois | 1280 antes | 1280 depois |
|---|---|---|---|---|
| Aviso da demo | 157 px | 76 px | 64 | 64 |
| Primeiro pedido da Agenda começa em | 675 px | 593 px | 528 | 528 |
| Altura dos 3 cartões de hoje | 182/182/205 | 160/160/182 | 160/140/160 | 160/154/160 |
| Linhas do nome do produto (pior caso, Pedidos) | 3 | 2 | 1 | 1 |
| Página de Pedidos | 4.799 px | 4.626 px | 4.050 | 4.249 |
| Linha da hora na ficha | 103 px | 31 px | 44 | 36 |

Limites honestos: em **320 px** dois tipos de cartão ainda quebram o rodapé em duas linhas (Pix a conferir e entregue com rótulo + total), e a lista de Pedidos ficou ~8% mais longa nessa largura. No **computador**, os cartões entregues ganharam ~14 px (o carimbo agora divide a linha com o total), Pedidos ~5% mais longo. Achei aceitável: o ganho está em 360–390 px, onde está o público.

## 6. Resultados técnicos

- `npm run check`: 64 regras + build + 12 suítes de tela passaram (inclui `test-rodada2` em 320/360/390/1440 e `test-payment-stamps`). Nenhum teste precisou mudar.
- axe-core (WCAG 2/2.1 AA + boas práticas) em Agenda, Pedidos e ficha, 360 e 1280: **igual ao antes** — zero violações WCAG; os 3 avisos de boas práticas (`region`, `heading-order`, `landmark-complementary`) já existiam.
- `npm run screens` antes/depois: landing, cadastro, privacidade e prévia do link **idênticas**; mudaram só as telas da demo (esperado).
- Sem rolagem lateral em 320/360/390/1280; sem erro de console.

## 7. Oportunidades que continuam

- A ficha não diz "Atrasado" quando o horário passou (o cartão diz).
- Na lista de Pedidos, dias futuros mostram o mesmo botão framboesa em todo cartão ("Começar a fazer" no sábado). Vale discutir com uma confeiteira se o botão deve aparecer só a partir da véspera — é decisão de produto, não de estilo.
- No computador a Agenda tem uma coluna lateral quase vazia.
- O CSS ainda tem camadas de rodadas sobrepostas (por exemplo, `.order-row.is-paid` e outras regras do Glacê em `vnext.css`); a limpeza merece uma rodada própria, com `npm run screens` antes/depois.
