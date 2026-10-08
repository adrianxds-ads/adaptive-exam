# Cambridge Quiz — B2 First

## Arquitectura
Dos modos complementarios en la misma app: Quiz (modalidad principal y adaptativa) y Estudio (exámenes completos originales). El antiguo Modo Estudio no se modifica. Part 4 se mantiene en Estudio y en la aplicación de transformations.

## Implementado
- 30 exámenes completos en banco Quiz, 240 preguntas en cada Part 1–3: **720 preguntas verificadas**.
- Exámenes 01–10: transcritos desde el documento maestro de Drive (revision consultada 2026-10-08), con 240 respuestas contrastadas automáticamente con el banco de claves existente. Escaneos conservados en Estudio.
- Exámenes 11–30: 480 preguntas estructuradas reutilizadas del banco previo.
- 15 preguntas por ronda. Part 1: cuatro opciones y 15 s; Parts 2–3: una palabra escrita y 30 s.
- Pasar sin puntos; respuesta correcta: 100 puntos más bonificación hasta 50 según rapidez.
- Selección adaptativa que prioriza preguntas no vistas y errores; jamás inventa preguntas.
- Contexto desplazable del texto original, difuminado superior/inferior, hueco resaltado, palabra base en Part 3; teclado personalizado compartido.
- Registro por pregunta bajo cambridgeB2ExerciseStatsV3, separando los IDs Quiz de los IDs Estudio; corregido el filtro del dashboard antiguo para que no mezcle ambos históricos.
- Medallas 13/14/15, estrellas compartidas y gráficas de acierto y automatismo mediante HubCharts.
- URLs directas de cada modo: cambridge-quiz.html?part=1|2|3.

## QA 2026-10-08
- Archivo de prueba de datos local: C:\Users\adria\quiz-qa\cambridge-quiz-bank-test.cjs.
- **PASS:** 10 exámenes añadidos, 240 preguntas nuevas, 240 claves cotejadas, 80 preguntas nuevas por modalidad; 720 total.
- Navegador Chrome/Edge headless: C:\Users\adria\quiz-qa\cambridge-quiz-smoke.cjs.
- **PASS:** 240 preguntas por modalidad, navegación, 15 preguntas completas, puntuación por velocidad, corrección escrita, omisión, guardado, tres integraciones compartidas (achievements, charts y teclado).
- Responsive sin desbordamientos a 360, 390, 500 y 1280 px.
- Capturas de las 3 modalidades en C:\Users\adria\quiz-qa\cambridge-quiz-part1.png, part2.png y part3.png.
- Comprobación visual de muestra de escaneos de exámenes 01, 03, 07 y 10 frente a la transcripción maestra.

## Observaciones
- Pendiente comprobación funcional directa en Pixel; las pruebas automáticas en navegador ya son satisfactorias.
- El banco transcrito es para estudio personal: verificar permisos antes de cualquier redistribución pública de contenidos originales de Cambridge.


## 1.2.16 · 2026-10-08
Tres tiempos por pregunta: 180 segundos por defecto, media orientativa de examen (53/53/45 segundos) y sin límite. Preferencia local persistente. Tabla completa de las siete partes, revisión y enlace oficial. Modo y límite quedan registrados con cada respuesta. Sin tiempo: 100 puntos por acierto, sin bonificación por rapidez.

Pruebas: 18 rondas completas en Chrome, 412 y 1280 px, tres partes y tres tiempos, caducidad única, duración sin límite y preferencia tras recarga. Tabla móvil revisada visualmente. Datos de prueba aislados; no se ha utilizado el progreso real. Evidencia: TIMING_ACCEPTANCE_2026-10-08.json.
