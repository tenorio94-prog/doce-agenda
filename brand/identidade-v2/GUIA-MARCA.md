# Doce Agenda — identidade v2

Direção 01 aplicada à interface pública do piloto em 2026-10-01. O guia combina elementos integrados no app com aplicações conceituais; pedidos, nomes e valores ilustrados continuam fictícios. A identidade ainda precisa ser discutida e testada com confeiteiras.

![Print do app atual](prints/app-atual-mobile.png)

## Diagnóstico

**Encontrado no app:** fundo #FBF8F3, ação #CB6858, títulos Georgia, Inter declarada sem arquivo carregado, nome do logo em Arial, calendário com bolo e selo de conferência. Há navegação com caracteres Unicode e backup com SVG; textos de 8–11 px, botões de 34–42 px e serifa nos valores.

**Funciona:** creme como fundo neutro; terracota como ação sem depender de rosa; sálvia como confirmação; serifa como caráter editorial. Hoje/Pedidos/Semana explica a rotina. O calendário com bolo comunica categoria e função, mas não é uma forma exclusiva por si.

**Genérico ou inconsistente:** o logo soma calendário, argolas, bolo, base e selo em pouco espaço; em 32 px, bolo e selo competem. Arial, Georgia e uma Inter que não carrega tornam a tipografia pouco controlada. Unicode e SVG não compartilham peso. A flor aproxima, mas sua repetição em saudação, ícones e vazios vira decoração.

**Medido:** branco no botão coral = 3,71:1; apoio no fundo = 4,16:1; nota fraca no cartão = 2,40:1; foco atual composto sobre o fundo = 1,44:1. Os três primeiros ficam abaixo de 4,5:1 para texto normal; foco abaixo de 3:1.

**Interpretação criativa:** preservar o clima de papel e bancada com acolhimento adulto; reduzir o símbolo e reforçar dinheiro e ações. Esta associação emocional não foi validada com usuárias.

## 1. Posicionamento

**Uma agenda simples para confeiteiras por encomenda acompanharem o combinado, do prazo ao saldo a receber.**

| Atributo | Significa | Não significa |
|---|---|---|
| Acolhedora | Respeito, proximidade e orientação calma | Infantilizar ou romantizar sobrecarga |
| Clara | Distinguir pedido, data, situação e valor | Encher a tela de métricas ou sugerir automações inexistentes |
| Firme com os valores | Mostrar total, conferido e saldo sem rodeios | Culpar cliente, tratar todo saldo como atraso ou prometer lucro |

**Personalidade:** uma parceira de bancada adulta, organizada e tranquila, que fala com clareza.

## 2. Nome

Manter **Doce Agenda** como nome de trabalho. É fácil de dizer, reconhece a categoria e explica a organização por dia/semana. “Doce” aproxima do universo de encomendas; “Agenda” dá contexto ao primeiro contato.

É uma construção descritiva, com menor distinção verbal potencial. Não proponho trocar antes de testar entendimento e lembrança. **Disponibilidade não verificada:** pesquisar INPI, domínios e lojas de apps, incluindo nomes semelhantes, antes de investir na marca final.

## 3. Tom de voz

Frases curtas; ação antes da explicação; acolhimento sem intimidade presumida; números com contexto. Usar “pedido” no registro operacional e “encomenda” no discurso de marca, sem alternar nomes de campos. Não prometer além do comportamento real.

| Situação | Faça assim | Evite assim |
|---|---|---|
| Saudação | “Bom dia! Seus pedidos de hoje, à mão.” | “Oi, confeiteira linda! Bora arrasar?” |
| Botão | “Salvar pedido” | “Confirmar” quando a ação é somente salvar |
| Confirmação do registro | “Pedido salvo nesta agenda.” | “Pedido confirmado!” sem mudança real de situação |
| Saldo pendente | “Saldo a receber: R$ 120,00.” | “Sua cliente está devendo!” |
| Vazio | “Nenhum pedido por aqui ainda. Cadastre o próximo para acompanhar prazo e pagamento.” | “Sua agenda está tristinha!” |

Quando a situação realmente muda para Confirmado: “Pedido marcado como confirmado.” Salvar não confirma o combinado comercial. “Informado” e “Conferido” continuam distintos; só pagamentos conferidos entram no saldo.

