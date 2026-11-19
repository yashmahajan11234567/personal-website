#!/usr/bin/env python3
"""
Deterministic illustrated-asset generator for the isometric Cloud World.

No diffusion backend is available in this environment (no ComfyUI, no
authorized Figma/Weave), so per the audit pipeline's documented fallback this
script renders original artwork procedurally at 4x supersampling and
downsamples with LANCZOS for anti-aliased illustrated edges. One command
regenerates every asset; see ASSET_GENERATION_CATALOG.md for the manifest.

Output: public/assets/iso/{shared,welcome,skills,projects,character,boat}.{png,json}
Atlas JSON is Phaser's array format.
"""
import json, math, os, random
from PIL import Image, ImageDraw, ImageFilter

OUT = os.path.join(os.path.dirname(__file__), '..', 'public', 'assets', 'iso')
os.makedirs(OUT, exist_ok=True)
SS = 4  # supersample factor

# palette (shared across all assets — the consistency contract)
PAL = {
    'grass_a': (110, 168, 82), 'grass_b': (96, 156, 74), 'sand': (222, 205, 158),
    'path': (205, 186, 140), 'water_a': (64, 132, 178), 'water_b': (54, 118, 168),
    'water_foam': (214, 236, 244), 'dock': (150, 116, 74), 'dock_dark': (120, 90, 56),
    'wood': (139, 105, 66), 'wood_dark': (104, 78, 48), 'roof_red': (178, 84, 62),
    'roof_blue': (70, 110, 160), 'wall_cream': (240, 233, 216), 'wall_brick': (186, 120, 92),
    'wall_white': (238, 242, 244), 'glass': (168, 208, 224), 'door': (90, 62, 40),
    'container_blue': (32, 102, 190), 'container_blue2': (46, 132, 214), 'docker_blue': (29, 99, 216),
    'white': (250, 250, 250), 'dark': (43, 52, 64), 'metal': (150, 160, 170),
    'metal_dark': (105, 114, 126), 'teal': (64, 178, 172), 'orange': (240, 148, 60),
    'green_dark': (62, 122, 62), 'trunk': (110, 80, 52), 'leaf': (86, 148, 74), 'leaf_dark': (66, 122, 60),
    'skin': (232, 180, 140), 'jacket': (63, 110, 180), 'jacket_dark': (47, 84, 140),
    'pants': (52, 66, 92), 'shoe': (40, 36, 34), 'hair': (58, 44, 34), 'accent': (242, 193, 78),
    'whale_blue': (36, 110, 200), 'whale_dark': (26, 84, 158), 'whale_belly': (238, 244, 250),
    'shadow': (20, 30, 40),
}

def hx(name): return PAL[name]

def canvas(w, h):
    img = Image.new('RGBA', (w * SS, h * SS), (0, 0, 0, 0))
    return img, ImageDraw.Draw(img)

def finish(img, w, h):
    return img.resize((w, h), Image.LANCZOS)

def shade(rgb, f):
    return tuple(max(0, min(255, int(c * f))) for c in rgb)

def iso_top(cx, cy, w, d):
    """Top rhombus of a w x d metre box whose base centre is (cx, cy) screen px (at 1x)."""
    hw, hd = w * 32 / 2, d * 32 / 2
    hh = (w + d) * 16 / 2
    return [(cx, cy - hh), (cx + hw, cy), (cx, cy + hh), (cx - hw, cy)]

def draw_box(dr, cx, cy, w, d, h, c_top, c_right, c_left, outline=None):
    """Iso box: base centre (cx,cy) at ground, size w x d metres, height h metres.
    Right face = +x side (lit), left face = +y side (shaded)."""
    top = [(p[0], p[1] - h * 32) for p in iso_top(cx, cy, w, d)]
    hw = w * 32 / 2
    hh = (w + d) * 16 / 2
    right_face = [(cx + hw, cy - h * 32), (cx, cy + hh - h * 32), (cx, cy + hh), (cx + hw, cy)]
    left_face = [(cx - hw, cy - h * 32), (cx, cy + hh - h * 32), (cx, cy + hh), (cx - hw, cy)]
    dr.polygon(left_face, fill=shade(c_left, 1.0))
    dr.polygon(right_face, fill=shade(c_right, 1.0))
    dr.polygon(top, fill=c_top)
    if outline:
        for poly in (left_face, right_face, top):
            dr.line(poly + [poly[0]], fill=outline, width=max(1, SS))
    return top, right_face, left_face

def face_uv_right(face_pts, u, v, w, h):
    """Point on the right (+x) face: u in [0,w] along +y edge, v in [0,h] up. Screen at 1x."""
    x0, y0 = face_pts[0]  # top-right corner (cx+hw, cy-h*32)
    x1, y1 = face_pts[1]  # top-front (cx, cy+hh-h*32)
    x2, y2 = face_pts[2]
    x3, y3 = face_pts[3]
    a = u / w
    top_x = x0 + (x1 - x0) * a
    top_y = y0 + (y1 - y0) * a
    bot_x = x3 + (x2 - x3) * a
    bot_y = y3 + (y2 - y3) * a
    b = v / h
    return (top_x + (bot_x - top_x) * b, top_y + (bot_y - top_y) * b)

