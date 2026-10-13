"""Original vector wordmark; Lora font under SIL OFL (public/fonts/Lora-OFL.txt)."""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import json

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'design' / 'brand-refresh'
OUT.mkdir(parents=True, exist_ok=True)
for filename in ('logo.svg', 'favicon.svg'):
    old = ROOT / 'public' / filename
    backup = OUT / ('before-' + filename)
    if not backup.exists(): backup.write_bytes(old.read_bytes())

def lettering(text, size, weight, x, baseline, tracking=0):
    font = TTFont(ROOT / 'public/fonts/Lora.ttf')
    if 'fvar' in font: font = instantiateVariableFont(font, {'wght': weight})
    glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
    scale = size / font['head'].unitsPerEm
    paths = []
    for char in text:
        name = cmap[ord(char)]
        pen = SVGPathPen(glyphs)
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, baseline)))
        if pen.getCommands(): paths.append('<path d="' + pen.getCommands() + '"/>')
        x += font['hmtx'][name][0] * scale + tracking
    return ''.join(paths), x

doce, end = lettering('Doce', 46, 600, 2, 43, -.45)
agenda, width = lettering('Agenda', 37, 450, end + 8, 43, -.45)
width = round(width + 3, 2)
logo = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} 57" role="img" aria-labelledby="brand-title">
<title id="brand-title">Doce Agenda</title>
<metadata>Original Doce Agenda wordmark. Letterforms adapted from Lora, SIL Open Font License 1.1. No external font dependency.</metadata>
<g fill="#a34432">{doce}{agenda}</g>
<path d="M24 50 C49 54 77 53 {round(end-4,2)} 48" fill="none" stroke="#a34432" stroke-width="1.9" stroke-linecap="round"/>
</svg>'''
(ROOT / 'public/logo.svg').write_text(logo, encoding='utf8')
(OUT / 'wordmark.svg').write_text(logo, encoding='utf8')
d, _ = lettering('D', 39, 600, 9, 39)
icon = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><title>Doce Agenda</title><rect width="48" height="48" rx="13" fill="#a34432"/><g fill="#fffefa">{d}</g></svg>'''
(ROOT / 'public/favicon.svg').write_text(icon, encoding='utf8')
(OUT / 'app-icon.svg').write_text(icon, encoding='utf8')
(OUT / 'wordmark-mono.svg').write_text(logo.replace('#a34432','#392923'), encoding='utf8')
(OUT / 'wordmark-white.svg').write_text(logo.replace('#a34432','#fffefa'), encoding='utf8')
print(json.dumps({'width':width,'height':57,'assets':'public/logo.svg, public/favicon.svg'}))
