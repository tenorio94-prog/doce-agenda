from pathlib import Path
import json, html
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

ROOT = Path(__file__).resolve().parent
A = ROOT / "assets"
A.mkdir(exist_ok=True)
colors = {
 "bg":"#FBF7F0","surface":"#FFFEFA","ink":"#392923","muted":"#6F5B51",
 "action":"#A34432","action-hover":"#843524","action-soft":"#F8E8E1",
 "success":"#42644C","success-soft":"#E8F0E8",
 "warning":"#79521D","warning-soft":"#FBF0D9",
 "error":"#A32E34","error-soft":"#FCE9E7",
 "pending":"#71553B","pending-soft":"#F3EADC",
 "control-border":"#9F8B7F","line":"#E7DCD1","focus":"#42644C"
}
symbols = {
 "01-agenda-de-bancada": '<rect x="4" y="7" width="24" height="22" rx="5"/><path d="M10 4v6m12-6v6M4 13h24M9 20v5h14v-5M9 20c2 0 2-3 4-3s2 3 4 3 2-3 4-3 2 3 2 3"/>',
 "02-d-de-rotina": '<path d="M7 5h7c8 0 13 4 13 11s-5 11-13 11H7V5Z"/><path d="M12 11h6m-6 5h9m-9 5h6"/>',
 "03-etiqueta-do-combinado": '<path d="m4 13 9-9h12a3 3 0 0 1 3 3v18a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3V13Z"/><circle cx="13" cy="10" r="1.3" fill="currentColor" stroke="none"/><path d="m11 21 4 4 8-9"/>'
}
names = ["Agenda de bancada","D de rotina","Etiqueta do combinado"]
def g(mark):
 return '<g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'+mark+'</g>'
def svg(vb,content,title,color="#A34432"):
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{vb}" color="{color}" role="img" aria-labelledby="title"><title id="title">{html.escape(title)}</title>{content}</svg>\n'
font = instantiateVariableFont(TTFont(A/"fonts/Lora.ttf"), {"wght":600}, inplace=False)
glyphs = font.getGlyphSet()
cmap = font.getBestCmap()
upm = font["head"].unitsPerEm
def outlined(text, x, baseline, size):
 cursor=x;paths=[];scale=size/upm
 for ch in text:
  glyph=glyphs[cmap[ord(ch)]]
  pen=SVGPathPen(glyphs)
  glyph.draw(TransformPen(pen,(scale,0,0,-scale,cursor,baseline)))
  d=pen.getCommands()
  if d:paths.append('<path d="'+d+'"/>')
  cursor+=glyph.width*scale
 return ''.join(paths),cursor
word,width=outlined("Doce Agenda",48,33,26)
for (key,mark),name in zip(symbols.items(),names):
 (A/(key+"-simbolo.svg")).write_text(svg("0 0 32 32",g(mark),name),encoding="utf-8")
 content=f'<g transform="translate(0 8)">{g(mark)}</g><g fill="currentColor">{word}</g>'
 (A/(key+"-logo.svg")).write_text(svg(f"0 0 {round(width+6,2)} 48",content,"Doce Agenda — "+name),encoding="utf-8")
 editable=f'<g transform="translate(0 8)">{g(mark)}</g><text x="48" y="33" fill="currentColor" font-family="Lora, Georgia, serif" font-weight="600" font-size="26">Doce Agenda</text>'
 (A/(key+"-editavel.svg")).write_text(svg(f"0 0 {round(width+6,2)} 48",editable,"Doce Agenda — "+name),encoding="utf-8")
mark=symbols["01-agenda-de-bancada"]
for key,rx in [("icone-quadrado",0),("icone-arredondado",56)]:
 (A/(key+".svg")).write_text(svg("0 0 256 256",f'<rect width="256" height="256" rx="{rx}" fill="#A34432"/><g transform="translate(48 48) scale(5)">{g(mark)}</g>',"Doce Agenda — ícone", "#FFFFFF"),encoding="utf-8")
(A/"icone-adaptativo-foreground.svg").write_text(svg("0 0 256 256",f'<g transform="translate(48 48) scale(5)">{g(mark)}</g>',"Doce Agenda — camada frontal","#FFFFFF"),encoding="utf-8")
(A/"icone-adaptativo-background.svg").write_text(svg("0 0 256 256",'<path fill="#A34432" d="M0 0h256v256H0z"/>',"Doce Agenda — camada de fundo"),encoding="utf-8")
(A/"favicon.svg").write_text(svg("0 0 32 32",'<rect width="32" height="32" rx="7" fill="#A34432"/><g transform="translate(3 3) scale(.8125)">'+g(mark)+'</g>',"Doce Agenda","#FFFFFF"),encoding="utf-8")
for name in ["Lora","Manrope"]:
 f=TTFont(A/f"fonts/{name}.ttf")
 features=sorted({x.FeatureTag for table in ["GSUB","GPOS"] if table in f and f[table].table.FeatureList for x in f[table].table.FeatureList.FeatureRecord})
 print(name,"features:",",".join(features))