def face_uv_left(face_pts, u, v, w, h):
    x0, y0 = face_pts[0]  # top-left (cx-hw, cy-h*32)
    x1, y1 = face_pts[1]  # top-front
    x2, y2 = face_pts[2]
    x3, y3 = face_pts[3]
    a = u / w
    top_x = x0 + (x1 - x0) * a
    top_y = y0 + (y1 - y0) * a
    bot_x = x3 + (x2 - x3) * a
    bot_y = y3 + (y2 - y3) * a
    b = v / h
    return (top_x + (bot_x - top_x) * b, top_y + (bot_y - top_y) * b)

def window_on_face(dr, face, u, v, ww, wh, w, h, color, frame=None):
    """Draw a parallelogram window on a face. u,v = centre in metres, ww,wh size in metres."""
    pts = []
    for (du, dv) in [(-ww/2, -wh/2), (ww/2, -wh/2), (ww/2, wh/2), (-ww/2, wh/2)]:
        pts.append(face(u + du, v + dv, w, h))
    dr.polygon(pts, fill=color, outline=frame)

class Atlas:
    def __init__(self, name, cols=16, cell=(256, 256)):
        self.name = name
        self.frames = {}
        self.cell = cell
        self.cols = cols
        self.items = []  # (key, img)
    def add(self, key, img):
        self.items.append((key, img))
        return key
    def save(self):
        n = len(self.items)
        rows = math.ceil(n / self.cols)
        cw, ch = self.cell
        sheet = Image.new('RGBA', (self.cols * cw, rows * ch), (0, 0, 0, 0))
        frames = {}
        for i, (key, img) in enumerate(self.items):
            cx = (i % self.cols) * cw
            cy = (i // self.cols) * ch
            # bottom-centre anchor: paste so that img bottom-centre sits at cell centre-bottom
            px = cx + (cw - img.width) // 2
            py = cy + ch - img.height - 4
            sheet.paste(img, (px, py), img)
            frames[key] = {'frame': {'x': px, 'y': py, 'w': img.width, 'h': img.height},
                           'trimmed': False, 'rotated': False,
                           'spriteSourceSize': {'x': 0, 'y': 0, 'w': img.width, 'h': img.height},
                           'sourceSize': {'w': img.width, 'h': img.height}}
        sheet.save(os.path.join(OUT, self.name + '.png'))
        with open(os.path.join(OUT, self.name + '.json'), 'w') as f:
            json.dump({'frames': frames, 'meta': {'image': self.name + '.png', 'size': {'w': sheet.width, 'h': sheet.height}}}, f)
        kb = os.path.getsize(os.path.join(OUT, self.name + '.png')) / 1024
        print(f'{self.name}: {n} frames, sheet {sheet.width}x{sheet.height}, {kb:.0f} KB')
        return sheet

# ---------------------------------------------------------------- tiles
def tile_grass(seed, base):
    rnd = random.Random(seed)
    img, dr = canvas(64, 32)
    hw, hh = 32, 16
    pts = [(32*SS, 0), (64*SS, 16*SS), (32*SS, 32*SS), (0, 16*SS)]
    dr.polygon(pts, fill=base)
    for _ in range(90):
        x = rnd.uniform(2, 62) * SS
        y = rnd.uniform(2, 30) * SS
        c = shade(base, rnd.uniform(0.9, 1.12))
        dr.point((x, y), fill=c)
        if rnd.random() < 0.3:
            dr.line([(x, y), (x + rnd.uniform(-2, 2) * SS, y - rnd.uniform(1, 3) * SS)], fill=shade(base, 0.85), width=SS)
    return finish(img, 64, 32)

def tile_water(seed, base, foam):
    rnd = random.Random(seed)
    img, dr = canvas(64, 32)
    pts = [(32*SS, 0), (64*SS, 16*SS), (32*SS, 32*SS), (0, 16*SS)]
    dr.polygon(pts, fill=base)
    for _ in range(7):
        y = rnd.uniform(4, 28) * SS
        x0 = rnd.uniform(2, 30) * SS
        ln = rnd.uniform(10, 24) * SS
        dr.line([(x0, y), (x0 + ln, y - ln * 0.5)], fill=foam, width=SS)
    return finish(img, 64, 32)

def tile_flat(base):
    img, dr = canvas(64, 32)
    dr.polygon([(32*SS, 0), (64*SS, 16*SS), (32*SS, 32*SS), (0, 16*SS)], fill=base)
    return finish(img, 64, 32)

def tile_dock():
    img, dr = canvas(64, 32)
    dr.polygon([(32*SS, 0), (64*SS, 16*SS), (32*SS, 32*SS), (0, 16*SS)], fill=hx('dock'))
    # plank lines along one axis
    for i in range(1, 4):
        t = i / 4
        x0 = 32*SS + (0 - 32*SS) * t
        dr.line([(x0, 16*SS * t), (64*SS - (64*SS - 32*SS) * t, 16*SS + 16*SS * t)], fill=hx('dock_dark'), width=SS)
    dr.line([(32*SS, 0), (64*SS, 16*SS), (32*SS, 32*SS), (0, 16*SS), (32*SS, 0)], fill=hx('dock_dark'), width=SS)
    return finish(img, 64, 32)

# ---------------------------------------------------------------- props
def prop_tree(seed=1):
    rnd = random.Random(seed)
    w, h = 96, 132
    img, dr = canvas(w, h)
    cx = w / 2
    # trunk
    dr.polygon([(cx-6*SS, h*SS), (cx+6*SS, h*SS), (cx+3*SS, (h-52)*SS), (cx-3*SS, (h-52)*SS)], fill=hx('trunk'))
    # foliage: layered blobs
    for i, (fy, fr, c) in enumerate([(h-58, 34, hx('leaf_dark')), (h-78, 30, hx('leaf')), (h-98, 22, (126, 178, 96))]):
        for a in range(8):
            ang = a / 8 * math.tau
            ox, oy = math.cos(ang) * fr * 0.45 * SS, math.sin(ang) * fr * 0.3 * SS
            dr.ellipse([cx + ox - fr*SS, (fy + oy) * SS - fr*0.8*SS, cx + ox + fr*SS, (fy + oy) * SS + fr*0.8*SS], fill=c)
        dr.ellipse([cx - fr*SS, fy*SS - fr*0.9*SS, cx + fr*SS, fy*SS + fr*0.9*SS], fill=c)
    # highlight
    dr.ellipse([cx - 14*SS, (h-96)*SS, cx + 8*SS, (h-70)*SS], fill=(140, 196, 108))
    return finish(img, w, h)

def prop_pine():
    w, h = 80, 140
    img, dr = canvas(w, h)
    cx = w / 2
    dr.polygon([(cx-5*SS, h*SS), (cx+5*SS, h*SS), (cx+2*SS, (h-30)*SS), (cx-2*SS, (h-30)*SS)], fill=hx('trunk'))
    for i, fr in enumerate([40, 32, 24, 16]):
        y0 = (h - 34 - i * 26)
        dr.polygon([(cx - fr*SS, y0*SS), (cx + fr*SS, y0*SS), (cx, (y0 - 34)*SS)], fill=shade(hx('green_dark'), 1 + i * 0.06))
    return finish(img, w, h)

def prop_rock():
    w, h = 56, 40
    img, dr = canvas(w, h)
    dr.polygon([(6*SS, 34*SS), (16*SS, 12*SS), (40*SS, 8*SS), (52*SS, 26*SS), (44*SS, 36*SS), (14*SS, 37*SS)], fill=hx('metal'))
    dr.polygon([(16*SS, 12*SS), (40*SS, 8*SS), (30*SS, 22*SS)], fill=shade(hx('metal'), 1.2))
    return finish(img, w, h)

def prop_crate():
    w = h = 48
    img, dr = canvas(w, h)
    cx, cy = w/2, h - 4
    draw_box(dr, cx*SS, cy*SS, 1, 1, 1, shade(hx('wood'), 1.15), hx('wood'), shade(hx('wood'), 0.85), outline=hx('wood_dark'))
    return finish(img, w, h)

def prop_barrel():
    w, h = 40, 52
    img, dr = canvas(w, h)
    cx = w/2
    dr.ellipse([cx-14*SS, 6*SS, cx+14*SS, h*SS-6*SS], fill=hx('metal_dark'))
    dr.ellipse([cx-14*SS, 6*SS, cx+14*SS, 22*SS], fill=hx('metal'))
    for yy in (18, 32, 46):
        dr.arc([cx-14*SS, yy*SS-6*SS, cx+14*SS, yy*SS+6*SS], 0, 180, fill=hx('dark'), width=SS)
    return finish(img, w, h)

def prop_lamp():
    w, h = 36, 110
    img, dr = canvas(w, h)
    cx = w/2
    dr.rectangle([cx-3*SS, 20*SS, cx+3*SS, h*SS], fill=hx('dark'))
    dr.ellipse([cx-8*SS, 2*SS, cx+8*SS, 20*SS], fill=hx('accent'))
    dr.ellipse([cx-11*SS, 12*SS, cx+11*SS, 30*SS], fill=(255, 236, 170, 90))
    dr.ellipse([cx-4*SS, h*SS-4*SS, cx+4*SS, h*SS+2*SS], fill=hx('dark'))
    return finish(img, w, h)

def prop_buoy():
    w, h = 36, 48
    img, dr = canvas(w, h)
    cx = w/2
    dr.polygon([(cx-10*SS, h*SS), (cx+10*SS, h*SS), (cx+6*SS, 14*SS), (cx-6*SS, 14*SS)], fill=(214, 84, 60))
    dr.rectangle([cx-7*SS, 10*SS, cx+7*SS, 18*SS], fill=hx('white'))
    dr.rectangle([cx-2*SS, 0, cx+2*SS, 12*SS], fill=hx('dark'))
    return finish(img, w, h)

def prop_fence():
    w, h = 64, 40
    img, dr = canvas(w, h)
    for x in (6, 30, 54):
        dr.rectangle([x*SS-3*SS, 8*SS, x*SS+3*SS, h*SS], fill=hx('wood_dark'))
    dr.polygon([(0, 14*SS), (w*SS, 14*SS), (w*SS, 20*SS), (0, 20*SS)], fill=hx('wood'))
    dr.polygon([(0, 26*SS), (w*SS, 26*SS), (w*SS, 31*SS), (0, 31*SS)], fill=hx('wood'))
    return finish(img, w, h)

def prop_sign_blank():
    """Wooden sign board with two posts; text is drawn by caller per sign."""
    w, h = 96, 76
    img, dr = canvas(w, h)
    for x in (22, 70):
        dr.rectangle([x*SS-4*SS, 26*SS, x*SS+4*SS, h*SS], fill=hx('wood_dark'))
    dr.rounded_rectangle([4*SS, 4*SS, (w-4)*SS, 44*SS], radius=6*SS, fill=hx('wood'), outline=hx('wood_dark'), width=SS)
    return img, dr, w, h

def make_sign(lines, accent=hx('accent')):
    img, dr, w, h = prop_sign_blank()
    from PIL import ImageFont
    try:
        font = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 22 * SS)
        small = ImageFont.truetype('/System/Library/Fonts/Helvetica.ttc', 15 * SS)
    except Exception:
        font = small = ImageFont.load_default()
    y = 8 * SS
    for i, ln in enumerate(lines):
        f = font if i == 0 else small
        bb = dr.textbbox((0, 0), ln, font=f)
        tw = bb[2] - bb[0]
        dr.text(((w*SS - tw) / 2, y), ln, font=f, fill=hx('dark') if i == 0 else shade(hx('dark'), 1.1))
        y += (26 if i == 0 else 18) * SS
    dr.rectangle([8*SS, (h-8)*SS, (w-8)*SS, (h-5)*SS], fill=accent)
    return finish(img, w, h)

