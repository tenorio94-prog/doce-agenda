# Doce Agenda — Experimentos de produto, aquisição e monetização

**Segunda rodada | 18/10/2026 | Backlog de aprendizagem, não de implementação**

**Leia junto de:** `ESTRATEGIA_GROWTH_DOCE_AGENDA.md` e do roadmap técnico `ROADMAP_DOCE_AGENDA.md`. Não repetir seus reparos de código. **Não há baseline quantitativa medida nem testes com usuárias desta rodada.** Ranking abaixo reflete **julgamento profissional**, não pontuação obtida em experimentos.

## 1. Como priorizar sem fabricar ROI

Legenda: **[C]** confirmação no código; **[A1]** primeira auditoria; **[H]** hipótese de comportamento; **[J]** recomendação desta rodada; **[P]** alegação pública de terceiros. **Impacto potencial** (alto/médio), **confiança comercial** (baixa/média; nunca alta sem dados), **esforço de aprendizado** (baixo/médio), **esforço eventual de implementação** (P/M/G) e **risco** são avaliações relativas. **Evidência de que um botão existe não implica evidência de que ele converte.**

| Prioridade de aprendizagem | Experimento | Impacto potencial | Confiança comercial | Custo para testar antes de código | Relação com a primeira auditoria |
|---|---|---|---|---|---|
| **G01** | ICP e piloto acompanhado sobre encomendas reais | Muito alto | Baixa, hipótese-chave | Baixo em ferramentas; médio em tempo | Novo: precede iniciativas de growth |
| **G02** | Hero por dor + microdemonstração de uma decisão | Alto | Média na coerência, baixa no efeito | Baixo | Reorienta W1-05 |
| **G03** | Ativação contextual: já tem pedido / ainda não | Alto | Baixa a média | Baixo em protótipo | **Revê W1-03/DA-01** |
| **G04** | Reconsulta da semana e trabalho pendente | Alto | Média no uso esperado, baixa no comportamento | Baixo | Complementa W1-01, W2-05 |
| **G05** | Comanda confirmada enviada manualmente à cliente | Alto | Baixa | Baixo | Nova oportunidade complementar |
| **G06** | Sinal de urgência e canal de aviso de novas solicitações | Alto condicionado ao uso do link | Baixa | Baixo para entrevista/simulação | Condiciona W2-02 |
| **G07** | Oferta de piloto pago e estrutura do plano | Alto para negócio | Baixa | Baixo sem billing | Aprofunda W3-01 |
| **G08** | Dois canais de aquisição com atribuição manual | Alto | Baixa | Baixo a médio | Novo GTM; não é recurso de UI |

**Critério de descarte transversal:** após sessões, se a pessoa elogia a interface mas não demonstra tarefa resolvida, nem deseja retornar, **não** traduzir elogio em implementação. Com amostras pequenas, reportar contagens, excertos autorizados, erros observados, contexto e limites; **não** inferir significância estatística ou usar porcentagem como prova causal. Registrar participantes com códigos anônimos.

## 2. Fichas dos experimentos

### G01 — Validar ICP e conquistar a primeira coorte operacional