def luminance(h):
 channels=[int(h[i:i+2],16)/255 for i in (1,3,5)]
 channels=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in channels]
 return sum(a*b for a,b in zip(channels,[.2126,.7152,.0722]))
def ratio(a,b):
 l1,l2=sorted([luminance(a),luminance(b)],reverse=True)
 return (l1+.05)/(l2+.05)
pairs=[
 ("Texto / fundo","ink","bg",4.5),("Texto / cartão","ink","surface",4.5),
 ("Apoio / fundo","muted","bg",4.5),("Apoio / cartão","muted","surface",4.5),
 ("Botão: branco / ação","#FFFFFF","action",4.5),
 ("Botão hover: branco / ação","#FFFFFF","action-hover",4.5),
 ("Link / fundo","action","bg",4.5),
 ("Sucesso / fundo de sucesso","success","success-soft",4.5),
 ("Aviso / fundo de aviso","warning","warning-soft",4.5),
 ("Erro / fundo de erro","error","error-soft",4.5),
 ("Pendente / fundo pendente","pending","pending-soft",4.5),
 ("Contorno de controle / cartão","control-border","surface",3),
 ("Contorno de controle / fundo","control-border","bg",3),
 ("Foco / cartão","focus","surface",3),("Foco / fundo","focus","bg",3),
 ("Área do botão / fundo","action","bg",3)
]
rows=[]
for label,fg,bg,threshold in pairs:
 fg=colors.get(fg,fg);bg=colors.get(bg,bg);r=ratio(fg,bg)
 rows.append(dict(uso=label,frente=fg,fundo=bg,razao=round(r,4),minimo=threshold,passa=r>=threshold))
 assert r>=threshold,(label,r)
