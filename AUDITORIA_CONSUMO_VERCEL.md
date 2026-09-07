# Auditoría de consumo en Vercel — 2026-09-06 (rev. 2026-09-07 con el € real del panel)

> **DIAGNÓSTICO CORREGIDO con el desglose en €. El 81% del gasto es MEMORIA PROVISIONADA mientras las
> funciones corren — NO las regeneraciones ni el nº de deploys ni las ISR-writes (esas son calderilla).**
> La causa de fondo: las funciones se quedan **esperando a la BD** y facturan memoria todo ese rato. Una BD
> lenta/saturada hace CARA la web.

## El € real (panel Usage, ciclo actual) — total infraestructura $19,55

| Partida | Consumo | € | % |
|---|---|---:|---:|
| **Fluid Provisioned Memory** | 1.140 GB-Hrs | **$15,86** | **81 %** |
| Fluid Active CPU | 8 h | $1,48 | 8 % |
| Observability Events | 765 K | $0,92 | 5 % |
| Build CPU | 2 h | $0,60 | 3 % |
| ISR Writes | 121 K | $0,58 | 3 % |
| Resto | — | céntimos | — |

## 1 · Qué se cobra en "Provisioned Memory" y por qué es el 81%
Fluid Compute separa dos cosas:
- **Active CPU** ($/hora de CPU *realmente usada*): solo cuando la función COMPUTA.
- **Provisioned Memory** ($/GB-hora): la memoria asignada a la función **× el tiempo de RELOJ que la función
  está viva**, incluido el rato que pasa **esperando I/O** (la BD). Es la gracia —y la trampa— de Fluid: casi
  no pagas CPU mientras esperas, pero **sí pagas la memoria todo el tiempo de reloj**.

**La prueba está en el propio ratio: memoria $15,86 vs CPU $1,48 (≈11:1).** En unidades: 1.140 GB-Hrs de
memoria frente a **8 horas** de CPU activa. Aun suponiendo 2 GB por función, eso son ~570 horas de función
*viva* contra 8 de *cálculo* → **~1,4% de uso de CPU; el ~98,6% del tiempo facturado es la función viva pero
SIN computar = esperando.** Y lo único que espera es la BD (cada ficha hace 16+ consultas encadenadas).

→ **Cada segundo que una función espera a la BD cuesta dinero** (memoria × ese segundo). Confirmado.

## 2 · La BD saturada encarece la web — CONFIRMADO por los datos
- El ratio memoria/CPU (98,6% de tiempo esperando) solo se explica por I/O: las funciones no calculan, aguardan
  a Postgres.
- Latencia medida de la BD **bajo carga: 609 ms para UNA página keyset** (EXPLAIN ANALYZE, esta tarde). Sana
  serían ~5-50 ms. La ficha encadena **16+** de esas → el tiempo de reloj (y por tanto la memoria facturada)
  se multiplica ×10-100 cuando la BD va lenta.
- **97 errores 504 + 281 errores 500 en 24 h** (timeouts de BD). Un 504 = la función esperó hasta agotar el
  timeout (decenas de segundos) sujetando su memoria sin hacer nada: es el caso más caro posible, memoria pura
  tirada. Hoy la BD llegó a **caerse** (connection timeout, hizo falta reiniciarla).
- Conclusión: los episodios de BD lenta/caída y el pico de memoria son la MISMA cosa. La factura de Vercel es,
  en su mayor parte, **tiempo de espera a una BD infradimensionada** (2,5 GB de datos; `web_jugador_partidos`
  = 1,2 GB ella sola).
  > **Actualización 2026-09-07:** la instancia estaba mal configurada (Pro con máquina del plan gratuito,
  > t4g.nano 0,5 GB) y se ha pasado a **Micro 1 GB** — el doble, sin coste extra. Sigue justa (2,5 GB de datos),
  > pero es el doble de lo que caía. Todo lo de abajo sobre "0,5 GB" léase sobre 1 GB.

