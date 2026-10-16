# Doce Agenda — identidade

**Nome de trabalho:** Doce Agenda. Nome provisório, sem pesquisa de disponibilidade ou registro de marca.

**Produto:** ferramenta web para confeiteiras organizarem encomendas e consultarem a semana.

**Promessa:** pedidos e agenda da semana em um só lugar, do combinado à entrega. A marca fala de organização e acompanhamento; não promete vendas, ausência de erros ou resultados financeiros.

**Direção: "Comanda" (aprovada por Lucas em 16/10/2026).** Nasce do ofício: a comanda do pedido presa na bancada, a etiqueta da caixa e o carimbo de pago. Relatório, capturas e protótipo em `docs/auditoria-ui-2026-10-16/`. Implementada em `public/ui/vnext.css` (tokens `--vn-*`); `public/tokens.css` traz as fontes e aliases para as páginas fora do app. O visual antigo "Glacê" ainda existe por baixo em `public/style.css`, sobrescrito; não criar regras novas nele.

## Princípios

1. **A hora é o eixo.** Na Agenda, a coluna da esquerda é o horário, grande; o resto se alinha a ela.
2. **Um pedido, um botão.** Cada cartão tem uma ação principal com o verbo da próxima etapa. O título abre a ficha.
3. **O dinheiro tem forma.** Um carimbo só: cheio e verde quando conferido; tracejado em caramelo quando falta o sinal ou falta conferir. O texto vai sempre junto.
4. **Cor é significado.** Nunca usar a cor da marca para estado.
5. **Silêncio em volta.** Sem frases de efeito nas telas internas, sem rótulos em maiúsculas espaçadas, sem setas decorativas em botões, sem letra no lugar de foto.

## Tom

Direto e acolhedor, sem diminutivo. Instruções curtas e verbos diretos ("Nova encomenda", "Quem pediu?", "Ficou pronto", "Pedir o sinal de R$ 54"). Sucesso = o que aconteceu + próximo passo. Erros em português, dizendo o que fazer; nunca texto técnico de biblioteca.

## Logo

"doce agenda" com um fio de glacê e uma gota embaixo, em contornos (`public/logo.svg`, gerado por `python scripts/build-logo.py`; não depende de fonte). A gota é o ícone do app (`public/favicon.svg`; PNGs do manifest por `node scripts/build-icons.mjs`).

## Cores e o que significam

| Nome | Token | Valor | Trabalho |
|---|---|---|---|
| Vinho | `--vn-wine` / `--vn-ink` | `#3a1220` / `#2a141b` | texto, títulos, cabeçalho da ficha |
| Framboesa | `--vn-berry` | `#b0244a` | marca e ação principal; **nunca estado** |
| Farinha | `--vn-canvas` | `#f5f1f2` | fundo das telas |
| Açúcar | `--vn-surface` | `#ffffff` | cartões e janelas |
| Pistache | `--vn-green` / `--vn-mint` | `#1e6b47` / `#e3f2e9` | conferido, pronto, entregue |
| Caramelo | `--vn-amber` / `--vn-vanilla` | `#7f4d00` / `#fff0cc` | falta o sinal, falta conferir |
| Tijolo | `--vn-red` / `--vn-red-soft` | `#a3341a` / `#fdebe5` | atrasado, dia lotado |
| Cinza | `--vn-muted` | `#6f5a61` | fechado, cancelado, texto de apoio |
| Verde WhatsApp | `--vn-zap` | `#128c4a` | **só** botões que abrem o WhatsApp, sempre com o ícone |

Texto sobre fundo precisa de contraste AA (4,5:1); o axe-core deve dar zero violações de contraste nas telas principais.

## Letras

- **Bricolage Grotesque** (600 e 700): títulos, horários e valores.
- **Plus Jakarta Sans** (variável): todo o resto, com números tabulares.

Ambas SIL OFL 1.1, copiadas do `@fontsource` pelo build para `/fonts/vnext/`. Nenhum texto abaixo de 12 px. A landing ainda usa Outfit nos títulos (migrar junto com ela). A vitrine da cliente tem as letras próprias de cada estilo (Young Serif, Baloo 2, Caprasimo, Bricolage).

## Peças

- **Cartão Comanda** (`.vn-order.comanda`): coluna da hora (com sacola para retirada, caminhão para entrega), produto como título-botão (`.vn-open`), cliente e detalhe numa linha, carimbo no canto, filete lateral com a cor do dinheiro (tijolo se atrasado), um botão.
- **Carimbo** (`.vn-stamp`): `is-ok` (cheio, pistache), `is-due` (tracejado, "Falta o sinal"), `is-check` (tracejado, "Pix falta conferir"). Na ficha, o carimbo grande "SINAL PAGO / PAGO" com a data.
- **Rótulo** (`.vn-badge`): etapa só quando não há botão; `red` para "Atrasado"/"Dia lotado"; `outline` para estados neutros.
- **WhatsApp** (`.vn-zap`): verbo do momento ("Pedir o sinal de R$ 54", "Mandar o orçamento", "Avisar que está pronto", "Cobrar R$ X"); nunca envia sozinho; desligado na demonstração.
- **Ícones** (`public/ui/icons.js`): traço 1,7, `currentColor`; cada ícone ligado a um conceito (sacola, entrega, batedor, Pix, cliente, alerta…). Ícone só onde ajuda a reconhecer.

## Forma

Raio 18 nos cartões, 14 nos controles; pílula só em botões e rótulos. Uma sombra (`--vn-shadow`). Movimento: um único momento, o carimbo batendo quando ela confere; o resto só responde ao toque. Respeitar `prefers-reduced-motion`.

## Regras

- Bibliotecas são bem-vindas quando deixam o produto melhor, desde que instaladas pelo npm com versão fixa e servidas pelo nosso próprio domínio (montadas pelo build). Em uso: **Web Awesome** (componentes; tema em `public/ui/doce-wa.css`) e **Motion** (animações).
- Nada carregado de outros sites: sem CDN, fontes externas, analytics, rastreadores ou widgets. O ícone padrão da Web Awesome buscaria desenhos no Font Awesome; por isso ele fica desligado e só se usa `library="system"`.
- Alvos de toque de pelo menos 44 px; 48 px nas ações principais.
- Foco de teclado sempre visível (anel de 3 px verde).
- Nada de interativo dentro de interativo (o cartão não é botão; o título é).
- Modo claro apenas (`color-scheme: light`).
- Imagem de compartilhamento: `node scripts/build-og-image.mjs` (ainda usa Fredoka/Figtree de `public/fonts/`).