original=[
 ("Botão atual: branco / coral","#FFFFFF","#CB6858"),
 ("Apoio atual / fundo","#85756D","#FBF8F3"),
 ("Nota fraca atual / cartão","#B2A49C","#FFFEFA"),
 ("Foco atual 32% / fundo","#EC CACE".replace(" ",""),"#FBF8F3")
]
# The current rgba(203,104,88,.32) focus composite over #FBF8F3.
alpha=.32
rgb=[round(int("#CB6858"[i:i+2],16)*alpha+int("#FBF8F3"[i:i+2],16)*(1-alpha)) for i in (1,3,5)]
original[-1]=(original[-1][0],"#"+"".join(f"{v:02X}" for v in rgb),original[-1][2])
old=[dict(uso=n,frente=a,fundo=b,razao=round(ratio(a,b),4)) for n,a,b in original]
(ROOT/"contrastes.json").write_text(json.dumps(dict(proposta=rows,atual=old),ensure_ascii=False,indent=2),encoding="utf-8")
md="# Contrastes calculados\n\nWCAG 2.2: texto normal ≥ 4,5:1; texto grande ≥ 3:1 (24 px regular ou aproximadamente 18,67 px negrito). Controles e foco contra cores adjacentes ≥ 3:1. Todos os textos propostos usam o limite mais rigoroso de 4,5:1.\n\nCálculo: canais sRGB normalizados; canal linear = c/12,92 se c ≤ 0,04045, senão ((c+0,055)/1,055)^2,4. L = 0,2126R + 0,7152G + 0,0722B. Razão = (L mais clara + 0,05)/(L mais escura + 0,05). Valores não arredondados definem aprovação. Esta análise verifica os pares, não certifica acessibilidade de toda a aplicação.\n\n| Uso | Frente | Fundo | Razão | Mínimo | Resultado |\n|---|---|---|---:|---:|---|\n"
for r in rows:md+=f"| {r['uso']} | {r['frente']} | {r['fundo']} | {r['razao']:.2f}:1 | {r['minimo']}:1 | AA neste par |\n"
md+="\n## Interface atual\n\n| Uso | Frente | Fundo | Razão |\n|---|---|---|---:|\n"
for r in old:md+=f"| {r['uso']} | {r['frente']} | {r['fundo']} | {r['razao']:.2f}:1 |\n"
md+="\nLinhas claras de cartões são separadores decorativos e não contornos de controles. Sucesso, aviso, pendente e erro exigem também rótulos textuais; cor sozinha não identifica estado. Fontes e símbolos de logo são analisados por legibilidade óptica, não por uma declaração de conformidade de logotipo.\n\nFonte normativa: https://www.w3.org/TR/WCAG22/#contrast-minimum e https://www.w3.org/TR/WCAG22/#non-text-contrast\n"
(ROOT/"CONTRASTES.md").write_text(md,encoding="utf-8")
css='''@font-face{font-family:Lora;src:url("assets/fonts/Lora.ttf") format("truetype");font-weight:400 700;font-style:normal;font-display:swap}
@font-face{font-family:Manrope;src:url("assets/fonts/Manrope.ttf") format("truetype");font-weight:200 800;font-style:normal;font-display:swap}
:root{color-scheme:light;
'''
css+=''.join(f"--da-{k}:{v};\n" for k,v in colors.items())
css+='''--da-title:Lora,Georgia,serif;--da-body:Manrope,system-ui,sans-serif;
--da-radius-card:16px;--da-radius-control:12px;--da-radius-pill:999px;
--da-space-1:4px;--da-space-2:8px;--da-space-3:12px;--da-space-4:16px;--da-space-5:24px;--da-space-6:32px;
--da-shadow:0 6px 18px rgb(57 41 35 / 6%);
font-family:var(--da-body);font-synthesis:none;}
*{box-sizing:border-box}body{margin:0;color:var(--da-ink);background:var(--da-bg);font:400 16px/1.5 var(--da-body)}
h1,h2,h3{font-family:var(--da-title);line-height:1.2;font-weight:600}
h1{font-size:32px}h2{font-size:24px}h3{font-size:20px}
button{font:700 16px/1.25 var(--da-body);cursor:pointer}
.da-button{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:12px 20px;border:0;border-radius:var(--da-radius-control);background:var(--da-action);color:#fff;text-decoration:none}
.da-button:hover{background:var(--da-action-hover)}
:is(button,a,input,select,textarea):focus-visible{outline:3px solid var(--da-focus);outline-offset:3px}
.da-card{padding:16px;border:1px solid var(--da-line);border-radius:var(--da-radius-card);background:var(--da-surface)}
.da-label{display:block;font-size:14px;font-weight:600;color:var(--da-muted)}
.da-money{display:block;font-family:var(--da-body);font-size:28px;line-height:1.25;font-weight:700;font-variant-numeric:lining-nums tabular-nums;white-space:nowrap}
.da-status{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:var(--da-radius-pill);font-size:13px;font-weight:700;color:var(--da-success);background:var(--da-success-soft)}
.da-status-pending{color:var(--da-pending);background:var(--da-pending-soft)}
.da-status-warning{color:var(--da-warning);background:var(--da-warning-soft)}
.da-status-error{color:var(--da-error);background:var(--da-error-soft)}
.da-order{display:grid;gap:12px;border-left:4px solid var(--da-success)}
.da-order-head{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}
.da-order p{margin:0}.da-order small{font-size:14px;color:var(--da-muted)}
.da-banner{padding:16px;border-radius:12px;background:var(--da-pending-soft);color:var(--da-pending);font-size:14px;line-height:1.5}
.da-empty{padding:24px 16px;text-align:center}.da-empty h3{margin:12px 0 8px}.da-empty p{color:var(--da-muted);margin:0 0 16px}
.da-input{width:100%;min-height:48px;border:1px solid var(--da-control-border);border-radius:12px;padding:12px;background:var(--da-surface);color:var(--da-ink);font:inherit}
.da-input::placeholder{color:var(--da-muted)}
@media(prefers-reduced-motion:reduce){*,*::before,*::after{scroll-behavior:auto!important;animation:none!important;transition:none!important}}
'''
(ROOT/"tokens.css").write_text(css,encoding="utf-8")
print("Contrastes atuais:",json.dumps(old,ensure_ascii=False))
print("Contrastes propostos:",json.dumps(rows,ensure_ascii=False))

sans = instantiateVariableFont(TTFont(A/"fonts/Manrope.ttf"), {"wght":500}, inplace=False)
sansbold = instantiateVariableFont(TTFont(A/"fonts/Manrope.ttf"), {"wght":700}, inplace=False)
def txt(text,x,y,size,face=font,color="#392923"):
 gs=face.getGlyphSet();cm=face.getBestCmap();unit=face["head"].unitsPerEm
 scale=size/unit;cursor=x;parts=[]
 for ch in text:
  glyph=gs[cm[ord(ch)]];pen=SVGPathPen(gs)
  glyph.draw(TransformPen(pen,(scale,0,0,-scale,cursor,y)))
  if pen.getCommands():parts.append(f'<path d="{pen.getCommands()}"/>')
  cursor+=glyph.width*scale
 return f'<g fill="{color}">'+''.join(parts)+'</g>'
