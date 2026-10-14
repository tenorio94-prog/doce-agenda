# Link de encomenda — plano de implementação

13/10/2026. Implementação direta, sem subagentes, conforme orientação mais recente.

## Decisões
- Pedidos continuam dentro de pilot_agendas.state. Solicitação é um novo status não comprometido, nunca ocupa vaga e não aparece nas entregas do dia.
- Página por conta: pilot_order_pages, sem leitura direta para anon/authenticated; configurações também no estado JSON para backup. Slug único garantido no banco.
- Função pública separada doce-public, sem JWT por definição do recurso, com rotas estritas de configuração pública, disponibilidade e envio. A API privada mantém validação de usuário.
- Disponibilidade e aceitação usam o mesmo motor; gravações públicas usam revisão otimista e RPC transacional. Uma concorrência recarrega e revalida; nenhuma vaga é reservada por solicitação.
- Limites duráveis de envio no Postgres: hash de IP por hora e página por dia, incremento atômico. Honeypot não cria dados. Não confiar em IP enviado no corpo ou num cabeçalho de cliente sem verificar o proxy da plataforma.
- Recusa é registrada no mesmo pedido. Anonimização de recusados após 90 dias e limpeza da cópia de restauração por tarefa agendada; histórico, detalhes e dados de bolo também precisam ser removidos para não reter nomes/endereço incidentalmente. Backups que a confeiteira já baixou ficam sob seu controle.
- Métricas agregadas sem identificação de visitantes: contadores de visitas e eventos por página; envio/aceite/recusa e tempos derivados de metadados do pedido.
- Página e configuração desligadas por padrão. Política de privacidade e canal de contato precisam estar disponíveis antes da ativação.

## Etapas e validação
1. Validações e motor: status, metadados, disponibilidade (90 dias), aceitação/recusa, backup.
2. Migração aditiva: página, rate limit, RPCs/concurrency, RLS, retenção. Inspecionar consultas/advisors, sem apagar contas/pedidos existentes.
3. API privada e pública, com testes de autorização, campos públicos mínimos, indisponibilidade no envio, duplicatas e limites.
4. Ajustes, destaque em Hoje/Pedidos e ações de revisão. Página /p/slug mobile, calendário, bolo, consentimento, protocolo/wa.me.
5. Testes de unidade/integração + navegador em 360 px e fluxo completo com conta sintética; teste de última vaga concorrente no banco.
6. Build e publicação piloto, mantendo opt-in; relatório de critérios e limitações reais. Teste com 3–5 confeiteiras depende de pessoas e não será apresentado como já realizado.

## Riscos a controlar
- Slug/backup em conflito não podem sobrescrever outra conta.
- IPs e contadores não podem ser lidos via API pública.
- A revisão cresce também com solicitações recebidas; a interface deve pedir atualização sem perder formulário ou sobrescrever entrada nova.
- Data no fuso America/Sao_Paulo e horário revalidados no servidor.
- Campos opcionais e legados devem permanecer compatíveis. Origens aceitas incluem lucast.app e a URL Netlify existente.
