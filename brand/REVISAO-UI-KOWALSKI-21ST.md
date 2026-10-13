# Doce Agenda — revisão de interface

Data: 2026-10-01. Avaliação solicitada após a publicação da identidade v2.

## Escopo e fontes

- Aplicação pública: https://doce-agenda-piloto.netlify.app/
- Código examinado: public/index.html, public/style.css, public/app.js e package.json.
- Telas abertas: Hoje, novo pedido, detalhe do exemplo fictício e Semana. Nenhum pedido ou pagamento foi criado ou alterado.
- Skill instalada no escopo deste projeto: [emil-design-eng](C:/Users/Restore/Documents/ebooks/.agents/skills/emil-design-eng/SKILL.md). Fonte: https://github.com/emilkowalski/skills/tree/main/skills/emil-design-eng. Licença MIT incluída junto da instalação.
- Referência: https://21st.dev/. Luna auxiliou na leitura do catálogo e na revisão estática dos estilos; a seleção e a avaliação de produto ficaram com o agente principal.

O viewport mobile foi configurado para 390 × 844. A medição DOM mostrou innerWidth de aproximadamente 391 px e scrollWidth de 376 px, sem overflow horizontal global nessa configuração. A captura mobile apresentou problemas de recorte/timeout da ferramenta; ela não é evidência de corte horizontal no produto. Esta revisão combina estrutura, medidas DOM e inspeção visual em desktop, sem teste em aparelho físico ou auditoria completa WCAG.

## Direção recomendada

Preservar creme, terracota, sálvia, Lora e Manrope. Refinar hierarquia e comportamento para consultar prazo, registrar combinado e conferir recebimento durante uma rotina corrida.

A identidade já diferencia o produto do catálogo tecnológico do 21st. O ganho da próxima rodada está na organização e nos pequenos estados de interação. Esta é uma recomendação de design, ainda não validada com confeiteiras.

## Recomendações de produto e layout

| Before | After | Why |
| --- | --- | --- |
| Hoje coloca saudação, data, aviso do piloto e quatro cartões antes da agenda | Cabeçalho compacto com Hoje/data; agenda e ações pendentes primeiro; resumo financeiro em área mais compacta | Colocar o trabalho do dia no início da consulta |
| Banner extenso do piloto reaparece na tela principal, junto de Como começar | Orientação de primeiro uso com escolhas Ver exemplo / Criar pedido; nota curta sobre dados neste navegador e backup sempre acessível | Explicar o piloto sem ocupar continuamente o espaço operacional; manter a informação sobre armazenamento |
| Novo pedido abre com 12 campos. Na emulação, formulário mede cerca de 1.344 px e dialog cerca de 760 px | Exibir cliente, produto, prazo, valor e situação; agrupar detalhes, contato e acompanhamento em seções opcionais. Orçamento pode continuar sem data | Reduzir a extensão inicial sem retirar campos ou mudar as regras existentes |
| Navegação fica acima do conteúdo; inputs do cadastro usam 14 px | Avaliar barra inferior fixa Hoje/Pedidos/Semana, ação Novo pedido ao alcance do polegar, campos de 16 px e espaço para safe areas | Tornar controles recorrentes fáceis de alcançar e campos mais legíveis. Preservar foco, teclado e espaço de conteúdo |
| Valores de resumo usam Manrope com peso normal; texto Ainda não conferido recebe a mesma apresentação de um número grande | Peso 650–700 para dinheiro, números tabulares, contexto de conferência em texto menor; cartões financeiros podem ocupar linha inteira em telas estreitas | Dar hierarquia aos valores e acomodar quantias maiores sem truncamento |
| Cliente e produto nas linhas usam nowrap/ellipsis; situação fica na lateral | Nome/produto com até duas linhas quando necessário, horário com destaque e status textual de posição estável | Mostrar o combinado essencial antes de abrir detalhes |
| Saldo global soma apenas pedidos com saldo calculável; a nota menciona somente pedidos confirmados | Informar quando o total é parcial e quantos pedidos aguardam conferência. Explicar claramente valor dos pedidos versus recebido conferido | Evitar leitura de um subtotal como saldo completo ou dinheiro já recebido |

