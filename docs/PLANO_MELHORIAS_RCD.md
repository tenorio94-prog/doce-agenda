# Plano de melhorias — Revenue-Centric Design

**26/10/2026 · plano aprovado por Lucas ("pode executar tudo"); situação de cada item na seção 6**

Fonte: skill [Revenue-Centric Design](https://github.com/heliocosta-dev/revenue-centric-design) (Richard, @richardrx). A ideia central: cada tela deve servir a confeiteira **e** o negócio — levar a pessoa ao valor mais rápido, fazer ela voltar e, no momento certo, pagar. São heurísticas de outros produtos, não prova de que vai funcionar aqui.

**Relação com o que já existe:** a estratégia de 18/10 (`atualizaçao/ESTRATEGIA_GROWTH_DOCE_AGENDA.md` e `EXPERIMENTOS_PRODUTO_DOCE_AGENDA.md`, experimentos G01–G08) já usou esta skill para ICP, mensagem e monetização. Este plano não repete aquilo: transforma a skill em **mudanças concretas no produto que existe hoje**, em ordem, apontando o G correspondente quando houver.

## 1. Em que estágio estamos (e por que isso decide a ordem)

A skill diz que o peso do design muda com o estágio: **MVP → encurtar o caminho até o valor; sobrevivência → ativação; tração → conversão; PMF → expansão.** O Doce Agenda está entre MVP e sobrevivência: produto pronto, ninguém real usando ainda (`context.md`, pendência 6). Então:

1. Primeiro **saber se alguém usa** (medir e conversar).
2. Depois **ativação** (a primeira semana da conta nova).
3. Depois **conversão da landing** e **retenção**.
4. **Preço** só com uso real.

Polir telas antes disso é o que a skill chama de "o erro mais bonito que existe".

## 2. O que já segue a skill (não mexer)

| Princípio | Onde já está |
|---|---|
| Nunca entregar painel vazio; uma ação só | Conta nova vê "Cadastre seu primeiro pedido" + pedido de exemplo |
| Dados de exemplo antes de começar | Demo `/demo/` e pedido fictício na conta nova |
| Gatilho ao lado do botão | "Grátis no piloto · Sem cartão · Nada para instalar" |
| Padrão é decisão sua | Pagamento abre em "Ainda não" (lado seguro); sinal sugerido 30% |
| Painel responde "o que faço agora?" | "Pedem sua atenção", "Falta cobrar", Meu mês com Recebido em destaque |
| Sem cliques para fora na landing | Só demo, cadastro e âncoras internas |
| Não redesenhar o que é muito usado | Rodadas 2–6 foram ajustes, não reforma |

## 3. Plano, em fases

Legenda de esforço: **P** = só tela, um commit; **M** = várias telas ou regra; **★** = precisa de autorização especial (banco, dados reais, política, serviço pago).

### Fase 0 — Saber se alguém usa (base de tudo)

| # | Melhoria | Princípio da skill | Esforço |
|---|---|---|---|
| 0.1 | **Contagem semanal agregada no servidor**, sem rastreador: contas criadas, contas com 1º pedido real, contas que voltaram numa semana com pedido, solicitações do link revisadas. Só números, nenhum nome, telefone ou texto. | "Meça ativação, não cadastros"; "interface é dado, não opinião" | M ★ (Supabase + política) |
| 0.2 | **5 confeiteiras, 5 perguntas** (G01): mostrar o app, pedir para lançar a próxima encomenda de verdade e perguntar "o que falta para você usar isso na semana que vem?" | "Elogio não é validação"; jornada real ≠ diagrama | Zero código (Lucas) |

### Fase 1 — Ativação: a primeira semana da conta nova

| # | Melhoria | Princípio da skill | Esforço |
|---|---|---|---|
| 1.1 | **"Primeiros passos" começa com 1 já feito** ("Conta criada ✓", 1 de 4) em vez de "0 de 3". | Efeito do progresso iniciado (cartão fidelidade com o 1º carimbo) | P |
| 1.2 | **Cadastro com 3 campos em vez de 4:** tirar "Confirme a senha" (o botão "Mostrar" já evita erro de digitação). | Atrito administrativo se corta; cada campo é abandono | P |
| 1.3 | **Uma pergunta logo depois do cadastro:** "Você já tem encomenda marcada?" → *Sim*: abre o formulário de pedido · *Ainda não*: leva para dias/limites e link. (É o G03.) | Atrito *declarativo* se acrescenta: a pessoa diz o que veio fazer | M |
| 1.4 | **Comemorar o primeiro pedido real**, não só confirmar: depois de salvar, mostrar o dia na semana com a vaga ocupada ("Sábado: 1 de 3 vagas") e o próximo passo. | Regra pico-fim: a pessoa lembra do pico e do fim | P |

### Fase 2 — Landing e demo: quem chega entende e cria conta

| # | Melhoria | Princípio da skill | Esforço |
|---|---|---|---|
| 2.1 | **Decidir o G02 (A ou B) com o teste dos 5 segundos:** mostrar o topo da página por 5 s a confeiteiras e perguntar "o que faz e para quem é?". Vence a que mais acertar. | Teste dos 5 segundos; clareza > criatividade | Zero código, depois P |
| 2.2 | **Convite para criar conta no meio da demo**, não só no fim: depois de 2 tarefas, "Gostou? Guarde seus pedidos de verdade — grátis". Botão diz o que acontece. | Texto do botão conforme a etapa do funil | P |
| 2.3 | **Prova real quando existir:** foto e frase de uma confeiteira que usou (com autorização). Até lá, nada de depoimento, número ou estrelas inventados. | "Sua promessa é do tamanho da sua prova"; rosto real > modelo | P (depende de 0.2) |
| 2.4 | **Medir velocidade da landing no celular** (tempo até a foto principal aparecer) e corrigir se passar de ~2,5 s. | Desempenho é conversão | P |

### Fase 3 — Retenção: motivo para voltar

| # | Melhoria | Princípio da skill | Esforço |
|---|---|---|---|
| 3.1 | **"O que você já guardou aqui"** em Meu mês: X pedidos, Y clientes, R$ Z conferidos desde o início. Exportar continua livre (retenção honesta, sem prender dados). | "Retenção se constrói: mostre o que a pessoa acumulou" | P |
| 3.2 | **Aviso de pedido novo pelo link** (pendência 5b / G06): sem aviso, a cliente pede e a confeiteira só vê quando abrir o app. | "Perdida pela vida": lembrar no momento certo | M ★ (e-mail/DNS ou Supabase) |
| 3.3 | **Vagas reais na vitrine (opcional da confeiteira):** "Sábado: restam 2 vagas". Só com número verdadeiro, só pedidos confirmados contam. | Escassez real encurta a decisão da cliente | M (decisão de produto) |

### Fase 4 — Preço (só depois de uso real)

| # | Melhoria | Princípio da skill | Esforço |
|---|---|---|---|
| 4.1 | **Deixar claro o que acontece depois do piloto** (FAQ "Quanto custa?") antes de cobrar qualquer pessoa. | Promessa da landing vira dívida de expectativa | P (decisão do Lucas) |
| 4.2 | **Oferta concreta às primeiras usuárias ativas** (G07): plano único, valor e data. Perguntar "o que falta para você fazer o Pix agora?". Sem cobrança automática ainda. | "Cobre os 10 primeiros"; preço é filtro | Zero código |
| 4.3 | **Se houver plano pago, vender no momento do valor**, nunca bloqueando o básico (pedido, data, pagamento, exportar). | Expansão nasce do uso | M ★ (pagamento) |

## 4. O que a skill manda NÃO fazer agora

- Redesenho geral ou "deixar mais bonito" sem dor comprovada.
- Recursos novos de "app completo" (estoque, CRM, chatbot, gamificação): cada recurso cobra aluguel para sempre (índice do canivete suíço).
- Prova social, escassez ou números inventados.
- Teste A/B com poucas pessoas: com amostra pequena, conversa e observação valem mais.
- Notificações insistentes ou travar dados para segurar a usuária.

## 5. Por onde começar (recomendação)

1. **Agora, sem código:** 0.2 + 2.1 juntos — as mesmas conversas servem para os dois.
2. **Primeira entrega de código:** 1.1 + 1.2 (pequenas, só tela, baixo risco).
3. **Em seguida:** 1.4, depois 1.3.
4. 0.1, 3.2 e tudo de preço só com autorização própria.

## 6. Situação (26/10/2026)

Lucas aprovou executar tudo; o Doce Agenda é projeto de faculdade, sem foco comercial, e as conversas com confeiteiras ficam para quando ele achar que está pronto.

| Item | Situação | Commit |
|---|---|---|
| 1.1 Primeiros passos começam com a conta criada (1 de 4) | Feito e testado | `656f48f` |
| 1.2 Cadastro com 3 campos; senha visível por padrão (não há recuperação por e-mail) | Feito e testado | `28dc29e` |
| 1.3 "Você já tem encomenda marcada?" na conta nova | Feito e testado | `afe908a` |
| 1.4 Comemoração do primeiro pedido real | Feito e testado | `281c8f8` |
| 2.2 Convite para criar conta depois de 2 tarefas da demo | Feito e testado | `24a9963` |
| 3.1 "O que você já guardou aqui" em Meu mês (calculado no servidor) | Feito e testado; na conta real só aparece depois de publicar a `doce-api` (Supabase) | `55b2ab0` |
| 2.4 Velocidade da landing: fotos abaixo da dobra só ao rolar | Feito: LCP 3,08 s → 1,90 s em 4G lento simulado, 853 → 500 KB | `1085b2d` |
| 0.2, 2.1, 2.3, 4.2 | Dependem de conversar com confeiteiras: quando Lucas quiser | — |
| 4.1 FAQ "Quanto custa?" | Aguarda Lucas decidir se a página diz que é projeto acadêmico | — |
| 4.3 Plano pago | Fora do escopo (projeto sem foco comercial) | — |
| 0.1 Contagem agregada, 3.2 aviso de pedido, 3.3 vagas na vitrine | Não feitos: exigem Supabase/política/e-mail; 3.3 contraria a regra atual de a página pública não expor contagens | — |

**Verificado:** `npm run check` passou (65 regras + build + 12 suítes de tela, `test-onboarding` e `test-monthly-summary` ampliados); `npm run screens` antes/depois: só cadastro e Meu mês mudaram, landing idêntica. Chromium headless; sem Safari, aparelho físico ou conta real. **Não publicado** (sessão na nuvem sem login da Cloudflare/Supabase).