def prop_beacon():
    w, h = 64, 120
    img, dr = canvas(w, h)
    cx = w/2
    dr.polygon([(cx-12*SS, h*SS), (cx+12*SS, h*SS), (cx+7*SS, 30*SS), (cx-7*SS, 30*SS)], fill=(226, 226, 220))
    for y0 in (h-18, h-48, h-78):
        dr.polygon([(cx-11*SS, y0*SS), (cx+11*SS, y0*SS), (cx+8*SS, (y0-22)*SS), (cx-8*SS, (y0-22)*SS)], fill=(214, 84, 60))
    dr.rectangle([cx-9*SS, 12*SS, cx+9*SS, 32*SS], fill=hx('dark'))
    dr.ellipse([cx-7*SS, 2*SS, cx+7*SS, 16*SS], fill=hx('accent'))
    return finish(img, w, h)

def shadow(w=64, h=32, alpha=70):
    img = Image.new('RGBA', (w*SS, h*SS), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    dr.ellipse([2*SS, 2*SS, (w-2)*SS, (h-2)*SS], fill=hx('shadow') + (alpha,))
    return finish(img.filter(ImageFilter.GaussianBlur(2*SS)), w, h)

# ---------------------------------------------------------------- buildings
def building(w, d, h, wall, roof, roof_style='gable', windows=True, door=True, emblem=None, trim=None):
    """Draw an iso building. Returns PIL image sized to footprint+height, anchor bottom-centre.
    w,d in metres (footprint), h in metres (wall height)."""
    sw = int((w + d) * 32) + 8
    sh = int((w + d) * 16 + h * 32) + 8
    img, dr = canvas(sw, sh)
    cx = sw / 2
    cy = sh - 6  # base centre (bottom of the front corner)
    top, right, left = draw_box(dr, cx*SS, cy*SS, w, d, h, shade(wall, 1.12), shade(wall, 0.98), shade(wall, 0.82), outline=shade(wall, 0.6))
    # roof
    rh = max(1.2, h * 0.45)
    if roof_style == 'gable':
        ridge_h = rh * 32
        hw = w * 16
        # two sloped roof planes meeting at a ridge along the x axis
        p_r = [(cx + hw*SS + 4*SS, cy*SS - h*32*SS/SS*0 - (h*32)*SS), ]
        # simpler: pyramid-ish hip roof
        apex = (cx*SS, (cy - h*32 - rh*32)*SS)
        dr.polygon([(top[0][0]*SS, top[0][1]*SS), (top[1][0]*SS, top[1][1]*SS), apex], fill=shade(roof, 1.05))
        dr.polygon([(top[1][0]*SS, top[1][1]*SS), (top[2][0]*SS, top[2][1]*SS), apex], fill=shade(roof, 0.95))
        dr.polygon([(top[2][0]*SS, top[2][1]*SS), (top[3][0]*SS, top[3][1]*SS), apex], fill=shade(roof, 0.8))
        dr.polygon([(top[3][0]*SS, top[3][1]*SS), (top[0][0]*SS, top[0][1]*SS), apex], fill=shade(roof, 0.88))
    elif roof_style == 'flat':
        dr.rectangle([cx*SS - 4*SS, (cy - h*32 - 6)*SS, cx*SS + 4*SS, (cy - h*32 + 6)*SS], fill=shade(roof, 0.9))
    elif roof_style == 'sawtooth':
        n = max(2, int(w))
        for i in range(n):
            x0 = top[3][0] + (top[0][0] - top[3][0]) * i / n
            x1 = top[3][0] + (top[0][0] - top[3][0]) * (i + 1) / n
            dr.polygon([(x0*SS, top[3][1]*SS), (x1*SS, top[3][1]*SS), (x1*SS, (top[3][1] - 14)*SS)], fill=shade(roof, 0.95 + 0.05 * (i % 2)))
    # windows on right face
    if windows:
        cols = max(1, int(w))
        rows = max(1, int(h / 1.6))
        for r in range(rows):
            for c in range(cols):
                u = (c + 0.5) / cols * d
                v = h * 0.35 + r * (h * 0.5 / rows)
                window_on_face(dr, lambda a, b, W, H: face_uv_right(right, a, b, W, H), u, v, 0.5, 0.7, d, h, hx('glass'), frame=shade(wall, 0.55))
    if door:
        window_on_face(dr, lambda a, b, W, H: face_uv_right(right, a, b, W, H), d * 0.5, h * 0.22, 0.7, 1.1, d, h, hx('door'), frame=hx('wood_dark'))
    if emblem:
        ex, ey = face_uv_right(right, d * 0.5, h * 0.75, d, h)
        dr.ellipse([ex-10*SS, ey-10*SS, ex+10*SS, ey+10*SS], fill=emblem)
    return finish(img, sw, sh)

def container_stack(n=3, seed=0):
    w, d, h = 6, 3, 1.0 * n
    sw = int((w + d) * 32) + 8
    sh = int((w + d) * 16 + h * 32) + 8
    img, dr = canvas(sw, sh)
    cx, cy = sw / 2, sh - 6
    cols = [hx('container_blue'), hx('container_blue2'), (214, 84, 60), (240, 148, 60)]
    rnd = random.Random(seed)
    for i in range(n):
        c = cols[i % len(cols)]
        top, right, left = draw_box(dr, cx*SS, (cy - i * 32)*SS, w, d, 1, shade(c, 1.15), c, shade(c, 0.78), outline=shade(c, 0.55))
        # ribs
        for k in range(1, 6):
            u = k / 6 * w
            p0 = face_uv_right(right, u, 0, w, 1)
            p1 = face_uv_right(right, u, 1, w, 1)
            dr.line([p0[0]*SS, p0[1]*SS, p1[0]*SS, p1[1]*SS], fill=shade(c, 0.6), width=SS)
    return finish(img, sw, sh)

def crane():
    w, h = 110, 150
    img, dr = canvas(w, h)
    cx = w/2
    dr.rectangle([cx-16*SS, 60*SS, cx+16*SS, h*SS], fill=hx('orange'))
    dr.rectangle([cx-20*SS, h*SS-8*SS, cx+20*SS, h*SS], fill=hx('metal_dark'))
    dr.line([(cx*SS, 62*SS), (cx*SS, 8*SS)], fill=hx('orange'), width=8*SS)
    dr.line([(cx*SS, 10*SS), (cx+44*SS, 34*SS)], fill=hx('orange'), width=6*SS)
    dr.line([(cx*SS, 10*SS), (cx-30*SS, 30*SS)], fill=hx('metal_dark'), width=3*SS)
    dr.line([(cx+44*SS, 34*SS), (cx+44*SS, 74*SS)], fill=hx('dark'), width=2*SS)
    dr.rectangle([cx+36*SS, 74*SS, cx+52*SS, 86*SS], fill=hx('container_blue'))
    return finish(img, w, h)

# ---------------------------------------------------------------- character
# 8 dirs x states. Sheet frame 64x72. Row order matches DIR8: S,SW,W,NW,N,NE,E,SE.
# A simple readable adventurer: hair, face, jacket, pants, shoes, arms.
CW, CH = 64, 72

def _char_frame(dx, dy, phase, state):
    """Draw one character frame at 1x logical size. phase = walk cycle 0..1, state in idle/walk/board/steer/interact."""
    img, dr = canvas(CW, CH)
    cx = CW / 2
    base_y = CH - 8
    # facing: screen-space flip for west dirs; north dirs show back (no face)
    west = dx < 0
    north = dy < -0.2 and abs(dy) > abs(dx) * 0.9
    south = dy > 0.2
    if west:
        pass  # we draw symmetric and flip image at the end
    leg_spread = 7 * math.sin(phase * math.tau) if state == 'walk' else (2 if state == 'idle' else 0)
    lift = 2 * abs(math.sin(phase * math.tau)) if state == 'walk' else 0
    # shoes + legs
    for s in (-1, 1):
        lx = cx + s * (3 + abs(leg_spread) * 0.4)
        ly = base_y - (lift if (s > 0) == (math.sin(phase * math.tau) > 0) else 0)
        dr.line([(lx, ly - 12*SS), (lx + s * leg_spread * 0.5, ly)], fill=hx('pants'), width=6*SS)
        dr.ellipse([lx + s * leg_spread * 0.5 - 5*SS, ly - 4*SS, lx + s * leg_spread * 0.5 + 5*SS, ly + 2*SS], fill=hx('shoe'))
    # torso (jacket)
    bob = -1 if state == 'walk' else 0
    dr.rounded_rectangle([cx - 9*SS, (base_y - 34 + bob)*SS, cx + 9*SS, (base_y - 12)*SS], radius=5*SS, fill=hx('jacket'), outline=hx('jacket_dark'), width=SS)
    dr.line([(cx*SS, (base_y - 30 + bob)*SS), (cx*SS, (base_y - 14)*SS)], fill=hx('jacket_dark'), width=SS)
    # arms
    arm_sw = 5 * math.sin(phase * math.tau) if state == 'walk' else 1
    for s in (-1, 1):
        if state == 'steer':
            dr.line([(cx + s*8*SS, (base_y - 28)*SS), (cx + s*14*SS, (base_y - 24)*SS)], fill=hx('jacket_dark'), width=5*SS)
        elif state == 'board' or state == 'interact':
            dr.line([(cx + s*8*SS, (base_y - 28)*SS), (cx + s*15*SS, (base_y - 34)*SS)], fill=hx('jacket_dark'), width=5*SS)
        else:
            dr.line([(cx + s*9*SS, (base_y - 29)*SS), (cx + s*11*SS, (base_y - 16 + arm_sw)*SS)], fill=hx('jacket_dark'), width=5*SS)
        dr.ellipse([cx + s*11*SS - 3*SS, (base_y - 16 + (arm_sw if state=='walk' else 0))*SS, cx + s*11*SS + 3*SS, (base_y - 16 + (arm_sw if state=='walk' else 0))*SS + 6*SS], fill=hx('skin'))
    # head
    hy = base_y - 44 + bob
    dr.ellipse([cx - 8*SS, hy*SS, cx + 8*SS, (hy + 15)*SS], fill=hx('skin'))
    if not north:
        # hair cap
        dr.pieslice([cx - 8*SS, (hy - 5)*SS, cx + 8*SS, (hy + 11)*SS], 180, 360, fill=hx('hair'))
        dr.rectangle([cx - 8*SS, (hy + 1)*SS, cx + 8*SS, (hy + 5)*SS], fill=hx('hair'))
        # eyes
        ex = 3.5 if not west else -3.5
        dr.ellipse([cx + ex*SS - 2*SS, (hy + 6)*SS, cx + ex*SS + 2*SS, (hy + 10)*SS], fill=hx('dark'))
        dr.ellipse([cx - ex*SS - 2*SS, (hy + 6)*SS, cx - ex*SS + 2*SS, (hy + 10)*SS], fill=hx('dark'))
    else:
        dr.pieslice([cx - 8*SS, (hy - 5)*SS, cx + 8*SS, (hy + 11)*SS], 0, 360, fill=hx('hair'))
    img = finish(img, CW, CH)
    if west:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)
    return img

