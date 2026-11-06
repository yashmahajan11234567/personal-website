#!/usr/bin/env python3
"""Pack AI-generated images (scripts/ai_assets/out/*.png) into the Phaser
atlases used by src/cloud-world-iso, keeping the existing frame names.

- magenta (#FF00FF) background is chroma-keyed to transparency
- sprites are auto-trimmed and padded onto fixed canvases, bottom-center
  anchored (IsoScene uses setOrigin(0.5, 1) for placements/player)
- signs get real text rendered with PIL onto the AI wooden board
- ground.png is recomposed from the AI tiles with correct alpha pasting
  (fixes the ImageDraw.bitmap white-fill bug in gen_iso_art.py)
- backdrop.png is the AI coastal panorama, backdrop for the scene
"""
import json, os, math
import numpy as np
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'out')
PUB = os.path.join(HERE, '..', '..', 'public', 'assets', 'iso')
PUB = os.path.abspath(PUB)
MAGENTA = (255, 0, 255)


def chroma_key(im):
    im = im.convert('RGB')
    a = im.load()
    w, h = im.size
    out = Image.new('RGBA', (w, h))
    po = out.load()
    px = im.load()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            d = math.sqrt((r - 255) ** 2 + (g - 0) ** 2 + (b - 255) ** 2)
            alpha = max(0, min(255, int(255 * (d - 30) / 70)))
            if alpha > 0 and g > (r + b) / 2:  # despill magenta bleed
                g = int((r + b) / 2)
            po[x, y] = (r, g, b, alpha)
    return out


def cutout(im, key=None):
    """Transparent cutout: magenta chroma-key if the bg is magenta, else rembg
    (rembg runs on a 320px downscale for speed, alpha is upscaled back).
    Results are cached per source name in out/.cut/."""
    im = im.convert('RGB')
    arr = np.array(im).astype(int)
    mag = ((arr[..., 0] > 200) & (arr[..., 1] < 90) & (arr[..., 2] > 200)).mean()
    if mag > 0.25:
        return chroma_key(im)
    if key:
        cdir = os.path.join(OUT, '.cut')
        os.makedirs(cdir, exist_ok=True)
        cp = os.path.join(cdir, key + '.png')
        src = os.path.join(OUT, key + '.png')
        if os.path.exists(cp) and os.path.exists(src) and os.path.getmtime(cp) > os.path.getmtime(src):
            return Image.open(cp).convert('RGBA')
    from rembg import remove
    w, h = im.size
    s = min(1.0, 320.0 / max(w, h))
    small = im.resize((max(1, int(w * s)), max(1, int(h * s))), Image.LANCZOS)
    out = remove(small)
    if s < 1.0:
        out = out.resize((w, h), Image.LANCZOS)
    out = out.convert('RGBA')
    if key:
        out.save(cp)
    return out


def trim(im, margin=4):
    bbox = im.getbbox()
    if not bbox:
        return im
    x0, y0, x1, y1 = bbox
    x0 = max(0, x0 - margin); y0 = max(0, y0 - margin)
    x1 = min(im.width, x1 + margin); y1 = min(im.height, y1 + margin)
    return im.crop((x0, y0, x1, y1))


