"""Build the single-file dashboard (dist/index.html) from the source files.

Usage:  python build.py
Needs only Python 3 (no extra packages).
"""
import base64, os

ROOT = os.path.dirname(os.path.abspath(__file__))
def read(*p, mode='r'):
    with open(os.path.join(ROOT, *p), mode) as f:
        return f.read()

def js(text):
    # keep "</script" inside JS from closing the <script> tag early
    return text.replace('</script', '<\\/script')

html = read('src', 'index.template.html')
html = html.replace('/*CSS*/', read('src', 'styles.css'))
for name in ('wordmark.png', 'philips-shield.png'):
    b64 = base64.b64encode(read('assets', name, mode='rb')).decode()
    html = html.replace('ASSET:' + name, 'data:image/png;base64,' + b64)
html = html.replace('/*CHARTJS*/', js(read('vendor', 'chart.min.js')))
html = html.replace('/*JSZIP*/', js(read('vendor', 'jszip.min.js')))
html = html.replace('/*CORE*/', js(read('src', 'core.js')))
html = html.replace('/*APP*/', js(read('src', 'app.js')))

os.makedirs(os.path.join(ROOT, 'dist'), exist_ok=True)
out = os.path.join(ROOT, 'dist', 'index.html')
with open(out, 'w', encoding='utf-8') as f:
    f.write(html)
print('Built', out, f'({len(html):,} characters)')
