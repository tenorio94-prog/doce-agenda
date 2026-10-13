# Diário e decisões

## 30/09/2026 — D001 — Foco no plano B

- **Decisão:** priorizar produtos digitais utilitários para o mercado brasileiro.
- **Motivo:** testar valor através de uma tarefa resolvida e avaliar a contribuição por venda; e-book na Amazon fica como possibilidade posterior.
- **Natureza:** escolha de estratégia, não comprovação de demanda ou rentabilidade.
- **Origem:** orientação do usuário nesta conversa, após a análise dos prompts A e B.
- **Realizado:** criação da estrutura de documentação.
- **Pendente:** definir público, dor, produto, disponibilidade semanal e canal inicial.
- **Próximo passo:** executar a Etapa 1 do Prompt B quando solicitada.

## 30/09/2026 — D002 — Mapeamento inicial e análise do caso motorista

- **Pedido:** executar a investigação inicial e analisar a planilha fornecida, sem favorecer automaticamente o nicho.
- **Contexto novo:** o usuário dirige por aplicativo e envia prints pelo celular ao ChatGPT para alimentar a planilha, sem precisar de computador/conhecimento de planilhas. Relatou assinatura Plus de R$ 95 pelo celular.
- **Realizado:** comparação exploratória de motoristas, confeitaria e assistência técnica; consulta a fontes primárias e comerciais; leitura das 10 abas, fórmulas/valores salvos e prévia do Dashboard.
- **Evidências:** E001–E009. Relatórios em ETAPA_1.md e ANALISE_PLANILHA_UBER.md.
- **Aprendizado:** o fluxo de captura e conferência pode ser mais relevante que vender um arquivo isolado. Apps gratuitos e ofertas baratas já competem com o controle de motoristas.
- **Problema identificado:** expressões DUMMYFUNCTION e retornos fixos exigem verificação de compatibilidade. A prévia no motor de análise mostrou erros de nome; Excel nativo e conta do usuário não foram testados. A única jornada datada está parcial.
- **Decisão:** investigar motoristas primeiro por acesso a um caso real e menor preparação. Não selecionar ainda produto/canal/preço nem presumir mercado pagante. Os demais candidatos ficam como hipóteses.
- **O que faria mudar a decisão:** equivalência dos concorrentes, baixa continuidade do usuário, conferência trabalhosa ou margem insuficiente.
- **Gastos:** nenhum anúncio, compra ou assinatura foi contratado nesta sessão. Custos de ferramentas já existentes e eventual rateio não registrados. R$ 95 é assinatura pessoal relatada, não despesa nova autorizada.
- **Tempo:** não cronometrado nesta sessão; necessário medir por execução nos testes futuros.
- **Preservação:** a planilha original não foi editada ou exportada. Dados do caso não foram enviados aos concorrentes.
- **Próximo passo:** Etapa 2 quando solicitada; comparar planilha avulsa, kit de uso com IA e serviço assistido, com margem e custo de atendimento.

## 30/09/2026 — D003 — Foco em confeiteiras

- **Orientação do usuário:** esquecer a planilha e retirar esse candidato; preferência pelo mercado de confeiteiras.
- **Decisão:** confeitaria é o foco de investigação. Nenhum produto comercial selecionado. A prioridade anterior em motoristas foi encerrada; preservar histórico não significa continuar o trabalho.
- **Pesquisa:** ampliamos o levantamento de fornecedores de gestão para confeitaria (E010). Encontramos cobertura anunciada de pedidos, custos, estoque e agenda, incluindo ofertas baratas.
- **Aprendizado:** confirmar pedidos/alterações é uma hipótese administrativa estreita; ainda precisa comprovar vantagem em esforço e adoção frente aos aplicativos existentes.
- **Hipóteses comparadas:** confirmação de encomenda; ficha de custos; organização semanal de produção/entrega. Prioridade na primeira.
- **Documento:** CONFEITARIA.md; estado atualizado no LEIA-ME.md.
- **Pendente:** acesso a confeiteiras, observação de pedido real, custo do retrabalho, ferramentas usadas/abandonadas e disposição para pagar.
- **Gasto/tempo:** nenhuma contratação ou anúncio; tempo não cronometrado.
- **Próxima ação:** investigar a rotina real antes de produzir o kit ou escolher preço.

