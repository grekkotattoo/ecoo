"""Plantillas de tareas creativas con CONTEXTO MÍNIMO (gestión de tokens).

- Un único system prompt estable por tipo de tarea (cacheable por prefijo en la API).
- Cada tarea recibe solo los campos que necesita (resúmenes, no documentos completos).
- Los vocabularios cerrados se inyectan para que la salida sea directamente animable.
"""
from __future__ import annotations

import json

from . import schemas as S

SERIES = ("Serie: ¿QUÉ PASARÍA SI...? Cortos animados 2D verticales (9:16) para ADULTOS, en español de España. "
          "Humor absurdo, surrealista, retorcido, satírico e irónico; situaciones imposibles tratadas con lógica implacable; "
          "giro inesperado y remate inteligente. Nada infantil. Sin humor de relleno, sin moralejas. "
          "Evita odio hacia colectivos reales y personas reales identificables. Responde SOLO con JSON válido.")


def _j(o) -> str:
    return json.dumps(o, ensure_ascii=False, separators=(",", ":"))


def system(kind: str) -> str:
    return f"{SERIES}\nTarea: {kind}."


def ideas_prompt(n: int, used: list[str], feedback: str = "") -> str:
    return (f"Propón {n} ideas NUEVAS. Prohibido repetir o parafrasear estas preguntas ya usadas: {_j(used[-60:])}.\n"
            f"{('Indicaciones del usuario: ' + feedback) if feedback else ''}\n"
            'Formato: {"ideas":[{"title":"≤6 palabras","question":"¿Qué pasaría si...?","premise":"2 frases",'
            '"humor_type":"absurdo|surrealista|satírico|negro|ironía","twist":"giro final","tags":["..."]}]}')


def development_prompt(idea: dict, seconds: tuple[int, int], feedback: list[str]) -> str:
    return (f"Desarrolla esta idea para un corto de {seconds[0]}-{seconds[1]} s: {_j(idea)}.\n"
            f"{_fb(feedback)}"
            'Formato: {"logline":"","synopsis":"","humor_type":"","twist":"","tone_notes":"","beats":[{"description":""}]} '
            "(3-6 beats: planteamiento rápido, escalada absurda, giro, remate).")


def script_prompt(dev: dict, max_words: int, cast: list[dict] | None, locations: list[str] | None, feedback: list[str], mode: str = "write") -> str:
    lock = ""
    if cast:
        lock += f" Usa SOLO estos personajes (id): {_j([c['id'] for c in cast])} y 'narrador'."
    if locations:
        lock += f" Usa SOLO estas localizaciones (id): {_j(locations)}."
    task = "Escribe el guion" if mode == "write" else "Reescribe el guion SUBIENDO el nivel de humor (más sorpresa, remate más afilado), conservando estructura"
    return (f"{task}. Desarrollo: {_j({k: dev[k] for k in ('logline', 'twist', 'beats')})}.\n"
            f"Máximo {max_words} palabras habladas en total. Frases cortas y orales. Personajes y localizaciones con id snake_case.{lock}\n"
            f"{_fb(feedback)}"
            f"Emociones válidas: {_j(S.EXPRESSIONS)}.\n"
            'Formato: {"title":"","punchline":"","beats":[{"location":"loc_id","action":"qué se ve",'
            '"lines":[{"speaker":"id|narrador","text":"","emotion":""}]}]}')


def humor_prompt(script: dict, min_score: float) -> str:
    lines = [f"{l['speaker']}: {l['text']}" for b in script["beats"] for l in b["lines"]]
    return (f"Evalúa con dureza el humor de este guion (público adulto). Título: {script['title']}. Remate: {script['punchline']}.\n"
            f"Diálogo: {_j(lines)}\n"
            f"Puntúa 0-10 cada eje {_j(S.HUMOR_AXES)}. verdict='pass' solo si la media ≥ {min_score} y el remate sorprende.\n"
            'Formato: {"scores":{"sorpresa":0,"absurdo":0,"satira":0,"remate":0,"ritmo":0,"originalidad":0},"verdict":"pass|revise","notes":"mejoras concretas"}')


