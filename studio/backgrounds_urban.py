"""Escenarios ESTILO URBANO (v4): planos, gráficos, nocturnos con neón. Baratos de renderizar.

Capas: cielo plano + skyline (lejos) → muro/fachada con ladrillo, persianas, grafitis y carteles (medio)
→ acera/suelo + objetos (cerca) → primer plano opcional. Sin degradados ni filtros: solo color plano,
contorno grueso y sombras duras. Los elementos animados (neón que parpadea, farola) van en capas propias.
"""
from __future__ import annotations

import hashlib
import math
import random

from .rigs import _shade
from .rigs_urban import INK, WHITE, Flat, rrect

W, H = 1080, 1920
BX0, BX1 = -2200, 3300
NEON = ["#c6ff00", "#ff2e88", "#00d1ff", "#ff6b00", "#b388ff"]


def _scribble(rng: random.Random, x, y, w, h) -> list[tuple[float, float]]:
    pts = []
    for i in range(9):
        t = i / 8
        pts.append((x + t * w + rng.uniform(-12, 12), y + (h * (0.2 if i % 2 else 0.9)) + rng.uniform(-10, 10)))
    return pts


def _el(f: Flat, rng: random.Random, e: dict, loc: dict, gy: float) -> tuple[str, dict | None]:
    k = e["kind"]
    x = -200 + e["x"] * 1480
    y = e["y"] * H
    s = e["scale"]
    col = e["color"] or None
    neon = col or rng.choice(NEON)
    anim = None
    if k == "reactor":  # máquina gigante / reactor de ciencia loca: cuerpo, tuberías, núcleo, luces y pegatina
        w, hh = 420 * s, 620 * s
        bx, by = x, gy + 40
        out = ""
        for i, (dx, up) in enumerate(((-0.62, 0.95), (0.62, 0.8), (-0.45, 1.15))):  # tuberías hacia techo/pared
            px = bx + dx * w
            out += f.limb([(px, by - hh * 0.35), (px, by - hh * up), (px + (60 if dx < 0 else -60) * s, by - hh * up - 140 * s), (px + (60 if dx < 0 else -60) * s, -400)], 34 * s, "#6b6f7a")
        out += f.poly(rrect(bx - w / 2, by - hh * 0.55, bx + w / 2, by, 14), col or "#3a3d4a")  # cuerpo
        out += "".join(f.line([(bx - w / 2 + 14, by - hh * 0.55 + 40 + r * 44), (bx + w / 2 - 14, by - hh * 0.55 + 40 + r * 44)], 5, "#22242e") for r in range(6))
        out += f.poly([(bx - w * 0.34, by - hh * 0.55), (bx - w * 0.22, by - hh), (bx + w * 0.22, by - hh), (bx + w * 0.34, by - hh * 0.55)], "#4a4d5a")  # torre
        out += f.ell(bx, by - hh * 0.98, w * 0.26, 46 * s, "#2b2d3a")
        # núcleo radiactivo (ventana redonda) con símbolo trébol
        cx_, cy_, r = bx, by - hh * 0.75, 92 * s
        out += f'<circle cx="{cx_:.0f}" cy="{cy_:.0f}" r="{r * 1.7:.0f}" fill="#c6ff00" opacity="0.16"/>' + f.ell(cx_, cy_, r, r, "#c6ff00", shadow=False)
        for a in (90, 210, 330):
            a0, a1 = math.radians(a - 30), math.radians(a + 30)
            out += (f'<path d="M{cx_:.0f},{cy_:.0f} L{cx_ + r*0.85*math.cos(a0):.0f},{cy_ - r*0.85*math.sin(a0):.0f} '
                    f'A{r*0.85:.0f},{r*0.85:.0f} 0 0 0 {cx_ + r*0.85*math.cos(a1):.0f},{cy_ - r*0.85*math.sin(a1):.0f} Z" fill="{INK}"/>')
        out += f'<circle cx="{cx_:.0f}" cy="{cy_:.0f}" r="{r*0.2:.0f}" fill="#c6ff00" stroke="{INK}" stroke-width="8"/>'
        # brazo + aguja-turbina
        out += f.limb([(bx + w / 2 - 20, by - hh * 0.4), (bx + w * 0.85, by - hh * 0.55), (bx + w * 1.05, by - hh * 0.35)], 30 * s, "#9aa0aa")
        tx, ty = bx + w * 1.05, by - hh * 0.35
        out += f.ell(tx, ty, 70 * s, 70 * s, "#ff6b00") + "".join(
            f.line([(tx, ty), (tx + 64 * s * math.cos(math.radians(a)), ty + 64 * s * math.sin(math.radians(a)))], 8) for a in range(0, 360, 45))
        out += f.limb([(tx, ty + 60 * s), (tx, ty + 170 * s)], 10, "#d0d4dc")
        # luces rojas y diales
        for i in range(5):
            out += f'<circle cx="{bx - w*0.4 + i * w*0.2:.0f}" cy="{by - hh*0.48:.0f}" r="{18*s:.0f}" fill="#ff2e2e" stroke="{INK}" stroke-width="6"/>'
        out += f.poly(rrect(bx - w * 0.42, by - hh * 0.3, bx - w * 0.05, by - hh * 0.1, 6), "#15151c") + \
            f'<text x="{bx - w*0.235:.0f}" y="{by - hh*0.16:.0f}" text-anchor="middle" font-family="var(--font-title)" font-size="{50*s:.0f}" fill="#ff2e2e">48 GW</text>'
        # pegatina (centrada sobre el cuerpo, por encima de las cabezas; ancho según el texto)
        txt = (e.get("text") or "NO TOCAR")[:18]
        sw = max(200, 30 * len(txt)) * s
        sy0, sy1 = by - hh * 0.64, by - hh * 0.55
        out += (f'<g transform="rotate(-5 {bx:.0f} {(sy0 + sy1) / 2:.0f})">' + f.poly(rrect(bx - sw / 2, sy0, bx + sw / 2, sy1, 8), "#ffd54a", lw=6) +
                f'<text x="{bx:.0f}" y="{sy1 - (sy1 - sy0) * 0.26:.0f}" text-anchor="middle" font-family="Permanent Marker" font-size="{min(44 * s, (sy1 - sy0) * 0.62):.0f}" fill="{INK}">{_esc(txt)}</text></g>')
        return out, {"type": "flicker", "speed": 1.6}
    if k == "alarm":  # sirena giratoria con haz rojo
        r = 46 * s
        out = f'<g><path d="M{x:.0f},{y:.0f} L{x - 900*s:.0f},{y - 260*s:.0f} L{x - 900*s:.0f},{y + 260*s:.0f} Z" fill="{col or "#ff2e2e"}" opacity="0.22"/>'
        out += f'<path d="M{x:.0f},{y:.0f} L{x + 900*s:.0f},{y - 260*s:.0f} L{x + 900*s:.0f},{y + 260*s:.0f} Z" fill="{col or "#ff2e2e"}" opacity="0.22"/></g>'
        out += f.ell(x, y, r, r, col or "#ff2e2e") + f.poly(rrect(x - r * 1.2, y + r * 0.8, x + r * 1.2, y + r * 1.3, 4), "#2b2d3a", shadow=False)
        return out, {"type": "spin", "amount": 6, "cx": x, "cy": y}
    if k == "dog":  # perro saliendo volando (caricatura plana)
        c = col or "#c98a4b"
        out = f'<g transform="rotate(-25 {x:.0f} {y:.0f})">'
        out += f.ell(x, y, 120 * s, 62 * s, c)  # cuerpo
        for dx, dy in ((-80, 40), (-40, 50), (60, 45), (95, 30)):  # patas estiradas
            out += f.limb([(x + dx * s, y + dy * s), (x + dx * 1.3 * s, y + (dy + 70) * s)], 18 * s, c)
        out += f.limb([(x - 115 * s, y - 10 * s), (x - 190 * s, y - 70 * s)], 16 * s, c)  # cola
        out += f.ell(x + 140 * s, y - 50 * s, 66 * s, 56 * s, c)  # cabeza
        out += f.ell(x + 120 * s, y - 100 * s, 22 * s, 46 * s, _shade(c, 0.7), shadow=False)  # oreja al viento
        out += f'<circle cx="{x + 150*s:.0f}" cy="{y - 62*s:.0f}" r="{16*s:.0f}" fill="{WHITE}" stroke="{INK}" stroke-width="5"/><circle cx="{x + 154*s:.0f}" cy="{y - 62*s:.0f}" r="{6*s:.0f}" fill="{INK}"/>'
        out += f.ell(x + 202 * s, y - 40 * s, 14 * s, 11 * s, INK, shadow=False)
        out += "".join(f.line([(x - 220 * s - i * 40 * s, y + (i * 40 - 40) * s), (x - 340 * s - i * 40 * s, y + (i * 40 - 40) * s)], 6, WHITE) for i in range(3))
        return out + "</g>", {"type": "drift", "amount": 45}
    if k == "meter":  # contador de la luz echando humo
        w, hh = 170 * s, 230 * s
        out = f.poly(rrect(x - w / 2, y - hh / 2, x + w / 2, y + hh / 2, 10), col or "#d9d4c7")
        out += f.poly(rrect(x - w * 0.36, y - hh * 0.32, x + w * 0.36, y - hh * 0.05, 4), "#15151c", shadow=False, lw=5)
        out += f'<text x="{x:.0f}" y="{y - hh*0.1:.0f}" text-anchor="middle" font-family="var(--font-title)" font-size="{40*s:.0f}" fill="#ff2e2e">{_esc((e.get("text") or "999999")[:8])}</text>'
        out += f.ell(x, y + hh * 0.22, 40 * s, 40 * s, WHITE, shadow=False) + f.line([(x, y + hh * 0.22), (x + 30 * s, y + hh * 0.1)], 6, "#ff2e2e")
        out += "".join(f.ell(x + (i * 30 - 20) * s, y - hh * 0.6 - i * 70 * s, (40 + i * 18) * s, (34 + i * 15) * s, "#8a8d99", shadow=False) for i in range(3))
        return out, {"type": "bob", "amount": 1.5}
    if k == "building":
        w, hh = 300 * s, 900 * s
        out = f.poly([(x - w / 2, gy), (x - w / 2, gy - hh), (x + w / 2, gy - hh), (x + w / 2, gy)], col or "#2b2d3a")
        for r in range(int(hh // 110)):
            for c in range(3):
                lit = rng.random() < 0.35
                out += f'<rect x="{x - w/2 + 28 + c * (w - 56) / 3:.0f}" y="{gy - hh + 40 + r * 110:.0f}" width="{(w - 56) / 3 - 18:.0f}" height="60" fill="{"#ffd54a" if lit else "#1a1b24"}" stroke="{INK}" stroke-width="5"/>'
        return out, None
    if k in ("window", "frame", "screen"):
        w, hh = (260, 320) if k == "window" else (220, 280) if k == "frame" else (360, 220)
        w, hh = w * s, hh * s
        out = f.poly(rrect(x - w / 2, y - hh / 2, x + w / 2, y + hh / 2, 6), "#1a1b24" if k != "frame" else "#f5c400")
        inner = "#3a4a7a" if k == "window" else (col or "#ff2e88") if k == "frame" else (col or "#00d1ff")
        out += f.poly(rrect(x - w / 2 + 18, y - hh / 2 + 18, x + w / 2 - 18, y + hh / 2 - 18, 4), inner, shadow=False, lw=5)
        if k == "window":
            out += f.line([(x, y - hh / 2 + 18), (x, y + hh / 2 - 18)], 7) + f.line([(x - w / 2 + 18, y), (x + w / 2 - 18, y)], 7)
            out += f.line([(x - w * 0.3, y - hh * 0.3), (x - w * 0.1, y - hh * 0.38)], 8, "#ffffff55")
        if k == "screen":
            anim = {"type": "flicker", "speed": 1.2}
        return out, anim
    if k == "door":
        w, hh = 200 * s, 400 * s
        return f.poly([(x - w / 2, gy), (x - w / 2, gy - hh), (x + w / 2, gy - hh), (x + w / 2, gy)], col or "#3b2f2f") + \
            f'<circle cx="{x + w*0.3:.0f}" cy="{gy - hh/2:.0f}" r="9" fill="#f5c400" stroke="{INK}" stroke-width="4"/>', None
    if k in ("sign", "neon"):
        txt = (e.get("text") or "OPEN")[:14]
        w = max(240, 46 * len(txt)) * s
        # neón: trazo ancho translúcido (falso brillo, sin filtros) + texto
        out = f.poly(rrect(x - w / 2, y - 70 * s, x + w / 2, y + 70 * s, 18), "#15151c", lw=6)
        out += (f'<text x="{x:.0f}" y="{y + 26*s:.0f}" text-anchor="middle" font-family="var(--font-title)" font-size="{86*s:.0f}" '
                f'fill="none" stroke="{neon}" stroke-opacity="0.35" stroke-width="16">{_esc(txt)}</text>'
                f'<text x="{x:.0f}" y="{y + 26*s:.0f}" text-anchor="middle" font-family="var(--font-title)" font-size="{86*s:.0f}" fill="{neon}">{_esc(txt)}</text>')
        return out, {"type": "flicker", "speed": 0.6}
    if k == "lamp":  # farola
        out = f.limb([(x, gy + 10), (x, y), (x + 70 * s, y - 10)], 14, "#2b2d3a")
        out += f.poly([(x + 40 * s, y - 20), (x + 110 * s, y - 20), (x + 96 * s, y + 6), (x + 54 * s, y + 6)], "#2b2d3a", shadow=False)
        out += f'<path d="M{x + 56*s:.0f},{y + 6:.0f} L{x - 140*s:.0f},{gy + 120:.0f} L{x + 300*s:.0f},{gy + 120:.0f} L{x + 94*s:.0f},{y + 6:.0f} Z" fill="#ffd54a" opacity="0.14"/>'
        return out, {"type": "flicker", "speed": 0.3}
    if k == "graffiti":
        return _tag(rng, x, y, s, neon, e.get("text")), None
    if k == "shutter":
        w, hh = 360 * s, 300 * s
        out = f.poly([(x - w / 2, gy), (x - w / 2, gy - hh), (x + w / 2, gy - hh), (x + w / 2, gy)], col or "#6b6f7a")
        out += "".join(f.line([(x - w / 2 + 8, gy - hh + 26 + i * 26), (x + w / 2 - 8, gy - hh + 26 + i * 26)], 4, "#4a4d55") for i in range(int(hh // 26) - 1))
        return out + _tag(rng, x, gy - hh * 0.45, s * 0.6, neon), None
    if k == "poster":
        out = f.poly([(x - 90 * s, y - 120 * s), (x + 90 * s, y - 112 * s), (x + 84 * s, y + 120 * s), (x - 94 * s, y + 114 * s)], col or rng.choice(NEON))
        return out + f.line([(x - 60 * s, y - 60 * s), (x + 50 * s, y - 60 * s)], 12) + f.line([(x - 60 * s, y - 20 * s), (x + 30 * s, y - 20 * s)], 8), None
    if k in ("car",):
        out = f.poly([(x - 260 * s, gy + 60), (x - 230 * s, gy - 70 * s), (x - 110 * s, gy - 150 * s), (x + 120 * s, gy - 150 * s), (x + 250 * s, gy - 60 * s), (x + 270 * s, gy + 60)], col or "#ff2e88")
        out += f.poly([(x - 90 * s, gy - 130 * s), (x + 100 * s, gy - 130 * s), (x + 180 * s, gy - 66 * s), (x - 170 * s, gy - 66 * s)], "#1a1b24", shadow=False)
        return out + "".join(f.ell(x + d * s, gy + 60, 54 * s, 54 * s, INK, shadow=False) + f.ell(x + d * s, gy + 60, 22 * s, 22 * s, "#9aa0aa", shadow=False) for d in (-150, 150)), None
    if k in ("dumpster", "table", "shelf", "chair"):
        w, hh = (300, 200) if k in ("dumpster", "table") else (160, 220)
        w, hh = w * s, hh * s
        base = col or ("#2e7d4f" if k == "dumpster" else "#5a3e2b")
        return f.poly(rrect(x - w / 2, gy + 70 - hh, x + w / 2, gy + 70, 8), base) + f.line([(x - w / 2, gy + 70 - hh + 26), (x + w / 2, gy + 70 - hh + 26)], 6), None
    if k in ("tree", "plant", "bush"):
        r = (150 if k == "tree" else 90 if k == "plant" else 110) * s
        out = f.limb([(x, gy + 60), (x, gy - r * 0.6)], 26 * s, "#3b2a20") if k == "tree" else ""
        out += f.ell(x, gy - (r * 1.2 if k == "tree" else r * 0.4), r, r * 0.85, col or "#1f6b46")
        return out, {"type": "sway", "amount": 0.4, "cx": x, "cy": gy} if k != "bush" else None
    if k in ("sun", "moon", "planet"):
        r = 120 * s
        out = f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r * 1.5:.0f}" fill="{col or "#f4f1ea"}" opacity="0.12"/>' + f.ell(x, y, r, r, col or ("#ffd54a" if k == "sun" else "#f4f1ea"), shadow=k == "moon")
        if k == "planet":
            out += f.line([(x - r * 1.7, y + 20), (x + r * 1.7, y - 20)], 10)
        return out, None
    if k == "star":
        return "".join(f'<rect x="{x + rng.uniform(-500, 500):.0f}" y="{rng.uniform(-300, gy * 0.6):.0f}" width="6" height="6" fill="{WHITE}"/>' for _ in range(int(40 * s))), {"type": "flicker", "speed": 0.2}
    if k == "cloud":
        return f.poly(rrect(x - 160 * s, y - 40 * s, x + 160 * s, y + 40 * s, 40 * s), col or "#3a3d5c", shadow=False), {"type": "drift", "amount": 0.3}
    if k in ("mountain", "rock"):
        w = (600 if k == "mountain" else 200) * s
        hh = (520 if k == "mountain" else 110) * s
        return f.poly([(x - w / 2, gy), (x - w * 0.05, gy - hh), (x + w * 0.12, gy - hh * 0.85), (x + w / 2, gy)], col or "#2b2d3a"), None
    if k == "column":
        return f.poly([(x - 50 * s, gy + 40), (x - 50 * s, gy - 1000), (x + 50 * s, gy - 1000), (x + 50 * s, gy + 40)], col or "#4a4d55"), None
    return "", None


TAGS = ["NOPE", "WTF", "QPS", "ZERO", "LOL", "404", "MEH", "YOLO", "RIP", "HYPE"]


def _tag(rng: random.Random, x, y, s, color, text=None) -> str:
    """Pintada: texto en rotulador con contorno negro grueso, sombra y goteos."""
    t = _esc((text or rng.choice(TAGS))[:10])
    rot = rng.uniform(-12, 8)
    fs = 150 * s
    drips = "".join(f'<rect x="{x + rng.uniform(-fs, fs):.0f}" y="{y:.0f}" width="7" height="{rng.uniform(30, 90) * s:.0f}" rx="3" fill="{color}"/>' for _ in range(4))
    return (f'<g transform="rotate({rot:.1f} {x:.0f} {y:.0f})">{drips}'
            f'<text x="{x + 8:.0f}" y="{y + 8:.0f}" text-anchor="middle" font-family="Permanent Marker" font-size="{fs:.0f}" fill="{INK}">{t}</text>'
            f'<text x="{x:.0f}" y="{y:.0f}" text-anchor="middle" font-family="Permanent Marker" font-size="{fs:.0f}" fill="{color}" stroke="{INK}" stroke-width="10" paint-order="stroke">{t}</text></g>')


def _esc(t: str) -> str:
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_background(loc: dict, style: dict, seed: int = 11) -> dict:
    uid = "ub" + hashlib.sha1(f"{loc['id']}:{seed}".encode()).hexdigest()[:6]
    f = Flat(uid, style["outline"]["width"])
    rng = random.Random(seed)
    gy = loc["horizon"] * H
    sky, ground = loc["sky"], loc["ground"]
    interior = loc["type"] in ("interior", "office", "underground")
    layers = []
    # cielo / pared base (plano). Ladrillo = patrón SVG (se rasteriza una vez, capa estática)
    pid = f.nid()
    if interior:
        base = (f'<defs><pattern id="{pid}" width="120" height="120" patternUnits="userSpaceOnUse"><rect width="120" height="120" fill="{sky}"/>'
                f'<rect x="0" y="0" width="60" height="120" fill="{_shade(sky, 0.94)}"/></pattern></defs>'
                f'<rect x="{BX0}" y="-1800" width="{BX1 - BX0}" height="{gy + 1900:.0f}" fill="url(#{pid})"/>'
                f'<rect x="{BX0}" y="{gy - 60:.0f}" width="{BX1 - BX0}" height="60" fill="{_shade(sky, 0.7)}"/>')
    else:
        base = f'<rect x="{BX0}" y="-1800" width="{BX1 - BX0}" height="{gy + 1900:.0f}" fill="{sky}"/>'
        # skyline lejano: siluetas planas con ventanas
        sk = ""
        x = BX0
        while x < BX1:
            w = rng.uniform(140, 300)
            hh = rng.uniform(250, 700)
            sk += f'<rect x="{x:.0f}" y="{gy - hh:.0f}" width="{w:.0f}" height="{hh + 20:.0f}" fill="{_shade(sky, 0.7)}"/>'
            for _ in range(int(hh / 60)):
                if rng.random() < 0.4:
                    sk += f'<rect x="{x + rng.uniform(15, w - 35):.0f}" y="{gy - hh + rng.uniform(20, hh - 40):.0f}" width="18" height="24" fill="#ffd54a" opacity="0.8"/>'
            x += w + rng.uniform(-20, 30)
        layers.append({"id": "skyline", "svg": sk, "depth": 0.3})
    layers.insert(0, {"id": "sky", "svg": base, "depth": 0.05})
    # muro de calle (exteriores tipo ciudad): ladrillo + grafiti automático
    if loc["type"] in ("city", "exterior", "underground"):
        bp = f.nid()
        wall_top = gy - 760
        wall = (f'<defs><pattern id="{bp}" width="96" height="48" patternUnits="userSpaceOnUse"><rect width="96" height="48" fill="{loc["accent"] if loc["type"] == "underground" else "#7a3b2e"}"/>'
                f'<path d="M0,0 H96 M0,24 H96 M48,0 V24 M0,24 V48 M96,24 V48" stroke="{INK}" stroke-opacity="0.45" stroke-width="4"/></pattern></defs>'
                f'<rect x="{BX0}" y="{wall_top:.0f}" width="{BX1 - BX0}" height="{gy - wall_top + 10:.0f}" fill="url(#{bp})"/>'
                f'<rect x="{BX0}" y="{wall_top - 30:.0f}" width="{BX1 - BX0}" height="34" fill="#2b2d3a" stroke="{INK}" stroke-width="6"/>')
        for i in range(3):  # pintadas de fondo
            wall += _tag(rng, -250 + i * 620 + rng.uniform(-80, 80), wall_top + rng.uniform(200, 420), rng.uniform(0.6, 0.9), rng.choice(NEON))
        layers.append({"id": "wall", "svg": wall, "depth": 0.6})
    # suelo / acera
    gsv = f'<rect x="{BX0}" y="{gy:.0f}" width="{BX1 - BX0}" height="{H + 1800 - gy:.0f}" fill="{ground}"/>'
    gsv += f'<rect x="{BX0}" y="{gy:.0f}" width="{BX1 - BX0}" height="22" fill="{_shade(ground, 0.6)}"/>'
    gsv += f'<line x1="{BX0}" y1="{gy:.0f}" x2="{BX1}" y2="{gy:.0f}" stroke="{INK}" stroke-width="8"/>'
    for i in range(-6, 14):  # juntas de acera / tablas
        gsv += f'<line x1="{i * 180:.0f}" y1="{gy + 22:.0f}" x2="{i * 260 - 300:.0f}" y2="{H + 400}" stroke="{_shade(ground, 0.8)}" stroke-width="5"/>'
    buckets: dict[str, list] = {"far": [], "mid": [], "near": [], "fg": []}
    for e in loc["elements"]:
        b = "far" if e["depth"] < 0.35 else "mid" if e["depth"] < 0.7 else "near" if e["depth"] <= 1.0 else "fg"
        buckets[b].append(e)
    depth_of = {"far": 0.25, "mid": 0.62, "near": 0.9, "fg": 1.15}
    for b in ("far", "mid", "near", "fg"):
        static, animated = (gsv if b == "near" else ""), []
        for i, e in enumerate(buckets[b]):
            svg, anim = _el(f, rng, e, loc, gy)
            if b == "fg":
                xx = -200 + e["x"] * 1480
                svg = f'<g transform="translate({xx:.0f} {H + 40:.0f}) scale(1.6) translate({-xx:.0f} {-gy:.0f})">{svg}</g>'
            if anim:
                animated.append({"id": f"{b}_{i}_{e['kind']}", "svg": svg, "depth": depth_of[b], "anim": anim})
            else:
                static += svg
        if static:
            layers.append({"id": b, "svg": static, "depth": depth_of[b]})
        layers.extend(animated)
    if not any(l["id"] == "near" for l in layers):
        layers.append({"id": "near", "svg": gsv, "depth": 0.9})
    mood = style.get("lighting", {}).get("moods", {}).get(loc.get("mood", "normal"))
    if mood and not mood.endswith("00"):
        layers.append({"id": "mood", "svg": f'<rect x="{BX0}" y="-1800" width="{BX1-BX0}" height="{H+3600}" fill="{mood[:7]}" opacity="{int(mood[7:9] or "33",16)/255:.2f}"/>', "depth": 1.2})
    layers.sort(key=lambda l: l["depth"])
    return {"id": loc["id"], "width": W, "height": H, "layers": layers, "meta": {"name": loc["name"], "type": loc["type"], "horizon": loc["horizon"], "mood": loc.get("mood", "normal")}}
