# Fotografias da demonstração — 16/10/2026

22 fotografias independentes e uma logo produzidas com o gerador integrado `image_gen`, em 24 gerações: o bolo de cenoura foi refeito para mostrar claramente o furo central. A segunda etapa acrescentou bolo de pote, beijinho, torta de limão, pudim de leite e a logo Doces da Lu. Nenhuma imagem deriva de mosaico. Revisão visual individual: produto, textura, anatomia quando aplicável, enquadramento, ausência de letras/logotipos nas fotos e consistência de luz/paleta. Personagens são inteiramente fictícios. A logo foi conferida no recorte circular de 92 px da vitrine.

## Arquivos e aplicação

| Nº | Original em `originais/` | Aplicação |
| --- | --- | --- |
| 01 | `brigadeiros-gourmet.png` | Catálogo da vitrine fictícia; Agenda/ficha quando o produto corresponde |
| 02 | `bolo-pistache.png` | Catálogo da vitrine fictícia; Agenda/ficha quando o produto corresponde |
| 03 | `bolo-chocolate-morango.png` | Catálogo da vitrine fictícia |
| 04 | `bento-cake.png` | Catálogo da vitrine fictícia |
| 05 | `caixa-docinhos.png` | Catálogo da vitrine fictícia; Agenda/ficha quando o produto corresponde |
| 06 | `kit-festa.png` | Catálogo da vitrine fictícia; Agenda/ficha quando o produto corresponde |
| 07 | `bolo-infantil.png` | Catálogo da vitrine fictícia |
| 08 | `bolo-aniversario-frutas.png` | Catálogo da vitrine fictícia; Agenda/ficha quando o produto corresponde |
| 09 | `brownies.png` | Catálogo da vitrine fictícia |
| 10 | `sobremesas-individuais.png` | Catálogo da vitrine fictícia |
| 11 | `cupcakes.png` | Catálogo da vitrine fictícia |
| 12 | `bolo-cenoura-chocolate.png` | Catálogo da vitrine fictícia; Agenda/ficha quando o produto corresponde |
| 13 | `confeiteira-em-acao.png` | Reserva editorial, fora do site |
| 14 | `cliente-feliz.png` | Reserva editorial, fora do site |
| 15 | `cliente-retirando-pedido.png` | Reserva editorial, fora do site |
| 16 | `embalagem-mensagem.png` | Reserva editorial, fora do site |
| 17 | `embalagem-entrega.png` | Reserva editorial, fora do site |
| 18 | `bastidores-confeitaria.png` | Capa da vitrine fictícia |
| 19 | `bolo-de-pote.png` | Catálogo e fichas dos pedidos de bolo de pote da demo |
| 20 | `beijinho.png` | Catálogo da vitrine fictícia |
| 21 | `torta-de-limao.png` | Catálogo e fichas dos pedidos correspondentes |
| 22 | `pudim-de-leite.png` | Catálogo da vitrine fictícia |
| 23 | `logo-doces-da-lu.png` | Logo da loja fictícia Doces da Lu |

Cada original tem três derivados `<nome>-160.webp`, `<nome>-480.webp`, `<nome>-960.webp`. Os 16 produtos, a logo e a capa ficam em `public/encomenda/exemplos/`; os cinco itens sem aplicação imediata ficam em `reserva/`, fora do build público. Dimensões, tamanhos, identificadores de geração e SHA-256 constam em [manifest.json](manifest.json). Os cinco prompts adicionais exatos estão em [PROMPTS-COMPLEMENTO.md](PROMPTS-COMPLEMENTO.md).

Os originais quadrados têm 1254×1254; os retratos têm 1122×1402 (aproximadamente 4:5), e bastidores 1672×941 (aproximadamente 16:9). A ferramenta entregou bastidores com 941 px no lado menor, preservado sem ampliar artificialmente. Os WebP mantêm a proporção original: produtos 160²/480²/960²; retratos 160×200, 480×600, 960×1200; capa 160×90, 480×270, 960×540.

WebP com qualidade 84 e método 6, sem EXIF. Originais: 54.061.556 bytes. As 54 variantes publicadas totalizam 3.252.094 bytes; maior WebP: 192.294 bytes. O complemento acrescenta 785.052 bytes entre todos os tamanhos. `srcset`/`sizes`, dimensões explícitas, carregamento tardio e decodificação assíncrona nos contextos apropriados. AVIF não foi acrescentado: WebP já atende o peso da coleção sem duplicar formatos e arquivos. Para reconstruir: `python scripts/prepare-demo-photos.py` (Pillow), a partir dos originais versionados; não exige a ferramenta de geração.

