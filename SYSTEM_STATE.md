# SYSTEM_STATE

> Estado de la instalación (2026-11-27). Estado vivo: `python -m studio status` / panel.

**Fase actual:** INSTALADO · modo producción **NO activado** · 0 episodios · 0 ideas · biblioteca vacía (solo fuentes).

## Estado por componente
| Componente | Estado | Nota |
|---|---|---|
| Arquitectura modular (16 módulos A–P) | INSTALADO | `ARCHITECTURE.md` |
| Motor de animación 2D (Remotion) | INSTALADO | rigs, 17 acciones, expresiones, visemas, cámara/parallax, efectos, transiciones |
| Rigs paramétricos + hojas de personaje | INSTALADO | acabado premium v2 (`studio stylesample` para verlo) |
| Escenarios multicapa + animación ambiental | INSTALADO | |
| Pipeline 17 fases + recuperación | INSTALADO | probado end-to-end con render real |
| Sistema de aprobación (7 acciones, persistente) | INSTALADO | invalidación selectiva probada |
| Autopiloto (1 propuesta pendiente, cola de ideas, latido, lock) | INSTALADO | corre solo mientras el proceso esté vivo |
| Costes / presupuestos / ledger | INSTALADO | pagos bloqueados por defecto |
| QA automático con bloqueo | INSTALADO | 17 comprobaciones |
| Panel web (escritorio + móvil) | INSTALADO | `python -m studio serve` |
| Backups / restauración | INSTALADO | automático antes de cada decisión |
| Exportación MP4 H.264 1080×1920 30 fps | INSTALADO | validada por ffprobe + QA |
| Formatos 1:1 y 16:9 | INSTALADO | reencuadre con fondo desenfocado (`studio export`) |
| Cerebro creativo vía Claude Code / Codex | INSTALADO | sin coste API; requiere sesión abierta |
| Cerebro creativo vía API Anthropic | PENDIENTE DE CONFIGURACIÓN | falta `ANTHROPIC_API_KEY` + `pip install anthropic`; no probado con llamada real |
| ElevenLabs — importación WAV/MP3, versiones, pausas | INSTALADO | |
| ElevenLabs — API | PENDIENTE DE CONFIGURACIÓN | falta `ELEVENLABS_API_KEY` + voice_ids; host bloqueado en este entorno cloud; no probado con llamada real |
| Fondos IA (OpenAI imágenes) | PARCIALMENTE INSTALADO | código y guardas listos, desactivado, sin clave, no probado |
| Lip-sync fonético (Rhubarb) | PARCIALMENTE INSTALADO | integración automática si se instala `rhubarb`; hoy se usa aproximación por amplitud |
| Música y SFX | PARCIALMENTE INSTALADO | mezcla/ducking/loudnorm listos; biblioteca vacía (sin música con licencia) |
| Generación automática de música | NO IMPLEMENTADO | fuera de alcance; se importa música con licencia |
| Ejecución 24/7 en la nube | NO IMPLEMENTADO | este contenedor es efímero; usar máquina propia/servidor |

## Pruebas superadas (31/31)
19 unitarias · 11 integración/recuperación/panel · 1 end-to-end con render real (idea → propuesta con imágenes reales → aprobación → voz sintética de prueba → lip-sync → animación → mezcla con ducking → render → QA → entrega → siguiente propuesta).

## Rendimiento medido (4 vCPU, sin GPU)
| Métrica | Valor |
|---|---|
| Compilación del motor (una vez por versión) | 21,8 s |
| Still 1080×1920 | 2,8 s |
| Render completo (cámara 2.5D + DOF + acabado semirrealista) | 14,8× tiempo real (7,4 s en 109 s) → ≈10 min por episodio de 40 s |
| Re-render sin cambios (caché por plano) | 0,7 s (≈88× más rápido) |
| Episodio TEST completo de 11,6 s, de idea a entrega (máquina) | ≈2,5 min |
| Tamaño de entrega | ≈0,45 MB/s de vídeo |
Multiplicador "200×" respecto a un flujo manual: **no demostrado** (no hay línea base manual medida). Lo medido es lo de esta tabla.

## Límite honesto de calidad visual
Vectorial generado por código: nivel cartoon profesional limpio, por debajo de un ilustrador humano en detalle y personalidad del trazo. Para ese nivel: importar personajes dibujados por capas (no implementado).

## Errores conocidos
Ninguno crítico. Avisos: el line-boil y el grano añaden coste de render (desactivables en `style_bible.json → texture`).
