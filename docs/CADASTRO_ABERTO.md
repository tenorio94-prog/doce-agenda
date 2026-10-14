# Cadastro aberto — Doce Agenda

## ATIVO — atualização final de 07/10/2026

Usuário confirmou explicitamente desligar a confirmação por e-mail. Configuração salva no Supabase e verificada na API (`mailer_autoconfirm:true`). Dois cadastros reais de teste receberam sessões imediatas, sem confirmação; login/API/pedidos/pagamentos/isolamento passaram. Sessões encerradas e contas/dados temporários removidos, zero restantes.

Produção atualizada: https://doce-agenda-piloto.netlify.app/cadastro/ — deploy `6ac7024f17f80651ed48e5fc`. Chrome verificou botão Criar conta habilitado e aviso de preparação removido. Landing encaminha para cadastro/entrada e informa armazenamento por conta. Recuperação por e-mail não está disponível; tela orienta contato com quem convidou. Senhas não são consultáveis. E-mails não têm propriedade verificada nesta beta.

Os registros abaixo descrevem etapas anteriores e foram superados por esta atualização. Permanece pendente autorização para bloquear a tabela antiga `n8n_chat_histories`, sem RLS; ela não armazena as agendas do app. Não foi modificada.

## Estado em 07/10/2026

Registro sem lista de e-mails autorizados. Com autorização do usuário, restauramos o projeto gratuito existente `Projeto aprender` (`khvhnbopdluthpcduhqm`, São Paulo). A ferramenta de criar projeto estava indisponível. Nenhuma tabela anterior foi excluída.

- Tabelas próprias `pilot_agendas` e `pilot_agenda_restore_points` criadas com RLS; uma agenda privada por conta. Escritas diretas do browser bloqueadas.
- API `doce-api` publicada, versão 1, JWT obrigatório mais validação `auth.getUser`. Proprietário sempre vem da identidade verificada, nunca de metadata editável.
- Frontend de conta e adaptador cloud concluídos e compilados. Sem sessão, `/app/` e `/agenda.html` redirecionam para entrada. Demonstração local em `/demo/`, preservando a chave antiga de armazenamento. Sem fallback silencioso de cloud para local.
- Prévia: https://6ac6fa9df695c24a29acf260--doce-agenda-piloto.netlify.app/cadastro/
- Produção https://doce-agenda-piloto.netlify.app continua na versão local anterior. Cadastro público NÃO está liberado.

## Verificado

7 testes do motor, 8 do handler e 2 do adaptador passaram. Interface validada com stubs exclusivamente de teste em 320/390/430/1440 px. Capturas em `web/design/account-review/`.

Banco real: isolamento RLS, bloqueio de escrita direta, revisão concorrente, cópia atômica pré-importação e rejeição de estado inválido. API real, duas contas sintéticas temporárias: rejeição sem sessão/chave anon, agendas vazias, criação de pedido, isolamento, revisão desatualizada, pagamento idempotente e importação. Sessões encerradas; dados e contas removidos; zero dessas contas na verificação final.

Chrome confirmou redirecionamento da prévia `/app/` sem sessão. Não testamos cadastro Google, confirmação/recuperação por e-mail ou dois aparelhos físicos: o provedor ainda não está configurado.

## Para liberar

1. Ativar OAuth Google e URLs de retorno: [ATIVAR_LOGIN_PILOTO.md](historico/ATIVAR_LOGIN_PILOTO.md). Google está desabilitado. SMTP padrão Supabase atende apenas equipe, não cadastro aberto. Interface e-mail/senha desabilitada até SMTP próprio validado; confirmação de e-mail mantida.
2. Confirmar bloqueio do acesso público à tabela antiga vazia `n8n_chat_histories`, sem RLS. Pergunta enviada; nenhuma mudança automática nessa tabela. [Aviso oficial](https://supabase.com/docs/guides/database/database-linter?lint=0013_rls_disabled_in_public).
3. Testar cadastro Google real, logout/novo login e dados em duas sessões; atualizar landing para cadastro/entrada. Depois publicar em produção.

## Limites

Uma agenda por conta, sem equipes. JSON versionado é uma ponte para beta, até 5 MiB; futuramente normalizar tabelas. Mudanças de outro aparelho aparecem ao recarregar; sem Realtime. Migração local não é automática: exportar/importar exige decisão explícita. Importação preserva um ponto anterior no banco, recuperável pelo administrador; não equivale a backups externos automáticos. Backup JSON manual continua disponível.

Chave legacy anon é a única pública retornada pelo projeto. Nenhuma service-role ou segredo entrou no build. Dependências fixadas e lockfile incluído.

## Comandos (pasta web)

```powershell
npm ci
node scripts/build-cloudflare.mjs
node scripts/test-account-ui.mjs
node --test cloud/state-engine.test.mjs cloud/app-bootstrap.test.mjs
node --experimental-strip-types --test cloud/doce-api.test.mjs
python -m http.server 4173 --bind 127.0.0.1 --directory deploy-cloud/public
```

`cloud/test-live-cloud.mjs` exige duas contas sintéticas `.invalid` e quatro variáveis `CLOUD_TEST_EMAIL_A/B`, `CLOUD_TEST_PASSWORD_A/B`. Não cria contas, não imprime credenciais e encerra sessões. Operador remove os dados/contas depois. Não usar contas de participantes reais.

## Ativação sem confirmação — preparação em 07/10/2026

Usuário solicitou explicitamente cadastro sem confirmar e-mail. Código/configuração local preparados: cadastro depende da opção real mailer_autoconfirm do servidor; recuperação por e-mail não é oferecida sem SMTP, e a tela orienta contato com quem convidou. Landing preparada para cadastro/entrada e armazenamento por conta.

Build e testes passaram. A opção Confirmar e-mail do Supabase ainda está LIGADA. Confirmação adicional no momento da alteração foi solicitada pela política do navegador. Nenhuma ativação ou publicação em produção feita nesta preparação. Depois da confirmação: desligar opção/salvar, testar signup real → pedido → logout/login → persistência, publicar e verificar link final.
