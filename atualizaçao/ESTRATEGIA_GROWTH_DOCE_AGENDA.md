# Doce Agenda — Estratégia de Product Growth e Revenue-Centric Design

**Segunda rodada | 18 de outubro de 2026 | Sem implementação**

## 0. Escopo e qualidade da evidência

**Documentos lidos antes da análise:** `AUDITORIA_DOCE_AGENDA.md`, `ROADMAP_DOCE_AGENDA.md` e `PROMPT_CODEX_DOCE_AGENDA.md` (primeira rodada). Esta auditoria **não substitui** a correção técnica W1-01 nem altera sua autorização. A referência metodológica é a skill [Revenue-Centric Design](https://github.com/heliocosta-dev/revenue-centric-design), especialmente [posicionamento](https://github.com/heliocosta-dev/revenue-centric-design/blob/main/references/positioning-icp-and-gtm.md), [conversão](https://github.com/heliocosta-dev/revenue-centric-design/blob/main/references/conversion-and-landing-pages.md), [ativação](https://github.com/heliocosta-dev/revenue-centric-design/blob/main/references/onboarding-and-activation.md), [retenção](https://github.com/heliocosta-dev/revenue-centric-design/blob/main/references/churn-and-retention.md), [preços](https://github.com/heliocosta-dev/revenue-centric-design/blob/main/references/pricing-and-monetization.md), [features](https://github.com/heliocosta-dev/revenue-centric-design/blob/main/references/product-strategy-and-features.md) e [experimentação](https://github.com/heliocosta-dev/revenue-centric-design/blob/main/references/metrics-and-experimentation.md). **Esses princípios são heurísticas, não demonstração causal de ganho de conversão.**

**Legenda usada ao longo do documento:** [C] confirmado em código do GitHub nesta sessão; [A1] relatado/documentado na primeira auditoria; [P] declarado por terceiros nas páginas públicas, sem auditoria independente; [H] hipótese sobre clientes; [J] julgamento ou recomendação desta consultoria; [NV] não verificado por navegação real.

**Limites:** o navegador conectado exigiu contexto de extensão que não estava disponível. O acesso web ao domínio publicado falhou; **não executei fluxos no site ao vivo nem produzi screenshots novos**. Consultei novamente `context.md`, `public/landing/index.html`, `public/landing/main.js`, `public/app.js`, `cloud/app-bootstrap.js`, `public/account/config.js` e `BRAND.md` pelo conector GitHub, além dos documentos anteriores. As capturas da primeira rodada são históricas; não representam teste desta sessão. Sem telemetria de produção, entrevistas, preço validado, cohortes, funil medido, conta real, testes de usabilidade próprios ou prova da versão implantada ser idêntica à branch `main`. Nenhuma conclusão comercial deste documento deve ser lida como resultado observado.

## 1. Diagnóstico executivo e tese de negócio

**[J] Potencial: real, porém não validado comercialmente.** O produto já materializa decisões que importam a uma confeiteira: solicitação recebida sem aceitar automaticamente, limite de pedidos por data, etapas de produção, carimbo do recebimento *conferido* e histórico. O desafio não é provar que a tecnologia existe: é provar que uma confeiteira com encomendas recorrentes irá **abandonar parte do método atual** para registrar e consultar o Doce Agenda toda vez que assumir um compromisso.

A alternativa mais difícil de vencer não é outro SaaS: é **WhatsApp + memória + caderno/planilha**, algo conhecido, gratuito no desembolso e disponível sem configuração. A troca só é racional se o custo percebido de copiar/manter pedidos for compensado por menos consultas a conversas, menos dúvida sobre disponibilidade, melhor coordenação e maior controle das cobranças. Esse saldo não foi medido. O dado do [Sebrae, 16/04/2026](https://agenciasebrae.com.br/dados/whatsapp-se-consolida-nas-vendas-on-line-enquanto-facebook-e-lojas-proprias-perdem-folego/) — WhatsApp como principal canal para 82% de MEIs/MPEs da pesquisa — é um sinal sobre pequenos negócios em geral, **não** um levantamento específico de confeitarias.

**[J] Tese central a testar:** "Doce Agenda é a *comanda de cada encomenda*, conectando o combinado, a data em que ela cabe, a próxima ação e o pagamento efetivamente conferido. O WhatsApp continua para conversar; o Doce Agenda guarda o compromisso." Evitar "ERP completo", "ganhe mais vendas", "não perca nunca um pedido", "automatizamos seu WhatsApp" e "lucro" (o app não calcula lucro).

**[J] Status atual:** o Doce Agenda parece **conveniente e promissor** para a persona certa; só se torna **difícil de substituir** quando toda encomenda relevante entra nele, as próximas ações são consultadas em dias úteis e a usuária confia no histórico e nos recebimentos. Isso ainda precisa ser observado, não proclamado.

## 2. ICP: para quem começar, para quem não começar

| Segmento [H] | Dor provável | Aderência atual | Dificuldade de adoção | Decisão [J] |
|---|---|---|---|---|
| A. Iniciante, pedidos esporádicos | Conhecer a própria demanda; divulgar catálogo | Vitrine, primeiros passos | Pouca necessidade da agenda; baixa urgência de pagar | Não priorizar aquisição paga; pode usar demo/grátis |
| B. Autônoma que já vende regularmente, recebe via WhatsApp/Instagram e concilia produção, sinal e retirada | Compromissos espalhados; dias cheios; cobrança; tempo de resposta | Melhor encaixe entre Agenda, Pedidos, link, carimbo e Clientes | Precisa mudar hábito de registrar pedido | **ICP inicial recomendado** |
| C. Confeitaria com equipe, loja, estoque e entregas complexas | Compras, escalas, inventário, custo e permissões | Parte do fluxo de pedidos, mas faltam operações completas | Expectativa de ERP amplo e suporte maior | Não vender como solução integral agora |

**ICP operacional provisório [J]:** confeiteira autônoma, ou microateliê com uma pessoa responsável por pedidos, que produz **sob encomenda**, já tem fluxo recorrente (ex.: várias encomendas em semanas ocupadas), decide capacidade por data, recebe sinal/parcelas e negocia pelo WhatsApp. Não definir limite rígido de pedidos sem dados; os exemplos numéricos servem para recrutar diversidade, não como corte estatístico. **Dor disparadora**: já precisou procurar combinados em mensagens, hesitou ao aceitar mais um pedido, esqueceu o saldo ou teve de perguntar novamente algo já combinado. O perfil deve ter autonomia para experimentar e disposição a falar sobre pagamentos por serviço.

**Critérios de exclusão inicial:** negócio de pronta entrega sem encomenda agendada; restaurantes que precisam de PDV; quem quer emissão fiscal integrada; equipe com múltiplos perfis de permissão; cliente que exige automação completa de WhatsApp antes de experimentar. A segmentação pode mudar após pesquisa.

**Pesquisa de confirmação:** selecionar cerca de 12 participantes em três grupos (iniciantes, fluxo recorrente, operações complexas), sem apresentar o Doce Agenda antes das perguntas; reconstruir a **última encomenda real**, quantas fontes consultou, quando precisou dela e o custo percebido de registrar duas vezes. Não exigir exibição de dados pessoais de clientes. Usar tarefas sintéticas na avaliação de produto. Avaliar dor vivida, frequência, solução atual, facilidade de mudança e prontidão para piloto pago.

## 3. Proposta de valor, posicionamento e concorrência

### 3.1 O que já está comprovado

- [C] Hero atual (`public/landing/index.html`): **"Saiba o que fazer, entregar e cobrar em cada dia da semana"**; explica registro, capacidade, sinal conferido e link. CTA predominante: **"Experimentar sem cadastro"** levando à demo. Benefícios são concretos; falta escolher uma **dor principal** para ocupar o primeiro plano.
- [C] A página demonstra, em HTML e Motion (`public/landing/main.js`), link → solicitação → decisão, semana e Pix informado vs. conferido. É prova de funcionamento *simulado no marketing*, não demonstração em produção autenticada.
- [C] Link público é uma **solicitação a revisar**: não ocupa vaga antes de aceitação. [C] `moneyStamp()` diferencia valor informado e conferido. [C] A FAQ informa que nova solicitação **não** gera notificação fora do app. O Pix real ainda está em teste, segundo `context.md`.
- [A1] A direção visual **Comanda** foi aplicada e fotografada em auditorias de 16–17/10: preservar seu vocabulário. Não reiniciar redesign.

### 3.2 Mensagem recomendada [J; hipótese a testar]

**Headline preferido, para testar com ICP:**
> O pedido chega pelo WhatsApp. O combinado não pode ficar perdido nele.

**Subtítulo:**
> Organize cada encomenda com data, horário, detalhes e sinal. Veja o que cabe na sua semana, o que precisa entregar e o que falta conferir — tudo no celular.

**Linha de mecanismo, logo abaixo:**
> Você continua conversando com a cliente no WhatsApp. O Doce Agenda organiza o compromisso; pelo seu link, ela também pode enviar uma solicitação para você revisar.

**Versão mais direta para teste:** "Antes de aceitar outro bolo, veja se a data cabe — e o que ainda falta produzir e receber." Não escolher pela preferência da equipe: teste de compreensão em 5 segundos com visitantes do ICP.

**Papel da vitrine/link:** destaque importante **depois** de explicar controle do pedido. O link reduz digitação da usuária quando as clientes efetivamente o utilizam; até existir alerta fora do app, a promessa deve explicar claramente que a confeiteira verifica novas solicitações ao abrir o sistema. O link não gera distribuição viral automática para *outras confeiteiras*: é compartilhado com **compradoras**. Ele pode aumentar valor e retenção da proprietária, mas não é, por si, um programa de aquisição de SaaS.

### 3.3 Concorrência real: cuidado com falsa diferenciação

**Pesquisa de ofertas públicas [P; em 18/10/2026]:** [Bakerly](https://bakerlyapp.com/) se apresenta com agenda, precificação e IA no WhatsApp; [CakeUP](https://cakeup.com.br/) como ERP com pedidos, estoque e financeiro; [Pratiz](https://pratiz.com.br/) comunica pedidos, recebimentos, estoque e recursos de IA. São **declarações promocionais dos fornecedores**, não comparativo de funcionalidades efetivamente testadas. Preços públicos observados em páginas consultadas: Bakerly Starter R$19,90/mês, Pro R$69,90/mês; CakeUP R$19,90/mês; Pratiz R$34,90/mês — podem mudar, não são prova de disposição a pagar pelo Doce Agenda e não justificam copiar ticket.

**Diferencial reivindicável hoje [J]:** simplicidade das decisões críticas: *não transformar interesse em confirmação*, *não misturar Pix avisado com recebido*, *mostrar capacidade antes de assumir compromisso*. É **foco de experiência**, não tecnologia proprietária. Para virar vantagem defensável são necessárias confiança, facilidade de adesão, boca a boca e uso repetido; concorrentes poderiam reproduzir a mecânica.

**Categoria comercial recomendada:** "agenda de encomendas com controle do combinado e do sinal", evitando competir como ERP completo e evitando prometer que captura automaticamente toda conversa de WhatsApp.

## 4. Jornada de aquisição → primeira prova → hábito

### 4.1 Landing — narrativa sugerida (sem redesign amplo)

1. **Hero:** quem é, dor e resultado; CTA principal contextual **"Ver um pedido na prática"** (comparar com "Experimentar sem cadastro"). Redutor de risco verdadeiro: "Exemplo fictício • sem cadastro • não salva pedidos na sua conta".
2. **Cenário-problema:** "A cliente pediu para sábado. Ainda cabe? Quanto ela já pagou?" Mostrar fragmento representativo da Comanda, não longa lista de funcionalidades.
3. **Prova de mecanismo:** uma mesma encomenda atravessa 3 estados: pedido/solicitação → agenda/capacidade → valor a conferir/pendência, com dados claramente fictícios e ação da usuária.
4. **Prova de confiança:** explicar "solicitação não entra na agenda até você aceitar", "Pix informado não conta como recebido", "dados de conta não se misturam com demo", "exportação disponível", e limitações honestas (sem notificação externa hoje; piloto gratuito).
5. **Segunda alternativa:** "Já tenho encomendas? Criar minha agenda" para pessoa pronta a começar com dados próprios. Repetir CTA depois da prova, não cada seção.
6. **Objeções:** "Preciso parar de usar WhatsApp?" (não), "Se a cliente pedir pelo link, fica confirmado?" (não), "Preciso cadastrar produtos antes de anotar?" (não, conforme caso), "O que acontece com os dados se eu parar?" (exportação, conta e política reais), "Quanto custará depois do piloto?" (não há preço definido; transparência antes de cobrar), "Vou receber avisos?" (ainda não externamente).

**Copy prudente:** não afirmar "em 1 minuto" para cadastro real sem medir; "experimentar a demo" é outra promessa. Nada de depoimentos inventados, contadores de usuários fictícios, economia de horas imaginada ou logos de clientes não autorizados.

### 4.2 Quatro estratégias de ativação (com escolha condicional)

| Estratégia [H/J] | O que a pessoa faz | Benefício | Principal risco/limite | Custo inicial | Critério para preferir |
|---|---|---|---|---|---|
| **A — Tour atual** (baseline) | Experimenta quatro tarefas numa confeitaria fictícia | Sem cadastro, ensina recursos | Pode ensinar clicks sem relevância pessoal | Já existe | Usuária exploratória, não pronta a cadastrar |
| **B — Demonstração por dor** | Escolhe "data lotada", "Pix avisado" ou "pedido pelo link"; resolve um único caso | Mostra decisão útil antes de pedir conta | Três portas podem dispersar; precisa boa transição | Pequeno a médio; protótipo sem código primeiro | Maior compreensão e vontade de continuar |
| **C — Primeiro pedido real** | Com conta, anota o próximo compromisso, vê agenda e próximo passo | Valor operacional verdadeiro e retorno possível | Se ainda não tem pedido, não há o que registrar; risco de duplicar trabalho | Médio, apoiado no W1-03 | Quem já tem encomenda marcada |
| **D — Configuração acompanhada/concierge** | Em conversa curta, a confeiteira define dias e registra um pedido junto com o fundador | Contorna resistência inicial, revela dúvidas e dá aprendizado profundo | Escala ruim; efeito do atendimento pode mascarar mérito da interface | Baixo em código; alto em tempo humano | Primeira coorte pagante e pesquisa |

**[J] Recomendação:** não impor uma só trajetória. Na demo manter saída livre; introduzir **B como microexperiência de aquisição**. Após criar conta, perguntar no máximo **uma coisa útil**: "Você já tem uma encomenda marcada?" **Sim → C** (pedido real, nunca importação de dados fictícios); **Ainda não →** mostrar uma prévia da agenda e um convite opcional para configurar dias/link, com retorno claro quando chegar um pedido. **D** serve ao recrutamento inicial e à validação de preço. Não construir ainda um onboarding com múltiplas ramificações permanentes; testar protótipos clicáveis ou sessões moderadas antes.

**Eventos de valor distintos:** (a) *aha* de demonstração = usuária explica sem ajuda a diferença entre pedido solicitado/confirmado ou entre Pix informado/conferido; (b) *ativação operacional* = primeiro compromisso **real** registrado/confirmado e consultado; (c) *ativação da vitrine* = link configurado, primeiro pedido real recebido e **revisado**; (d) *hábito estabelecido* = retorno útil em uma próxima oportunidade de encomenda. Não confundir nenhum dos eventos com signup ou checklist finalizado.

### 4.3 Primeiros canais: aquisição liderada pelo fundador

**[J] Priorizar:** (1) convites individuais a confeiteiras do ICP com problema recente, a partir de rede local e indicações consentidas; (2) vídeos curtos da situação real (sem prometer automação inexistente): "cliente pede para sábado → cabe?", "Pix avisado x conferido"; (3) indicações de usuárias **depois** de comprovar benefício. Não dispersar investimento em mídia paga, SEO em escala, afiliados e posts genéricos simultaneamente. Registrar origem de forma mínima e consentida.

O mecanismo do **link compartilhado com a compradora** é entrada de encomendas; só gera aquisição indireta se outra confeiteira vier por recomendação explícita, experiência observável ou abordagem consentida. **Não colocar marca promocional intrusiva na vitrine da confeiteira** sem testar confiança e propriedade da relação com a cliente.

## 5. Retenção: o que significa voltar para quem não tem pedido todo dia

**[J] North Star operacional provisória:** **contas com pelo menos uma ação de gerenciamento útil durante uma semana em que possuem uma oportunidade de uso** (pedido previsto, solicitação recebida, cobrança pendente ou encomenda adicionada). A oportunidade não deve ser apenas "abriu o site". Reportar separadamente contas sem oportunidades observáveis — e não declará-las automaticamente perdidas ou saudáveis: elas podem seguir trabalhando fora do sistema.

**Métricas complementares (especificação, ainda não implementada):**

- *Ativação com conta*: contas novas com 1º pedido real confirmado/consultado, segmentadas por "já tinha pedido" versus "ainda não".
- *Retenção por oportunidade*: dentre contas ativas na semana anterior **com oportunidade na semana de observação**, proporção que abriu a ação correspondente (revisão, agenda, atualização, conferência), com janelas de 7 e 28 dias e tamanho do denominador declarado.
- *Qualidade*: solicitações revisadas antes da data desejada; pedidos com status atualizado; valores `Informado` pendentes por janela; quantidade de pendências resolvidas. **Não** tratar falta de evento como inadimplência ou erro sem evidência.
- *Profundidade de uso*: entre pedidos reais, quantos são novamente consultados/atualizados e quantos têm recebimento acompanhado; não contar exibições automáticas da demo.
- *Retorno autodeclarado*: usuária diz que deixou de procurar uma informação no WhatsApp/caderno e consegue demonstrar um exemplo, sem pedir dados sensíveis.
- *Métrica negativa*: trabalho duplicado. Se ela continuar preenchendo caderno e app por semanas, retenção pode ser frágil apesar de acessos.

**Ciclo recorrente desejado:** novo combinado → registrar → ver limite/data → preparar e conferir → entregar → registrar saldo → reutilizar histórico na próxima encomenda. Dados acumulados podem gerar valor contextual (*produto que a cliente costuma pedir; próximas datas; pendências abertas; modelos de mensagens com aprovação manual*). Mostrar no momento da decisão, não criar painel de BI sem demanda. **Retenção ética** vem de serviço repetidamente útil e dados portáveis, não de aprisionamento, spam ou notificações insistentes.

## 6. Monetização — hipóteses, não uma tabela aprovada

**Hipótese comercial [H]:** a usuária paga se o Doce Agenda se tornar um instrumento para **reduzir risco de falha e economizar trabalho**, especialmente quando há volume recorrente. Só testar preço com participantes que já utilizaram a operação ou concluíram tarefa representativa; "pagaria?" isolado é fraco. Páginas concorrentes indicam existência de ofertas, não PMF nem renda disponível do ICP.

| Modelo | Vantagem | Risco | Parecer [J] |
|---|---|---|---|
| **Piloto gratuito limitado por coorte/tempo de pesquisa** | Testar valor sem cobrar antes de estabilizar confiança | Gratuidade pode atrair curiosas | **Agora**: selecionar participantes e combinar prazo e condições transparentes |
| **Teste grátis com período adaptado ao ciclo de encomendas** | Gera compromisso sem bloquear imediatamente | 7 dias podem cair numa semana sem pedidos; suporte custa | Candidato após aprender frequência de valor |
| **Grátis básico + plano pago de complexidade/serviço** | Baixa barreira e upgrade por necessidade | Free pode custar demais; limites artificiais criam frustração | Testar custo de servir antes de definir política |
| **Plano único pago e teste inicial** | Simples de compreender/sustentar | Pode bloquear iniciante; exige prova de valor forte | **Candidato preferido para primeiras vendas**, se houver suporte humano |
| **Preço por pedido ou comissão por venda** | Cresce com uso | Penaliza sucesso, gera ocultação de pedidos, instabilidade | Evitar inicialmente |

**Preservar no núcleo acessível à ativação:** registrar/consultar pedido, conferir capacidade, acompanhar sinal e status, exportar dados, acesso aos próprios registros; não usar segurança, recuperação de acesso ou leitura do histórico como chantagem comercial. Recursos potenciais para cobrança futura: várias pessoas/equipes, automações **opt-in** que gerem custo, resumos de produção, modelos avançados/reutilizáveis e suporte de configuração. Até isso pode não converter: explorar com usuárias.

**Teste econômico:** registrar custo efetivo por conta ativa (Cloudflare/Supabase, armazenamento de fotos, e-mail, IA se houver, suporte e aquisição); pedir uma **decisão concreta sobre uma oferta piloto futura** com escopo, valor, início e cancelamento claros, sem processar cobrança agora. Oferecer preços exploratórios distintos **sem atribuí-los a disposição a pagar conhecida** e anotar objeções/recusas, não apenas elogios. Não prometer gratuidade vitalícia se não foi decidida. Ajustar comunicação da landing sobre "grátis no piloto" e política de transição antes de lançar cobrança.

## 7. Oportunidades criativas, com filtro de valor

| Ideia | Classe | Justificativa / teste de morte |
|---|---|---|
| Linguagem por decisão (pedido cabe? Pix conferiu?) e CTA de demo orientado | **Melhoria imediata existente** | Mostra prova antes da lista de funções; descartar se não melhorar compreensão em testes |
| Primeiro pedido com resumo WhatsApp já estruturado e botão de copiar/abrir | **Melhoria no fluxo existente** | Ajuda transferir combinado para registro e devolutiva; validar tempo/erros, não enviar sozinho |
| Tela "Semana sob controle": agenda + exceções + cobranças, sem novas métricas | **Oportunidade promissora sobre dados existentes** | Útil antes de produção; validar se recupera ações melhor que Agenda atual |
| "Comanda confirmada" para revisar com a cliente por mensagem manual | **Oportunidade promissora** | Reduz versões divergentes; protótipo textual antes de template/versão compartilhável |
| Notificação de nova solicitação | **Experimento dependente de infraestrutura** | Pode tornar vitrine confiável, mas medir urgência, custo e opt-in; sem push imediato |
| Colar texto de conversa/áudio para rascunho assistido com revisão | **Experimento** | Reduz digitação se precisão e privacidade passarem; sem acesso automático a chats; nunca auto-confirmar |
| Preparação/checklist e compras derivados dos pedidos | **Experimento** | Pode ter alto valor nos negócios com encomendas concentradas; antes estudar variabilidade de produção |
| Estoque completo, CRM genérico, chatbot autônomo, gamificação, limite de pedidos arbitrário | **Não construir agora** | Faz crescer suporte, risco e complexidade sem comprovação de dor/valor incremental |

**Critério para qualquer nova funcionalidade (Swiss Knife/RCD):** elimina etapa repetida ou risco relevante? É frequente no ICP? reforça o eixo pedido–data–recebimento? tem custo recorrente suportável? É verificável com protótipo ou serviço manual antes de código? Se uma resposta for negativa e não houver evidência compensatória, adiar.

## 8. Plano realista para seis meses — orçamento limitado, agentes como força de execução

| Horizonte | Trabalho do responsável pelo produto | Trabalho dos agentes (só após aprovação específica) | Gate de decisão |
|---|---|---|---|
| **Mês 1 — descobrir dor** | 12 conversas de descoberta distribuídas entre perfis; observar 6 tarefas de operação; anotar linguagem exata da usuária e método atual; recrutar coorte inicial | Diagnóstico comparativo de hero e microdemo; protótipos e roteiro de testes, sem alterar produção | ICP B realmente tem dor recente e aceita testar com encomenda? |
| **Mês 2 — ativação** | 6–10 pilotos acompanhados com dados próprios somente via app e com autorização; acompanhar primeiro e segundo uso | Apenas após aprovação: correções W1 de confiança, teste de CTA/fluxo escolhido, QA | Conseguem completar/retornar sem ajuda? Quais abandonos têm causa repetida? |
| **Mês 3 — retenção** | Recontato por ocasião de pedidos; avaliar registro duplo; observar como usam a lista da semana | Melhorias pequenas de priorização do trabalho, sem reforma geral; instrumentos mínimos aprovados | A pessoa usa para decidir algo real, não para agradar quem apresentou? |
| **Mês 4 — oferta e preço** | Explicitar condições de piloto; testar oferta comercial concreta com usuárias ativas; medir custo do suporte | Prototipar descrição de planos/offers **sem cobrança** | Alguém aceita condição específica de continuidade paga? O valor cobre o custo? |
| **Mês 5 — aquisição repetível** | Testar 2 canais, um de indicações pessoais e um de conteúdo/prospecção dirigida, com origem rastreável | Aperfeiçoar onboarding/landing onde houver fricção repetida; não escalar anúncios ainda | É possível recrutar e ativar sem atendimento artesanal para todas? |
| **Mês 6 — decidir escala ou foco** | Revisar coortes, negócios pagantes/compromissos concretos, cancelamentos, suporte e retorno por oportunidade | Planejar próxima arquitetura com base em comportamento demonstrado; não construir catálogo infinito | **Escalar, iterar ICP/oferta ou interromper expansão** conforme evidência, sem meta de receita inventada |

**Disciplina operacional [J]:** usar agentes para prototipar, testar, documentar e implementar tarefas **já validadas**, não para multiplicar features. Nas primeiras semanas, mais esforço de observação e venda consultiva do que de engenharia. Como a amostra inicial será pequena, **não fazer A/B test estatístico de baixa potência**: entrevistas, sessões observadas, tarefas comparativas e ofertas reais são ferramentas melhores. A pergunta de maior valor é: **"Quando você teve a próxima encomenda, abriu o Doce Agenda por conta própria ou voltou ao caderno? Por quê?"**

## 9. Hipóteses centrais e critérios que mudariam a estratégia

1. **H1 (ICP):** confeiteira com compromissos recorrentes tem dor suficientemente intensa para mudar rotina. *Refutação:* utiliza o sistema só na demonstração, mas continua 100% em WhatsApp/caderno.
2. **H2 (mensagem):** "controle do combinado e do sinal" ressoa mais do que "agenda e gestão completa". *Teste:* compreensão espontânea de duas promessas, sem contar likes.
3. **H3 (ativação):** cenário específico (data/Pix/link) gera maior clareza que checklist de quatro tarefas. *Teste:* explicar corretamente a decisão e indicar próximo passo, sem auxílio.
4. **H4 (retenção):** retorno depende de oportunidades de pedido, não de login diário. *Teste:* observação por semana com compromisso e entrevistas de retorno.
5. **H5 (vitrine):** solicitação via link é atraente, mas ausência de alerta externo diminui uso real. *Teste:* observar latência/rotina de checagem antes de desenvolver notificação.
6. **H6 (monetização):** prevenção de falhas e histórico útil sustentam pagamento de um plano simples. *Teste:* proposta concreta após uso recorrente e custo por conta apurado.
7. **H7 (IA):** rascunho assistido economiza mais tempo do que revisar erros adicionados pela IA. *Teste:* transcrições inteiramente fictícias e medição de correções.

## 10. Parecer e decisões propostas

**[J] Recomendo reposicionar a comunicação, não a marca nem o produto inteiro.** Preservar Comanda; manter foco em pedido, disponibilidade, andamento e dinheiro confiável; priorizar uma coorte de confeiteiras com dor recente; transformar a demonstração em prova de decisão; oferecer primeiro uso adaptado à existência de encomenda; aprender retenção por *oportunidade*; testar venda de modo transparente. **Não implantar IA, cobrar, integrar WhatsApp automaticamente ou abrir uma operação de marketing em escala antes de conseguir casos reais de valor repetido.**

**Decisões para aprovação humana futura:** ICP inicial B; mensagem/hero a testar; desenho mínimo do teste de ativação; quem recebe piloto e sob quais condições; escopo de dados/consentimento para métricas; eventual oferta futura de assinatura. Este relatório e os demais arquivos **não autorizam código, commit, push, deploy, alteração de banco, ferramentas pagas ou contato com pessoas reais em nome do responsável**.