## 30/09/2026 — D004 — Desenhar o produto antes do contato

- **Contexto novo:** usuário informou ter feito gastronomia e já conversado sobre essa dor com amiga que conhece muitas confeiteiras. Mensagem repetida não conta como segunda evidência independente.
- **Autorização:** pensar no produto antes de o usuário contatar a amiga, iterando depois com a rotina real.
- **Realizado:** PRODUTO_V0_CONFEITARIA.md, com proposta, compradora inicial, componentes, campos e exemplo fictício completo de encomenda e mensagens.
- **Decisão provisória:** controle único de pedidos, visão semanal e mensagens de confirmação/alteração. Formato candidato: arquivo duplicável para celular, sem exigir IA. Não implementar aplicativo ou automação nesta fase.
- **Aprendizado:** formação/contexto e acesso potencial existem; dor prioritária e disposição para pagar ainda não verificadas com a amiga ou sua rede.
- **Gasto/tempo:** sem contratação/publicação; tempo não cronometrado.
- **Próximo passo:** revisar a v0, observar um pedido real com a amiga e registrar diferenças; depois decidir o que construir e calcular a economia.

## 30/09/2026 — D005 — Construção do kit v1 para piloto

- **Autorização:** usuário pediu criar o produto com subagentes Luna xhigh e revisão pelo orquestrador; depois pediu continuar com menor consumo de limite.
- **Realizado:** planilha funcional, guia PDF, mensagens DOCX/TXT e pacote ZIP. Detalhes em ENTREGA_V1.md.
- **Verificação:** 18 cenários passaram no motor de criação; zero erros de fórmula na busca. Guia e agenda inspecionados visualmente. Excel/Sheets nativos e celular continuam sem teste.
- **Decisão:** versão 1 pronta para apresentação e teste acompanhado; não considerar validada comercialmente.
- **Aprendizado:** pagamentos precisam de eventos separados, IDs únicos e distinção entre informado/conferido; alterações pendentes preservam o combinado até o aceite.
- **Gasto/tempo:** sem contratação ou publicação; tempo e consumo da assinatura não contabilizados.
- **Próxima ação:** usuário testa com a amiga uma encomenda completa no celular, registra dificuldades e volta para ajustar o kit.

## 30/09/2026 — D006 — Protótipo web local

- **Orientação do usuário:** transformar a ideia em aplicação web local, sem publicar; posteriormente pediu identidade visual e capturas das telas.
- **Realizado:** Doce Agenda com Hoje, Pedidos, Semana, cadastro, detalhes, recebimentos, histórico, cópia para WhatsApp e backup JSON. Dados persistem neste computador em `web/data/state.json`. Inclusão de exemplos fictícios na primeira execução.
- **Identidade:** marca e símbolo SVG, cores creme/coral/cacau, frase “Seu combinado, em um só lugar”; nome provisório sem pesquisa registral.
- **Verificação visual:** no Chrome, confirmei carregamento, formulário, agenda semanal e detalhe com pagamento/histórico. Corrigi o erro de inicialização de data que deixava o primeiro carregamento preso. Excedentes de pagamento aparecem como alerta/valor em vez de saldo truncado.
- **Limite atual:** localhost só abre neste computador. O telefone não acessa a interface nessa configuração local, e o uso em aparelho real não foi validado. Sem conta, login, integração com WhatsApp ou reconhecimento de áudio/imagem.
- **Servidor:** iniciado em primeiro plano oculto, vinculado a 127.0.0.1:4173; para reabrir, usar `web/iniciar.ps1`.
- **Próxima ação:** apresentar o protótipo no computador à amiga, observar uso e decidir se os fluxos e campos correspondem à rotina real. Acesso em celular separado demanda outra etapa de configuração.

## Modelo de sessão — copiar abaixo para cada sessão