## Integração e limites

- Seed somente em `/demo/`: os mesmos 16 produtos, todos com fotografia, e logo própria, sem alterar os 21 pedidos ou pagamentos. Nomes, descrições, preços e ordem dos produtos preservados. SVGs antigos continuam disponíveis para backups e demonstrações já salvas.
- Agenda e ficha: foto do catálogo pelo nome; apenas na demo, aliases explícitos conferem ID e nome do pedido e exigem que a foto continue no catálogo. Bolo de três andares e bolo de chocolate genérico não recebem fotos de produto diferente.
- Demos salvas preservam seu catálogo até usar **Recomeçar demonstração**. Nenhuma atualização silenciosa do estado.
- Prévia usa o rascunho local, sem enviar pedidos. Contas reais mantêm suas próprias fotos, sem inserção automática do catálogo fictício. Esta implementação não altera dados de conta ou do Supabase. Configuração manual da loja do Lucas, solicitada separadamente, é uma etapa posterior.
- Landing mantém as demonstrações de interface; corrigido apenas o botão final que excedia a largura em 320 px.
- Pessoas e embalagens ficam disponíveis para uso editorial futuro; não foram criados depoimentos, histórias ou seções para encaixá-las.

## Verificação

Primeira entrega e complemento: `npm run check` passou (64 regras, build e 11 suítes). Teste específico `node scripts/test-demo-photos.mjs`: Agenda, ficha, catálogo/foto, logo, fichas dos quatro produtos novos, jornada de prévia completa, reload/persistência, exportação/importação e reinicialização; 320, 360, 390, 768, 1024 e 1440 px. Inclui DPR 2 em 390 px e conferência de 54 respostas WebP sem interceptação de imagens. Capturas do complemento em `docs/completar-vitrine-lu/antes/` e `depois/`. Para reconstruir variantes já existentes após editar originais ou compressão, use `python scripts/prepare-demo-photos.py --force`.

Capturas antes em `docs/fotografias-demo/antes/`; após nas pastas `depois/` (seis larguras) e `depois-comparacao/` (mesmos 20 enquadramentos iniciais). Capturas reais publicadas em `docs/fotografias-demo/publicado/`, com resultados em `results.json`. Testes em Chromium automatizado; não certificam Safari, celular físico, conta real ou pesquisa com confeiteiras.

Comparação: 13 capturas idênticas e sete alteradas nas áreas esperadas; lista em `docs/fotografias-demo/comparacao.json`. Pedidos e pagamentos comparados por igualdade profunda com o seed anterior: idênticos. Diagnóstico local isolando o momento do carregamento WebP: CLS das fotos igual a zero em 360/1440; o CLS inicial do app não é zero (desktop 0,79275, mesmo valor no build anterior), portanto não há declaração de estabilidade total do aplicativo.

## Primeira publicação verificada

- Código integrado na `main`: `1ea7fd6`.
- Cloudflare, 100% do tráfego: `1ec3fbfd-29ac-48e0-8b03-08e7fdbd6fc3`.
- Endereço: https://lucast.app/demo/ (prévia da vitrine em Ajustes → Link de encomenda → Ver como a cliente vê).
- Verificação no `https://lucast.app`: jornada completa nas seis larguras, DPR 2, 39 respostas WebP reais com tamanhos conferidos, nenhum erro de console da aplicação ou imagem ausente; cinco rotas passaram. `app.js`, `browser-store.js`, `encomenda/order.js`, `ui/vnext.css` e `landing/landing.css` publicados idênticos ao build local por conteúdo. Sem interceptação dos arquivos nesta verificação.
- O teste de prévia passou a aguardar a navegação do iframe, evitando uma corrida observada na rede publicada. Ajuste apenas da automação, sem mudança adicional no site.

## Complemento publicado e verificado

- Código `fe74b83`, branch `main`; Cloudflare `2e16bc61-2db0-4a53-9cc0-6d73d5ce8a43`, 100% do tráfego.
- Verificação real em `https://lucast.app`: seis larguras, 16 cartões com foto, logo, quatro novas fichas, jornada/persistência/reset/backup e 54 respostas WebP corretas; erros da aplicação: zero. Rotas 5/5 e três bundles JS idênticos ao build local.
- Capturas e resultados em `docs/completar-vitrine-lu/publicado/`. Para uma demo já salva, usar **Recomeçar**; o catálogo do navegador não é substituído silenciosamente.
