# Doce Agenda — refinamento visual e publicação

## Entrega

Landing de apresentação em `/`, piloto existente em `/app/` e alias `/agenda.html`. O mesmo domínio e a chave `doce-agenda.pilot.v1` preservam o armazenamento da agenda no navegador. Cadastro, entrada e sincronização não foram ativados. A página explica esses limites e não liga para os fluxos de autenticação simulados.

Código: `public/landing/index.html` e `public/landing/landing.css`. Imagem de projeto: `public/landing/assets/confeitaria-editorial.webp` (169.748 bytes). Logo, Lora e Manrope são os assets existentes; as fontes têm suas licenças OFL em `public/fonts/`. A foto foi criada com a ferramenta integrada ImageGen; não é foto de uma cliente nem testemunho de uso. Não foi usada imagem externa de banco de fotos.

## Preview, build e verificação

Na pasta `web`:

```powershell
node scripts/build-launch-site.mjs
node scripts/test-launch-site.mjs
python -m http.server 4183 --bind 127.0.0.1 --directory deploy-launch/public
```

Abra http://localhost:4183. O script de build preserva o diretório de saída e substitui somente os arquivos gerados. Não publica dados de `data/`, logs, capturas de revisão ou protótipos de autenticação.

Teste de produção, usando perfil novo com dados fictícios:

```powershell
$env:LAUNCH_TEST_ORIGIN = 'https://doce-agenda-piloto.netlify.app'
node scripts/test-launch-site.mjs
Remove-Item Env:LAUNCH_TEST_ORIGIN
```

O teste cobre fotos/fontes/links carregados, FAQ, ida à agenda, orçamento sem data, persistência após recarregar e passar pela landing, ausência de links de login simulado, ausência de erros JavaScript e tráfego `/api` à rede. Confere ausência de overflow na landing e no app em 320/390/430/1440 px. As capturas LOCAL/LIVE documentam os dois ambientes. O plugin Browser não estava listado; a verificação automatizada usou o Playwright já instalado. A revisão complementar usou o Chrome pelo CUA.

## Revisão do conceito

Referência: `conceito-hero.png`, gerada antes da implementação. Comparação visual com `LOCAL-hero-1536x1024.png` e capturas mobile, incluindo página completa.

| Ponto | Decisão e revisão |
| --- | --- |
| Texto | Headline, descrição, CTA e nota do conceito preservados. Sem prova social ou métricas comerciais inventadas. |
| Layout | Texto à esquerda, foto à direita e card sobreposto; no celular os blocos passam para uma coluna, sem rolagem lateral. |
| Tipografia | Lora/Manrope reais do projeto, em vez das fontes aproximadas rasterizadas no conceito. Escala implementada a partir dos tokens do produto. |
| Cores | Creme, terracota, texto marrom e sálvia existentes; foto sem filtro de cor aplicado por CSS. |
| Imagem | Asset independente WebP, enquadramento em arco por CSS. Card desktop subiu de 19% para 12% para deixar o gesto de decoração e o bolo mais visíveis. |
| Produto e marca | Logo original preservado. Miniatura de bolo inventada pela geração foi omitida: o app não oferece fotos de pedidos. Card em HTML usa rótulos observáveis e se identifica como exemplo fictício. |
| Demais seções | Conteúdo existente de funcionalidades, passos e FAQ preservado; funcionalidades passaram de cards repetidos para uma lista tipográfica. Links de cadastro simulado removidos. |

Limite: revisão em navegadores e emulação de larguras; uso em celular físico e leitor de tela não foi verificado nesta entrega.

## Prompt final do asset (modo integrado ImageGen)

Referência visual: o conceito do hero, visto antes da geração. Prompt:

> Generate the standalone photograph asset matching the RIGHT HAND PHOTO of this Doce Agenda hero concept. Use the attached image only as a style and composition reference. Deliver a clean high-resolution portrait 4:5 editorial photograph, edge to edge, no UI card, no text, no logo, no website or cream panel, no rounded or arched crop baked into pixels, no mockup framing. A baker's hands finishing a modest white buttercream cake decorated with a few edible pink flowers, cake stand on kitchen counter, terracotta linen cloth and piping bag. Natural morning window light from left, subtle cream/sage kitchen background and greenery. Preserve the original warm, believable artisanal kitchen aesthetic, tactile frosting and relaxed hand gesture. Cake in lower-middle of frame, hands visible without face, upper third relatively quiet background for HTML product card overlay. Realistic anatomy, no extra hands, no luxury showroom, no excessive flowers, no filter or colored tint. Image for illustration of confectionery work, not a real customer testimonial.

Arquivo final gerado em PNG e convertido para WebP sem mudar a composição. O conceito é uma referência de direção de arte; nenhuma captura raster substitui controles interativos do app.

## Publicação verificada em 07/10/2026

Netlify produção: https://doce-agenda-piloto.netlify.app. Agenda: https://doce-agenda-piloto.netlify.app/app/. Deploy `6ac6ea4df806db902db8f8c3`, estado ready confirmado pelo conector e CLI. Testes local e LIVE passaram. O primeiro teste LIVE encontrou o selo da Netlify interceptando o botão Novo no celular; selo desativado pela configuração oficial do projeto (sem mudança de plano), confirmação visual no painel e teste completo refeitos com sucesso. Captura LIVE mobile final inspecionada. Não foram contratados serviços novos nem testados dados reais de clientes.