**Corolario importante:** subir el tier de la BD no es solo "que no se caiga" — **abarata la web**: menos espera
= menos GB-Hrs de memoria. El upgrade de BD se paga en parte solo con el ahorro de Vercel.

## 3 · Bajar la memoria por función — DESCARTADO (no existe el escalón)
Idea inicial: si las funciones (I/O-bound, Active CPU solo 8%) estuvieran sobredimensionadas, bajar los GB
recortaría el 81% linealmente. **Pero no se puede:** Fluid está en **Standard (1 vCPU / 2 GB), que es el
tamaño MÁS PEQUEÑO**; el único escalón es hacia arriba (Performance 2 vCPU / 4 GB). No hay ahorro por aquí.

## 3-bis · DECISIÓN: bajar el Default Max Duration 300 s → 60 s (+ overrides de 120 s en rutas largas)
En la misma pantalla (Settings → Functions) el **Default Max Duration está en 300 s**. Con el modelo memoria ×
tiempo-de-reloj, una función colgada esperando a la BD **sujeta sus 2 GB hasta 5 minutos** antes de rendirse.
**Probado en logs:** los 504 son literalmente `Vercel Runtime Timeout Error: Task timed out after 300 seconds`
(cúmulo hacia las 07:00, con la BD agonizando). Cada uno = 2 GB × 300 s tirados.

- **Render sano:** ~1-3 s (ficha, 16 consultas indexadas); incluso lento-pero-válido con la BD tocada
  (609 ms/consulta × 16) ≈ ~10 s. Nada legítimo de usuario se acerca a 300 s.
- **Decisión: Default global = 60 s** (6× el peor caso legítimo → no rompe páginas de usuario) **+ overrides a
  120 s por ruta en los procesos legítimamente largos** (escaneos de tabla y fetch de sitemaps), de baja
  frecuencia, así que su cap alto no pesa: `jugadores/sitemap`, `equipos/sitemap`, `sitemap.ts`, `robots.ts`,
  `/api/cron/sitemap-check` → `export const maxDuration = 120`.
- **Ahorro:** los 97 timeouts/día de 300→60 s = 97 × 240 s = **6,47 h-función/día = ~12,9 GB-Hrs/día** a 2 GB
  (~$0,18/día en un día malo como hoy; hasta ~34% de la factura de memoria en días con esa tasa de timeouts;
  en días sanos, calderilla). Y capa además cualquier render legítimo que hoy corra 60-300 s bajo estrés. Es
  **seguro barato que acota el peor caso**, cero código en lo global (Fernando lo cambia en el panel).
- **ORDEN OBLIGATORIO:** primero desplegar los overrides de 120 s (próxima tanda) y **DESPUÉS** bajar el
  default a 60 en el panel. Si se baja antes, sitemaps/robots/cron quedarían capados a 60 y podrían fallar.

## 3-ter · El aviso de sitemap vacío es DECORATIVO hasta arreglar el WAF (config, no código)
Al final de cada revalidación, el pipeline hace POST a `/api/sitemap-health` y recibe **429 "Vercel Security
Checkpoint"** (probado: POST server-side → 429; el control POST `/api/revalidate` → 400, sí llega al handler).
El firewall tiene allow-list para `/api/revalidate` pero **no** para `/api/sitemap-health`. Si la sonda nunca
puede comprobar, el aviso de 3 capas es decorativo. **Arreglo = config del WAF** (allow-list), NO código:
- `/api/sitemap-health` (para que el pipeline llegue),
- `/api/cron/*` (para que la propia llamada del cron no la corte el WAF y dé un falso "cron failed"),
- y los GET de sitemap/robots (`/robots.txt`, `/sitemap.xml`, `/{jugadores,equipos}/sitemap/*`) para que el
  `fetch` interno del detector lea XML real y no el challenge.

## 4 · Observability Events (765 K → $0,92) — calderilla
Los genera Vercel automáticamente: un evento por request + cada línea `console.*` + trazas. 765 K ≈ el volumen
de requests del ciclo. **A $0,92 no compensa optimizarlo.** Si se quisiera bajar: reducir el ruido de
`console.*` (tenemos varios `console.error` en sitemaps/índices) o el nivel de Observability, pero el ahorro es
marginal. No es prioridad.