brand='<g transform="translate(72 54) scale(1.5)">'+g(mark)+'</g>'+txt("Doce Agenda",136,94,30)
share='<rect width="1200" height="630" fill="#FBF7F0"/>'
share+='<rect x="736" y="88" width="392" height="458" rx="20" fill="#FFFEFA" stroke="#E7DCD1"/>'
share+=brand
for t,y in [("Pedidos, prazos",224),("e pagamentos",292),("em ordem.",360)]:
 share+=txt(t,72,y,52)
share+=txt("Uma agenda para sua rotina de encomendas.",72,422,22,sans,"#6F5B51")
share+='<rect x="72" y="460" width="220" height="56" rx="12" fill="#A34432"/>'
share+=txt("Conheça o piloto",94,496,22,sansbold,"#FFFFFF")
share+=txt("doce-agenda-piloto.netlify.app",72,560,20,sans,"#6F5B51")
share+=txt("EXEMPLO FICTÍCIO",764,136,16,sansbold,"#A34432")
share+=txt("Bolo de cenoura",764,185,28)
share+=txt("16h · Retirada",764,225,20,sans,"#6F5B51")
share+='<path d="M764 252h336" stroke="#E7DCD1"/>'
for label,value,y in [("Valor total","R$ 180,00",292),("Recebido e conferido","R$ 60,00",374),("Saldo a receber","R$ 120,00",456)]:
 share+=txt(label,764,y,18,sans,"#6F5B51")
 share+=txt(value,764,y+37,30,sansbold)
share+=txt("Piloto · dados no navegador · backup manual",72,603,18,sans,"#6F5B51")
(A/"compartilhamento.svg").write_text(svg("0 0 1200 630",share,"Doce Agenda — pedidos, prazos e pagamentos em ordem. Exemplo fictício."),encoding="utf-8")
receipt='<rect width="720" height="920" fill="#FFFEFA"/><rect width="720" height="12" fill="#A34432"/>'
receipt+=txt("EXEMPLO FICTÍCIO · SUA CONFEITARIA",48,58,16,sansbold,"#A34432")
receipt+=txt("Resumo de pedido",48,124,40)
receipt+=txt("Cliente exemplo",48,173,22,sansbold)
receipt+=txt("Bolo de cenoura · 1,5 kg",48,211,22,sans)
receipt+='<rect x="48" y="243" width="624" height="94" rx="12" fill="#E8F0E8"/>'
receipt+=txt("Pedido confirmado",68,281,20,sansbold,"#42644C")
receipt+=txt("10/10/2026, 16h · Retirada",68,314,20,sans,"#42644C")
for label,value,y in [("Valor total","R$ 180,00",388),("Recebido e conferido","R$ 60,00",496),("Saldo a receber","R$ 120,00",604)]:
 receipt+=txt(label,48,y,20,sans,"#6F5B51")
 receipt+=txt(value,48,y+48,38,sansbold)
receipt+='<path d="M48 691h624" stroke="#E7DCD1"/>'
receipt+=txt("Valores registrados pela confeiteira.",48,736,19,sans,"#6F5B51")
receipt+=txt("Não substitui comprovante bancário.",48,771,19,sans,"#6F5B51")
receipt+='<g transform="translate(48 812)">'+g(mark)+'</g>'
receipt+=txt("Doce Agenda",92,838,22)
receipt+=txt("Aplicação de marca · envio não integrado ao app",48,883,16,sans,"#6F5B51")
(A/"resumo-pedido.svg").write_text(svg("0 0 720 920",receipt,"Resumo fictício: valor total 180 reais, recebido e conferido 60 reais, saldo a receber 120 reais. Não é comprovante bancário."),encoding="utf-8")
guide=ROOT/"GUIA-MARCA.md"
if guide.exists():
 content=guide.read_text(encoding="utf-8")
 for key,file in [("SVG_01","01-agenda-de-bancada-editavel.svg"),("SVG_02","02-d-de-rotina-editavel.svg"),("SVG_03","03-etiqueta-do-combinado-editavel.svg"),("SVG_ICON","icone-quadrado.svg")]:
  source=(A/file).read_text(encoding="utf-8").strip().replace("><",">\n<")
  content=content.replace("<!-- "+key+" -->","~~~svg\n"+source+"\n~~~")
 guide.write_text(content,encoding="utf-8")
