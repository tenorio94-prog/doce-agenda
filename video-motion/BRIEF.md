---
workflow: general-video
flow: automation
storyboard: no
message: "Do pedido ao sinal conferido, a encomenda inteira cabe numa forma só"
aspect: 1440x1440
language: pt-BR
length: 16s
audience: confeiteiras autônomas que trabalham por encomenda
---

## Intent

Loop de motion UI no nível Dribbble, adaptado ao Doce Agenda: uma forma só, sem cortes, mudando de tamanho, cantos e cor enquanto o conteúdo troca com um desfoque curto. Um toque de dedo (círculo translúcido) conduz cada mudança com toques e arrastos reais. Câmera aproxima cada estado. 120 BPM, 8 compassos, algo em toda batida, último quadro igual ao primeiro.

## Customizations

- 11 estados, na grade aprovada na conversa: + Novo pedido → cartão (Marina, Bolo de chocolate · 1,5 kg) → faixa da semana com indicador que estica até sábado → cartão baunilha "Falta o sinal" → botão Sinal conferido → CARIMBO SINAL PAGO → Começar a fazer → Em produção → Pronto (pistache) → semana com limite do dia esticando e "Lotado" → Meu mês (dias mais cheios, tooltip) → link de encomenda → "Link copiado" → nova solicitação → revisar/confirmar → volta ao botão.
- Cores: creme, ameixa e branco; rosa glacê como destaque; baunilha, pistache e verde-carimbo só quando significam algo.
- Fontes da marca: Fredoka (títulos e números) e Figtree (texto). Toque de dedo no lugar do cursor (a testar).
- Música e sons de interface gerados por código (numpy), 120 BPM, loop de 8 compassos.
- Render: 240 fps, 4 subquadros misturados com ffmpeg tmix, 60 fps final.

## Notes

- Proibido: easing elástico, partículas, brilhos, gradientes nos componentes, ícones com traços diferentes, tempo morto, cara de template.
- Todo estilo calculado a partir do tempo em render(t): sem transições CSS, sem timers. Molas em forma fechada, somadas por mudança de alvo, periódicas (o loop fecha sozinho).
- Sem will-change em nada que a câmera escala.
- Só mostrar o que o app faz: sem Pix automático, sem WhatsApp automático, solicitação pelo link aparece para revisar.
- Dados fictícios. Arquivos renderizados não vão para o Git.

## Render final

```
npx hyperframes@0.8.157 render --fps 240 --crf 12 -o renders/raw-240.mp4 .
ffmpeg -i renders/raw-240.mp4 -vf "tmix=frames=4:weights='1 1 1 1',select='eq(mod(n\,4)\,3)',setpts=N/(60*TB),format=yuv420p" -r 60 -c:v libx264 -preset slow -crf 16 -c:a aac -b:a 192k -movflags +faststart renders/doce-agenda-loop.mp4
```
