# Doce Agenda — identidade

**Nome de trabalho:** Doce Agenda. Nome provisório, sem pesquisa de disponibilidade ou registro de marca.

**Produto:** ferramenta web para confeiteiras organizarem encomendas e consultarem a semana.

**Promessa:** pedidos e agenda da semana em um só lugar, do combinado à entrega. A marca fala de organização e acompanhamento; não promete vendas, ausência de erros ou resultados financeiros.

**Direção:** em transição (desde 16/10/2026) para a nova identidade do laboratório visual (branch `codex/laboratorio-visual`, `lab/DESIGN.md`): canvas `#fff8f8`, framboesa `#ad2644`, vinho `#4a1525`, verde `#006947` para o que foi conferido, âmbar `#865508` para atenção; Outfit nos títulos e números, Plus Jakarta Sans no resto; cartões com raio 20. Implementada em `public/ui/vnext.css`, tela por tela; o logo oficial continua. As seções abaixo descrevem o visual "Glacê + carimbo", que vale para as telas ainda não migradas. A referência de design é o canvas "Versão final" (site, marca, Hoje, Nova encomenda, Pedido).

## Tom

Direto e acolhedor, sem diminutivo. Instruções curtas e verbos diretos. Nos botões e títulos do app: "Nova encomenda", "Salvar encomenda", "Quem pediu?", "O quê?", "Quando?". Mensagens de sucesso: "o que aconteceu + próximo passo" ("Encomenda salva. Copiar resumo"). Erros em português, nunca texto técnico de biblioteca.

## Logo

"doce agenda" em Fredoka, com um fio de glacê e uma gota embaixo. A gota é o ícone do app (`public/favicon.svg`; os PNGs do manifest saem de `node scripts/build-icons.mjs`). O logo (`public/logo.svg`) tem o texto convertido em curvas e é gerado por `python scripts/build-logo.py`.

## Cores e o que significam

| Cor | Valor | Quando usar |
|---|---|---|
| Glacê | `#f7c5d0` | a marca: topo das telas, cabeçalho das janelas e destaques |
| Baunilha | `#fbe9a9` | atenção: falta o sinal, faixa de demonstração |
| Pistache | `#d3e7c1` | tudo certo: pronta, resumo do dia |
| Branco | `#ffffff` | pedido normal, sem pendência |
| Ameixa | `#2b1a2c` | texto e botão principal |
| Carimbo | `#2e6a46` | carimbo de sinal pago e anel de foco |
| Papel | `#fffaf2` | fundo |

Texto secundário `#66536a` e `#4a3550`; link `#8f2a4f`. Bordas de campos `#9c8290` (contraste 3,49:1; o `#d9c6cf` do canvas não passa dos 3:1 exigidos para controles). Todos os valores vivem em `public/tokens.css`; as folhas antigas usam aliases dele e podem ser migradas aos poucos.

## Letras

- **Fredoka:** só títulos, horários e números.
- **Figtree:** todo o resto.

Ambas em `public/fonts/` (SIL OFL 1.1), servidas localmente. Nenhum texto abaixo de 12 px.

## Carimbo

"Sinal pago" aparece quando a confeiteira confirma que recebeu (pagamento conferido), com a data. O sinal só conta depois de confirmado. Sem animação com `prefers-reduced-motion`.

## Forma

Botões em pílula. O fio de glacê com gotas separa o topo da página do conteúdo.

**Polimento (desde 15/10/2026, estilo shadcn):** só três raios (`--r-s` 12, `--r-m` 16, `--r-l` 24 px), borda fina de 1 px (`--hairline`) e sombras discretas (`--shadow-s/m/l`), todos em `public/tokens.css`. A landing já segue; o app migra tela por tela. Os raios antigos (24 a 28 px) continuam só no que ainda não foi revisado.

## Regras

- Bibliotecas são bem-vindas quando deixam o produto melhor, desde que instaladas pelo npm com versão fixa e servidas pelo nosso próprio domínio (montadas pelo build). Em uso: **Web Awesome** (componentes; tema em `public/ui/doce-wa.css`, ajustes em `public/ui/wa-setup.js`) e **Motion** (animações).
- Nada carregado de outros sites: sem CDN, fontes externas, analytics, rastreadores ou widgets. O ícone padrão da Web Awesome buscaria desenhos no Font Awesome; por isso ele fica desligado e só se usa `library="system"`.
- Alvos de toque de pelo menos 44 px.
- Foco de teclado sempre visível (anel de 3 px em `--carimbo`).
- Respeitar `prefers-reduced-motion`.
- Modo claro apenas (`color-scheme: light`).
- Imagem de compartilhamento: `node scripts/build-og-image.mjs`.