- **Data e objetivo:**
- **O que fizemos:**
- **Evidências e testes relacionados:** IDs E___ / T___.
- **O que aprendemos:**
- **O que continua desconhecido:**
- **Decisão:** avançar / ajustar / descartar / inconclusivo; ID D___.
- **Justificativa e o que faria mudar a decisão:**
- **Despesas desta sessão:** valor, finalidade e data; usar "não registrado" se desconhecido.
- **Despesas acumuladas no mês:**
- **Tempo nesta sessão e acumulado no teste:**
- **Próxima ação concreta:**

## 01/10/2026 — Análise do roadmap do Doce Agenda

- **Pedido:** analisar o texto de pesquisa fornecido e documentar próximas implementações e modo de execução.
- **Realizado:** relatório PROXIMAS_IMPLEMENTACOES.md; inventário técnico delegado ao Luna; atualização dos READMEs para distinguir piloto público e servidor local.
- **Base:** leitura do código atual e documentação oficial Supabase/Netlify. Links dos relatos originais não foram fornecidos; não tratá-los como pesquisa independentemente verificada.
- **Recomendação, ainda proposta:** recuperação do piloto, disponibilidade interna e modelo de bolo; conta e banco compartilhado antes do formulário público; produção editável antes de receitas/compras e estoque.
- **Aprendizado:** pedido por data é um indicador simples de carga, não uma medida de esforço; sincronização não substitui backup; formulário externo não consegue alimentar outro navegador sem backend.
- **Limites:** nenhuma funcionalidade futura foi implementada, nenhuma nova publicação, contratação ou conversa com confeiteiras foi realizada nesta sessão. Custos e prazo da implementação não estimados com compromisso.
- **Próxima ação proposta:** revisar o primeiro incremento e observar o fluxo da amiga; ampliar as entrevistas após corrigir os primeiros obstáculos.
- **Despesas/tempo:** nenhuma contratação nova; consumo das ferramentas e tempo não mensurados.

## 01/10/2026 — Incremento A/B do Doce Agenda

- **Pedido:** executar a primeira entrega recomendada no relatório de próximas implementações e publicar no piloto Netlify já autorizado.
- **Realizado:** restauração validada de backup v1; regras por dia da semana/data, antecedência, capacidade por encomendas e exceção com justificativa; seis campos configuráveis para bolo, opções e obrigatoriedade; número da versão do modelo avança nas edições e pedidos guardam sua versão/rótulos de origem. Corrigido o envio dos formulários de configurações e a exibição dos campos de bolo ao marcar o modelo.
- **Validação técnica:** `node --test test.mjs` passou (2 testes); `node scripts/test-deploy.mjs` passou local e após publicação, com perfis isolados. Verificados Chrome em 320/390/430 px, fechamento/limite/exceção, pedido sem modelo, campo obrigatório, rótulos e versões antigos, arquivo inválido sem substituição, restauração e isolamento. As capturas `deploy-demo-check/availability-mobile.png` e `cake-form-mobile.png` foram inspecionadas.
- **Publicação:** Netlify produção `https://doce-agenda-piloto.netlify.app`; deploy `6abe7984fcdbcc9e93c808bc`. Teste hospedado passou sem requisições de dados à rede e sem usar o armazenamento real do usuário. Atualizar os arquivos não apagou os dados anteriores do `localStorage`.
- **Limites:** não existe login nem sincronização; site público guarda dados por navegador, servidor local grava em arquivo e é separado. A contagem é por data de entrega/retirada, não horas de produção. Lembrete de backup e ocultação do exemplo fictício foram adiados. Nenhum teste com confeiteiras, economia, demanda ou disposição para pagar foi realizado.
- **Decisão:** levar o piloto a uma sessão observada com a amiga antes de investir em sincronização ou formulário público; revisar regras e campos com base em pedidos concretos.
- **Despesas/tempo:** nenhuma contratação nova; despesas e tempo desta sessão não foram medidos.

## 01/10/2026 — Preparação da integração de conta

- Cliente de dados explícito criado; build não substitui mais as chamadas fetch. Piloto continua localStorage e servidor local continua API HTTP. Nenhuma autenticação ou sincronização ativada.
- Luna levantou contrato de armazenamento; revisão principal atualizou o documento conforme a mudança. Plano de execução registrado em web/design/landing-access/INTEGRACAO_SUPABASE.md.
- API (2 testes) e fluxo Chrome completo passaram. Relógio do teste fixado para evitar falha de antecedência conforme avança o dia. Testes usam dados fictícios isolados.
- Plugin instalado sem ferramentas disponíveis; painel Supabase solicita login. Nenhum recurso remoto, configuração Netlify ou publicação alterado. Próxima dependência: entrada do usuário no painel aberto.