- **Problema/oportunidade:** a categoria "confeiteiras" reúne iniciantes sem urgência, autônomas com múltiplos compromissos e operações complexas exigindo ERP. [H] O meio desse espectro pode ter maior dor e aderência.
- **Evidência:** [C] o produto tem agenda, dinheiro, link e etapas; [P] concorrentes especializados anunciam gestão ampla. **Não há dado de comportamento real/entrevista do Doce Agenda. Confiança comercial: baixa.**
- **Experimento [J]:** cerca de 12 conversas de descoberta distribuídas entre os três perfis, com perguntas sobre **última encomenda concreta** (não preferências abstratas). Recrutar depois 6–10 usuárias com fluxo recorrente para piloto acompanhado. Nenhuma usuária precisa fornecer informações identificáveis de clientes; usar cenário sintético na tarefa moderada.
- **Resultado esperado:** identificar o segmento que descreve dor recorrente sem ser induzido, aceita testar com um próximo pedido e entende por que voltaria.
- **Esforço:** entrevistas/observação = médio humano e zero código; implementação = nenhuma inicialmente.
- **Riscos/dependências:** viés de amigos/entusiastas; participantes tentando agradar; mês com sazonalidade; dificuldade de recrutar. Obter consentimento e não acessar WhatsApp/conta de terceiros.
- **Métrica de aprendizagem:** número de participantes com dor concreta; quantidade que **registra espontaneamente a próxima encomenda** ou pede ajuda para fazê-lo; relato verificável de quando retornou e motivo; razões textuais de recusa. Denominador e perfil sempre expostos.
- **Validação sem código:** entrevistas estruturadas, convite pessoal e diário semanal voluntário; não criar automação de recrutamento.
- **Decisão:** se o ICP B não quiser transferir nenhuma encomenda real, questionar valor/proposta antes de alterar telas.

### G02 — Comunicar a dor, não o catálogo de recursos

- **Problema:** [C] o hero atual comunica várias tarefas e a landing mostra animações de link, capacidade e Pix; [H] visitante frio pode não identificar um benefício central ou distinguir uma demo da operação real.
- **Evidência:** `public/landing/index.html` hero e CTAs, `public/landing/main.js` (`setupLinkDemo`, `setupWeekDemo`, `setupMoneyDemo`). **Confiança no código alta, no ganho comercial baixa.**
- **Experimento [J]:** dois heros em protótipo estático para o mesmo ICP: **Controle do combinado** ("O pedido chega pelo WhatsApp. O combinado não pode ficar perdido nele.") versus **Data/capacidade** ("Antes de aceitar outro bolo, veja se a data cabe"). Mostre por 5 segundos e pergunte "para quem, resolve o quê, você faria o quê?". Depois, uma microdemo que resolve **uma única decisão** (aceitar data lotada ou conferir Pix informado) em comparação com a demonstração de quatro tarefas existente.
- **Resultado esperado:** menos confusão e descrição espontânea do mecanismo correto; maior interesse **qualificado**, não só clique.
- **Esforço:** teste em texto/Figma ou HTML desconectado = baixo; eventual refinamento da landing e navegação = P–M.
- **Riscos/dependências:** hero promete economia de tempo não demonstrada; microdemo esconde possibilidades para alguns perfis; vídeo acessível e conexão móvel. Não editar a landing até aprovação.
- **Métrica:** identificação correta de proposta, diferença entre pedido/solicitação, recordação da ação seguinte, escolha voluntária de experimentar e perguntas/objeções; observar erros, não apenas tempo.
- **Validação sem código:** protótipos impressos/telas, tarefas moderadas com pessoas que nunca viram a marca; documentar texto literal das respostas.
- **Decisão:** escolher mensagem pela compreensão e relevância para ICP; preservar alternativa "Criar conta" para quem já tem encomenda.

### G03 — Ativação por situação, não por checklist obrigatório

