# Arquitetura — mapa, riscos e plano gradual

Atualizado em 15/10/2026. Descreve o código como está e as decisões que orientam mudanças. Estado do produto e pendências ficam em `context.md`.

## Mapa

| Parte | Onde | Observação |
| --- | --- | --- |
| App (demo e conta) | `public/index.html`, `public/app.js`, `public/style.css`, `public/tokens.css` | `app.js` é script clássico (sem `import`), copiado sem empacotar. Estado global `state`, telas montadas com `innerHTML`, um `handleClick` central por `data-action`. |
| Acesso a dados | `public/data-client.js` → `window.DoceApi.fetch` | Demo: `browser-store.js` (gerado de `cloud/browser-adapter.js`, roda `state-engine` no navegador). Conta: `cloud/app-bootstrap.js` (sessão Supabase, revisão otimista). O app só conhece rotas `/api/...`. |
| Regras | `cloud/state-engine.js`, `monthly-summary.js`, `order-link-model.js`, `public-orders.js` | Usadas pelo servidor (`doce-api.ts`, `public-api.ts`) e pela demo. Testadas com `npm test`. |
| Componentes e animação | `public/ui/` (Web Awesome), `public/landing/main.js` (Motion) | Empacotados pelo build e servidos pelo nosso domínio. |
| Build | `scripts/build-cloudflare.mjs` | Monta `deploy-cloud/public`. Demo e conta saem do mesmo `app.js`; as diferenças de texto são trocas que falham se o texto sumir. |
| Testes de tela | `scripts/test-*.mjs` + `scripts/lib/browser-test.mjs` | Playwright do projeto e servidor estático comum. `npm run test:ui`. |

## Riscos conhecidos

1. **Regras repetidas no app.** `app.js` redefine as situações, os padrões de disponibilidade e do modelo de bolo, "comprometido" e a soma do que foi conferido, separados de `state-engine.js`. Uma mudança em um lado pode não chegar ao outro.
2. **App sem módulos.** Como `app.js` não passa pelo esbuild, não pode reaproveitar `cloud/` nem ser testado em partes sem navegador.
3. **Diferença demo/conta por troca de texto no build.** Seguro (falha alto), mas frágil para edições; o certo é o app ler o modo em tempo de execução (`DoceApi.mode`).
4. **`style.css` em camadas sobrepostas.** Em migração tela por tela no polimento (`context.md`, 7d).
5. **Testes antigos sem manutenção** (`test-ux-improvements`, `test-deploy`, `review-today`, `test-account-ui`, `cloud/test-order-link-e2e`, `cloud/test-monthly-live`) ainda importam Playwright de um caminho fixo de outra máquina/ferramenta. Atualizar só quando forem usados.

## Plano gradual (cada etapa com aprovação própria)

1. **Feita:** instruções dos agentes, base comum dos testes de tela, capturas antes/depois (`npm run screens`) e comandos `npm run check`.
2. **App passa pelo esbuild** com o mesmo comportamento: entrada única, saída IIFE, e o modo demo/conta lido em tempo de execução no lugar das trocas de texto. Prova: build, `test:ui` e capturas idênticas.
3. **Regras compartilhadas:** extrair constantes e regras puras (situações, etapas, conferido, falta o sinal) para um módulo usado por app e servidor, com testes em Node. Nada muda no servidor além de importar o mesmo módulo.
4. **Dividir o app por tela** (Agenda, Pedidos, Meu mês, Ajustes/Link, formulário, boas-vindas) com `state` e acesso a dados próprios. Poucos módulos médios, não dezenas de arquivos.
5. **CSS por responsabilidade** junto com as etapas C–E do polimento.
6. Depois da etapa 3, avaliar `// @ts-check` com JSDoc nos módulos de regras (TypeScript só como verificador, sem compilar o app).

## Decisões

- HTML/CSS/JS puro, sem framework de componentes; bibliotecas só pelo npm, com versão fixa, servidas pelo nosso domínio (BRAND.md).
- Playwright `1.62.1` fixo como devDependency (15/10/2026): os testes de tela rodam em qualquer sessão e usam o Chromium já instalado em `%LOCALAPPDATA%\ms-playwright`.
- Refatoração de frontend não muda backend, banco, autenticação nem regras financeiras.
- Prova de "nada mudou": arquivos do build iguais (md5) quando a mudança não toca o site; capturas iguais pixel a pixel quando toca.