## 07/10/2026 — Landing editorial publicada

- Pedido: tornar o site mais atraente com imagem e hospedar. Doce Agenda continua destinado a confeiteiras.
- Luna implementou HTML/CSS e preparação de build/teste; revisão principal definiu conceito, gerou asset ImageGen, corrigiu enquadramento e revisou código/capturas. Página inicial em /, agenda em /app/ e /agenda.html; mesma origem e chave localStorage preservadas.
- Hero com foto IA otimizada WebP, títulos Lora e CTA real. Conteúdo de funcionalidades/passos/FAQ preservado. Nenhum cadastro simulado publicado; login e sincronização continuam pendentes.
- Build local, regressão do piloto e teste launch local/LIVE passaram; foto/fontes/links/FAQ, orçamento sem data, persistência e larguras320/390/430/1440. Zero requisições de dados à rede. Perfis fictícios isolados. Conceito e imagens finais revisados.
- Netlify produção https://doce-agenda-piloto.netlify.app, deploy6ac6ea4df806db902db8f8c3. Verificado via CLI/conector/Chrome. Selo Netlify cobria Novo no celular; desativado na configuração oficial e testeLIVE repetido com sucesso.
- Imagem não retrata usuária real. Nenhum teste em aparelho físico, leitor de tela ou com confeiteiras nesta sessão; nenhuma contratação ou upgrade. Limites locais continuam documentados.

## 07/10/2026 — Refinamento visual das telas do aplicativo

- Usuário pediu perfumaria no restante do sistema sem perda de funcionalidade. Trabalho CSS e roteiro de screenshots delegados ao Luna; revisão principal definiu escopo, verificou layouts/fluxos e publicou.
- CSS refinado em Hoje/Pedidos/Semana, resumo financeiro, detalhe e formulários; tipografia consistente, numerais tabulares, textos auxiliares maiores, controles44+, sombras discretas. Botão Novo do rodapé preservado; duplicado no cabeçalho oculto até500px. Backup/Restaurar preservados.
- Corrigido overflow na Semana320px com título/controles em duaslinhas. RótuloNovo pedido não quebra; espaço do linkBackup melhorado. Nenhuma mudança em HTML, lógica de pedidos/pagamentos, armazenamento ou autenticação.
- Build e regressão de pedidos/pagamentos/capacidade/modelo/backup passaram. Capturas/revisão320/390/430/1440 e reduzirmovimento; nenhum erroJS ou requisiçãoAPIàrede. Perfil teste isolado com3pedidos/2recebimentos fictícios. Teste mobile ajustado para açãoNovo visível na barra inferior, sem remover verificações comerciais.
- Netlifydeploy6ac6ed27aa22e1f42cf30f6b pronto. RevisãoLIVE e teste landing→agenda/persistência passaram; Chrome/CUA confirmouSemana. Prints e relatório em web/design/app-polish-review/.
- Limites mantidos: dadospor navegador, sem contas/sincronização. Sem teste comusuárias, aparelho físico ou leitor de tela; sem nova contratação/upgrade.

## 07/10/2026 — Preparação de cadastro aberto

- Usuário pediu registro compartilhável sem selecionar emails e delegação ao Luna. Convite/allowlist deixa de ser a proposta adotada.
- Luna implementou telas/validação de conta e script de revisão; outro Luna extraiu regras de dados para módulo puro e7testes. Agente principal criou controlador Supabase real comSDKfixo/bundle e rascunho de migração viaCLI; revisou renders.
- Testes UI com provider sem configuração e stubs exclusivamente de teste passaram;12capturas. Não foram testadas contas reais, envio de e-mail ou RLS. Ainda não existe API cloud hospedada; cadastro não foi publicado.
- Organização de destino solicitada ao usuário porque get_cost/create_project exigem escolha explícita; resposta ainda pendente. Depois é necessário confirmar custo e configurar provedorGoogleouSMTP. Nenhum projeto antigo reativado, nenhum plano/credencial/banco alterado.
- Documentação em CADASTRO_ABERTO.md; site de produção preservado.

