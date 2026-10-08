# Cambridge Quiz — rama de desarrollo

Prototipo independiente del modo Estudio, que sigue intacto. La portada de Cambridge permite elegir Quiz o Estudio.

## Implementado
- 3 modalidades: Part 1 (cuatro opciones, 15 s), Part 2 (respuesta escrita, 30 s), Part 3 (word formation con palabra base, 30 s).
- 15 preguntas por ronda, corrección y explicación inmediatas, opción Pasar, bonificación por rapidez exclusivamente para respuestas acertadas.
- Selección adaptativa que prioriza preguntas no vistas y previamente falladas; únicamente preguntas originales del banco, nunca generadas.
- Contexto del texto fuente con desplazamiento y degradado, hueco actual destacado y teclado compartido.
- Historial registrado respuesta a respuesta bajo cambridgeB2ExerciseStatsV3; IDs de intentos distintos de los exámenes completos.
- Escala de medallas 13/14/15, enlace con el libro de estrellas y gráficas mediante el componente común HubCharts.
- Enlaces directos ?part=1, ?part=2 y ?part=3.

## Cobertura del banco
- 11–30: 20 pruebas estructuradas, 160 preguntas en cada Part 1–3 = 480 listas.
- 01–10: 10 pruebas escaneadas con claves, pero sin texto y opciones estructurados (faltan 240 ítems para quiz). No se generan enunciados ficticios.
- La Part 4 permanece en Modo Estudio / aplicación específica de Key Word Transformations.

## Pendiente antes de publicar
- Transcribir/verificar las 240 preguntas correspondientes a exámenes 01–10, si se desea cobertura completa.
- Comprobar el teclado personalizado y sincronización de Pixel ↔ PC en dispositivo real.
- Revisar integración final de métricas y premios con el Hub, incluyendo política de automatismo (6 s en Part 1; 12 s en Parts 2–3).
- Validar textos de fuente y derechos de uso antes de redistribución fuera del entorno de estudio.

## QA ejecutada — 2026-10-08
- Scripts de navegador en C:\Users\adria\quiz-qa\cambridge-quiz-smoke.cjs.
- PASS: 160/160/160 ítems, viewports de 360/390/500/1280 px sin desbordamiento, selección correcta, 15 preguntas completas, 17 intentos guardados y salto de ejercicio. 
- Capturas en C:\Users\adria\quiz-qa\cambridge-quiz-part1.png, part2.png y part3.png.
- Esta rama no debe desplegarse automáticamente antes de revisión final.
