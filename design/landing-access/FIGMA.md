# Entrega no Figma

Arquivo: https://www.figma.com/design/TvzslJHCfjpRrwHqqXFQNw

Equipe: Lucas Tenorio's team. Criado novo, sem modificar arquivos anteriores.

## Telas e navegação

| Tela | Node ID |
| --- | --- |
| Landing desktop 1440 px | 2:28 |
| Landing mobile 390 px | 2:139 |
| Cadastro | 2:252 |
| Entrada | 2:308 |
| Recuperação | 2:360 |
| Confirmação de e-mail | 2:408 |
| Configuração da confeitaria | 2:452 |
| Primeiro pedido | 2:500 |
| Prévia da agenda | 2:570 |
| Confirmação de recuperação | 2:617 |

Botões têm reações ON_CLICK. Landing conduz ao cadastro; entrada conduz à prévia da agenda; cadastro → confirmação → configuração → primeiro pedido → prévia. Recuperação tem confirmação neutra e volta à entrada. Conhecer o piloto abre a aplicação pública atual. Figma não autentica, não valida dados digitados nem salva pedidos: é um projeto visual com navegação entre frames.

## Estrutura editável

586 nodes foram retornados pela composição inicial; depois foram adicionados dois botões de entrada ao cabeçalho. Textos são camadas nativas, cartões e grupos usam auto-layout, logo é SVG vetorial da marca. Não foi usado screenshot achatado como tela final. Três componentes locais: botão principal, botão secundário e campo. Dez variáveis de cor, cinco estilos tipográficos, um estilo de sombra. Fontes Lora e Manrope disponíveis e carregadas antes da criação. Capa identifica escopo, referências e dependência da etapa C.

As bibliotecas disponíveis foram consultadas e a busca encontrou componentes genéricos do Simple Design System. O projeto não possui Code Connect nem telas anteriores no arquivo. Foram criados componentes próprios para preservar a marca; a estrutura de acesso adapta a referência Tailark/21st.dev documentada em DIRECAO.md e sob MIT em references/. Não é uma importação de componentes React para o Figma.

## Revisão e limite real

Capturas da landing desktop, cadastro, primeiro pedido e configuração foram examinadas. Foram corrigidas alturas automáticas de texto e de blocos horizontais antes das capturas finais. Cabeçalhos ganharam botão Entrar; a chamada principal ganhou destaque terracota e os rótulos de botão passaram a preencher sua largura responsiva.

Durante a solicitação de capturas das demais telas, o MCP informou que o plano Starter atingiu o limite de chamadas. As dez telas já existem; não foi possível completar a revisão visual individual de landing mobile, entrada, recuperação, confirmação de e-mail, prévia da agenda e confirmação de recuperação. Não foi contratado upgrade. Capturas disponíveis em prints/figma-*.png. Os IDs acima podem ser usados para retomar somente a revisão pendente.

O protótipo HTML teve revisão separada: 32 layouts e fluxos de formulário simulados passaram. Isso não substitui a revisão visual pendente dessas seis telas no Figma.

## Código

figma-build.js contém a composição-base; o SVG é injetado de public/logo.svg. A ordem das propriedades foi corrigida no arquivo para que resize não desative altura automática. Os últimos ajustes de cabeçalho e rótulos foram aplicados no Figma depois da composição inicial e estão descritos acima. Não rodar a composição inteira de novo no mesmo arquivo: criaria duplicatas. Para edição contínua, usar os nodes existentes.

Animações são diretrizes para implementação: ease-out 160–220 ms, feedback por ponteiro, foco visível, respeito a movimento reduzido e navegação instantânea no Figma. Não há animações de produção implementadas por este arquivo.