- **Problema:** a primeira auditoria recomendou "primeiro pedido real" como centro único. [H] isso pune quem chega sem pedido novo, e tour pode não gerar confiança operacional.
- **Evidência:** [C] `onboardingTasks()` e `onboardingMarkup()` oferecem quatro tarefas na demo e três na conta; primeiro pedido real já é um dos passos. **Comportamento de abandono não medido.**
- **Experimento [J]:** testar três percursos com o mesmo cenário: **A** quatro tarefas atuais; **B** "qual sua dúvida?" → uma decisão com dados fictícios → convite adequado; **C** conta com primeiro pedido real quando a pessoa diz que possui um compromisso. Na conta, prototipar pergunta binária "Você já tem encomenda marcada?": **Sim →** registrar/consultar; **Não →** prévia e convite para configurar agenda/link depois, sem dados falsos na conta.
- **Resultado esperado:** usuária explicar valor e concluir próximo passo **compatível com sua realidade**, sem forçar inscrição e sem transferir demo fictícia.
- **Esforço:** roteiro/protótipo = baixo; implementação adaptativa = M e depende de W1-03.
- **Riscos/dependências:** ramificações demais; perda de foco; contas vazias; preservar demo local separada de banco e promessa de dados. A primeira tarefa deve ter *saída livre*.
- **Métrica:** conclusão de tarefa **útil** sem ajuda; primeira consulta/registro de pedido real por quem já tinha; retorno posterior quando surgir encomenda para quem ainda não tinha; confundiu demo com conta?; abandono observado.
- **Validação sem código:** conduzir duas variantes em sessões separadas; simular telas no protótipo sem persistir dados de clientes; não aplicar testes A/B sem tráfego suficiente.
- **Decisão:** se a entrada B reduzir esforço de compreensão, atualizar W1-03 para fluxo adaptativo antes de implementá-lo; caso contrário, manter ponte simples.

### G04 — A agenda precisa ser consultada no próximo compromisso

- **Problema:** [H] uma confeiteira pode passar dias sem pedido; medir DAU puniria um produto utilizado nos momentos certos. A agenda precisa provar valor na semana de encomendas.
- **Evidência:** [C] `renderToday()`, `attentionItems()`, semana, Pedidos e Meu mês já oferecem dados; [A1] há um estado de cobrança incompleto em "Pedem sua atenção" (W1-01). **Ainda não se sabe o que clientes consultam primeiro.**
- **Experimento [J]:** pedir às participantes que planejem uma semana fictícia com compromissos, dia lotado, Pix informado e retirada pendente. Comparar a Agenda atual com **resumo editorial prototipado** de "O que vence/precisa decisão nesta semana" usando somente dados que já existem. Depois perguntar o que gostariam de consultar na próxima encomenda real.
- **Resultado esperado:** decisões corretas e percepção de "isso me poupa procurar em três lugares" sem painéis novos e sem falsa automação.
- **Esforço:** protótipo e moderação = baixo; eventual rearranjo = P–M, **após W1-01**.
- **Riscos/dependências:** avisos financeiros falsos seriam piores que ausência; problemas de fuso/hora; pedidos `Pronto` não significam produção atrasada. Necessidade de corrigir a verdade operacional antes de torná-la protagonista.
- **Métrica:** localizar e interpretar a **próxima ação correta**; quantidade de consultadas distintas antes de decidir; retorno útil na semana com encomenda (denominador elegível); casos em que usuário voltou ao WhatsApp/caderno para achar a informação.
- **Validação sem código:** wireframes sobre dados sintéticos e sessões em 360 px; protótipo físico/roteiro em vez de novas rotas.
- **Decisão:** alterar só agrupamento/ênfase que demonstre valor e preserve Comanda.

### G05 — Comanda de confirmação para fechar o combinado no WhatsApp

- **Problema:** [H] versões diferentes do pedido podem ficar na conversa e no aplicativo. Uma mensagem resumida para conferir com a cliente pode aumentar confiança sem mudar o canal.
- **Evidência:** [C] `BRAND.md` cita verbos de WhatsApp e mensagens manuais; `context.md` descreve resumo compartilhável na ficha e que o sistema **não envia mensagens automaticamente**. Ganho adicional ainda não comprovado.
- **Experimento [J]:** redigir **duas versões** de mensagem de confirmação com dados fictícios — uma curta com produto/data/hora/retirada/valor/sinal; outra com detalhes e aviso explícito "confirme se está tudo certo". Testar com confeiteiras se reproduz fielmente o combinado e cabe numa conversa. Na implementação futura, partir da mensagem **já existente**, não criar PDF automaticamente ou sistema de assinatura.
- **Resultado esperado:** menos reescrita manual e menos divergência entre o que está salvo e o que a cliente lê.
- **Esforço:** protótipo textual = baixo; eventual ajuste de copy/campos e testes = P–M.
- **Riscos/dependências:** dados sensíveis enviados a contato errado; texto desatualizado; valor/saldo não conferido; retorno do WhatsApp não prova aprovação; preservar revisão e envio humano, sem auto-aceite.
- **Métrica:** campos necessários presentes; omissões encontradas pela usuária; necessidade de edição antes de enviar; capacidade de explicar que é **resumo**, não confirmação automática.
- **Validação sem código:** simular em WhatsApp apenas entre contas de teste ou papel; não disparar a clientes reais.
- **Decisão:** se a ficha já resolve o mesmo trabalho, não duplicar recurso; apenas melhorar descoberta/clareza.