**Taglines:** “Seu combinado, em um só lugar.” (recomendada e já presente no rodapé); “Pedidos, prazos e pagamentos em ordem.” (explicativa); “Uma agenda para sua rotina de encomendas.” (cotidiana). “Em um só lugar” descreve o registro na agenda, sem sugerir sincronização ou captura do WhatsApp.

## 4. Logo

| Conceito | Ideia e justificativa | Em 32 px / concessão |
|---|---|---|
| 01 · Agenda de bancada — recomendado | Calendário com uma camada de bolo; evolui o símbolo conhecido | Traço de 2 unidades em viewBox 32, sem selo e detalhes de base. A associação à categoria ainda precisa de teste |
| 02 · D de rotina | Inicial D com três linhas de lista; organização pelo monograma | Sem cruzamentos estreitos. Depende mais do nome para comunicar confeitaria |
| 03 · Etiqueta do combinado | Etiqueta com conferência; registro do combinado | Recorte e check simples. Pode lembrar outros segmentos; não implica comprovação de pagamento |

Inspecionados em 32 px, 64 px e branco sobre cacau. Em 32 px usar **somente o símbolo**. Para o logo inteiro, largura mínima proposta de 160 px. Usar um tom, sem esticar, com área livre de 1/4 da altura do símbolo.

Os arquivos *-logo.svg têm o nome em curvas e não dependem de fonte instalada. *-editavel.svg mantém texto editável com Lora/Georgia; usar Lora incluída para exportação fiel. Cada conceito tem símbolo avulso, logo em curvas e versão editável.

### SVG editável — conceito 01

~~~svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 213.8 48" color="#A34432" role="img" aria-labelledby="title">
<title id="title">Doce Agenda — Agenda de bancada</title>
<g transform="translate(0 8)">
<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<rect x="4" y="7" width="24" height="22" rx="5"/>
<path d="M10 4v6m12-6v6M4 13h24M9 20v5h14v-5M9 20c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 2 3"/>
</g>
</g>
<text x="48" y="33" fill="currentColor" font-family="Lora, Georgia, serif" font-weight="600" font-size="26">Doce Agenda</text>
</svg>
~~~

### SVG editável — conceito 02

~~~svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 213.8 48" color="#A34432" role="img" aria-labelledby="title">
<title id="title">Doce Agenda — D de rotina</title>
<g transform="translate(0 8)">
<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="M7 5h7c8 0 13 4 13 11s-5 11-13 11H7V5Z"/>
<path d="M12 11h6m-6 5h9m-9 5h6"/>
</g>
</g>
<text x="48" y="33" fill="currentColor" font-family="Lora, Georgia, serif" font-weight="600" font-size="26">Doce Agenda</text>
</svg>
~~~

### SVG editável — conceito 03

~~~svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 213.8 48" color="#A34432" role="img" aria-labelledby="title">
<title id="title">Doce Agenda — Etiqueta do combinado</title>
<g transform="translate(0 8)">
<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<path d="m4 13 9-9h12a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V13Z"/>
<circle cx="13" cy="10" r="1.3" fill="currentColor" stroke="none"/>
<path d="m11 21 4 4 8-9"/>
</g>
</g>
<text x="48" y="33" fill="currentColor" font-family="Lora, Georgia, serif" font-weight="600" font-size="26">Doce Agenda</text>
</svg>
~~~

Traços construídos para este projeto sem copiar uma marca de referência. Não houve busca de similaridade jurídica ou anterioridade.

## 5. Ícone do app e favicon

Direção 01: glifo branco sobre terracota, sem nome.

| Arquivo | Uso |
|---|---|
| assets/icone-quadrado.svg | Matriz 256 × 256 sem máscara |
| assets/icone-arredondado.svg | Variante com raio 56 |
| assets/icone-adaptativo-foreground.svg | Glifo central para máscaras, separado |
| assets/icone-adaptativo-background.svg | Fundo contínuo separado |
| assets/favicon.svg | Matriz 32 × 32 com enquadramento compacto |

O quadrado permite que a plataforma aplique sua máscara. As camadas adaptativas são matrizes SVG, não pacote nativo para lojas. O favicon foi inspecionado em 32 px; seu desenho em 16 px ainda merece uma verificação dedicada.

