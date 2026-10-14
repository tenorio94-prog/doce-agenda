# Meu mês — etapa 1

**Estado em 14/10/2026: implementado, testado e publicado na Cloudflare.**

Endereço: https://doce-agenda.doce-agenda-local.workers.dev/ . A conexão de `lucast.app` à Cloudflare ainda está pendente; o domínio continua apontando para a versão anterior no Netlify.

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

## Histórico da publicação

Servidor atualizado: `doce-api` versão 6 (JWT obrigatório) e `doce-public` versão 4 (público por definição, mesmos controles de rota). O novo marcador de preço é compatível com a interface antiga.

Interface pronta em `deploy-cloud/public`, mas a tentativa de upload retornou:

> Account credit usage exceeded - new deploys are blocked until credits are added

O site oficial https://lucast.app continua no deploy `6acecdaa34b7500b6803ecce`, sem a aba Meu mês. O teste integrado usou os arquivos locais preparados interceptando apenas o domínio do site; autenticação e API foram reais. **Não representa validação da interface nova publicada.**

O bloqueio do Netlify foi contornado publicando os arquivos estáticos na Cloudflare Workers Static Assets, na conta autorizada pelo usuário, sem plano pago e mantendo os dados no Supabase.

Em 14/10/2026, o teste integrado foi executado novamente no endereço público da Cloudflare, **sem interceptação de arquivos locais**: login real em conta fictícia, resumo do servidor, backup/restauração, isolamento de duas contas e telas autenticadas em 360/1440 px passaram. Capturas examinadas. Os dados das contas fictícias foram restaurados ao final. A falha inicial de HTTPS desapareceu após a ativação do novo subdomínio, sem ignorar validação de certificado.

Servidor atual: `doce-api` versão 7 e `doce-public` versão 5, liberando somente a origem exata da Cloudflare além das origens anteriores. Worker publicado: `7034e89d-ecef-4b9d-93f5-439ba3c27dc1`. A correção final de rota preserva `/p/<slug>`, sem alterar os arquivos do app verificados no teste autenticado. Cinco testes HTTP e o smoke no navegador passaram após essa correção. Configuração e comandos em [CLOUDFLARE_PUBLICACAO.md](CLOUDFLARE_PUBLICACAO.md).

Etapa 1 entregue. Pedir autorização antes de iniciar Produção A.

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
