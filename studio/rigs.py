"""Constructor paramétrico de rigs 2D (personajes por piezas).

Entrada: parámetros validados (schemas.character_params) + biblia visual.
Salida: rig JSON (piezas SVG con pivotes, jerarquía, orden z, variantes de ojos/cejas/boca).
Trazo con temblor de "dibujado a mano" determinista (seed), sombra cel recortada, contorno grueso.
Esqueleto estándar compatible con engine/src/rig/actions.ts.
"""
from __future__ import annotations

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


def _shade(hex_color: str, k: float) -> str:
    h = hex_color.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) for i in (0, 2, 4))
    f = (lambda c: max(0, min(255, int(c * k)))) if k < 1 else (lambda c: max(0, min(255, int(c + (255 - c) * (k - 1)))))
    return "#%02x%02x%02x" % (f(r), f(g), f(b))


class Pen:
    """Geometría con temblor de línea determinista."""

    def __init__(self, seed: int, jitter: float, ink: str, width: float):
        self.rng = random.Random(seed)
        self.j = jitter
        self.ink = ink
        self.w = width
        self.uid = 0

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
            if square > 0:  # superelipse
                e = 2 / (2 + square * 6)
                c = math.copysign(abs(c) ** e, c)
                s = math.copysign(abs(s) ** e, s)
            ky = top_squash if s < 0 else bottom_bulge
            pts.append((self.jit(cx + c * rx), self.jit(cy + s * ry * ky)))
        return pts

    def limb(self, x1, y1, x2, y2, w1, w2) -> list:
        ang = math.atan2(y2 - y1, x2 - x1)
        nx, ny = -math.sin(ang), math.cos(ang)
        pts = [(x1 + nx * w1 / 2, y1 + ny * w1 / 2), ((x1 + x2) / 2 + nx * (w1 + w2) / 4, (y1 + y2) / 2 + ny * (w1 + w2) / 4),
               (x2 + nx * w2 / 2, y2 + ny * w2 / 2), (x2 + math.cos(ang) * w2 / 2, y2 + math.sin(ang) * w2 / 2),
               (x2 - nx * w2 / 2, y2 - ny * w2 / 2), ((x1 + x2) / 2 - nx * (w1 + w2) / 4, (y1 + y2) / 2 - ny * (w1 + w2) / 4),
               (x1 - nx * w1 / 2, y1 - ny * w1 / 2), (x1 - math.cos(ang) * w1 / 2, y1 - math.sin(ang) * w1 / 2)]
        return [(self.jit(x, 0.6), self.jit(y, 0.6)) for x, y in pts]

    def shape(self, pts, fill, shadow=True, sw=None, closed=True, shadow_dx=-14, shadow_dy=10) -> str:
        d = self.smooth(pts, closed)
        sw = self.w if sw is None else sw
        out = ""
        if shadow and fill != "none":
            self.uid += 1
            cid = f"c{self.rng.randrange(1 << 30):x}{self.uid}"
            # sombra cel: forma oscura completa + forma clara desplazada, ambas recortadas a la silueta
            out += (f'<clipPath id="{cid}"><path d="{d}"/></clipPath>'
                    f'<g clip-path="url(#{cid})"><path d="{d}" fill="{_shade(fill, 0.68)}"/>'
                    f'<path d="{d}" fill="{fill}" transform="translate({shadow_dx:.1f} {-shadow_dy:.1f})"/></g>')
            out += f'<path d="{d}" fill="none" stroke="{self.ink}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"/>'
        else:
            out += f'<path d="{d}" fill="{fill}" stroke="{self.ink}" stroke-width="{sw}" stroke-linejoin="round" stroke-linecap="round"/>'
        return out

    def line(self, pts, sw=None, color=None) -> str:
        jp = [(self.jit(x, 0.5), self.jit(y, 0.5)) for x, y in pts]
        return f'<path d="{self.smooth(jp, closed=False)}" fill="none" stroke="{color or self.ink}" stroke-width="{sw or self.w}" stroke-linecap="round" stroke-linejoin="round"/>'


