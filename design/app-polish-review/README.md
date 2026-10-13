# Doce Agenda — refinamento visual do aplicativo

Alteração de apresentação em `public/style.css`, com as telas e regras existentes preservadas. Luna executou CSS e preparação da revisão; agente principal definiu escopo, revisou telas, corrigiu problemas e publicou. Refinamento pontual do sistema visual existente: não requer fotografia nem um novo conceito raster para os fluxos operacionais.

| Antes | Depois | Por quê |
| --- | --- | --- |
| Regras tipográficas repetidas e fontes serifadas declaradas em valores | Títulos usam Lora; valores usam Manrope com numerais tabulares | Consolidar a identidade e facilitar a comparação de valores |
| Textos auxiliares compactos e botões pequenos | Orientações maiores e controles principais de 44px ou mais | Facilitar leitura e toque |
| Cards de superfície plana | Bordas discretas e sombras muito suaves | Dar hierarquia sem preencher a agenda de decoração |
| Cabeçalho mobile com duas ações equivalentes para criar pedido | A ação Novo permanece na barra inferior; cabeçalho libera espaço para Backup e Restaurar em até500px | Preservar acesso ao pedido e às cópias de dados |
| Semana excedia a largura em320px | Cabeçalho e controles em duas linhas, dias em colunas que podem encolher | Manter toda a navegação acessível sem rolagem da página para os lados |
| CTA de pedidos quebrava o rótulo | Rótulo preservado em uma linha | Melhorar clareza e acabamento |

## Verificação

Na pasta web:

```powershell
node scripts/build-launch-site.mjs
node scripts/review-app-visual.mjs
node scripts/test-deploy.mjs
node scripts/test-launch-site.mjs
```

Capturas `LOCAL` e `LIVE`: Hoje desktop/mobile, Pedidos, Semana, formulário320/390, detalhe da encomenda e registro de recebimento. Dados são exclusivamente fictícios, em perfis novos; os testes não consultam a agenda real de nenhuma pessoa. Browser plugin não listado: usado Playwright existente para emulação/capturas e CUA para revisão complementar do publicado.

Foi corrigido overflow real na Semana em320px. O teste de regressão passou a clicar no botão Novo visível da barra mobile, em vez de exigir o botão duplicado oculto do cabeçalho; nenhum assert comercial foi removido.

Testes locais passaram: cadastro, persistência, pagamentos e saldo, edição, fontes, layouts320/390/430/1440 e reducedmotion, disponibilidade, capacidade/exceção, modelo de bolo, rótulos anteriores e restauração/backup. Verificação de navegação landing→agenda também passou. Sem erros JavaScript ou tráfego `/api` à rede no piloto.

Não houve alteração de HTML, JavaScript de negócio, armazenamento, autenticação ou sincronização. Layouts foram revisados em screenshots; aparelho físico e leitor de tela não foram verificados. A origem e a chave de armazenamento do navegador permanecem as mesmas.

## Publicação

Deploy Netlify `6ac6ed27aa22e1f42cf30f6b`, estado ready confirmado por CLI e conector. Aplicativo: https://doce-agenda-piloto.netlify.app/app/. Revisão LOCAL e LIVE passou, incluindo3pedidos/2pagamentos fictícios; navegação landing→app e persistência também passaram no endereço publicado. Semana verificada via Chrome/CUA; captura LIVE de Pedidos inspecionada.
