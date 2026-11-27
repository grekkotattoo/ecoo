"""Constructor paramétrico de rigs 2D — estilo CARTOON ADULTO PREMIUM (v2).

Técnicas de acabado profesional, todo vectorial y animable por piezas:
- Línea de grosor variable: contorno fino en el lado iluminado y engrosado en el lado de sombra;
  líneas interiores como pinceladas afiladas (brush) que se estrechan en las puntas.
- Iluminación de 3 niveles: degradado base (luz arriba-izquierda), sombra cel y sombra núcleo,
  luz de borde (rim light) de color y brillos especulares.
- Cara detallada: ojos con iris degradado, pupila, doble brillo, párpados y pestañas; rubor,
  nariz con volumen, boca con interior, dientes y lengua (visemas A–H, X).
- Manos de 4 dedos, zapatos con suela, pliegues de ropa, pelo con mechones y reflejos.
Esqueleto estándar compatible con engine/src/rig/actions.ts. Determinista por `seed`.
"""
from __future__ import annotations

import hashlib
import math
import random

W, H = 500, 900
ANCHOR = (250, 880)

EXPRESSION_PRESETS = {
    "neutral":   {"eyes": "open",   "brows": "neutral",   "mouth": "X"},
    "happy":     {"eyes": "happy",  "brows": "raised",    "mouth": "smile"},
    "angry":     {"eyes": "angry",  "brows": "angry",     "mouth": "frown"},
    "sad":       {"eyes": "sad",    "brows": "sad",       "mouth": "frown"},
    "surprised": {"eyes": "wide",   "brows": "raised",    "mouth": "E"},
    "scared":    {"eyes": "wide",   "brows": "sad",       "mouth": "scream"},
    "smug":      {"eyes": "half",   "brows": "skeptical", "mouth": "smirk"},
    "crazy":     {"eyes": "crazy",  "brows": "raised",    "mouth": "grin"},
    "tired":     {"eyes": "half",   "brows": "sad",       "mouth": "X"},
    "disgusted": {"eyes": "angry",  "brows": "skeptical", "mouth": "G"},
}
VISEMES = ["A", "B", "C", "D", "E", "F", "G", "H", "X"]


# ------------------------------------------------------------------ color

def _rgb(h: str) -> tuple[int, int, int]:
    h = h.lstrip("#")
    return int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16)


def _hex(r, g, b) -> str:
    return "#%02x%02x%02x" % tuple(max(0, min(255, int(round(v)))) for v in (r, g, b))


def _shade(hex_color: str, k: float) -> str:
    """k<1 oscurece, k>1 aclara (hacia blanco)."""
    r, g, b = _rgb(hex_color)
    if k < 1:
        return _hex(r * k, g * k, b * k)
    t = k - 1
    return _hex(r + (255 - r) * t, g + (255 - g) * t, b + (255 - b) * t)


def mix(a: str, b: str, t: float) -> str:
    ra, ga, ba = _rgb(a)
    rb, gb, bb = _rgb(b)
    return _hex(ra + (rb - ra) * t, ga + (gb - ga) * t, ba + (bb - ba) * t)


def shadow_of(c: str, skin: bool = False) -> str:
    """Sombra de color (no gris). Piel: cálida/rojiza (dispersión subsuperficial). Resto: violeta frío."""
    if skin:
        return mix(_shade(c, 0.74), "#a0302a", 0.22)
    return mix(_shade(c, 0.70), "#3b2a6b", 0.22)


def core_of(c: str, skin: bool = False) -> str:
    if skin:
        return mix(_shade(c, 0.55), "#6b1f1f", 0.30)
    return mix(_shade(c, 0.52), "#2a1d4f", 0.30)


def light_of(c: str) -> str:
    return mix(_shade(c, 1.18), "#fff1c9", 0.18)


RIM = "#ffe9b8"


# ------------------------------------------------------------------ pluma