### SVG quadrado

~~~svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" color="#FFFFFF" role="img" aria-labelledby="title">
<title id="title">Doce Agenda — ícone</title>
<rect width="256" height="256" rx="0" fill="#A34432"/>
<g transform="translate(48 48) scale(5)">
<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
<rect x="4" y="7" width="24" height="22" rx="5"/>
<path d="M10 4v6m12-6v6M4 13h24M9 20v5h14v-5M9 20c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 2 3"/>
</g>
</g>
</svg>
~~~

Na variante arredondada, o retângulo usa rx="56"; o arquivo já está entregue.

## 6. Paleta e contraste

| Nome | Hex principal | Fundo associado | Função / combinação | Razão |
|---|---|---|---|---:|
| Creme de bancada | #FBF7F0 | — | Fundo; texto cacau | 12,98:1 |
| Papel | #FFFEFA | — | Cartão; texto cacau | 13,73:1 |
| Cacau | #392923 | #FBF7F0 | Texto principal | 12,98:1 |
| Cacau suave | #6F5B51 | #FBF7F0 | Apoio e rótulos | 5,97:1 |
| Terracota | #A34432 | — | Botão com branco #FFFFFF | 6,12:1 |
| Terracota profunda | #843524 | — | Hover com branco | 8,35:1 |
| Sálvia | #42644C | #E8F0E8 | Sucesso/confirmado | 5,72:1 |
| Âmbar | #79521D | #FBF0D9 | Aviso que exige atenção | 6,11:1 |
| Goiaba profunda | #A32E34 | #FCE9E7 | Erro de ação/validação | 5,99:1 |
| Canela | #71553B | #F3EADC | Pendente, sem juízo de atraso | 5,75:1 |
| Contorno funcional | #9F8B7F | #FFFEFA | Borda de campo/controle | 3,21:1 |
| Foco sálvia | #42644C | #FFFEFA | Foco sólido afastado | 6,59:1 |
| Linha de papel | #E7DCD1 | #FFFEFA | Separador decorativo | Não é limite de controle |

AA: texto normal ≥ 4,5:1; texto grande ≥ 3:1; contornos funcionais ≥ 3:1 contra cores adjacentes. Os pares documentados passam nos limites calculados. Fórmula, valores e 16 pares em CONTRASTES.md e contrastes.json. A aprovação desses pares **não certifica todo o app**; a aplicação visual não substitui auditoria completa de contraste, foco e semântica.

Cor acompanha rótulo. “Confirmado” é situação do pedido, não pagamento. “Saldo a receber” é um estado normal, não erro. A linha decorativa clara não deve virar borda de campo.

Não recomendo modo escuro nesta primeira evolução: não há necessidade observada e duplicar temas amplia a revisão. Um tema escuro futuro exige novo cálculo de pares.

~~~css
:root {
  color-scheme: light;
  --da-bg: #FBF7F0; --da-surface: #FFFEFA;
  --da-ink: #392923; --da-muted: #6F5B51;
  --da-action: #A34432; --da-action-hover: #843524;
  --da-success: #42644C; --da-success-soft: #E8F0E8;
  --da-warning: #79521D; --da-warning-soft: #FBF0D9;
  --da-error: #A32E34; --da-error-soft: #FCE9E7;
  --da-pending: #71553B; --da-pending-soft: #F3EADC;
  --da-control-border: #9F8B7F; --da-line: #E7DCD1;
  --da-focus: #42644C;
}
~~~

## 7. Tipografia

**Lora + Manrope**, gratuitas no Google Fonts. A primeira conserva caráter editorial; a segunda organiza campos, rótulos e dinheiro. Licenças **SIL OFL 1.1** verificadas e incluídas. As fontes são locais, sem dependência de CDN.

| Uso | Fonte | Tamanho / linha | Peso |
|---|---|---|---|
| Título de tela | Lora | 30–32 px / 1,2 | 600 |
| Título de seção | Lora | 20–24 px / 1,25 | 600 |
| Valor monetário | Manrope | 24–28 px / 1,25; 36 px em detalhe | 700 |
| Rótulo/data | Manrope | 14 px / 1,45 | 500–600 |
| Corpo/campo | Manrope | 16 px / 1,5 | 400–500 |
| Botão | Manrope | 16 px / 1,25 | 700 |
| Status | Manrope | 13–14 px / 1,4 | 700 |