### G06 — Descobrir se o link precisa avisar fora do aplicativo

- **Problema:** [C] FAQ confirma ausência de notificação externa. [H] a confeiteira pode demorar para perceber uma solicitação; sem tempo de resposta confiável, a vitrine pode não virar hábito.
- **Evidência:** `public/landing/index.html` pergunta "Sou avisada..."; `context.md` registra notificações adiadas por necessidade de serviço e DNS. **Sem dados de demanda, urgência e latência.**
- **Experimento [J]:** entrevistas baseadas nas últimas solicitações (se houver), simulação de pedidos fictícios e sondagem de preferência **e-mail, abrir app em horários definidos ou push**. Perguntar: "de quanto em quanto tempo você checa?", "o que acontece se chegar à noite?". Manter o link em condição de piloto com expectativa explícita.
- **Resultado esperado:** saber se o gargalo impede adoção do link, qual janela de resposta importa e qual canal é aceitável.
- **Esforço:** pesquisa = baixo; eventual envio seguro (autenticação, consentimento, antifraude) = G.
- **Riscos/dependências:** envio não solicitado, custo, entrega de email, dados pessoais, phishing, registro de atividade, rate limit. **Não** tocar Supabase, DNS, WhatsApp API ou plano pago sem autorização.
- **Métrica:** necessidade declarada vinculada a caso vivido, capacidade de detectar solicitação nas condições atuais, atrasos observados em piloto, preferência justificada de aviso e incidência de ruído.
- **Validação sem código:** shadow service manual **com consentimento**, protótipo da mensagem e simulações; nenhuma mensagem externa automática.
- **Decisão:** só promover W2-02 à engenharia se o uso real do link existir e o problema de resposta for material.

### G07 — Testar oferta paga antes de construir um paywall

- **Problema:** [H] boa usabilidade não garante que uma confeiteira compre assinatura. Gratuidade durante piloto pode criar expectativa ambígua.
- **Evidência:** [C] landing diz "Grátis no piloto" sem plano público; [P] ofertas de concorrentes existem, mas preço anunciado não comprova disposição a pagar aqui. **Confiança comercial baixa.**
- **Experimento [J]:** após uso recorrente, apresentar uma oferta piloto **futura e concreta** com escopo, suporte, período, exportação, política de encerramento e **um valor exploratório explicitamente hipotético**. Pedir decisão observável (interesse em continuar com condições formalizadas, intenção de agendar início de assinatura quando houver cobrança, ou recusa motivada), **sem cobrança neste estágio**. Comparar *plano único simples* com *grátis essencial + conveniências pagas* só se houver clareza de custo. O preço deve ser compatível com custo real, não copiado de sites.
- **Resultado esperado:** saber **por qual resultado** pagariam e quais condições geram objeção; não inferir PMF de elogios ou "pagaria sim" abstrato.
- **Esforço:** oferta e entrevistas = baixo; implementação de pagamentos = fora do escopo e dependente de decisão futura.
- **Riscos/dependências:** promessa de preço feita cedo, compromisso confuso, viés social, cobrança não autorizada, suporte subestimado. Não pedir dados de cartão.
- **Métrica:** convites válidos, proposta compreendida, aceita/recusada com motivo, escopo exigido para continuidade, custo estimado de serviço por conta e suporte; fazer coorte por uso e não por inscrição.
- **Validação sem código:** carta de oferta de uma página e reunião curta após quatro semanas **ou após ciclo útil de encomendas**, conforme o ritmo real; documentar resposta.
- **Decisão:** sem intenção concreta suficiente e custo coberto, não construir billing; revisar ICP ou valor antes.

