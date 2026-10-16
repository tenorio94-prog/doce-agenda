# Fotografias da demonstração — 16/10/2026

18 fotografias independentes produzidas com o gerador integrado `image_gen`, em 19 gerações: o bolo de cenoura foi refeito para mostrar claramente o furo central. Nenhuma imagem deriva de mosaico. Revisão visual individual: produto, textura, anatomia quando aplicável, enquadramento, ausência de letras/logotipos e consistência de luz/paleta. Personagens são inteiramente fictícios.

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

Cada original tem três derivados `<nome>-160.webp`, `<nome>-480.webp`, `<nome>-960.webp`. Os 12 produtos e a capa ficam em `public/encomenda/exemplos/`; os cinco itens sem aplicação imediata ficam em `reserva/`, fora do build público. Dimensões, tamanhos, identificadores de geração e SHA-256 constam em [manifest.json](manifest.json).

Os originais quadrados têm 1254×1254; os retratos têm 1122×1402 (aproximadamente 4:5), e bastidores 1672×941 (aproximadamente 16:9). A ferramenta entregou bastidores com 941 px no lado menor, preservado sem ampliar artificialmente. Os WebP mantêm a proporção original: produtos 160²/480²/960²; retratos 160×200, 480×600, 960×1200; capa 160×90, 480×270, 960×540.

WebP com qualidade 84 e método 6, sem EXIF. Originais: 43.291.613 bytes. As 39 variantes publicadas totalizam 2.467.042 bytes; maior WebP: 192.294 bytes. `srcset`/`sizes`, dimensões explícitas, carregamento tardio e decodificação assíncrona nos contextos apropriados. AVIF não foi acrescentado: WebP já atende o peso da coleção sem duplicar formatos e arquivos. Para reconstruir: `python scripts/prepare-demo-photos.py` (Pillow), a partir dos originais versionados; não exige a ferramenta de geração.

## Integração e limites

- Seed somente em `/demo/`: catálogo com 12 fotografias + quatro itens antigos, sem alterar os 21 pedidos ou pagamentos. Limão, beijinho e pudim preservam seus exemplos anteriores; bolo de pote fica em cartão de texto.
- Agenda e ficha: foto do catálogo pelo nome; apenas na demo, aliases explícitos conferem ID e nome do pedido e exigem que a foto continue no catálogo. Bolo de três andares e bolo de chocolate genérico não recebem fotos de produto diferente.
- Demos salvas preservam seu catálogo até usar **Recomeçar demonstração**. Nenhuma atualização silenciosa do estado.
- Prévia usa o rascunho local, sem enviar pedidos. Contas reais mantêm suas próprias fotos, sem inserção do catálogo fictício. Nenhuma conta real ou dado do Supabase foi acessado/alterado.
- Landing mantém as demonstrações de interface; corrigido apenas o botão final que excedia a largura em 320 px.
- Pessoas e embalagens ficam disponíveis para uso editorial futuro; não foram criados depoimentos, histórias ou seções para encaixá-las.

## Verificação

`npm run check`: 64 testes de regras, build e 11 suítes de interface concluídos com sucesso. Teste específico `node scripts/test-demo-photos.mjs`: Agenda, ficha, catálogo/foto, jornada de prévia completa, reload/persistência, exportação/importação e reinicialização; 320, 360, 390, 768, 1024 e 1440 px. Inclui DPR 2 em 390 px e conferência de 39 respostas WebP sem interceptação de imagens.

Capturas antes em `docs/fotografias-demo/antes/`; após nas pastas `depois/` (seis larguras) e `depois-comparacao/` (mesmos 20 enquadramentos iniciais). Resultado publicado e versão final serão registrados após o deploy. Testes em Chromium automatizado; não certificam Safari, celular físico, conta real ou pesquisa com confeiteiras.

Comparação: 13 capturas idênticas e sete alteradas nas áreas esperadas; lista em `docs/fotografias-demo/comparacao.json`. Pedidos e pagamentos comparados por igualdade profunda com o seed anterior: idênticos. Diagnóstico local isolando o momento do carregamento WebP: CLS das fotos igual a zero em 360/1440; o CLS inicial do app não é zero (desktop 0,79275, mesmo valor no build anterior), portanto não há declaração de estabilidade total do aplicativo. A verificação publicada usará respostas de rede reais, sem interceptação das fotos.