def build_rig(char_id: str, name: str, p: dict, style: dict, version: int = 1) -> dict:
    ink = style["outline"]["color"]
    pen = Pen(p.get("seed", 7), style["outline"].get("jitter", 1.5), ink, style["outline"]["width"])
    h, hs, wf = p["height"], p["head_scale"], p["width"]
    cx = W / 2
    footY = ANCHOR[1]
    legL = 190 * h
    hipY = footY - legL
    torsoH = 215 * h
    shY = hipY - torsoH
    R = 92 * hs
    headCy = shY - R * 0.78
    bw = {"pear": 1.0, "round": 1.25, "tall": 0.85, "stocky": 1.2, "blob": 1.35, "skinny": 0.7}[p["body"]] * wf
    tw = 85 * bw
    skin, top, bottom, accent, hairc = p["skin"], p["top_color"], p["bottom_color"], p["accent_color"], p["hair_color"]
    if p["species"] == "robot":
        skin = "#9aa5b1"
    parts: list[dict] = []

    def part(pid, parent, pivot, z, svg=None, variants=None, default=None):
        d = {"id": pid, "parent": parent, "pivot": [round(pivot[0], 1), round(pivot[1], 1)], "z": z}
        if svg is not None:
            d["svg"] = svg
        if variants is not None:
            d["variants"] = variants
            d["defaultVariant"] = default
        parts.append(d)

    # --- piernas (z bajo el torso)
    for side, sx, z in (("L", -1, 2), ("R", 1, 3)):
        hx = cx + sx * tw * 0.45
        kneeY = hipY + legL * 0.5
        thick = 46 * min(1.3, bw)
        up = pen.shape(pen.limb(hx, hipY - 10, hx, kneeY, thick, thick * 0.85), bottom)
        shoe_pts = pen.blob(hx + sx * 22, footY - 16, 46, 20, n=10, square=0.4)
        lo = pen.shape(pen.limb(hx, kneeY, hx, footY - 20, thick * 0.85, thick * 0.7), bottom) + pen.shape(shoe_pts, ink if p["outfit"] != "robe" else "#3a2f2a", shadow=False)
        part(f"leg{side}_up", "torso", (hx, hipY), z, up)
        part(f"leg{side}_lo", f"leg{side}_up", (hx, kneeY), z, lo)

    # --- torso
    body = p["body"]
    if body in ("round", "blob"):
        tpts = pen.blob(cx, (shY + hipY) / 2 + 10, tw, torsoH * 0.6, n=14, bottom_bulge=1.1)
    elif body == "pear":
        tpts = [(cx - tw * 0.55, shY + 10), (cx, shY - 6), (cx + tw * 0.55, shY + 10), (cx + tw * 1.05, hipY - 30),
                (cx + tw * 0.85, hipY + 18), (cx, hipY + 30), (cx - tw * 0.85, hipY + 18), (cx - tw * 1.05, hipY - 30)]
        tpts = [(pen.jit(x), pen.jit(y)) for x, y in tpts]
    else:
        sq = 0.6 if body in ("stocky",) else 0.35
        tpts = pen.blob(cx, (shY + hipY) / 2 + 6, tw * (1.05 if body == "stocky" else 0.9), torsoH * 0.56, n=14, square=sq)
    torso_svg = pen.shape(tpts, top)
    out = p["outfit"]
    if out == "suit":
        torso_svg += pen.shape([(cx - 16, shY + 4), (cx, shY + 70), (cx + 16, shY + 4)], "#f5f0e6", shadow=False, sw=4)
        torso_svg += pen.line([(cx - 40, shY + 4), (cx, shY + 120), (cx + 40, shY + 4)], sw=5)
        torso_svg += "".join(f'<circle cx="{cx}" cy="{shY + 140 + k * 36}" r="6" fill="{ink}"/>' for k in range(2))
    elif out == "lab":
        torso_svg += pen.line([(cx, shY + 10), (cx, hipY + 20)], sw=5) + pen.line([(cx - 30, shY + 6), (cx, shY + 80), (cx + 30, shY + 6)], sw=5)
    elif out == "uniform":
        torso_svg += pen.shape(pen.blob(cx + tw * 0.45, shY + 70, 18, 14, n=8), accent, shadow=False, sw=4)
        torso_svg += pen.line([(cx - tw * 0.8, hipY - 40), (cx + tw * 0.8, hipY - 40)], sw=10, color=ink)
    elif out == "tank":
        torso_svg += pen.line([(cx - 30, shY + 2), (cx, shY + 40), (cx + 30, shY + 2)], sw=5)
    elif out in ("dress", "robe"):
        torso_svg += pen.shape([(cx - tw * 0.9, hipY - 40), (cx + tw * 0.9, hipY - 40), (cx + tw * 1.3, hipY + legL * 0.55),
                                (cx - tw * 1.3, hipY + legL * 0.55)], top)
    if "tie" in p["accessories"]:
        torso_svg += pen.shape([(cx - 12, shY + 14), (cx + 12, shY + 14), (cx + 16, shY + 120), (cx, shY + 140), (cx - 16, shY + 120)], accent, shadow=False, sw=4)
    part("torso", None, (cx, hipY), 5, torso_svg)

    # --- brazos (L detrás del torso, R delante)
    for side, sx, z in (("L", -1, 1), ("R", 1, 8)):
        shx = cx + sx * tw * 0.8
        ua = 105 * h
        elbow = (shx + sx * 18, shY + 20 + ua)
        hand = (elbow[0] + sx * 6, elbow[1] + ua * 0.95)
        thick = 34 * min(1.25, bw)
        up = pen.shape(pen.limb(shx, shY + 20, *elbow, thick, thick * 0.85), top)
        lo = pen.shape(pen.limb(*elbow, *hand, thick * 0.85, thick * 0.75), top if out != "tank" else skin)
        lo += pen.shape(pen.blob(hand[0], hand[1] + 14, 24, 22, n=9), skin, shadow=False)  # manopla
        lo += pen.line([(hand[0] - sx * 4, hand[1] + 6), (hand[0] - sx * 20, hand[1] + 16)], sw=4)
        part(f"arm{side}_up", "torso", (shx, shY + 20), z, up)
        part(f"arm{side}_lo", f"arm{side}_up", elbow, z, lo)

    # --- cabeza
    hd = p["head"]
    shapes = {"round": dict(n=14), "oval": dict(n=14), "square": dict(n=14, square=0.8), "egg": dict(n=14, top_squash=1.15, bottom_bulge=0.85),
              "long": dict(n=14), "bean": dict(n=14, bottom_bulge=1.2)}
    rx = R * {"oval": 0.85, "long": 0.75, "bean": 1.05}.get(hd, 1.0)
    ry = R * {"oval": 1.1, "long": 1.3, "egg": 1.05}.get(hd, 1.0)
    if p["species"] == "robot":
        shapes[hd] = dict(n=14, square=1.0)
    neck = pen.shape(pen.limb(cx, shY + 20, cx, headCy + ry * 0.6, 36, 36), skin, shadow=False)
    head_svg = neck + pen.shape(pen.blob(cx, headCy, rx, ry, **shapes[hd]), skin)
    # orejas
    for sx in (-1, 1):
        if p["species"] != "robot":
            head_svg += pen.shape(pen.blob(cx + sx * rx * 0.98, headCy + 8, 16, 22, n=8), skin, shadow=False, sw=5)
    nose = p["nose"]
    ny = headCy + ry * 0.15
    if nose == "round":
        head_svg += pen.shape(pen.blob(cx + 6, ny, 18, 15, n=9), _shade(skin, 0.85), shadow=False, sw=5)
    elif nose == "long":
        head_svg += pen.shape([(cx, ny - 30), (cx + 50, ny + 8), (cx + 4, ny + 14)], _shade(skin, 0.88), shadow=False, sw=5)
    elif nose == "pointy":
        head_svg += pen.line([(cx + 2, ny - 20), (cx + 20, ny + 8), (cx + 2, ny + 10)], sw=5)
    elif nose == "pig":
        head_svg += pen.shape(pen.blob(cx, ny, 22, 15, n=9), "#f29ca3", shadow=False, sw=5)
        head_svg += f'<circle cx="{cx-7}" cy="{ny}" r="4" fill="{ink}"/><circle cx="{cx+7}" cy="{ny}" r="4" fill="{ink}"/>'
    if "mustache" in p["accessories"]:
        head_svg += pen.shape([(cx - 46, ny + 30), (cx - 8, ny + 16), (cx, ny + 22), (cx + 8, ny + 16), (cx + 46, ny + 30), (cx, ny + 36)], hairc, shadow=False, sw=4)
    if "beard" in p["accessories"]:
        head_svg += pen.shape([(cx - rx * 0.85, headCy + ry * 0.25), (cx + rx * 0.85, headCy + ry * 0.25), (cx + rx * 0.5, headCy + ry * 1.2),
                               (cx, headCy + ry * 1.45), (cx - rx * 0.5, headCy + ry * 1.2)], hairc, shadow=False, sw=5)
    if "bandage" in p["accessories"]:
        head_svg += f'<g transform="rotate(-20 {cx - rx*0.4} {headCy - ry*0.5})"><rect x="{cx - rx*0.4 - 24}" y="{headCy - ry*0.5 - 8}" width="48" height="16" fill="#f5f0e6" stroke="{ink}" stroke-width="4"/></g>'
    part("head", "torso", (cx, shY + 10), 10, head_svg)

    # --- ojos (variantes)
    ex, ey = rx * 0.4, headCy - ry * 0.12
    er = {"big": R * 0.24, "dots": R * 0.09, "tired": R * 0.2, "wild": R * 0.26}[p["eyes"]]
    white = "#fbf7ee"

    def eye_pair(kind: str) -> str:
        s = ""
        for i, sx in enumerate((-1, 1)):
            x = cx + sx * ex
            r = er * (1.25 if kind == "wide" else 1.0) * (1.25 if (kind == "crazy" and i == 0) else 0.8 if kind == "crazy" else 1.0)
            if p["eyes"] == "dots" and kind in ("open", "wide", "half", "angry", "sad"):
                s += f'<ellipse cx="{x:.1f}" cy="{ey:.1f}" rx="{r*(1.3 if kind=="wide" else 1):.1f}" ry="{r*(1.7 if kind!="half" else 0.8):.1f}" fill="{ink}"/>'
                continue
            if kind == "closed":
                s += pen.line([(x - r, ey), (x, ey + r * 0.35), (x + r, ey)], sw=6)
                continue
            if kind == "happy":
                s += pen.line([(x - r, ey + r * 0.3), (x, ey - r * 0.5), (x + r, ey + r * 0.3)], sw=6)
                continue
            s += f'<ellipse cx="{x:.1f}" cy="{ey:.1f}" rx="{r:.1f}" ry="{r*1.12:.1f}" fill="{white}" stroke="{ink}" stroke-width="5"/>'
            pr = r * (0.28 if kind in ("wide", "crazy") else 0.42)
            px = x + (sx * -r * 0.12 if kind != "crazy" else sx * r * 0.2)
            s += f'<circle cx="{px:.1f}" cy="{ey + r*0.08:.1f}" r="{pr:.1f}" fill="{ink}"/>'
            if kind in ("half",) or p["eyes"] == "tired":
                s += f'<path d="M{x-r-3:.1f},{ey:.1f} A{r+3:.1f},{r*1.12+3:.1f} 0 0 1 {x+r+3:.1f},{ey:.1f} Z" fill="{_shade(skin,0.9)}" stroke="{ink}" stroke-width="5"/>'
            elif kind == "angry":
                inner = x - sx * r
                s += f'<path d="M{x - r - 4:.1f},{ey - r*1.3:.1f} L{x + r + 4:.1f},{ey - r*1.3:.1f} L{(x + r + 4) if sx < 0 else (x - r - 4):.1f},{ey - r*0.1:.1f} Z" fill="{skin}" stroke="none"/>'
                s += pen.line([(x - r * sx * -1 - sx * 2, ey - r * 0.9), (inner, ey - r * 0.15)], sw=5)
            elif kind == "sad":
                s += f'<path d="M{x - r - 4:.1f},{ey - r*1.3:.1f} L{x + r + 4:.1f},{ey - r*1.3:.1f} L{(x - r - 4) if sx < 0 else (x + r + 4):.1f},{ey - r*0.15:.1f} Z" fill="{skin}" stroke="none"/>'
        return s

    eye_kinds = ["open", "half", "closed", "wide", "angry", "sad", "happy", "crazy"]
    part("eyes", "head", (cx, ey), 12, variants={k: eye_pair(k) for k in eye_kinds}, default="open")

    # --- cejas
    by = ey - er * 1.5 - 10
    bl = max(26, er * 1.1)

    def brows(kind: str) -> str:
        s = ""
        for sx in (-1, 1):
            x = cx + sx * ex
            inner, outer = x - sx * bl * 0.8, x + sx * bl * 0.8
            dy = {"neutral": (0, 0), "angry": (14, -10), "sad": (-12, 8), "raised": (-14, -14), "skeptical": ((-18, -18) if sx > 0 else (6, 6))}[kind]
            s += pen.line([(inner, by + dy[0]), (x, by - 4 + (dy[0] + dy[1]) / 2), (outer, by + dy[1])], sw=9, color=hairc if p["hair"] != "none" else ink)
        return s

    part("brows", "head", (cx, by), 13, variants={k: brows(k) for k in ("neutral", "angry", "sad", "raised", "skeptical")}, default="neutral")

    # --- boca (visemas Rhubarb A-H, X + emociones)
    my = headCy + ry * 0.5
    mw = rx * 0.42
    lip = "#7a2630"

    def mouth(k: str) -> str:
        if k == "X":
            return pen.line([(cx - mw * 0.7, my), (cx, my + 4), (cx + mw * 0.7, my)], sw=6)
        if k == "A":
            return pen.line([(cx - mw * 0.6, my), (cx + mw * 0.6, my)], sw=8)
        shapes = {
            "B": (mw * 0.75, 12, True), "C": (mw * 0.8, 26, False), "D": (mw, 42, False), "E": (mw * 0.5, 30, False),
            "F": (mw * 0.28, 14, False), "G": (mw * 0.7, 14, True), "H": (mw * 0.75, 30, False),
        }
        if k in shapes:
            w2, hh, teeth = shapes[k]
            s = f'<ellipse cx="{cx:.1f}" cy="{my + hh*0.3:.1f}" rx="{w2:.1f}" ry="{hh/2+4:.1f}" fill="{lip}" stroke="{ink}" stroke-width="5"/>'
            if teeth or k in ("C", "D"):
                s += f'<rect x="{cx - w2*0.7:.1f}" y="{my + hh*0.3 - hh/2 - 2:.1f}" width="{w2*1.4:.1f}" height="{max(6, hh*0.28):.1f}" rx="3" fill="#fbf7ee"/>'
            if k == "H":
                s += f'<ellipse cx="{cx:.1f}" cy="{my + hh*0.55:.1f}" rx="{w2*0.5:.1f}" ry="8" fill="#e86a7a"/>'
            return s
        if k == "smile":
            return pen.line([(cx - mw, my - 8), (cx - mw * 0.4, my + 14), (cx + mw * 0.4, my + 14), (cx + mw, my - 8)], sw=7)
        if k == "frown":
            return pen.line([(cx - mw * 0.9, my + 12), (cx, my - 4), (cx + mw * 0.9, my + 12)], sw=7)
        if k == "smirk":
            return pen.line([(cx - mw * 0.7, my + 6), (cx + mw * 0.3, my + 6), (cx + mw * 0.9, my - 10)], sw=7)
        if k == "grin":
            return (f'<path d="M{cx-mw:.1f},{my-6:.1f} Q{cx:.1f},{my+50:.1f} {cx+mw:.1f},{my-6:.1f} Z" fill="#fbf7ee" stroke="{ink}" stroke-width="6"/>'
                    + pen.line([(cx - mw * 0.8, my + 6), (cx + mw * 0.8, my + 6)], sw=3))
        if k == "scream":
            return f'<ellipse cx="{cx:.1f}" cy="{my+18:.1f}" rx="{mw*0.7:.1f}" ry="38" fill="{lip}" stroke="{ink}" stroke-width="6"/><ellipse cx="{cx:.1f}" cy="{my+40:.1f}" rx="{mw*0.4:.1f}" ry="10" fill="#e86a7a"/>'
        return ""

    part("mouth", "head", (cx, my), 12, variants={k: mouth(k) for k in VISEMES + ["smile", "frown", "smirk", "grin", "scream"]}, default="X")

    # --- pelo y accesorios de cabeza
    top_y = headCy - ry
    hair = p["hair"]
    hsvg = ""
    if hair == "spiky":
        pts = []
        for i in range(9):
            a = math.pi + (i / 8) * math.pi
            r = rx * (1.35 if i % 2 else 1.02)
            pts.append((cx + math.cos(a) * r, headCy - ry * 0.25 + math.sin(a) * ry * (1.3 if i % 2 else 0.95)))
        pts += [(cx + rx * 0.9, headCy - ry * 0.3), (cx - rx * 0.9, headCy - ry * 0.3)]
        hsvg = pen.shape(pts, hairc, shadow=False)
    elif hair in ("bob", "long", "slick", "curly", "bun"):
        k = {"bob": 1.1, "long": 1.9, "slick": 0.7, "curly": 1.0, "bun": 0.75}[hair]
        pts = pen.blob(cx, headCy - ry * 0.35, rx * 1.12, ry * 0.85, n=16, bottom_bulge=k * 0.6)
        hsvg = pen.shape([pt for pt in pts if pt[1] < headCy + ry * (k - 0.6)] or pts, hairc, shadow=False)
        if hair == "curly":
            hsvg += "".join(pen.shape(pen.blob(cx + math.cos(a) * rx * 0.95, headCy - ry * 0.45 + math.sin(a) * ry * 0.75, 30, 30, n=8), hairc, shadow=False, sw=5)
                            for a in [math.pi + i * math.pi / 6 for i in range(7)])
        if hair == "bun":
            hsvg += pen.shape(pen.blob(cx, top_y - 30, 44, 38, n=10), hairc, shadow=False)
    elif hair == "mohawk":
        hsvg = pen.shape([(cx - 22, top_y + 30), (cx - 30, top_y - 70), (cx, top_y - 110), (cx + 30, top_y - 70), (cx + 22, top_y + 30)], accent)
    elif hair == "bald_ring":
        for sx in (-1, 1):
            hsvg += pen.shape(pen.blob(cx + sx * rx * 0.92, headCy - 6, 26, 46, n=9), hairc, shadow=False, sw=5)
    acc = p["accessories"]
    if "hat" in acc:
        hsvg += pen.shape([(cx - rx * 1.4, top_y + 26), (cx + rx * 1.4, top_y + 26), (cx + rx * 1.3, top_y + 6), (cx - rx * 1.3, top_y + 6)], ink, shadow=False)
        hsvg += pen.shape([(cx - rx * 0.8, top_y + 10), (cx - rx * 0.7, top_y - 110), (cx + rx * 0.7, top_y - 110), (cx + rx * 0.8, top_y + 10)], ink, shadow=False)
        hsvg += f'<rect x="{cx - rx*0.76:.1f}" y="{top_y - 20:.1f}" width="{rx*1.52:.1f}" height="18" fill="{accent}"/>'
    if "crown" in acc:
        hsvg += pen.shape([(cx - 60, top_y + 18), (cx - 70, top_y - 50), (cx - 30, top_y - 15), (cx, top_y - 65), (cx + 30, top_y - 15), (cx + 70, top_y - 50), (cx + 60, top_y + 18)], "#f2b134", shadow=False)
    if "horns" in acc:
        for sx in (-1, 1):
            hsvg += pen.shape([(cx + sx * rx * 0.45, top_y + 20), (cx + sx * rx * 1.05, top_y - 70), (cx + sx * rx * 0.8, top_y + 30)], "#efe3c8", shadow=False)
    if "antenna" in acc or p["species"] == "robot":
        hsvg += pen.line([(cx, top_y + 4), (cx + 10, top_y - 70)], sw=6) + pen.shape(pen.blob(cx + 10, top_y - 80, 16, 16, n=8), accent, shadow=False, sw=5)
    if hsvg:
        part("hair", "head", (cx, headCy), 14, hsvg)
    face = ""
    if "glasses" in acc or "sunglasses" in acc:
        fill = ink if "sunglasses" in acc else "none"
        face += "".join(f'<circle cx="{cx + sx*ex:.1f}" cy="{ey:.1f}" r="{er*1.35+8:.1f}" fill="{fill}" fill-opacity="0.9" stroke="{ink}" stroke-width="6"/>' for sx in (-1, 1))
        face += pen.line([(cx - ex + er + 8, ey), (cx + ex - er - 8, ey)], sw=6)
    if "eyepatch" in acc:
        face += f'<ellipse cx="{cx - ex:.1f}" cy="{ey:.1f}" rx="{er*1.3+6:.1f}" ry="{er*1.2+6:.1f}" fill="{ink}"/>' + pen.line([(cx - rx, ey - 40), (cx + rx, ey - 70)], sw=5)
    if "earring" in acc:
        face += f'<circle cx="{cx + rx*0.98:.1f}" cy="{headCy + 40:.1f}" r="9" fill="none" stroke="#f2b134" stroke-width="5"/>'
    if "cigar" in acc:
        face += f'<g transform="rotate(12 {cx+mw} {my})"><rect x="{cx+mw*0.5:.1f}" y="{my-6:.1f}" width="70" height="14" rx="5" fill="#7b4a2a" stroke="{ink}" stroke-width="4"/><rect x="{cx+mw*0.5+62:.1f}" y="{my-6:.1f}" width="10" height="14" fill="#d7263d"/></g>'
    if face:
        part("face_acc", "head", (cx, ey), 15, face)

    reach = tw * 0.8 + 110 * h + 40
    bbox = [round(cx - reach, 1), round(max(0, headCy - ry - 130), 1), round(cx + reach, 1), float(footY + 6)]
    return {"id": char_id, "version": version, "name": name, "width": W, "height": H, "anchor": list(ANCHOR),
            "parts": parts, "meta": {"bbox": bbox, "params": p, "expressions": EXPRESSION_PRESETS, "visemes": VISEMES,
                                     "style_version": style.get("version", 1)}}


def test_rig(style: dict) -> dict:
    """Rig geométrico de PRUEBA TÉCNICA (no es contenido de la serie)."""
    p = {"body": "round", "head": "round", "hair": "none", "eyes": "big", "nose": "none", "outfit": "tshirt", "species": "object",
         "skin": "#cccccc", "hair_color": "#333333", "top_color": "#888888", "bottom_color": "#555555", "accent_color": "#aaaaaa",
         "height": 1.0, "head_scale": 1.0, "width": 1.0, "accessories": [], "seed": 1}
    return build_rig("test_geom", "TEST · geometría", p, style)
