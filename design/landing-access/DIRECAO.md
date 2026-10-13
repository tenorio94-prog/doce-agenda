# Doce Agenda — descoberta e acesso

## Decisão de produto

Uma porta de entrada pública antes da agenda: a pessoa entende a ferramenta, vê uma encomenda de exemplo e pode experimentar o piloto. Na versão com contas, o fluxo será landing → cadastro → confirmação de e-mail → nome da confeitaria (opcional) → primeiro pedido → agenda. Quem já tem conta entra diretamente na agenda; onboarding só aparece quando necessário.

A interface deve explicar pedidos, prazo, combinado e saldo. Disponibilidade limita número de pedidos por data, não calcula esforço ou horas de produção. Pagamento informado precisa ser conferido para reduzir o saldo. Não apresentar cobrança, WhatsApp automático, fotos, sincronização ou resultados comerciais como funcionalidades atuais.

## Landing

- Hero: “O combinado de cada encomenda, em um só lugar.” Texto explica pedido, data, detalhes e saldo. Visual usa exemplo fictício, sem depoimentos.
- Hoje / Pedidos / Semana na demonstração, com os mesmos nomes do produto.
- Benefícios: detalhes do combinado, agenda e disponibilidade, pagamentos conferidos e saldo.
- Três passos: registrar, acompanhar, conferir. Perguntas frequentes sobre dados locais, backup e WhatsApp manual.
- Piloto atual: CTA principal “Conhecer o piloto”. Cadastro é navegação de protótipo e depende da etapa C; não publicar esse botão como cadastro funcional antes do backend.

## Acesso e primeiro uso

Cadastro simples: nome, e-mail, senha visível por opção. Não pedir telefone, CPF, cartão ou repetir dados de negócio antes de demonstrar valor. Entrada com e-mail/senha e recuperação. Verificação de e-mail informa o próximo passo; recuperação não revela existência da conta. No produto real, sessão válida e confeitaria já configurada levam diretamente a Hoje.

Configuração: nome da confeitaria opcional, com opção de fazer depois. Primeiro pedido: cliente, produto, data/horário opcional, valor total e situação. Detalhes adicionais depois; valor pode começar em zero para orçamento. Confirmar requer regras atuais de disponibilidade/modelo. Exibir resultado com data, situação e saldo; permitir adicionar pagamento posteriormente.

## Marca e interação

Tokens atuais: creme #FBF7F0, cartão #FFFEFA, tinta #392923, apoio #6F5B51, ação #A34432, verde #42644C. Lora nos títulos; Manrope em corpo, controles e moeda. Espaço amplo, linhas finas, cartões com raios 12–20 px, botões 44–48 px. Não adicionar outro logo ou paleta.

Skill Emil Kowalski: ação com resposta imediata, transform/opacity 160–220 ms, ease-out, press 0.97 apenas com ponteiro, hover só quando disponível. Teclado sem movimento decorativo, foco visível e reduced-motion. Nenhuma animação deve atrasar a ação.

## Referências e reutilização

Selecionados no 21st.dev: Tailark Hero Section 1 e Login Page 2, de Méschac Irung. Estrutura adaptada à marca; não reutilizar fotografia, logos de terceiros, métricas ou provedores sociais. Código no catálogo pede login; a fonte pública oficial equivalente do card de acesso foi obtida diretamente do repositório Tailark e está em references/tailark-login-two.tsx. Licença MIT preservada em references/TAILARK-LICENCE.md. A versão pública atual usa acesso por e-mail; nossa proposta acrescenta senha, conforme fluxo planejado. Não é importação literal do snapshot de 21st.

- https://21st.dev/@meschacirung/components/hero-section-1
- https://21st.dev/@meschacirung/components/login-2
- https://github.com/tailark/blocks/blob/main/registry/bases/radix/veil/blocks/login/two.tsx
- https://github.com/tailark/blocks/blob/main/LICENCE.md

## Figma

Arquivo novo, com telas desktop/mobile, camadas de texto editáveis, auto-layout, componentes compartilhados e tokens da marca. As telas de acesso são propostas da etapa C; anotar essa dependência fora dos frames do produto. Buscar bibliotecas e verificar Code Connect antes de importar componentes. O projeto atual não possui arquivos Code Connect.

## Dependências da implementação futura

Autenticação, confirmação/recuperação de e-mail, sessão, isolamento por confeitaria, persistência no servidor, políticas de acesso, migração voluntária e validada dos dados locais, backup e testes entre dispositivos. Definir hospedagem e custo antes de contratar; nenhum novo serviço pago foi autorizado. Importar dados locais exige mostrar conteúdo e pedir confirmação antes da troca, sem perder o backup anterior.
