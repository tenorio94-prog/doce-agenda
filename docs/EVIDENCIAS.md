# Evidências e hipóteses

Pesquisa exploratória registrada em 30/09/2026. Existe um caso pessoal de uso, sem validação comercial de terceiros. Detalhes e consultas em ETAPA_1.md.

## Hipóteses iniciais

| ID | Hipótese | Evidência necessária |
|---|---|---|
| H001 | Um comprador pagará por resolver uma tarefa recorrente específica | Oferta com preço explícito e pagamento de comprador do público |
| H002 | Conseguimos entregar valor sem depender de autoridade pessoal | Uso do protótipo pelo público, com resultado observado |
| H003 | Um canal alcança compradores com custo e esforço compatíveis com a margem | Teste do canal com origem identificada, gasto, horas e compras registradas |
| H004 | Motoristas que abandonam controles manuais manterão um fechamento por prints/mensagens | Uso repetido de terceiros, dados completos, esforço e correções medidos |
| H005 | O fluxo por mensagens oferece valor suficiente frente a apps gratuitos/baratos | Comparação com alternativas e pagamento pela oferta explícita |

## Registros — consulta em 30/09/2026

### E001 — Dimensão do público motorista

- **Fonte:** [IBGE, PNAD Contínua 2024](https://agenciadenoticias.ibge.gov.br/media/com_mediaibge/arquivos/59722d4ac24bd853f52f54f12b9514f7.pdf).
- **Consulta:** `trabalhadores plataformas digitais 2024 motoristas 824 mil`, com domínio agenciadenoticias.ibge.gov.br.
- **Observação:** 824 mil condutores de automóveis plataformizados no trabalho principal, recorte do terceiro trimestre de 2024.
- **Interpretação:** público numeroso nesse recorte.
- **Limite:** não representa todos os cadastrados, situação de 2026, demanda pelo produto nem compradores acessíveis.
- **Confiança:** alta no dado publicado; baixa para inferir demanda comercial.

### E002 — Alternativa gratuita

- **Fonte:** [Preços do Drivvo](https://www.drivvo.com/pt/pricing/).
- **Consulta:** `Drivvo plano preços motorista aplicativo gestão combustível`.
- **Observação:** página oficial anuncia plano pessoal gratuito com abastecimentos, despesas e relatórios.
- **Interpretação:** vender apenas funcionalidades genéricas de registro enfrenta alternativa gratuita.
- **Limite:** não testamos o aplicativo, restrições ou fluxo por fotos.
- **Próximo dado:** esforço real exigido do motorista.

### E003 — Preços e posicionamento concorrentes

- **Fontes:** [GigU no Google Play](https://play.google.com/store/apps/details?hl=pt_BR&id=co.gigu.app), [MF Digital](https://mfdigital.site/).
- **Consultas:** `StopClub GigU gestão financeira motorista assinatura preço`; `planilha motorista aplicativo controle ganhos despesas preço aplicativo financeiro`.
- **Observação:** GigU anuncia R$ 12,90/mês na descrição; MF Digital anuncia planilha a R$ 37 à vista.
- **Interpretação:** referências de ofertas existentes, não preços automaticamente adequados para nós.
- **Limites:** sem checkout/teste, vendas ou retenção verificados. Não usar números promocionais de usuários ou descontos de referência como dados comprovados.
- **Confiança:** média no preço anunciado; baixa na disposição para pagar por nossa oferta.

### E004 — Relato de uso pelo usuário

- **Fonte:** resposta do usuário nesta conversa em 30/09/2026.
- **Observação:** trabalha como motorista; usa a área chamada Work do ChatGPT no celular; envia print de Trip B zerado e prints das corridas no encerramento. Relata assinatura Plus a R$ 95 e benefício de evitar computador/preenchimento manual.
- **Interpretação:** caso real de utilidade percebida do fluxo por prints; existe experiência prática no nicho.
- **Limites:** um usuário, sem cronômetro, sem observação do fluxo completo e sem preferência/pagamento de terceiros. Não sabemos se fornece Trip B final ou como o arquivo persiste.
- **Próximo dado:** lista mínima de dados, conferências, forma de armazenamento e continuidade.

### E005 — Estrutura e limites do arquivo

- **Fonte:** `C:/Users/Restore/Downloads/Gestão Uber — Fiat Pulse 2026.xlsx`; leitura local de XML e importação/prévia pelo Artifact Tool.
- **Observação:** 10 abas; uma jornada datada e parcial; separação de resultado/caixa/reservas; expressões DUMMYFUNCTION em células relevantes. Prévia mostrou erros #NAME? em parte das premissas.
- **Interpretação:** base útil de controle pessoal, ainda sem compatibilidade demonstrada para venda a terceiros.
- **Limites:** não houve edição, auditoria integral nem recálculo no Excel nativo/ambiente do usuário.
- **Referências:** Dashboard A4:F8/B21:C22, Jornadas A1:AH2, Abastecimentos M3/Q3, Apoio C2:H3.
- **Próximo dado:** teste de recálculo e alterações no ambiente que seria suportado, caso escolhido.

### E006 — Encomendas de confeitaria

- **Fonte:** [ControleCaixa para confeitaria](https://www.controlecaixa.com.br/para/confeitaria).
- **Consulta:** `planilha confeitaria encomendas pedidos agenda preço`.
- **Observação:** oferta a R$ 19,90/mês anuncia registro de pedidos, sinal, saldo, status e entrega pelo celular.
- **Interpretação:** tarefa com concorrência específica e referência de preço baixo.
- **Limite:** narrativa comercial, não frequência de problemas ou aceitação comprovada. Uso de caderno/WhatsApp não foi observado diretamente por nós.
- **Próximo dado:** observar uma encomenda real e suas alterações.

### E007 — Avaliação de confeitaria

- **Fonte:** [Confeitaria — Agenda e Pedidos, App Store](https://apps.apple.com/br/app/confeitaria-agenda-e-pedidos/id1630684039).
- **Consulta:** `confeitaria encomendas organizar` e leitura de avaliações da página.
- **Observação:** avaliação de 30/12/2025 relata falta de estoque como motivo para não assinar; histórico de versões já menciona melhorias de estoque.
- **Interpretação:** estoque é pergunta possível para pesquisa de rotina, não lacuna atual confirmada.
- **Limites:** queixa isolada, estrela não identificável com segurança na extração; não confundir histórico com teste do recurso atual.

### E008 — Assistência técnica

- **Fontes:** [OrdemUp](https://ordemup.com.br/), [gerador do Servito](https://www.servito.io/ferramentas/gerador-de-ordem-de-servico).
- **Consulta:** `planilha ordem serviço assistência técnica controle peças clientes preço`.
- **Observação:** OrdemUp anuncia plano de um usuário a R$ 79/mês e acompanhamento de OS. Servito oferece gerador de OS gratuito.
- **Interpretação:** modelo de documento isolado tem concorrência gratuita; acompanhamento do serviço é hipótese mais interessante.
- **Limites:** fontes comerciais, sem usuário observado ou vendas verificadas. Necessidades variam entre ramos.
- **Próximo dado:** tarefa e retrabalho de uma pequena assistência real; excluir documentos jurídicos e laudos técnicos do produto.

### E009 — Avaliações de leitura automática

- **Fonte:** [GigU, avaliações do Google Play](https://play.google.com/store/apps/details?hl=pt_BR&id=co.gigu.app).
- **Observação:** relatos de abril e junho de 2025 mencionam leitura/valores incorretos; relato atualizado em julho de 2025 menciona melhora, ainda com erros ocasionais.
- **Interpretação:** investigar confiança e correção em captura automática.
- **Limites:** notas individuais não identificadas na extração; não afirmar padrão atual, frequência de erro ou demanda por nossa solução. Trata-se de análise de chamadas, função distinta de fechar o dia por prints.

### E010 — Ofertas de gestão para confeiteiras

- **Data:** 30/09/2026.
- **Consultas:** `confeitaria encomendas WhatsApp agenda aplicativo preços pedidos confeiteiras`; `site.sebrae.com.br confeitaria encomendas organização pedidos`; `confeiteira organizar encomendas caderno dificuldade pedidos agenda`.
- **Fontes utilizadas:** [ControleCaixa](https://www.controlecaixa.com.br/para/confeitaria), [Doce Cálculo](https://docecalculo.com.br/), [Enkomenda](https://enkomenda.com.br/).
- **Observação:** ControleCaixa anuncia R$ 19,90/mês. Doce Cálculo anuncia plano gratuito limitado, Essencial R$ 19,99/mês e Profissional R$ 29,99/mês, com gestão de encomendas/estoque/agenda no último. Enkomenda se posiciona para pedidos pelo celular.
- **Interpretação:** funções genéricas de gestão já são ofertadas; um kit precisa provar conveniência, uso e valor no processo escolhido.
- **Limitações:** páginas comerciais; sem teste funcional, volume de vendas ou frequência de problemas verificados. Consulta ao Sebrae não forneceu evidência específica suficiente para sustentar nossa hipótese. Página do Confeitar.app sem corpo acessível; não confirmar preço a partir disso.
- **Confiança:** média para preços/recursos anunciados; baixa para inferir aceitação de nossa oferta.
- **Próximo dado:** observação de pedidos reais e motivo para usar/abandonar controles.

### H006 — Confirmação de encomendas

- **Hipótese:** confeiteiras por encomenda usarão um modelo simples de confirmação e alterações que reduza retrabalho de atendimento pelo celular.
- **Evidência necessária:** uso real, esforço comparado com o fluxo atual e pagamento pela oferta definida.
- **Estado:** aberta; preferência do usuário pelo mercado não valida a hipótese.

### E011 — Contexto de gastronomia e acesso potencial

- **Data:** 30/09/2026.
- **Fonte:** declaração do usuário nesta conversa.
- **Observação:** informou ter feito gastronomia e já conversado sobre essa dor com amiga que conhece outras confeiteiras.
- **Interpretação:** existe contexto de domínio e caminho possível para observar usuárias reais.
- **Limites:** sem entrevista ou observação documentada; não inferir curso/diploma específico, depoimento da amiga, compromisso de participação, dimensão da rede ou demanda pagante. A repetição da mensagem não é uma segunda fonte.
- **Próximo dado:** rotina de uma encomenda recente, dor mais relevante e uso de alternativas.

### H007 — Kit utilizável pelo celular

- **Hipótese:** um controle único com resumo para cliente e visão semanal reduz esforço de organizar encomendas frente à rotina atual.
- **Proposta:** PRODUTO_V0_CONFEITARIA.md; v0 criada por solicitação do usuário antes de falar com a amiga.
- **Evidência necessária:** observação de uso, mudanças necessárias, continuidade e pagamento pela oferta definida.
- **Estado:** aberta; não confundir o esboço com produto validado.

### Atualização de escopo — D003

E001–E005 e E009 são histórico do candidato motorista, retirado da seleção pelo usuário. Não continuar sua investigação. E006–E007 e E010 passam a orientar o foco em confeitaria.

## Cuidado de pesquisa identificado

O título de um resultado do Guia do Excel dizia 'gratuita', mas o corpo da página direcionava a compra. Não registramos essa planilha como gratuita nem confundimos o preço de um produto relacionado com o preço dela. Confirmar o contexto na fonte, não apenas no resultado de busca.

## Modelo de evidência — copiar para cada fonte ou observação

- **ID:** E___.
- **Data da consulta ou observação:**
- **Pergunta investigada / hipótese relacionada:**
- **Fonte e link:** ou arquivo local; registrar consulta usada na busca.
- **Público e contexto:**
- **Dado observado:** o que a fonte mostra ou o participante fez; valores com unidade e período.
- **Interpretação:** o que acreditamos que isso significa.
- **Hipótese ainda não comprovada:**
- **Limitações:** amostra, fonte interessada, queixa isolada, preço anunciado sem venda comprovada etc.
- **Confiança:** baixa / média / alta, com motivo; sem probabilidades inventadas.
- **Próxima verificação necessária:**

## Regras

- Ranking, avaliações, resultados de busca e tendências não comprovam volume de vendas.
- Separar preço observado de disposição para pagar pelo nosso produto.
- Se não houver acesso à fonte, registrar a lacuna; não preencher com estimativa disfarçada de dado.
- Para regras e taxas mutáveis, usar documentação oficial, registrar a data e rever antes da ação correspondente.
- Registrar evidências contrárias à hipótese com o mesmo cuidado das favoráveis.
