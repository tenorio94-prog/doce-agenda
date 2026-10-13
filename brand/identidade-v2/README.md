# Kit de identidade do Doce Agenda — v2

index.html mostra conceitos, componentes e aplicações. GUIA-MARCA.md contém a entrega completa. CONTRASTES.md e contrastes.json documentam os cálculos.

## Preview local

Na pasta ebooks:

~~~powershell
python -m http.server 4181 --bind 127.0.0.1 --directory projeto_B/web/brand/identidade-v2
~~~

Acesse http://localhost:4181. A página é estática; não modifica pedidos ou a aplicação publicada.

## Arquivos

- assets/*-simbolo.svg: símbolos.
- assets/*-logo.svg: nome em curvas, sem fonte instalada.
- assets/*-editavel.svg: texto editável; Lora incluída para exportação fiel.
- assets/icone-*.svg e favicon.svg: matrizes de ícone.
- assets/resumo-pedido.svg e compartilhamento.svg: exemplos em curvas, com valores fictícios.
- assets/fonts: Lora e Manrope do Google Fonts, licenças SIL OFL 1.1.
- tokens.css: variáveis, fontes locais e componentes.
- prints: app atual, visão geral, logos e exemplos.

## Reproduzir

build-kit.py usa Python e fontTools para curvas e contraste. capture.mjs usa Playwright e Chrome nos caminhos específicos desta instalação; ajuste antes de executar em outro computador.

~~~powershell
python build-kit.py
node capture.mjs
~~~

O script gera assets e tokens, mas não substitui decisões registradas no guia. As propostas não foram aplicadas ao app nem publicadas. Resumo e compartilhamento são peças visuais, não funcionalidades existentes.
