"""Constructor de escenarios por capas (parallax) a partir de la dirección artística.

Capas: cielo/pared (depth 0.05) → lejanos (0.25) → medios (0.55) → suelo y cercanos (0.85) → primer plano (1.15).
Cada elemento admite animación ambiental (sway/flicker/drift/bob) para que el fondo esté vivo.
`custom_svg` permite al director artístico inyectar arte vectorial a medida (validado por tamaño).
"""
from __future__ import annotations

import math

from .rigs import Pen, _shade

W, H = 1080, 1920
X0, X1 = -400, 1480  # margen para paneos de cámara


def _el(pen: Pen, e: dict, loc: dict, ink: str) -> tuple[str, dict | None]:
    k = e["kind"]
    x = X0 + 200 + e["x"] * (X1 - X0 - 400)
    gy = loc["horizon"] * H
    y = e["y"] * H
    s = e["scale"]
    col = e["color"] or loc["accent"]
    anim = None
    if k == "building":
        w, hh = 220 * s, 700 * s
        svg = pen.shape([(x - w / 2, gy), (x - w / 2, gy - hh), (x + w / 2, gy - hh * 1.04), (x + w / 2, gy)], col or "#3a4a6b")
        for r in range(int(hh // 90)):
            for c in range(2):
                lit = "#ffd23f" if (r * 3 + c * 7 + int(x)) % 4 == 0 else _shade(col or "#3a4a6b", 0.6)
                svg += f'<rect x="{x - w/2 + 30 + c * (w/2 - 10):.0f}" y="{gy - hh + 40 + r * 90:.0f}" width="{w/2 - 60:.0f}" height="50" fill="{lit}" stroke="{ink}" stroke-width="4"/>'
    elif k == "tree":
        svg = pen.shape(pen.limb(x, gy, x + 10 * s, gy - 260 * s, 50 * s, 34 * s), "#6b4a2b") + \
            pen.shape(pen.blob(x + 10 * s, gy - 330 * s, 150 * s, 130 * s, n=12), col or "#4f7a3a")
        anim = {"type": "sway", "amount": 0.6, "speed": 0.7, "cx": x, "cy": gy}
    elif k == "bush":
        svg = pen.shape(pen.blob(x, gy - 40 * s, 110 * s, 60 * s, n=11, bottom_bulge=0.4), col or "#4f7a3a")
    elif k == "window":
        w, hh = 260 * s, 320 * s
        svg = pen.shape([(x - w / 2, y - hh / 2), (x + w / 2, y - hh / 2), (x + w / 2, y + hh / 2), (x - w / 2, y + hh / 2)], col or "#7fb3d5")
        svg += pen.line([(x, y - hh / 2), (x, y + hh / 2)], sw=8) + pen.line([(x - w / 2, y), (x + w / 2, y)], sw=8)
    elif k == "door":
        w, hh = 200 * s, 420 * s
        svg = pen.shape([(x - w / 2, gy), (x - w / 2, gy - hh), (x + w / 2, gy - hh), (x + w / 2, gy)], col or "#7b4a2a")
        svg += f'<circle cx="{x + w*0.3:.0f}" cy="{gy - hh/2:.0f}" r="{10*s:.0f}" fill="{loc["accent"]}" stroke="{ink}" stroke-width="4"/>'
    elif k == "table":
        svg = pen.shape([(x - 200 * s, gy + 40), (x + 200 * s, gy + 40), (x + 180 * s, gy + 70), (x - 180 * s, gy + 70)], col or "#8a5a3b")
        svg += pen.line([(x - 160 * s, gy + 70), (x - 160 * s, gy + 260 * s)], sw=14) + pen.line([(x + 160 * s, gy + 70), (x + 160 * s, gy + 260 * s)], sw=14)
    elif k == "chair":
        svg = pen.shape([(x - 60 * s, gy + 100), (x + 60 * s, gy + 100), (x + 60 * s, gy + 120), (x - 60 * s, gy + 120)], col or "#8a5a3b")
        svg += pen.line([(x - 55 * s, gy + 100), (x - 55 * s, gy - 60 * s)], sw=12) + pen.line([(x - 50 * s, gy + 120), (x - 50 * s, gy + 230 * s)], sw=10) + pen.line([(x + 50 * s, gy + 120), (x + 50 * s, gy + 230 * s)], sw=10)
    elif k == "lamp":
        svg = pen.line([(x, y), (x, y - 120 * s)], sw=5) + pen.shape([(x - 70 * s, y + 50 * s), (x - 35 * s, y), (x + 35 * s, y), (x + 70 * s, y + 50 * s)], col or "#ffd23f")
        svg += f'<path d="M{x-70*s:.0f},{y+50*s:.0f} L{x-260*s:.0f},{gy+60:.0f} L{x+260*s:.0f},{gy+60:.0f} L{x+70*s:.0f},{y+50*s:.0f} Z" fill="#ffd23f" opacity="0.13"/>'
        anim = {"type": "flicker", "speed": 0.5}
    elif k == "cloud":
        svg = "".join(pen.shape(pen.blob(x + dx * s, y + dy * s, r * s, r * 0.8 * s, n=10), col or "#efe3c8", shadow=False) for dx, dy, r in ((-80, 10, 70), (0, -20, 95), (90, 10, 70)))
        anim = {"type": "drift", "amount": 0.4 + e["depth"]}
    elif k in ("sun", "moon", "planet"):
        r = 120 * s
        svg = pen.shape(pen.blob(x, y, r, r, n=14), col or ("#ffd23f" if k == "sun" else "#efe3c8"))
        if k == "moon":
            svg += "".join(f'<circle cx="{x + dx:.0f}" cy="{y + dy:.0f}" r="{rr:.0f}" fill="{_shade(col or "#efe3c8", 0.8)}"/>' for dx, dy, rr in ((-30, -20, 18), (35, 25, 12), (10, 50, 9)))
        if k == "planet":
            svg += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{r*1.7:.0f}" ry="{r*0.35:.0f}" fill="none" stroke="{ink}" stroke-width="8"/>'
        if k == "sun":
            anim = {"type": "spin", "amount": 0.2, "cx": x, "cy": y}
            svg += "".join(pen.line([(x + math.cos(a) * r * 1.2, y + math.sin(a) * r * 1.2), (x + math.cos(a) * r * 1.55, y + math.sin(a) * r * 1.55)], sw=8)
                           for a in [i * math.tau / 10 for i in range(10)])
    elif k == "mountain":
        w = 600 * s
        svg = pen.shape([(x - w / 2, gy), (x - w * 0.1, gy - 520 * s), (x + w * 0.05, gy - 470 * s), (x + w / 2, gy)], col or "#5a6b8c")
    elif k == "star":
        svg = "".join(f'<circle cx="{x + (i * 137) % 900 - 450:.0f}" cy="{(i * 211) % 900 + 60:.0f}" r="{3 + i % 4}" fill="#fbf7ee"/>' for i in range(int(30 * s)))
        anim = {"type": "flicker", "speed": 0.3}
    elif k == "sign":
        txt = e.get("text") or ""
        w = max(220, 40 * len(txt)) * s
        svg = pen.line([(x, gy), (x, y + 60 * s)], sw=12) + pen.shape([(x - w / 2, y - 60 * s), (x + w / 2, y - 60 * s), (x + w / 2, y + 60 * s), (x - w / 2, y + 60 * s)], col or "#ffd23f")
        svg += f'<text x="{x:.0f}" y="{y + 22*s:.0f}" text-anchor="middle" font-family="var(--font-title)" font-size="{64*s:.0f}" fill="{ink}">{_esc(txt)}</text>'
        anim = {"type": "sway", "amount": 0.3, "cx": x, "cy": gy}
    elif k == "plant":
        svg = pen.shape([(x - 50 * s, gy + 40), (x + 50 * s, gy + 40), (x + 40 * s, gy + 140 * s), (x - 40 * s, gy + 140 * s)], "#b5543a")
        svg += "".join(pen.shape(pen.limb(x, gy + 40, x + dx * s, gy - 120 * s, 10, 34 * s), col or "#4f7a3a", shadow=False) for dx in (-80, -20, 40, 90))
        anim = {"type": "sway", "amount": 0.8, "cx": x, "cy": gy + 40}
    elif k == "screen":
        svg = pen.shape([(x - 200 * s, y - 130 * s), (x + 200 * s, y - 130 * s), (x + 200 * s, y + 130 * s), (x - 200 * s, y + 130 * s)], "#1d1a17", shadow=False)
        svg += f'<rect x="{x-180*s:.0f}" y="{y-110*s:.0f}" width="{360*s:.0f}" height="{220*s:.0f}" fill="{col or "#1b998b"}"/>'
        anim = {"type": "flicker", "speed": 1.2}
    elif k == "rock":
        svg = pen.shape(pen.blob(x, gy - 30 * s, 120 * s, 70 * s, n=9, square=0.3, bottom_bulge=0.3), col or "#7d7468")
    elif k == "car":
        svg = pen.shape([(x - 230 * s, gy - 40), (x - 200 * s, gy - 150 * s), (x - 80 * s, gy - 230 * s), (x + 120 * s, gy - 230 * s), (x + 230 * s, gy - 120 * s), (x + 240 * s, gy - 40)], col or "#d7263d")
        svg += "".join(pen.shape(pen.blob(x + dx * s, gy - 30, 55 * s, 55 * s, n=10), "#1d1a17", shadow=False) for dx in (-140, 140))
    elif k == "shelf":
        svg = "".join(pen.shape([(x - 180 * s, y + r * 140 * s), (x + 180 * s, y + r * 140 * s), (x + 180 * s, y + r * 140 * s + 18), (x - 180 * s, y + r * 140 * s + 18)], col or "#8a5a3b", shadow=False) for r in range(3))
        svg += "".join(f'<rect x="{x - 160*s + i*55*s:.0f}" y="{y + (i%3)*140*s - 80*s:.0f}" width="{36*s:.0f}" height="{80*s:.0f}" fill="{["#d7263d","#1b998b","#ffd23f","#23395b"][i%4]}" stroke="{ink}" stroke-width="4"/>' for i in range(6))
    elif k == "frame":
        svg = pen.shape([(x - 120 * s, y - 150 * s), (x + 120 * s, y - 150 * s), (x + 120 * s, y + 150 * s), (x - 120 * s, y + 150 * s)], "#c9a227")
        svg += f'<rect x="{x-90*s:.0f}" y="{y-120*s:.0f}" width="{180*s:.0f}" height="{240*s:.0f}" fill="{col or "#23395b"}" stroke="{ink}" stroke-width="5"/>'
    elif k == "column":
        svg = pen.shape([(x - 60 * s, gy + 40), (x - 50 * s, gy - 900 * s), (x + 50 * s, gy - 900 * s), (x + 60 * s, gy + 40)], col or "#d9d2c3")
    else:
        svg = ""
    return svg, anim


def _esc(t: str) -> str:
    return t.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")


def build_background(loc: dict, style: dict, seed: int = 11) -> dict:
    ink = style["outline"]["color"]
    pen = Pen(seed, style["outline"].get("jitter", 1.5), ink, style["outline"]["width"])
    gy = loc["horizon"] * H
    sky = loc["sky"]
    ground = loc["ground"]
    t = loc["type"]
    layers = []
    # cielo / pared con trama de puntos (textura dibujada)
    sky_svg = f'<rect x="{X0}" y="-300" width="{X1 - X0}" height="{gy + 400:.0f}" fill="{sky}"/>'
    sky_svg += "".join(f'<circle cx="{X0 + (i * 53) % (X1 - X0)}" cy="{(i * 97) % int(gy + 200) - 200}" r="3" fill="{_shade(sky, 1.12)}" opacity="0.5"/>' for i in range(160))
    if t in ("interior", "office", "underground"):
        sky_svg += "".join(pen.line([(xx, -300), (xx + 6, gy)], sw=3, color=_shade(sky, 0.85)) for xx in range(X0, X1, 160))
    layers.append({"id": "sky", "svg": sky_svg, "depth": 0.05})
    buckets: dict[str, list] = {"far": [], "mid": [], "near": [], "fg": []}
    for e in sorted(loc["elements"], key=lambda e: e["depth"]):
        b = "far" if e["depth"] < 0.35 else "mid" if e["depth"] < 0.7 else "near" if e["depth"] <= 1.0 else "fg"
        buckets[b].append(e)
    depth_of = {"far": 0.25, "mid": 0.55, "near": 0.9, "fg": 1.15}
    ground_svg = pen.shape([(X0, gy), (X1, gy - 6), (X1, H + 300), (X0, H + 300)], ground, shadow=False)
    ground_svg += "".join(pen.line([(X0 + i * 120, gy + 40 + (i % 3) * 60), (X0 + i * 120 + 70, gy + 44 + (i % 3) * 60)], sw=3, color=_shade(ground, 0.75)) for i in range(16))
    for b in ("far", "mid", "near", "fg"):
        static, animated = "", []
        if b == "near":
            static += ground_svg
        for i, e in enumerate(buckets[b]):
            svg, anim = _el(pen, e, loc, ink)
            if anim:
                animated.append({"id": f"{b}_{i}_{e['kind']}", "svg": svg, "depth": depth_of[b], "anim": anim})
            else:
                static += svg
        if static:
            layers.append({"id": b, "svg": static, "depth": depth_of[b]})
        layers.extend(animated)
    if not buckets["near"]:  # garantizar suelo
        layers.append({"id": "near", "svg": ground_svg, "depth": 0.9})
    layers.sort(key=lambda l: l["depth"])
    if loc.get("custom_svg"):
        layers.append({"id": "custom", "svg": loc["custom_svg"], "depth": 0.6})
        layers.sort(key=lambda l: l["depth"])
    mood = style.get("lighting", {}).get("moods", {}).get(loc.get("mood", "normal"))
    if mood and not mood.endswith("00"):
        layers.append({"id": "mood", "svg": f'<rect x="{X0}" y="-300" width="{X1-X0}" height="{H+600}" fill="{mood[:7]}" opacity="{int(mood[7:9] or "33",16)/255:.2f}"/>', "depth": 1.2})
    return {"id": loc["id"], "width": W, "height": H, "layers": layers, "meta": {"name": loc["name"], "type": t, "horizon": loc["horizon"]}}


def test_background(style: dict) -> dict:
    """Escenario geométrico de PRUEBA TÉCNICA."""
    loc = {"id": "test_grid", "name": "TEST", "type": "void", "sky": "#9a9a9a", "ground": "#6a6a6a", "accent": "#bbbbbb",
           "horizon": 0.7, "mood": "normal", "elements": [{"kind": "rock", "x": 0.2, "y": 0.7, "scale": 1, "color": "#777777", "depth": 0.5, "text": ""},
                                                          {"kind": "cloud", "x": 0.6, "y": 0.2, "scale": 1, "color": "#bbbbbb", "depth": 0.2, "text": ""}],
           "custom_svg": None}
    return build_background(loc, style)
