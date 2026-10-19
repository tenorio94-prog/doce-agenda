# Doce Agenda — Briefing complementar de Growth para o Codex

**Segunda rodada | 18/10/2026 | Documento de alinhamento; NÃO é ordem de implementar**

> **Uso:** entregue este briefing ao Codex **juntamente com** `ESTRATEGIA_GROWTH_DOCE_AGENDA.md`, `EXPERIMENTOS_PRODUTO_DOCE_AGENDA.md` e os três arquivos da primeira rodada (`AUDITORIA_DOCE_AGENDA.md`, `ROADMAP_DOCE_AGENDA.md`, `PROMPT_CODEX_DOCE_AGENDA.md`). Ele complementa e, em decisões **estratégicas**, atualiza o roadmap anterior. **Não altera a autorização de engenharia que estiver em vigor:** esta leitura, por si, autoriza no máximo investigação e proposta, não código.

## 1. Sua função

Atue como **engenheiro principal de produto com sensibilidade de Growth, UX e Revenue-Centric Design**. Antes de implementar uma mudança de conversão ou ativação, compreenda o trabalho real da confeiteira e a hipótese que a mudança testa. Faça o produto **entregar o benefício prometido**, em vez de acumular microinterações, animações, funcionalidades e métricas sem valor.

**Tese a preservar:** Doce Agenda é a comanda da encomenda sob controle. O WhatsApp continua sendo canal de conversa; o Doce Agenda guarda o combinado, situação, agenda/capacidade, próxima ação e pagamentos efetivamente conferidos. A vitrine pública recebe **solicitações** que a proprietária pode aceitar, orçar ou recusar. O app não envia mensagens automaticamente e não reconhece Pix como recebido sem conferência humana.

**ICP provisório (ainda não validado):** confeiteira autônoma ou microateliê que vende sob encomenda regularmente, negocia pelo WhatsApp e sente dor de combinar datas, controlar produção e sinal. Não ampliar automaticamente o design para restaurante, PDV, ERP completo, loja com equipe grande ou negócio de pronta entrega.

**Eixo de experiência proposto:** promessa específica na landing → prova rápida de uma decisão importante na demo → próximo passo adequado à condição da usuária → registro/consulta de compromisso real quando existir → retorno útil quando surgir nova oportunidade. Não confundir tour concluído, cadastro concluído e ativação.

## 2. Leitura e precedência obrigatórias

