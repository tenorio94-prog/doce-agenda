# Doce Agenda — orientações para o agente

## Ao começar

1. Leia `context.md` antes de propor ou executar trabalho. Ele registra o estado conhecido, decisões e pendências; **não autoriza automaticamente a próxima etapa**.
2. Confira `git status`, branch e arquivos relevantes. Preserve alterações existentes. `main` é a base de trabalho.
3. Consulte somente os documentos do assunto em andamento. Mapa do código, riscos e plano de refatoração: `docs/ARQUITETURA.md`. Documentos em `docs/historico/` são só registro; diante de divergência, vale o código, depois `context.md`.
4. Respeite instruções mais recentes do usuário. Não retome tarefas explicitamente adiadas apenas porque aparecem no contexto.

## Como trabalhar com Lucas

- Converse em português brasileiro, com clareza e concisão. O usuário não é técnico e costuma acessar pelo celular. Explique o resultado e a próxima ação concreta; evite jargão e listas extensas de decisões técnicas.
- Poupe tokens: leitura direcionada, mudanças delimitadas e verificações proporcionais. Não reexecute auditorias completas sem necessidade.
- Prefira decisões rotineiras por conta própria dentro do escopo autorizado. Pergunte por informação indispensável, ação sensível ou escolha que afete o produto.
- **Entregas por etapas:** implementar, testar, publicar e relatar uma feature por vez, com commit separado. Pare e peça autorização antes de começar a próxima feature.
- **Mudança aprovada vai até o fim:** depois que Lucas aprova o que foi planejado, faça commit, push para `main` e publique no site sem pedir de novo; confira o endereço publicado. Ainda peça autorização para banco/Supabase, dados reais, política de privacidade, DNS/domínio/e-mail, serviços pagos, apagar dados, ou quando um teste falhar ou não for possível verificar.
- A preferência vigente é trabalhar **sem subagentes**, após pedidos anteriores de delegação. Siga a preferência mais recente; não reative delegação nem mude modelos/configuração global por iniciativa própria.
- Ao terminar uma etapa, atualize `context.md` com alterações, verificações, publicação e pendências. Registre resultados reais; diferencie implementado, testado e publicado.

## Regras do produto e dos dados

- Mobile primeiro: 360 px, sem rolagem horizontal, controles legíveis e estados de vazio/erro claros.
- Preserve a identidade atual em `public/tokens.css`, `public/logo.svg` e estilos reais. Não reintroduza trevos, calendários decorativos ou a identidade antiga sem pedido.
- Só pagamentos `Conferido` entram no recebido. `Informado` não é dinheiro confirmado; um lançamento conferido de zero não significa sinal pago.
- Novos cálculos financeiros usam centavos inteiros. Os campos legados em reais continuam existentes: converta na fronteira e não regrave valores antigos silenciosamente.
- Use `America/Sao_Paulo` para calendário; semana de segunda a domingo. `dueAt` legado sem offset é horário local de São Paulo.
- Resumos de negócio são calculados no servidor sobre os dados completos da conta. A demonstração local é separada do serviço com conta.
- Todo acesso de dados deve respeitar a conta autenticada. Preserve JWT, verificação do usuário, RLS, revisão otimista e limites contra abuso; nunca exponha credenciais administrativas no frontend.
- Campos novos devem ser compatíveis com pedidos/backups antigos e entrar em exportação/restauração. Atualize a política antes de liberar novos tratamentos de dados pessoais.
- Solicitações pelo link exigem revisão; não confirmar automaticamente e não reservar capacidade com solicitações pendentes. WhatsApp é abertura manual de conversa/cópia de mensagem, sem envio automático ou API de mensagens.

## Publicação e Git

- Hospedagem atual: Cloudflare Workers Static Assets; backend/auth: Supabase. Consulte `docs/CLOUDFLARE_PUBLICACAO.md` antes de publicar.
- **DNS/domínio:** `lucast.app` já aponta para a Cloudflare (ver `context.md`, seção 7). Qualquer passo externo — registros, e-mail, domínio, painel da Cloudflare — só com Lucas acompanhando e aprovando; preservar o e-mail `@lucast.app`. Não contratar serviços nem alterar planos pagos.
- Não há servidor local. Para ver o site, monte com `npm run build` e sirva `deploy-cloud/public` com um servidor estático simples.
- Edite os fontes em `public/` e `cloud/`; não mantenha correções apenas em `deploy-*/public`. Esses diretórios são builds ignorados pelo Git.
- Cloudflare usa `scripts/build-cloudflare.mjs`/`wrangler.jsonc`. Preserve o proxy `/p/:slug /encomenda/ 200`: usar `/encomenda/index.html` perde o slug por redirecionamento.
- Nunca publique a raiz do repositório. Publique somente `deploy-cloud/public`. Não versionar sessões, senhas, tokens, `.env`, `.wrangler/` ou dados de clientes.
- Commit e push não equivalem a deploy. Informe branch/commit e endereço realmente verificado. `main` é a base de trabalho e recebe push direto das mudanças aprovadas.

## Fluxo de trabalho

Proporcional ao tamanho: um ajuste de texto não precisa de plano; mudança de regra, dados ou várias telas precisa.

1. **Entender:** reler o pedido, achar o código envolvido e dizer o que vai mudar e o que não muda. Pergunte se faltar informação de produto.
2. **Critério de aceite:** antes de programar, escreva como saber que deu certo (comportamento visível, teste que passa, tela igual).
3. **Pesquisar e escolher:** reaproveite o que existe (`cloud/`, `public/ui/`, tokens). Para nova biblioteca, consulte a documentação oficial e compare com fazer sem ela; só adicione com ganho claro, versão fixa e servida pelo nosso domínio (BRAND.md).
4. **Mudar pouco e por partes:** um assunto por commit; preserve contratos (rotas `/api`, formato do estado e dos backups, `name` dos campos, chaves do `localStorage`). Refatoração não muda comportamento nem regras financeiras.
5. **Verificar** (abaixo), corrigir regressões e só então entregar.
6. **Registrar:** `context.md` (estado) e, se for decisão de arquitetura, `docs/ARQUITETURA.md` em uma ou duas linhas.

## Verificação

- Comandos: `npm test` (regras), `npm run build`, `npm run test:ui` (telas na demo: lista da semana, formulário, Meu mês, pagamentos), `npm run check` (os três). Testes de tela usam o Playwright do projeto (`scripts/lib/browser-test.mjs`).
- Escolha pelo risco: regra → `npm test`; tela → `npm run check` e olhar no navegador em 360 e 1280 px; refatoração → também `npm run screens -- <pasta>` antes e depois e `node scripts/capture-screens.mjs --compare <antes> <depois>` (deve dar zero diferenças); publicação → `scripts/test-cloudflare-routing.mjs` e o endereço publicado.
- Em interface, verifique o fluxo real e a renderização mobile; em publicação, teste o endereço publicado, não apenas o build local.
- Integrações que escrevem dados usam exclusivamente contas sintéticas identificadas por `.invalid`; confirme a conta e preserve/restaure seu estado. Não executar scripts de setup contra contas reais.
- Não declarar resolvido por uma tentativa de comando. Conferir saída, status e resultado; diante de falha repetida, diagnosticar antes de repetir.
- Não considerar um teste com arquivos interceptados como evidência de publicação real. Não declarar validação em banco físico, Safari, aparelho real ou com confeiteiras se isso não aconteceu.