### Regra de saldo a validar antes de implementar

Em public/app.js, balanceFor só calcula saldo quando a situação é exatamente Confirmado e existe pelo menos um pagamento Conferido. renderToday filtra saldos nulos e soma os restantes. Assim, parte da carteira pode ficar fora do número mostrado.

Além disso, mudar um pedido de Confirmado para Em produção/Pronto muda sua participação no resumo financeiro e o rótulo no detalhe. Precisamos decidir se Confirmado significa uma etapa exclusiva ou uma condição comercial que permanece durante a produção. Não alterar essa regra silenciosamente na rodada visual.

### Detalhe existente a valorizar

O detalhe já reúne combinado, prazo, total, saldo, pagamentos, histórico e Copiar resumo para WhatsApp. A opção de copiar foi observada no site público; ela copia texto, não envia mensagem nem sincroniza com WhatsApp. Eu daria mais destaque à conferência e ao saldo e colocaria o histórico em seção expansível.

## Refinamentos orientados pela skill

| Before | After | Why |
| --- | --- | --- |
| style.css:45–46 e 87–88: hover move botões/cartões sem limitar o tipo de ponteiro | Usar hover apenas com (hover: hover) and (pointer: fine) | Evitar estados de mouse persistentes em dispositivos de toque |
| Botões não possuem estado :active | Feedback breve de pressão, por exemplo scale(0.97) em 100–160 ms, sem alterar o tamanho de layout | Confirmar visualmente o toque |
| style.css:63–64 usa entrada de painel de 220 ms com deslocamento; não há regra prefers-reduced-motion | Troca de abas rápida; entrada sutil apenas quando ajuda a orientação; retirar deslocamento quando movimento reduzido estiver ativo | Ajustar animação à frequência de uso e à preferência da pessoa |
| app.js:380 usa scroll suave incondicional; spinner é contínuo | Respeitar movimento reduzido também no scroll; manter indicador de carregamento compreensível sem depender de rotação | Aplicar a preferência além dos estilos do painel |
| Detalhes e formulários abrem abruptamente via dialog | Considerar entrada discreta de 180–240 ms, ease-out, com fechamento mais rápido; preservar dialog nativo e gestão de foco | Orientar a mudança de contexto sem atrasar tarefa ou adicionar biblioteca só para efeito |

Não recomendo números financeiros com contagem animada, animações decorativas contínuas ou cascatas demoradas nas listas. Movimento deve confirmar uma ação ou ajudar a entender uma mudança.

## O que aproveitar do 21st.dev

O site é um catálogo de componentes e templates de vários autores, orientado a React, Tailwind e convenções shadcn. O Doce Agenda atual usa HTML/CSS/JavaScript; os padrões podem ser adaptados à estrutura existente.

As referências úteis são navegação com seleção clara, badges textuais, listas com hierarquia, disclosures/accordions para detalhes opcionais e feedback de ação. Na apresentação do produto, título concreto, interface real e uma chamada principal são padrões úteis.

Shaders, metal líquido, brilho em botões e cartões 3D da vitrine não ajudam a consultar encomendas. O catálogo serve para escolher soluções específicas; ele não determina a identidade do app. Nenhum componente do 21st foi instalado ou reutilizado nesta avaliação. Se houver reutilização futura, consultar a licença do componente escolhido.

## Ordem de execução sugerida

1. Reorganizar Hoje e simplificar o cadastro, mantendo todos os dados e regras atuais.
2. Esclarecer o resumo financeiro e validar a participação de Em produção/Pronto nos saldos.
3. Refinar navegação mobile, tipografia e estados de toque/foco/movimento reduzido.
4. Fazer a revisão em aparelhos reais e observar a primeira confeiteira usando o fluxo.

Esta rodada instalou a skill e registrou a avaliação. Não alterou nem republicou a aplicação.
