# Auditoria do piloto Doce Agenda — 13/10/2026

**Alvo:** https://doce-agenda-piloto.netlify.app (deploy de 08/10/2026, idêntico ao código em `deploy-cloud/`, verificado por hash).
**Páginas:** landing `/`, cadastro `/cadastro/`, demonstração `/demo/` (mesmo código de `/app/`, sem login).
**Viewports:** 390×844 (celular) e 1440×900 (desktop).
**Método:** script de DOM injetado no navegador (contraste WCAG calculado, alvos de toque, tamanhos de texto, rótulos, landmarks, overflow), leitura de cabeçalhos HTTP com `curl`, leitura do código-fonte (`public/`) e capturas de tela em `design/auditoria-2026-10-13/`.

## O que NÃO foi medido

- **Lighthouse/Core Web Vitals reais**: não há Lighthouse aqui. Tempos abaixo (DCL ≈ 1,0 s, load ≈ 1,3–1,8 s) são do navegador embutido, em rede boa.
- **Leitor de tela e navegação por teclado completa**: só verifiquei atributos e CSS, não testei com NVDA/VoiceOver.
- **Estado com dados reais**: o demo foi auditado vazio. Para telas com pedidos, use as capturas de QA em `design/ux-improvements/` e `design/today-refinement/`.
- **Login real e Supabase**: o painel do navegador bloqueou `supabase.co` (`ERR_BLOCKED_BY_CLIENT`), então o fluxo de conta não foi exercitado.
- **Segurança de backend/RLS**: fora de alcance.

## Resumo

| Área | Situação |
|---|---|
| Acessibilidade semântica | **Boa**: 0 imagens sem `alt`, 0 campos sem rótulo, 0 IDs duplicados, landmarks completos, `lang="pt-BR"`, skip-link, `<dialog>` nativo com `showModal()`, `aria-current` na navegação |
| Contraste de texto | **Sem falhas** em nenhuma das 3 páginas, nos dois viewports |
| Layout responsivo | **Sem overflow horizontal** em 390 e 1440 |
| Privacidade | **Boa**: nenhuma requisição a terceiros na landing e no app (só `supabase.co` no cadastro) |
| Tipografia e toque | **Pontos a melhorar**: texto de 10–11 px e alguns alvos < 44 px |
| Cabeçalhos de segurança | **Lacuna**: só HSTS em produção |
| Cache e peso | **Lacuna**: `max-age=0` em tudo, inclusive fontes e imagens |
| SEO/compartilhamento/PWA | **Lacuna**: sem og:, canonical, robots, sitemap, manifest |

## Achados

Severidade: **Alta** = corrigir antes de divulgar mais; **Média** = melhora clara; **Baixa** = polimento.

### Técnico / segurança

**T1 — Alta — Produção não envia CSP nem os demais cabeçalhos de segurança.**
Resposta de `/` só traz `Strict-Transport-Security`. Existe `deploy-demo/public/_headers` com `Content-Security-Policy`, `X-Content-Type-Options: nosniff` e `Referrer-Policy`, mas **esse arquivo não foi para `deploy-cloud/public/`**, que é o que está no ar. Atenção: o CSP existente tem `connect-src 'self'` e **quebraria o login** (precisa liberar `https://khvhnbopdluthpcduhqm.supabase.co`). Além disso, o app é todo montado com `innerHTML` (8 usos em `app.js`); o escape `esc()` é aplicado nos trechos que conferi, mas a revisão não foi exaustiva, e o CSP é a segunda camada de defesa contra XSS via nome de cliente/produto.

**T2 — Média — Nenhum asset é cacheado.**
`Cache-Control: public,max-age=0,must-revalidate` em HTML, JS, CSS, fontes e imagens. Cada visita refaz ~10 requisições condicionais (304). Fontes (377 KB) e imagens quase nunca mudam. Em 4G fraco isso pesa; basta nomes com hash + `immutable`, ou `max-age` longo para `/fonts/*` e `/landing/assets/*`.

**T3 — Média — Fontes TTF sem subset e sem woff2.**
`Lora.ttf` 207 KB e `Manrope.ttf` 161 KB (gzip: 105 KB + 66 KB). Em woff2 com subset latino costumam cair para cerca de 20–40 KB cada. São pré-carregadas (`preload`) em todas as páginas do app.