def gen_character():
    dirs = [(0,1), (-1,1), (-1,0), (-1,-1), (0,-1), (1,-1), (1,0), (1,1)]
    states = [('idle', 2), ('walk', 6), ('board', 3), ('steer', 2), ('interact', 2)]
    cols = sum(n for _, n in states)
    rows = 8
    sheet = Image.new('RGBA', (cols * CW, rows * CH), (0, 0, 0, 0))
    frames = {}
    col = 0
    for sname, n in states:
        for f in range(n):
            phase = f / n
            for r, (dx, dy) in enumerate(dirs):
                img = _char_frame(dx, dy, phase if sname == 'walk' else 0.25, sname)
                sheet.paste(img, (col * CW, r * CH), img)
                frames[f'{sname}_{f}_dir{r}'] = {'frame': {'x': col * CW, 'y': r * CH, 'w': CW, 'h': CH},
                    'trimmed': False, 'rotated': False,
                    'spriteSourceSize': {'x': 0, 'y': 0, 'w': CW, 'h': CH}, 'sourceSize': {'w': CW, 'h': CH}}
            col += 1
    sheet.save(os.path.join(OUT, 'character.png'))
    with open(os.path.join(OUT, 'character.json'), 'w') as f:
        json.dump({'frames': frames, 'meta': {'image': 'character.png'}}, f)
    print(f'character: {len(frames)} frames, {sheet.width}x{sheet.height}, {os.path.getsize(os.path.join(OUT,"character.png"))/1024:.0f} KB')

