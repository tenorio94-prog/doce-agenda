# Doce Agenda — landing e acesso

Protótipo separado do aplicativo publicado. Mostra a página inicial e a proposta de cadastro, entrada, recuperação, verificação de e-mail, configuração e primeira encomenda. Não autentica, não envia e-mails e não salva senhas ou pedidos; formulários apenas simulam a navegação. Não use dados pessoais reais.

## Preview

Na pasta `C:/Users/Restore/Documents/ebooks/projeto_B/web`, execute:

```powershell
python -m http.server 4182 --bind 127.0.0.1
```

Abra http://localhost:4182/design/landing-access/index.html. O servidor deve usar a pasta web para os caminhos relativos de logo/fontes funcionarem.

Links `?screen=signup`, `login`, `recovery`, `verify`, `setup`, `firstorder` e `done` abrem as telas de proposta. O botão “Conhecer o piloto” abre o aplicativo atual na Netlify.

## Edição

- index.html: landing e suas seções.
- prototype.js: telas de acesso, estados e navegação simulada.
- styles.css: tokens e apresentação mobile/desktop.
- DIRECAO.md: decisões de produto, marca, referências e dependências de implementação.
- CONTEUDO.md: textos e orientações dos estados.
- references/: fonte aberta do bloco de acesso Tailark, encontrado via 21st.dev, e sua licença MIT. A proposta adapta sua estrutura à marca e ao fluxo de senha; não é o snapshot literal do catálogo.

Fontes e logo pertencem ao kit já existente do projeto. Lora/Manrope usam SIL OFL, documentada nos assets de marca. Não foram introduzidas dependências de imagens externas.

## Revisão

```powershell
node design/landing-access/capture.mjs
```

O script serve apenas os assets do projeto em porta temporária, verifica overflow em 320, 390, 430 e 1440 px, título visível, carregamento das fontes e erros JavaScript. Exercita cadastro inválido/válido, mostrar senha, confirmação simulada, recuperação e passagem dos campos do primeiro pedido para sua prévia. Confere que não há persistência no localStorage. Capturas ficam em prints/ e o relatório em VERIFICACAO.json. O caminho de Playwright e do Chrome é específico desta instalação.

Revisão executada: 32 layouts passaram; telas foram inspecionadas visualmente e o estado oculto das mensagens foi corrigido antes da segunda captura. `python design/landing-access/contact-sheet.py` gera prints/visao-geral.png a partir das capturas, com recortes para facilitar comparação. As imagens completas permanecem disponíveis.

Contrastes calculados dos pares principais: texto/creme 12,98:1, apoio/creme 5,97:1, branco/ação 6,12:1, verde/cartão 6,59:1. Isso não constitui uma auditoria completa de acessibilidade; toque em aparelho físico e leitor de tela ainda não foram testados.

## Publicação e Figma

Este protótipo não foi publicado na Netlify. Cadastro e entrada reais dependem da etapa C (autenticação, armazenamento no servidor e isolamento de dados por confeitaria). Não publicar o fluxo simulado como funcional.

[Arquivo Figma editável](https://www.figma.com/design/TvzslJHCfjpRrwHqqXFQNw), criado na equipe Lucas Tenorio's team. Inclui landing desktop/mobile, cadastro, entrada, recuperação, confirmação de e-mail, configuração, primeiro pedido, prévia do resultado e confirmação de recuperação. Usa textos editáveis, auto-layout, três componentes locais, dez variáveis de cor e cinco estilos de texto. Os botões conectam as telas; Conhecer o piloto abre a aplicação atual. A entrada retorna à prévia da agenda, sem repetir onboarding.

figma-build.js registra a composição-base usada pelo MCP. A marca SVG é injetada a partir de public/logo.svg. Não execute novamente sobre o mesmo arquivo para evitar duplicar telas. Os ajustes de revisão estão registrados em FIGMA.md; capturas finais em prints/figma-*.png. O Figma é um conceito editável, não uma implementação de autenticação. O protótipo HTML continua separado e serve para experimentar os campos e a navegação.

A revisão visual individual no Figma cobriu landing desktop, cadastro, primeiro pedido e configuração. O limite MCP do plano Starter impediu capturar as outras seis telas; revisão pendente detalhada em FIGMA.md. Todas as telas foram criadas antes desse limite. Nenhum upgrade foi contratado.
