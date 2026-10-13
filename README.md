# Doce Agenda — piloto público e versão local

Aplicação web para confeiteiras, com cadastro de pedidos, agenda semanal, pagamentos informados/conferidos, histórico e resumo para copiar no WhatsApp. A página de apresentação está em https://doce-agenda-piloto.netlify.app e o piloto abre em https://doce-agenda-piloto.netlify.app/app/. A publicação é estática: os dados ficam no armazenamento local do navegador de cada pessoa, sem login, servidor de dados ou sincronização entre navegadores/dispositivos. Cada navegador tem sua própria agenda; limpar os dados desse navegador pode apagá-la. O botão Backup baixa uma cópia JSON.

O piloto público pode ser acessado em celular pelo endereço acima. Isso não dá acesso à agenda salva em outro aparelho. O deploy estático não inclui o servidor local, os dados em `data/`, capturas ou logs.

Disponibilidade e modelo de personalização do bolo também ficam no armazenamento local desse navegador. A agenda permite fechar dias, definir antecedência mínima e limite por data, com exceções de data e motivo registrado ao abrir exceção na confirmação. A regra limita número de pedidos, não horas de produção. O modelo do bolo permite renomear campos, marcar campos obrigatórios ao confirmar e oferecer listas de opções. Outros tipos de pedido podem ser confirmados sem usar o modelo.

O botão Restaurar aceita arquivos JSON de backup da versão 1, confere pedidos, pagamentos e vínculos antes de substituir e prepara uma cópia do estado atual. Um arquivo inválido não substitui os dados atuais. No site público, a cópia anterior fica no armazenamento deste navegador; no servidor local, ela fica como arquivo `state.json.backup-*` dentro de `data/`. Exportar um backup antes de restaurar continua recomendado.

## Executar neste computador

Com Node.js 24 ou superior, abra esta pasta e execute `node server.mjs` (ou `npm start`). Acesse http://localhost:4173. Não há dependências a instalar. O servidor escuta apenas em 127.0.0.1; esta versão é separada do piloto público e não sincroniza dados com ele.

Os dados ficam em `data/state.json`, neste computador. A primeira execução cria um exemplo fictício identificado. Reiniciar mantém os dados. Use Backup para baixar um JSON e Restaurar para validar e importar uma cópia; a substituição preserva o estado anterior em `data/state.json.backup-*`. Não edite arquivos de dados com o servidor em execução.

## Limites e estado do piloto

- Interface adaptada a telas pequenas; uso com toque em aparelho real ainda precisa ser testado.
- Valores informados só entram no recebido após conferência; confirmar um pedido não confirma pagamento.
- Alterações pendentes são separadas do combinado e a edição gera histórico.
- Saldo negativo pode indicar pagamento a mais; cancelamento não determina cobrança/devolução.
- Sem conexão automática com WhatsApp, leitura de prints, IA ou envio de mensagens.
- Sem login, contas ou separação de empresas. A versão local é para uso neste computador; a versão pública guarda uma agenda independente em cada navegador.
- A publicação pública permite abrir o app em celular, mas não compartilha a agenda entre aparelhos. Para um produto compartilhado será necessário implementar autenticação e armazenamento de dados no servidor.
- Backup exporta JSON. Restaurar importa um arquivo Doce Agenda v1 após validação e confirmação. Na versão local, uma cópia anterior é criada em `data/state.json.backup-*`; no piloto público, ela fica no armazenamento do navegador usado.
- O piloto não tem conexão automática com WhatsApp, calendário integrado, formulário público de entrada, anexos/fotos ou lista de compras.

O próximo passo é observar a amiga usando o fluxo de disponibilidade e personalização, sem tratar o piloto técnico como validação de mercado. Consulte [docs/PROXIMAS_IMPLEMENTACOES.md](docs/PROXIMAS_IMPLEMENTACOES.md) para o diagnóstico, o que já foi implementado e as etapas futuras.

## Verificação

Para verificar as regras do servidor local, execute `node --test test.mjs`; o teste usa diretório temporário e não toca nos dados reais. Para revisar a versão estática no Chrome, prepare `deploy-demo/public` com `node scripts/build-deploy.mjs` e depois execute `node scripts/test-deploy.mjs`; as capturas ficam em `deploy-demo-check/`. O deploy público e seu armazenamento são separados; atualizar os arquivos publicados não apaga o `localStorage` existente.

Arquivos de interface em `public/`; servidor e armazenamento em `server.mjs`; identidade em `BRAND.md`.

## Página de apresentação

A landing em `public/landing/` usa a marca existente e uma imagem editorial criada por IA. Não inclui cadastro simulado. `node scripts/build-launch-site.mjs` prepara landing e app em `deploy-launch/public`; `node scripts/test-launch-site.mjs` verifica a navegação e persistência. Roteiro de revisão, imagem e evidências ficam em `design/launch-review/README.md`. A agenda continua no armazenamento do navegador, no mesmo domínio.