# ---------------------------------------------------------------- boat
BW, BH = 240, 170

def _boat_frame(heading, phase):
    """heading in {0=E,1=NE,2=N,3=W}; whale cargo boat seen in iso-ish top-down.
    phase = bob 0..1."""
    img, dr = canvas(BW, BH)
    cx, cy = BW/2, BH/2 + 6 * math.sin(phase * math.tau) * SS * 0.4
    squash = {0: 1.0, 1: 0.72, 2: 0.45, 3: 0.72}[heading]
    L = 100 * SS  # half length
    Wd = 34 * SS * squash
    def ell(x0, y0, x1, y1):
        dr.ellipse([x0, y0, x1, y1], fill=None)
    # body (whale): ellipse tapered to tail at -x for heading 0
    dr.ellipse([cx - L, cy - Wd, cx + L*0.8, cy + Wd], fill=hx('whale_blue'))
    # belly
    dr.ellipse([cx - L*0.9, cy + Wd*0.25, cx + L*0.7, cy + Wd], fill=hx('whale_belly'))
    # tail flukes
    dr.polygon([(cx - L, cy), (cx - L - 26*SS, cy - 22*SS*squash - 6*SS), (cx - L - 12*SS, cy), (cx - L - 26*SS, cy + 22*SS*squash + 6*SS)], fill=hx('whale_dark'))
    # dorsal fin
    dr.polygon([(cx - 6*SS, cy - Wd*0.8), (cx + 14*SS, cy - Wd*0.8), (cx + 4*SS, cy - Wd*1.7)], fill=hx('whale_dark'))
    # pectoral fin
    dr.polygon([(cx + 20*SS, cy + Wd*0.4), (cx + 44*SS, cy + Wd*1.5), (cx + 26*SS, cy + Wd*0.7)], fill=hx('whale_dark'))
    # eye
    dr.ellipse([cx + L*0.55, cy - Wd*0.45, cx + L*0.55 + 5*SS, cy - Wd*0.45 + 5*SS], fill=hx('dark'))
    # containers stacked on deck (3)
    for i, c in enumerate([hx('container_blue'), hx('container_blue2'), (214, 84, 60)]):
        bx = cx - 40*SS + i * 30*SS
        bw = 26*SS
        bh = 14*SS * squash + 6*SS
        dr.rounded_rectangle([bx, cy - Wd*0.7 - bh + 6*SS, bx + bw, cy - Wd*0.7 + 6*SS], radius=3*SS, fill=c, outline=shade(c, 0.6), width=SS)
        for k in range(1, 4):
            dr.line([(bx + k/4*bw, cy - Wd*0.7 - bh + 6*SS), (bx + k/4*bw, cy - Wd*0.7 + 6*SS)], fill=shade(c, 0.7), width=SS)
    # wheelhouse at bow
    wx = cx + L*0.45
    dr.rounded_rectangle([wx, cy - Wd*0.9 - 12*SS, wx + 24*SS, cy - Wd*0.9 + 4*SS], radius=3*SS, fill=hx('white'), outline=hx('metal_dark'), width=SS)
    dr.rounded_rectangle([wx + 3*SS, cy - Wd*0.9 - 9*SS, wx + 12*SS, cy - Wd*0.9 - 1*SS], radius=2*SS, fill=hx('glass'))
    # wake
    if phase > 0.5:
        dr.ellipse([cx - L - 30*SS, cy - 10*SS*squash, cx - L + 10*SS, cy + 10*SS*squash], fill=(255, 255, 255, 110))
    img = finish(img, BW, BH)
    if heading in (1, 2, 3):
        # rotate the top-down sprite for other headings (visual variety)
        ang = {1: -45, 2: -90, 3: 180}[heading]
        img = img.rotate(ang, resample=Image.BICUBIC, expand=True)
    return img

