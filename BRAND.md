# Fornada — identidade oficial (Louça & Forno)

**Nome:** Fornada (rebranding total aprovado por Lucas em 21/11/2026 na Direção A — **Louça & Forno** — substituindo integralmente o visual anterior herdado do nome provisório "Doce Agenda": gota de glacê, rosa-framboesa e Fredoka). Endereço `lucast.app`, e-mail `doceagenda@lucast.app`, Worker `doce-agenda`, rotas `/api` e chaves `doce-agenda.*` do navegador permanecem preservados. Sem pesquisa oficial no INPI ou registro de domínio concluídos.

**Produto:** ferramenta web para confeiteiras artesanais brasileiras organizarem encomendas, combinados financeiros e a semana no celular — rápida com uma mão na cozinha ou na bancada.

**Promessa:** pedidos e agenda da semana em um só lugar, do combinado à entrega. A marca fala de organização e acompanhamento; não promete vendas, ausência de erros ou resultados financeiros.

**Direção oficial: "Louça & Forno" (Ateliê Contemporâneo, aprovada em 21/11/2026).** Nasce da louça esmaltada azul-cobalto, do papel manteiga limpo e do caderno de receitas impecável: eleva a confeitaria autônoma ao patamar de ateliê respeitado, sem clichê infantil (sem rosa chiclete, cupcake, chapéu de chef nem gota de glacê) e sem frieza de aplicativo bancário. Substitui as diretrizes anteriores de `brand/identidade-v2/GUIA-MARCA.md` e a paleta Framboesa/Vinho/Fredoka em `public/tokens.css`, `public/nova/`, `public/previa-landing/` e páginas auxiliares.

**Personalidade:** Precisa · Solar · Autoral.

## Princípios

1. **A hora é o eixo.** Na Agenda, a coluna da esquerda é o horário, legível com números tabulares; o resto se alinha a ela.
2. **Um pedido, um botão.** Cada cartão destaca uma ação principal com o verbo da próxima etapa; o título abre a ficha.
3. **O dinheiro tem forma.** Carimbo claro e consistente: cheio em verde quando conferido; tracejado em âmbar quando falta sinal ou conferência; vermelho apenas em atraso/dia cheio. O texto acompanha a cor sempre.
4. **Cor é significado — marca nunca é estado.** Azul Louça `#1D449B` identifica a marca e ações primárias/navegação; nunca substitui ou compete com Pago (`#166534`), Sinal (`#854D0E`), Atraso (`#B42318`) ou WhatsApp (`#0E7A3F`).
5. **Silêncio em volta.** Sem frases de efeito nas telas internas, sem rótulos em maiúsculas espaçadas, sem setas decorativas em botões, sem letra no lugar de foto.

## Tom de voz

Direto, respeitoso e acolhedor, sem diminutivo. Instruções curtas e verbos no imperativo claro ("Nova encomenda", "Quem pediu?", "Ficou pronto", "Pedir o sinal de R$ 54"). Mensagem de sucesso informa o que aconteceu e qual é o próximo passo. Erros aparecem em português simples dizendo o que fazer, nunca jargão técnico de biblioteca.

## Símbolo e assinatura (`fornada`)

