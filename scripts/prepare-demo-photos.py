from pathlib import Path
from PIL import Image
import json, shutil, hashlib, argparse
ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description='Rebuild WebP variants from the preserved originals (Pillow required).')
parser.add_argument('--source', type=Path, help='Optional built-in generator folder for an initial import.')
parser.add_argument('--force', action='store_true', help='Rebuild existing variants after changing originals or compression settings.')
args = parser.parse_args()
SOURCE = args.source
FILES = [["brigadeiros-gourmet","d9c8de30-414f-4a45-b95e-9efb09e0fcad"],["bolo-pistache","bac2cf97-3aa5-45d2-97f3-89d9b5f31311"],["bolo-chocolate-morango","86e70147-447b-462f-9dab-d3cb361666a6"],["bento-cake","c63ef903-9f3c-4433-a3be-366d06c57340"],["caixa-docinhos","fecf5023-fb1e-4f66-bdf6-c076e30805f4"],["kit-festa","17a2af96-c97a-44db-9556-fadc5315a750"],["bolo-infantil","decc5897-ebbf-4355-83c4-fd7740f21c02"],["bolo-aniversario-frutas","d8d5520f-7473-4902-b69d-63673d3a125b"],["brownies","12c85cfa-7892-4f16-bc12-fc3441b81045"],["sobremesas-individuais","6529cea8-7a55-4fa0-bc86-4c2a33251359"],["cupcakes","e57b24c4-de94-4b7e-8372-f943ce81d794"],["bolo-cenoura-chocolate","453a9aaa-3993-4eaf-a58b-221a5ddcbc3f"],["confeiteira-em-acao","ca01e33d-7b0d-450d-86f7-690dfd920ed7"],["cliente-feliz","4bdf18e6-b6c6-4175-a63b-7f3f5d892ef4"],["cliente-retirando-pedido","15a49c37-ce6c-4b2f-8d0f-68b1bfcf5b60"],["embalagem-mensagem","3a75337f-4e7c-4bfe-b0ef-ea8ca5b15149"],["embalagem-entrega","9e6efbcc-dff8-4fd4-a431-c35d084d3228"],["bastidores-confeitaria","4d63830e-3b93-4428-9139-4dcb74ed95d4"]]
originals = ROOT / 'assets/demo-fotografias/originais'
FILES.extend([["bolo-de-pote","01375d1f-55c6-4974-83ac-46c426780793"],["beijinho","9f669d1f-e2d2-45ec-acfc-4d1511579ea6"],["torta-de-limao","312b656c-caef-4a11-93f2-b6c91fb6915b"],["pudim-de-leite","3dc383ac-0fda-4d6a-baf5-82f783dcee4a"],["logo-doces-da-lu","a79f09c6-c083-4e60-8c2d-849a39743438"]])
reserve = ROOT / 'assets/demo-fotografias/reserva'
public = ROOT / 'public/encomenda/exemplos'
for folder in [originals, reserve, public]:
    folder.mkdir(parents=True, exist_ok=True)
manifest = []
for index, (slug, identifier) in enumerate(FILES, 1):
    original = originals / (slug + '.png')
    if not original.exists():
        if SOURCE is None:
            raise FileNotFoundError(f'{original}: restore the original or supply --source')
        shutil.copy2(SOURCE / ('exec-' + identifier + '.png'), original)
    image = Image.open(original).convert('RGB')
    active = index <= 12 or index >= 18
    folder = public if active else reserve
    variants = []
    for width in [160, 480, 960]:
        height = round(width * image.height / image.width)
        target = folder / (slug + '-' + str(width) + '.webp')
        if args.force or not target.exists():
            image.resize((width, height), Image.Resampling.LANCZOS).save(target, 'WEBP', quality=84, method=6)
        variants.append({'file': target.relative_to(ROOT).as_posix(), 'width': width, 'height': height, 'bytes': target.stat().st_size})
    application = 'logo-demo' if index == 23 else 'capa-vitrine-demo' if index == 18 else 'catalogo-demo' if index <= 12 or 19 <= index <= 22 else 'reserva-editorial-ficticia'
    manifest.append({'id': index, 'slug': slug, 'generator': 'image_gen built-in', 'generation': identifier, 'original': original.relative_to(ROOT).as_posix(), 'dimensions': list(image.size), 'sha256': hashlib.sha256(original.read_bytes()).hexdigest(), 'application': application, 'variants': variants})
(ROOT / 'assets/demo-fotografias/manifest.json').write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + '\n', encoding='utf-8')
print(json.dumps({'approved': len(manifest), 'originalBytes': sum((ROOT / x['original']).stat().st_size for x in manifest), 'publishedVariantsBytes': sum(v['bytes'] for x in manifest if x['application'] != 'reserva-editorial-ficticia' for v in x['variants']), 'largestWebP': max(v['bytes'] for x in manifest for v in x['variants'])}))