def gen_boat():
    cols = 4  # bob0, bob1, wake, wake2
    sheet = Image.new('RGBA', (cols * BW, 4 * BH), (0, 0, 0, 0))
    frames = {}
    for r, heading in enumerate(range(4)):
        for c in range(cols):
            phase = c / cols
            img = _boat_frame(heading, phase)
            # paste centred in cell
            px = c * BW + (BW - img.width) // 2
            py = r * BH + (BH - img.height) // 2
            sheet.paste(img, (px, py), img)
            frames[f'h{heading}_f{c}'] = {'frame': {'x': px, 'y': py, 'w': img.width, 'h': img.height},
                'trimmed': False, 'rotated': False,
                'spriteSourceSize': {'x': 0, 'y': 0, 'w': img.width, 'h': img.height}, 'sourceSize': {'w': img.width, 'h': img.height}}
    sheet.save(os.path.join(OUT, 'boat.png'))
    with open(os.path.join(OUT, 'boat.json'), 'w') as f:
        json.dump({'frames': frames, 'meta': {'image': 'boat.png'}}, f)
    print(f'boat: {len(frames)} frames, {sheet.width}x{sheet.height}, {os.path.getsize(os.path.join(OUT,"boat.png"))/1024:.0f} KB')

# ---------------------------------------------------------------- main
def main():
    rnd = random.Random(42)
    shared = Atlas('shared', cols=8, cell=(160, 160))
    shared.add('grass_a', tile_grass(1, hx('grass_a')))
    shared.add('grass_b', tile_grass(2, hx('grass_b')))
    shared.add('sand', tile_flat(hx('sand')))
    shared.add('path', tile_flat(hx('path')))
    shared.add('water_a', tile_water(3, hx('water_a'), hx('water_foam')))
    shared.add('water_b', tile_water(4, hx('water_b'), hx('water_foam')))
    shared.add('dock', tile_dock())
    shared.add('tree', prop_tree(1))
    shared.add('tree2', prop_tree(7))
    shared.add('pine', prop_pine())
    shared.add('rock', prop_rock())
    shared.add('crate', prop_crate())
    shared.add('barrel', prop_barrel())
    shared.add('lamp', prop_lamp())
    shared.add('buoy', prop_buoy())
    shared.add('fence', prop_fence())
    shared.add('beacon', prop_beacon())
    shared.add('shadow', shadow(64, 32))
    shared.add('shadow_big', shadow(160, 80, 60))
    shared.save()

    welcome = Atlas('welcome', cols=4, cell=(420, 420))
    welcome.add('bld_welcome', building(7, 6, 5.5, hx('wall_cream'), hx('roof_blue'), 'gable', emblem=hx('accent')))
    welcome.add('sign_about', make_sign(['ABOUT ME', 'press E']))
    welcome.add('sign_tutorial', make_sign(['RIVER EXPEDITION', 'WASD sail the river', 'E interact']))
    welcome.add('sign_nav_skills', make_sign(['TECHNOLOGY DOCK', 'upriver >']))
    welcome.add('sign_nav_projects', make_sign(['RIVERSIDE VILLAGE', 'projects ^']))
    welcome.save()

    skills = Atlas('skills', cols=4, cell=(460, 460))
    skills.add('st_aws', building(8, 6, 5, hx('wall_white'), hx('metal_dark'), 'flat', emblem=(255, 153, 0)))
    skills.add('st_docker', container_stack(3, 1))
    skills.add('st_k8s', building(7, 6, 4.5, hx('wall_white'), (50, 80, 160), 'flat', emblem=(50, 110, 200)))
    skills.add('st_cicd', building(8, 6, 4.5, hx('wall_brick'), hx('metal_dark'), 'sawtooth', emblem=hx('orange')))
    skills.add('st_prog', building(7, 6, 5, (60, 70, 90), hx('dark'), 'flat', emblem=(120, 220, 120)))
    skills.add('sign_aws', make_sign(['AWS & CLOUD']))
    skills.add('sign_docker', make_sign(['DOCKER', '& CONTAINERS']))
    skills.add('sign_k8s', make_sign(['KUBERNETES']))
    skills.add('sign_cicd', make_sign(['CI/CD', 'AUTOMATION']))
    skills.add('sign_prog', make_sign(['PROGRAMMING', '& DATA']))
    skills.add('crane', crane())
    skills.add('containers2', container_stack(2, 5))
    skills.save()

    projects = Atlas('projects', cols=4, cell=(480, 480))
    projects.add('bld_lab', building(7, 6, 6.5, hx('wall_white'), hx('teal'), 'flat', emblem=(220, 60, 70)))
    projects.add('bld_facility', building(9, 6, 5, hx('wall_brick'), hx('metal_dark'), 'sawtooth', emblem=hx('docker_blue')))
    projects.add('bld_hub', building(11, 7, 4, (70, 80, 100), (90, 140, 200), 'flat', emblem=(120, 200, 255)))
    projects.add('sign_rxverify', make_sign(['RxVerify', 'Verification Lab']))
    projects.add('sign_masterclass', make_sign(['DevOps', 'Masterclass']))
    projects.add('sign_gosvc', make_sign(['Go', 'Microservices']))
    projects.save()

    gen_character()
    gen_boat()
    gen_ground()
    print('ALL ASSETS GENERATED ->', os.path.abspath(OUT))


