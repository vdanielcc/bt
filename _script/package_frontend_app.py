"""Empaqueta el build production con --base-href /app/ para hosting Apache."""
from pathlib import Path
import hashlib
import json
import re
import zipfile


root = Path(__file__).resolve().parent.parent
release = root / 'release' / 'frontend-app-20260925'
source = release / 'frontend'
index = (source / 'index.html').read_text(encoding='utf-8')
assert '<base href="/app/">' in index, 'Compilar primero con --base-href /app/'

(source / '.htaccess').write_text(
    'RewriteEngine On\n'
    'RewriteBase /app/\n'
    'RewriteCond %{REQUEST_FILENAME} -f [OR]\n'
    'RewriteCond %{REQUEST_FILENAME} -d\n'
    'RewriteRule ^ - [L]\n'
    'RewriteRule ^ index.html [L]\n', encoding='utf-8')
(source / '_redirects').write_text('/app/* /app/index.html 200\n', encoding='utf-8')

assert not list(source.rglob('*.map')), 'El paquete no debe contener source maps'
for file in source.iterdir():
    if file.suffix in {'.js', '.css', '.html'}:
        assert '/bte/' not in file.read_text(encoding='utf-8'), f'Ruta anterior en {file.name}'
for asset in re.findall(r'(?:src|href)="([^"?#]+\.(?:js|css))"', index):
    if not asset.startswith(('http', '/')):
        assert (source / asset).is_file(), f'Asset faltante: {asset}'
for stylesheet in source.glob('*.css'):
    for url in re.findall(r'url\([\"\x27]?([^\)\"\x27]+)', stylesheet.read_text(encoding='utf-8')):
        if not url.startswith(('data:', 'http:', 'https:', '/')):
            assert (source / url.split('?')[0].split('#')[0]).is_file(), f'Recurso CSS faltante: {url}'

archive = release / 'bte-frontend-app-20260925.zip'
with zipfile.ZipFile(archive, 'w', zipfile.ZIP_DEFLATED, compresslevel=9) as output:
    for file in sorted(source.rglob('*')):
        if file.is_file():
            output.write(file, file.relative_to(source).as_posix())
with zipfile.ZipFile(archive) as output:
    assert output.testzip() is None
    assert 'index.html' in output.namelist() and '.htaccess' in output.namelist()

sha = hashlib.sha256(archive.read_bytes()).hexdigest()
archive.with_suffix('.sha256').write_text(f'{sha}  {archive.name}\n', encoding='utf-8')
(release / 'LEEME.txt').write_text(
    'Frontend para https://budotournaments.net/app/\n\n'
    'Extraer el contenido del ZIP directamente dentro de la carpeta publica app.\n'
    'index.html, .htaccess, los archivos JS/CSS y assets/ deben quedar dentro de app/.\n'
    'Incluir .htaccess para abrir y recargar rutas internas en Apache.\n'
    'La API utilizada es https://apidemo.budotournaments.net/api.\n'
    'El paquete esta compilado y validado; no se ha subido al hosting.\n\n'
    'Recompilar desde la raiz del proyecto:\n'
    'node node_modules/@angular/cli/bin/ng.js build --configuration production '
    '--base-href /app/ --output-path release/frontend-app-20260925/frontend\n'
    'python _script/package_frontend_app.py\n\n'
    f'SHA256 ZIP: {sha}\n', encoding='utf-8')
print(json.dumps({'file': str(archive), 'bytes': archive.stat().st_size, 'sha256': sha}))
