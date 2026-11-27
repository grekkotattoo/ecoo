"""Constructor de personajes ESTILO URBANO (v4): caricatura extrema, básica y gráfica.

Formas geométricas brutas, color plano + UNA sombra dura, contorno negro grueso uniforme, extremidades
"fideo", manos y zapatillas enormes, caras mínimas y cínicas. Sin degradados, sin desenfoques, sin texturas
→ render muy barato. Mismo esqueleto y variantes que el resto del sistema (actions.ts, expresiones, visemas).
"""
from __future__ import annotations

import hashlib
import math

from .rigs import ANCHOR, EXPRESSION_PRESETS, VISEMES, W, H, _shade  # noqa: F401  (re-export)

INK = "#0d0d0d"
WHITE = "#f4f1ea"


class Flat:
    def __init__(self, uid: str, lw: float):
        self.uid, self.lw, self.n = uid, lw, 0

    def nid(self) -> str:
        self.n += 1
        return f"{self.uid}{self.n}"

    @staticmethod
    def d(pts, closed=True) -> str:
        return "M" + " L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + (" Z" if closed else "")

    def poly(self, pts, fill, shadow=True, lw=None, sdx=0.16) -> str:
        """Polígono plano con contorno grueso y sombra dura (lado derecho)."""
        lw = self.lw if lw is None else lw
        d = self.d(pts)
        out = f'<path d="{d}" fill="{fill}"/>'
        if shadow:
            xs = [p[0] for p in pts]
            ys = [p[1] for p in pts]
            w, h = max(xs) - min(xs), max(ys) - min(ys)
            c = self.nid()
            out += (f'<clipPath id="{c}"><path d="{d}"/></clipPath><g clip-path="url(#{c})">'
                    f'<path d="{d}" fill="{_shade(fill, 0.72)}"/><path d="{d}" fill="{fill}" transform="translate({-w * sdx:.1f} {-h * 0.02:.1f})"/></g>')
        return out + f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{lw}" stroke-linejoin="round"/>'

    def ell(self, cx, cy, rx, ry, fill, shadow=True, lw=None) -> str:
        n = 28
        pts = [(cx + math.cos(i / n * math.tau) * rx, cy + math.sin(i / n * math.tau) * ry) for i in range(n)]
        return self.poly(pts, fill, shadow, lw)

    def limb(self, pts, w, fill, lw=None) -> str:
        """Extremidad "fideo": doble trazo (contorno + relleno), barato y con curva."""
        lw = self.lw if lw is None else lw
        d = self.d(pts, closed=False)
        return (f'<path d="{d}" fill="none" stroke="{INK}" stroke-width="{w + 2 * lw:.1f}" stroke-linecap="round" stroke-linejoin="round"/>'
                f'<path d="{d}" fill="none" stroke="{fill}" stroke-width="{w:.1f}" stroke-linecap="round" stroke-linejoin="round"/>')

    def line(self, pts, w, color=INK) -> str:
        return f'<path d="{self.d(pts, closed=False)}" fill="none" stroke="{color}" stroke-width="{w:.1f}" stroke-linecap="round" stroke-linejoin="round"/>'


# ---------------------------------------------------------------- tatuajes
TAT_RED, TAT_GREEN, TAT_YEL, TAT_NAVY = "#d7192f", "#1f8a3a", "#f5c400", "#1f3a63"


def _esc(t: str) -> str:
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")


