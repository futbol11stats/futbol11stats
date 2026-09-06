# Petición al pipeline — aligerar el build (contador precalculado) + lock build×export

> **ESTADO: PREPARADA, NO PASADA (2026-09-06).** No la ejecutes aún: Fernando va a valorar **subir el tier
> de la BD** (nano 0,5 GB → Small 2 GB / Medium 4 GB). Según esa decisión, la parte B (lock) puede dejar de
> compensar el trabajo. La parte A (contador) vale igual con cualquier tier.

## Contexto (por qué, y qué cambió)
Hubo 4 deploys caídos porque el build agotaba la BD (t4g.nano, 0,5 GB RAM, 2,5 GB de datos) generando los
sitemaps **mientras corría `_jugadores_export.py --subir`** → *statement timeout* → build abortado. Se arregló
en la web con resiliencia (sitemaps/robots degradan, índices de navegación fallan-visible en vez de publicar
vacío) — eso ya está y no depende de esta petición.

**PERO el diagnóstico cambió:** la última caída fue **SIN export** — una consulta trivial daba *connection
timeout* y hubo que reiniciar la BD. Sin fuga de conexiones ni consulta colgada (21/60, 0 idle-in-tx): fue
**agotamiento de recursos**. La tabla `web_jugador_partidos` pesa **1,2 GB** ella sola (2,4× la RAM). O sea:
**el cuello se ha mudado al TIER de la BD**, no a la coincidencia build×export. Eso reordena las prioridades de
abajo.

---

## A) CONTADOR PRECALCULADO de particiones de sitemap — **MEJORA QUE VALE SIEMPRE (prioritaria)**

**Por qué vale igual con nano o con Small:** hoy el build **cuenta filas en vivo** en varios sitios para saber
cuántas particiones de sitemap anunciar:
- `robots.ts` → `contarKeyset('web_jugador')` + `contarKeyset('web_equipo')` (2 escaneos completos por build).
- `generateSitemaps` de jugadores y de equipos → recuento (otro escaneo por catálogo).

Son ~3-4 escaneos de RECUENTO de tablas grandes (`web_jugador` ~39 k filas paginadas de 1.000) que **no aportan
dato nuevo**: el número de filas ya lo conoce el export justo después de escribirlas. Precalcularlo quita esos
escaneos del build **sin depender del tamaño de la instancia** → el beneficio es el mismo con nano o con Small.

### Qué se necesita
Una tabla meta diminuta que el export puebla al final:

| Columna | Descripción |
|---|---|
| `catalogo` | `'jugadores'` \| `'equipos'` (clave) |
| `n_filas` | nº de filas publicadas de `web_jugador` / `web_equipo` (aficionados, mismo filtro que el sitemap: equipos con `rama != 'juvenil'`) |
| `actualizado` | timestamp del último export |

> Basta `n_filas`; la web calcula las particiones con su propia constante de tamaño (`JUGADORES_SITEMAP_CHUNK`
> = 10.000, `EQUIPOS_SITEMAP_CHUNK` = 10.000) → `ceil(n_filas / CHUNK)`. Así el tamaño de partición sigue
> viviendo en un solo sitio (la web) y el pipeline no tiene que conocerlo. Si prefieres, escribe también
> `n_particiones` para cruce, pero la fuente del cálculo es la web.

### Cómo lo consumirá la web (yo lo cableo cuando se apruebe)
`generateSitemaps` (jugadores/equipos) y `robots.ts` leen esa fila (1 lectura diminuta) en vez de contar.
**Degradación segura:** si la fila falta o es más vieja que el último export conocido, se cae al camino actual
(memoización del fetch de contenido / `contarKeyset`) — es una optimización, nunca una dependencia dura. El
CONTENIDO de cada partición sigue leyéndose (es inherente); esto solo elimina el RECUENTO.

---

## B) LOCK build × export + orquestación — **RED DE SEGURIDAD (en pausa)**

**Degradado a complemento:** ya NO ataca la causa principal (la BD cae también sin export). Sigue siendo útil
para que un deploy no coincida con un proceso pesado, pero su relación coste/beneficio depende del tier: **si se
sube a Small, quizá no compense el trabajo.** Por eso queda en pausa hasta la decisión de Fernando.

### Qué sería (si se hace)
1. **Flag de export** en la tabla meta (o fila aparte): el export marca `export_en_curso = true` al empezar y
   `false` al acabar. La etapa de DATOS del sitemap lee el flag: si hay export, **no escanea** — sirve las
   particiones vacías *a propósito* (log "diferido por export", no error) y la revalidación post-export (que el
   pipeline ya hace) las repuebla. Convierte la colisión en un estado conocido y auto-sanado. Cubre también un
   push de código manual durante el export (el caso que pasó).
2. **Orquestación:** el export dispara el *deploy hook* de Vercel al terminar, y se evita pushear durante el
   export. Norma que evita la coincidencia de entrada.

> Nota: los índices de navegación de usuarios (home/aficionados/juveniles) ahora **fallan-visible** si la BD no
> responde en build (no publican vacío). El flag permitiría que, durante un export, esos builds se pospongan en
> vez de fallar — pero un build de Vercel no "espera": la vía realista es la orquestación (no desplegar durante
> el export), no que el build bloquee.

---

## Lo que YA está hecho (no forma parte de esta petición, pero para contexto)
- Resiliencia de sitemaps/robots + fail-visible de índices de navegación (web).
- Aviso de sitemap vacío en 3 capas: cron de Vercel (correo), endpoint `/api/sitemap-health` (POST), chequeo
  post-revalidación en `_revalidar.py` (`comprobar_sitemaps_y_avisar`) y tarjeta en el dashboard. Detector único
  que distingue *vacío real* de *no verificable* (sin falsos positivos). **Requiere** que el WAF no ponga
  `/robots.txt`, `/sitemap.xml`, `/{jugadores,equipos}/sitemap/*` ni `/api/cron/*` bajo Challenge (Fernando lo
  revisa en Vercel → Firewall).

## Orden sugerido cuando se apruebe
1. **A (contador)** — siempre; la web lo lee con degradación segura.
2. **Decisión de tier de BD** (Fernando) — es el arreglo de fondo de las caídas.
3. **B (lock/orquestación)** — solo si tras subir tier sigue compensando.
