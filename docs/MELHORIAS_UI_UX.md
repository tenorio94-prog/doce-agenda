# Doce Agenda: proposta de melhorias de UI, UX e estética (13/10/2026)

**Escopo:** landing `/`, cadastro `/cadastro/`, demonstração `/demo/` (mesmo código do app).
**Base:** `docs/AUDITORIA_2026-10-13.md` (validada aqui, sem repetir), capturas em `design/`, código em `public/` e `deploy-cloud/public/`, `PROXIMAS_IMPLEMENTACOES.md`, `DIARIO.md` e READMEs de design. Também naveguei pelo `/demo/` publicado a 390×844 e medi o DOM (sem conta, sem formulários enviados, sem login).
**Natureza:** é uma proposta. Nenhum arquivo do produto foi alterado.

## Sumário

0. [Como ler este documento](#0-como-ler-este-documento)
1. [Diagnóstico](#1-diagnóstico)
2. [Validação da auditoria: onde concordo, onde discordo e o que faltou](#2-validação-da-auditoria)
3. [UX: fluxo e clareza](#3-ux-fluxo-e-clareza)
4. [UI: sistema, componentes e estados](#4-ui-sistema-componentes-e-estados)
5. [Estética e marca](#5-estética-e-marca)
6. [Landing page](#6-landing-page)
7. [Responsivo e desktop](#7-responsivo-e-desktop)
8. [Acessibilidade como parte do design (A1–A5)](#8-acessibilidade-como-parte-do-design)
9. [Priorização em três faixas](#9-priorização-em-três-faixas)
10. [O que NÃO mudar](#10-o-que-não-mudar)
11. [Perguntas para a sessão com a confeiteira](#11-perguntas-para-a-sessão-com-a-confeiteira)
12. [Anexo: tokens propostos](#12-anexo-tokens-propostos)

---

## 0. Como ler este documento

Cada proposta tem um ID (`UX-`, `UI-`, `MA-` para marca, `LP-` para landing, `RD-` para responsivo e `AC-` para acessibilidade) e os seguintes campos:

- **Problema**, com o ID da auditoria (T/A/U) ou um achado novo (N1…, seção 2.3).
- **Mudança**, em termos implementáveis.
- **Impacto** alto/médio/baixo, **esforço** P (até meio dia), M (1 a 2 dias) ou G (mais que isso), e **risco**.
- **Base**, com o tipo de evidência:
  - **Medido:** medi no DOM do site publicado nesta sessão ou calculei o contraste.
  - **Código:** li no fonte.
  - **Observado:** vi em captura.
  - **Opinião:** julgamento de design, defensável, mas sem dado de uso.
  - **Hipótese:** depende de observar a confeiteira antes de decidir.

Não há analytics no produto, e isso é uma escolha de privacidade que mantenho. Por isso, nenhuma proposta traz números de conversão. O que muda decisões aqui é a observação de uso (seção 11).

---

## 1. Diagnóstico

**Impressão geral.** O produto parece sério, calmo e confiável, e é coerente entre landing, cadastro e app. A dupla Lora + Manrope sobre creme dá um ar de "caderno bem cuidado", sem cara de planilha nem de app infantil. O ponto fraco é que, **dentro do app, ele parece mais um documento do que uma ferramenta**. Há muitos fios de 1 px e texto pequeno, quase nenhuma cor com significado, e as ações mais valiosas para a rotina (avançar a situação do pedido, mandar o resumo para a cliente) ficam escondidas no fim de um modal. Na primeira visita, o demo também não diz que é demo e não oferece caminho de volta.

**O que já funciona e deve ser preservado:**
- Paleta quente com contraste de texto alto (12,98:1 tinta/papel; coral 5,73:1 no papel). **Medido.**
- Copy direta e orientada à rotina ("Pare de procurar o combinado no meio da conversa").
- Divulgação progressiva no formulário, campos de 47 px, fonte de 16 px nos campos (evita o zoom do iOS) e `autocomplete` correto.
- A decisão de 08/10 de tirar a decoração do "Hoje" e de esconder o financeiro zerado.
- Separação clara entre "informado" e "conferido" nos pagamentos. É o diferencial conceitual do produto e a interface já o explica bem.
- Nenhuma dependência de terceiros, nenhuma fonte externa e nenhum rastreador.

**As 3 maiores oportunidades:**
1. **O demo é um beco sem saída e não diz o que é.** No `/demo/` não aparecem a palavra "demonstração", nenhum link de volta e nenhum "Criar conta". O único link da página é o logo (`#hoje`). **Medido.** Quem gostou não tem para onde ir, e quem cadastrou pedidos reais ali pode perdê-los ao limpar o navegador. Ver UX-1.
2. **A cor não carrega significado e a hierarquia do cartão de pedido é fraca no celular.** No celular, o nome da cliente sai a 12 px e o valor a 13 px. A barra lateral de "Em produção" e de "Entregue" sai coral (a cor de ação) e não combina com o selo. Ver UI-3, UI-4 e N4.
3. **O ciclo "conversa → pedido → resposta para a cliente" tem atrito.** "Detalhes do combinado", que é a promessa da landing, fica escondido em "Mais detalhes". Data e hora vão num campo único. O valor abre com `0`. Depois de salvar, nada sugere mandar o resumo para a cliente. Ver UX-3, UX-4 e UX-5.

---

## 2. Validação da auditoria

### 2.1 Concordo (com ajustes de prioridade)

| ID | Posição | Comentário |
|---|---|---|
| T5, T6 | Concordo, e são também tarefas de design | Ícone de tela inicial e imagem de prévia do WhatsApp são peças de marca. Ver LP-2 e MA-5. |
| A1 | Concordo | Confirmei que os rótulos da barra inferior saem a 10 px (medido). Achei mais dois: `.day-availability` ("Fechado"/"Lotado" na Semana) a 10 px e `.nav-count` a 9 px no celular (código). |
| A3 | Concordo, com a causa | `.field input:focus{outline:none}` tem especificidade (0,2,1) e vence `input:focus-visible{outline:3px…}` (0,1,1) do mesmo arquivo. Por isso o anel some. Correção em AC-3. |
| A4 | Concordo, baixa prioridade | Proponho `--faint:#7a665b` (5,07:1 no papel, 5,36:1 no cartão, 4,54:1 no creme, que é o limite; não usar `--faint` sobre creme). |
| U1 | Concordo, e é a mais urgente do cadastro | Confirmei no código: `showError` em `account-ui.js` mostra `error.message` cru. Ver UX-6. |
| U3 | Concordo | Vale registrar que isso é **regressão**. Na versão de 07/10 havia um botão "Ver exemplo" visível (`design/brand-refresh/demo-1440.png`), e o refinamento de 08/10 o levou para dentro de um `<details>`. Ver UX-1. |
| U5, U6 | Concordo | Ver UX-4. |
| U7 | Concordo e amplio | O problema não é só a escala. São **três folhas de estilo com tokens divergentes** (N7) e quatro "camadas" de sobrescrita em `style.css`. Ver UI-1. |
| U8 | Concordo | Ver RD-1. |
| U9 | Concordo, como opinião | Com "Mostrar" disponível, o segundo campo de senha é atrito. Decisão de produto. |

### 2.2 Discordo ou corrijo

1. **A2 está superestimado para o celular.** A 390 px, medi "Ver semana" 73×**44**, "Baixar backup" 88×**44** e "Ver exemplo" 242×**44**, porque a regra `.text-link{min-height:44px}` vale até 760 px. Os 29–31 px da auditoria batem com o desktop, onde essa regra não se aplica e o critério da WCAG 2.2 **2.5.8 (AA)** pede no mínimo 24×24 px CSS. Esses alvos passam. O que continua pequeno de verdade:
   - o logo, com 31 px de altura (passa no 2.5.8; fica abaixo dos 44 pt recomendados pela Apple HIG);
   - o rótulo "Usar modelo de personalização de bolo", com área clicável de 290×38. A caixa de seleção mede 15×18, mas o rótulo inteiro é clicável;
   - "Abrir demonstração" no cadastro, com 19 px de altura.

   **Medido.**
2. **A causa do U4 é a correção do A2.** "Baixar backup" é um `<button>` inline-block com `min-height:44px` dentro de um parágrafo de 12 px. Ele estica a caixa da linha, e daí vem a entrelinha irregular. Corrigir uma coisa sem olhar a outra recria o problema. Ver UX-2. **Código + medido.**
3. **U2: o vazio é menor que "50%", e a redundância não afeta leitor de tela.** A 390×844, o conteúdo termina em y=620 e a barra começa em ~779, o que dá cerca de 160 px (≈19% da tela). Os botões duplicados escondidos usam `display:none` e ficam fora da árvore de acessibilidade. A duplicação visível real só acontece **entre 501 e 760 px**, onde "Novo pedido" do cabeçalho e "Novo" da barra inferior aparecem juntos. Concordo que o estado vazio é a primeira impressão e merece trabalho (UX-1). **Medido + código.**
4. **"Folha inferior" não descreve o formulário.** O formulário de pedido é um modal centralizado (y 42→802 em 844), com a barra de ações fixa no fim. Funciona. Não proponho virar *bottom sheet* agora (ver UI-8).
5. **A5 (modo escuro): recomendo não fazer agora.** Dobraria a matriz de QA de cores num piloto de uma pessoa, e não há evidência de demanda. Mantenha `color-scheme: light`. Fica em "validar depois".

### 2.3 Achados novos (não estão na auditoria)

| ID | Achado | Base |
|---|---|---|
| **N1** | O `/demo/` não se identifica como demonstração e não tem saída: nenhum link para a landing ou para o cadastro. | Medido |
| **N2** | As bordas dos campos do cadastro (`#b5a297` sobre `#fffefa`) têm **2,43:1**, abaixo dos 3:1 do critério WCAG **1.4.11 (Contraste não textual)**. O app usa `#9f8b7f` (3,21:1), que passa. | Medido (cálculo) |
| **N3** | Os números dos dias na Semana usam **Georgia** (`.day-number`, nunca sobrescrito), com algarismos de estilo antigo ("28 29 30" com descendentes). Fogem da identidade e leem pior em tamanho pequeno. | Código + observado (`ux-improvements/semana.png`) |
| **N4** | A cor do status é inconsistente entre a barra lateral e o selo. `.row-accent` só tem cor para confirmed/ready/cancelled. **Orçamento, Aguardando, Em produção e Entregue** caem no coral padrão: "Em produção" fica com barra coral e selo azul-acinzentado, "Entregue" com barra coral e selo verde. | Código + observado (`app-polish-review/LIVE-orders-mobile-390x844.png`) |
| **N5** | Plural errado em Ajustes: "**1 encomendas** ocupam esta data" e "**1 pedidos** já combinados" (`app.js` `availabilityPanelMarkup`). | Código + observado (`ux-improvements/ajustes.png`) |
| **N6** | No celular, o H1 "Hoje" encosta no fio do cabeçalho: distância de **0 px** entre o fim do `.topbar` e o topo do H1. | Medido |
| **N7** | Tokens divergem entre arquivos: `--muted` #6f5b51 (app/conta) × #715f55 (landing); `--cream` #f3eadc × #f1e8dc; `--line` #e7dcd1 × #e5d9cd; coral escuro #843524 × #853a2b. Há também cores soltas (`#866126`, `#4c7157`, `#626e8c`…) e regras antigas com Georgia ainda em `style.css`. | Código |
| **N8** | No detalhe do pedido, a 390×844 o conteúdo tem 886 px num modal de 758 px. "Copiar resumo para WhatsApp" e "Editar pedido" ficam **abaixo da dobra**. | Medido |
| **N9** | Os estados dos dias da Semana dependem de bordas fracas: hoje `#e4b6a8` (1,73:1), fechado (1,81:1), lotado (1,69:1). O dia de hoje não tem texto nem menção no `aria-label`. | Medido (cálculo) + código |
| **N10** | `BRAND.md` está desatualizado: fala em Arial, `#FFF8F0`/`#C45B44`/`#52372D` e no símbolo agenda+bolo. A marca real hoje é Lora/Manrope, `#a34432` e a assinatura tipográfica. Quem implementar seguindo o BRAND.md vai errar. | Código |
| **N11** | No celular não existe indicador de salvamento: `.connection{display:none}` abaixo de 760 px. No desktop aparece "Salvo neste navegador". | Código |
| **N12** | A terminologia oscila entre **pedido** e **encomenda** na mesma tela ("Cadastre sua primeira encomenda" + botão "Novo pedido"; Semana diz "2 encomendas"; navegação diz "Pedidos"). | Código |
| **N13** | O campo "Valor total" é `type="number"`. Com teclado/locale pt-BR, a vírgula decimal pode não ser aceita em alguns navegadores. **Não testei em aparelho**, fica como hipótese a verificar. | Código + hipótese |

---

## 3. UX: fluxo e clareza

### UX-1. Demo que se apresenta, mostra valor e leva à conta
- **Problema:** N1, U2, U3. Quem clica em "Experimentar sem cadastro" cai numa tela quase vazia, sem saber que é demo, com o exemplo escondido e sem caminho para criar conta.
- **Mudança** (apenas quando `DoceApi.mode !== 'cloud'`):
  1. **Faixa fixa de modo demo** abaixo do cabeçalho: uma linha, fundo `--cream`, texto 13 px. Conteúdo: "**Demonstração.** O que você cadastrar fica só neste navegador." e um link-botão à direita "Criar conta grátis →" (para `/cadastro/`). Não deve ser dispensável, porque protege os dados da pessoa.
     ```html
     <div class="demo-bar" role="note"><p><strong>Demonstração.</strong> O que você cadastrar fica só neste navegador.</p><a class="demo-bar-cta" href="/cadastro/">Criar conta grátis</a></div>
     ```
     ```css
     .demo-bar{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:12px 0 0;padding:8px 12px;border-radius:12px;background:var(--cream);font-size:13px;line-height:1.4}
     .demo-bar p{margin:0}
     .demo-bar-cta{display:inline-flex;align-items:center;min-height:44px;flex:0 0 auto;color:var(--coral-dark);font-weight:700}
     ```
  2. **Exemplo visível no lugar do `<details>`:** dentro do bloco de boas-vindas, renderizar o pedido fictício **como um cartão real** (`rowMarkup`) com o selo "Exemplo" e, abaixo, "Toque para ver como fica um pedido completo". O cartão fica **no bloco de boas-vindas, não em "Pedidos de hoje"**. Assim continua valendo a decisão de 08/10 de que exemplos não entram em listas, contagens nem finanças.
  3. Remover "• exemplo fictício" do **nome** da cliente de exemplo (`browser-store.js`), porque o selo já diz isso. Hoje o detalhe repete "fictício" três vezes e o nome quebra em três linhas no H2.
- **Impacto:** alto. **Esforço:** P–M. **Risco:** baixo. Mexe só em apresentação; a regra "exemplo fora das contagens" fica intacta.
- **Base:** medido (N1) + opinião sobre a forma. **Contraria decisão?** Não. Volta a deixar o exemplo visível, como antes de 08/10, mas sem reintroduzir decoração nem colocá-lo em listas.

### UX-2. Mensagem de armazenamento que a pessoa lê, entende e consegue acionar
- **Problema:** U4 (e a causa dele, seção 2.2), mais N11. Uma mensagem com risco real de perda ("limpar o navegador apaga a agenda") aparece como rodapé torto.
- **Mudança:** transformar `.storage-note` num bloco de duas linhas com o botão em linha própria:
  ```css
  .storage-note{display:grid;grid-template-columns:20px 1fr;gap:4px 10px;margin:24px 0 0;padding:12px 14px;border:1px solid var(--line);border-radius:12px;background:var(--card);font-size:13px;line-height:1.45}
  .storage-note .text-link{grid-column:2;justify-self:start;display:inline-flex;align-items:center;min-height:44px;margin:0}
  ```
  Ícone de 20 px na primeira coluna: uma nuvem riscada (demo) ou uma nuvem (conta), no mesmo traço de 1,8 dos ícones atuais.
  - **Texto no demo:** "Seus pedidos ficam só neste navegador. Se limpar os dados do navegador, eles somem. **Baixar cópia de segurança**".
  - **Texto na conta:** "Salvo na sua conta. Para ver mudanças feitas em outro aparelho, puxe para atualizar." Usar "puxe para atualizar" só se esse gesto funcionar de fato; caso contrário, manter "Recarregue a agenda".
  - Mostrar no celular o indicador de salvamento que já existe no desktop: um ponto de 8 px + "Salvo" no cabeçalho, ao lado de "Ajustes", 12 px. Resolve N11.
  - A "data do último backup e lembrete discreto" já está **planejada e adiada** em PROXIMAS §4. Quando for feita, o lugar natural é este bloco ("Última cópia: 10/10").
- **Impacto:** alto (protege dados). **Esforço:** P. **Risco:** baixo.
- **Base:** medido + código.

### UX-3. "Combinado" fora do "Mais detalhes"
- **Problema:** a landing promete "pare de procurar o combinado no meio da conversa", mas o campo "Detalhes do combinado" fica escondido em "Mais detalhes". Quem agenda por conversa precisa justamente colar o trecho combinado.
- **Mudança:** mover o `<textarea name="details">` para logo abaixo de "Produto", com `rows="2"`. O campo cresce ao focar (`field-sizing: content` onde houver suporte; nos demais navegadores, `rows` fixo funciona). Placeholder: "Cole aqui o que foi combinado na conversa (sabor, tamanho, decoração…)". "Mais detalhes" continua com entrega, local, próxima ação, contato e alteração pendente.
- **Impacto:** médio–alto. **Esforço:** P (troca de lugar no HTML). **Risco:** baixo. O formulário fica ~70 px mais alto.
- **Base:** opinião, apoiada na proposta de valor declarada. **Hipótese a validar:** se, na sessão observada, ela abre "Mais detalhes" em quase todo pedido, a mudança se confirma.

### UX-4. Data, hora e valor mais rápidos de preencher
- **Problema:** U5, U6, N13.
- **Mudança:**
  1. **Atalhos de data** acima do campo: chips "Hoje", "Amanhã" e os dois próximos sábados ("Sáb 17", "Sáb 24"), cada um com 44 px de altura e 13 px de texto. Tocar num chip preenche só a data; o horário fica para a pessoa escolher. A ideia dos sábados é **hipótese**: concentração de entregas no fim de semana é comum em confeitaria, mas deve ser confirmada.
  2. **Separar data e hora** em dois campos nativos (`type="date"` + `type="time"`, lado a lado a partir de 360 px) e montar `dueAt` no envio. Os seletores separados são mais simples que `datetime-local` no Android e no iOS.
  3. **Valor:** começar vazio, com `placeholder="0,00"`, e trocar para `type="text" inputmode="decimal" autocomplete="off"`, aceitando "150", "150,5" e "1.250,00" na leitura. A validação fica em JS. O `required` continua; a mensagem de erro passa a ser em português ("Informe o valor total. Se ainda não sabe, use 0.").
- **Impacto:** médio. **Esforço:** M (o item 2 mexe em leitura e gravação de `dueAt`; testar fuso e pedidos antigos). **Risco:** médio. Exige regressão de capacidade/antecedência, que dependem de `dueAt`.
- **Base:** código + hipótese. N13 precisa de teste em aparelho Android e iOS antes de decidir o item 3.

### UX-5. Depois de salvar, oferecer o próximo passo natural
- **Problema:** o resumo para WhatsApp é a ponte com a cliente, mas fica no fim do detalhe e abaixo da dobra (N8). Depois de salvar, o app só fecha o formulário.
- **Mudança:**
  1. O toast pós-salvar ganha uma ação: "Pedido salvo. **Copiar resumo**". O toast precisa durar mais (~6 s) quando tiver ação e ser alcançável por teclado; se ficar complicado, usar um banner no topo da lista.
  2. No detalhe, **fixar a barra de ações no celular**, como já acontece no formulário:
     ```css
     @media (max-width:760px){.detail-dialog .detail-actions{position:sticky;bottom:0;z-index:1;margin-inline:-18px;padding:12px 18px calc(12px + env(safe-area-inset-bottom,0px));background:var(--card)}}
     ```
  3. **Hipótese (validar antes):** usar `navigator.share({text})` quando disponível, com o botão "Enviar resumo…". Ele abre a folha de compartilhamento do próprio sistema, onde o WhatsApp aparece. O app não contacta ninguém, mas **isso encosta na decisão registrada** de que integração com WhatsApp fica fora do primeiro ciclo e na FAQ ("o app não envia mensagens nem se conecta ao WhatsApp"). A FAQ continuaria verdadeira, mas a decisão é da dona do produto. Manter "Copiar" como alternativa sempre.
- **Impacto:** alto no uso diário. **Esforço:** P (itens 1–2), P (item 3). **Risco:** baixo.
- **Base:** medido (N8) + opinião.

### UX-6. Erros de rede no cadastro em português e com saída
- **Problema:** U1.
- **Mudança:**
  1. Em `account-ui.js`, trocar `showError` por um tradutor com lista fechada de casos e fallback genérico. Nunca mostrar mensagem crua da biblioteca.
     ```js
     const friendlyError = (error, fallback) => {
       const raw = String(error?.message || "");
       if (error?.name === "TypeError" || /failed to fetch|networkerror|load failed/i.test(raw))
         return "Não conseguimos falar com o servidor. Confira a internet ou desative o bloqueador de anúncios e tente de novo.";
       if (/invalid login credentials/i.test(raw)) return "E-mail ou senha não conferem.";
       if (/already (registered|exists)/i.test(raw)) return "Já existe uma conta com esse e-mail. Use a aba Entrar.";
       return fallback; // registrar `raw` no console para suporte
     };
     ```
  2. Junto da mensagem, colocar o botão **"Tentar de novo"** (secundário, 48 px), que refaz a checagem de disponibilidade e o envio.
  3. O aviso âmbar "O cadastro está sendo preparado…" deve começar **`hidden` no HTML** e só aparecer quando a checagem responder "não configurado". Hoje ele começa visível e some, o que causa o "pisca". Enquanto a checagem roda, mostrar o botão "Criar conta" em estado de carregamento ("Verificando…", desabilitado). Nunca mostrar o aviso âmbar e o erro vermelho ao mesmo tempo.
  4. Corrigir N2: borda dos campos do cadastro para `#9f8b7f` (3,21:1).
- **Impacto:** alto (cadastro é a conversão). **Esforço:** P. **Risco:** baixo. É preciso conferir os textos reais de erro do Supabase usados hoje.
- **Base:** código + auditoria.

### UX-7. Avançar a situação com um toque
- **Problema:** para passar de "Confirmado" a "Em produção" a "Pronto" a "Entregue", hoje é preciso abrir o detalhe, tocar em "Editar pedido", achar o `<select>` e salvar. Isso dá 4 a 5 toques para a ação mais frequente do dia.
- **Mudança:** no detalhe, abaixo do selo, um botão secundário "Marcar como **Em produção**" (sempre o próximo estado da sequência). Ele usa o mesmo endpoint de edição, com as regras de capacidade e data que já existem (confirmar sem data deve continuar bloqueado, com a mesma mensagem). "Cancelado" continua só pelo formulário, para evitar toque acidental.
- **Impacto:** alto (hipótese). **Esforço:** M. **Risco:** médio. Passa pelas regras de capacidade e histórico, então precisa da revisão principal, como registrado em PROXIMAS §9.
- **Base:** opinião. **Hipótese a validar:** ela realmente atualiza a situação ao longo do dia ou só registra "Confirmado"? Se não atualizar, este item cai de prioridade.

### UX-8. Linguagem: um glossário curto
- **Problema:** N12, e frases financeiras densas ("inclui produção, prontos e entregues; não é dinheiro recebido"; "Excedentes não reduzem o saldo de outros pedidos").
- **Mudança:**
  - **"Pedido"** em toda a interface do app (navegação, botões, contagens). **"Encomenda"** só no marketing, se quiser.
  - Reescritas sugeridas:
    - "Valor dos pedidos confirmados" → nota "Soma dos pedidos confirmados. Ainda não é dinheiro recebido."
    - "Saldo a receber" → nota "Conta só pagamentos que você conferiu."
    - A frase sobre excedentes vai para um "Como calculamos?" recolhível.
  - Corrigir os plurais de N5 com o mesmo padrão já usado em `renderOrders` (`n === 1 ? … : …`).
- **Impacto:** médio. **Esforço:** P. **Risco:** baixo. As regras de cálculo não mudam, só o texto.
- **Base:** código + opinião.

### UX-9. Ajustes: ordem que segue o raciocínio
- **Problema:** na tela de Ajustes, o campo "Data para definir uma exceção" vem **antes** das regras recorrentes, e há cartão dentro de cartão dentro de cartão. **Observado** (`ux-improvements/ajustes.png`).
- **Mudança:** ordem nova: 1) Regras da semana; 2) Exceções por data (com o seletor de data **dentro** desta seção); 3) Modelo do bolo; 4) Cópia de segurança. Remover o contorno interno do `<form>` em `.availability-settings form`, porque o cartão externo já agrupa. Os dias fechados ficam como chips de alternância ("Seg", "Ter"…, 44 px) em vez de 7 caixas de seleção em duas colunas.
- **Impacto:** médio. **Esforço:** P–M. **Risco:** baixo.
- **Base:** observado + opinião. **Contraria decisão?** Não. Ajustes continua como tela própria (decisão de 08/10).

---

## 4. UI: sistema, componentes e estados

### UI-1. Um arquivo de tokens compartilhado
- **Problema:** U7, N7.
- **Mudança:** criar `public/tokens.css`, com o conteúdo da seção 12, e carregá-lo antes de `style.css`, `landing.css` e `account.css`. Ele fica na mesma origem, sem dependência externa. Em seguida, substituir os valores soltos por `var(--…)` **um componente por vez**, começando por cor e só depois tipografia. Não fazer um "grande refatoramento" de uma vez: o `style.css` tem camadas de sobrescrita, e uma limpeza ampla pode quebrar telas que já passaram por QA.
- **Impacto:** médio (manutenção, consistência). **Esforço:** M. **Risco:** médio se feito de uma vez, baixo se incremental.
- **Base:** código.

### UI-2. Escala tipográfica com piso de 12 px
- **Problema:** A1, U7.
- **Escala proposta** (Manrope para interface e dados, Lora para títulos de página e momentos de marca):

  | Token | px | Uso |
  |---|---|---|
  | `--text-xs` | 12 | piso absoluto: selos, rótulos da barra inferior, metadados, contadores |
  | `--text-sm` | 13 | texto secundário, dicas de campo, links de seção |
  | `--text-md` | 15 | corpo, nome da cliente no cartão, valores no cartão |
  | `--text-lg` | 18 | títulos de seção ("Pedidos de hoje"), destaque da próxima ação |
  | `--text-xl` | 22 | título de modal no celular, número grande do resumo |
  | `--text-2xl` | 28 | H1 de página no celular (Lora) |
  | `--text-display` | clamp(38px, 6vw, 76px) | só landing/cadastro (Lora) |

- **Mudanças concretas:**
  - Barra inferior: rótulos 12 px (de 10).
  - `.nav-count` 12 px, com `min-width:20px`.
  - `.day-availability` 12 px.
  - `.row-client` 15 px/700; `.row-product` 14 px; `.row-meta` 13 px; `.row-total` 15 px.
  - Eyebrows: **remover dentro do app** ("TUDO NO MESMO LUGAR", "AGENDA SEMANAL", "PREFERÊNCIAS DA AGENDA", "NOVA ENCOMENDA"). São decorativas, já estão ocultas no "Hoje" no celular e repetem o título. Na landing e no cadastro, subir para 12 px com `letter-spacing:.08em`.
  - "Exemplo fictício" da landing: 12 px.
  - Dica de senha e aviso de termos: 13 px.
- **Impacto:** alto. **Esforço:** P. **Risco:** baixo. Os cartões ficam ~10 px mais altos; conferir 320 px.
- **Base:** medido + auditoria. O piso de 12 px é **opinião de design**: a WCAG não define tamanho mínimo de fonte, só exige que o texto possa ser ampliado (1.4.4).

### UI-3. Status com cor semântica e consistente
- **Problema:** N4. Além disso, o coral é ao mesmo tempo a cor de ação, de marca e, sem querer, de status.
- **Mudança:** um mapa único, aplicado ao selo **e** à barra lateral. O coral sai do vocabulário de status.

  | Situação | Grupo | Texto / fundo | Contraste |
  |---|---|---|---|
  | Orçamento | antes de fechar | `#71553b` / `#f3eadc` | 5,75:1 |
  | Aguardando confirmação | antes de fechar | `#79521d` / `#fbf0d9` | 6,11:1 |
  | Confirmado | combinado | `#42644c` / `#e8f0e8` | 5,72:1 |
  | Em produção | em andamento | `#46566f` / `#e9edf2` | 6,33:1 |
  | Pronto | em andamento | `#2f5d52` / `#e3eeea` | 6,30:1 |
  | Entregue | encerrado | `#5c5049` / `#ece6df` + ícone ✓ | 6,28:1 |
  | Cancelado | encerrado | `#665c55` / `#f0ece9`, cartão com `opacity:.75` | 5,54:1 |

  ```css
  .row-accent{background:var(--status-fg,var(--muted))}
  .status-quote{--status-fg:#71553b}.status-waiting{--status-fg:#79521d}
  .status-confirmed{--status-fg:#42644c}.status-production{--status-fg:#46566f}
  .status-ready{--status-fg:#2f5d52}.status-entregue{--status-fg:#5c5049}.status-cancelled{--status-fg:#a7928a}
  ```
  O coral fica reservado para **ação** (botões, links) e, em tom de erro (`--error`), para **problema** (formulário inválido, dia lotado). Os selos mantêm o texto, então a cor nunca é o único sinal (WCAG 1.4.1).
- **Impacto:** alto (leitura rápida da lista). **Esforço:** P. **Risco:** baixo.
- **Base:** código + cálculo de contraste.

### UI-4. Cartão de pedido: hierarquia para quem olha de relance
- **Problema:** no celular, o nome da cliente sai a 12 px e o valor a 13 px. A informação mais urgente do dia (o **horário**) tem o mesmo peso que "Retirada".
- **Mudança:** estrutura proposta:
  - linha 1: cliente (15/700) e valor (15/700, tabular);
  - linha 2: produto (14, `--muted`, até 2 linhas);
  - linha 3: **horário em destaque** (13/700, `--ink`), seguido de modo e saldo (13, `--muted`);
  - selo à direita na linha 3.

  O saldo pendente aparece como "Falta R$ 100" em `--wait` (dourado) quando houver pagamento conferido parcial. Manter a barra lateral de 5 px (UI-3). Padding de 14 px e raio de 12 px.
- **Impacto:** alto. **Esforço:** P. **Risco:** baixo.
- **Base:** medido + opinião.

### UI-5. Barra inferior com indicador de ativo legível
- **Problema:** A1. O estado ativo é um fio de 2 px no topo, mais uma troca de cor.
- **Mudança:** rótulo 12 px; ícone 24 px; um **indicador em pílula** de 56×30 px atrás do ícone ativo, com fundo `--coral-soft` (`#f8e8e1`) e ícone em `--coral-dark`. O padrão é o "active indicator" da barra de navegação do Material 3, que também usa rótulo de 12. O "Novo" continua como botão preenchido coral, com ícone SVG "+" no lugar do caractere `＋` de largura dupla (hoje é o único ícone que não é SVG). Altura total de 64 px mais a área segura.
- **Alternativa considerada:** usar o traço curvo da assinatura como sublinhado do item ativo. **Rejeitada**, porque o README da marca registra que "o traço não indica uma funcionalidade" e pede para não transformá-lo em outro símbolo.
- **Impacto:** médio. **Esforço:** P. **Risco:** baixo.
- **Base:** auditoria + opinião.

### UI-6. Estados de interação completos
| Estado | Hoje (código) | Proposta |
|---|---|---|
| Foco | App: anel sage de 3 px. Cadastro: sem anel (A3). | Um só padrão em todo lugar: `outline:3px solid var(--focus); outline-offset:2px`. Em campo de texto, também a borda em `--focus`. |
| Desabilitado | `opacity:.58; cursor:wait` | `cursor:not-allowed` (o cursor `wait` indica carregamento, não bloqueio), fundo `--cream`, texto `--muted`, borda `--line`. Opacidade baixa deixa texto abaixo de 4,5:1. A WCAG isenta componentes inativos (1.4.3), mas a pessoa precisa conseguir ler o que está bloqueado. |
| Carregando | Spinner só na carga da agenda; "Restaurando…" no restaurar | Padronizar botão em envio: texto "Salvando…", `aria-busy="true"` e spinner de 16 px à esquerda. Vale para salvar pedido, salvar pagamento, criar conta e entrar. |
| Erro de campo | Um `.form-error` no topo do formulário | Erro **no campo**: borda `--error` de 2 px, `aria-invalid="true"` e mensagem de 13 px logo abaixo, ligada por `aria-describedby`. Manter o resumo no topo só quando houver 2 ou mais erros. |
| Vazio | "Hoje" alinhado à esquerda, sem moldura (08/10). Pedidos e Semana ainda centralizados com borda tracejada. | Unificar no padrão de 08/10: texto à esquerda, sem tracejado, com uma ação quando fizer sentido. |
| Hover | Existe e está restrito a `hover:hover` | Manter. |
| Pressionado | `scale(.97)` com `prefers-reduced-motion` respeitado | Manter. |

- **Impacto:** médio. **Esforço:** M (erro por campo); P (o resto). **Risco:** baixo.

### UI-7. Ícones e glifos
- Trocar os glifos de texto por SVG no mesmo traço (1,8, cantos arredondados): `‹ ›` da Semana viram chevrons de 20 px; `×` dos modais vira um X de 20 px; `＋` vira "+" em SVG; `↗` de "Alterações para revisar" vira chevron à direita. Hoje esses glifos mudam de desenho conforme a fonte de fallback do aparelho.
- "Ajustes" no cabeçalho do celular: manter o texto (é mais claro que uma engrenagem sozinha) e dar `min-height:44px`.
- **Impacto:** baixo. **Esforço:** P. **Risco:** baixo.

### UI-8. Modais no celular (para depois)
Converter os modais em *bottom sheet* ancorado (largura total, raio de 20 px só no topo, `max-height:92dvh`) deixaria "Salvar" ao alcance do polegar e daria mais altura útil. Hoje o modal centralizado já termina em y=802 de 844 e tem ações fixas. Por isso classifico como **baixo impacto agora**: fica para quando houver queixa observada.

### UI-9. Microinterações (com parcimônia)
- Depois de salvar ou editar, destacar o cartão alterado por 1,2 s (fundo `--coral-soft` voltando para `--card`, sem movimento). Ajuda a pessoa a achar o que acabou de mexer. Com `prefers-reduced-motion`, a troca é instantânea, sem transição.
- Ao conferir um pagamento, o selo "Informado" troca para "Conferido" com um ✓. A mudança de cor já é a confirmação; nada de confete.
- **Impacto:** baixo. **Esforço:** P. **Base:** opinião.

---

## 5. Estética e marca

**Princípio:** o "doce" deve vir de **calor, cuidado e acabamento**, não de ornamento. A dona já rejeitou flor e calendário decorativo (08/10), e isso é bom sinal: a marca quer parecer uma profissional organizada, não um enfeite de festa.

### MA-1. Cor com papel definido
- O **creme** é a superfície de agrupamento: blocos de contexto como "Próxima ação", o resumo do pagamento e a faixa do demo. É o calor da marca, hoje subutilizado no app, que está quase todo em `--paper` com fios.
- O **coral** é só ação e marca: um botão primário por tela, links e o "Novo".
- O **sálvia** significa "está combinado, está certo": confirmado, conferido, salvo, foco.
- O **dourado** (`--wait`, já existente) significa "falta algo": aguardando, saldo pendente, lembrete de backup.
- O **vermelho de erro** (`--error #a32e34`) aparece só com ícone e texto, nunca sozinho, porque fica perto do coral.
- **Impacto:** médio. **Esforço:** P (com UI-1 e UI-3). **Base:** opinião.

### MA-2. Tipografia como principal elemento de marca
- **Lora** para o H1 de cada página, o nome da cliente no detalhe, a data grande da Semana e os títulos da landing. **Manrope** para todo dado: horários, valores, contagens.
- Corrigir N3: `.day-number` passa para Manrope 700 com `font-variant-numeric: lining-nums tabular-nums`. Lora com numerais alinhados também funciona; o que não pode é Georgia.
- **Impacto:** baixo–médio. **Esforço:** P.

### MA-3. Forma: o arco como assinatura, só fora do app
O arco do topo da foto da landing (raio de 160 px) é a única forma própria da marca. Lembra vitrine e cúpula de bolo sem desenhar nada disso. Proposta: usá-lo **só** em superfícies de marketing (landing, imagem de compartilhamento, molduras das capturas do tour) e na tela de abertura do ícone instalado (MA-5). **Dentro do app, nenhuma forma decorativa**, em respeito à decisão de 08/10.

### MA-4. Fotografia: menos flor, mais bancada real
- **Problema (observado):** a foto do herói é gerada por IA e tem flores cor-de-rosa no bolo e no primeiro plano. Aproxima-se justamente do clichê "confeitaria floral" que a dona rejeitou no app. O DIÁRIO registra que a imagem não retrata usuária real. No celular, ela ocupa ~450 px depois do cartão de prévia.
- **Proposta (próxima rodada):** quando houver piloto com autorização de imagem, trocar por **foto real** de bancada com o celular apoiado (mãos, papel-manteiga, bico de confeitar, sem rosto se ela preferir). Até lá, recortar a atual para reduzir as flores (`object-position` mais à direita/acima) e limitar a altura no celular a `clamp(260px, 70vw, 360px)`.
- **Impacto:** médio. **Esforço:** P (recorte) / M (foto real). **Base:** observado + **hipótese** (validar se a foto "parece com ela").

### MA-5. Ícone instalado e imagem de compartilhamento
Usar o `app-icon.svg` (o "D" sobre coral) para gerar `apple-touch-icon` 180×180 e os PNG 192/512 do manifest (T5), com `theme_color:#fbf7f0` e `background_color:#fbf7f0`. Ver também LP-2.

### MA-6. Tom de voz
O tom atual está certo: direto, respeitoso, sem diminutivo. Três ajustes:
1. Frases financeiras curtas (UX-8).
2. Mensagens de sucesso no padrão "o que aconteceu + próximo passo" ("Pedido salvo. Copiar resumo?").
3. Atualizar o `BRAND.md` (N10) com Lora/Manrope, os tokens atuais e esta tabela de papéis das cores. É a fonte que os próximos agentes vão ler.

---

## 6. Landing page

### LP-1. Fechar o ciclo landing → demo → conta
É a mesma correção de UX-1, vista pelo lado da landing. O CTA principal "Experimentar sem cadastro" está certo e deve continuar primário. O que falta é o que acontece **depois**. Com a faixa do demo, o funil passa a ter retorno.
Acrescentar uma pergunta à FAQ: "**E a demonstração, guarda meus pedidos?** Só neste navegador. Para guardar na sua conta, crie a conta e use Restaurar com a cópia baixada no demo." Isso vale só se esse caminho for confirmado no app logado, que eu não exercitei. Se o fluxo de importação descrito em PROXIMAS §6 já existir, citar esse fluxo.
- **Impacto:** alto. **Esforço:** P. **Base:** medido (N1) + código.

### LP-2. Prévia no WhatsApp (T6) desenhada, não só preenchida
- Imagem de 1200×630 px em `/landing/assets/og.jpg` (abaixo de 300 KB). Conteúdo: fundo creme, assinatura "Doce Agenda" à esquerda, a frase "O combinado de cada encomenda, em um só lugar." em Lora, e à direita **uma captura real** do cartão de pedido dentro do arco (MA-3). Sem foto de IA.
- Tags:
  ```html
  <link rel="canonical" href="https://doce-agenda-piloto.netlify.app/">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="pt_BR">
  <meta property="og:site_name" content="Doce Agenda">
  <meta property="og:title" content="Doce Agenda: pedidos, prazos e sinal no mesmo lugar">
  <meta property="og:description" content="Agenda de encomendas para confeiteiras. Experimente sem cadastro.">
  <meta property="og:image" content="https://doce-agenda-piloto.netlify.app/landing/assets/og.jpg">
  <meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">
  <meta name="twitter:card" content="summary_large_image">
  ```
- **Impacto:** alto (o produto depende de indicação). **Esforço:** P. **Risco:** nenhum. As tags e a imagem ficam no próprio site e não acionam ninguém.

### LP-3. Hierarquia do herói no celular
- Hoje: kicker → H1 → texto → CTA → link → nota → convite → cartão de prévia → foto de ~450 px → tour com 3 telas de 460 px cada.
- Proposta:
  1. Juntar "Grátis no piloto · Sem cartão · Funciona no celular" e o convite numa só linha de 13 px.
  2. Foto mais baixa (MA-4).
  3. No tour, mostrar **uma** tela grande (Hoje) e as outras duas como miniaturas de 140 px lado a lado, que ampliam ao tocar. O comportamento atual (`<a target="_blank">`) pode continuar.

  Assim a prova de valor (telas reais) sobe cerca de uma tela inteira.
- **Impacto:** médio. **Esforço:** P–M. **Base:** observado + opinião.

### LP-4. Título do herói (hipótese)
"Menos coisas para lembrar. Mais espaço para criar." é bonito, mas é o texto da landing que menos fala de confeitaria. O subtítulo é o que vende ("Pare de procurar o combinado no meio da conversa"). **Não proponho trocar agora.** Proponho testar com 3 a 5 confeiteiras com um teste de 5 segundos: mostrar o herói, esconder e perguntar "o que esse app faz?". Se a resposta não mencionar pedido ou encomenda, considerar promover o subtítulo a H1.
- **Base:** hipótese.

### LP-5. Prova social: só quando for real
Não há depoimentos, e não devem ser inventados. Quando a amiga ou as participantes autorizarem, entra um bloco com 1 citação curta, nome e cidade, logo após o tour. Até lá, o convite "Estamos construindo junto com confeiteiras" já cumpre o papel com honestidade.

### LP-6. Capturas do tour envelhecem
`agenda.webp` e afins mostram a interface de 08/10 (com "Sair" e o tracejado). A cada mudança visual do app, regenerar as capturas (o script já existe). Vale colocar isso como item de checklist de publicação.

---

## 7. Responsivo e desktop

### RD-1. "Hoje" em duas colunas a partir de 1100 px
- **Problema:** U8. A 1440 px, a lista ocupa uma faixa e sobra um vão grande abaixo (`today-refinement/today-active-1440.png`).
- **Mudança:** `grid-template-columns: minmax(0,1.7fr) minmax(300px,1fr)`. **Esquerda:** Pedidos de hoje → Logo mais. **Direita**, com `position:sticky; top:24px`: Próxima ação → Alterações para revisar → Resumo financeiro (empilhado, 1 coluna) → bloco de armazenamento. Largura máxima de 1180 px (como hoje).
- **Impacto:** médio. **Esforço:** P–M (o markup já tem `content-grid`/`content-aside`). **Risco:** baixo.

### RD-2. Semana como grade no desktop (próxima rodada)
A partir de 1100 px, mostrar 7 colunas com os cartões compactos de cada dia (cliente, horário, selo) no lugar da fileira de botões e da lista única. No notebook, quem planeja a semana quer ver tudo de uma vez. **Esforço:** M–G. **Base:** opinião. **Validar** se ela abre o app no notebook.

### RD-3. Faixa de 501–760 px
Esconder `.header-add` até 760 px (hoje só até 500), porque a barra inferior já tem "Novo". Resolve a única duplicação visível (seção 2.2). **Esforço:** P.

### RD-4. Espaço sob o cabeçalho no celular
Corrigir N6: `@media (max-width:760px){ main{padding-top:16px} }`. **Esforço:** P.

---

## 8. Acessibilidade como parte do design

| Achado | Proposta | Identidade preservada? |
|---|---|---|
| **A1** texto de 10–11 px | UI-2: piso de 12 px, barra inferior a 12, eyebrows removidas do app | Sim. A hierarquia passa a vir de peso e cor, não de miniaturização. |
| **A2** alvos | Logo `min-height:44px` (padding vertical, sem aumentar o desenho); rótulo do bolo `min-height:44px`; "Abrir demonstração" como botão secundário de 44 px; `.text-link` fora de parágrafos (UX-2) | Sim |
| **A3** foco | **AC-3:** em `account.css`, trocar `.field input:focus{…outline:none}` por `.field input:focus-visible{outline:3px solid var(--sage);outline-offset:2px;border-color:var(--sage)}` e remover o `box-shadow` de 13% | Sim. Fica igual ao app. |
| **A4** tons iguais | `--faint:#7a665b` só para metadados terciários (data do histórico, "fictício"); nunca sobre `--cream` em texto < 18 px | Sim |
| **A5** modo escuro | Não fazer agora (seção 2.2). Manter `color-scheme: light`. **A verificar em aparelho:** se navegadores com "escurecer sites" forçado (Samsung Internet, por exemplo) invertem as cores de forma ilegível. Não testei. | n/a |
| **N2** borda do cadastro 2,43:1 | Borda `#9f8b7f` (3,21:1), igual ao app | Sim |
| **N9** estados dos dias | Hoje: número em `--coral-dark` + rótulo "hoje" de 12 px no lugar do "·", e "hoje," no `aria-label`. Fechado: texto "Fechado" a 12 px + fundo `--cream`. Lotado: "Lotado" em `--wait`. O texto carrega o estado; a borda é só reforço. | Sim |

Também vale fazer um teste rápido com TalkBack ou VoiceOver nos fluxos "criar pedido" e "registrar pagamento" antes de divulgar mais. A auditoria registrou que isso ainda não foi feito.

---

## 9. Priorização em três faixas

### Fazer agora (rápido, alto impacto, pouco risco)
| # | Item | Impacto | Esforço | Base |
|---|---|---|---|---|
| 1 | **UX-1** faixa do demo + exemplo visível + CTA de conta | Alto | P–M | Medido |
| 2 | **UX-6** erros do cadastro em português, "Tentar de novo", aviso âmbar sem piscar, borda 3:1 (N2) | Alto | P | Código + medido |
| 3 | **UX-2** bloco de armazenamento (corrige U4) + indicador "Salvo" no celular | Alto | P | Medido |
| 4 | **UI-2** piso de 12 px + **UI-5** barra inferior | Alto | P | Medido |
| 5 | **UI-3** status semântico (corrige N4) | Alto | P | Código |
| 6 | **UX-5** itens 1–2: toast "Copiar resumo" + ações fixas no detalhe (N8) | Alto | P | Medido |
| 7 | **LP-2** prévia do WhatsApp + **MA-5** ícone instalado (T5/T6) | Alto | P | Auditoria |
| 8 | Correções miúdas: N3 (Georgia), N5 (plurais), N6 (espaço do H1), RD-3, **AC-3** (foco do cadastro), plural/termos (UX-8) | Médio | P | Código/medido |

### Próxima rodada
| Item | Impacto | Esforço | Observação |
|---|---|---|---|
| **UI-1** `tokens.css` compartilhado, migração incremental | Médio | M | Pré-requisito para manter tudo consistente |
| **UI-4** cartão de pedido com horário em destaque | Alto | P | Depois do UI-1 para usar os tokens |
| **UX-3** "Combinado" fora do "Mais detalhes" | Médio–alto | P | Confirmar na sessão observada |
| **UX-4** atalhos de data, data/hora separadas, valor como texto | Médio | M | Depende do teste de N13 em aparelho |
| **UI-6** estados (erro por campo, carregando, desabilitado, vazio) | Médio | M | |
| **UX-9** reordenar Ajustes | Médio | P–M | |
| **RD-1** "Hoje" em duas colunas no desktop | Médio | P–M | |
| **LP-3** herói e tour mais curtos no celular + **MA-4** recorte da foto | Médio | P–M | |
| **MA-6** atualizar `BRAND.md` | Médio | P | Documentação, para não orientar errado |

### Ideias para depois / validar com usuárias antes
| Item | O que precisa ser observado antes |
|---|---|
| **UX-7** avançar situação com um toque | Ela atualiza a situação ao longo do dia? |
| **UX-5.3** `navigator.share` | A dona aceita relaxar a decisão "sem integração com WhatsApp"? A confeiteira prefere copiar ou compartilhar? |
| **LP-4** novo H1 | Teste de 5 segundos com 3 a 5 confeiteiras |
| **MA-4** foto real | Ela se reconhece na foto atual? Alguém autoriza imagem? |
| **RD-2** Semana em grade no desktop | Ela usa notebook? |
| **UI-8** *bottom sheet* | Há dificuldade observada para alcançar "Salvar"? |
| Atalho "sábados" em UX-4 | As entregas se concentram mesmo no fim de semana? |
| **A5** modo escuro | Alguém pede? A cozinha é escura à noite? |
| Migração demo → conta automática (ler `localStorage` e oferecer importação após o login) | Já planejada em PROXIMAS §6; depende da revisão principal (dados e idempotência) |

---

## 10. O que NÃO mudar

- **Lora + Manrope e a paleta creme/coral/sálvia.** A identidade é coerente e tem contraste alto. Mudar custaria reconhecimento sem ganho.
- **A assinatura tipográfica e o traço curvo.** O traço não vira indicador de interface (decisão registrada).
- **"Hoje" sem decoração**, financeiro oculto até existir pedido, e rodapé oculto no celular (decisões de 08/10). As propostas acima respeitam isso.
- **Divulgação progressiva no formulário.** UX-3 tira **um** campo de dentro dela; o padrão continua.
- **"Informado" × "Conferido"** e as regras de saldo. É o coração conceitual do produto; só reescrevo textos (UX-8).
- **Ajustes como tela própria** e **exemplos fora das contagens**.
- **Nenhuma dependência externa.** Nada de fontes de CDN, analytics, widgets de chat, bibliotecas de data ou de ícones. Tudo acima é CSS/HTML/JS local.
- **`prefers-reduced-motion` respeitado** e microinterações discretas.
- **"Experimentar sem cadastro" como CTA principal da landing.** É a porta de entrada certa para um público que não quer criar conta antes de entender.

---

## 11. Perguntas para a sessão com a confeiteira

Os itens marcados como hipótese dependem de observação, não de opinião. Sugestões de tarefa e pergunta, em linha com PROXIMAS §10:

1. "Registre este pedido que chegou pelo WhatsApp" (dar um print fictício). Observar: abre "Mais detalhes"? Cola texto? Quanto tempo gasta no campo de data? Consegue digitar "150,50"? (UX-3, UX-4, N13)
2. "Mande para a cliente a confirmação do que foi combinado." Observar: encontra o botão? Prefere copiar ou compartilhar? (UX-5)
3. "O bolo da Marina ficou pronto. Atualize." Observar quantos toques leva. (UX-7)
4. "Abra o demo pela primeira vez" (perfil limpo). Perguntar: "O que acontece com o que você cadastrar aqui?" (UX-1, UX-2)
5. Mostrar a landing por 5 segundos e perguntar "o que esse app faz?". (LP-4)
6. "Você usaria no notebook?" e "Em que dias você mais entrega?" (RD-2, chips de data)

Registrar respostas e tempos em `EXPERIMENTOS.md`, sem tratá-los como ganho comprovado.

---

## 12. Anexo: tokens propostos

Arquivo `public/tokens.css`, carregado antes das demais folhas. Os valores atuais foram mantidos onde já existiam; onde as três folhas divergiam, ficou o valor do app. Contrastes calculados contra `--paper` (#fbf7f0), salvo indicação.

```css
:root {
  color-scheme: light;

  /* Superfícies */
  --paper: #fbf7f0;      /* fundo */
  --card: #fffefa;       /* cartões e modais */
  --cream: #f3eadc;      /* agrupamento e calor da marca */
  --line: #e7dcd1;       /* divisores (decorativos) */
  --border-input: #9f8b7f; /* bordas de controles: 3,21:1 no cartão (WCAG 1.4.11) */

  /* Texto */
  --ink: #392923;        /* 12,98:1 */
  --muted: #6f5b51;      /* 5,97:1 */
  --faint: #7a665b;      /* 5,07:1; não usar sobre --cream em texto pequeno (4,54:1) */

  /* Ação e marca */
  --action: #a34432;     /* 5,73:1; branco sobre ele 6,12:1 */
  --action-hover: #843524;
  --action-soft: #f8e8e1;

  /* Semântica */
  --ok: #42644c;      --ok-soft: #e8f0e8;      /* confirmado, conferido, salvo, foco */
  --wait: #79521d;    --wait-soft: #fbf0d9;    /* aguardando, falta algo */
  --work: #46566f;    --work-soft: #e9edf2;    /* em produção */
  --ready: #2f5d52;   --ready-soft: #e3eeea;   /* pronto */
  --done: #5c5049;    --done-soft: #ece6df;    /* entregue */
  --error: #a32e34;   --error-soft: #fce9e7;   /* sempre com ícone + texto */
  --focus: #42644c;

  /* Tipografia */
  --font-title: "Lora", Georgia, "Times New Roman", serif;
  --font-body: "Manrope", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;
  --text-xs: 12px;  --text-sm: 13px;  --text-md: 15px;
  --text-lg: 18px;  --text-xl: 22px;  --text-2xl: 28px;
  --text-display: clamp(38px, 6vw, 76px);

  /* Espaço, raio, toque */
  --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
  --space-4: 16px; --space-5: 24px; --space-6: 32px; --space-7: 48px;
  --radius-sm: 9px; --radius-md: 12px; --radius-lg: 16px; --radius-arch: 160px;
  --tap: 44px;
  --shadow-1: 0 4px 16px rgb(74 47 35 / 4%);
  --shadow-2: 0 16px 42px rgb(74 47 35 / 8%);
}
```

Aliases para não quebrar o código atual durante a migração: `--coral: var(--action); --coral-dark: var(--action-hover); --coral-soft: var(--action-soft); --sage: var(--ok); --sage-soft: var(--ok-soft); --gold: var(--wait); --gold-soft: var(--wait-soft); --da-border: var(--border-input); --da-title: var(--font-title); --da-body: var(--font-body); --terracotta: var(--action); --surface: var(--card);`
