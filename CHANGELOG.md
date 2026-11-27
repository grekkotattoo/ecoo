# CHANGELOG

## 1.4.0 — 2026-11-27 · @react-three/fiber (híbrido 2.5D)
- Instalados @react-three/fiber 8.17.10, three 0.169.0 y @remotion/three 4.0.547 (versiones fijas; R3F 8 = compatible con React 18).
- Motor de escena `auto` (por defecto): usa three.js SOLO donde aporta, con la misma cámara 3D que la capa vectorial:
  · escenarios con ambiente `neon`/`noche` → fondos como planos 3D iluminados con luces de neón reales (texturas generadas una vez y cacheadas);
  · efectos `impact`, `sparks`, `confetti` → escombros/chispas/confeti 3D con profundidad real, por delante de los personajes.
  Personajes y resto de planos siguen en la capa vectorial (sin raster por fotograma). `engine: "r3f"` fuerza three.js en todo; `"css"` lo desactiva.
- Medido (clip 7,4 s, 4 vCPU): CSS 21 s · auto con 2/3 planos iluminados + FX 3D 66 s · r3f total 75 s. Un plano sin luces ni FX cuesta lo mismo que antes.

## 1.3.0 — 2026-11-27 · Estilo urbano + render rápido
- Biblia visual v4 "Urbano gráfico — caricatura extrema" (por defecto): color plano + 1 sombra dura, contorno negro grueso,
  personajes geométricos extremos (cabezas desproporcionadas, extremidades fideo, manos y zapatillas enormes, caras cínicas),
  vestuario urbano (hoodie, chándal, chaqueta; gorra, gorro, cadena, auriculares), escenarios nocturnos con ladrillo, persianas,
  pintadas en rotulador, neones, farolas y skyline. Fuentes Anton y Permanent Marker. Sin degradados, desenfoques ni texturas.
- Render: animación en dobles (1 de cada 2 fotogramas), resolución interna al 75 % con reescalado lanczos, planos pendientes
  en una sola llamada al motor, caché por plano en fotogramas JPEG y una única codificación final.
  Resultado: 3,2× tiempo real (antes 14,8×; pico 47×). Re-render sin cambios: <4 s.
- Los estilos anteriores (premium v2/v3) siguen disponibles cambiando `builder` en la biblia visual.

## 1.2.0 — 2026-11-27 · Cámara 2.5D, actuación exagerada y acabado semirrealista
- Cámara 2.5D real: cada capa es un plano a su profundidad en un espacio con perspectiva; dolly, órbita, grúa, roll, vértigo,
  swoop, rack focus y desenfoque de profundidad (DOF). Ningún plano es estático (deriva + cámara al hombro sutil).
- Actuación: amplitudes ×2 en todas las acciones, habla con cabeza/cejas/hombros/ambos brazos y acentos con squash;
  nuevas acciones take, laugh, rage, cower, celebrate, facepalm, dance, sneak, faint; follow-through del pelo;
  "pop" de cabeza y ojos al cambiar de expresión; mandíbula ligada a los visemas.
- Acabado semirrealista (biblia v3): sombreado pictórico difuminado (sombra de forma, oclusión, luz de rebote), línea fina del color de la forma,
  piel con sombras cálidas, ojos almendrados con iris, pliegue y pestañas, cejas pelo a pelo, labios con volumen, nariz con aletas,
  manos con 4 dedos articulados, pelo por mechones, proporciones más creíbles.
- Rendimiento: DOF dentro del SVG (cacheable) → de 47× a 14,8× tiempo real. Comando `studio motionsample`.

## 1.1.0 — 2026-11-27 · Acabado visual "Cartoon adulto premium"
- Biblia visual v2: paleta saturada, sombras de color (violeta frío), luz de borde cálida, gradación cinematográfica, grano/viñeta más suaves.
- Personajes v2: línea de grosor variable (engrosada en el lado de sombra), pinceladas afiladas en detalles, sombreado en 3 tonos + brillos,
  ojos con iris degradado, pupila y doble brillo, párpados y pestañas, rubor, boca con interior/dientes/lengua, manos de 4 dedos,
  zapatos con suela, pliegues de ropa, pelo con mechones, reflejos y masa trasera que no tapa la cara, color de ojos configurable.
- Escenarios v2: cielo/pared con degradados y papel pintado, suelo en perspectiva, neblina atmosférica entre capas, resplandores y haces
  de luz, oclusión ambiental, sombras de contacto, primer plano cinematográfico en el borde inferior, sol emisivo sin sombra.
- Motor: sombra de contacto bajo los personajes (se encoge al saltar), cartela con rayos animados y título con relieve.
- Nuevo comando `studio stylesample`: muestra del acabado con personajes genéricos (no de la serie).
- Rendimiento de render sin cambios (8,1× tiempo real). 31/31 pruebas.

## 1.0.0 — 2026-11-27 · Instalación del estudio
- Proyecto previo `TattooRocketViral` movido intacto a `legacy/tattoo-rocket/`.
- Motor 2D Remotion genérico (`engine/`): rigs jerárquicos, 17 acciones, expresiones, visemas, cámara con parallax, 10 efectos, 6 transiciones, cartelas, subtítulos, grano/viñeta/line-boil, hoja de personaje.
- Orquestador Python (`studio/`): pipeline de 17 fases, aprobación humana con 7 acciones e invalidación selectiva, autopiloto con latido y lock, recuperación, backups, costes con guardas, QA con bloqueo, panel web, CLI.
- Integraciones: Claude Code (tareas), Anthropic API (SDK oficial, opcional), ElevenLabs (import + API con guardas), OpenAI imágenes (opcional, desactivado).
- Biblia visual v1 (`config/style_bible.json`), fuentes Bangers y Luckiest Guy.
- Pruebas: 31 (unitarias, integración, recuperación, panel, end-to-end con render real).
- No se ha creado ningún episodio, guion, personaje ni escenario de la serie.