def _motif(m: str, s: float, col: str, lw: float, text: str = "") -> str:
    """Motivo de tatuaje centrado en (0,0), 'arriba' = -y, tamaño ~s. Trazo fino de tatuador."""
    sw = max(1.6, lw * 0.32)
    st = f'stroke="{INK}" stroke-width="{sw:.1f}" stroke-linejoin="round"'
    if m == "heart":
        out = (f'<path d="M0,{s*.42:.1f} C{-s*.95:.1f},{-s*.12:.1f} {-s*.42:.1f},{-s*.78:.1f} 0,{-s*.28:.1f} '
               f'C{s*.42:.1f},{-s*.78:.1f} {s*.95:.1f},{-s*.12:.1f} 0,{s*.42:.1f} Z" fill="{TAT_RED}" {st}/>')
    elif m == "star":
        import math as _m
        pts = " ".join(f"{_m.cos(_m.radians(-90 + i*36))*(s*.55 if i % 2 == 0 else s*.23):.1f},{_m.sin(_m.radians(-90 + i*36))*(s*.55 if i % 2 == 0 else s*.23):.1f}" for i in range(10))
        out = f'<polygon points="{pts}" fill="{col}" {st}/>'
    elif m == "anchor":
        a = f'stroke="{col}" stroke-width="{sw*1.6:.1f}" fill="none" stroke-linecap="round"'
        out = (f'<circle cx="0" cy="{-s*.42:.1f}" r="{s*.1:.1f}" {a}/><path d="M0,{-s*.32:.1f} L0,{s*.45:.1f} M{-s*.25:.1f},{-s*.18:.1f} L{s*.25:.1f},{-s*.18:.1f} '
               f'M{-s*.4:.1f},{s*.12:.1f} Q{-s*.3:.1f},{s*.5:.1f} 0,{s*.48:.1f} Q{s*.3:.1f},{s*.5:.1f} {s*.4:.1f},{s*.12:.1f}" {a}/>')
    elif m == "skull":
        out = (f'<path d="M{-s*.42:.1f},{-s*.05:.1f} A{s*.42:.1f},{s*.42:.1f} 0 1 1 {s*.42:.1f},{-s*.05:.1f} L{s*.26:.1f},{s*.18:.1f} L{s*.22:.1f},{s*.42:.1f} '
               f'L{-s*.22:.1f},{s*.42:.1f} L{-s*.26:.1f},{s*.18:.1f} Z" fill="{WHITE}" {st}/>'
               f'<circle cx="{-s*.17:.1f}" cy="{-s*.06:.1f}" r="{s*.12:.1f}" fill="{INK}"/><circle cx="{s*.17:.1f}" cy="{-s*.06:.1f}" r="{s*.12:.1f}" fill="{INK}"/>'
               f'<path d="M{-s*.1:.1f},{s*.42:.1f} L{-s*.1:.1f},{s*.28:.1f} M{s*.1:.1f},{s*.42:.1f} L{s*.1:.1f},{s*.28:.1f}" stroke="{INK}" stroke-width="{sw:.1f}"/>')
    elif m == "rose":
        out = (f'<path d="M{-s*.15:.1f},{s*.2:.1f} Q{-s*.55:.1f},{s*.55:.1f} {-s*.5:.1f},{s*.15:.1f} Z M{s*.15:.1f},{s*.2:.1f} Q{s*.55:.1f},{s*.55:.1f} {s*.5:.1f},{s*.15:.1f} Z" fill="{TAT_GREEN}" {st}/>'
               f'<circle cx="0" cy="{-s*.08:.1f}" r="{s*.36:.1f}" fill="{TAT_RED}" {st}/>'
               f'<path d="M{-s*.15:.1f},{-s*.05:.1f} Q0,{-s*.32:.1f} {s*.16:.1f},{-s*.08:.1f} Q0,{s*.15:.1f} {-s*.08:.1f},{-s*.1:.1f}" fill="none" stroke="{INK}" stroke-width="{sw:.1f}"/>')
    elif m == "swallow":
        out = (f'<path d="M{-s*.55:.1f},{-s*.25:.1f} L{-s*.05:.1f},{-s*.02:.1f} L{s*.25:.1f},{-s*.3:.1f} L{s*.55:.1f},{-s*.22:.1f} L{s*.3:.1f},{s*.02:.1f} '
               f'L{s*.5:.1f},{s*.45:.1f} L{s*.08:.1f},{s*.18:.1f} L{-s*.3:.1f},{s*.3:.1f} Z" fill="{TAT_NAVY}" {st}/>'
               f'<path d="M{-s*.05:.1f},{-s*.02:.1f} L{s*.3:.1f},{s*.02:.1f} L{s*.08:.1f},{s*.18:.1f} Z" fill="{TAT_RED}"/>')
    elif m == "dot":
        out = f'<circle cx="0" cy="0" r="{max(2.0, s*.12):.1f}" fill="{col}"/>'
    elif m == "flash":
        out = (f'<polygon points="{s*.12:.1f},{-s*.55:.1f} {-s*.3:.1f},{s*.05:.1f} {-s*.02:.1f},{s*.05:.1f} {-s*.14:.1f},{s*.55:.1f} {s*.32:.1f},{-s*.08:.1f} {s*.03:.1f},{-s*.08:.1f}" '
               f'fill="{TAT_YEL}" {st}/>')
    elif m == "teardrop":
        out = f'<path d="M0,{-s*.45:.1f} Q{s*.32:.1f},{s*.05:.1f} 0,{s*.3:.1f} Q{-s*.32:.1f},{s*.05:.1f} 0,{-s*.45:.1f} Z" fill="{col}"/>'
    else:
        out = ""
    if text and m in ("heart", "anchor", "rose", "skull", "swallow", "star"):
        fs = s * 0.34
        wdt = min(s * 1.5, len(text) * fs * 0.62 + 6)
        out += (f'<rect x="{-wdt/2:.1f}" y="{s*.05:.1f}" width="{wdt:.1f}" height="{fs*1.15:.1f}" fill="{WHITE}" {st}/>'
                f'<text x="0" y="{s*.05 + fs*.95:.1f}" text-anchor="middle" font-family="Anton, Impact, sans-serif" font-size="{fs:.1f}" fill="{INK}" '
                f'textLength="{wdt - 4:.1f}" lengthAdjust="spacingAndGlyphs" style="transform-box:fill-box;transform-origin:center;transform:scaleX(var(--tatflip,1))">{_esc(text)}</text>')
    return out


def _ink_text(x, y, txt, fs, tl, col, anchor="middle") -> str:
    """Letras de tatuaje: bloque condensado con trazo del mismo color (tinta asentada, legible en pequeño)."""
    return (f'<text x="{x:.1f}" y="{y:.1f}" text-anchor="{anchor}" font-family="Anton, Impact, sans-serif" font-weight="700" '
            f'font-size="{fs:.1f}" fill="{col}" stroke="{col}" stroke-width="{max(0.4, fs*0.02):.1f}" stroke-linejoin="round" '
            f'textLength="{tl:.1f}" lengthAdjust="spacingAndGlyphs" opacity="0.95" '
            f'style="transform-box:fill-box;transform-origin:center;transform:scaleX(var(--tatflip,1))">{_esc(txt)}</text>')


