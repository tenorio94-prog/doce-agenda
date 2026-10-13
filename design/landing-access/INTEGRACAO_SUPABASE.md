# Integração Supabase — estado e próxima execução

## Preparação executada em 01/10/2026

O aplicativo passou a usar `window.DoceApi.fetch`, definido em `public/data-client.js`. No servidor local usa a API HTTP; no build estático, o adaptador `browser-store.js` é carregado primeiro. A escolha ocorre uma única vez e falhas não transferem operações para outra agenda. O build deixou de substituir chamadas `fetch` no JavaScript gerado. Isso prepara a fronteira de acesso a dados; não implementa autenticação nem sincronização.

Verificações: `node --test test.mjs` (2 testes) e `node scripts/test-deploy.mjs` passaram. O teste Chrome fixa o relógio em 01/10/2026 às 12h de São Paulo para as encomendas fictícias não passarem a violar a antecedência conforme a hora real avança. Os testes de navegador usam perfis isolados e confirmam zero tráfego de dados à rede no piloto. Não validam políticas Supabase.

O plugin consta instalado, mas nenhuma ferramenta Supabase está disponível nesta sessão. O painel foi aberto no Chrome e pede login do usuário. Nenhum recurso remoto, credencial, conta, banco ou configuração Netlify foi alterado. Esta preparação não foi publicada.

## Após o login

1. Identificar organização e projeto destinado ao Doce Agenda. Conferir plano e região antes de criar qualquer recurso; usar plano gratuito e não contratar upgrade. Se a criação pedir senha do banco, o usuário deve completar essa etapa no painel.
2. Preparar ambiente de teste e esquema revisado conforme a etapa C de `PROXIMAS_IMPLEMENTACOES.md`: confeitaria, associação de usuário, pedidos, pagamentos, histórico, disponibilidade e modelos. Gerar arquivos de migração pelo CLI oficial; revisar e aplicar somente ao projeto identificado.
3. Aplicar RLS por associação à confeitaria em todas as tabelas expostas. Validar leitura e escrita entre duas contas fictícias, vínculos, concorrência na última vaga, versão de pedido e conferência idempotente de pagamento. Regras comerciais precisam ser impostas pelo banco/API, além da interface.
4. Integrar as telas propostas a cadastro, entrada, verificação, recuperação e sessão reais. Configurar URL do site e redirects específicos para produção/local. Configurar envio de e-mail adequado antes de abrir cadastro público; verificação e recuperação dependem desse envio.
5. Usar URL do projeto e chave publishable na configuração pública. Nunca incluir chave secret/service_role no frontend. Manter a experiência de piloto local explícita; sessão inválida não pode cair silenciosamente na agenda do navegador.
6. Implementar importação optativa com prévia, backup anterior e identificador de lote. Preservar IDs e histórico, excluir exemplos explicitamente e validar contagem/valores antes de concluir. Não apagar a agenda original. Converter valores para centavos e preservar o significado das datas locais.
7. Testar com duas contas e dois dispositivos, falha de rede, restauração e importação repetida. Só então publicar a versão de conta na Netlify e verificar o endereço público. Não anunciar backup automático até implementar e testar uma rotina de recuperação.

## Pontos que continuam em aberto

- Organização/projeto acessível depois do login.
- Serviço e domínio remetente de e-mail disponíveis.
- Rotina, destino e retenção de backup compatíveis com o orçamento gratuito inicial.

O cadastro presente em `design/landing-access/` continua sendo um protótipo sem persistência. A versão pública atual continua em https://doce-agenda-piloto.netlify.app.

## Atualização em07/10/2026

Conector Supabase disponível e autenticado: leitura de projetos e organização funcionou. Organização no planoFree; apenas Projeto aprender encontrado, inativo. Não foi reativado nem reutilizado. Nenhum recurso remoto alterado. Proposta e tarefas para piloto real em projeto_B/PILOTO_COM_CONTAS.md, incluindo comparação NetlifyDatabase/Identity, GoogleOAuth, isolamento e backups externos.
