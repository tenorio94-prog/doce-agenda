# Doce Agenda — orientações para o agente

## Ao começar

1. Leia `context.md` antes de propor ou executar trabalho. Ele registra o estado conhecido, decisões e pendências; **não autoriza automaticamente a próxima etapa**.
2. Confira `git status`, branch e arquivos relevantes. Preserve alterações existentes. Não substitua o código atual pela `main`: ela está atrasada em relação à branch de trabalho.
3. Consulte somente os documentos do assunto em andamento. O `README.md` principal e parte dos documentos antigos ainda descrevem o piloto local, anterior ao login e ao Supabase; confira a data, `context.md` e o código antes de confiar neles.
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
- **DNS/Name.com:** o usuário retomou o assunto e quer ser guiado (ver `context.md`, seção 7). Cada passo externo — nameservers, registros, e-mail, domínio — só com ele acompanhando e aprovando; preservar o e-mail `@lucast.app`. Não contratar serviços nem alterar planos pagos.
- `npm start` é o servidor local separado; não é uma prévia fiel do serviço publicado com conta.
- Edite os fontes em `public/` e `cloud/`; não mantenha correções apenas em `deploy-*/public`. Esses diretórios são builds ignorados pelo Git.
- Cloudflare usa `scripts/build-cloudflare.mjs`/`wrangler.jsonc`. Preserve o proxy `/p/:slug /encomenda/ 200`: usar `/encomenda/index.html` perde o slug por redirecionamento.
- Nunca publique a raiz do repositório. Publique somente `deploy-cloud/public`. Não versionar sessões, senhas, tokens, `.env`, `.wrangler/` ou dados de clientes.
- Commit e push não equivalem a deploy. Informe branch/commit e endereço realmente verificado. `main` é a base de trabalho e recebe push direto das mudanças aprovadas.

## Verificação

- Escolha testes pelo código alterado: regras em `cloud/*.test.mjs`, servidor local em `test.mjs`, resumo em `scripts/test-monthly-summary.mjs`, pagamentos em `scripts/test-payment-stamps.mjs`, rotas publicadas em `scripts/test-cloudflare-routing.mjs`.
- Em interface, verifique o fluxo real e a renderização mobile; em publicação, teste o endereço publicado, não apenas o build local.
- Integrações que escrevem dados usam exclusivamente contas sintéticas identificadas por `.invalid`; confirme a conta e preserve/restaure seu estado. Não executar scripts de setup contra contas reais.
- Não declarar resolvido por uma tentativa de comando. Conferir saída, status e resultado; diante de falha repetida, diagnosticar antes de repetir.
- Não considerar um teste com arquivos interceptados como evidência de publicação real. Não declarar validação em banco físico, Safari, aparelho real ou com confeiteiras se isso não aconteceu.

Referência do formato: [documentação oficial da OpenAI sobre instruções AGENTS.md](https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide).
