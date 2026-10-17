# Visual Glacê (antigo style.css): resolvido na rodada 3

16/10/2026. O arquivo `public/style.css` deixou de existir.

1. Saíram 116 regras de classes que não existem mais em nenhum fonte e que nunca eram aplicadas (102 KB → 90 KB).
2. Saíram 396 declarações que nunca decidiam a aparência de nenhum elemento: a cascata foi refeita pelo DevTools em 36 estados × 4 larguras (340, 600, 768, 1440), incluindo elementos escondidos (90 KB → 79 KB).
3. O que sobrou foi para o começo de `public/ui/vnext.css`, na seção "Base herdada do visual Glacê", na mesma ordem em que era carregado.

Cada passo foi conferido com 78 capturas (26 estados em 360, 768 e 1280 px; o passo 3 em 360 e 1280) idênticas antes e depois, e `npm run check`.

Ficaram de propósito: regras de estado (`:hover`, `:focus`, `[open]`…), de movimento reduzido, de impressão e todas as de mostrar/esconder (`display`, `visibility`). Não criar regras novas na seção herdada; ao mexer numa tela, mover o que ela usa para a parte Comanda com tokens.