## 07/10/2026 — Integração cloud e prévia com conta

- Usuário autorizou escolher/configurar Supabase sem projeto existente em uso. Criação via conector indisponível; projeto gratuito antigo restaurado, sem excluir tabelas anteriores.
- Luna entregou engine, handler API/testes, telas e guia Google. Agente frontend atingiu limite de uso; integração/build concluídos pelo principal.
- Migração própria aplicada: ownership/RLS, escrita apenas backend, revisão concorrente e cópia pré-importação atômica. API Supabase ACTIVE v1 com verify_jwt:true e getUser obrigatório.
- Passaram 7 testes engine, 8 handler, 2 bootstrap, UI responsiva e testes reais DB/API com duas contas sintéticas. Sessões encerradas e registros/contas removidos; zero restantes.
- Prévia Netlify 6ac6fa9df695c24a29acf260 criada sem --prod. Chrome confirmou /app → login sem sessão. Produção anterior preservada.
- Google ausente, SMTP padrão restrito à equipe; cadastro público não está liberado. Guia ATIVAR_LOGIN_PILOTO.md. Pendência de confirmação para bloquear tabela antiga n8n_chat_histories sem RLS. Não confundir teste API autenticada com cadastro Google real.

## 07/10/2026 — Cadastro sem confirmar e-mail preparado

- Usuário pediu ativação sem confirmação. Código e build prontos; capacidade de cadastro só ativa quando o servidor realmente estiver em autoconfirm. Recuperação por e-mail bloqueada sem SMTP e substituída por orientação de suporte. Landing preparada para conta/entrada.
- Testes motor/adaptador/controlador e interface passaram, incluindo recuperação sem envio de e-mail.
- Supabase ainda Confirmar e-mail ligado; confirmação de ação solicitada por Computer Use Confirmation Policy (materially weakens security protections). Nenhuma alteração no servidor nem nova publicação nesta etapa. Retomar após resposta, testar cadastro real e publicar.

## 07/10/2026 — Cadastro sem confirmação ATIVO

- Usuário respondeu Confirmo ao pedido de alteração no momento da ação. Confirmar e-mail desligado e salvo no Supabase via painel; API verificou mailer_autoconfirm:true.
- Dois cadastros reais sintéticos receberam sessão imediata. Teste real signup+login+API passou: criação/pagamentos/importação, isolamento entre contas, revisão e rejeição sem auth. Sessões encerradas; contas/dados de teste removidos; zero restantes.
- Produção Netlify deploy 6ac7024f17f80651ed48e5fc. Chrome confirmou cadastro habilitado, sem aviso de preparação. Landing liga cadastro/entrada. Recuperação automática por e-mail não disponível; suporte manual orientado, sem acesso às senhas.
- Capturas cadastro-netlify-ativo.png e confirmacao-email-desligada.png em web/design/account-review. Não foram utilizados e-mails reais nem envio de mensagens. Tabela anterior n8n_chat_histories segue sem RLS e sem autorização específica para bloqueio; app usa somente suas tabelas com ownership.

## 07/10/2026 — Nova assinatura e ajustes de frontend

- Pedido do usuário: iterar design/frontend e criar logo para o topo. Marca em SVG contornado com assinatura tipográfica Doce/Agenda, traço curvo, versões mono/branco e favicon D. Derivada da fonte Lora existente com licença OFL preservada, sem imagem externa/fonte nova/recursos pagos.
- Agente Luna ajustou conta para empilhar até760px e criou revisão visual; principal criou/gerou marca, refinou hierarquia dos CTAs, contraste de texto auxiliar, demonstracao direta na primeira dobra e rodapé cloud coerente com armazenamento por conta.
- Passou test-account-ui. Review-brand-refresh: 12 combinações de320/390/720/1440 nas rotas landing/conta/demo; cadastro habilitado com settings reais; sem overflow, erros JS, assets comfalha ou requisições de escrita. Capturas em web/design/brand-refresh e revisão por view_image, incluindo favicon32/48px. Timeout transitório de navegação num teste não reproduzido no Chrome/CUA no mesmo tab/contexto; não houve mudança de lógica para contornar.
- Nenhuma modificação nas regras financeiras, API, autenticação ou banco nesta iteração. Publicação Netlify em andamento; confirmar deploy/live antes de concluir.
- Publicação concluída: deploy6ac705c47a653c7c2900fc02 em https://doce-agenda-piloto.netlify.app. Chrome confirmou nova assinatura, CTA demonstração e rodapé atualizado. PrintLIVE-landing.png salvo. Nenhum cadastro novo ou dado de participante modificado na revisão.

