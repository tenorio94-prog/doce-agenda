# Doce Agenda — identidade

**Nome de trabalho:** Doce Agenda. Nome provisório, sem pesquisa de disponibilidade ou registro de marca.

**Produto:** ferramenta web para confeiteiras organizarem pedidos e consultarem a semana.

**Promessa:** pedidos e agenda da semana em um só lugar, do combinado à entrega. A marca fala de organização e acompanhamento; não promete vendas, ausência de erros ou resultados financeiros.

## Personalidade e tom

Acolhedora, organizada e profissional. Escreva em português simples, com instruções curtas, nomes de campo claros e verbos diretos. Soe humana e respeitosa, sem infantilizar a confeiteira ou exagerar no açúcar, nos diminutivos e nos emojis. O "doce" vem de calor, cuidado e acabamento, não de ornamento.

Dentro do app, use **pedido**. "Encomenda" fica só para textos de divulgação.

Mensagens de sucesso seguem o padrão "o que aconteceu + próximo passo":
- "Pedido salvo. Copiar resumo"
- "Pagamento informado. Confira antes de marcar como recebido."

Mensagens de erro são sempre em português e dizem o que a pessoa pode fazer. Nunca mostre texto técnico de biblioteca.

## Tipografia

- **Lora:** título de cada página, nome da cliente no detalhe do pedido e títulos da página de apresentação.
- **Manrope:** interface e todo dado (horários, valores, contagens), com algarismos alinhados (`lining-nums tabular-nums`).

As fontes ficam em `public/fonts/`, sem CDN. Nenhum texto abaixo de 12 px.

## Cores e seus papéis

| Cor | Valor | Papel |
|---|---|---|
| Papel | `#fbf7f0` | fundo |
| Cartão | `#fffefa` | cartões e modais |
| Creme | `#f3eadc` | agrupamento e calor da marca (faixa do demo, blocos de contexto) |
| Tinta | `#392923` | texto principal |
| Suave | `#6f5b51` | texto secundário |
| Coral | `#a34432` (escuro `#843524`, claro `#f8e8e1`) | só ação e marca: um botão principal por tela, links, "Novo" |
| Sálvia | `#42644c` | "está combinado, está certo": confirmado, conferido, salvo, foco |
| Dourado | `#79521d` | "falta algo": aguardando, saldo pendente |
| Erro | `#a32e34` | problema; sempre com ícone e texto, nunca sozinho |

O coral não é cor de situação. Cada situação do pedido tem sua cor, igual no selo e na barra lateral do cartão, e o selo sempre traz o texto. Bordas de campos usam `#9f8b7f`, que garante contraste de 3:1.

## Assinatura e forma

A marca é a assinatura tipográfica "Doce Agenda" com o traço curvo (`public/logo.svg`). O traço não indica funcionalidade e não vira indicador de interface. O guia completo está em `brand/identidade-v2/GUIA-MARCA.md`.

O arco (topo arredondado da foto da página de apresentação) é a única forma própria da marca. Use só em superfícies de divulgação: página de apresentação e imagem de compartilhamento. Dentro do app, nenhuma forma decorativa.

Ícone instalado e imagem de compartilhamento são gerados por `node scripts/build-icons.mjs` e `node scripts/build-og-image.mjs`.

## Regras

- Nenhuma dependência externa: sem fontes de CDN, analytics, widgets ou bibliotecas de ícones.
- Alvos de toque de pelo menos 44 px.
- Foco de teclado sempre visível: anel sálvia de 3 px.
- Respeitar `prefers-reduced-motion`; microinterações discretas.
- Modo claro apenas (`color-scheme: light`).