### G08 — Canal de aquisição que traga a pessoa certa, não cliques vazios

- **Problema:** não há evidência de canal repetível; landing bonita não cria tráfego. Compartilhar a vitrine com compradoras não equivale a conquistar outra confeiteira.
- **Evidência:** [C] link é voltado a **clientes da confeiteira**, não a outras proprietárias; [H] conteúdo de caso + convite próximo pode funcionar melhor que anúncio genérico.
- **Experimento [J]:** em janelas comparáveis, executar **dois canais pequenos**: A) abordagem individual consentida a confeiteiras que vivem o problema; B) vídeo curto demonstrando um cenário de data/recebimento e link para microdemo. Perguntar como chegou, anotar origem sem identificar pessoas desnecessariamente. Pedir indicação somente depois de valor real percebido.
- **Resultado esperado:** descobrir qual canal alcança alguém com dor e vontade de trocar método, e qual exige menos acompanhamento por usuária ativada.
- **Esforço:** médio de conteúdo/prospecção, pequeno em código; sem tráfego pago até funil resolvido.
- **Riscos/dependências:** seleção de conhecidos; spam, uso de imagens sem licença, variação de audiência, amostra pequena; não inferir diferença significativa entre canais sem escala.
- **Métrica:** conversas qualificadas, participantes que concluíram uma ação operacional com conta, uso recorrente em ocasião relevante, esforço humano por conta e fonte da recomendação. Curtidas/impressões são diagnósticos, não sucesso.
- **Validação sem código:** mensagens individualizadas, demonstração gravada do produto **real, sem dados privados**, planilha mínima de convites e desfechos com consentimento.
- **Decisão:** concentrar atenção no canal que entrega conta *ativa por oportunidade*, não no maior volume de cliques.

## 3. Relação com o roadmap técnico anterior: o que preservo, altero e questiono

| Item da primeira rodada | Parecer desta rodada | Por quê / como muda |
|---|---|---|
| **W1-01 — alerta financeiro** | **Preservar como primeira correção de integridade**, antes de protagonizar "Semana sob controle" | Promessa de confiança exige verdade nos casos-limite; não é experimento de CRO |
| **W1-02 — "Atrasado"** | Preservar com escopo pequeno | Linguagem errada pode fazer a usuária duvidar do sistema; não refazer design |
| **W1-03 — ponte demo → primeiro pedido** | **Reformular antes de construir** com G02/G03 | Não presumir que quem visita tenha pedido real no dia; ativação por intenção, não só pelo primeiro cadastro |
| **W1-05 — microcopy na landing** | **Elevar pesquisa da promessa/hero à frente de alteração visual** | Texto deve sair da dor real do ICP, não de preferência de copywriter |
| **W2-05 — instrumentação** | **Antecipar especificação de eventos e entrevistas**, mas não ativar coleta sem revisão de privacidade | Decidir por evidência com mínimo de dados; A/B sem volume é enganoso |
| **W2-02 — notificações** | Condicionar a G06; promover se elo comercial do link provar dependência de alerta | Risco de infraestrutura não se justifica por gosto de feature; ausência de alerta limita promessa |
| **W2-01 — recuperação de senha** | Preservar como higiene essencial antes de vender/guardar rotinas | Confiança básica não deve virar recurso pago nem experimento de conversão |
| **W3-01 — monetização** | Antecipar **teste comercial manual** G07 sem tocar cobrança | Assinatura não nasce da implementação de paywall |
| **W3-02 — IA de captura** | **Não implementar neste ciclo**; testar com textos fictícios após G01/G05 | Privacidade e taxa de correções desconhecidas; agentes baratos para construir não significam IA barata para operar |
| **W3-04 — produção/compras** | Manter como hipótese de segmento; não antecipar | Pode ser mais importante que IA, mas varia muito por confeitaria |

