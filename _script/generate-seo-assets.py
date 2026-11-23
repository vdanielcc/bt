"""Derive web icon sizes and a social card from the existing Budo brand.

Run manually after a brand change: python _script/generate-seo-assets.py
Requires Pillow. Generated assets live in src and are copied by every Angular build.
"""
from pathlib import Path
import shutil
import shutil
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'src/assets/seo'
OUTPUT.mkdir(parents=True, exist_ok=True)
brand = Image.open(ROOT / 'src/assets/img/logo/budo-tournaments.png').convert('RGBA')
brand = brand.crop(brand.getbbox())

def icon(size, fraction=0.86):
    canvas = Image.new('RGBA', (size, size), 'white')
    logo = brand.copy()
    logo.thumbnail((round(size * fraction), round(size * fraction)), Image.Resampling.LANCZOS)
    canvas.alpha_composite(logo, ((size - logo.width) // 2, (size - logo.height) // 2))
    return canvas.convert('RGB')

icon(96).save(ROOT / 'src/favicon.png', optimize=True)
icon(48).save(ROOT / 'src/favicon.ico', sizes=[(16, 16), (32, 32), (48, 48)])
for name in ['favicon.ico', 'favicon.png']:
    shutil.copy2(ROOT / 'src' / name, ROOT / 'hosting-root' / name)
for name in ['favicon.ico', 'favicon.png']:
    shutil.copy2(ROOT / 'src' / name, ROOT / 'hosting-root' / name)
for name, size, fraction in [('favicon-32', 32, .86), ('apple-touch-icon', 180, .86),
                             ('icon-192', 192, .86), ('icon-512', 512, .86),
                             ('icon-maskable-512', 512, .56)]:
    icon(size, fraction).save(OUTPUT / (name + '.png'), optimize=True)

def font(size, bold=False):
    candidates = [Path('C:/Windows/Fonts') / ('arialbd.ttf' if bold else 'arial.ttf'),
                  Path('/usr/share/fonts/truetype/dejavu') / ('DejaVuSans-Bold.ttf' if bold else 'DejaVuSans.ttf')]
    path = next((path for path in candidates if path.is_file()), None)
    if path is None:
        raise RuntimeError('Install Arial or DejaVu Sans to regenerate the social card.')
    return ImageFont.truetype(str(path), size)

card = Image.new('RGB', (1200, 630), '#111827')
draw = ImageDraw.Draw(card)
draw.rectangle((0, 0, 1199, 11), fill='#ef233c')
draw.rounded_rectangle((70, 147, 370, 447), radius=32, fill='white')
logo = brand.copy()
logo.thumbnail((256, 256), Image.Resampling.LANCZOS)
card.paste(logo, (220 - logo.width // 2, 297 - logo.height // 2), logo)
draw.text((424, 155), 'BUDO', font=font(72, True), fill='white')
draw.text((427, 240), 'TOURNAMENTS', font=font(42, True), fill='white')
draw.text((428, 321), 'Torneos de artes marciales', font=font(32), fill='#e5e7eb')
draw.text((428, 371), 'y gestión de academias', font=font(32), fill='#e5e7eb')
draw.line((428, 432, 1095, 432), fill='#ef233c', width=4)
draw.text((428, 460), 'Inscripciones · Llaves · Resultados', font=font(25), fill='#cbd5e1')
draw.text((70, 558), 'budotournaments.net', font=font(24), fill='#94a3b8')
card.save(OUTPUT / 'budo-tournaments-social-v1.jpg', quality=91, optimize=True, progressive=False)
print('Brand icons and 1200x630 JPEG social card generated in src.')