- **Símbolo oficial (Cúpula do Forno & Assadeira):** construção 100% culinária e geométrica formada pela cúpula do forno artesanal com boca arqueada vazada ao centro sobre uma base horizontal afilada de assadeira/louça. Dispensa qualquer letra `"f"` solta em caixa azul (evitando confusão com ícones de redes sociais) e substitui definitivamente o fio e a gota de glacê. Funciona em 1 cor de `14px`/`16px` a `512px`.
- **Favicon e ícones instalados (`public/favicon.svg` + `scripts/build-icons.mjs`):** `viewBox="0 0 48 48"` iniciando exatamente com `<rect width="48" height="48" rx="13" fill="#1D449B"/>` (único `<rect>` do arquivo para remoção segura do `rx` ao gerar `apple-touch-icon.png` 180px, `icon-192.png` e `icon-512.png` *maskable*), com o símbolo branco centralizado dentro da área segura `8..40`.
- **Mini-marks inline:** selo `24×24` em `.top-mark` no cabeçalho do app (`public/nova/index.html`, vetor em `brand/rebranding-a/mark-24.svg`); e símbolo puro `14×14` sem caixa em `#1D449B` (ou `currentColor`) no rodapé `.made` da vitrine (`public/encomenda/index.html`, vetor em `brand/rebranding-a/mark-14.svg`).
- **Assinatura horizontal (`public/logo.svg`):** símbolo puro em Azul Louça `#1D449B` à esquerda (`28×26`, vetor base `brand/rebranding-a/symbol.svg`, alinhado à altura do olho sobre `y=8.5..34.5` em `viewBox="0 0 W 42"`) + respiro de `10` unidades + wordmark `fornada` em minúsculas na **Fraunces** peso `700` (`SOFT: 50`, `opsz: 36`, `WONK: 0`, tamanho `34`, baseline `33.5`, tracking `-0.03em`) em Ferro Fundido `#161D2B`, convertido em curvas vetoriais (`<path>`) sem dependência de fonte externa.

## Cores e tokens oficiais (Direção A — WCAG AA validado)

| Nome | Token canônico | Aliases preservados (`public/tokens.css`) | Valor | Papel & contraste |
|---|---|---|---|---|
| Papel Manteiga | `--papel-manteiga` | `--papel`, `--paper` | `#F7F7F4` | Fundo principal de todas as telas |
| Farinha Fina | `--farinha-fina` | `--surface-soft`, `--cream`, `--segmented` | `#EEEDE8` | Superfícies secundárias e faixas suaves |
| Porcelana | `--porcelana` | `--branco`, `--card`, `--surface` | `#FFFFFF` | Cartões elevados, janelas e campos |
| Ferro Fundido | `--ferro` | `--ink`, `--vinho`, `--ameixa` | `#161D2B` | Títulos, horários e texto principal (**15,72:1** fundo / **16,87:1** cartão) |
| Tinta Suave | `--tinta-suave` | `--ink-soft` | `#354052` | Subtítulos e texto de apoio forte (**9,75:1** fundo / **10,47:1** cartão) |
| Grafite de Caderno | `--grafite` | `--muted`, `--faint` | `#525B6B` | Textos de apoio, datas encerradas (**6,38:1** fundo / **6,85:1** cartão) |
| Azul Louça | `--azul-louca` | `--framboesa`, `--action`, `--link`, `--coral`, `--terracotta`, `--focus` | `#1D449B` | Cor principal da marca, CTA primário, links e anel de foco (**8,93:1** c/ branco / **8,32:1** fundo; **nunca estado**) |
| Cobalto Profundo | `--cobalto-profundo` | `--framboesa-hover`, `--action-hover`, `--coral-dark`, `--terracotta-dark` | `#15347A` | Estado hover/pressed da marca (**11,64:1** c/ branco) |
| Névoa de Louça | `--nevoa` | `--glace`, `--coral-soft` | `#E6EEFA` | Realce tonal da marca, chips tonais, seleção ativa (**7,64:1** c/ Azul Louça / **14,44:1** c/ Ferro Fundido) |
| Risco de Lápis | `--risco-lapis` | `--border-input`, `--da-border` | `#7A8496` | Borda de campos e controles (**3,51:1** fundo / **3,77:1** cartão — WCAG 1.4.11) |
| Linha de Caderno | `--linha-caderno` | `--line` | `#DCE0E6` | Divisórias sutis de cartões e listas |
| Verde Sálvia / Pago | `--pago` / `--pago-soft` | `--carimbo` / `--pistache`, `--sage` / `--sage-soft` | `#166534` / `#E3F4E8` | Conferido, pago, pronto, entregue sem pendência (**6,24:1** / **7,13:1** branco) |
| Âmbar / Sinal | `--sinal` / `--sinal-soft` | `--gold` / `--baunilha`, `--gold-soft` | `#854D0E` / `#FEF2D4` | Falta o sinal, Pix a conferir, atenção calma (**6,15:1** / **6,85:1** branco) |
| Terracota / Atraso | `--atraso` / `--atraso-soft` | `--error` / `--error-soft` | `#B42318` / `#FDECEB` | Atrasado, dia cheio/lotado, erro e exclusão (**5,75:1** / **6,57:1** branco) |
| Verde WhatsApp | `--zap` | `--vn-zap` | `#0E7A3F` | Exclusivo para botões que abrem o WhatsApp, sempre com ícone (**5,42:1** c/ branco) |