**Discordância principal:** a primeira auditoria assumiu primeiro pedido real confirmado como melhor ativação. Ele segue **evento operacional forte**, mas só para quem já tem pedido. A pergunta inicial e a experiência orientada por dor devem ser testadas antes de torná-lo caminho obrigatório. Segunda discordância: notificações são tratadas como melhoria de fase 2; se o **link for a promessa central e já usado**, devem subir de prioridade comercial — depois de validação e autorização técnica.

## 4. Sequência de aprendizagem e gatilhos de implementação

**Semanas iniciais:** G01 + G02 sem engenharia de produto. Em paralelo, W1-01/W1-02 podem ser resolvidos **somente se forem aprovados em fluxo próprio**; evitar esperar marketing para corrigir dados enganosos.

**Após compreensão da dor:** G03 com protótipo; escolher um único percurso a alterar. **Depois de uso real recorrente:** G04/G05; para quem ativa a vitrine, G06. **Com benefício repetido:** G07; G08 começa com convite pessoal e ganha escala apenas quando ativação estiver razoável.

**Critério de passagem de protótipo a código:** evidência de uma dificuldade repetida ou benefício concretamente observado; comparação com a solução atual; especificação de problema e aceite; avaliação de riscos de dados; autorização explícita do responsável. Caso não haja evidência, manter experimento ou descartar.

## 5. Dicionário mínimo de métricas — proposta, não telemetria instalada

| Nome | Definição sugerida | Denominador / cautela |
|---|---|---|
| `demo_decision_understood` | Usuária explica corretamente consequência após um caso na demo (medido em sessão, sem rastreio automático inicialmente) | Pessoas **testadas**, não visitantes de site |
| `first_real_order_consulted` | Conta salvou um pedido próprio e o visualizou na Agenda | Contas novas do segmento que **tinham pedido**; não confundir orçamento com confirmado |
| `request_reviewed` | Solicitação do link foi efetivamente revisada (aceite/orçamento/recusa) | Solicitações legítimas recebidas; considerar spam/duplicatas |
| `useful_return_eligible_week` | A conta consultou ou concluiu ação num período com pedido/pendência relevante | Contas com oportunidade *observável* naquela semana; separar sem oportunidade; escolher janela por segmento |
| `shadow_bookkeeping` | Em entrevista, pessoa manteve registro duplo caderno/WhatsApp/app | Pessoas acompanhadas com consentimento; não inferir do analytics |
| `paid_offer_decision` | Resposta concreta a proposta detalhada de continuidade paga, aceita/recusa/pendente | Usuárias **que entenderam e usaram** o produto; sem caixa processado |

**Privacidade:** dicionário e pesquisa antes do SDK; nunca incluir nomes, telefones, descrição de bolo, mensagem, chave Pix ou conteúdo de clientes nos eventos; não ligar analytics nem alterar política por conta própria; definir retenção e consentimento conforme uso pretendido. Não vender "conversão aumentou" com grupos minúsculos ou sem controle.

## 6. Decisões que precisam de aprovação

1. Selecionar ICP provisório B e autorizar **somente pesquisa** com participantes identificados e consentidos.
2. Escolher dois heros/cenários para prototipar, sem substituir a landing agora.
3. Concordar em reavaliar W1-03 antes do código; manter primeiro pedido real como métrica, não etapa universal.
4. Permitir testes exploratórios de oferta **sem cobrar ou contratar serviço**; aprovar qualquer contato/outreach separadamente.
5. Após o estudo, selecionar **um** experimento para implementação local; autorização separada para commit, push/deploy, Supabase, e-mail, integrações ou política.

**Estado final:** backlog **proposto**. Nenhum experimento foi executado com usuárias, nenhuma comparação real foi rodada e nenhuma mudança foi feita no Doce Agenda.