Valores com font-variant-numeric: lining-nums tabular-nums; a feature tnum existe nos dois arquivos. Usar “R$ 1.280,50” e centavos completos. Não truncar ou encolher para encaixar: ampliar cartão ou usar uma coluna. Na apresentação estreita, os cartões financeiros ocupam toda a linha.

Fallbacks: Lora → Georgia → serif; Manrope → system-ui → sans-serif. Não usar serifa decorativa em saldo ou campo de dinheiro.

Fontes: https://github.com/google/fonts/tree/main/ofl/lora e https://github.com/google/fonts/tree/main/ofl/manrope.

## 8. Sistema visual

- Raios: cartão 16 px; campo/botão 12 px; chip 999 px. Evitar muitos valores arbitrários.
- Espaçamento: 4, 8, 12, 16, 24, 32 px; margem mobile e padding de cartão 16 px.
- Sombra: 0 6px 18px rgb(57 41 35 / 6%), restrita a sobreposição; cartões comuns usam linha discreta.
- Ícones SVG 20–24 px, traço 2, pontas arredondadas; rótulo ou nome acessível. Substituir Unicode por uma família com os mesmos parâmetros.
- Botão principal com alvo confortável; a integração usa foco sólido sálvia e ajusta ações principais para 44–48 px conforme o contexto.
- Ilustração opcional: um objeto vetorial simples de bancada, monocromático, sem imagem externa obrigatória.
- Motivo recorrente: linha de registro e cobertura simplificada do logo, em abertura ou rodapé. Não desenhar ondas em todos os cartões.
- ✿ opcional, uma vez em saudação ou texto editorial, aria-hidden quando decorativo. Nunca como confirmação, erro ou navegação.
- Movimento breve e funcional; respeitar prefers-reduced-motion. Não animar números financeiros continuamente.

## 9. Componentes-chave

| Componente | Diretriz |
|---|---|
| Resumo | Rótulo → valor → contexto. Total confirmado não é dinheiro recebido |
| Agenda | Cliente/produto → data/modo → situação textual; cor reforça |
| Botão | Verbo específico, terracota, 48 px, rótulo 16 px; uma ação dominante por bloco |
| Banner | Mensagem factual, canela suave e ação acessível; não prometer cópia automática |
| Vazio | Explicar ausência e oferecer próxima ação; não anunciar dia livre se há pedidos sem data |

### HTML/CSS compacto

~~~html
<link rel="stylesheet" href="tokens.css">
<article class="da-card">
  <span class="da-label">Saldo a receber</span>
  <strong class="da-money">R$ 120,00</strong>
  <span class="da-label">Total R$ 180,00 · conferido R$ 60,00</span>
</article>
<article class="da-card da-order">
  <div class="da-order-head"><strong>Cliente exemplo</strong>
    <span class="da-status">Confirmado</span></div>
  <p>Bolo de cenoura · 1,5 kg</p>
  <small>10/10/2026, 16h · Retirada</small>
</article>
<button class="da-button" type="button">Salvar pedido</button>
<aside class="da-banner">
  Os pedidos ficam neste navegador. Baixe um backup para guardar uma cópia.
</aside>
<section class="da-empty">
  <h3>Nenhum pedido por aqui ainda.</h3>
  <p>Cadastre o próximo para acompanhar prazo e pagamento.</p>
  <button class="da-button" type="button">Novo pedido</button>
</section>
~~~

~~~css
.da-card { padding:16px; border:1px solid var(--da-line);
  border-radius:16px; background:var(--da-surface) }
.da-label { font-size:14px; color:var(--da-muted) }
.da-money { display:block; font:700 28px/1.25 Manrope,sans-serif;
  font-variant-numeric:lining-nums tabular-nums }
.da-order { display:grid; gap:12px; border-left:4px solid var(--da-success) }
.da-status { padding:4px 10px; border-radius:999px; font-size:13px;
  color:var(--da-success); background:var(--da-success-soft) }