def art_prompt(script: dict, style_summary: str, keep_ids: list[str] | None, feedback: list[str]) -> str:
    locs = sorted({b["location"]: b["action"] for b in script["beats"]}.items())
    return (f"Dirección artística de escenarios. Estilo permanente: {style_summary}.\n"
            f"Localizaciones del guion: {_j(locs)}. {('Conserva exactamente estos ids: ' + _j(keep_ids)) if keep_ids else ''}\n"
            f"{_fb(feedback)}"
            f"Tipos: {_j(S.BG_TYPES)}. Elementos: {_j(S.BG_ELEMENTS)} (x,y en 0-1 del encuadre; depth 0.1 lejos - 1.0 cerca; >1 = primer plano que asoma por el borde inferior, úsalo con moderación).\n"
            'Formato: {"mood":"","locations":[{"id":"","name":"","description":"","type":"","sky":"#hex","ground":"#hex","accent":"#hex",'
            '"horizon":0.68,"mood":"normal|noche|infierno|absurdo","elements":[{"kind":"","x":0.5,"y":0.6,"scale":1,"color":"#hex","depth":0.5,"text":""}],'
            '"ai_prompt":"descripción para generador de imagen opcional"}]}')


def characters_prompt(script: dict, existing: list[dict], keep_ids: list[str] | None, feedback: list[str]) -> str:
    speakers = sorted({l["speaker"] for b in script["beats"] for l in b["lines"]} - {"narrador"})
    return (f"Diseña los personajes (acabado semirrealista de animación adulta premium: proporciones creíbles, pieles y colores naturales con acentos saturados, siluetas reconocibles, muy expresivos). Personajes del guion: {_j(speakers)}. "
            f"Contexto: {script['title']} — {_j([b['action'] for b in script['beats']])[:900]}.\n"
            f"Personajes recurrentes en biblioteca (reutiliza con 'reuse':'id' si encaja; continuidad): {_j(existing[:20])}.\n"
            f"{('Mantén estos ids: ' + _j(keep_ids)) if keep_ids else ''}{_fb(feedback)}"
            f"Parámetros: {_j(S.CHAR_ENUMS)}; accessories ⊂ {_j(S.ACCESSORIES)}; colores #hex; height 0.75-1.35; head_scale 0.8-1.6 (0.9-1.1 = proporción realista; >1.3 solo para caricatura extrema); width 0.7-1.5.\n"
            'Formato: {"characters":[{"id":"","name":"","role":"","description":"","voice_hint":"tipo de voz para ElevenLabs","reuse":null,'
            '"params":{"body":"","head":"","hair":"","eyes":"","nose":"","outfit":"","species":"","skin":"#hex","hair_color":"#hex",'
            '"top_color":"#hex","bottom_color":"#hex","accent_color":"#hex","eye_color":"#hex","height":1,"head_scale":1.2,"width":1,"accessories":[],"seed":1}}]}')


def storyboard_prompt(script: dict, chars: list[str], locs: list[str], feedback: list[str]) -> str:
    lines = [{"id": l["id"], "who": l["speaker"], "txt": l["text"], "beat": b["id"], "loc": b["location"]} for b in script["beats"] for l in b["lines"]]
    return (f"Storyboard vertical 9:16. Líneas: {_j(lines)}. Personajes: {_j(chars)}. Localizaciones: {_j(locs)}.\n"
            "Reglas: todas las líneas asignadas a algún plano, en orden; cada plano con al menos un actor animado; variedad de encuadres; "
            "ACTUACIÓN MUY EXAGERADA Y CARICATURESCA (take, rage, laugh, cower, celebrate, faint…) y cámara 3D llamativa (orbit, swoop, crane, vertigo, rack_focus); "
            "giro y remate con efecto o cámara marcada; 3-5 planos con key_image=true (los más representativos).\n"
            f"{_fb(feedback)}"
            f"Vocabulario: actions {_j(S.ACTIONS)}; framing {_j(S.FRAMING)}; camera {_j(S.CAMERA)}; transition {_j(S.TRANSITIONS)}; "
            f"effects {_j(S.EFFECTS)}; position {_j(S.POSITIONS)}; expression {_j(S.EXPRESSIONS)}.\n"
            'Formato: {"shots":[{"location":"","framing":"","camera":"","transition":"","effects":[],"text_pop":"",'
            '"actors":[{"character":"","position":"","facing":"right|left","actions":[],"expression":""}],"lines":["l01"],'
            '"seconds":2.5,"description":"","key_image":false}]}')


def _fb(feedback: list[str]) -> str:
    return ("Cambios pedidos por el usuario (obligatorios): " + " | ".join(feedback[-3:]) + "\n") if feedback else ""


def style_summary(style: dict) -> str:
    p = style["palette"]
    return f"{style['illustration']['description'][:260]} Paleta: {_j({k: p[k] for k in list(p)[:8]})}."
