"""Constructor de escenarios por capas (parallax) a partir de la dirección artística.

Capas: cielo/pared (depth 0.05) → lejanos (0.25) → medios (0.55) → suelo y cercanos (0.85) → primer plano (1.15).
Cada elemento admite animación ambiental (sway/flicker/drift/bob) para que el fondo esté vivo.
`custom_svg` permite al director artístico inyectar arte vectorial a medida (validado por tamaño).
"""
from __future__ import annotations

import math

from .rigs import Pen, _shade, light_of, mix, shadow_of

W, H = 1080, 1920
X0, X1 = -400, 1480  # margen para paneos de cámara
BX0, BX1, BY0 = -2200, 3300, -1800  # fondo/cielo/suelo extendidos: la cámara 2.5D (órbita, vértigo) nunca ve el borde


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
        svg += f'<path d="M{x - w/2:.0f},{y - hh/2:.0f} L{x + w*0.1:.0f},{y - hh/2:.0f} L{x - w*0.35:.0f},{y + hh/2:.0f} L{x - w/2:.0f},{y + hh/2:.0f} Z" fill="#ffffff" opacity="0.28"/>'
        svg += pen.line([(x, y - hh / 2), (x, y + hh / 2)], sw=8) + pen.line([(x - w / 2, y), (x + w / 2, y)], sw=8)
        svg += f'<path d="M{x - w/2:.0f},{y + hh/2:.0f} L{x + w/2:.0f},{y + hh/2:.0f} L{x + w*1.3:.0f},{gy + 380:.0f} L{x - w*0.2:.0f},{gy + 380:.0f} Z" fill="#fff3c4" opacity="0.13"/>' 
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
        gid = pen.nid("lg")
        svg = (f'<defs><radialGradient id="{gid}"><stop offset="0" stop-color="#fff1b8" stop-opacity="0.85"/><stop offset="1" stop-color="#ffb703" stop-opacity="0"/></radialGradient></defs>'
               f'<circle cx="{x:.0f}" cy="{y + 40*s:.0f}" r="{220*s:.0f}" fill="url(#{gid})"/>') + svg
        svg += f'<path d="M{x-70*s:.0f},{y+50*s:.0f} L{x-300*s:.0f},{gy+80:.0f} L{x+300*s:.0f},{gy+80:.0f} L{x+70*s:.0f},{y+50*s:.0f} Z" fill="#ffe08a" opacity="0.16"/>'
        anim = {"type": "flicker", "speed": 0.5}
    elif k == "cloud":
        svg = "".join(pen.shape(pen.blob(x + dx * s, y + dy * s, r * s, r * 0.8 * s, n=12), col or "#fff6e8", weight=False) for dx, dy, r in ((-80, 10, 70), (0, -20, 95), (90, 10, 70)))
        anim = {"type": "drift", "amount": 0.4 + e["depth"]}
    elif k in ("sun", "moon", "planet"):
        r = 120 * s
        base = col or ("#ffd23f" if k == "sun" else "#efe3c8")
        if k == "planet":
            svg = pen.shape(pen.blob(x, y, r, r, n=14), base)
        else:  # emisivo: resplandor y sin sombra
            gid = pen.nid("sun")
            svg = (f'<defs><radialGradient id="{gid}"><stop offset="0.45" stop-color="{base}" stop-opacity="0.9"/><stop offset="1" stop-color="{base}" stop-opacity="0"/></radialGradient></defs>'
                   f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r * 2.4:.0f}" fill="url(#{gid})" opacity="0.55"/>')
            svg += pen.shape(pen.blob(x, y, r, r, n=16), light_of(base), flat=True, sw=0)
        if k == "moon":
            svg += "".join(f'<circle cx="{x + dx:.0f}" cy="{y + dy:.0f}" r="{rr:.0f}" fill="{_shade(col or "#efe3c8", 0.8)}"/>' for dx, dy, rr in ((-30, -20, 18), (35, 25, 12), (10, 50, 9)))
        if k == "planet":
            svg += f'<ellipse cx="{x:.0f}" cy="{y:.0f}" rx="{r*1.7:.0f}" ry="{r*0.35:.0f}" fill="none" stroke="{ink}" stroke-width="8"/>'
        if k == "sun":
            anim = {"type": "spin", "amount": 0.2, "cx": x, "cy": y}
            svg += "".join(pen.brush([(x + math.cos(a) * r * 1.18, y + math.sin(a) * r * 1.18), (x + math.cos(a) * r * 1.6, y + math.sin(a) * r * 1.6)], 14, light_of(base), opacity=0.8)
                           for a in [i * math.tau / 12 for i in range(12)])
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


def _grad(pen: Pen, stops: list[tuple[float, str, float]], vertical=True) -> tuple[str, str]:
    gid = pen.nid("bg")
    x2, y2 = ("0", "1") if vertical else ("1", "0")
    st = "".join(f'<stop offset="{o}" stop-color="{c}" stop-opacity="{a}"/>' for o, c, a in stops)
    return gid, f'<defs><linearGradient id="{gid}" x1="0" y1="0" x2="{x2}" y2="{y2}">{st}</linearGradient></defs>'


def build_background(loc: dict, style: dict, seed: int = 11) -> dict:
    if style.get("builder") == "urban":
        from .backgrounds_urban import build_background as urban
        return urban(loc, style, seed)
    return _build_premium(loc, style, seed)


def _build_premium(loc: dict, style: dict, seed: int = 11) -> dict:
    """Escenario premium por capas: cielo/pared con degradado y textura, suelo en perspectiva,
    neblina atmosférica entre capas (profundidad), resplandores y haces de luz, AO en el rodapié."""
    import hashlib
    ink = style["outline"]["color"]
    uid = "b" + hashlib.sha1(f"{loc['id']}:{seed}".encode()).hexdigest()[:6]
    pen = Pen(seed, style["outline"].get("jitter", 0.6), ink, style["outline"]["width"], uid)
    gy = loc["horizon"] * H
    sky, ground, accent = loc["sky"], loc["ground"], loc["accent"]
    t = loc["type"]
    interior = t in ("interior", "office", "underground")
    horizon_c = mix(light_of(sky), "#ffd9a8", 0.35)
    layers = []
    # ---- cielo / pared
    if interior:
        gid, defs = _grad(pen, [(0, _shade(sky, 0.72), 1), (0.55, sky, 1), (1, light_of(sky), 1)])
        svg = defs + f'<rect x="{BX0}" y="{BY0}" width="{BX1 - BX0}" height="{gy - BY0 + 100:.0f}" fill="url(#{gid})"/>'
        pid = pen.nid("pt")
        svg += (f'<defs><pattern id="{pid}" width="90" height="90" patternUnits="userSpaceOnUse">'
                f'<path d="M45,8 L60,45 L45,82 L30,45 Z" fill="{light_of(sky)}" opacity="0.22"/><circle cx="0" cy="0" r="5" fill="{_shade(sky, 0.85)}" opacity="0.5"/></pattern></defs>'
                f'<rect x="{BX0}" y="{BY0}" width="{BX1 - BX0}" height="{gy - BY0:.0f}" fill="url(#{pid})"/>')
        gid2, d2 = _grad(pen, [(0, "#1b1030", 0.55), (1, "#1b1030", 0)])
        svg += d2 + f'<rect x="{X0}" y="-300" width="{X1 - X0}" height="520" fill="url(#{gid2})"/>'  # sombra de techo
        svg += pen.shape([(X0, gy - 70), (X1, gy - 70), (X1, gy), (X0, gy)], _shade(sky, 0.8), rim=False, weight=False)  # zócalo
    else:
        gid, defs = _grad(pen, [(0, mix(_shade(sky, 0.7), "#5a3d9a", 0.25), 1), (0.6, sky, 1), (1, horizon_c, 1)])
        svg = defs + f'<rect x="{BX0}" y="{BY0}" width="{BX1 - BX0}" height="{gy - BY0 + 100:.0f}" fill="url(#{gid})"/>'
        rg = pen.nid("sg")
        svg += (f'<defs><radialGradient id="{rg}"><stop offset="0" stop-color="#fff2c2" stop-opacity="0.8"/><stop offset="1" stop-color="#ffd9a8" stop-opacity="0"/></radialGradient></defs>'
                f'<ellipse cx="760" cy="{gy * 0.45:.0f}" rx="900" ry="{gy * 0.7:.0f}" fill="url(#{rg})"/>')
    layers.append({"id": "sky", "svg": svg, "depth": 0.05})
    buckets: dict[str, list] = {"far": [], "mid": [], "near": [], "fg": []}
    for e in sorted(loc["elements"], key=lambda e: e["depth"]):
        b = "far" if e["depth"] < 0.35 else "mid" if e["depth"] < 0.7 else "near" if e["depth"] <= 1.0 else "fg"
        buckets[b].append(e)
    depth_of = {"far": 0.25, "mid": 0.55, "near": 0.9, "fg": 1.15}
    # ---- suelo en perspectiva
    gid, defs = _grad(pen, [(0, light_of(ground), 1), (0.4, ground, 1), (1, _shade(ground, 0.62), 1)])
    ground_svg = defs + f'<path d="M{BX0},{gy:.0f} L{BX1},{gy - 4:.0f} L{BX1},{H + 1800} L{BX0},{H + 1800} Z" fill="url(#{gid})"/>'
    vx, vy = 540, gy - 520
    for i in range(-9, 10):
        bx = 540 + i * 170
        ex_ = vx + (bx - vx) * ((H + 300 - vy) / (gy - vy))
        ground_svg += f'<line x1="{vx + (bx - vx) * 1.0:.0f}" y1="{gy:.0f}" x2="{ex_:.0f}" y2="{H + 300}" stroke="{shadow_of(ground)}" stroke-width="{3 if interior else 2}" opacity="{0.55 if interior else 0.25}"/>'
    for k, yy in enumerate((gy + 60, gy + 150, gy + 290, gy + 480)):
        ground_svg += f'<line x1="{X0}" y1="{yy:.0f}" x2="{X1}" y2="{yy:.0f}" stroke="{shadow_of(ground)}" stroke-width="2.5" opacity="{0.35 if interior else 0.12}"/>'
    if not interior:
        for i in range(26):
            gx = X0 + (i * 97) % (X1 - X0)
            gyy = gy + 40 + (i * 61) % 600
            ground_svg += pen.brush([(gx, gyy), (gx - 6, gyy - 22)], 4, light_of(ground), opacity=0.8) + pen.brush([(gx + 8, gyy), (gx + 12, gyy - 18)], 4, shadow_of(ground), opacity=0.7)
    gid3, d3 = _grad(pen, [(0, "#1b1030", 0.45), (1, "#1b1030", 0)])
    ground_svg += d3 + f'<rect x="{X0}" y="{gy:.0f}" width="{X1 - X0}" height="60" fill="url(#{gid3})"/>'  # oclusión ambiental
    ground_svg += f'<line x1="{X0}" y1="{gy:.0f}" x2="{X1}" y2="{gy - 4:.0f}" stroke="{ink}" stroke-width="5"/>'
    far_pen = Pen(seed + 1, 0.4, mix(ink, horizon_c, 0.55), style["outline"]["width"] * 0.6, uid + "f")
    for b in ("far", "mid", "near", "fg"):
        static, animated = "", []
        if b == "near":
            static += ground_svg
        use = far_pen if b == "far" else pen
        for i, e in enumerate(buckets[b]):
            svg_e, anim = _el(use, e, loc, use.ink)
            if b == "fg":  # primer plano: pegado al borde inferior, más grande y oscuro (encuadre cinematográfico)
                xx = X0 + 200 + e["x"] * (X1 - X0 - 400)
                svg_e = (f'<g transform="translate({xx:.0f} {H + 40:.0f}) scale(1.7) translate({-xx:.0f} {-gy:.0f})">{svg_e}</g>')
            if b in ("near", "fg") and e["kind"] in ("table", "chair", "plant", "rock", "car", "bush", "column", "door"):
                xx = X0 + 200 + e["x"] * (X1 - X0 - 400)
                svg_e = f'<ellipse cx="{xx:.0f}" cy="{gy + (250 if e["kind"] in ("table", "chair") else 10) * e["scale"]:.0f}" rx="{170 * e["scale"]:.0f}" ry="{24 * e["scale"]:.0f}" fill="#1b1030" opacity="0.22"/>' + svg_e
            if anim:
                animated.append({"id": f"{b}_{i}_{e['kind']}", "svg": svg_e, "depth": depth_of[b], "anim": anim})
            else:
                static += svg_e
        if static:
            layers.append({"id": b, "svg": static, "depth": depth_of[b]})
        layers.extend(animated)
        if b in ("far", "mid"):  # neblina atmosférica → profundidad
            op = 0.42 if b == "far" else 0.16
            hid, hd = _grad(pen, [(0, horizon_c, 0), (0.7, horizon_c, op), (1, horizon_c, op * 0.6)])
            layers.append({"id": f"haze_{b}", "svg": hd + f'<rect x="{X0}" y="-300" width="{X1 - X0}" height="{gy + 340:.0f}" fill="url(#{hid})"/>', "depth": depth_of[b] + 0.01})
    if not buckets["near"]:
        layers.append({"id": "near", "svg": ground_svg, "depth": 0.9})
    if loc.get("custom_svg"):
        layers.append({"id": "custom", "svg": loc["custom_svg"], "depth": 0.6})
    mood = style.get("lighting", {}).get("moods", {}).get(loc.get("mood", "normal"))
    if mood and not mood.endswith("00"):
        layers.append({"id": "mood", "svg": f'<rect x="{X0}" y="-300" width="{X1-X0}" height="{H+600}" fill="{mood[:7]}" opacity="{int(mood[7:9] or "33",16)/255:.2f}"/>', "depth": 1.2})
    layers.sort(key=lambda l: l["depth"])
    return {"id": loc["id"], "width": W, "height": H, "layers": layers, "meta": {"name": loc["name"], "type": t, "horizon": loc["horizon"]}}


def test_background(style: dict) -> dict:
    """Escenario geométrico de PRUEBA TÉCNICA."""
    loc = {"id": "test_grid", "name": "TEST", "type": "void", "sky": "#9a9a9a", "ground": "#6a6a6a", "accent": "#bbbbbb",
           "horizon": 0.7, "mood": "normal", "elements": [{"kind": "rock", "x": 0.2, "y": 0.7, "scale": 1, "color": "#777777", "depth": 0.5, "text": ""},
                                                          {"kind": "cloud", "x": 0.6, "y": 0.2, "scale": 1, "color": "#bbbbbb", "depth": 0.2, "text": ""}],
           "custom_svg": None}
    return build_background(loc, style)
