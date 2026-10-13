"""Gera public/logo.svg: "doce agenda" em Fredoka (texto convertido em curvas) com o fio de glacê e a gota.

Uso: python scripts/build-logo.py
Fredoka (SIL OFL 1.1) fica em public/fonts/. O SVG final não depende de fonte instalada.
"""
from pathlib import Path
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

root = Path(__file__).resolve().parent.parent
font_file = root / "public" / "fonts" / "Fredoka.ttf"
SIZE = 30
BASELINE = 25.0
INK, SOFT = "#2b1a2c", "#5c3f5e"


def text_path(weight, text, x0):
    font = instantiateVariableFont(TTFont(font_file), {"wght": weight, "wdth": 100}, inplace=False)
    glyphs, cmap, hmtx = font.getGlyphSet(), font.getBestCmap(), font["hmtx"]
    scale = SIZE / font["head"].unitsPerEm
    pen = SVGPathPen(glyphs)
    x = x0
    for char in text:
        name = cmap[ord(char)]
        glyphs[name].draw(TransformPen(pen, (scale, 0, 0, -scale, x, BASELINE)))
        x += hmtx[name][0] * scale
    return pen.getCommands(), x


doce, end_doce = text_path(600, "doce", 0)
gap = SIZE * 0.22
agenda, end = text_path(500, "agenda", end_doce + gap)
width, height = round(end + 2, 2), 46
svg = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {width} {height}" role="img" aria-labelledby="brand-title">
<title id="brand-title">Doce Agenda</title>
<metadata>Doce Agenda wordmark. Letterforms from Fredoka, SIL Open Font License 1.1, converted to outlines. No external font dependency.</metadata>
<path fill="{INK}" d="{doce}"/>
<path fill="{SOFT}" d="{agenda}"/>
<g transform="translate(0 30)"><path d="M2 5 C22 2 46 8 72 4" fill="none" stroke="{INK}" stroke-width="3" stroke-linecap="round"/><path d="M44 5 V10 a4 4 0 0 0 8 0 V5 Z" fill="{INK}"/></g>
</svg>
'''
out = root / "public" / "logo.svg"
out.write_text(svg, encoding="utf-8")
print(f"logo.svg {width}x{height} ({len(svg)} bytes)")
