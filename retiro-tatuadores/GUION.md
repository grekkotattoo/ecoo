# EL RETIRO ESPIRITUAL DE TATUADORES — Guion definitivo

Falso documental · vertical 9:16 · 1080×1920 · 30 fps · ≈ 39 s (con tiempos provisionales)
Entrega **sin sonido**. La narración se genera aparte en ElevenLabs (4 archivos).

> Los tiempos son PROVISIONALES hasta que ejecutes `npm run voces` con los MP3 reales.
> Todos los cortes están anclados a **palabras** de la narración, no a segundos fijos.

---

## ESCENA 1 — EL VIAJE · `01_gancho.mp3`

**VOZ:** «¿Qué pasaría si en vez de ir a un estudio de tatuajes, te fueras a una cabaña en los Pirineos a hacerte un blackout con cinco monjes divorciados?»

| Plano | Entra en la palabra | Imagen |
|---|---|---|
| 1A Establecimiento | inicio | Pirineos de noche entre niebla. Una cabaña minúscula con ventanas encendidas; los faros de un coche suben por la pista. Rótulo: *UN DOCUMENTAL · EL RETIRO ESPIRITUAL DE TATUADORES · PIRINEO ARAGONÉS · 2.140 m · 23:47* |
| 1B Llegada | «fueras» | El coche entra en cuadro y frena. Cinco monjes inmóviles ante la puerta; el del centro sostiene una cuchara más alta que él. Los faros los barren. |
| 1C POV parabrisas | «con» | Desde el asiento del conductor: el limpiaparabrisas pasa una vez y los monjes siguen ahí. Las manos aprietan el volante (desconfianza). En «monjes» el monje central alza la cuchara; en «divorciados» brillan los ojos dentro de las capuchas. Rótulo: *COMUNIDAD DE SAN GERUNDIO — 5 monjes · 11 divorcios* |

## ESCENA 2 — EL MAESTRO · `02_maestro.mp3`

**VOZ:** «El maestro utiliza una técnica ancestral llamada oscuridad administrativa. Te hace meditar mientras te tatúa con una cuchara caliente.»

| Plano | Entra en la palabra | Imagen |
|---|---|---|
| 2A Primer plano | inicio | El anciano, en claroscuro de vela, mira a cámara absolutamente serio. Un único parpadeo lento. Rótulo: *HNO. ANSELMO — Maestro tatuador. Divorciado (3 veces)* |
| 2B La camilla | «Te» | Interior de la cabaña: el paciente tumbado sobre una puerta vieja apoyada en dos caballetes. El maestro se inclina hacia él; dos monjes observan desde la penumbra. |
| 2C Macro | «con» | La cuchara sobre la llama de una vela. En «caliente» el cuenco se pone al rojo y humea. **Remate:** el plano se sostiene después de la frase. |

## ESCENA 3 — LA TÉCNICA · `03_tecnica.mp3`

**VOZ:** «Según ellos, el dolor es tu ego abandonando el cuerpo. Aunque sospechas que puede ser la cuchara enchufada a una tostadora.»

| Plano | Entra en la palabra | Imagen |
|---|---|---|
| 3A Perfil | inicio | El protagonista medita con los ojos cerrados. En «dolor», la ceja y el párpado se contraen; le cae una gota de sudor. |
| 3B Los monjes | «ego» | Tres monjes asienten solemnemente al unísono en «abandonando» y en «cuerpo», mientras una columna de humo (el ego) sube desde la mesa. |
| 3C Paneo | «Aunque» | Travelling lateral continuo: brazo a medio ennegrecer → cuchara → cable trenzado con cinta aislante → llega a la **tostadora** justo en «tostadora». |
| Remate | fin de voz + pausa | Tras una pausa, la tostadora suelta dos tostadas; chispa en el enchufe y golpe de cámara. |

## ESCENA 4 — LA DESGRACIA · `04_final.mp3`

**VOZ:** «Sales con el brazo completamente negro. Pero al llegar a casa descubres que te han tatuado una puerta. Y alguien está llamando desde dentro.»

| Plano | Entra en la palabra | Imagen |
|---|---|---|
| 4A Salida | inicio | Amanecer gris. Cámara en mano siguiendo el brazo: negro de hombro a muñeca, envuelto en film. Al fondo, en la niebla, los monjes despiden; el de la cuchara la agita. |
| 4B Casa | «Pero» | Cocina de piso; el fluorescente arranca parpadeando. Él, de espaldas, con el brazo negro sobre la mesa. Rótulo: *ZARAGOZA — Dos días después* |
| 4C Descubrimiento | «descubres» | Cenital del antebrazo. Un brillo de vaselina barre la piel y, en «tatuado», aparece en relieve una pequeña puerta con pomo de latón. |
| 4D La llamada | «Y» | Plano detalle de la puerta. En «alguien» se enciende luz por la rendija inferior. En «llamando» el pomo gira, no abre, vuelve. **Pausa.** Tres golpes desde dentro: la puerta empuja la piel, la cámara salta, polvo de tinta. Se sostiene el plano ~1 s. |
| Final | — | **Corte seco a negro** (0,8 s). |

---

### Notas para ElevenLabs (opcionales, no cambian el texto)
- Voz de narrador de documental: grave, pausada, totalmente seria.
- Para reforzar los remates puedes insertar una pausa SSML sin tocar las palabras:
  - Escena 3: `…abandonando el cuerpo. <break time="0.5s" /> Aunque sospechas…`
  - Escena 4: `…una puerta. <break time="0.6s" /> Y alguien está llamando desde dentro.`
- Si usas el endpoint **with-timestamps**, guarda la respuesta JSON junto al MP3 (`01_gancho.json`…): el montaje usará el tiempo exacto de cada palabra.