def _barcode(x0, x1, h, col) -> str:
    n, out = 11, ""
    for i in range(n):
        x = x0 + i * (x1 - x0) / n
        out += f'<rect x="{x:.1f}" y="{-h/2:.1f}" width="{(x1 - x0) / n * (0.75 if i % 3 == 0 else 0.4):.1f}" height="{h:.1f}" fill="{col}"/>'
    return out


def tattoo_on_limb(p0, p1, w: float, t: dict, lw: float, f: "Flat") -> str:
    """Tatuaje sobre un segmento de extremidad: marco local x = a lo largo del miembro (hombro→mano), y = a través."""
    L = math.dist(p0, p1)
    ang = math.degrees(math.atan2(p1[1] - p0[1], p1[0] - p0[0]))
    m, col, txt = t["motif"], t["color"], t.get("text", "")
    inner = ""
    if m == "tribal":
        # espina central + púas alternas afiladas: lectura de "tribal" incluso en plano general
        x0, x1 = L * 0.08, L * 0.92
        inner += (f'<path d="M{x0:.1f},0 Q{(x0+x1)/2:.1f},{-w*.18:.1f} {x1:.1f},0 Q{(x0+x1)/2:.1f},{w*.18:.1f} {x0:.1f},0 Z" fill="{col}"/>')
        k = 5
        step = (x1 - x0) / k
        for i in range(k):
            a = x0 + i * step
            sg = -1 if i % 2 == 0 else 1
            inner += (f'<path d="M{a:.1f},0 Q{a + step*.35:.1f},{sg*w*.15:.1f} {a + step*.9:.1f},{sg*w*.6:.1f} '
                      f'Q{a + step*.55:.1f},{sg*w*.2:.1f} {a + step*.75:.1f},0 Z" fill="{col}"/>')
    elif m == "barcode":
        inner = _barcode(L * 0.28, L * 0.72, w * 0.8, col)
    elif m == "text":
        fs = min(w * 0.88, L * 0.86 / max(1, len(txt) * 0.46))  # sin aplastar letras: si es largo, más pequeño
        inner = _ink_text(L * .5, fs * .36, txt, fs, min(L * 0.86, len(txt) * fs * 0.52), col)
    elif txt:
        # motivo arriba + leyenda a lo largo del brazo (no se recorta como una banda)
        inner = f'<g transform="translate({L*.24:.1f} 0) rotate(-90)">{_motif(m, w * 1.1, col, lw)}</g>'
        fs = min(w * 0.7, L * 0.45 / max(1, len(txt) * 0.46))
        inner += _ink_text(L * .64, fs * .36, txt, fs, min(L * 0.5, max(fs, len(txt) * fs * 0.58)), "#0d0d0d" if col == "#0d0d0d" else col)
    else:
        inner = f'<g transform="translate({L*.5:.1f} 0) rotate(-90)">{_motif(m, w * 1.15, col, lw)}</g>'
    c = f.nid()
    return (f'<g transform="translate({p0[0]:.1f} {p0[1]:.1f}) rotate({ang:.2f})"><clipPath id="{c}"><rect x="{-w*.1:.1f}" y="{-w/2:.1f}" width="{L + w*.2:.1f}" height="{w:.1f}"/></clipPath>'
            f'<g clip-path="url(#{c})">{inner}</g></g>')


def tattoo_at(x: float, y: float, s: float, t: dict, lw: float) -> str:
    """Tatuaje 'plano' (mano, cara, cuello): motivo derecho, código de barras o texto horizontal."""
    if t["motif"] == "text":
        fs = s * 0.6
        return _ink_text(x, y + fs * .36, t["text"], fs, min(s * 1.7, max(fs, len(t["text"]) * fs * 0.58)), t["color"])
    if t["motif"] == "barcode":
        return f'<g transform="translate({x:.1f} {y:.1f})">{_barcode(-s*.6, s*.6, s*.7, t["color"])}</g>'
    m = {"tribal": "flash"}.get(t["motif"], t["motif"])
    return f'<g transform="translate({x:.1f} {y:.1f})">{_motif(m, s, t["color"], lw)}</g>'


def rrect(x0, y0, x1, y1, r=0.0, n=4):
    """Rectángulo con esquinas achaflanadas (look gráfico)."""
    r = min(r, (x1 - x0) / 2, (y1 - y0) / 2)
    if r <= 0:
        return [(x0, y0), (x1, y0), (x1, y1), (x0, y1)]
    pts = []
    for cx, cy, a0 in ((x1 - r, y0 + r, -90), (x1 - r, y1 - r, 0), (x0 + r, y1 - r, 90), (x0 + r, y0 + r, 180)):
        for k in range(n + 1):
            a = math.radians(a0 + 90 * k / n)
            pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    return pts


