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
  en su mayor parte, **tiempo de espera a una BD infradimensionada** (t4g.nano 0,5 GB con 2,5 GB de datos;
  `web_jugador_partidos` = 1,2 GB ella sola).

**Corolario importante:** subir el tier de la BD no es solo "que no se caiga" — **abarata la web**: menos espera
= menos GB-Hrs de memoria. El upgrade de BD se paga en parte solo con el ahorro de Vercel.

## 3 · Reducir la memoria por función — AHORRO DIRECTO Y LINEAL
Provisioned Memory = (GB por función) × (tiempo de reloj). Bajar los GB **recorta el 81% de forma lineal**.
Nuestras funciones son **I/O-bound** (esperan, no calculan: Active CPU es solo el 8%), así que **no necesitan
músculo de CPU/memoria** — están sobredimensionadas para lo que hacen.
- **A verificar (Fernando):** Vercel → Proyecto → **Settings → Functions** → tamaño de CPU/memoria de Fluid.
- Si están, p. ej., en 2 GB y con 1 GB sobra (una ficha no necesita más), bajar a la mitad ≈ **–$8/ciclo**
  (la mitad de $15,86), sin tocar código. Es el recorte de mayor ratio inmediato.
- Ojo: bajar memoria no alarga los tiempos aquí, porque el cuello es la espera a la BD, no la CPU.

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
| **1** | **Bajar el tamaño de memoria/CPU de Fluid** si está sobredimensionado | el 81% directo, lineal | ~–$8/ciclo si se puede halвar | **Cero código** (Settings) |
| **2** | **Subir el tier de la BD** (nano→Small/Medium) | el tiempo de espera de TODAS las funciones | grande e indirecto (menos GB-Hrs) + deja de caerse | Decisión + € de BD |
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