# ---------------------------------------------------------------- ground
def gen_ground():
    """Render the whole iso ground plane to ground.png + animated foam layer waterfx.png."""
    with open(os.path.join(OUT, 'map.json')) as f:
        m = json.load(f)
    W, H = m['w'], m['h']
    ox, oy = H * 32, 0
    gw, gh = (W + H) * 32, (W + H) * 16 + 64
    ground = Image.new('RGBA', (gw * SS, gh * SS), (0, 0, 0, 0))
    gdr = ImageDraw.Draw(ground)
    fx = Image.new('RGBA', (gw * SS, gh * SS), (0, 0, 0, 0))
    fdr = ImageDraw.Draw(fx)
    # load tile images
    shared = Image.open(os.path.join(OUT, 'shared.png')).convert('RGBA')
    sframes = json.load(open(os.path.join(OUT, 'shared.json')))['frames']
    def tile(name):
        f = sframes[name]['frame']
        return shared.crop((f['x'], f['y'], f['x'] + f['w'], f['y'] + f['h']))
    tiles = {n: tile(n) for n in ['grass_a', 'grass_b', 'sand', 'path', 'water_a', 'water_b', 'dock']}
    rnd = random.Random(99)
    CELL = {0: 'water', 1: 'land', 2: 'dock', 3: 'blocked'}
    for y in range(H):
        for x in range(W):
            c = m['cells'][y * W + x]
            sx = (ox + (x - y) * 32) * SS
            sy = (oy + (x + y) * 16) * SS
            if c == 0:
                t = tiles['water_a']
            elif c == 2:
                t = tiles['dock']
            else:
                # sand ring near channel
                from math import sin as _sin
                cx = 30 + 7 * _sin(y * 0.05) + 3 * _sin(y * 0.13 + 1.7)
                hw = 4.5 + 1.0 * _sin(y * 0.07 + 0.5)
                if abs(x + 0.5 - cx) < hw + 2.2:
                    t = tiles['sand']
                else:
                    t = tiles['grass_a'] if (x * 7 + y * 13) % 5 else tiles['grass_b']
            gdr.bitmap((int(sx), int(sy)), t.resize((64 * SS, 32 * SS), Image.NEAREST))
            if c == 0:
                # foam flecks (animated layer alternates)
                if (x * 31 + y * 17) % 7 == 0:
                    fdr.ellipse([sx + 18 * SS, sy + 12 * SS, sx + 40 * SS, sy + 20 * SS], fill=(230, 244, 250, 160))
    ground = ground.resize((gw, gh), Image.LANCZOS)
    fx = fx.resize((gw, gh), Image.LANCZOS)
    ground.save(os.path.join(OUT, 'ground.png'))
    fx.save(os.path.join(OUT, 'waterfx.png'))
    print(f'ground: {gw}x{gh}, {os.path.getsize(os.path.join(OUT,"ground.png"))/1024:.0f} KB; waterfx {os.path.getsize(os.path.join(OUT,"waterfx.png"))/1024:.0f} KB')

if __name__ == '__main__':
    main()
