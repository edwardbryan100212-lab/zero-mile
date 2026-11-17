#!/usr/bin/env python3
"""Re-dither photos in Ditherlab with each photo's OWN colours (no colour cast).
Usage: redither.py <in_dir> <out_dir> <pixel_size> <n_colours> [algorithm]
For each image: pick its n main colours (PIL median cut), run Ditherlab's engine with that
palette via ~/.cache/ecoapp-tools/dither.mjs, then shrink losslessly by the pixel size."""
import sys, os, subprocess, tempfile, shutil
from PIL import Image

src, out, px, n = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
algo = sys.argv[5] if len(sys.argv) > 5 else 'floyd'
os.makedirs(out, exist_ok=True)
tool = os.path.expanduser('~/.cache/ecoapp-tools')
for f in sorted(os.listdir(src)):
    if not f.lower().endswith(('.jpg', '.jpeg', '.png')):
        continue
    im = Image.open(os.path.join(src, f)).convert('RGB')
    small = im.copy(); small.thumbnail((200, 200))
    from PIL import ImageEnhance
    pal = ImageEnhance.Color(small).enhance(1.15).quantize(colors=n, method=Image.Quantize.FASTOCTREE).getpalette()[:n * 3]  # octree keeps small saturated areas (leaves, fruit)
    cols = ['#%02x%02x%02x' % tuple(pal[i:i + 3]) for i in range(0, len(pal), 3)]
    cols.sort(key=lambda h: sum(int(h[i:i + 2], 16) for i in (1, 3, 5)))  # dark to light
    with tempfile.TemporaryDirectory() as tin, tempfile.TemporaryDirectory() as tout:
        shutil.copy(os.path.join(src, f), tin)
        subprocess.run(['node', 'dither.mjs', tin, tout, ','.join(cols), str(px), '0', algo], cwd=tool, check=True, capture_output=True)
        res = [x for x in os.listdir(tout) if x.endswith('.png') and not x.startswith('_')][0]
        d = Image.open(os.path.join(tout, res)).convert('RGB')
        d = d.resize((d.width // px, d.height // px), Image.NEAREST)  # one pixel per dither block; CSS scales it back up crisp
        d = d.quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE)
        name = os.path.splitext(f)[0] + '.png'
        d.save(os.path.join(out, name), optimize=True)
        print(name, d.size, os.path.getsize(os.path.join(out, name)) // 1024, 'KB', cols)
