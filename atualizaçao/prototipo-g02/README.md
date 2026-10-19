# G02 — prévia das duas apresentações

19/10/2026. Lucas aprovou o protótipo local, depois seu registro no GitHub (`b55a9da`) e, por fim, pediu: “pode publicar no site também, quero ver na prática”. Essa publicação disponibiliza as duas opções em `/previa-g02/`, preservando a página inicial atual e sem implementar G03.

## Abrir

Na raiz do projeto:

```powershell
npm run build
node "atualizaçao/prototipo-g02/preview.mjs"
```

O terminal informa um endereço `http://127.0.0.1:<porta>`. O servidor aceita somente conexões locais e serve apenas o protótipo, o logo, os tokens e três fontes do build. Não serve a raiz do repositório. Encerre com Ctrl+C.

- `/?variante=combinado`: A — “O pedido chega pelo WhatsApp. Guarde o combinado na sua agenda.”
- `/?variante=capacidade`: B — “Antes de aceitar outro bolo, veja se a data cabe.” (padrão)

As variantes têm o mesmo cenário e os mesmos botões. A diferença proposta é a mensagem. O visual usa logo, fontes e cores Comanda; é um recorte para comparar mensagens, não uma substituição de toda a landing atual.

Os três fontes canônicos ficam em `public/previa-g02/`. O build copia apenas HTML, CSS e JavaScript para `/previa-g02/`, com cabeçalhos restritos a essa rota: conexões/formulários bloqueados e indicação `noindex`. Documentos e servidor local não entram no pacote publicado. As variantes públicas usam `/previa-g02/?variante=combinado` e `/previa-g02/?variante=capacidade`; o cadastro continua simulado.

## Hipótese e cenário

Público provisório: confeiteira autônoma com encomendas recorrentes. Hipótese: uma decisão concreta sobre disponibilidade pode explicar o benefício antes do cadastro. Não houve pesquisa com usuárias nem medição de conversão.

Sábado, 24/10/2026: dois pedidos confirmados, limite de dois. Uma solicitação fictícia de bolo de chocolate aguarda revisão, sem ocupar vaga. Domingo, 25/10: um pedido confirmado, limite de dois. Escolher domingo mostra **rascunho simulado**, sem confirmar nem reservar vaga; domingo continua com um de dois pedidos. No app há exceção manual com motivo; o protótipo apenas demonstra a alternativa de outra data.

“Criar minha agenda” mostra um aviso de cadastro simulado, sem formulário ou acesso ao serviço real. Reiniciar ou recarregar restaura o cenário. O exemplo não lê WhatsApp, envia mensagens, persiste dados ou chama serviços. A entrada contextual G03 não foi implementada.

## Verificação local

Playwright/Chromium do projeto; Browser plugin/skill não disponível nesta sessão. Script de conferência e capturas em `data/prototipo-g02-2026-10-19/` (ignorado pelo Git).

- Oito percursos passaram: duas variantes em 320/360/390/1280 px, sem rolagem lateral, fontes carregadas, escolha, reinício, recarregamento, troca de mensagem, saída e cadastro simulado.
- Teclado (foco e Enter), movimento reduzido e mensagens/CTAs com JavaScript desligado passaram. Sem JS, a escolha de data não é interativa e isso é informado.
- Não houve erros de página/console ou falhas de assets. Nenhuma chamada externa/API, escrita HTTP, armazenamento local, sessão ou cookie nos percursos.
- Servidor nega rotas fora da lista e métodos de escrita; CSP bloqueia conexões e formulários.
- `npm run check` passou: 64 regras, build e as 12 suítes de telas do projeto. O teste específico do protótipo também passou após esclarecer que somente a solicitação escolhida continua sem confirmação.
- Inspeção visual comparou referência atual e protótipo: logo, fontes, cores semânticas, textos, CTAs e composição mobile/desktop. O protótipo deliberadamente omite fotos e demais seções da landing para isolar a mensagem e a decisão; os fontes atuais continuam intactos.

Não verificados: Safari/iPhone, aparelho físico, compreensão com confeiteiras, impacto comercial ou conta autenticada. A validação posterior no site publicado está registrada abaixo. Não houve auditoria completa de acessibilidade. Os três documentos da primeira rodada continuam não localizados; a dependência W1-03 permanece pendente antes de eventual implementação G03.

## Publicação conferida em 19/10/2026

- Endereços: [A — Combinado](https://lucast.app/previa-g02/?variante=combinado) e [B — Disponibilidade](https://lucast.app/previa-g02/?variante=capacidade).
- Código na `main`: `b1bddb6`. Cloudflare: `b52a64ec-5d24-46c2-874d-62dc06524a16`, confirmado ativo com 100% do tráfego. Este registro documental posterior não exige outra publicação.
- `npm run check` repetido antes da publicação passou: 64 regras, build, 12 suítes. Comparação de hashes antes e depois do build automático do Wrangler: 127 arquivos anteriores idênticos; só os três assets da prévia e `_headers` adicionados.
- No endereço real, sem interceptar arquivos: oito percursos A/B em 320/360/390/1280 e conteúdo/CTAs com JavaScript desligado passaram. Verificados: escolha, reinício, reload, teclado, troca de variante, links internos, cadastro simulado, fontes, ausência de rolagem lateral e isolamento de dados.
- Cabeçalhos CSP e `X-Robots-Tag` conferidos no HTML e assets publicados; não afetam a landing, demo ou cadastro. Endereço sem barra redireciona preservando a variante. JS e CSS publicados comparados byte a byte com o build; HTML conferido por conteúdo e navegação, sem alegar igualdade binária. As cinco rotas existentes passaram em `scripts/test-cloudflare-routing.mjs` no `lucast.app`.
- Uma tentativa inicial do teste leu `aria-current` enquanto a nova página ainda estava em `interactive`. Diagnóstico mostrou a variante correta em `complete`, sem erro de página; o teste passou ao aguardar a renderização. Nenhuma correção do produto ou segunda publicação foi necessária.
- O Analytics já existente, injetado pela zona Cloudflare, foi bloqueado pela CSP da prévia. Aviso separado dos erros funcionais; nenhuma permissão foi afrouxada e o painel não foi alterado. Não houve chamada externa bem-sucedida ou gravação em conta/armazenamento nos percursos.
- Evidências, capturas, tentativa inicial e diagnóstico em `data/publicacao-g02-2026-10-19/` (ignorado pelo Git). Mesmos limites de navegador/aparelho/pesquisa acima; nenhuma validação comercial.

## Preservação e volta

Base local inicial: `main`, SHA `5715f7a19817b69483e1a08e0e8ab56181c304c4`. Ponto de retorno anterior à publicação: `b55a9dab88eca808bf723617b1e8901b685643fc`. Snapshot do `context.md` e do diff preexistente em `data/prototipo-g02-2026-10-19/`; configurações, sessões e dados privados não foram copiados.

Para encerrar a prévia local, feche a página/encerre o servidor. Para retirar a rota pública, reverta o commit que inclui a prévia no build e republique; o registro `b55a9da` preserva o protótipo anterior. Não há pedidos ou dados de conta para restaurar. Git/GitHub preservam os fontes e documentos, sem configurações locais, credenciais, dados privados ou capturas ignoradas. Novas funcionalidades e mudanças na página inicial dependem de autorização própria.
