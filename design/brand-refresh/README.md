# Doce Agenda — assinatura de bancada

Iteração dentro da identidade existente: creme, terracota, Lora e Manrope. A marca deixa de depender do calendário/bolo ao lado do nome. A assinatura coloca Doce em maior peso e tamanho, Agenda mais leve na mesma linha, e um traço curvo sob Doce que sugere uma assinatura. O traço não indica uma funcionalidade. Não foi criada uma fonte própria: os contornos derivam de Lora, licença SIL OFL incluída em public/fonts/Lora-OFL.txt.

SVGs em contornos, sem carregamento de fonte externa: wordmark.svg, wordmark-mono.svg, wordmark-white.svg. O favicon/app-icon é o D da assinatura, em fundo terracota. Vetores reproduzíveis: `python scripts/build-brand.py` (fontTools 4.63.0). Fonte Lora existente, variante estática wght600 em Doce e450 em Agenda, ajuste óptico de espaçamento. Sem recurso pago ou desenho de terceiros copiado. Disponibilidade de marca/registro não foi verificada.

Uso: preservar proporção, área livre mínima da altura do D/2 ao redor; cabeçalho desktop210px, cadastro178px, app185px e mobile120–160px conforme espaço. Não esticar, não adicionar o calendário antigo, não mudar o traço para outro símbolo, não usar a versão branca em fundo claro. Para ícones32px usar app-icon, nunca reduzir a assinatura completa a32px.

| Before | After | Why |
| --- | --- | --- |
| Calendário + nome pequeno | Assinatura tipográfica com hierarquia e traço próprio | Dá mais presença à marca sem competir com os controles |
| Entrar usa o mesmo preenchimento do CTA principal | Entrar com contorno; Criar conta preenchido | Direciona a primeira ação sem esconder acesso existente |
| Como funciona repetido na primeira dobra | Ver demonstração no CTA secundário | Ajuda quem quer conhecer o produto antes de se cadastrar |
| Cadastro em duas colunas entre681–760px | Colunas empilhadas até760px | Evita título/formulário comprimidos |
| Rodapé cloud diz sem sincronização | Dados ficam na conta | Alinha a mensagem ao produto publicado |

Capturas/revisão: `node scripts/review-brand-refresh.mjs`, depois de `node scripts/build-cloud-preview.mjs`. Perfis limpos e apenas dados fictícios da demonstração, sem cadastro novo ou edição de contas reais. Capturas são documentação de revisão; não são imagens usadas como UI.