def pad_bottom_center(im, cw, ch):
    canvas = Image.new('RGBA', (cw, ch), (0, 0, 0, 0))
    if im.width > cw or im.height > ch:
        s = min(cw / im.width, ch / im.height)
        im = im.resize((max(1, int(im.width * s)), max(1, int(im.height * s))), Image.LANCZOS)
    canvas.paste(im, ((cw - im.width) // 2, ch - im.height), im)
    return canvas


def load_src(name):
    p = os.path.join(OUT, name + '.png')
    if not os.path.exists(p):
        print('WARN missing, placeholder:', name)
        im = Image.new('RGB', (256, 256), (255, 0, 255))
        ImageDraw.Draw(im).rectangle((32, 32, 224, 224), fill=(120, 120, 200))
        return im
    return Image.open(p)


FONT_CANDIDATES = [
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    '/System/Library/Fonts/Helvetica.ttc',
    '/System/Library/Fonts/Supplemental/Arial.ttf',
]


def sign_frame(text, cw=128, ch=96):
    board = trim(cutout(load_src('sign_board'), key='sign_board'))
    bw, bh = board.size
    # draw text on the upper plank area
    size = max(10, min(40, bw // max(1, len(text))))
    font = None
    for fp in FONT_CANDIDATES:
        if os.path.exists(fp):
            try:
                font = ImageFont.truetype(fp, size)
                break
            except Exception:
                pass
    if font is None:
        font = ImageFont.load_default()
    d = ImageDraw.Draw(board)
    while size > 8:
        font = ImageFont.truetype(FONT_CANDIDATES[0], size) if os.path.exists(FONT_CANDIDATES[0]) else font
        tb = d.textbbox((0, 0), text, font=font)
        if tb[2] - tb[0] <= bw * 0.8:
            break
        size -= 2
    tb = d.textbbox((0, 0), text, font=font)
    tw, th = tb[2] - tb[0], tb[3] - tb[1]
    tx = (bw - tw) // 2 - tb[0]
    ty = int(bh * 0.18) - tb[1]
    for dx, dy in [(-1, 0), (1, 0), (0, -1), (0, 1)]:
        d.text((tx + dx, ty + dy), text, font=font, fill=(240, 230, 200, 255))
    d.text((tx, ty), text, font=font, fill=(50, 32, 16, 255))
    return pad_bottom_center(board, cw, ch)


class Packer:
    def __init__(self, name):
        self.name = name
        self.frames = []  # (fname, image)

    def add(self, fname, img):
        self.frames.append((fname, img))

    def write(self, max_w=2048):
        # shelf packing, sorted by height desc for tight rows
        items = sorted(self.frames, key=lambda kv: -kv[1].height)
        x = y = row_h = 0
        canvas = None
        positions = []
        for fname, img in items:
            if x + img.width > max_w:
                x = 0; y += row_h; row_h = 0
            positions.append((fname, img, x, y))
            x += img.width
            row_h = max(row_h, img.height)
        total_w = max(p[2] + p[1].width for p in positions)
        total_h = y + row_h
        canvas = Image.new('RGBA', (total_w, total_h), (0, 0, 0, 0))
        frames_json = {}
        for fname, img, x, y in positions:
            canvas.paste(img, (x, y), img)
            frames_json[fname] = {
                'frame': {'x': x, 'y': y, 'w': img.width, 'h': img.height},
                'trimmed': False, 'rotated': False,
                'spriteSourceSize': {'x': 0, 'y': 0, 'w': img.width, 'h': img.height},
                'sourceSize': {'w': img.width, 'h': img.height},
            }
        png = os.path.join(PUB, self.name + '.png')
        js = os.path.join(PUB, self.name + '.json')
        canvas.save(png)
        with open(js, 'w') as f:
            json.dump({'frames': frames_json, 'meta': {'image': self.name + '.png', 'size': {'w': total_w, 'h': total_h}}}, f)
        print(f'{self.name}: {len(frames_json)} frames, {total_w}x{total_h}, {os.path.getsize(png)//1024} KB')


def sprite(name, cw, ch):
    return pad_bottom_center(trim(cutout(load_src(name), key=name)), cw, ch)


PALETTES = {
    'grass_a': (np.array([86, 158, 60]), np.array([126, 190, 82]), np.array([62, 128, 44])),
    'grass_b': (np.array([74, 142, 54]), np.array([108, 172, 70]), np.array([54, 114, 40])),
    'sand':    (np.array([222, 205, 158]), np.array([240, 226, 184]), np.array([198, 178, 132])),
    'path':    (np.array([188, 160, 116]), np.array([214, 190, 146]), np.array([160, 132, 92])),
    'water_a': (np.array([46, 168, 196]), np.array([110, 214, 228]), np.array([30, 132, 168])),
    'water_b': (np.array([28, 118, 158]), np.array([70, 170, 205]), np.array([18, 88, 128])),
    'dock':    (np.array([150, 110, 66]), np.array([182, 140, 88]), np.array([116, 84, 48])),
}


def proc_tile(kind):
    """Deterministic noise tile at 256x128, palette-controlled (AI txt2img could not
    be trusted to fill the whole frame with one flat color)."""
    rng = np.random.default_rng(abs(hash(kind)) % 2**32)
    W, H = 256, 128
    n = np.zeros((H, W))
    for o in range(1, 4):
        sm = rng.random((H // o + 2, W // o + 2))
        im = Image.fromarray((sm * 255).astype('uint8')).resize((W, H), Image.BILINEAR)
        n += np.array(im) / 255.0 / o
    n /= max(n.max(), 1e-6)
    base, hi, lo = PALETTES[kind]
    t = n[..., None]
    img = lo[None, None, :] * (1 - t) + hi[None, None, :] * t
    img = img * 0.75 + base[None, None, :] * 0.25
    im = Image.fromarray(img.clip(0, 255).astype('uint8'), 'RGB')
    d = ImageDraw.Draw(im)
    if kind in ('grass_a', 'grass_b'):
        for _ in range(260):
            x, y = int(rng.integers(0, W)), int(rng.integers(0, H))
            d.point((x, y), fill=tuple(int(v) for v in (hi if rng.random() < 0.5 else lo)))
        for _ in range(10):
            x, y = int(rng.integers(2, W - 2)), int(rng.integers(2, H - 2))
            d.ellipse((x - 1, y - 1, x + 1, y + 1), fill=(245, 245, 235))
    elif kind in ('water_a', 'water_b'):
        for _ in range(40):
            y = int(rng.integers(4, H - 4)); x0 = int(rng.integers(0, W // 2)); ln = int(rng.integers(20, 70))
            d.line((x0, y, x0 + ln, y + int(rng.integers(-2, 3))), fill=tuple(int(v) for v in hi), width=1)
        if kind == 'water_b':
            for _ in range(14):
                x, y = int(rng.integers(2, W - 2)), int(rng.integers(2, H - 2))
                d.ellipse((x - 1, y - 1, x + 1, y + 1), fill=(225, 244, 250))
    elif kind == 'sand':
        for _ in range(120):
            x, y = int(rng.integers(0, W)), int(rng.integers(0, H))
            d.point((x, y), fill=tuple(int(v) for v in (lo if rng.random() < 0.6 else hi)))
    elif kind == 'path':
        for _ in range(90):
            x, y = int(rng.integers(0, W)), int(rng.integers(0, H))
            d.ellipse((x - 1, y - 1, x + 1, y + 1), fill=(120, 104, 76))
    elif kind == 'dock':
        for x in range(-H, W, 24):
            d.line((x, 0, x + H, H), fill=tuple(int(v) for v in lo), width=3)
        for _ in range(60):
            x, y = int(rng.integers(0, W)), int(rng.integers(0, H))
            d.point((x, y), fill=(60, 44, 26))
    return im


def tile(name):
    """Ground tile: procedural texture resized to 64x32 with a smooth diamond alpha
    mask (opaque rect tiles would show staircase seams in the iso grid)."""
    kind = name.replace('tile_', '')
    im = proc_tile(kind).resize((64, 32), Image.LANCZOS)
    S = 4
    mask = Image.new('L', (64 * S, 32 * S), 0)
    ImageDraw.Draw(mask).polygon([(32 * S, 0), (64 * S, 16 * S), (32 * S, 32 * S), (0, 16 * S)], fill=255)
    mask = mask.resize((64, 32), Image.LANCZOS)
    out = im.convert('RGBA')
    out.putalpha(mask)
    return out


def ellipse(w, h, fill):
    im = Image.new('RGBA', (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    d.ellipse((2, 2, w - 2, h - 2), fill=fill)
    return im


def main():
    # ---- shared ----
    sh = Packer('shared')
    for t in ['grass_a', 'grass_b', 'sand', 'path', 'water_a', 'water_b', 'dock']:
        sh.add(t, tile('tile_' + t))
    sh.add('tree', sprite('tree', 112, 152))
    sh.add('tree2', sprite('tree2', 112, 152))
    sh.add('pine', sprite('pine', 96, 160))
    sh.add('rock', sprite('rock', 80, 56))
    sh.add('crate', sprite('crate', 64, 64))
    sh.add('barrel', sprite('barrel', 64, 72))
    sh.add('lamp', sprite('lamp', 48, 144))
    sh.add('buoy', sprite('buoy', 48, 64))
    sh.add('fence', sprite('fence', 96, 56))
    sh.add('beacon', sprite('beacon', 96, 160))
    sh.add('shadow', ellipse(64, 32, (10, 20, 30, 90)))
    sh.add('shadow_big', ellipse(160, 80, (10, 20, 30, 80)))
    sh.write()

    # ---- welcome ----
    we = Packer('welcome')
    we.add('bld_welcome', sprite('bld_welcome', 448, 400))
    we.add('sign_about', sign_frame('ABOUT'))
    we.add('sign_tutorial', sign_frame('HOW TO PLAY'))
    we.add('sign_nav_skills', sign_frame('SKILLS'))
    we.add('sign_nav_projects', sign_frame('VILLAGE'))
    we.write()

    # ---- skills ----
    sk = Packer('skills')
    for f in ['st_aws', 'st_docker', 'st_k8s', 'st_cicd', 'st_prog']:
        sk.add(f, sprite(f, 448, 400))
    sk.add('crane', sprite('crane', 160, 224))
    sk.add('containers2', sprite('containers2', 320, 240))
    for f, t in [('sign_aws', 'AWS'), ('sign_docker', 'DOCKER'), ('sign_k8s', 'K8S'), ('sign_cicd', 'CI/CD'), ('sign_prog', 'CODE')]:
        sk.add(f, sign_frame(t))
    sk.write()

    # ---- projects ----
    pr = Packer('projects')
    for f in ['bld_lab', 'bld_facility', 'bld_hub']:
        pr.add(f, sprite(f, 448, 400))
    for f, t in [('sign_rxverify', 'RxVerify'), ('sign_masterclass', 'DEVOPS'), ('sign_gosvc', 'GO SVC')]:
        pr.add(f, sign_frame(t))
    pr.write()

    # ---- character: idle/walk_a/walk_b x 8 dirs expanded to full frame set ----
    ch = Packer('character')
    for d in range(8):
        idle = sprite('idle_dir%d' % d, 64, 80)
        wa = sprite('walk_a_dir%d' % d, 64, 80)
        wb = sprite('walk_b_dir%d' % d, 64, 80)
        ch.add('idle_0_dir%d' % d, idle)
        ch.add('idle_1_dir%d' % d, idle)
        for i in range(6):
            ch.add('walk_%d_dir%d' % (i, d), wa if i % 2 == 0 else wb)
        for i in range(3):
            ch.add('board_%d_dir%d' % (i, d), wa)
        ch.add('steer_0_dir%d' % d, idle)
        ch.add('steer_1_dir%d' % d, idle)
        ch.add('interact_0_dir%d' % d, idle)
        ch.add('interact_1_dir%d' % d, idle)
    ch.write()

    # ---- boat: 4 headings x 4 frames ----
    bo = Packer('boat')
    for h in range(4):
        f0 = sprite('boat_h%d_f0' % h, 288, 224)
        f1 = sprite('boat_h%d_f1' % h, 288, 224)
        bo.add('h%d_f0' % h, f0)
        bo.add('h%d_f1' % h, f1)
        bo.add('h%d_f2' % h, f0)
        bo.add('h%d_f3' % h, f1)
    bo.write()

    # ---- ground from AI tiles (correct alpha paste) + deep-water margin ring ----
    with open(os.path.join(PUB, 'map.json')) as f:
        m = json.load(f)
    W, H = m['w'], m['h']
    M = 4  # margin ring of open sea around the map
    ox = H * 32
    # paste position of map cell (x, y), shifted so no negative pixels
    def cellpos(x, y):
        return (ox + (x - y) * 32 + (H + 2 * M - 1) * 32 - ox + 16, (x + y) * 16 + 2 * M * 16 + 16)
    DX = (H + 2 * M - 1) * 32 - ox + 16
    DY = 2 * M * 16 + 16
    gw = (W + H + 2 * M) * 32 + 64
    gh = (W + H + 2 * M) * 16 + 64
    ground = Image.new('RGBA', (gw, gh), (0, 0, 0, 0))
    fx = Image.new('RGBA', (gw, gh), (0, 0, 0, 0))
    fdr = ImageDraw.Draw(fx)
    shared = Image.open(os.path.join(PUB, 'shared.png')).convert('RGBA')
    sframes = json.load(open(os.path.join(PUB, 'shared.json')))['frames']
    def tileimg(name):
        f = sframes[name]['frame']
        return shared.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
    tiles = {n: tileimg(n).resize((66, 34), Image.LANCZOS) for n in ['grass_a', 'grass_b', 'sand', 'path', 'water_a', 'water_b', 'dock']}  # 2px overlap hides diamond seams
    from math import sin as _sin
    for y in range(-M, H + M):
        for x in range(-M, W + M):
            sx, sy = cellpos(x, y)
            if x < 0 or y < 0 or x >= W or y >= H:
                t = tiles['water_b']  # open sea margin
                c = 0
            else:
                c = m['cells'][y * W + x]
            if c == 0:
                t = tiles['water_a'] if (x * 5 + y * 3) % 3 else tiles['water_b']
            elif c == 2:
                t = tiles['dock']
            elif c == 3:
                t = tiles['water_b']
            else:
                cx = 30 + 7 * _sin(y * 0.05) + 3 * _sin(y * 0.13 + 1.7)
                hw = 4.5 + 1.0 * _sin(y * 0.07 + 0.5)
                if abs(x + 0.5 - cx) < hw + 2.2:
                    t = tiles['sand']
                else:
                    t = tiles['grass_a'] if (x * 7 + y * 13) % 5 else tiles['grass_b']
            ground.paste(t, (int(sx) - 1, int(sy) - 1), t)  # correct alpha paste (bitmap() filled white); -1 aligns the 66x34 overlap
            if c == 0 and (x * 31 + y * 17) % 7 == 0:
                fdr.ellipse([sx + 18, sy + 12, sx + 40, sy + 20], fill=(230, 244, 250, 150))
    ground.save(os.path.join(PUB, 'ground.png'))
    fx.save(os.path.join(PUB, 'waterfx.png'))
    # sprite anchor: image pixel P(0,0) = (ox+DX, DY) must render at screen (ox, 0) => position (-DX, -DY)
    with open(os.path.join(PUB, 'ground.json'), 'w') as f:
        json.dump({'x': -DX, 'y': -DY, 'w': gw, 'h': gh}, f)
    print(f'ground: {gw}x{gh} @({-DX},{-DY}), {os.path.getsize(os.path.join(PUB,"ground.png"))//1024} KB')

    # ---- backdrop ----
    bd = load_src('backdrop').convert('RGB')
    bd.save(os.path.join(PUB, 'backdrop.png'))
    print(f'backdrop: {bd.size}, {os.path.getsize(os.path.join(PUB,"backdrop.png"))//1024} KB')


if __name__ == '__main__':
    main()
