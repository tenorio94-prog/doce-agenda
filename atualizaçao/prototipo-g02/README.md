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

Não verificados: Safari/iPhone, aparelho físico, compreensão com confeiteiras, impacto comercial, conta autenticada ou site publicado. Não houve auditoria completa de acessibilidade. Os três documentos da primeira rodada continuam não localizados; a dependência W1-03 permanece pendente antes de eventual implementação G03.

## Preservação e volta

Base local inicial: `main`, SHA `5715f7a19817b69483e1a08e0e8ab56181c304c4`. Ponto de retorno anterior à publicação: `b55a9dab88eca808bf723617b1e8901b685643fc`. Snapshot do `context.md` e do diff preexistente em `data/prototipo-g02-2026-10-19/`; configurações, sessões e dados privados não foram copiados.

Para encerrar a prévia local, feche a página/encerre o servidor. Para retirar a rota pública, reverta o commit que inclui a prévia no build e republique; o registro `b55a9da` preserva o protótipo anterior. Não há pedidos ou dados de conta para restaurar. Git/GitHub preservam os fontes e documentos, sem configurações locais, credenciais, dados privados ou capturas ignoradas. Novas funcionalidades e mudanças na página inicial dependem de autorização própria.