## 08/10/2026 — Hoje com hierarquia operacional

- Usuário enviou print e apontou flor/trevo e calendário decorativo como genéricos. Principal revisou imagem e app; Luna implementou estilos scoped Hoje e QA em estadosfictícios.
- Removida flor em Hoje e ilustração ornamental de calendário nos estados vazios. Welcome virou orientação curta; agenda vazia sem cartão interno/pontilhado. Próxima ação só quandoháregistro, com botão nativo sem açãoaninhada. Financeiro vazioomitido atéexistepedido; financeiropreenchido mantém mesmoscálculos com layout dividido. Rodapéduplicadodemarca ocultonomobile; calendário deSemana navegação preservadofuncional.
- QA passou320/390/768/1440 nos estados zero/amostra futura/doispedidos+pagamento. Capturas em web/design/today-refinement revisadas. Regressão cadastro/edição/pagamento/saldo/capacidade/modelo/importação/backup passou; teste de upload aguarda leitura assíncrona antes de afirmar botão habilitado, sem mudar restauração no app. Sem contas/dados reais modificados.
- Netlifydeploy6ac79a3b36f6f6671a7a583d publicado. Chrome/CUA confirmou Hoje semdecor e novas seções no /demo/. LIVE-today.png salvo. Sem alteração emAPI, banco, autenticação ou permissões.

## 08/10/2026 — Cinco melhorias de UI/UX publicadas

- Logo e controles de filtro/dia/setas preservam a navegação e o foco.
- Cadastro/login no celular colocam o formulário primeiro. Recuperação manual explicada sem ativar envio de e-mails.
- Ajustes reúne disponibilidade, exceções, campos do bolo em acordeões e backup/restauração. Semana mantém agenda e atalho para a data escolhida.
- Pagamento identifica cliente/produto/total; valores Informado/Conferido, zero, excedentes e regras de saldo foram preservados. Totais parciais explicam pedidos sem conferência.
- Exemplos não entram mais nas listas, contagens e finanças operacionais; continuam disponíveis e preservados no backup. Landing ganhou três capturas reais com dados fictícios e ampliação.

Verificação: testes de servidor (2), conta, regressão de deploy, landing e novo QA passaram; 320/390/768/1440 px, sem erros JS ou requisições externas nos testes isolados. Relógio fixado somente nas fixtures de servidor. Revisão final do architect aprovada. Autenticação real e aparelho físico não testados nesta rodada; nenhuma alteração no banco/API/Auth.

Produção: https://doce-agenda-piloto.netlify.app — deploy 6ac7b4bc5812c92169d37a88. Smoke HTTP das quatro rotas públicas e três imagens aprovado; cloud-app.js e style.css publicados coincidem com o build revisado.
Detalhes e capturas: web/design/ux-improvements/README.md.

## 08/10/2026 — Mensagem da abertura da landing

Linha explícita para confeiteiras; subtítulo sobre localizar pedido/prazo/sinal; demo sem cadastro como CTA principal; convite ao piloto e microcopy grátis/sem cartão/celular. No mobile, prévia de pedido vem antes da foto, em fluxo normal. H1 e identidade preservados.
Luna implementou os três arquivos de landing/build; root conferiu visual em 320/390/1440, links de demo/cadastro, cartão antes da foto e zero overflow/erros JS. Teste da landing passou. Produção publicada no deploy 6ac7b62408e3311ff226f1d6, HTML/CSS e demo conferidos por HTTP. Capturas: web/design/ux-improvements/hero-copy-*.png.
