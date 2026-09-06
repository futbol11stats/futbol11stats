# Auditoría de consumo en Vercel — 2026-09-06

> **Hallazgo principal, sin rodeos: EL GASTO LO GENERAMOS NOSOTROS.** No es el tráfico ni el tamaño de la
> base de datos: es nuestro ritmo de trabajo. En un solo día hicimos **15 despliegues**, y **cada despliegue
> invalida TODA la caché ISR** → cada página visitada después se regenera desde cero. Encima, un **bump global
> de caché** (`getCarreraV2 v5→v6`) forzó regenerar las **39.000 fichas** a la vez. Eso explica las ~7.400
> regeneraciones de ficha del día y buena parte de los errores 504 de la BD.

Fuente: Vercel MCP (runtime logs 24 h + despliegues del día). El desglose en € (ISR-writes, GB-hrs, ancho de
banda) vive en **Vercel → Usage**, que el MCP no expone; aquí se prioriza por **invocaciones de función
reales**, que son el proxy directo del compute.

## Datos medidos (24 h)

**Invocaciones por fuente:** `function` 14.750 · `cache` 11.893 · `rewrite` 4.661. El compute lo mandan las
funciones (~14.750/día).

**Compute por ruta (solo `serverless`, ~14.600 total):**

| Ruta | Invoc./día | % | Tipo |
|---|---:|---:|---|
| /madrid/jugador/[slug] | 7.398 | 50,7 % | ISR on-demand · **16+ consultas** |
| /madrid/…/[jornada]/[tab] (competición) | 3.330 | 22,8 % | ISR on-demand · superficie enorme |
| /madrid/jugador/[slug]/[temporada] | 1.132 | 7,8 % | ISR |
| /madrid/equipo/[slug] | 806 | 5,5 % | ISR |
| /madrid/partido/[slug] | 763 | 5,2 % | ISR |
| /madrid/equipo/[slug]/[temporada] | 528 | 3,6 % | ISR |
| competición global/[tab] | 301 | 2,1 % | ISR |
| campos/clubes/buscar/sitemaps… | ~350 | ~2,4 % | mixto |

**Fichas de jugador ≈ 59 % + competición ≈ 25 % = 84 % del compute.**

**Estados HTTP:** 200 = 15.392 · **500 = 281** · **504 = 97** (timeouts de BD) · 304 = 153 · 404 = 25.

**Despliegues del día:** **15 de producción, 5 fallidos** (los de la colisión build×export).

**Configuración (código):**
- Toda ruta ISR lleva `revalidate=30d` con el comentario *"cada deploy invalida TODA la caché"*.
- Ficha de jugador: `generateStaticParams()=[]` + `dynamicParams=true` → **0 pre-renderizadas; todas on-demand**,
  cacheadas 30 d en la 1ª visita.
- Ficha de jugador: ~16 consultas y **fan-out por competición** (cada grupo dispara hasta 4 consultas más en
  `resultadosGrupoRich`) → las 16 son un SUELO; un jugador multi-competición cuesta más.

## Respuestas a las cinco preguntas
1. **Qué consume:** compute (funciones), no ancho de banda. 84 % son fichas de jugador + competición.
2. **Cuántas regeneran y por qué:** ~7.400 regeneraciones/día de la ficha de jugador, **en su mayoría NO por
   tráfico**: los 15 deploys invalidan la ISR entera y el bump `v6` regeneró las 39 k fichas. Causa = nosotros.
3. **Páginas caras que regeneran mucho:** sí — la ficha (16+ consultas) a 7.400/día es EL gasto.
4. **Rutas dinámicas cacheables:** la de competición (22,8 %) es ISR pero se re-renderiza por cada URL, y el
   time-machine de jornadas multiplica la superficie ×34. `/clubes` `/campos` son `force-dynamic` (pequeñas).
   `/buscar` sí debe ser dinámica.
5. **Despliegues:** 15, cada uno invalida toda la ISR → son el **multiplicador** de todo el compute.

## Recortes por RATIO (impacto / esfuerzo)

| # | Acción | Ahorro | Esfuerzo | Estado |
|---|---|---|---|---|
| **1** | **Agrupar despliegues 15/día → 1-2/día** + no hacer bumps globales de caché | El mayor: recorta el multiplicador sobre el 84 % del compute + menos 504 de BD + ~13 builds/día | **Cero código** (norma de trabajo) | **NORMA (ver manual)** |
| 2 | Canonical/noindex de jornadas NO actuales en competición (que los crawlers no generen ×34) | Parte del 22,8 % | Medio | Pendiente (cuando se estabilice) |
| 3 | `revalidateTag` acotado en vez de bump global de clave | Grande cuando aplica | Bajo (disciplina) | Incluido en la norma #1 |
| 4 | Consolidar las 16+ consultas de la ficha en 1 | Abarata CADA regeneración del 59 % | Alto | Presupuestado (abajo) |
| 5 | Eliminar builds fallidos (lock + no desplegar durante export) | ~5 builds/día | Bajo | En el plan de pipeline |

## Presupuesto del #4 — consolidar la ficha de jugador
Hoy la ficha hace ~16 idas y vueltas a la BD por render, con fan-out por competición. Cada regeneración paga
todo eso. Opciones, de menor a mayor:

- **4a · Quick win (barato, bajo riesgo, ~1 día):** dedup de las lecturas repetidas de `web_jugador_partidos` y
  colapsar el fan-out de `resultadosGrupoRich` (hoy hasta 4 consultas por grupo, en bucle) a **1 por grupo** o
  un `IN()` sobre todos los grupos. Recorta ~30-40 % de las idas y vueltas de la ficha sin tocar el modelo.
- **4b · Fix estructural (recomendado, ~2-4 días, más riesgo):** que **el pipeline precompute una fila "ficha
  jugador" (JSON)** — mismo patrón que el digest de la home — y la web lea **1 fila**. La agregación pesada
  (carrera + actuaciones + ámbito con ausencias + forma + tarjetas + copas) se hace **una vez por export**, no
  en cada regeneración. Reparto: casi todo en el pipeline (C:\rffm-pipeline) + storage (~39 k filas) +
  revalidación por `jugador:<cod>` (que ya existe); la web cambia 16 lecturas por 1. **Es el que más vale a
  largo plazo** porque saca el coste del camino caliente por completo.
- **Evitar:** un RPC de Postgres que replique toda la lógica de agregación en SQL — mismo beneficio que 4b pero
  duplicando lógica compleja (la cruz de ausencias es delicada) y con más riesgo de regresión. Mejor 4b.

**Orden sugerido:** 4a ya da alivio con poco riesgo; 4b cuando haya margen, y es el objetivo real. Ambos NO
urgen hasta estabilizar el ritmo de deploys (#1), que es lo que de verdad está disparando el gasto hoy.