class Pen:
    """Geometría y acabado. `uid` hace únicos los ids de degradados/recortes de cada rig/escenario."""

    def __init__(self, seed: int, jitter: float, ink: str, width: float, uid: str = "p"):
        self.rng = random.Random(seed)
        self.j = jitter
        self.ink = ink
        self.w = width
        self.uid = uid
        self.n = 0

    def nid(self, kind: str) -> str:
        self.n += 1
        return f"{self.uid}{kind}{self.n}"

    def jit(self, v: float, amt: float = 1.0) -> float:
        return v + (self.rng.random() - 0.5) * 2 * self.j * amt

    @staticmethod
    def smooth(pts: list[tuple[float, float]], closed: bool = True) -> str:
        n = len(pts)
        if n < 3:
            return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts)
        d = f"M{pts[0][0]:.1f},{pts[0][1]:.1f}"
        rng = range(n) if closed else range(n - 1)
        for i in rng:
            p0 = pts[(i - 1) % n] if closed or i > 0 else pts[0]
            p1 = pts[i]
            p2 = pts[(i + 1) % n]
            p3 = pts[(i + 2) % n] if closed or i + 2 < n else pts[-1]
            c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
            c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
            d += f" C{c1[0]:.1f},{c1[1]:.1f} {c2[0]:.1f},{c2[1]:.1f} {p2[0]:.1f},{p2[1]:.1f}"
        return d + (" Z" if closed else "")

    def blob(self, cx, cy, rx, ry, n=14, square=0.0, top_squash=1.0, bottom_bulge=1.0) -> list:
        pts = []
        for i in range(n):
            a = (i / n) * math.tau - math.pi / 2
            c, s = math.cos(a), math.sin(a)
            if square > 0:
                e = 2 / (2 + square * 6)
                c = math.copysign(abs(c) ** e, c)
                s = math.copysign(abs(s) ** e, s)
            ky = top_squash if s < 0 else bottom_bulge
            pts.append((self.jit(cx + c * rx, 0.5), self.jit(cy + s * ry * ky, 0.5)))
        return pts

    def limb(self, x1, y1, x2, y2, w1, w2, bulge=1.06) -> list:
        ang = math.atan2(y2 - y1, x2 - x1)
        nx, ny = -math.sin(ang), math.cos(ang)
        ux, uy = math.cos(ang), math.sin(ang)
        mx, my = (x1 + x2) / 2, (y1 + y2) / 2
        wm = (w1 + w2) / 2 * bulge
        pts = [(x1 + nx * w1 / 2, y1 + ny * w1 / 2), (mx + nx * wm / 2, my + ny * wm / 2), (x2 + nx * w2 / 2, y2 + ny * w2 / 2),
               (x2 + ux * w2 * 0.45, y2 + uy * w2 * 0.45),
               (x2 - nx * w2 / 2, y2 - ny * w2 / 2), (mx - nx * wm / 2, my - ny * wm / 2), (x1 - nx * w1 / 2, y1 - ny * w1 / 2),
               (x1 - ux * w1 * 0.45, y1 - uy * w1 * 0.45)]
        return [(self.jit(x, 0.3), self.jit(y, 0.3)) for x, y in pts]

    @staticmethod
    def bbox(pts):
        xs = [p[0] for p in pts]
        ys = [p[1] for p in pts]
        return min(xs), min(ys), max(xs), max(ys)

    def shape(self, pts, fill, shadow=True, sw=None, closed=True, rim=True, weight=True, gloss=False, flat=False) -> str:
        """Forma con acabado pictórico: degradado de luz, sombra de forma DIFUMINADA, oclusión en el borde,
        luz de rebote, luz de borde suave, brillo especular opcional y línea fina del color de la forma."""
        d = self.smooth(pts, closed) if len(pts) > 5 else ("M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + (" Z" if closed else ""))
        sw = self.w if sw is None else sw
        skin = getattr(self, "skin", None) == fill
        line_c = mix(core_of(fill, skin), self.ink, 0.45)
        if not shadow or flat:
            stroke = f' stroke="{line_c}" stroke-width="{sw * 0.55:.1f}" stroke-linejoin="round" stroke-linecap="round"' if sw else ""
            return f'<path d="{d}" fill="{fill}"{stroke}/>'
        x0, y0, x1, y1 = self.bbox(pts)
        w, h = max(1, x1 - x0), max(1, y1 - y0)
        m = max(w, h)
        g, c, r, fb = self.nid("g"), self.nid("c"), self.nid("r"), self.nid("f")
        blur = max(2.5, min(w, h) * 0.09)
        out = (f'<defs><linearGradient id="{g}" x1="0.15" y1="0" x2="0.85" y2="1">'
               f'<stop offset="0" stop-color="{light_of(fill)}"/><stop offset="0.5" stop-color="{fill}"/><stop offset="1" stop-color="{_shade(fill, 0.9)}"/></linearGradient>'
               f'<linearGradient id="{r}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{RIM}" stop-opacity="0.8"/>'
               f'<stop offset="0.3" stop-color="{RIM}" stop-opacity="0"/></linearGradient>'
               f'<filter id="{fb}" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="{blur:.1f}"/></filter>'
               f'<clipPath id="{c}"><path d="{d}"/></clipPath></defs>')
        out += f'<path d="{d}" fill="url(#{g})"/>'
        soft = min(w, h) >= 34  # en formas pequeñas el desenfoque no se aprecia: se omite (rendimiento)
        filt = f' filter="url(#{fb})"' if soft else ""
        out += (f'<g clip-path="url(#{c})"><g{filt}>'
                f'<path d="{d}" fill="none" stroke="{shadow_of(fill, skin)}" stroke-width="{m * (0.30 if soft else 0.18):.1f}" opacity="0.85" transform="translate({w * 0.11:.1f} {h * 0.09:.1f})"/>'
                f'<path d="{d}" fill="none" stroke="{core_of(fill, skin)}" stroke-width="{m * 0.07:.1f}" opacity="0.55" transform="translate({w * 0.04:.1f} {h * 0.035:.1f})"/>'
                f'<path d="{d}" fill="none" stroke="{light_of(fill)}" stroke-width="{m * 0.12:.1f}" opacity="0.5" transform="translate({-w * 0.08:.1f} {-h * 0.07:.1f})"/></g>')
        if gloss:
            sg = self.nid("sp")
            out += (f'<defs><radialGradient id="{sg}"><stop offset="0" stop-color="#ffffff" stop-opacity="0.75"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>'
                    f'<ellipse cx="{x0 + w * 0.33:.1f}" cy="{y0 + h * 0.25:.1f}" rx="{w * 0.2:.1f}" ry="{h * 0.12:.1f}" fill="url(#{sg})"/>')
        if rim:
            out += f'<path d="{d}" fill="none" stroke="url(#{r})" stroke-width="{max(3, sw * 0.9):.1f}"/>'
        out += "</g>"
        out += f'<path d="{d}" fill="none" stroke="{line_c}" stroke-width="{sw * 0.5:.1f}" stroke-linejoin="round" stroke-linecap="round"/>'
        if weight:
            k = self.nid("k")
            cx, cy = x0 + w / 2, y0 + h / 2
            out += (f'<defs><clipPath id="{k}"><path d="M{cx - w:.0f},{cy + h * 1.6:.0f} L{cx + w * 1.6:.0f},{cy - h:.0f} L{cx + w * 2:.0f},{cy + h * 2:.0f} Z"/></clipPath></defs>'
                    f'<path d="{d}" fill="none" stroke="{line_c}" stroke-width="{sw * 0.95:.1f}" stroke-linejoin="round" clip-path="url(#{k})"/>')
        return out

    def brush(self, pts, w=None, color=None, taper=(0.15, 0.15), opacity=1.0) -> str:
        """Pincelada afilada (grosor variable) a lo largo de una polilínea suave."""
        w = self.w if w is None else w
        pts = [(self.jit(x, 0.35), self.jit(y, 0.35)) for x, y in pts]
        # densifica con Catmull-Rom
        dense = []
        n = len(pts)
        for i in range(n - 1):
            p0, p1, p2, p3 = pts[max(0, i - 1)], pts[i], pts[i + 1], pts[min(n - 1, i + 2)]
            for t in [k / 6 for k in range(6)]:
                t2, t3 = t * t, t * t * t
                dense.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 +
                                          (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
        dense.append(pts[-1])
        m = len(dense)
        left, right = [], []
        for i, (x, y) in enumerate(dense):
            a = dense[max(0, i - 1)]
            b = dense[min(m - 1, i + 1)]
            ang = math.atan2(b[1] - a[1], b[0] - a[0])
            u = i / max(1, m - 1)
            k = min(1.0, u / taper[0] if taper[0] else 1, (1 - u) / taper[1] if taper[1] else 1)
            hw = max(0.4, w / 2 * (0.25 + 0.75 * math.sin(min(1.0, k) * math.pi / 2)))
            nx, ny = -math.sin(ang) * hw, math.cos(ang) * hw
            left.append((x + nx, y + ny))
            right.append((x - nx, y - ny))
        poly = left + right[::-1]
        dpath = "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in poly) + " Z"
        op = f' opacity="{opacity}"' if opacity < 1 else ""
        return f'<path d="{dpath}" fill="{color or self.ink}"{op}/>'

    def line(self, pts, sw=None, color=None) -> str:
        return self.brush(pts, (sw or self.w) * 1.1, color, (0.25, 0.25))


def _uid(char_id: str, seed) -> str:
    return "r" + hashlib.sha1(f"{char_id}:{seed}".encode()).hexdigest()[:6]


# ------------------------------------------------------------------ personaje

def build_rig(char_id: str, name: str, p: dict, style: dict, version: int = 1) -> dict:
    """Despacha al constructor de la biblia visual activa (urban = v4 por defecto; premium = v3)."""
    if style.get("builder") == "urban":
        from .rigs_urban import build_rig as urban
        return urban(char_id, name, p, style, version)
    return _build_premium(char_id, name, p, style, version)


def _build_premium(char_id: str, name: str, p: dict, style: dict, version: int = 1) -> dict:
    ink = style["outline"]["color"]
    lw = style["outline"]["width"]
    pen = Pen(p.get("seed", 7), style["outline"].get("jitter", 1.0), ink, lw, _uid(char_id, p.get("seed", 7)))
    h, hs, wf = p["height"], p["head_scale"], p["width"]
    cx = W / 2
    footY = ANCHOR[1]
    legL = 185 * h
    hipY = footY - legL
    torsoH = 205 * h
    shY = hipY - torsoH
    R = 96 * hs
    headCy = shY - R * 0.80
    bw = {"pear": 1.0, "round": 1.25, "tall": 0.85, "stocky": 1.2, "blob": 1.35, "skinny": 0.72}[p["body"]] * wf
    tw = 82 * bw
    skin, top, bottom, accent, hairc = p["skin"], p["top_color"], p["bottom_color"], p["accent_color"], p["hair_color"]
    eye_col = p.get("eye_color", "#3f88c5")
    if p["species"] == "robot":
        skin = "#b8c4d0"
    blush = mix(skin, "#ff5a6e", 0.45)
    pen.skin = skin
    parts: list[dict] = []

    def part(pid, parent, pivot, z, svg=None, variants=None, default=None):
        d = {"id": pid, "parent": parent, "pivot": [round(pivot[0], 1), round(pivot[1], 1)], "z": z}
        if svg is not None:
            d["svg"] = svg
        if variants is not None:
            d["variants"] = variants
            d["defaultVariant"] = default
        parts.append(d)

    # ---------------- piernas + zapatos
    shoe = _shade(ink, 1.25) if p["outfit"] != "robe" else "#5b3a29"
    for side, sx, z in (("L", -1, 2), ("R", 1, 3)):
        hx = cx + sx * tw * 0.42
        kneeY = hipY + legL * 0.5
        thick = 44 * min(1.3, bw)
        up = pen.shape(pen.limb(hx, hipY - 12, hx + sx * 2, kneeY, thick, thick * 0.86), bottom)
        lo = pen.shape(pen.limb(hx + sx * 2, kneeY, hx, footY - 22, thick * 0.86, thick * 0.72), bottom)
        lo += pen.brush([(hx - 10, kneeY - 4), (hx + 2, kneeY + 6), (hx + 12, kneeY - 2)], 3.5, shadow_of(bottom))  # pliegue rodilla
        sole = [(hx - 30 + sx * 6, footY - 6), (hx + sx * 58, footY - 6), (hx + sx * 60, footY + 4), (hx - 32 + sx * 6, footY + 4)]
        upper = pen.blob(hx + sx * 20, footY - 22, 44, 22, n=12, square=0.25, bottom_bulge=0.6)
        lo += pen.shape(sole, _shade(shoe, 0.6), shadow=False, sw=lw * 0.7) + pen.shape(upper, shoe, gloss=True)
        part(f"leg{side}_up", "torso", (hx, hipY), z, up)
        part(f"leg{side}_lo", f"leg{side}_up", (hx, kneeY), z, lo)

    # ---------------- torso + ropa
    body = p["body"]
    if body in ("round", "blob"):
        tpts = pen.blob(cx, (shY + hipY) / 2 + 12, tw, torsoH * 0.6, n=16, bottom_bulge=1.08)
    elif body == "pear":
        tpts = [(cx - tw * 0.55, shY + 8), (cx, shY - 6), (cx + tw * 0.55, shY + 8), (cx + tw * 1.02, hipY - 34),
                (cx + tw * 0.86, hipY + 16), (cx, hipY + 28), (cx - tw * 0.86, hipY + 16), (cx - tw * 1.02, hipY - 34)]
        tpts = [(pen.jit(x, .4), pen.jit(y, .4)) for x, y in tpts]
    else:
        sq = 0.6 if body == "stocky" else 0.35
        tpts = pen.blob(cx, (shY + hipY) / 2 + 6, tw * (1.05 if body == "stocky" else 0.9), torsoH * 0.56, n=16, square=sq)
    out = p["outfit"]
    torso_svg = pen.shape(tpts, top)
    # sombra de contacto bajo la cabeza (oclusión ambiental)
    torso_svg += f'<ellipse cx="{cx + 6:.1f}" cy="{shY + 16:.1f}" rx="{tw * 0.5:.1f}" ry="22" fill="{core_of(top)}" opacity="0.55"/>'
    if out == "suit":
        shirt = "#f4f1ea"
        torso_svg += pen.shape([(cx - 26, shY + 2), (cx, shY + 96), (cx + 26, shY + 2)], shirt, rim=False, weight=False, sw=lw * 0.6)
        for s in (-1, 1):
            torso_svg += pen.shape([(cx + s * 26, shY + 2), (cx + s * 62, shY + 24), (cx + s * 30, shY + 70), (cx + s * 4, shY + 118)], _shade(top, 0.86), rim=False, sw=lw * 0.6)
        torso_svg += "".join(f'<circle cx="{cx + 8}" cy="{shY + 150 + k * 38}" r="7" fill="{_shade(top, 0.55)}" stroke="{ink}" stroke-width="2.5"/>'
                             f'<circle cx="{cx + 6}" cy="{shY + 148 + k * 38}" r="2.2" fill="#ffffff" opacity="0.7"/>' for k in range(2))
        torso_svg += pen.brush([(cx + tw * 0.55, shY + 120), (cx + tw * 0.4, shY + 135), (cx + tw * 0.7, shY + 140)], 3, shadow_of(top))
    elif out == "lab":
        torso_svg += pen.brush([(cx, shY + 30), (cx + 2, hipY + 20)], 4) + pen.brush([(cx - 36, shY + 4), (cx - 4, shY + 90)], 4) + pen.brush([(cx + 36, shY + 4), (cx + 4, shY + 90)], 4)
        torso_svg += pen.shape([(cx + tw * 0.3, shY + 110), (cx + tw * 0.72, shY + 110), (cx + tw * 0.7, shY + 150), (cx + tw * 0.32, shY + 150)], _shade(top, 0.95), rim=False, weight=False, sw=lw * 0.5)
        torso_svg += pen.brush([(cx + tw * 0.4, shY + 108), (cx + tw * 0.4, shY + 135)], 5, "#3f88c5")
    elif out == "uniform":
        torso_svg += pen.shape(pen.blob(cx + tw * 0.45, shY + 72, 18, 15, n=10), accent, gloss=True, sw=lw * 0.6)
        torso_svg += pen.shape([(cx - tw * 0.86, hipY - 50), (cx + tw * 0.86, hipY - 50), (cx + tw * 0.86, hipY - 30), (cx - tw * 0.86, hipY - 30)], _shade(ink, 1.4), rim=False, sw=lw * 0.6)
        torso_svg += pen.shape([(cx - 16, hipY - 54), (cx + 16, hipY - 54), (cx + 16, hipY - 26), (cx - 16, hipY - 26)], accent, gloss=True, sw=lw * 0.5)
    elif out == "tank":
        torso_svg += pen.brush([(cx - 34, shY + 2), (cx, shY + 42), (cx + 34, shY + 2)], 5)
    elif out == "tshirt":
        torso_svg += pen.shape(pen.blob(cx, shY + 8, 32, 16, n=10), skin, rim=False, weight=False, sw=lw * 0.6)
        torso_svg += pen.brush([(cx - 30, shY + 14), (cx, shY + 30), (cx + 30, shY + 14)], 4)
    elif out in ("dress", "robe"):
        torso_svg += pen.shape([(cx - tw * 0.9, hipY - 40), (cx + tw * 0.9, hipY - 40), (cx + tw * 1.35, hipY + legL * 0.58),
                                (cx - tw * 1.35, hipY + legL * 0.58)], top)
        for k in (-0.5, 0, 0.5):
            torso_svg += pen.brush([(cx + tw * k * 0.7, hipY - 20), (cx + tw * k * 1.1, hipY + legL * 0.5)], 4, shadow_of(top))
    # pliegues de cintura
    torso_svg += pen.brush([(cx - tw * 0.6, hipY - 18), (cx - tw * 0.3, hipY - 10)], 3.5, shadow_of(top))
    torso_svg += pen.brush([(cx + tw * 0.25, hipY - 8), (cx + tw * 0.62, hipY - 20)], 3.5, shadow_of(top))
    if "tie" in p["accessories"]:
        torso_svg += pen.shape([(cx - 14, shY + 10), (cx + 14, shY + 10), (cx + 10, shY + 30), (cx - 10, shY + 30)], _shade(accent, 0.85), rim=False, sw=lw * 0.5)
        torso_svg += pen.shape([(cx - 11, shY + 28), (cx + 11, shY + 28), (cx + 18, shY + 128), (cx, shY + 150), (cx - 18, shY + 128)], accent, sw=lw * 0.6)
        torso_svg += pen.brush([(cx - 6, shY + 60), (cx + 8, shY + 52)], 3, shadow_of(accent)) + pen.brush([(cx - 8, shY + 100), (cx + 10, shY + 92)], 3, shadow_of(accent))
    part("torso", None, (cx, hipY), 5, torso_svg)

    # ---------------- brazos + manos (4 dedos)
    sleeve = top if out not in ("tank",) else skin
    for side, sx, z in (("L", -1, 1), ("R", 1, 8)):
        shx = cx + sx * tw * 0.78
        ua = 102 * h
        elbow = (shx + sx * 16, shY + 22 + ua)
        hand = (elbow[0] + sx * 5, elbow[1] + ua * 0.92)
        thick = 33 * min(1.25, bw)
        up = pen.shape(pen.limb(shx, shY + 22, *elbow, thick, thick * 0.86), sleeve)
        up += pen.brush([(elbow[0] - 10, elbow[1] - 14), (elbow[0] + 2, elbow[1] - 6), (elbow[0] + 10, elbow[1] - 16)], 3, shadow_of(sleeve))
        lo = pen.shape(pen.limb(*elbow, hand[0], hand[1] - 8, thick * 0.86, thick * 0.74), sleeve if out not in ("tank",) else skin)
        if out not in ("tank",):  # puño de la manga
            lo += pen.shape(pen.blob(hand[0], hand[1] - 12, thick * 0.46, 9, n=10), _shade(sleeve, 0.85), rim=False, weight=False, sw=lw * 0.6)
        # mano realista: palma + 4 dedos articulados (ligeramente abiertos) + pulgar, nudillos
        hx, hy = hand[0], hand[1] + 12
        palm = pen.blob(hx, hy, 22, 22, n=12, square=0.25)
        fingers = ""
        for i, (dx, ln, ang) in enumerate(((-13, 24, -10), (-4.5, 28, -3), (4.5, 27, 3), (13, 22, 10))):
            fx = hx + dx * sx
            a0 = math.radians(90 + ang * sx)
            ex_, ey_ = fx + math.cos(a0) * ln, hy + 14 + math.sin(a0) * ln
            fingers += pen.shape(pen.limb(fx, hy + 12, ex_, ey_, 10, 8.5), skin, sw=lw * 0.6, rim=False, weight=False)
            fingers += pen.brush([(fx + (ex_ - fx) * 0.45 - 3, hy + 12 + (ey_ - hy - 12) * 0.45), (fx + (ex_ - fx) * 0.45 + 3, hy + 12 + (ey_ - hy - 12) * 0.45)], 1.6, shadow_of(skin, True), opacity=0.7)
        thumb = pen.limb(hx - sx * 16, hy - 4, hx - sx * 30, hy + 20, 12, 9.5)
        lo += fingers + pen.shape(palm, skin, sw=lw * 0.6, weight=False) + pen.shape(thumb, skin, sw=lw * 0.6, rim=False, weight=False)
        lo += "".join(f'<circle cx="{hx + k * 8.5 * sx:.1f}" cy="{hy + 10:.1f}" r="2" fill="{shadow_of(skin, True)}" opacity="0.6"/>' for k in (-1.5, -0.5, 0.5, 1.5))
        part(f"arm{side}_up", "torso", (shx, shY + 22), z, up)
        part(f"arm{side}_lo", f"arm{side}_up", elbow, z, lo)

    # ---------------- cabeza
    hd = p["head"]
    shapes = {"round": dict(n=16), "oval": dict(n=16), "square": dict(n=16, square=0.8), "egg": dict(n=16, top_squash=1.15, bottom_bulge=0.86),
              "long": dict(n=16), "bean": dict(n=16, bottom_bulge=1.2)}
    rx = R * {"oval": 0.86, "long": 0.76, "bean": 1.05}.get(hd, 1.0)
    ry = R * {"oval": 1.1, "long": 1.3, "egg": 1.05}.get(hd, 1.0)
    if p["species"] == "robot":
        shapes[hd] = dict(n=16, square=1.0)
    neck = pen.shape(pen.limb(cx, shY + 24, cx, headCy + ry * 0.55, 38, 36), _shade(skin, 0.93), rim=False, weight=False, sw=lw * 0.7)
    neck += f'<ellipse cx="{cx + 4:.1f}" cy="{headCy + ry * 0.86:.1f}" rx="{rx * 0.42:.1f}" ry="16" fill="{core_of(skin)}" opacity="0.6"/>'
    head_svg = neck
    for sx in (-1, 1):  # orejas con pabellón interior
        if p["species"] != "robot":
            ex0 = cx + sx * rx * 0.97
            head_svg += pen.shape(pen.blob(ex0, headCy + 10, 17, 24, n=10), skin, sw=lw * 0.75, weight=False)
            head_svg += pen.brush([(ex0 + sx * 4, headCy - 4), (ex0 - sx * 4, headCy + 10), (ex0 + sx * 2, headCy + 22)], 3.5, shadow_of(skin))
    head_svg += pen.shape(pen.blob(cx, headCy, rx, ry, **shapes[hd]), skin)
    # rubor
    rb = pen.nid("b")
    head_svg += (f'<defs><radialGradient id="{rb}"><stop offset="0" stop-color="{blush}" stop-opacity="0.75"/>'
                 f'<stop offset="1" stop-color="{blush}" stop-opacity="0"/></radialGradient></defs>')
    for sx in (-1, 1):
        head_svg += f'<ellipse cx="{cx + sx * rx * 0.55:.1f}" cy="{headCy + ry * 0.28:.1f}" rx="{rx * 0.22:.1f}" ry="{ry * 0.13:.1f}" fill="url(#{rb})"/>'
    nose = p["nose"]
    ny = headCy + ry * 0.16
    head_svg += f'<ellipse cx="{cx + 10:.1f}" cy="{ny + 22:.1f}" rx="16" ry="6" fill="{shadow_of(skin)}" opacity="0.7"/>'  # sombra bajo la nariz
    if nose in ("round", "long", "pointy"):  # puente con luz + aletas + orificios (volumen realista)
        head_svg += pen.brush([(cx - 4, ny - 46), (cx - 2, ny - 18)], 7, light_of(skin), opacity=0.6, taper=(0.3, 0.5))
        head_svg += pen.brush([(cx + 8, ny - 40), (cx + 12, ny - 6)], 4, shadow_of(skin, True), opacity=0.6, taper=(0.3, 0.5))
    if nose == "round":
        head_svg += pen.shape(pen.blob(cx + 3, ny + 2, 17, 14, n=10), _shade(skin, 0.98), sw=lw * 0.45, gloss=True, weight=False)
        head_svg += "".join(f'<ellipse cx="{cx + k * 9:.1f}" cy="{ny + 13:.1f}" rx="4.5" ry="2.6" fill="{core_of(skin, True)}" opacity="0.85"/>' for k in (-1, 1))
        head_svg += "".join(pen.brush([(cx + k * 14, ny - 2), (cx + k * 20, ny + 8), (cx + k * 14, ny + 14)], 2.4, shadow_of(skin, True), opacity=0.8) for k in (-1, 1))
    elif nose == "long":
        head_svg += pen.shape([(cx - 2, ny - 32), (cx + 54, ny + 6), (cx + 50, ny + 16), (cx + 2, ny + 14)], _shade(skin, 0.97), sw=lw * 0.7, gloss=True)
    elif nose == "pointy":
        head_svg += pen.brush([(cx + 2, ny - 24), (cx + 24, ny + 8), (cx + 4, ny + 12)], 5, taper=(0.4, 0.3))
    elif nose == "pig":
        head_svg += pen.shape(pen.blob(cx, ny, 24, 16, n=10), "#f4a1ad", sw=lw * 0.7, gloss=True)
        head_svg += f'<ellipse cx="{cx-8}" cy="{ny+1}" rx="4.5" ry="6" fill="{ink}"/><ellipse cx="{cx+8}" cy="{ny+1}" rx="4.5" ry="6" fill="{ink}"/>'
    if "mustache" in p["accessories"]:
        head_svg += pen.shape([(cx - 46, ny + 28), (cx - 28, ny + 13), (cx - 6, ny + 12), (cx, ny + 17), (cx + 6, ny + 12), (cx + 28, ny + 13), (cx + 46, ny + 28), (cx + 20, ny + 26), (cx, ny + 29), (cx - 20, ny + 26)], hairc, sw=lw * 0.6)
    if "beard" in p["accessories"]:
        head_svg += pen.shape([(cx - rx * 0.88, headCy + ry * 0.22), (cx - rx * 0.5, headCy + ry * 0.55), (cx + rx * 0.5, headCy + ry * 0.55), (cx + rx * 0.88, headCy + ry * 0.22),
                               (cx + rx * 0.55, headCy + ry * 1.2), (cx, headCy + ry * 1.48), (cx - rx * 0.55, headCy + ry * 1.2)], hairc)
        for k in (-0.4, 0, 0.4):
            head_svg += pen.brush([(cx + rx * k, headCy + ry * 0.8), (cx + rx * k * 1.1, headCy + ry * 1.2)], 3, light_of(hairc), opacity=0.6)
    if "bandage" in p["accessories"]:
        head_svg += f'<g transform="rotate(-20 {cx - rx*0.4} {headCy - ry*0.5})">' + pen.shape([(cx - rx * 0.4 - 28, headCy - ry * 0.5 - 9), (cx - rx * 0.4 + 28, headCy - ry * 0.5 - 9), (cx - rx * 0.4 + 28, headCy - ry * 0.5 + 9), (cx - rx * 0.4 - 28, headCy - ry * 0.5 + 9)], "#f6efe2", sw=lw * 0.5) + "</g>"
    part("head", "torso", (cx, shY + 10), 10, head_svg)

    # ---------------- ojos (variantes)
    ex, ey = rx * 0.38, headCy - ry * 0.10
    er = {"big": R * 0.21, "dots": R * 0.09, "tired": R * 0.18, "wild": R * 0.24}[p["eyes"]]
    ig = pen.nid("i")
    sg = pen.nid("s")
    eye_defs = (f'<defs><radialGradient id="{ig}" cx="0.45" cy="0.4" r="0.6"><stop offset="0" stop-color="{light_of(eye_col)}"/>'
                f'<stop offset="0.7" stop-color="{eye_col}"/><stop offset="1" stop-color="{core_of(eye_col)}"/></radialGradient>'
                f'<linearGradient id="{sg}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#d9d2e6"/><stop offset="0.35" stop-color="#ffffff"/></linearGradient></defs>')

    def eye_one(x, r, kind, sx):
        """Ojo almendrado realista: esclerótica con sombra del párpado, iris recortado, pliegue, pestañas."""
        s = ""
        if p["eyes"] == "dots" and kind in ("open", "wide", "half", "angry", "sad"):
            ry_ = r * (1.8 if kind != "half" else 0.9) * (1.2 if kind == "wide" else 1)
            s += f'<ellipse cx="{x:.1f}" cy="{ey:.1f}" rx="{r*1.25:.1f}" ry="{ry_:.1f}" fill="{ink}"/>'
            s += f'<circle cx="{x - r*0.35:.1f}" cy="{ey - ry_*0.4:.1f}" r="{r*0.45:.1f}" fill="#ffffff"/>'
            return s
        lid_c = mix(core_of(skin, True), ink, 0.55)
        if kind == "closed":
            return pen.brush([(x - r * 1.2, ey), (x, ey + r * 0.32), (x + r * 1.2, ey - r * 0.05)], lw * 0.9, lid_c) + \
                pen.brush([(x - r * 1.0, ey - r * 0.55), (x, ey - r * 0.85), (x + r * 1.0, ey - r * 0.6)], 2.2, shadow_of(skin, True), opacity=0.8) + \
                "".join(pen.brush([(x + k * r * 0.35, ey + r * 0.25), (x + k * r * 0.42 + sx * 3, ey + r * 0.55)], 2.2, lid_c, taper=(0.1, 0.9)) for k in (-1.5, -0.5, 0.5, 1.5))
        if kind == "happy":
            return pen.brush([(x - r * 1.1, ey + r * 0.3), (x, ey - r * 0.4), (x + r * 1.1, ey + r * 0.3)], lw * 1.0, lid_c) + \
                pen.brush([(x - r * 0.9, ey + r * 0.75), (x, ey + r * 0.95), (x + r * 0.9, ey + r * 0.75)], 2.2, shadow_of(skin, True), opacity=0.8)
        # apertura del párpado superior por lado (interior/exterior) según la expresión
        top_in, top_out = {"open": (1.0, 1.0), "wide": (1.35, 1.35), "crazy": (1.4, 1.2), "half": (0.42, 0.42),
                           "angry": (0.35, 0.95), "sad": (1.0, 0.45)}.get(kind, (1.0, 1.0))
        if p["eyes"] == "tired" and kind == "open":
            top_in = top_out = 0.6
        bot = 0.8 if kind != "wide" else 1.0
        xi, xo = x - sx * r * 1.15, x + sx * r * 1.15   # comisura interior / exterior
        yi, yo = ey + r * 0.08, ey - r * 0.08
        d = (f"M{xi:.1f},{yi:.1f} C{x - sx * r * 0.6:.1f},{ey - r * 1.25 * top_in:.1f} {x + sx * r * 0.55:.1f},{ey - r * 1.25 * top_out:.1f} {xo:.1f},{yo:.1f} "
             f"C{x + sx * r * 0.5:.1f},{ey + r * 1.05 * bot:.1f} {x - sx * r * 0.6:.1f},{ey + r * 1.05 * bot:.1f} {xi:.1f},{yi:.1f} Z")
        cid = pen.nid("ec")
        s += f'<defs><clipPath id="{cid}"><path d="{d}"/></clipPath></defs><path d="{d}" fill="url(#{sg})"/>'
        ir = r * (0.5 if kind in ("wide", "crazy") else 0.66)
        px = x + (-sx * r * 0.1 if kind != "crazy" else sx * r * 0.25)
        py = ey + r * 0.06
        s += (f'<g clip-path="url(#{cid})"><circle cx="{px:.1f}" cy="{py:.1f}" r="{ir:.1f}" fill="url(#{ig})"/>'
              f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{ir:.1f}" fill="none" stroke="{core_of(eye_col)}" stroke-width="2.2"/>'
              f'<circle cx="{px:.1f}" cy="{py:.1f}" r="{ir * 0.45:.1f}" fill="#0d0a10"/>'
              f'<path d="{d}" fill="none" stroke="{shadow_of(skin, True)}" stroke-width="{r * 0.55:.1f}" opacity="0.45" transform="translate(0 {-r * 0.32:.1f})"/>'
              f'<circle cx="{px - ir * 0.35:.1f}" cy="{py - ir * 0.4:.1f}" r="{ir * 0.26:.1f}" fill="#ffffff" opacity="0.95"/>'
              f'<circle cx="{px + ir * 0.35:.1f}" cy="{py + ir * 0.32:.1f}" r="{ir * 0.12:.1f}" fill="#ffffff" opacity="0.8"/></g>')
        # línea de pestañas superior (gruesa), inferior (fina), pliegue del párpado y pestañas exteriores
        s += (f'<path d="M{xi:.1f},{yi:.1f} C{x - sx * r * 0.6:.1f},{ey - r * 1.25 * top_in:.1f} {x + sx * r * 0.55:.1f},{ey - r * 1.25 * top_out:.1f} {xo:.1f},{yo:.1f}" '
              f'fill="none" stroke="{lid_c}" stroke-width="{lw * 0.95:.1f}" stroke-linecap="round"/>')
        s += (f'<path d="M{xo:.1f},{yo:.1f} C{x + sx * r * 0.5:.1f},{ey + r * 1.05 * bot:.1f} {x - sx * r * 0.6:.1f},{ey + r * 1.05 * bot:.1f} {xi:.1f},{yi:.1f}" '
              f'fill="none" stroke="{lid_c}" stroke-width="1.6" opacity="0.7"/>')
        crease = 1.25 * max(top_in, top_out) + 0.35
        s += pen.brush([(x - sx * r * 0.8, ey - r * (crease - 0.1)), (x, ey - r * crease), (x + sx * r * 0.95, ey - r * (crease - 0.25))], 2.4, shadow_of(skin, True), opacity=0.75)
        s += "".join(pen.brush([(xo - sx * r * k, yo - r * (0.3 + k * 0.4)), (xo - sx * r * k + sx * r * 0.3, yo - r * (0.55 + k * 0.45))], 2.4, lid_c, taper=(0.05, 0.9)) for k in (0.05, 0.3))
        s += pen.brush([(x - r * 0.7, ey + r * 1.25), (x, ey + r * 1.38), (x + r * 0.7, ey + r * 1.25)], 2.0, shadow_of(skin, True), opacity=0.55)  # ojera
        return s

    def eye_pair(kind: str) -> str:
        s = eye_defs
        for i, sx in enumerate((-1, 1)):
            x = cx + sx * ex
            r = er * (1.25 if kind == "wide" else 1.0) * ((1.3 if i == 0 else 0.78) if kind == "crazy" else 1.0)
            s += eye_one(x, r, kind, sx)
        return s

    eye_kinds = ["open", "half", "closed", "wide", "angry", "sad", "happy", "crazy"]
    part("eyes", "head", (cx, ey), 12, variants={k: eye_pair(k) for k in eye_kinds}, default="open")

    # ---------------- cejas (pinceladas gruesas)
    by = ey - er * 1.55 - 12
    bl = max(28, er * 1.15)
    brow_c = hairc if p["hair"] != "none" else _shade(ink, 1.3)

    def brows(kind: str) -> str:
        """Cejas pelo a pelo: masa base translúcida + trazos finos con dirección de crecimiento."""
        s = ""
        for sx in (-1, 1):
            x = cx + sx * ex
            inner, outer = x - sx * bl * 0.85, x + sx * bl * 0.85
            dy = {"neutral": (0, -2), "angry": (16, -10), "sad": (-14, 8), "raised": (-16, -12), "skeptical": ((-20, -16) if sx > 0 else (6, 6))}[kind]
            pts = [(inner, by + dy[0]), (x, by - 6 + (dy[0] + dy[1]) / 2), (outer, by + dy[1])]
            s += pen.brush(pts, 10, brow_c, taper=(0.35, 0.6), opacity=0.55)
            for i in range(9):
                t = i / 8
                bx = inner + (outer - inner) * t
                byy = pts[0][1] + (pts[2][1] - pts[0][1]) * t - 6 * math.sin(t * math.pi)
                s += pen.brush([(bx, byy + 4), (bx + sx * 9, byy - 3)], 2.6, brow_c if i % 2 else core_of(brow_c), taper=(0.1, 0.8))
        return s

    part("brows", "head", (cx, by), 13, variants={k: brows(k) for k in ("neutral", "angry", "sad", "raised", "skeptical")}, default="neutral")

    # ---------------- boca (visemas + emociones), interior oscuro, dientes, lengua
    my = headCy + ry * 0.52
    mw = rx * 0.42
    inner_c = "#3a0f1d"
    tongue = "#e8647f"
    lip = mix(skin, "#b5414f", 0.38)

    def open_mouth(w2, hh, teeth=True, tongue_on=True, round_=False):
        rx_, ry_ = (w2, hh / 2 + 4)
        cyc = my + hh * 0.3
        mid = pen.nid("m")
        d = f"M{cx - rx_:.1f},{cyc:.1f} A{rx_:.1f},{ry_:.1f} 0 1 0 {cx + rx_:.1f},{cyc:.1f} A{rx_:.1f},{ry_ * (1 if round_ else 0.55):.1f} 0 1 0 {cx - rx_:.1f},{cyc:.1f} Z"
        s = f'<defs><clipPath id="{mid}"><path d="{d}"/></clipPath></defs><path d="{d}" fill="{inner_c}"/>'
        s += f'<g clip-path="url(#{mid})">'
        if teeth:
            s += f'<rect x="{cx - rx_:.1f}" y="{cyc - ry_ * 0.6 - 2:.1f}" width="{rx_ * 2:.1f}" height="{max(7, hh * 0.3):.1f}" fill="#fbf8f2"/>'
            s += f'<rect x="{cx - rx_:.1f}" y="{cyc - ry_ * 0.6 + max(7, hh*0.3) - 3:.1f}" width="{rx_ * 2:.1f}" height="3" fill="#d8d0c8"/>'
        if tongue_on:
            s += f'<ellipse cx="{cx + rx_ * 0.1:.1f}" cy="{cyc + ry_ * 0.95:.1f}" rx="{rx_ * 0.65:.1f}" ry="{ry_ * 0.6:.1f}" fill="{tongue}"/>'
        s += "</g>" + f'<path d="{d}" fill="none" stroke="{ink}" stroke-width="{lw*0.7:.1f}" stroke-linejoin="round"/>'
        s += pen.brush([(cx - rx_ * 0.5, cyc + ry_ + 8), (cx + rx_ * 0.5, cyc + ry_ + 8)], 3, shadow_of(skin), opacity=0.8)  # labio inferior
        return s

    def mouth(k: str) -> str:
        if k == "X":  # labios en reposo con volumen: superior en sombra, inferior iluminado con brillo
            up = [(cx - mw * 0.85, my + 2), (cx - mw * 0.3, my - 9), (cx, my - 5), (cx + mw * 0.3, my - 9), (cx + mw * 0.85, my + 2), (cx, my + 4)]
            lo = [(cx - mw * 0.8, my + 3), (cx, my + 5), (cx + mw * 0.8, my + 3), (cx + mw * 0.45, my + 16), (cx, my + 19), (cx - mw * 0.45, my + 16)]
            return (pen.shape(up, _shade(lip, 0.85), sw=lw * 0.4, rim=False, weight=False) + pen.shape(lo, lip, sw=lw * 0.4, rim=False, weight=False, gloss=True) +
                    pen.brush([(cx - mw * 0.85, my + 2), (cx - mw * 0.3, my + 4), (cx + mw * 0.3, my + 4), (cx + mw * 0.85, my + 2)], 2.6, core_of(lip)) +
                    pen.brush([(cx - mw * 0.25, my + 28), (cx + mw * 0.25, my + 28)], 3, shadow_of(skin, True), opacity=0.6) +
                    pen.brush([(cx - 6, my - 26), (cx - 4, my - 11)], 3, shadow_of(skin, True), opacity=0.45) + pen.brush([(cx + 6, my - 26), (cx + 4, my - 11)], 3, shadow_of(skin, True), opacity=0.45))
        if k == "A":
            return pen.shape([(cx - mw * 0.6, my - 3), (cx + mw * 0.6, my - 3), (cx + mw * 0.5, my + 6), (cx - mw * 0.5, my + 6)], lip, rim=False, weight=False, sw=lw * 0.6)
        table = {"B": (mw * 0.75, 12, True, False), "C": (mw * 0.8, 26, True, True), "D": (mw, 44, True, True), "E": (mw * 0.5, 32, False, True),
                 "F": (mw * 0.3, 16, False, False), "G": (mw * 0.7, 14, True, False), "H": (mw * 0.75, 30, True, True)}
        if k in table:
            w2, hh, teeth, tng = table[k]
            return open_mouth(w2, hh, teeth, tng, round_=k in ("E", "F"))
        if k == "smile":
            return pen.brush([(cx - mw * 1.05, my - 10), (cx - mw * 0.45, my + 14), (cx + mw * 0.45, my + 14), (cx + mw * 1.05, my - 10)], lw * 1.0) + \
                "".join(pen.brush([(cx + s * mw * 1.0, my - 16), (cx + s * mw * 1.12, my - 4)], 3, taper=(0.2, 0.6)) for s in (-1, 1))
        if k == "frown":
            return pen.brush([(cx - mw * 0.9, my + 12), (cx, my - 4), (cx + mw * 0.9, my + 12)], lw * 1.0)
        if k == "smirk":
            return pen.brush([(cx - mw * 0.7, my + 6), (cx + mw * 0.3, my + 6), (cx + mw * 0.95, my - 12)], lw * 1.0) + \
                pen.brush([(cx + mw * 0.95, my - 18), (cx + mw * 1.08, my - 6)], 3, taper=(0.2, 0.6))
        if k == "grin":
            mid = pen.nid("m")
            d = f"M{cx-mw*1.1:.1f},{my-8:.1f} Q{cx:.1f},{my+60:.1f} {cx+mw*1.1:.1f},{my-8:.1f} Q{cx:.1f},{my+6:.1f} {cx-mw*1.1:.1f},{my-8:.1f} Z"
            s = f'<defs><clipPath id="{mid}"><path d="{d}"/></clipPath></defs><path d="{d}" fill="#fbf8f2"/>'
            s += f'<g clip-path="url(#{mid})"><path d="M{cx-mw*1.1:.1f},{my+14:.1f} Q{cx:.1f},{my+40:.1f} {cx+mw*1.1:.1f},{my+14:.1f}" stroke="{inner_c}" stroke-width="9" fill="none"/>'
            s += "".join(f'<line x1="{cx + k * mw * 0.32:.1f}" y1="{my-10:.1f}" x2="{cx + k * mw * 0.32:.1f}" y2="{my+50:.1f}" stroke="#cfc6bd" stroke-width="2.5"/>' for k in (-2, -1, 0, 1, 2))
            return s + f'</g><path d="{d}" fill="none" stroke="{ink}" stroke-width="{lw*0.8:.1f}" stroke-linejoin="round"/>'
        if k == "scream":
            return open_mouth(mw * 0.72, 70, teeth=True, tongue_on=True, round_=True)
        return ""

    part("mouth", "head", (cx, my), 12, variants={k: mouth(k) for k in VISEMES + ["smile", "frown", "smirk", "grin", "scream"]}, default="X")

    # ---------------- pelo (volumen, mechones, reflejos) y accesorios
    top_y = headCy - ry
    hair = p["hair"]
    hsvg = ""
    hl = light_of(_shade(hairc, 1.35))
    back = ""
    if hair == "spiky":
        pts = []
        for i in range(11):
            a = math.pi + (i / 10) * math.pi
            r = rx * (1.32 if i % 2 else 1.02)
            pts.append((cx + math.cos(a) * r, headCy - ry * 0.22 + math.sin(a) * ry * (1.32 if i % 2 else 0.95)))
        pts += [(cx + rx * 0.92, headCy - ry * 0.25), (cx + rx * 0.4, headCy - ry * 0.55), (cx - rx * 0.4, headCy - ry * 0.5), (cx - rx * 0.92, headCy - ry * 0.25)]
        hsvg = pen.shape(pts, hairc)
    elif hair in ("bob", "long", "slick", "curly", "bun"):
        # masa trasera (detrás de la cara) + casquete/flequillo que termina en la frente
        k = {"bob": 1.05, "long": 1.9, "slick": 0.0, "curly": 0.95, "bun": 0.0}[hair]
        if hair == "bob":  # melena hasta la mandíbula
            back = pen.shape(pen.blob(cx, headCy - ry * 0.12, rx * 1.16, ry * 1.0, n=18, square=0.3, bottom_bulge=0.95), hairc)
        elif k:
            back = pen.shape(pen.blob(cx, headCy + ry * (k - 1) * 0.5, rx * 1.2, ry * (0.95 + k * 0.32), n=18), hairc)
        fringe_y = ey - er * 1.6 - 22
        cap = [(cx - rx * 1.06, headCy - ry * 0.05), (cx - rx * 1.02, headCy - ry * 0.6), (cx - rx * 0.55, top_y - ry * 0.12), (cx + rx * 0.25, top_y - ry * 0.14),
               (cx + rx * 0.95, headCy - ry * 0.62), (cx + rx * 1.06, headCy - ry * 0.05), (cx + rx * 0.72, fringe_y + 6), (cx + rx * 0.3, fringe_y - 10),
               (cx - rx * 0.1, fringe_y + 10), (cx - rx * 0.55, fringe_y - 4), (cx - rx * 0.85, fringe_y + 14)]
        hsvg = pen.shape(cap, hairc)
        if hair == "curly":
            hsvg += "".join(pen.shape(pen.blob(cx + math.cos(a) * rx * 0.98, headCy - ry * 0.5 + math.sin(a) * ry * 0.72, 30, 30, n=9), hairc, sw=lw * 0.75, weight=False)
                            for a in [math.pi + i * math.pi / 6 for i in range(7)])
        if hair == "bun":
            hsvg = pen.shape(pen.blob(cx, top_y - 34, 46, 40, n=12), hairc) + hsvg
    elif hair == "mohawk":
        hsvg = pen.shape([(cx - 24, top_y + 34), (cx - 34, top_y - 70), (cx - 8, top_y - 118), (cx + 22, top_y - 92), (cx + 34, top_y - 50), (cx + 24, top_y + 34)], accent)
    elif hair == "bald_ring":
        for sx in (-1, 1):  # patillas pegadas al cráneo, por detrás de las orejas
            back += pen.shape([(cx + sx * rx * 0.78, headCy - ry * 0.42), (cx + sx * rx * 1.1, headCy - ry * 0.3), (cx + sx * rx * 1.12, headCy + ry * 0.12),
                               (cx + sx * rx * 0.95, headCy + ry * 0.3), (cx + sx * rx * 0.86, headCy - ry * 0.05)], hairc, sw=lw * 0.7)
        hsvg += f'<ellipse cx="{cx - rx*0.3:.1f}" cy="{top_y + ry*0.25:.1f}" rx="{rx*0.25:.1f}" ry="{ry*0.08:.1f}" fill="#ffffff" opacity="0.45" transform="rotate(-20 {cx - rx*0.3:.1f} {top_y + ry*0.25:.1f})"/>'
    if back:
        part("hair_back", "head", (cx, headCy), 9, back)
    if hair not in ("none", "bald_ring", "mohawk"):  # pelo por mechones: trazos finos con dirección + reflejo especular
        rng = random.Random(p.get("seed", 7) * 31)
        for i in range(26):
            t = rng.random()
            x0_ = cx + rx * (-0.95 + 1.9 * t)
            y0_ = top_y + ry * (0.02 + 0.08 * abs(t - 0.5))
            bend = (t - 0.5) * rx * 0.5
            y1_ = top_y + ry * (0.32 + 0.18 * rng.random())
            col = hl if i % 3 == 0 else (core_of(hairc) if i % 3 == 1 else _shade(hairc, 1.12))
            hsvg += pen.brush([(x0_, y0_), (x0_ + bend * 0.6, (y0_ + y1_) / 2), (x0_ + bend, y1_)], 2.2 + rng.random() * 2.2, col, taper=(0.15, 0.85), opacity=0.55 + 0.35 * rng.random())
        sp = pen.nid("hs")
        hsvg += (f'<defs><radialGradient id="{sp}"><stop offset="0" stop-color="#ffffff" stop-opacity="0.45"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient></defs>'
                 f'<ellipse cx="{cx - rx * 0.3:.1f}" cy="{top_y + ry * 0.16:.1f}" rx="{rx * 0.45:.1f}" ry="{ry * 0.07:.1f}" fill="url(#{sp})" transform="rotate(-12 {cx - rx * 0.3:.1f} {top_y + ry * 0.16:.1f})"/>')
    if hair == "none" and p["species"] != "robot":  # brillo de calva
        hsvg += f'<ellipse cx="{cx - rx*0.32:.1f}" cy="{top_y + ry*0.22:.1f}" rx="{rx*0.22:.1f}" ry="{ry*0.07:.1f}" fill="#ffffff" opacity="0.4" transform="rotate(-25 {cx - rx*0.32:.1f} {top_y + ry*0.22:.1f})"/>'
    acc = p["accessories"]
    if "hat" in acc:
        hsvg += pen.shape([(cx - rx * 1.45, top_y + 26), (cx + rx * 1.45, top_y + 26), (cx + rx * 1.32, top_y + 4), (cx - rx * 1.32, top_y + 4)], _shade(ink, 1.5))
        hsvg += pen.shape([(cx - rx * 0.82, top_y + 10), (cx - rx * 0.72, top_y - 112), (cx + rx * 0.72, top_y - 112), (cx + rx * 0.82, top_y + 10)], _shade(ink, 1.5), gloss=True)
        hsvg += pen.shape([(cx - rx * 0.8, top_y - 22), (cx + rx * 0.8, top_y - 22), (cx + rx * 0.81, top_y - 2), (cx - rx * 0.81, top_y - 2)], accent, rim=False, sw=lw * 0.5)
    if "crown" in acc:
        hsvg += pen.shape([(cx - 62, top_y + 18), (cx - 72, top_y - 52), (cx - 32, top_y - 16), (cx, top_y - 68), (cx + 32, top_y - 16), (cx + 72, top_y - 52), (cx + 62, top_y + 18)], "#f6b93b", gloss=True)
        hsvg += "".join(f'<circle cx="{cx + k:.0f}" cy="{top_y + 2:.0f}" r="7" fill="#e63946" stroke="{ink}" stroke-width="2.5"/>' for k in (-34, 0, 34))
    if "horns" in acc:
        for sx in (-1, 1):
            hsvg += pen.shape([(cx + sx * rx * 0.42, top_y + 22), (cx + sx * rx * 0.7, top_y - 30), (cx + sx * rx * 1.1, top_y - 74), (cx + sx * rx * 0.84, top_y + 30)], "#f1e3c6")
    if "antenna" in acc or p["species"] == "robot":
        hsvg += pen.brush([(cx, top_y + 6), (cx + 6, top_y - 40), (cx + 12, top_y - 70)], 6) + pen.shape(pen.blob(cx + 12, top_y - 82, 17, 17, n=10), accent, gloss=True)
    if hsvg:
        part("hair", "head", (cx, headCy), 14, hsvg)
    face = ""
    if "glasses" in acc or "sunglasses" in acc:
        sun = "sunglasses" in acc
        for sx in (-1, 1):
            gx = cx + sx * ex
            lens = pen.nid("l")
            face += (f'<defs><linearGradient id="{lens}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="{"#3a3f5c" if sun else "#dff3ff"}" stop-opacity="{0.95 if sun else 0.25}"/>'
                     f'<stop offset="1" stop-color="{"#0d0f1a" if sun else "#9fd3f0"}" stop-opacity="{0.98 if sun else 0.15}"/></linearGradient></defs>')
            face += f'<circle cx="{gx:.1f}" cy="{ey:.1f}" r="{er*1.38+8:.1f}" fill="url(#{lens})" stroke="{ink}" stroke-width="{lw*0.9:.1f}"/>'
            face += pen.brush([(gx - er * 0.8, ey - er * 0.2), (gx - er * 0.2, ey - er * 0.9)], 5, "#ffffff", opacity=0.75)
        face += pen.brush([(cx - ex + er + 8, ey - 2), (cx, ey - 8), (cx + ex - er - 8, ey - 2)], lw * 0.9)
    if "eyepatch" in acc:
        face += pen.shape(pen.blob(cx - ex, ey, er * 1.3 + 7, er * 1.2 + 7, n=10), _shade(ink, 1.2), sw=lw * 0.6) + pen.brush([(cx - rx, ey - 40), (cx + rx, ey - 72)], 5)
    if "earring" in acc:
        face += f'<circle cx="{cx + rx*0.98:.1f}" cy="{headCy + 42:.1f}" r="9" fill="none" stroke="#f6b93b" stroke-width="5"/>'
    if "cigar" in acc:
        face += f'<g transform="rotate(12 {cx+mw} {my})">' + pen.shape([(cx + mw * 0.5, my - 7), (cx + mw * 0.5 + 72, my - 7), (cx + mw * 0.5 + 72, my + 7), (cx + mw * 0.5, my + 7)], "#8a5a3b", sw=lw * 0.5) + \
            f'<rect x="{cx+mw*0.5+64:.1f}" y="{my-7:.1f}" width="10" height="14" fill="#ff6b35"/></g>'
    if face:
        part("face_acc", "head", (cx, ey), 15, face)

    reach = tw * 0.8 + 110 * h + 40
    bbox = [round(cx - reach, 1), round(max(0, headCy - ry - 130), 1), round(cx + reach, 1), float(footY + 8)]
    return {"id": char_id, "version": version, "name": name, "width": W, "height": H, "anchor": list(ANCHOR),
            "parts": parts, "meta": {"bbox": bbox, "params": p, "expressions": EXPRESSION_PRESETS, "visemes": VISEMES,
                                     "style_version": style.get("version", 1), "builder": "premium-v2"}}


def test_rig(style: dict) -> dict:
    """Rig geométrico de PRUEBA TÉCNICA (no es contenido de la serie)."""
    p = {"body": "round", "head": "round", "hair": "none", "eyes": "big", "nose": "none", "outfit": "tshirt", "species": "object",
         "skin": "#cccccc", "hair_color": "#333333", "top_color": "#888888", "bottom_color": "#555555", "accent_color": "#aaaaaa",
         "eye_color": "#777777", "height": 1.0, "head_scale": 1.0, "width": 1.0, "accessories": [], "seed": 1}
    return build_rig("test_geom", "TEST · geometría", p, style)
