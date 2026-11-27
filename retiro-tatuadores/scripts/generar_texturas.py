"""Genera todas las texturas fotográficas del documental (solo código, sin IA).

Salida: public/tex/*.png  ·  Determinista (semillas fijas).
Uso:    python3 scripts/generar_texturas.py
"""
import os
import numpy as np
from PIL import Image, ImageDraw

OUT = os.path.join(os.path.dirname(__file__), "..", "public", "tex")
os.makedirs(OUT, exist_ok=True)


def save(arr, name, mode=None):
    img = Image.fromarray(arr, mode) if mode else Image.fromarray(arr)
    img.save(os.path.join(OUT, name), optimize=True)
    print("  ·", name, img.size)


def noise2(w, h, cx, cy, rng):
    """Value noise suave: rejilla aleatoria cx*cy interpolada bicúbicamente."""
    g = rng.random((max(cy, 2), max(cx, 2))).astype(np.float32)
    img = Image.fromarray(g, "F").resize((w, h), Image.BICUBIC)
    return np.asarray(img)


def fbm(w, h, base_x, base_y, octaves, rng, pers=0.5):
    acc = np.zeros((h, w), np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        f = 2 ** o
        acc += amp * noise2(w, h, int(base_x * f) + 1, int(base_y * f) + 1, rng)
        tot += amp
        amp *= pers
    return acc / tot


def fbm1d(n, base, octaves, rng, pers=0.55):
    x = np.zeros(n, np.float32)
    amp, tot = 1.0, 0.0
    for o in range(octaves):
        k = int(base * 2 ** o) + 2
        pts = rng.random(k).astype(np.float32)
        xs = np.linspace(0, k - 1, n)
        i = np.floor(xs).astype(int).clip(0, k - 2)
        t = xs - i
        t = t * t * (3 - 2 * t)
        x += amp * (pts[i] * (1 - t) + pts[i + 1] * t)
        tot += amp
        amp *= pers
    return x / tot


def gblur(a, sigma):
    """Desenfoque gaussiano separable en numpy (float32)."""
    r = max(1, int(sigma * 3))
    k = np.exp(-(np.arange(-r, r + 1) ** 2) / (2 * sigma * sigma)).astype(np.float32)
    k /= k.sum()
    a = np.apply_along_axis(lambda m: np.convolve(m, k, mode="same"), 0, a)
    a = np.apply_along_axis(lambda m: np.convolve(m, k, mode="same"), 1, a)
    return a.astype(np.float32)


def to8(a):
    return (np.clip(a, 0, 1) * 255).astype(np.uint8)


def rgba(rgb, alpha):
    h, w = alpha.shape
    out = np.zeros((h, w, 4), np.uint8)
    out[..., :3] = to8(rgb)
    out[..., 3] = to8(alpha)
    return out


def color_field(base, var, n):
    base = np.array(base, np.float32) / 255
    return base[None, None, :] * (1 + var * (n[..., None] - 0.5))


# --------------------------------------------------------------------------
# GRANO DE PELÍCULA (6 fotogramas, se reescala x2 → grano grueso de 16 mm)
# --------------------------------------------------------------------------
def grain():
    rng = np.random.default_rng(7)
    for i in range(6):
        n = rng.normal(0, 1, (960, 540)).astype(np.float32)
        n = gblur(n, 0.6)
        n = n / (np.abs(n).max() + 1e-6) * 2.2
        a = np.clip(np.abs(n), 0, 1) ** 1.4
        rgb = np.where(n[..., None] > 0, 1.0, 0.0) * np.ones(3)[None, None, :]
        save(rgba(rgb, a * 0.55), f"grain_{i}.png")


# --------------------------------------------------------------------------
# NIEBLA (bancos anchos y alargados)
# --------------------------------------------------------------------------
def fog():
    for idx, (seed, w, h) in enumerate([(11, 2600, 1100), (12, 2600, 1100)]):
        rng = np.random.default_rng(seed)
        n = fbm(w, h, 3, 2, 6, rng, 0.55)
        n2 = fbm(w, h, 9, 3, 4, rng, 0.5)
        d = np.clip((n * 0.75 + n2 * 0.25 - 0.42) * 2.6, 0, 1) ** 1.6
        y = np.linspace(0, 1, h)[:, None]
        band = np.exp(-((y - 0.5) ** 2) / 0.06)
        a = d * band
        rgb = np.ones((h, w, 3)) * np.array([0.78, 0.82, 0.86])
        save(rgba(rgb, a * 0.9), f"fog_{idx}.png")


# --------------------------------------------------------------------------
# PIRINEOS AL ANOCHECER (capas para parallax)
# --------------------------------------------------------------------------
W, H = 1300, 2300


def sky():
    rng = np.random.default_rng(21)
    y = np.linspace(0, 1, H)[:, None, None]
    top = np.array([0.035, 0.05, 0.07])
    hor = np.array([0.30, 0.35, 0.40])
    g = top * (1 - y) ** 1.2 + hor * y ** 1.8
    c = fbm(W, H, 3, 6, 6, rng)
    clouds = np.clip((c - 0.45) * 2.5, 0, 1)[..., None]
    g = g * (1 - 0.35 * clouds) + clouds * 0.10 * (1 - y)
    out = np.zeros((H, W, 3), np.uint8)
    out[:] = to8(np.broadcast_to(g, (H, W, 3)))
    save(out, "sky.png")


def ridge(name, seed, base_y, amp, col, snow, fog_amt, ridged, pines=0, pine_h=(14, 30), pine_depth=0.3):
    rng = np.random.default_rng(seed)
    prof = fbm1d(W, 2.2, 7, rng)
    if ridged:
        prof = 1 - np.abs(prof * 2 - 1)
        prof = prof ** 1.6
    top = (base_y - amp * prof) * H
    yy = np.arange(H)[:, None]
    mask = (yy >= top[None, :]).astype(np.float32)
    n = fbm(W, H, 40, 30, 5, rng)
    # relieve: derivada horizontal de un ruido anisótropo → canales y crestas iluminadas
    rel = fbm(W, H, 16, 11, 6, rng, 0.58)
    dx = np.gradient(rel, axis=1) * W / 16 + np.gradient(rel, axis=0) * H / 22
    light = np.clip(0.75 + dx * (1.4 if ridged else 0.5), 0.25, 1.5)
    depth = np.clip((yy - top[None, :]) / (H * 0.25), 0, 1)
    rgb = color_field(col, 0.5, n) * light[..., None]
    if snow > 0:
        alt = 1 - depth
        s = np.clip((rel * 0.8 + n * 0.4 - 0.78 + alt ** 2 * 0.55) * 3.5, 0, 1) * alt ** 1.5 * snow
        s *= np.clip(light - 0.45, 0, 1)
        rgb = rgb * (1 - s[..., None]) + np.array([0.56, 0.61, 0.67]) * light[..., None] * s[..., None]
    f = np.clip(depth * fog_amt * 1.6, 0, fog_amt)[..., None]
    rgb = rgb * (1 - f) + np.array([0.20, 0.24, 0.28]) * f
    img = Image.fromarray(rgba(rgb, mask))
    if pines:
        ss = 2
        big = img.resize((W * ss, H * ss), Image.BICUBIC)
        d = ImageDraw.Draw(big)
        items = []
        for _ in range(pines):
            x = rng.uniform(-10, W + 10)
            xi = int(np.clip(x, 0, W - 1))
            dep = rng.uniform(0, 1) ** 1.3 * H * pine_depth
            yb = top[xi] + 2 + dep
            items.append((yb, x, dep))
        items.sort()
        for yb, x, dep in items:
            k = 1 + dep / (H * 0.12)
            ph = rng.uniform(*pine_h) * k
            pw = ph * rng.uniform(0.22, 0.32)
            shade = rng.uniform(0.6, 1.15) * (1 - 0.35 * min(1, dep / (H * pine_depth)))
            cc = tuple(int(np.clip(c * 0.75 * shade, 0, 255)) for c in col) + (255,)
            for tier in range(5):
                t0 = tier / 5
                yt = yb - ph * (1 - t0 * 0.8)
                ww = pw * (0.35 + t0 * 0.65) * rng.uniform(0.8, 1.2)
                jx = rng.uniform(-0.04, 0.04) * ph
                d.polygon([((x + jx) * ss, (yt - ph * 0.25) * ss), ((x - ww) * ss, (yt + ph * 0.2) * ss), ((x + ww) * ss, (yt + ph * 0.2) * ss)], fill=cc)
        img = big.resize((W, H), Image.LANCZOS)
    img.save(os.path.join(OUT, name), optimize=True)
    print("  ·", name, img.size)
    return top


def mountains():
    sky()
    ridge("ridge_far.png", 31, 0.40, 0.22, (62, 72, 82), 1.0, 0.5, True)
    ridge("ridge_mid.png", 32, 0.53, 0.12, (30, 38, 42), 0.25, 0.45, False, pines=5000, pine_h=(5, 10), pine_depth=0.25)
    ridge("ridge_near.png", 33, 0.67, 0.07, (18, 24, 26), 0.0, 0.2, False, pines=9000, pine_h=(14, 26), pine_depth=0.33)


# --------------------------------------------------------------------------
# MADERA, PIEDRA, YESO, PIEL
# --------------------------------------------------------------------------
def planks(name, w, h, n_planks, base, horizontal=False, seed=41, weather=1.0):
    rng = np.random.default_rng(seed)
    if horizontal:
        w, h = h, w
    out = np.zeros((h, w, 3), np.float32)
    pw = w / n_planks
    for p in range(n_planks):
        x0, x1 = int(p * pw), int((p + 1) * pw)
        ww = x1 - x0
        g = fbm(ww, h, 2, 60, 5, rng, 0.6)          # vetas largas
        g2 = fbm(ww, h, 30, 300, 2, rng)            # fibra fina
        knots = np.zeros((h, ww), np.float32)
        for _ in range(rng.integers(0, 3)):
            ky, kx = rng.uniform(0, h), rng.uniform(0, ww)
            yy, xx = np.mgrid[0:h, 0:ww]
            r = np.sqrt(((yy - ky) / 3.5) ** 2 + (xx - kx) ** 2)
            knots += np.exp(-r / 7) * 0.9
        tone = rng.uniform(0.75, 1.2)
        v = (0.6 + 0.5 * g + 0.25 * g2 - knots * 0.6) * tone
        col = np.array(base, np.float32) / 255
        plank = col[None, None, :] * v[..., None]
        # sombra en las juntas
        xs = np.linspace(0, 1, ww)
        edge = np.clip(np.minimum(xs, 1 - xs) * ww / 6, 0, 1) ** 0.6
        plank *= (0.25 + 0.75 * edge)[None, :, None]
        out[:, x0:x1] = plank
    dirt = fbm(w, h, 5, 8, 5, rng)
    out *= (1 - weather * 0.5 * np.clip(dirt - 0.4, 0, 1) * 2)[..., None]
    arr = to8(out)
    if horizontal:
        arr = np.ascontiguousarray(np.rot90(arr))
    save(arr, name)


def stone():
    rng = np.random.default_rng(51)
    w, h = 1024, 512
    out = np.zeros((h, w, 3), np.float32) + 0.05
    img = Image.new("RGB", (w, h), (12, 13, 14))
    d = ImageDraw.Draw(img)
    y = 0
    while y < h:
        rh = rng.integers(40, 80)
        x = -rng.integers(0, 60)
        while x < w:
            rw = rng.integers(60, 150)
            c = int(rng.uniform(55, 95))
            d.rounded_rectangle([x + 3, y + 3, x + rw - 3, y + rh - 3], radius=14, fill=(c, c + 2, c + 4))
            x += rw
        y += rh
    base = np.asarray(img, np.float32) / 255
    n = fbm(w, h, 30, 15, 5, rng)
    moss = np.clip((fbm(w, h, 6, 3, 4, rng) - 0.55) * 4, 0, 1)
    base = base * (0.6 + 0.8 * n[..., None])
    base = base * (1 - moss[..., None] * 0.5) + np.array([0.12, 0.16, 0.08]) * moss[..., None] * 0.5
    save(to8(base), "stone.png")


def plaster():
    rng = np.random.default_rng(61)
    w, h = 1200, 1200
    n = fbm(w, h, 8, 8, 6, rng, 0.6)
    stain = np.clip((fbm(w, h, 2, 3, 4, rng) - 0.5) * 3, 0, 1)
    v = 0.78 + 0.18 * n - stain * 0.18
    rgb = np.array([0.80, 0.82, 0.80])[None, None, :] * v[..., None]
    save(to8(rgb), "plaster.png")


def skin():
    rng = np.random.default_rng(71)
    w, h = 1400, 1400
    n = fbm(w, h, 60, 60, 4, rng)       # poros
    m = fbm(w, h, 4, 4, 4, rng)         # manchas/vello
    pores = (rng.random((h, w)) > 0.9965).astype(np.float32)
    pores = gblur(pores, 1.2)
    pores = pores / (pores.max() + 1e-6)
    base = np.array([0.80, 0.60, 0.50])
    rgb = base[None, None, :] * (0.88 + 0.16 * n[..., None] + 0.1 * (m[..., None] - 0.5))
    rgb[..., 0] += (m - 0.5) * 0.06
    rgb *= (1 - pores[..., None] * 0.5)
    save(to8(rgb), "skin.png")


def ink():
    """Tinta negra recién hecha: casi negro, con brillo de vaselina irregular."""
    rng = np.random.default_rng(81)
    w, h = 1400, 1400
    n = fbm(w, h, 50, 50, 4, rng)
    sheen = np.clip((fbm(w, h, 3, 7, 5, rng) - 0.5) * 3.2, 0, 1) ** 2
    v = 0.035 + 0.03 * n + 0.22 * sheen
    rgb = np.stack([v * 0.95, v * 0.98, v * 1.05], -1)
    save(to8(rgb), "ink.png")


def cloth():
    """Lana de hábito: marrón sucio con trama."""
    rng = np.random.default_rng(91)
    w, h = 800, 800
    n = fbm(w, h, 200, 200, 2, rng)
    weave = (np.sin(np.arange(w)[None, :] * 1.3) * np.sin(np.arange(h)[:, None] * 1.3)) * 0.5 + 0.5
    m = fbm(w, h, 4, 4, 4, rng)
    v = 0.75 + 0.2 * n + 0.08 * weave + 0.3 * (m - 0.5)
    rgb = np.array([0.22, 0.16, 0.11])[None, None, :] * v[..., None]
    save(to8(rgb), "cloth.png")


import sys

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "montes":
        mountains(); sys.exit(0)
    print("Generando texturas en", os.path.abspath(OUT))
    grain()
    fog()
    mountains()
    planks("wood_wall.png", 1200, 1200, 9, (70, 50, 36), seed=41, weather=1.2)
    planks("wood_table.png", 1600, 1000, 4, (96, 64, 40), horizontal=True, seed=42, weather=0.6)
    stone()
    plaster()
    skin()
    ink()
    cloth()
    print("OK")
