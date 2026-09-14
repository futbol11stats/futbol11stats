# Pipeline · (1) Refresco SEGURO de web_campo_equipo · (2) Recontrastar el inventario con count(*) real

**Fecha:** 2026-09-14 · **Contexto:** el inventario marcó `web_campo_equipo` (matview) y `web_campo_mapa` (tabla)
como "0 filas" y candidatas a trabajo/poda. Verificado en la web: **NO están vacías** (`count(*)` = **4.792** y
**413**), se usan en cada ficha de campo, y una es **load-bearing sin fallback**. El "0" era un artefacto de
estadísticas (ver §2).

## 1 · AVISO CRÍTICO — `web_campo_equipo` es LOAD-BEARING SIN FALLBACK
Lo primero que hay que saber antes de tocarla:
- La ficha de campo (`getCampo`, `src/lib/campo.ts:82-87`) lee esta vista para "Equipos que juegan aquí" **y como
  gate anti-thin**: `if (orden.length === 0) return null` → la página entera hace `notFound()` (404).
- **NO hay fallback.** Si un `REFRESH MATERIALIZED VIEW` la deja vacía **aunque sea un instante**, en esa ventana
  **TODAS las fichas de campo (~418) devuelven 404** a quien las visite (y peor: se cachearían así en ISR).
- **Requisito:** cualquier refresco debe ser **`REFRESH MATERIALIZED VIEW CONCURRENTLY`** (no vacía la vista
  durante el refresh; exige un índice único en la matview) **o**, si no se puede CONCURRENTLY, **verificar
  `count(*) > 0` DESPUÉS** y abortar/alertar si quedó vacía (nunca publicar el estado vacío).
- **Frecuencia:** es una matview → se queda rancia según entran actas/campos nuevos, así que **sí conviene
  refrescarla, pero atada a la CASCADA (cuando hay actas nuevas)**, no un nightly ciego. Y los **412 PNGs de
  `web_campo_mapa`**: regenerar **solo los que cambian** (campo nuevo o coordenada editada en el dashboard), no
  los 412 cada noche. `web_campo_mapa` es lo que pinta el mapa visible (`<img>` del PNG del bucket), versionado
  con `updated_at` (?v=) para romper la caché del CDN; las coords de `web_campo` solo alimentan los enlaces a Maps.

## 2 · LECCIÓN DE MÉTODO — el inventario usó pg_stat; recontrastar con count(*)
El inventario tomó "filas" y "lecturas" de `pg_stat`/`pg_class` (`n_live_tup`/`reltuples`). Esas fuentes dan **0
para vistas materializadas** (las estadísticas de tabla normales no las rastrean) y para **tablas sin `ANALYZE`
reciente** — aunque tengan miles de filas. Es lo que pasó aquí: "0 filas" con 4.792/413 reales, y objetos que se
usan en producción. **Casi se poda algo vivo basándose en un estimador.**

Si la fuente no es fiable para matviews ni para tablas sin ANALYZE, **otras conclusiones del inventario pueden
estarlo también** — sobre todo las que llevan a una DECISIÓN. Petición:
- Antes de podar/mover/recortar cualquier objeto, **recontrastar su tamaño con `SELECT count(*)` real** (no
  `n_live_tup`/`reltuples`), y su uso con una fuente fiable (no un estimador que puede estar a 0 por falta de
  ANALYZE).
- **Prioritario recontrastar las que el inventario marcó "poco leídas pero reescritas enteras"** —candidatas a
  poda o a cambio de estrategia—: **`web_suspendidos`, `web_xi_optimo`, `web_percentiles`** (y cualquier matview).
  Confirmar filas reales y uso real antes de decidir.
- Recordatorio: los objetos `web_*` los consume la web por su nombre; "poco leído" en pg_stat no equivale a "no
  usado" (una lectura cacheada 30 días en la web puede no reflejarse, y una matview puede leerse mucho sin que su
  n_live_tup lo diga).

## Datos verificados (2026-09-14, count(*) real en Supabase)
- `web_campo_equipo` = 4.792 filas (matview; alimenta la lista + el gate 404 de la ficha de campo).
- `web_campo_mapa` = 413 filas (tabla; flag + versión del PNG estático que se muestra).
- `web_campo` = 418 filas (416 con lat/lng).
