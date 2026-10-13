from pathlib import Path
from PIL import Image, ImageOps, ImageDraw, ImageFont

root = Path(__file__).parent
font = ImageFont.truetype(str(root / '../../public/fonts/Manrope.ttf'), 18)
labels = [('landing', 'Página inicial'), ('signup', 'Criar conta'), ('login', 'Entrar'), ('recovery', 'Recuperar acesso'), ('verify', 'Confirmar e-mail'), ('setup', 'Preparar agenda'), ('firstorder', 'Primeiro pedido'), ('done', 'Resultado da prévia')]
cell_w, cell_h = 310, 800
sheet = Image.new('RGB', (4 * cell_w, 2 * cell_h), '#e9dfd2')
draw = ImageDraw.Draw(sheet)
for i, (screen, label) in enumerate(labels):
    x, y = (i % 4) * cell_w, (i // 4) * cell_h
    draw.text((x + 18, y + 12), label, fill='#392923', font=font)
    with Image.open(root / f'prints/{screen}-390.png') as src:
        # A folha mostra o topo e o fluxo; as capturas integrais permanecem em prints/.
        src = src.crop((0, 0, src.width, min(src.height, 1010)))
        src.thumbnail((cell_w - 24, cell_h - 52), Image.Resampling.LANCZOS)
        sheet.paste(src.convert('RGB'), (x + (cell_w - src.width) // 2, y + 44))
sheet.save(root / 'prints/visao-geral.png')
