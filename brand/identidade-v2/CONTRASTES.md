# Contrastes calculados

WCAG 2.2: texto normal ≥ 4,5:1; texto grande ≥ 3:1 (24 px regular ou aproximadamente 18,67 px negrito). Controles e foco contra cores adjacentes ≥ 3:1. Todos os textos propostos usam o limite mais rigoroso de 4,5:1.

Cálculo: canais sRGB normalizados; canal linear = c/12,92 se c ≤ 0,04045, senão ((c+0,055)/1,055)^2,4. L = 0,2126R + 0,7152G + 0,0722B. Razão = (L mais clara + 0,05)/(L mais escura + 0,05). Valores não arredondados definem aprovação. Esta análise verifica os pares, não certifica acessibilidade de toda a aplicação.

| Uso | Frente | Fundo | Razão | Mínimo | Resultado |
|---|---|---|---:|---:|---|
| Texto / fundo | #392923 | #FBF7F0 | 12.98:1 | 4.5:1 | AA neste par |
| Texto / cartão | #392923 | #FFFEFA | 13.73:1 | 4.5:1 | AA neste par |
| Apoio / fundo | #6F5B51 | #FBF7F0 | 5.97:1 | 4.5:1 | AA neste par |
| Apoio / cartão | #6F5B51 | #FFFEFA | 6.32:1 | 4.5:1 | AA neste par |
| Botão: branco / ação | #FFFFFF | #A34432 | 6.12:1 | 4.5:1 | AA neste par |
| Botão hover: branco / ação | #FFFFFF | #843524 | 8.35:1 | 4.5:1 | AA neste par |
| Link / fundo | #A34432 | #FBF7F0 | 5.73:1 | 4.5:1 | AA neste par |
| Sucesso / fundo de sucesso | #42644C | #E8F0E8 | 5.72:1 | 4.5:1 | AA neste par |
| Aviso / fundo de aviso | #79521D | #FBF0D9 | 6.11:1 | 4.5:1 | AA neste par |
| Erro / fundo de erro | #A32E34 | #FCE9E7 | 5.99:1 | 4.5:1 | AA neste par |
| Pendente / fundo pendente | #71553B | #F3EADC | 5.75:1 | 4.5:1 | AA neste par |
| Contorno de controle / cartão | #9F8B7F | #FFFEFA | 3.21:1 | 3:1 | AA neste par |
| Contorno de controle / fundo | #9F8B7F | #FBF7F0 | 3.04:1 | 3:1 | AA neste par |
| Foco / cartão | #42644C | #FFFEFA | 6.59:1 | 3:1 | AA neste par |
| Foco / fundo | #42644C | #FBF7F0 | 6.23:1 | 3:1 | AA neste par |
| Área do botão / fundo | #A34432 | #FBF7F0 | 5.73:1 | 3:1 | AA neste par |

## Interface atual

| Uso | Frente | Fundo | Razão |
|---|---|---|---:|
| Botão atual: branco / coral | #FFFFFF | #CB6858 | 3.71:1 |
| Apoio atual / fundo | #85756D | #FBF8F3 | 4.16:1 |
| Nota fraca atual / cartão | #B2A49C | #FFFEFA | 2.40:1 |
| Foco atual 32% / fundo | #ECCAC1 | #FBF8F3 | 1.44:1 |

Linhas claras de cartões são separadores decorativos e não contornos de controles. Sucesso, aviso, pendente e erro exigem também rótulos textuais; cor sozinha não identifica estado. Fontes e símbolos de logo são analisados por legibilidade óptica, não por uma declaração de conformidade de logotipo.

Fonte normativa: https://www.w3.org/TR/WCAG22/#contrast-minimum e https://www.w3.org/TR/WCAG22/#non-text-contrast
