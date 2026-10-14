> Atualização: o usuário pediu cadastro aberto, sem seleção de e-mails. A proposta de convite/allowlist abaixo foi substituída por `CADASTRO_ABERTO.md`; os demais requisitos de isolamento e recuperação continuam válidos.

# Doce Agenda — piloto com contas e dados na nuvem

Pesquisa verificada em 07/10/2026. Proposta de implementação; nenhum banco, login, credencial ou plano foi alterado nesta análise. Não liberar esta versão como agenda em nuvem: o site atual ainda usa localStorage.

## Recomendação

Manter HTML/CSS/JavaScript e a hospedagem Netlify existentes. Adicionar Supabase Postgres e Supabase Auth, começando por login Google e acesso operacional limitado a e-mails previamente liberados. Não migrar para React, contratar servidor próprio nem implementar vários provedores de login neste primeiro ciclo.

| Necessidade | Tecnologia proposta | Responsabilidade |
| --- | --- | --- |
| Site e interface | Netlify + app HTML/CSS/JS existente | Hospedar landing, acesso e agenda |
| Identidade | Supabase Auth + Google OAuth | Login, sessão e identificação da usuária |
| Pedidos e configurações | Supabase Postgres | Dados remotos ligados à confeitaria |
| Permissões | RLS por associação à confeitaria | Uma usuária não lê nem modifica outra agenda |
| Operações críticas | Funções transacionais do Postgres/RPC | Capacidade, pagamento, histórico e edição consistente |
| Cópias de recuperação | Netlify Scheduled Function + Netlify Blobs | Snapshot operacional consistente, privado e criptografado; proposta a implementar e testar |

O serviço de backup deve executar somente no contexto de produção, usar credenciais guardadas no servidor e separar nomes de armazenamento de teste/produção. Não expor exportação de todas as empresas por endpoint público. Retenção proposta: sete cópias diárias e cópia anterior a uma migração. A estratégia precisa cobrir esquema, vínculos de usuários/confeitarias e dados operacionais; um JSON isolado de pedidos não equivale a recuperar o sistema inteiro. Testar restauração antes de prometer recuperação. Google continua responsável pelo acesso à conta Google.

## Situação das contas

Conectores consultados somente para leitura: Netlify `lucast` no plano Free; organização Supabase conectada no plano free. Existe apenas `Projeto aprender`, inativo, em região São Paulo. Propor projeto separado `Doce Agenda`, sem reativar ou reutilizar o projeto antigo automaticamente. A conexão Supabase funciona nesta sessão; o impedimento registrado anteriormente (ferramentas indisponíveis) foi superado.

## Comparação de alternativas

**Somente Netlify:** Netlify Database oferece Postgres e recuperação por backups. Netlify Identity oferece Google e cadastro por convite, sem custo adicional nos planos baseados em créditos. Essa opção evita Supabase e pode ser adequada a um piloto de uso esporádico. O banco ativo consome créditos juntamente com site/functions/deploys. A documentação informa limite Free de 48 unidades de processamento do banco por período; não é uma franquia separada que anule o limite de 300 créditos. Há divergência entre páginas oficiais sobre retenção Free (3 dias na página do banco,7 dias na comparação de planos); confirmar no painel antes de depender disso.

**Netlify + Supabase:** Supabase Free inclui 500 MB de banco e 50.000 usuários ativos mensais, com limite de 2 projetos ativos e pausa após uma semana de inatividade. Não inclui backups automáticos. Para alguns participantes com registros textuais, considero um ponto de partida adequado; isso é avaliação de capacidade, não teste de carga nem garantia de disponibilidade.

**Escolha recomendada:** Supabase reúne identidade, banco e autorização por linha; também evita consumir créditos Netlify com o banco principal. Usar Blobs para arquivos de backup, não para substituir o banco transacional. O custo inicial pretendido é R$ 0 dentro das cotas gratuitas; acompanhar uso, não contratar upgrade ou recarga automática sem nova decisão.

## Login e o que o usuário precisa fazer

1. Escolher os e-mails das primeiras participantes e verificar se usam Google. Sugestão de começo:3–5 pessoas, ampliando depois de observar o uso.
2. Acessar sua conta Google na Google Cloud/Auth Platform. Configurar um projeto OAuth de aplicação web, com nome Doce Agenda, origem https://doce-agenda-piloto.netlify.app e callback copiado do projeto Supabase que será criado. Solicitar somente identidade, nome e e-mail; não Drive, contatos ou Gmail. Em modo de teste Google, incluir participantes na lista correspondente; liberação no app continua sendo controle separado.
3. Confirmar a organização/projeto quando formos criar o recurso Supabase. A conta já está conectada; não compartilhar senha, Client Secret ou chave privilegiada por conversa. Registrar credenciais Google no painel do provedor, não no frontend.

Participantes não precisam de conta Netlify/Supabase, painel administrativo nem aplicativo Authenticator: entram no Doce Agenda com Google. Um serviço de e-mail (SMTP) não é necessário para o fluxo Google normal. Se for incluído e-mail/senha, magic link, recuperação por e-mail ou convite enviado pelo Supabase, configurar SMTP próprio: o envio padrão é restrito à equipe e inadequado para usuárias externas.

## Implementação e aceite antes de liberar

1. Criar projeto específico após verificar organização e custo. Configurar Google e redirects da aplicação.
2. Implementar tabelas de confeitaria, associação de usuária, pedidos, pagamentos, eventos, disponibilidade e modelo; índices, vínculos e RLS. Valores monetários em centavos e datas preservadas no fuso da operação.
3. Implementar login/logout, sessão expirada, identificação clara da conta e acesso operacional por lista liberada. Validar no banco/servidor; esconder controles na tela não protege registros.
4. Substituir o adaptador local por acesso autenticado à nuvem. Salvo só após confirmação do servidor. Sem queda silenciosa para outra agenda local; rede indisponível preserva o preenchimento e informa falha.
5. Importação local optativa, com prévia, backup e lote idempotente. Preservar IDs/histórico, excluir exemplos explicitamente e conferir contagens/totais. Não apagar os dados locais automaticamente.
6. Implementar backup diário privado e recuperação. Ainda não existe rotina automática. Explicar às participantes que uma cópia diária pode recuperar somente até o último snapshot; não prometer perda zero.
7. Testar duas contas isoladas, dois dispositivos, login Google real, conta não liberada, expiração/rede, edição simultânea, última vaga concorrente, conferência duplicada e restauração. Depois publicar e liberar o primeiro grupo.

Manter exportação JSON por confeitaria e orientação de backup. O beta deve esclarecer onde os dados são guardados e os limites do serviço, com aviso de privacidade adequado ao que o app coleta. Coletar só o necessário para as encomendas; não solicitar dados de cartões ou informações adicionais sem utilidade.

## Fontes oficiais

- [Netlify Database — limites e cobrança](https://docs.netlify.com/build/data-and-storage/netlify-database/billing-and-usage/)
- [Netlify — planos baseados em créditos](https://docs.netlify.com/manage/accounts-and-billing/billing/billing-for-credit-based-plans/credit-based-pricing-plans/)
- [Netlify Identity — planos](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/plans-and-pricing/)
- [Netlify Identity — Google e convites](https://docs.netlify.com/manage/security/secure-access-to-sites/identity/registration-login/)
- [Supabase — preços e cotas](https://supabase.com/pricing)
- [Supabase — login Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase — restrições do SMTP padrão](https://supabase.com/docs/guides/auth/auth-smtp)
- [Netlify — funções agendadas e Blobs](https://docs.netlify.com/start/core-concepts/primitives/)