## Tipografia (100% auto-hospedada, SIL OFL)

- **Títulos, números-destaque e logotipo:** **Fraunces** variável (`@fontsource-variable/fraunces` v5.3.0, copiada pelo build para `/fonts/vnext/fraunces.woff2`, SIL OFL). Pesos `600` e `700`, `font-variation-settings: "SOFT" 50` para expressão artesanal sem perder nitidez editorial.
- **Corpo, UI e valores operacionais:** **DM Sans** variável (`@fontsource-variable/dm-sans` v5.3.0, copiada pelo build para `/fonts/vnext/dm-sans.woff2`, SIL OFL). Pesos `400` a `700`, com `font-variant-numeric: tabular-nums` (`tnum`) obrigatório em horários, totais, sinais e contadores.
- Nenhum texto funcional abaixo de `12px`; zero CDN externo (`fonts.googleapis.com` proibido).
- **Vitrine pública (`/p/<loja>`):** preserva os 4 estilos opcionais configurados pela confeiteira apenas nos títulos (`Ateliê`/Young Serif, `Doceria`/Baloo 2, `Caseira`/Caprasimo, `Moderna`/Bricolage Grotesque em `/fonts/vitrine/`), usando **DM Sans** no texto de apoio e formulários.

## Peças, forma e movimento

- **Cartão de pedido e carimbo do dinheiro:** o dinheiro continua explícito por texto + cor (`is-paid` em `--pago`/`--pago-soft`, `is-due`/`is-check` tracejado em `--sinal`/`--sinal-soft`, `is-late` em `--atraso`/`--atraso-soft`; entregue com saldo nunca fica verde).
- **Canhoto picotado (`.f-stub`) e semana no topo (`.week`):** dia ativo destacado em Ferro Fundido `#161D2B`; pontinhos de agenda em Azul Louça `#1D449B` passando para `#B42318` somente quando o dia lota.
- **Kit de divulgação (`public/share-kit.js`):** cartelas respeitam a paleta da vitrine escolhida pela confeiteira nos previews/Story e usam DM Sans + Ferro Fundido `#161D2B` nos textos e rodapé `Fornada · encomendas pelo link`.
- **Raios e elevação:** `--r-xs` (`8px`), `--r-s` (`12px`), `--r-m` (`16px`), `--r-l` (`24px`), `--radius-pill` (`999px`); sombras sutis ancoradas em Ferro Fundido `rgb(22 29 43 / ...)`.
- **Movimento único:** batida do carimbo ao conferir pagamento (`@keyframes stamp-beat 240ms`), desativada com `prefers-reduced-motion: reduce`.

## Acessibilidade e engenharia

- **Alvos de toque:** mínimo `44px`; ações principais em `48px`–`50px`.
- **Foco de teclado sempre visível:** anel `3px` sólido em **Azul Louça `#1D449B`** (`var(--focus)`) com offset de `2px`–`3px`.
- **Modo claro apenas (`color-scheme: light`)** e proibido elemento interativo dentro de outro interativo.
- **Zero dependências externas em runtime:** Web Awesome permanece servida localmente (`library="system"`); nenhum script, fonte ou rastreador de fora do domínio `lucast.app`.
- **Imagem de compartilhamento (`public/landing/assets/og.jpg`, `1200×630`):** gerada por `scripts/og-image.html` + `node scripts/build-og-image.mjs` em Papel Manteiga `#F7F7F4` com acento Azul Louça `#1D449B`, novo `public/logo.svg`, tipografia **Fraunces** + **DM Sans**, cartão Porcelana e carimbo Pago `#166534`.
