# ASSET_LIBRARY

Biblioteca persistente para continuidad visual entre episodios. Estado actual: `python -m studio library list`.

## Estructura
```
library/characters/<id>/index.json            versiones, aprobada, vista previa
library/characters/<id>/v001/rig.json         rig (piezas SVG, pivotes, variantes)
library/characters/<id>/v001/preview_sheet.png hoja de personaje (expresiones + poses)
library/backgrounds/<id>/v001/bg.json         escenario multicapa (parallax + animación ambiental)
library/props/…                               objetos animables (mismo esquema)
library/audio/manifest.json                   música/SFX con licencia declarada obligatoria
library/fonts/                                Bangers (OFL-1.1), Luckiest Guy (Apache-2.0)
```

## Reglas de continuidad
- Toda modificación = **nueva versión**; jamás se sobrescribe una versión.
- Al APROBAR un episodio sus rigs/escenarios se marcan aprobados y **solo lectura** (444).
- Los episodios fijan `(id, versión)`. QA verifica que el render usa exactamente el rig aprobado (hash).
- Personajes recurrentes: el diseñador recibe la lista de la biblioteca y puede `reuse` un id.

## Qué contiene un rig (personaje)
Esqueleto: `torso, head, eyes, brows, mouth, hair, face_acc, armL/R_up, armL/R_lo, legL/R_up, legL/R_lo`.
- Ojos: `open, half, closed, wide, angry, sad, happy, crazy` (parpadeo automático).
- Cejas: `neutral, angry, sad, raised, skeptical`.
- Bocas: visemas `A–H, X` (lip-sync) + `smile, frown, smirk, grin, scream`.
- Expresiones: `neutral, happy, angry, sad, surprised, scared, smug, crazy, tired, disgusted`.
- Parámetros: cuerpo, cabeza, pelo, ojos, nariz, vestuario, especie, colores, proporciones, accesorios (13).

## Mecanismos de animación reutilizables (`engine/src/rig/actions.ts`)
`idle, walk, run, wave, point, talk, shrug, jump, nod, shakeHead, tremble, lean, lookAt, spin, fall, stretch, pop` (aditivos, con envolventes, squash & stretch).
Cámara: `static, push_in, pull_out, pan_left/right, tilt_up/down, dutch, crash_zoom, handheld`.
Transiciones: `cut, fade, wipe, iris, whip, smash`. Efectos: `flash, speedlines, impact, smoke, sparks, shake, rain, confetti, vignettePulse, textPop`.

## Importar audio de biblioteca
```bash
python -m studio library import-audio --file tema.mp3 --kind music --tags comedy,tension --license "CC-BY 4.0 Autor X"
python -m studio library import-audio --file golpe.wav --kind sfx --tags impact --license "propio"
```
Tags de SFX usados automáticamente: `sting` (cartela), `impact`, `pop`, `whoosh`. Sin licencia declarada no se importa.

## Estado de la biblioteca en la instalación
Vacía a propósito (solo fuentes): no se han creado personajes ni escenarios de la serie.