.da-button { min-height:48px; padding:12px 20px; border:0; border-radius:12px;
  font:700 16px/1.25 Manrope,sans-serif; background:var(--da-action); color:white }
.da-button:hover { background:var(--da-action-hover) }
:is(button,a,input,select,textarea):focus-visible {
  outline:3px solid var(--da-focus); outline-offset:3px }
.da-banner { padding:16px; border-radius:12px; font-size:14px;
  background:var(--da-pending-soft); color:var(--da-pending) }
.da-empty { padding:24px 16px; text-align:center }
~~~

CSS de tokens e exemplos estáticos: tokens.css e index.html. A interface real compartilha a paleta, a tipografia e os símbolos; a lógica de pedidos continua no app existente.

## 10. Aplicações

**Resumo para WhatsApp — proposta visual conceitual.** O app já oferece “Copiar resumo para WhatsApp” em texto; a apresentação gráfica abaixo é uma proposta. A confeitaria da usuária aparece em primeiro plano; Doce Agenda como assinatura discreta. Mostrar produto, combinado, situação, total, recebido conferido e saldo. Não chamar de comprovante bancário.

> Resumo da encomenda — exemplo fictício  
> Bolo de cenoura · 1,5 kg  
> Retirada: 10/10/2026, às 16h  
> Situação: Confirmado  
> Total: R$ 180,00  
> Recebido e conferido: R$ 60,00  
> Saldo a receber: R$ 120,00

assets/resumo-pedido.svg: 720 × 920, dinheiro em sans-serif, papel predominante. Sem telefone ou endereço no exemplo; no uso real, incluir apenas dados necessários ao combinado.

**Compartilhamento:** assets/compartilhamento.svg, 1200 × 630. Logo, “Pedidos, prazos e pagamentos em ordem”, exemplo fictício e “Conheça o piloto”. Sem depoimento, resultado ou estatística. Textos em curvas e nenhuma foto externa. A peça não configura automaticamente metadados sociais do site.

## 11. Regras de uso

| Faça | Não faça |
|---|---|
| Mantenha proporções, logo e área livre | Esticar, girar ou recolorir elementos separadamente |
| Priorize valor, prazo e situação | Truncar saldo, esconder centavos ou usar texto funcional de 8–11 px |
| Use os pares de fundo previstos | Inventar pastel em ações/status sem recalcular contraste |
| Escreva com respeito e ação concreta | Infantilizar, culpar ou prometer resultados comerciais |
| Explique navegador e backup manual | Prometer sincronização, integração WhatsApp ou segurança não demonstrada |

## Perguntas em aberto

1. O símbolo 01 é entendido como agenda de encomendas sem explicação?
2. “Pedido” ou “encomenda” é o termo mais natural nos campos?
3. “Total confirmado” é entendido ou confundido com dinheiro recebido?
4. A saudação deve usar “confeiteira”, nome da pessoa ou apenas “Bom dia”?
5. Valores e datas são rápidos de ler em aparelhos pequenos e na iluminação da cozinha?

## Verificação e limites

Print de referência: versão pública anterior em 2026-10-01, contexto isolado com exemplo fictício. 16 pares de contraste calculados, sem arredondar para definir aprovação. Símbolos inspecionados em 32 px; logos, quadro e layout revisados. A apresentação conceitual em 390 px carrega fontes locais, não faz requisições externas e não tem overflow horizontal. A prévia Netlify com a direção 01 foi visualmente revisada em desktop; este trabalho não foi uma auditoria completa de acessibilidade ou de comportamento mobile.

O visual foi aplicado no piloto Netlify (`https://doce-agenda-piloto.netlify.app`), com Lora e Manrope locais e respectivas licenças. Não houve teste de marca com usuárias, busca de anterioridade, confirmação de disponibilidade ou pacote nativo. O app copia um resumo textual do pedido para envio manual no WhatsApp. A peça gráfica e a imagem de compartilhamento continuam conceituais; não há envio automático ou integração.

Fontes normativas: https://www.w3.org/TR/WCAG22/#contrast-minimum e https://www.w3.org/TR/WCAG22/#non-text-contrast. Fontes tipográficas e licenças incluídas em assets/fonts e disponíveis no repositório oficial Google Fonts.
