"""Cerebro SIMULADO para pruebas técnicas automáticas.

Produce estructuras válidas con contenido neutro marcado "TEST" (formas geométricas, frases de
prueba). NO es contenido de la serie y nunca se usa fuera de tests/benchmark (config llm.provider=mock).
"""
from __future__ import annotations

import json
import re


def _arr(prompt: str, label: str) -> list:
    m = re.search(re.escape(label) + r"\s*(\[.*?\])(?=[.\s])", prompt, re.S)
    return json.loads(m.group(1)) if m else []


def answer(kind: str, prompt: str):
    if kind == "ideas":
        used = _arr(prompt, "ya usadas:")
        base = len(used)
        n = int(re.search(r"Propón (\d+)", prompt).group(1))
        return {"ideas": [{"title": f"Prueba técnica {base + i + 1} {'xyzw'[i % 4]}{base + i}",
                           "question": f"¿Qué pasaría si el cubo de prueba número {base + i + 1} {'rotase hacia atrás' if i % 2 else 'cambiase de color'} variante {chr(65 + (base + i) % 26)}{base + i}?",
                           "premise": "Contenido de prueba técnica sin valor creativo.", "humor_type": "test", "twist": "test", "tags": ["test"]}
                          for i in range(n)]}
    if kind == "development":
        return {"logline": "TEST logline", "synopsis": "TEST: verificación del pipeline con formas geométricas.", "humor_type": "test",
                "twist": "TEST giro", "tone_notes": "neutro", "beats": [{"description": f"TEST beat {i}"} for i in range(1, 4)]}
    if kind == "script":
        punch = "SUBIENDO el nivel" in prompt
        return {"title": "TEST técnico " + ("B" if punch else "A"), "punchline": "TEST remate",
                "beats": [{"location": "test_room", "action": "TEST forma A entra", "lines": [{"speaker": "test_a", "text": "Prueba de audio uno dos tres.", "emotion": "neutral"}]},
                          {"location": "test_room", "action": "TEST forma B responde", "lines": [{"speaker": "test_b", "text": "Verificando sincronía labial.", "emotion": "surprised"}]},
                          {"location": "test_void", "action": "TEST cierre", "lines": [{"speaker": "test_a", "text": "Fin de la prueba técnica.", "emotion": "happy"}]}]}
    if kind == "humor_review":
        ok = "TEST técnico B" in prompt
        return {"scores": {k: (8 if ok else 5) for k in ["sorpresa", "absurdo", "satira", "remate", "ritmo", "originalidad"]},
                "verdict": "pass" if ok else "revise", "notes": "TEST: subir sorpresa" if not ok else "ok"}
    if kind == "art_direction":
        return {"mood": "test", "locations": [
            {"id": "test_room", "name": "TEST sala", "description": "geométrico", "type": "interior", "sky": "#8a8a8a", "ground": "#5a5a5a", "accent": "#b0b0b0",
             "horizon": 0.68, "mood": "normal", "elements": [{"kind": "window", "x": 0.3, "y": 0.35, "scale": 1, "color": "#9fb0c0", "depth": 0.4},
                                                             {"kind": "lamp", "x": 0.7, "y": 0.2, "scale": 1, "color": "#c0c0c0", "depth": 0.6},
                                                             {"kind": "table", "x": 0.75, "y": 0.6, "scale": 0.8, "color": "#7a7a7a", "depth": 0.9}]},
            {"id": "test_void", "name": "TEST vacío", "description": "geométrico", "type": "void", "sky": "#6a6a7a", "ground": "#4a4a4a", "accent": "#a0a0a0",
             "horizon": 0.7, "mood": "normal", "elements": [{"kind": "cloud", "x": 0.4, "y": 0.2, "scale": 1, "color": "#b0b0b0", "depth": 0.2},
                                                            {"kind": "rock", "x": 0.2, "y": 0.7, "scale": 1, "color": "#808080", "depth": 0.8}]}]}
    if kind == "characters":
        def p(seed, body, head):
            return {"body": body, "head": head, "hair": "none", "eyes": "big", "nose": "round", "outfit": "tshirt", "species": "object",
                    "skin": "#c8c8c8", "hair_color": "#333333", "top_color": "#8c8c8c", "bottom_color": "#5c5c5c", "accent_color": "#aaaaaa",
                    "height": 1.0, "head_scale": 1.1, "width": 1.0, "accessories": [], "seed": seed}
        return {"characters": [{"id": "test_a", "name": "TEST A", "role": "test", "description": "forma geométrica", "params": p(1, "round", "round")},
                               {"id": "test_b", "name": "TEST B", "role": "test", "description": "forma geométrica", "params": p(2, "tall", "square")}]}
    if kind == "storyboard":
        lines = _arr(prompt, "Líneas:")
        shots = []
        for i, ln in enumerate(lines):
            shots.append({"location": ln["loc"], "framing": ["wide", "medium", "close"][i % 3], "camera": ["push_in", "pan_left", "static"][i % 3],
                          "transition": ["cut", "whip", "fade"][i % 3], "effects": [["impact"], [], ["textPop"]][i % 3], "text_pop": "TEST",
                          "actors": [{"character": "test_a", "position": "left", "facing": "right", "actions": ["pop"] if i == 0 else ["wave"], "expression": "neutral"},
                                     {"character": "test_b", "position": "right", "facing": "left", "actions": ["jump"] if i == 1 else [], "expression": "smug"}],
                          "lines": [ln["id"]], "seconds": 2.0, "description": f"TEST plano {i + 1}", "key_image": True})
        return {"shots": shots}
    raise ValueError(f"mock: tarea desconocida {kind}")