**T4 — Média — JavaScript do app: 225 KB (59 KB gzip) em um único `cloud-bootstrap.js`.**
Inclui o cliente Supabase inteiro. Funciona, mas é o maior custo em primeira visita no celular. Não há `<script type="module">`, divisão de código ou carregamento sob demanda da área de conta.

**T5 — Média — Sem manifest nem ícone de tela inicial.**
`/manifest.webmanifest` e `apple-touch-icon` não existem. O público-alvo usa no celular; instalar o app na tela inicial (com ícone e cor do tema) é o caminho natural e hoje abre uma aba comum do navegador.

**T6 — Média — SEO e compartilhamento da landing.**
Zero `og:*`/`twitter:*`, sem `canonical`, sem `robots.txt` e sem `sitemap.xml`. Ao colar o link no WhatsApp, a prévia fica sem imagem. Para um produto que depende de indicação entre confeiteiras, isso importa.

**T7 — Baixa — Página 404 é a padrão do Netlify, em inglês** (`<html lang="en">`).

**T8 — Baixa — O comentário injetado pelo Netlify** (`<!-- This site is hosted on Netlify... -->`) aparece no topo de todo HTML. Cosmético; é do plano gratuito.

### Acessibilidade

**A1 — Média — Texto de 10–11 px em elementos importantes.**
- Navegação inferior do celular: rótulos "Hoje / Pedidos / Semana / Novo" a **10 px**.
- Eyebrows em caixa-alta (`UM COMEÇO SIMPLES`, `NOVA ENCOMENDA`, `PERGUNTAS FREQUENTES`) a 10–11 px.
- `Exemplo fictício` na prévia da landing a 10 px (11 px no celular).
- Dica de senha ("Use pelo menos 8 caracteres") e aviso de termos no cadastro a 11 px.
- Selo "Confirmado" no cartão da landing a 11 px.
Para uma usuária de celular, possivelmente com mãos sujas e luz de cozinha, o piso razoável é 12 px (ideal 13+), e a navegação inferior merece 11–12 px.

**A2 — Média — Alvos de toque abaixo de 44 px.**

| Elemento | Tamanho medido | Onde |
|---|---|---|
| "Abrir demonstração" (link no aviso) | 116 × 19 | cadastro |
| "Baixar backup" | 88 × 29 | Hoje |
| "Ver semana" | 73 × 31 | Hoje |
| "Ver exemplo: …" | 242 × 31 | Hoje |
| Logo/`a.brand` | 132 × 31 | app (celular) |
| Checkbox "tem bolo" (`hasCake`) | 15 × 18 | formulário de pedido |

Os campos de formulário (45–49 px) e os botões principais estão bons.

**A3 — Baixa — Indicador de foco dos campos do cadastro é discreto.**
`.field input:focus` remove o `outline` e troca por borda `--sage` + `box-shadow: 0 0 0 2px rgb(66 100 76 / 13%)`. O anel de 13% de opacidade é quase invisível; quem navega por teclado depende só da mudança de cor de 1 px da borda. No formulário de pedido o foco é bem visível (anel verde escuro), então as duas telas estão inconsistentes.

**A4 — Baixa — Hierarquia tonal achatada.**
`--muted` e `--faint` têm o mesmo valor (`#6f5b51`), então "texto secundário" e "texto terciário" são idênticos. Funciona (contraste ok), mas limita o design.

**A5 — Baixa — Faltam estados `prefers-color-scheme: dark`** (o app declara `color-scheme: light`). Não é falha de acessibilidade, só uma observação.

### UX / UI

**U1 — Alta (condicional) — Falha de rede mostra "Failed to fetch" cru, em inglês, sem ação.**
Reproduzido na `/cadastro/` quando a requisição ao Supabase é bloqueada (aqui, pelo painel; na vida real: sem sinal, Wi-Fi ruim, bloqueador de anúncios, VPN). Aparecem juntos o aviso âmbar "O cadastro está sendo preparado…" (HTML estático em `account/index.html`, escondido por JS só depois que o Supabase responde) e uma faixa vermelha com o erro técnico. Mensagens contraditórias, sem botão "Tentar de novo". Em rede lenta, o aviso âmbar também pisca antes de sumir.

