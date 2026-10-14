# Meu mês — etapa 1

**Estado em 13/10/2026: implementado e testado; interface ainda não publicada.**

## Entrega

- Nova aba Meu mês, seletor que abre no mês de São Paulo e bloqueia meses futuros.
- Pedidos, Vendido, Recebido e A receber, nesta ordem. Conta exclusivamente Confirmado e Entregue, pela data de retirada/entrega, conforme a definição exata da spec.
- Dias mais cheios (3), produtos mais frequentes (5, agrupados sem diferenciar maiúsculas/acentos) e antecedência média em dias de calendário. Menos de três pedidos mostra somente cartões e explicação; nenhum pedido elegível mostra estado vazio sem cartões com zeros.
- Aviso de pedidos sem preço; novo marcador opcional `totalKnown` preservado no backup. Zero informado é um preço válido; valor vazio é A combinar. Zeros antigos permanecem como estavam, pois não há evidência para reclassificá-los.
- Resumo calculado no servidor em centavos. Rota lógica `GET /api/resumo-mensal?mes=AAAA-MM` no envelope autenticado existente de `doce-api`, sem novas tabelas/migrações. O navegador só formata os resultados; a demonstração local usa a mesma função com o estado completo do seu navegador.
- Interface de erro/repetição e proteção contra respostas atrasadas após troca de mês. A navegação mobile mantém Hoje, Pedidos, Semana, Meu mês e Novo.
- Compatibilidade com clientes antigos: atribuir preço positivo a uma solicitação sem enviar `totalKnown` reconhece o preço informado. Não altera valores históricos nem requer atualização imediata da interface pública.

## Verificações

- 38 testes automatizados de nuvem passaram, incluindo nove testes específicos do resumo e um teste da rota autenticada/isolada; sete definições, fuso/virada de mês, centavos, excesso recebido, estados excluídos, meses inválidos/futuros, backup e compatibilidade.
- Dois testes do servidor local passaram (executados fora da restrição de rede que bloqueava localhost).
- Seis cenários de interface passaram, em 360 e 1440 px e fuso do dispositivo Pacific/Auckland: números, troca de mês, menos de três pedidos, vazio, erro/repetição e resposta atrasada. Sem rolagem horizontal ou erros JavaScript.
- Dez casos do fluxo anterior de pagamentos passaram.
- Teste real em duas contas sintéticas `.invalid`: resumo igual ao esperado, bloqueio anônimo, isolamento mesmo com tentativa de informar outro owner na query, backup/restauração e interface autenticada em 360/1440 px usando respostas reais do Supabase.
- As capturas mobile/desktop foram examinadas; o seletor foi ajustado para não quebrar o mês em três linhas no celular.
- Agregação local de 5.000 pedidos e 20.000 recebimentos: aproximadamente 100 ms nesta máquina. Isso mede o cálculo, não a latência de rede nem uma garantia para qualquer volume.
- Dados originais das contas sintéticas restaurados após o teste. Nenhuma conta de confeiteira real foi alterada. Páginas sintéticas continuam desativadas.

## Publicação e bloqueio

Servidor atualizado: `doce-api` versão 6 (JWT obrigatório) e `doce-public` versão 4 (público por definição, mesmos controles de rota). O novo marcador de preço é compatível com a interface antiga.

Interface pronta em `deploy-cloud/public`, mas a tentativa de upload retornou:

> Account credit usage exceeded - new deploys are blocked until credits are added

O site oficial https://lucast.app continua no deploy `6acecdaa34b7500b6803ecce`, sem a aba Meu mês. O teste integrado usou os arquivos locais preparados interceptando apenas o domínio do site; autenticação e API foram reais. **Não representa validação da interface nova publicada.**

Depois de liberar os deploys no Netlify: publicar essa pasta, executar novamente o teste integrado sem `DOCE_MONTHLY_ASSETS=local`, revisar a tela publicada e então pedir autorização para Produção A. Não iniciar a próxima feature antes disso.

## Comandos

```powershell
node --test cloud/*.test.mjs
node --test test.mjs
node scripts/build-cloud-preview.mjs
node scripts/test-monthly-summary.mjs
node scripts/test-payment-stamps.mjs
```

Teste integrado exige arquivos privados locais das contas sintéticas, não versionados:

```powershell
$env:DOCE_QA_SESSION = 'caminho-absoluto-da-sessao-qa.json'
$env:DOCE_QA_SECOND = 'caminho-absoluto-da-segunda-sessao-qa.json'
$env:DOCE_MONTHLY_ASSETS = 'local' # usar só enquanto a UI não estiver publicada
node cloud/test-monthly-live.mjs
```

Para conferir o site efetivamente publicado, remover `DOCE_MONTHLY_ASSETS` antes do último comando. As ferramentas de Chrome precisam ter acesso à rede/localhost; o Browser plugin não estava disponível, por isso foi usado Playwright com Chrome local. Não houve teste em aparelhos físicos.