## Datos de compute medidos (runtime logs, 24 h) — siguen valiendo para localizar el tiempo
`function` 14.750/día · `cache` 11.893 · `rewrite` 4.661. Reparto por ruta (serverless):

| Ruta | Invoc./día | % | Coste de tiempo |
|---|---:|---:|---|
| /madrid/jugador/[slug] | 7.398 | 50,7 % | **16+ consultas encadenadas** — el mayor sumidero de espera |
| competición …/[jornada]/[tab] | 3.330 | 22,8 % | varias consultas + superficie ×34 jornadas |
| jugador/[slug]/[temporada] | 1.132 | 7,8 % | |
| equipo/[slug] (+temporada) | 1.334 | 9,1 % | |
| partido/[slug] | 763 | 5,2 % | |
| resto | ~650 | ~4 % | |

La ficha de jugador es el 59% de las invocaciones **y** la más pesada en consultas → es donde más TIEMPO de
espera (=memoria) se acumula.

## Recortes reordenados por € (el 81% es tiempo-de-memoria = espera a BD × nº consultas)

| # | Acción | Ataca | Ahorro | Esfuerzo |
|---|---|---|---|---|
| **1** | **Default Max Duration 300→60 s** + overrides 120 s en rutas largas (§3-bis) | el peor caso: funciones colgadas × 2 GB × 300 s | ~12,9 GB-Hrs/día en día malo; acota el peor caso siempre | **Cero código** (panel) + overrides ya en repo |
| — | ~~Bajar memoria por función~~ | — | DESCARTADO: Standard 1v/2GB es el suelo | — |
| **2** | **BD: ya en Micro 1 GB** (gratis, era config errónea) + optimizaciones del pipeline (delta web_jugador + acotar a temporada activa). **Small 2 GB = último recurso** solo si eso no basta | el tiempo de espera de TODAS las funciones | grande e indirecto (menos GB-Hrs) + deja de caerse | Micro: hecho · Small: condicionado |
| **3** | **Consolidar la ficha 16+ consultas → 1** (4b: el pipeline precomputa una fila JSON; la web lee 1) | el tiempo de la ruta del 59% | grande y permanente | Alto (~2-4 d, sobre todo pipeline) |
| 4 | **4a quick win**: dedup lecturas repetidas + colapsar el fan-out por grupo (4→1) | ~30-40% del tiempo de la ficha | medio | ~1 día |
| 5 | Agrupar deploys / no bumps globales | menos invocaciones lentas durante tormentas de regeneración que coinciden con BD estresada | secundario (ya no es la causa) | cero código (norma) |
| — | Observability / ISR-writes | — | calderilla, ignorar | — |

**Reordenamiento clave respecto a la rev. anterior:** optimizar las 16 consultas de la ficha importa por el
**TIEMPO** que ahorra (memoria facturada), no por el número de regeneraciones. Y el tier de BD pasa a ser
palanca de COSTE, no solo de disponibilidad. Batching de deploys baja a secundario (las ISR-writes eran
calderilla), aunque sigue siendo buena higiene.

## Presupuesto del #4 — consolidar la ficha (sin cambios respecto a la rev. anterior)
- **4a (~1 día, bajo riesgo):** dedup de lecturas repetidas de `web_jugador_partidos` + colapsar
  `resultadosGrupoRich` (hasta 4 consultas por grupo, en bucle) a 1 por grupo o un `IN()`. –30-40% de idas y
  vueltas.
- **4b (~2-4 días, recomendado):** el pipeline precomputa una fila "ficha jugador" (JSON) — patrón del digest
  de la home — y la web lee 1 fila. Saca la agregación del camino caliente: cada render pasa de 16+ esperas a
  1. Es el que más recorta el 81% a largo plazo.
- Evitar el RPC que replique la lógica en SQL (duplica la cruz de ausencias, más riesgo). Mejor 4b.
