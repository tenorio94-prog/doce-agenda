# Ativar login Google no piloto Doce Agenda

Este guia registra como o Lucas pode preparar o Google como primeira opção de entrada para o piloto. Ele descreve a configuração; não significa que o provedor já foi ativado nem que o app esteja pronto para receber cadastros públicos.

## Estado atual

O banco Supabase cloud foi criado e os testes de políticas de acesso (RLS) e atualização concorrente (CAS) passaram. A integração do frontend e da API ainda está em preparo; o login e a agenda conectados ao banco não estão ativos para as participantes.

O provedor Google ainda não está configurado. O e-mail padrão do Supabase está confirmado como inadequado para abrir cadastro ao público: sem SMTP próprio, o Supabase só envia e-mails de autenticação para endereços que fazem parte da equipe da organização. O limite atual do SMTP padrão é 2 mensagens por hora e o serviço não oferece garantia de entrega. Portanto, confirmação e recuperação por e-mail não funcionam como fluxo público nesse estado. [Documentação oficial do SMTP do Supabase](https://supabase.com/docs/guides/auth/auth-smtp)

## Antes de começar

- Confirme que está na conta Google que será dona ou editora do projeto OAuth.
- Abra o projeto certo no Supabase antes de salvar qualquer credencial.
- Separe as credenciais em um gerenciador de senhas. Não as envie neste chat.
- O endereço de retorno do Google é do Supabase; depois desse retorno, o Supabase redireciona a pessoa de volta ao site.

## 1. Criar o cliente OAuth web no Google

1. Abra o [Google Cloud Console](https://console.cloud.google.com/) e selecione ou crie o projeto que será usado para o login da Doce Agenda.
2. Abra o [Google Auth Platform](https://console.cloud.google.com/auth/overview). Se o produto pedir a configuração inicial, escolha **Get started**.
3. Em **Branding**, informe o nome que aparecerá na autorização, o e-mail de suporte e os dados básicos da Doce Agenda. Use endereço de suporte que Lucas consiga acompanhar.
4. Em **Audience**, escolha **External**. A opção **Internal** só serve para contas da organização Google Workspace que contém o projeto.
5. Para compartilhar o piloto com confeiteiras em geral, publique o app e deixe o status **In production**. O modo **Testing** é voltado a testes e permite cadastrar até 100 pessoas na lista de test users; a autorização também pode mostrar aviso de app em teste. A documentação atual tem uma exceção para o fluxo Sign in with Google quando ele pede apenas nome, e-mail e perfil, mas isso não substitui publicar o app para o uso público pretendido. [Público e status de publicação do Google](https://support.google.com/cloud/answer/15549945?hl=pt-BR)
6. Em **Clients**, escolha **Create client** e selecione **Web application**.
7. Em **Authorized JavaScript origins**, adicione exatamente a origem do site, sem caminho:

   `https://doce-agenda-piloto.netlify.app`

8. Em **Authorized redirect URIs**, adicione exatamente o callback do Supabase:

   `https://khvhnbopdluthpcduhqm.supabase.co/auth/v1/callback`

9. Crie o cliente e guarde o **Client ID** e o **Client secret** no gerenciador de senhas. O Supabase usa os dois para completar o OAuth web. [Passos oficiais do Supabase para Google](https://supabase.com/docs/guides/auth/social-login/auth-google)

O escopo necessário é só identidade básica: `openid`, e-mail e perfil. Não adicione acesso ao Gmail, Drive ou outros dados Google; a Doce Agenda não precisa desses serviços para autenticar a conta. A documentação do Supabase lista esses escopos mínimos e recomenda evitar escopos sensíveis ou restritos sem necessidade. [Escopos de Google exigidos pelo Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google#setup-required-scopes)

## 2. Guardar as credenciais no Supabase

1. Abra o projeto cloud da Doce Agenda no [Supabase Dashboard](https://supabase.com/dashboard/).
2. Vá a **Authentication → Sign In / Providers → Google** (a tela pode aparecer como a página do provedor Google).
3. Ative Google e cole o **Client ID** e o **Client secret** nos campos do provedor. Salve no Dashboard do Supabase.
4. Confira que o callback mostrado na página do Google provider é este valor exato:

   `https://khvhnbopdluthpcduhqm.supabase.co/auth/v1/callback`

   Se o Dashboard mostrar outro callback para o projeto selecionado, pare e confirme que está no projeto correto antes de alterar o cliente OAuth.

As credenciais ficam no Google Cloud e no painel protegido do Supabase. Não as coloque em `config.js`, no código do navegador, no Netlify, em capturas de tela ou neste chat. O frontend recebe somente as identificações públicas necessárias para iniciar o fluxo; o segredo permanece no lado do Supabase.

## 3. Conferir os endereços de retorno no Supabase

Na configuração de URL do Supabase Auth, use como **Site URL**:

`https://doce-agenda-piloto.netlify.app`

Inclua na allow list de redirect do Supabase o endereço para onde o código atual devolve a pessoa depois da autenticação:

`https://doce-agenda-piloto.netlify.app/cadastro/?mode=login`

O OAuth do Google retorna primeiro ao callback `/auth/v1/callback` do Supabase. Depois, o Supabase volta para o endereço do site listado acima. São dois campos de redirect com funções diferentes. A lista do Supabase deve corresponder ao `redirectTo` que a aplicação usa. [URL Configuration do Supabase](https://supabase.com/docs/guides/auth/redirect-urls)

## 4. Testar quando frontend e API estiverem conectados

1. Abra a tela de conta em produção e confira que **Continuar com Google** aparece.
2. Entre com uma conta Google autorizada e confirme que o retorno cai em `/app/` com uma sessão válida.
3. Repita com outra conta Google e confirme que cada uma vê somente a própria agenda; os testes atuais de RLS/CAS no banco não substituem essa verificação ponta a ponta.
4. Teste também sair da conta, recarregar a página e entrar novamente.
5. Só depois de confirmar a integração frontend/API, os dois acessos isolados e a persistência, anuncie o link de cadastro.

Até essa integração e os testes reais terminarem, o botão pode estar preparado para ser exibido conforme a configuração do provedor, mas a conta cloud ainda não está ativa para as participantes.

## Se for necessário oferecer entrada por e-mail depois

O SMTP próprio é uma opção posterior ao Google, para habilitar confirmação e recuperação por e-mail. Isso exige uma conta de envio, remetente em domínio controlado e configuração do SMTP no Supabase; a documentação também recomenda SPF, DKIM e DMARC. Verifique os preços e limites do fornecedor escolhido antes de contratar. Este guia não presume que qualquer serviço seja gratuito. [Configurar SMTP personalizado no Supabase](https://supabase.com/docs/guides/auth/auth-smtp)
# Nota de estado atual

O piloto foi ativado com e-mail/senha sem confirmação, por escolha explícita do usuário. Google não é necessário e não foi configurado. Este guia fica como referência para uma futura decisão de adicionar Google, não como pendência para acessar o produto.