1. Leia `AGENTS.md`, `context.md`, `BRAND.md`, `docs/ARQUITETURA.md`, e os **seis documentos** das duas auditorias. Compare recomendações com `main` atual (SHA, `git status` e branch). **Não** tratar caminhos/linhas desta auditoria como contratos imutáveis.
2. Consulte a skill [Revenue-Centric Design](https://github.com/heliocosta-dev/revenue-centric-design) em `SKILL.md` e módulos `positioning-icp-and-gtm`, `conversion-and-landing-pages`, `onboarding-and-activation`, `churn-and-retention`, `pricing-and-monetization`, `product-strategy-and-features`, `metrics-and-experimentation`. Interprete como heurísticas a validar, não como estatísticas aplicáveis ao produto.
3. Se um achado da primeira auditoria já estiver resolvido no código, **não reconstruir o defeito para justificar trabalho**. Os relatórios datados de 16–17/10 são históricos. A segunda rodada leu código, **mas não conseguiu navegar interativamente no site publicado**; não afirme que jornada real funciona apenas por existir no código.
4. **Autorizações:** a convenção histórica de `AGENTS.md` que permite push/publicação após aprovação geral **não se aplica a este briefing**. Nenhuma autorização para alterar serviços, publicar, enviar e-mails, tocar dados reais, modificar schema ou ativar métricas deve ser inferida. Exigir comandos separados para trabalho local e publicação.

## 3. Situação técnica confirmada — use apenas como mapa

| Área | Local confirmado (snapshot em 18/10/2026) | Relevância para Growth |
|---|---|---|
| Landing | `public/landing/index.html`, `public/landing/landing.css`, `public/landing/main.js` | Hero, CTAs, prova de link/agenda/Pix; `setupLinkDemo`, `setupWeekDemo`, `setupMoneyDemo` |
| Login/cadastro | `public/account/index.html`, `public/account/account-ui.js`, `public/account/config.js`, `public/account/account-controller.js` | Entrada, redirecionamento, estados e recuperação; `emailDeliveryReady: false` no snapshot |
| App e demo | `public/index.html`, `public/app.js` | `onboardingTasks()`, `onboardingMarkup()`, `runOnboardingTask()`, `renderToday()`, `renderOrders()`, `renderSettings()`, `attentionItems()`, `moneyStamp()` |
| Adapters e persistência | `public/data-client.js`, `cloud/browser-adapter.js`, `cloud/app-bootstrap.js` | Demo em navegador separada da conta Supabase; revisão otimista e conflitos |
| Regras do domínio | `cloud/state-engine.js`, `cloud/monthly-summary.js`, `cloud/public-orders.js` | Capacidade, estados, centavos, recebimentos, pedidos públicos |
| Design e distribuição | `BRAND.md`, `public/ui/vnext.css`, `public/tokens.css`, `public/ui/icons.js`, `public/landing/` | Preservar Comanda, fonte, tokens, semântica e assets próprios |
| QA | `package.json`, `scripts/test-onboarding.mjs`, `scripts/test-landing-entry.mjs`, `scripts/test-order-form.mjs`, `scripts/test-payment-stamps.mjs`, `scripts/capture-screens.mjs` | `npm run check`, Playwright/Chromium, comparações visuais; não afirmar Safari/iPhone sem executar |

Arquitetura conhecida: HTML/CSS/JS sem framework de componentes, esbuild, Web Awesome, Motion, Cloudflare Workers Static Assets e Supabase para autenticação/banco. Demo usa `localStorage`; conta usa servidor e controle de revisão. Rotas conhecidas: `/`, `/demo/`, `/cadastro/`, `/app/`, link público `/p/<slug>` — verificar URL efetiva antes de gerar qualquer redirecionamento. O site informado é `https://doce-agenda.doce-agenda-local.workers.dev/`; `context.md` também cita `https://lucast.app/`. Não presumir identidade entre branch e produção sem prova.

## 4. O que esta rodada propõe — sem aprovação automática

**G01 — ICP e pesquisa:** trabalho humano, não codificação. Codex pode preparar roteiro/protótipo/planilha sintética se receber ordem explícita.

**G02 — Hero/landing + microdemo:** hipóteses de mensagem. Antes de alterar produção, prototipar uma decisão (data lotada **ou** Pix informado) com conteúdo fidedigno; CTA contextual, alternativa de cadastro direto; linguagem de piloto honesta. Não alegar taxas de conversão.

**G03 — Ativação contextual:** primeira auditoria sugeriu ponte demo→primeiro pedido real; nova avaliação recomenda **testar** bifurcação mínima: "Já tenho encomenda marcada" (levar ao registro real) versus "Ainda não" (prévia/ajustes opcionais). Não migrar dados de exemplo para conta; não forçar pedido fictício nem tutorial obrigatório. Conservar demo atual enquanto não houver evidência de alternativa melhor.

**G04 — Retenção por trabalho da semana:** antes de construir novo painel, prototipar reorganização de informações existentes; `attentionItems()` deve representar corretamente pendências antes de receber maior destaque. Retorno útil em semana com pedido ≠ acesso diário.

**G05 — Comanda confirmada para WhatsApp manual:** testar texto claro aproveitando mensagem já existente e estado verdadeiro do pedido. Envio é ação humana; nada de webhook de mensagem ou auto-confirmação.

**G06 — Avisos de solicitações:** exige estudo de canal/urgência. Não implementar push, e-mail, mensagem ou função Supabase só porque o briefing menciona isso.

**G07 — Monetização:** **não** implementar tela de preços definitiva, bloqueio de recursos, checkout, paywall ou cobrança. No máximo protótipo de oferta isolado, com valores rotulados como hipótese a validar, após solicitação explícita.

**G08 — Aquisição:** experimento de negócio com conteúdo e convites consentidos, não uma tarefa automática de código. Não disparar mensagens para contatos, importar listas, raspar pessoas ou expor dados de clientes.

**Lista expressa do que NÃO executar sem novo pedido:** reformulação visual global, trocar stack/framework, integrar IA que leia WhatsApp, automatizar cobranças, criar CRM/estoque completo, ligar Pix oculto, modificar RLS/JWT, migrar dados, instalar analytics de terceiros, contratar provedor de e-mail, notificar pessoas, realizar deploy ou reescrever o roadmap de arquitetura.

## 5. Definição de pronto de cada experimento e critérios futuros

**Em toda proposta técnica, especifique:** hipótese, variante baseline, mudança visível, público-alvo, dependências, custo de teste, evento de valor, risco de engano/abuso, critério de aceitação **observável**, como desativar/reverter e o que **não** foi validado. Separe três dimensões: **comportamento funcional** (testável automaticamente), **compreensão de UX** (testável com gente) e **impacto comercial** (somente com dados suficientes).

### Critérios por classe de solução — caso seja aprovada no futuro

- **Hero/CTA (G02):** título, subtítulo e CTA coerentes em 320/360/390/1280; nenhum CTA aponta a rota inexistente; a proposta se explica sem alegar automação ou vantagem não verificadas; estado de movimento reduzido funciona; as 3 cenas presentes da landing não perdem sua integridade; manter acessibilidade, metadados e performance; comparação visual antes/depois. **"Converte mais" não é aceite de engenharia.**
- **Microdemo (G02):** história fictícia identificada; uma decisão com consequência visível (pedido ocupa ou não vaga, ou Pix conta/não conta como recebido); sem salvar na conta real; sem gerar pedido público; botão de saída e caminho para cadastro; falha de script não pode esconder o CTA principal; teclado e leitor de tela considerados. A demonstração não simula notificação externa nem pagamento processado.
- **Ativação (G03):** primeiro acesso permite continuar sem encomenda; para quem tem, cria com dados reais fornecidos voluntariamente pelo titular e exibe no local correto; a conta **não recebe pedidos fictícios da demo**; navegação, atualização de página e retorno não perdem intenção nem criam duplicação; não marcar "ativado" só porque completou dica; cancelar ou pular não cria registro. Não perguntar um questionário longo.
- **Agenda/retorno (G04):** solução deriva de dados já disponíveis e não afirma inadimplência sem lançamento conferido; valores nulos não viram zero; status `Pronto` não é chamado automaticamente de produção atrasada; pedido finalizado com pendência acessível; CTA conduz à ficha certa; casos de data e fuso testados; layout mobile com leitura por prioridade.
- **Resumo de confirmação (G05):** mensagem explícita e editável antes de compartilhar; datas/horas/valor/sinal corretos; não informar que a cliente aceitou por mera abertura do WhatsApp; demonstração não envia contatos falsos a terceiros; sem função de envio automático; idempotência, compatibilidade com backup e dados de clientes preservadas.
- **Aviso futuro (G06):** só depois de projeto de segurança/consentimento aprovado; deduplicação, falhas, destino autorizado, logs mínimos, opt-in, capacidade de desligar, casos de teste sem dados reais; não abrir serviço externo silenciosamente.
- **Métricas futuras:** somente se aprovadas com privacidade: dicionário por evento sem nome/telefone/texto de pedido/chave Pix; documento de retenção e exclusão; separação demo/conta; denominador explícito; não implantar rastreio comportamental invisível nem mudar a política unilateralmente.

## 6. Protocolo de engenharia de risco proporcional (após aprovação)

1. **Baseline:** verificar `git status`, branch, SHA, mudanças pendentes, `AGENTS.md` e `context.md`. Executar testes pertinentes **antes** de tocar a interface e guardar capturas em pasta ignorada. Se checkout for diferente da auditoria, comunicar primeiro.
2. **Reproduzir oportunidade/falha:** confirmar problema funcional no código ou demonstrar fricção com prova de pesquisa anexada; não inventar resultado de entrevista. Se o problema for só hipótese comercial, limite-se a protótipo autorizado, não feature completa.
3. **Proposta mínima e alternativa:** explicar se um texto, um reajuste de sequência ou reutilizar mecanismo existente entrega o mesmo benefício que nova funcionalidade. A preferência é menor superfície de produto e menor risco para conversão.
4. **Construir um lote coerente:** preservar o frontend atual, tokens Comanda e funções existentes. Evitar alterações no servidor para experimento de copy; fixar versões das dependências se alguma nova for imprescindível e autorizada. **Uma ação explícita não autoriza outra.**
5. **Validar:** `npm run check` e testes Playwright específicos; 320/360/390/1280, foco, `aria-live`, textos, rolagem, estados vazios/erro, redução de movimento, retorno/atualização, contraste e navegação por teclado. Para mudança puramente visual ou refatoração, `npm run screens -- <pasta>` antes/depois e `node scripts/capture-screens.mjs --compare <antes> <depois>` conforme o objetivo. Se não executar Safari, 4G, aparelho físico ou produção, relatar como não testado.
6. **Domínio e segurança:** tempo em `America/Sao_Paulo`, semana segunda–domingo, centavos inteiros no cálculo novo; `Conferido` conta, `Informado` não; solicitação não reserva vaga; revisão humana permanece; respeitar JWT/RLS, revisão otimista, schemas/backups antigos e isolamento de conta; não registrar segredos/clientes reais em testes. Proteger reentrância e não criar duplicação de pedidos.
7. **Encerrar e parar:** relatar diff, testes realmente executados, screenshot/roteiros, aceites, risco, hipótese comercial ainda aberta, e perguntar **somente** a autorização do próximo passo. Não efetuar commit, push, deploy, atualização de políticas, ações em conta real ou contratação sem autorização separada e expressa.

## 7. Relatório curto esperado do Codex (quando houver lote aprovado)

```markdown
# Lote G0X — Nome
- **Autorização recebida:** [recorte literal]
- **Base técnica:** branch / SHA / status
- **Evidência inicial:** [código, teste, pesquisa de pessoa real, ou hipótese]
- **Problema e objetivo:** [sem promessa de aumento percentual]
- **Decisão:** [mínimo escolhido; alternativa descartada e por quê]
- **Mudanças:** [arquivos, funções, contratos impactados]
- **Aceites verificados:** [comandos, resultados e screenshots]
- **Não verificado:** [produção, Safari, usuárias, impacto comercial etc.]
- **Riscos e rollback:** [pontos de atenção]
- **Próximo experimento proposto:** [somente sugestão; sem execução]
```

## 8. Texto pronto para iniciar o Codex sem autorizar código

> Faça **somente uma revisão estratégica, de leitura e planejamento** com base nos seis documentos das duas rodadas. Verifique branch/SHA, o estado atual de `public/landing/index.html`, `public/app.js` e os testes relacionados a ativação. Confronte G01–G08 com o código: quais experimentos exigem **zero código**, quais aceitam protótipo estático e quais dependem de aprovação técnica? Prepare um plano enxuto para **G02/G03**, com duas alternativas de mensagem e três percursos de ativação, indicando telas/arquivos apenas se confirmados e critérios de aceitação. **Não modifique arquivos, não crie commits, não publique, não toque dados reais, e aguarde minha aprovação explícita antes de qualquer implementação.**

## 9. Modelo de autorização para um futuro lote (NÃO usar sem decisão do responsável)

> **Aprovo exclusivamente o experimento G0X, na variante [nome], para implementação LOCAL conforme o briefing e estes critérios [critérios aprovados].** Preserve a baseline e execute testes. É permitido editar os arquivos locais necessários a esse escopo. **Não** fazer commit, push, deploy, contato externo, mudança de Supabase/DNS, contratação ou alteração de dados reais. Ao concluir, traga evidências, riscos e pare para minha aprovação.

**Regra final:** um agente de IA pode construir software rapidamente; não pode fabricar validação de mercado. Trabalhe por **evidência → hipótese → menor teste → decisão → implementação autorizada → verificação**. Se a validação contrariar o plano, apresente a divergência em vez de esconder o resultado ou avançar para a próxima feature.
