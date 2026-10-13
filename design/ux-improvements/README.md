# Cinco melhorias de UI e UX

Implementação de 08/10/2026 dentro da identidade existente do Doce Agenda.

| Before | After | Motivo |
| --- | --- | --- |
| Logo muda apenas o hash; filtro e dias perdem foco | Logo ativa Hoje; controles preservam foco | Continuidade da navegação |
| Promoção antes do formulário no celular | Formulário primeiro; chamada compacta depois | Acesso mais direto |
| Regras e modelo do bolo dentro da Semana | Ajustes próprios; atalho por data; campos em acordeões | Separar consulta de configuração |
| Pagamento sem identificação; total parcial pouco explícito | Cliente/produto/total no pagamento e contagem de pedidos sem conferência | Esclarecer o alcance dos valores |
| Exemplo incluído nas contagens; landing só com prévia ilustrativa | Exemplo separado, preservado no backup; três capturas reais ampliáveis | Diferenciar demonstração de operação |

Os valores internos Informado/Conferido, as regras financeiras, a capacidade,
as versões de modelo e o formato do backup permanecem iguais. Nenhuma migração
de banco ou alteração de autenticação foi realizada. Backup/restauração agora
ficam em Ajustes. A data de exceção é vinculada explicitamente ao formulário.

## Verificação

```
node --test test.mjs
node scripts/build-cloud-preview.mjs
node scripts/test-ux-improvements.mjs
node scripts/test-deploy.mjs
node scripts/test-account-ui.mjs
node scripts/test-launch-site.mjs
```

Os testes de interface usam Playwright porque o plugin Browser não está
disponível nesta sessão. O novo QA utiliza dados e autenticação simulados,
com todas as requisições externas bloqueadas. A regressão de deploy usa o
browser-store real. As capturas agenda/semana/pagamento são de 390×844 e
alimentam os WebP da landing, com clientes e valores fictícios.

Cobertura: 320/390/768/1440 px, foco, seleção de semana, exceção futura e
persistência, campos do bolo e rótulos antigos, pagamentos informados,
conferidos, zero e excedentes, totais parciais, exemplos, importação/backup,
conta e imagens/links da landing. Sem teste físico de celular ou login real
nesta rodada. Não é uma certificação de acessibilidade.

Os testes de servidor têm relógio fixo em 01/10/2026: suas datas não se tornam
inválidas com o passar do tempo. O relógio de produção não foi alterado.