**U2 — Média — Estado vazio de "Hoje" no celular deixa metade da tela vazia.**
Com 0 pedidos, a tela mostra um título, um CTA e dois blocos de texto, e cerca de 50% da altura fica em branco acima da barra inferior. Existem três botões chamados "Novo pedido" no DOM (área principal, cabeçalho em telas largas e um terceiro) além do "Novo" da barra inferior; no celular só um aparece de cada vez, mas a redundância complica manutenção e leitores de tela. O estado vazio é a **primeira impressão** de quem clica em "Experimentar sem cadastro".

**U3 — Média — O bloco "Exemplo fictício — não entra na sua agenda" não parece clicável.**
É um `<details>` com `<summary>` em caixa tracejada, sem seta/ícone de expandir. Dentro dele está o botão "Ver exemplo: Marina". Quem não toca no bloco nunca descobre que há um exemplo. É a melhor forma de mostrar o valor do produto sem cadastrar nada.

**U4 — Média — Aviso de armazenamento com entrelinha irregular.**
"Dados salvos neste navegador. Sem sincronização entre aparelhos. Baixar backup" quebra em duas linhas com espaçamento visivelmente maior que o normal e o link solto no fim. Mensagem importante (a pessoa pode perder a agenda ao limpar o navegador), mas visualmente parece rodapé esquecido.

**U5 — Baixa — "Valor total (R$)" abre com `0` preenchido** no formulário de novo pedido, em vez de vazio com placeholder. A pessoa precisa apagar o 0 antes de digitar. `inputmode="decimal"` está correto.

**U6 — Baixa — Datas e horários usam o seletor nativo `datetime-local`.** Funciona e é acessível, mas a experiência varia muito entre Android/iOS/desktop, e `dd/mm/aaaa --:--` em campo único é pesado para "entrega amanhã às 15h". Atalhos ("hoje", "amanhã", "sábado") seriam mais rápidos para quem agenda por conversa.

**U7 — Baixa — Escala tipográfica com muitos tamanhos soltos.**
Landing: 10, 11, 12, 13, 14, 15, 16, 18, 19, 25, 30, 33, 36 e 37 px (14 tamanhos). Cadastro tem um `70px` (decorativo). Não há escala de tokens (`--text-sm`, `--text-md`...). A hierarquia visual funciona, mas a falta de sistema encarece manutenção.

**U8 — Baixa — Desktop do demo usa pouco o espaço.**
Em 1440 px o conteúdo do "Hoje" fica numa coluna larga com muito branco ao redor e blocos sem estrutura de grade. A prioridade do produto é o celular, mas a confeiteira também pode abrir no notebook. (A conferir visualmente; as capturas em 1440 deste relatório são pequenas.)

**U9 — Baixa — Cadastro pede "Confirme a senha"** além de "Mostrar". Como já existe o botão de mostrar senha, o segundo campo é atrito evitável em cadastro de celular. Decisão de produto.

### O que está bom (preservar)

- Paleta quente coesa (`--paper #fbf7f0`, `--coral #a34432`, `--sage #42644c`), com contraste ≥ 4,5:1 em todo texto medido.
- Dupla Lora (títulos) + Manrope (corpo): identidade clara, "caseira mas profissional".
- Formulário de pedido em folha inferior (bottom sheet) com campos de 47 px, `autocomplete` correto (`name`, `tel`, `email`, `new-password`), fonte de 16 px (sem zoom automático do iOS) e divulgação progressiva ("Mais detalhes").
- Copy em português claro, orientada à rotina ("Pare de procurar o combinado no meio da conversa").
- Landing com prévia de produto real (cartão "Hoje") já no primeiro scroll mobile.
- `prefers-reduced-motion` respeitado; nenhuma animação em execução.
- Privacidade: nenhum rastreador, nenhuma fonte externa.

## Anexos

Capturas em `design/auditoria-2026-10-13/` (390 px: landing, cadastro, Hoje vazio, novo pedido; 1440 px: landing, cadastro, Hoje vazio).