def build_rig(char_id: str, name: str, p: dict, style: dict, version: int = 1) -> dict:
    lw = style["outline"]["width"]
    f = Flat("u" + hashlib.sha1(f"{char_id}:{p.get('seed', 7)}".encode()).hexdigest()[:6], lw)
    h, hs, wf = p["height"], p["head_scale"], p["width"]
    cx, footY = 250.0, float(ANCHOR[1])
    skin, top, bottom, acc, hairc = p["skin"], p["top_color"], p["bottom_color"], p["accent_color"], p["hair_color"]
    body = p["body"]
    # proporciones extremas por tipo de cuerpo
    leg_k = {"tall": 1.25, "skinny": 1.15, "stocky": 0.7, "blob": 0.55, "round": 0.65, "pear": 0.9}[body]
    tor_k = {"tall": 1.25, "skinny": 1.1, "stocky": 0.9, "blob": 1.15, "round": 1.0, "pear": 1.0}[body]
    wid_k = {"tall": 0.75, "skinny": 0.55, "stocky": 1.45, "blob": 1.7, "round": 1.35, "pear": 1.1}[body] * wf
    legL = 150 * h * leg_k
    hipY = footY - legL - 18
    torsoH = 170 * h * tor_k
    shY = hipY - torsoH
    tw = 62 * wid_k
    R = 72 * hs
    parts: list[dict] = []

    def part(pid, parent, pivot, z, svg=None, variants=None, default=None):
        d = {"id": pid, "parent": parent, "pivot": [round(pivot[0], 1), round(pivot[1], 1)], "z": z}
        if svg is not None:
            d["svg"] = svg
        if variants is not None:
            d["variants"], d["defaultVariant"] = variants, default
        parts.append(d)

    out = p["outfit"]
    stripe = out in ("tracksuit", "uniform")
    # ---------------- piernas fideo + zapatillas gigantes
    for side, sx, z in (("L", -1, 2), ("R", 1, 3)):
        hx = cx + sx * max(16, tw * 0.45)
        kneeY = hipY + legL * 0.5
        lw_leg = 26 if body not in ("skinny", "tall") else 20
        up = f.limb([(hx, hipY - 6), (hx + sx * 2, kneeY)], lw_leg, bottom)
        lo = f.limb([(hx + sx * 2, kneeY), (hx, footY - 24)], lw_leg, bottom)
        if stripe:
            lo += f.line([(hx + sx * 9, kneeY - 30), (hx + sx * 8, footY - 30)], 5, WHITE)
            up += f.line([(hx + sx * 9, hipY), (hx + sx * 10, kneeY)], 5, WHITE)
        shoe = [(hx - sx * 30, footY - 36), (hx + sx * 30, footY - 40), (hx + sx * 64, footY - 18), (hx + sx * 66, footY), (hx - sx * 34, footY)]
        lo += f.poly(shoe, WHITE, lw=lw * 0.9) + f.line([(hx - sx * 30, footY - 8), (hx + sx * 62, footY - 8)], 6, acc)
        part(f"leg{side}_up", "torso", (hx, hipY), z, up)
        part(f"leg{side}_lo", f"leg{side}_up", (hx, kneeY), z, lo)

    # ---------------- torso (formas brutas)
    if body in ("round", "blob"):
        n = 28
        tpts = [(cx + math.cos(i / n * math.tau) * tw * 1.05, (shY + hipY) / 2 + 10 + math.sin(i / n * math.tau) * torsoH * 0.6) for i in range(n)]
    elif body == "pear":
        tpts = [(cx - tw * 0.5, shY), (cx + tw * 0.5, shY), (cx + tw * 1.1, hipY + 10), (cx - tw * 1.1, hipY + 10)]
    elif body == "stocky":
        tpts = rrect(cx - tw, shY - 6, cx + tw, hipY + 12, 18)
    else:  # tall / skinny: tubo
        tpts = rrect(cx - tw * 0.9, shY, cx + tw * 0.9, hipY + 10, 14)
    torso = f.poly(tpts, top)
    if out == "hoodie":
        torso = f.poly(rrect(cx - tw * 0.75, shY - 26, cx + tw * 0.75, shY + 22, 20), _shade(top, 0.85), shadow=False) + torso
        torso += f.poly(rrect(cx - tw * 0.55, hipY - 70, cx + tw * 0.55, hipY - 22, 10), _shade(top, 0.9), shadow=False, lw=lw * 0.7)
        torso += f.line([(cx - 12, shY + 8), (cx - 14, shY + 70)], 4, WHITE) + f.line([(cx + 12, shY + 8), (cx + 14, shY + 70)], 4, WHITE)
    elif out in ("jacket", "suit"):
        torso += f.line([(cx, shY + 4), (cx, hipY + 8)], 5)
        torso += f.poly([(cx - 30, shY), (cx, shY + 60), (cx + 30, shY)], WHITE if out == "suit" else _shade(top, 0.8), shadow=False, lw=lw * 0.7)
        if "tie" in p["accessories"]:
            torso += f.poly([(cx - 9, shY + 10), (cx + 9, shY + 10), (cx + 12, shY + 90), (cx, shY + 104), (cx - 12, shY + 90)], acc, shadow=False, lw=lw * 0.7)
    elif stripe:
        torso += f.line([(cx, shY + 4), (cx, hipY + 8)], 4) + f.poly(rrect(cx - 26, shY - 10, cx + 26, shY + 14, 8), _shade(top, 0.85), shadow=False, lw=lw * 0.7)
    elif out in ("tshirt", "tank"):
        torso += f.poly([(cx - 24, shY), (cx, shY + 22), (cx + 24, shY)], skin, shadow=False, lw=lw * 0.7)
        torso += f.ell(cx + tw * 0.15, (shY + hipY) / 2, 18, 18, acc, shadow=False, lw=lw * 0.6)  # logo
    elif out in ("dress", "robe"):
        torso += f.poly([(cx - tw * 0.8, hipY - 40), (cx + tw * 0.8, hipY - 40), (cx + tw * 1.5, hipY + legL * 0.55), (cx - tw * 1.5, hipY + legL * 0.55)], top)
    elif out == "lab":
        torso += f.line([(cx, shY + 4), (cx, hipY + 8)], 5) + f.poly([(cx + tw * 0.3, shY + 70), (cx + tw * 0.7, shY + 70), (cx + tw * 0.7, shY + 105), (cx + tw * 0.3, shY + 105)], WHITE, shadow=False, lw=lw * 0.6)
    if "chain" in p["accessories"]:
        torso += f.line([(cx - 34, shY + 6), (cx - 18, shY + 58), (cx, shY + 70), (cx + 18, shY + 58), (cx + 34, shY + 6)], 7, "#f5c400")
        torso += f.ell(cx, shY + 80, 12, 12, "#f5c400", shadow=False, lw=lw * 0.6)
    part("torso", None, (cx, hipY), 5, torso)

    # ---------------- brazos fideo + manos grandes (con tatuajes)
    tats = p.get("tattoos") or []
    for side, sx, z in (("L", -1, 1), ("R", 1, 8)):
        tz = {t["zone"]: t for t in tats if t["zone"].startswith(("arm_" + side, "hand_" + side))}
        t_up, t_lo, t_hand = tz.get(f"arm_{side}_up"), tz.get(f"arm_{side}_lo"), tz.get(f"hand_{side}")
        sleeve_up = skin if (out == "tank" or t_up) else top
        sleeve_lo = skin if (out in ("tank", "tshirt") or t_lo or t_up) else top
        shx = cx + sx * (tw * 0.85 if body not in ("round", "blob") else tw * 0.8)
        arm = 118 * h
        elbow = (shx + sx * 14, shY + 26 + arm * 0.5)
        hand = (elbow[0] + sx * 4, elbow[1] + arm * 0.5)
        aw = 20 if body not in ("stocky", "blob") else 26
        aw_up = aw * (1.55 if t_up else 1.0)
        aw_lo = aw * (1.55 if t_lo else 1.0)
        up = f.limb([(shx, shY + 24), elbow], aw_up, sleeve_up)
        lo = f.limb([elbow, hand], aw_lo, sleeve_lo)
        if out == "tshirt" and not t_up:  # manga corta
            up += f.limb([(shx, shY + 24), (shx + sx * 7, shY + 24 + arm * 0.32)], aw_up + 6, top)
        if t_up:
            up += tattoo_on_limb((shx, shY + 24), elbow, aw_up, t_up, lw, f)
        if t_lo:
            lo += tattoo_on_limb(elbow, hand, aw_lo, t_lo, lw, f)
        if stripe and sleeve_lo == top:
            lo += f.line([(elbow[0] + sx * 7, elbow[1]), (hand[0] + sx * 7, hand[1] - 6)], 4, WHITE)
        hx, hy = hand[0], hand[1] + 14
        mitt = rrect(hx - 21, hy - 16, hx + 21, hy + 22, 14)
        lo += f.poly(mitt, skin, lw=lw * 0.9) + f.poly(rrect(hx - sx * 30 - 8, hy - 10, hx - sx * 30 + 8, hy + 12, 7), skin, shadow=False, lw=lw * 0.8)
        lo += f.line([(hx - 7, hy + 8), (hx - 7, hy + 21)], 3.5) + f.line([(hx + 7, hy + 8), (hx + 7, hy + 21)], 3.5)
        if t_hand:
            lo += tattoo_at(hx, hy + 1, 30, t_hand, lw)
        part(f"arm{side}_up", "torso", (shx, shY + 24), z, up)
        part(f"arm{side}_lo", f"arm{side}_up", elbow, z, lo)

    # ---------------- cabeza geométrica
    hd = p["head"]
    headCy = shY - R * 0.95
    rx = R * {"oval": 0.85, "long": 0.68, "bean": 1.1, "square": 1.0, "egg": 0.92}.get(hd, 1.0)
    ry = R * {"oval": 1.12, "long": 1.45, "egg": 1.12, "square": 0.95}.get(hd, 1.0)
    if hd in ("square", "long") or p["species"] == "robot":
        hpts = rrect(cx - rx, headCy - ry, cx + rx, headCy + ry, 22)
    elif hd == "egg":
        n = 28
        hpts = [(cx + math.cos(i / n * math.tau) * rx * (0.85 if math.sin(i / n * math.tau) < 0 else 1.05), headCy + math.sin(i / n * math.tau) * ry) for i in range(n)]
    else:
        n = 28
        hpts = [(cx + math.cos(i / n * math.tau) * rx, headCy + math.sin(i / n * math.tau) * ry) for i in range(n)]
    neck = f.limb([(cx, shY + 10), (cx, headCy + ry * 0.7)], 24, skin)
    head = neck
    if p["species"] != "robot":
        for sx in (-1, 1):
            head += f.ell(cx + sx * rx * 1.0, headCy + 6, 13, 20, skin, shadow=False, lw=lw * 0.8)
    head += f.poly(hpts, skin)
    ny = headCy + ry * 0.12
    nose = p["nose"]
    if nose == "round":
        head += f.ell(cx + 8, ny, 20, 17, _shade(skin, 0.92), shadow=False, lw=lw * 0.8)
    elif nose == "long":
        head += f.poly([(cx, ny - 30), (cx + 62, ny + 10), (cx + 2, ny + 16)], _shade(skin, 0.93), shadow=False, lw=lw * 0.8)
    elif nose == "pointy":
        head += f.line([(cx + 4, ny - 26), (cx + 24, ny + 10), (cx + 4, ny + 12)], 5)
    elif nose == "pig":
        head += f.ell(cx, ny, 22, 15, "#f29ca3", shadow=False, lw=lw * 0.8) + f'<circle cx="{cx-7}" cy="{ny}" r="4" fill="{INK}"/><circle cx="{cx+7}" cy="{ny}" r="4" fill="{INK}"/>'
    if "mustache" in p["accessories"]:
        head += f.poly([(cx - 40, ny + 30), (cx - 8, ny + 18), (cx + 8, ny + 18), (cx + 40, ny + 30), (cx, ny + 30)], hairc, shadow=False, lw=lw * 0.6)
    if "beard" in p["accessories"]:
        head += f.poly([(cx - rx * 0.62, headCy + ry * 0.32), (cx - rx * 0.3, headCy + ry * 0.36), (cx + rx * 0.3, headCy + ry * 0.36), (cx + rx * 0.62, headCy + ry * 0.32),
                        (cx + rx * 0.45, headCy + ry * 1.0), (cx, headCy + ry * 1.25), (cx - rx * 0.45, headCy + ry * 1.0)], hairc)
    for t in tats:
        if t["zone"] == "neck":
            head += tattoo_at(cx - rx * 0.6, headCy + ry * 0.72, 38, t, lw)
        elif t["zone"] == "face":
            head += tattoo_at(cx - rx * 0.4, headCy + ry * 0.2, 20 if t["motif"] != "text" else 34, t, lw)
    part("head", "torso", (cx, shY + 8), 10, head)

    # ---------------- ojos mínimos y cínicos
    ex, ey = rx * 0.4, headCy - ry * 0.12
    style_eyes = p["eyes"]
    er = {"big": R * 0.26, "dots": R * 0.08, "tired": R * 0.24, "wild": R * 0.27}[style_eyes]
    lidc = _shade(skin, 0.82)

    def eye(x, r, kind, sx):
        if style_eyes == "dots" and kind not in ("closed", "happy"):
            k = {"wide": 1.6, "half": 0.6, "crazy": 1.4}.get(kind, 1.0)
            return (f'<ellipse cx="{x:.1f}" cy="{ey:.1f}" rx="{r * k + 5:.1f}" ry="{r * 1.4 * k + 5:.1f}" fill="{WHITE}"/>'
                    f'<ellipse cx="{x:.1f}" cy="{ey:.1f}" rx="{r * k:.1f}" ry="{r * 1.4 * k:.1f}" fill="{INK}"/>')
        if kind == "closed":
            return f.line([(x - r, ey), (x + r, ey)], 7)
        if kind == "happy":
            return f.line([(x - r, ey + r * 0.3), (x, ey - r * 0.4), (x + r, ey + r * 0.3)], 7)
        s = f.ell(x, ey, r, r * 1.05, WHITE, shadow=False, lw=lw * 0.8)
        pr = r * (0.22 if kind in ("wide", "crazy") else 0.3)
        s += f'<circle cx="{x - sx * r * 0.08:.1f}" cy="{ey + r * 0.15:.1f}" r="{pr:.1f}" fill="{INK}"/>'
        # párpado superior plano: define la actitud (aburrido por defecto en 'tired')
        lid = {"open": 0.38 if style_eyes == "tired" else 0.0, "half": 0.62, "angry": 0.5, "sad": 0.45, "wide": 0.0, "crazy": 0.0}.get(kind, 0.0)
        if lid > 0:
            yb = ey - r + 2 * r * lid
            tilt = {"angry": 0.35, "sad": -0.35}.get(kind, 0.0) * r * sx * -1
            c = f.nid()
            s += (f'<clipPath id="{c}"><ellipse cx="{x:.1f}" cy="{ey:.1f}" rx="{r:.1f}" ry="{r * 1.05:.1f}"/></clipPath>'
                  f'<path d="M{x - r - 4:.1f},{ey - r - 6:.1f} L{x + r + 4:.1f},{ey - r - 6:.1f} L{x + r + 4:.1f},{yb - tilt:.1f} L{x - r - 4:.1f},{yb + tilt:.1f} Z" fill="{lidc}" clip-path="url(#{c})"/>'
                  + f.line([(x - r, yb + tilt), (x + r, yb - tilt)], 6))
        return s

    def eyes(kind):
        s = ""
        for i, sx in enumerate((-1, 1)):
            r = er * (1.3 if kind == "wide" else 1) * ((1.35 if i == 0 else 0.75) if kind == "crazy" else 1)
            s += eye(cx + sx * ex, r, kind, sx)
        return s

    part("eyes", "head", (cx, ey), 12, variants={k: eyes(k) for k in ("open", "half", "closed", "wide", "angry", "sad", "happy", "crazy")}, default="open")

    # ---------------- cejas: barras gruesas
    by = ey - er * 1.3 - 18
    bl = max(26, er * 1.05)
    browc = INK if p["hair"] in ("none", "bald_ring") else _shade(hairc, 0.8)

    def brows(kind):
        s = ""
        for sx in (-1, 1):
            x = cx + sx * ex
            dy = {"neutral": (0, 0), "angry": (14, -10), "sad": (-12, 8), "raised": (-18, -14), "skeptical": ((-22, -16) if sx > 0 else (4, 4))}[kind]
            s += f.line([(x - sx * bl * 0.8, by + dy[0]), (x + sx * bl * 0.8, by + dy[1])], 12, browc)
        return s

    part("brows", "head", (cx, by), 13, variants={k: brows(k) for k in ("neutral", "angry", "sad", "raised", "skeptical")}, default="neutral")

    # ---------------- boca gráfica (visemas + emociones)
    my = headCy + ry * 0.5
    mw = rx * 0.42

    def opening(wd, hh, teeth=True, roundish=False):
        if roundish:
            s = f.ell(cx, my + hh * 0.3, wd, hh / 2 + 4, "#2a0a12", shadow=False, lw=lw * 0.8)
        else:
            s = f.poly(rrect(cx - wd, my - 4, cx + wd, my + hh, min(hh / 2, 14)), "#2a0a12", shadow=False, lw=lw * 0.8)
        if teeth:
            s += f'<rect x="{cx - wd * 0.8:.1f}" y="{my - 1:.1f}" width="{wd * 1.6:.1f}" height="{max(6, hh * 0.28):.1f}" fill="{WHITE}"/>'
        return s

    mline = WHITE if ("beard" in p["accessories"] and sum(int(hairc[i:i + 2], 16) for i in (1, 3, 5)) < 240) else INK

    def mouth(k):
        if k == "X":
            return f.line([(cx - mw * 0.8, my + 4), (cx + mw * 0.8, my)], 7, mline)
        if k == "A":
            return f.line([(cx - mw * 0.5, my + 2), (cx + mw * 0.5, my + 2)], 10)
        tab = {"B": (mw * 0.7, 12, True, False), "C": (mw * 0.8, 26, True, False), "D": (mw, 44, True, False), "E": (mw * 0.45, 32, False, True),
               "F": (mw * 0.28, 16, False, True), "G": (mw * 0.7, 14, True, False), "H": (mw * 0.75, 30, True, False)}
        if k in tab:
            return opening(*tab[k][:3], roundish=tab[k][3])
        if k == "smile":
            return f.line([(cx - mw, my - 6), (cx - mw * 0.3, my + 12), (cx + mw * 0.6, my + 8), (cx + mw * 1.05, my - 10)], 7)
        if k == "frown":
            return f.line([(cx - mw * 0.9, my + 12), (cx, my), (cx + mw * 0.9, my + 12)], 7)
        if k == "smirk":
            return f.line([(cx - mw * 0.7, my + 6), (cx + mw * 0.4, my + 6), (cx + mw * 0.95, my - 12)], 7)
        if k == "grin":
            s = f.poly([(cx - mw * 1.15, my - 8), (cx + mw * 1.15, my - 8), (cx + mw * 0.8, my + 30), (cx - mw * 0.8, my + 30)], WHITE, shadow=False, lw=lw * 0.8)
            return s + "".join(f.line([(cx + i * mw * 0.35, my - 6), (cx + i * mw * 0.3, my + 28)], 3) for i in (-2, -1, 0, 1, 2)) + f.line([(cx - mw, my + 11), (cx + mw, my + 11)], 3)
        if k == "scream":
            return opening(mw * 0.75, 70, True, roundish=True)
        return ""

    part("mouth", "head", (cx, my), 12, variants={k: mouth(k) for k in VISEMES + ["smile", "frown", "smirk", "grin", "scream"]}, default="X")

    # ---------------- pelo en bloques + gorras
    top_y = headCy - ry
    hair = p["hair"]
    hsv, back = "", ""
    if hair == "spiky":
        pts = [(cx - rx * 1.05, headCy - ry * 0.2)]
        for i in range(7):
            t = i / 6
            pts += [(cx - rx + 2 * rx * t - rx * 0.12, top_y - (40 if i % 2 == 0 else 6)), (cx - rx + 2 * rx * t + rx * 0.14, top_y + 18)]
        pts += [(cx + rx * 1.05, headCy - ry * 0.2), (cx + rx * 0.7, top_y + ry * 0.35), (cx - rx * 0.7, top_y + ry * 0.35)]
        hsv = f.poly(pts, hairc)
    elif hair in ("bob", "long", "slick", "bun"):
        cap = [(cx - rx * 1.08, headCy - ry * 0.05), (cx - rx * 0.95, top_y - 4), (cx + rx * 0.95, top_y - 4), (cx + rx * 1.08, headCy - ry * 0.05),
               (cx + rx * 0.8, top_y + ry * 0.45), (cx - rx * 0.2, top_y + ry * 0.3), (cx - rx * 0.8, top_y + ry * 0.5)]
        hsv = f.poly(cap, hairc)
        if hair in ("bob", "long"):
            back = f.poly(rrect(cx - rx * 1.15, top_y - 6, cx + rx * 1.15, headCy + ry * (0.75 if hair == "bob" else 1.9), 26), hairc)
        if hair == "bun":
            hsv = f.ell(cx, top_y - 26, 34, 30, hairc) + hsv
    elif hair == "curly":  # afro
        back = f.ell(cx, headCy - ry * 0.25, rx * 1.55, ry * 1.25, hairc)
        hsv = f.poly([(cx - rx * 1.0, headCy - ry * 0.3), (cx - rx * 0.7, top_y - 10), (cx + rx * 0.7, top_y - 10), (cx + rx * 1.0, headCy - ry * 0.3), (cx, top_y + ry * 0.3)], hairc, shadow=False)
    elif hair == "mohawk":
        hsv = f.poly([(cx - 18, top_y + 26), (cx - 24, top_y - 60), (cx, top_y - 100), (cx + 24, top_y - 60), (cx + 18, top_y + 26)], acc)
    elif hair == "bald_ring":
        for sx in (-1, 1):
            back += f.poly(rrect(cx + sx * rx * 0.75 - 18, headCy - ry * 0.35, cx + sx * rx * 0.75 + 18 + sx * 14, headCy + ry * 0.2, 10), hairc)
    accs = p["accessories"]
    if "cap" in accs or "hat" in accs:
        hsv += f.poly([(cx - rx * 1.05, top_y + ry * 0.45), (cx - rx * 0.95, top_y - 14), (cx + rx * 0.95, top_y - 14), (cx + rx * 1.05, top_y + ry * 0.45)], acc)
        hsv += f.poly([(cx + rx * 0.4, top_y + ry * 0.35), (cx + rx * 1.9, top_y + ry * 0.42), (cx + rx * 1.8, top_y + ry * 0.58), (cx + rx * 0.4, top_y + ry * 0.55)], _shade(acc, 0.75), shadow=False)
    if "beanie" in accs:
        hsv += f.poly(rrect(cx - rx * 1.05, top_y - 28, cx + rx * 1.05, top_y + ry * 0.5, 34), acc) + f.poly(rrect(cx - rx * 1.1, top_y + ry * 0.3, cx + rx * 1.1, top_y + ry * 0.55, 6), _shade(acc, 0.8), shadow=False)
    if "crown" in accs:
        hsv += f.poly([(cx - 52, top_y + 10), (cx - 60, top_y - 46), (cx - 26, top_y - 14), (cx, top_y - 56), (cx + 26, top_y - 14), (cx + 60, top_y - 46), (cx + 52, top_y + 10)], "#f5c400")
    if "horns" in accs:
        for sx in (-1, 1):
            hsv += f.poly([(cx + sx * rx * 0.4, top_y + 18), (cx + sx * rx * 1.05, top_y - 66), (cx + sx * rx * 0.8, top_y + 26)], WHITE)
    if "headphones" in accs:
        hsv += f.line([(cx - rx * 1.05, headCy), (cx - rx * 0.9, top_y - 14), (cx + rx * 0.9, top_y - 14), (cx + rx * 1.05, headCy)], 12, INK)
        for sx in (-1, 1):
            hsv += f.poly(rrect(cx + sx * rx * 1.05 - 18, headCy - 26, cx + sx * rx * 1.05 + 18, headCy + 26, 12), acc)
    if "antenna" in accs or p["species"] == "robot":
        hsv += f.line([(cx, top_y + 2), (cx + 8, top_y - 64)], 6) + f.ell(cx + 8, top_y - 72, 13, 13, acc, shadow=False)
    if back:
        part("hair_back", "head", (cx, headCy), 9, back)
    if hsv:
        part("hair", "head", (cx, headCy), 14, hsv)
    face = ""
    if "sunglasses" in accs or "glasses" in accs:
        fill = INK if "sunglasses" in accs else "none"
        for sx in (-1, 1):
            face += f.poly(rrect(cx + sx * ex - er * 1.35, ey - er * 1.0, cx + sx * ex + er * 1.35, ey + er * 1.0, 8), fill, shadow=False, lw=lw * 0.9)
            if "sunglasses" in accs:
                face += f.line([(cx + sx * ex - er * 0.8, ey - er * 0.4), (cx + sx * ex - er * 0.2, ey - er * 0.4)], 4, "#5a5a5a")
        face += f.line([(cx - ex + er * 1.35, ey - 4), (cx + ex - er * 1.35, ey - 4)], 6)
    if "eyepatch" in accs:
        face += f.ell(cx - ex, ey, er * 1.25, er * 1.15, INK, shadow=False) + f.line([(cx - rx, ey - 40), (cx + rx, ey - 70)], 5)
    if "earring" in accs:
        face += f'<circle cx="{cx + rx:.1f}" cy="{headCy + 34:.1f}" r="8" fill="none" stroke="#f5c400" stroke-width="5"/>'
    if "cigar" in accs:
        face += f.limb([(cx + mw * 0.6, my + 2), (cx + mw * 0.6 + 60, my + 12)], 9, WHITE, lw=3) + f'<circle cx="{cx + mw * 0.6 + 62:.1f}" cy="{my + 12:.1f}" r="6" fill="#ff5a00"/>'
    if "bandage" in accs:
        face += f.poly(rrect(cx - rx * 0.6, headCy - ry * 0.62, cx - rx * 0.1, headCy - ry * 0.48, 4), WHITE, shadow=False, lw=lw * 0.6)
    if face:
        part("face_acc", "head", (cx, ey), 15, face)
    reach = tw + 150 * h
    bbox = [round(cx - reach, 1), round(max(0, top_y - 120), 1), round(cx + reach, 1), footY + 8]
    return {"id": char_id, "version": version, "name": name, "width": W, "height": H, "anchor": list(ANCHOR), "parts": parts,
            "meta": {"bbox": bbox, "params": p, "expressions": EXPRESSION_PRESETS, "visemes": VISEMES, "style_version": style.get("version", 1), "builder": "urban-v4"}}
