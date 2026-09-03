// Capa de datos de la ficha de jugador V2 (ruta /v2). Reutiliza columnas y helpers de @/lib/jugador y
// @/lib/equipo; NO importa fetchers privados de la página actual (viven dentro de su page.tsx y no se
// exportan) — se reimplementan aquí para no tocar archivos existentes. Ver DECISIONES-PENDIENTES.md (D1).

import { supabase } from '@/lib/supabase'
import { cacheJugador, cacheTagged } from '@/lib/cacheComp'
import {
  COLS_JUGADOR, COLS_CARRERA, COLS_HITOS, COLS_ACTUACIONES,
  tempLabel, marcadorLocalVisitante,
  type JugadorFicha, type HitoRow,
} from '@/lib/jugador'
import { slugToCod } from '@/lib/temporadaSlug'
import { getResultadosGrupo, filaEsLocal, type ChipRacha } from '@/lib/equipo'
import { derivarRol, escalon, cortesValidos, CORTES_FIJOS, type RolPartido } from '@/lib/escala'

export type { JugadorFicha, HitoRow }

// Etiqueta de temporada ('2025-26') -> codtemporada TEXT ('21'), vía slugToCod (fórmula, fuente única en
// '@/lib/temporadaSlug'; sin lista topada -> '/jugador/x/2026-27' resuelve solo). null si el slug es inválido.
export function labelToCod(label: string | null | undefined): string | null {
  if (!label) return null
  const cod = slugToCod(label)
  return cod == null ? null : String(cod)
}

// --- Fetchers base ---
export async function getJugadorV2(cod: string): Promise<JugadorFicha | null> {
  return cacheJugador(async () => {
    const { data, error } = await supabase.from('web_jugador').select(COLS_JUGADOR).eq('codjugador', cod).limit(1).maybeSingle()
    if (error) throw error   // no cachear null por un error transitorio -> 404 falso persistente (ver checklist)
    return (data as unknown as JugadorFicha) || null
  }, ['getJugadorV2', 'copa2', cod], cod)   // copa2: + throw en error; bump para limpiar null envenenados del DELETE
}

export type CarreraRow = {
  codtemporada: string; orden_temporada: number | null; codequipo: string
  equipo_nombre: string | null; escudo: string | null; nombre_comp: string | null
  categoria_rama: string | null; categoria_nivel: number | null; codgrupo: string | null
  grupo_nombre: string | null; pj: number | null; goles: number | null; minutos: number | null
  pts_fantasy: number | null; media_fantasy: number | null; elo_final: number | null
  titular: number | null; suplente: number | null; tarjetas_amarillas: number | null
  tarjetas_dobles: number | null; tarjetas_rojas: number | null; goles_encajados: number | null; porterias_cero: number | null
  // Rankings POR TEMPORADA (los usa el bloque Nivel desde la fila rank_principal de la temporada seleccionada).
  rank_general_temp: number | null; rank_general_temp_total: number | null
  rank_categoria_temp: number | null; rank_categoria_temp_total: number | null
  rank_posicion_temp: number | null; rank_posicion_temp_total: number | null
  rank_principal: boolean | null
  // Ranking GENERAL definitivo por temporada (unidad codjugador+codtemporada, sobre el total fantasy de la
  // temporada, contra jugadores distintos). Poblado solo en la fila rank_principal.
  rank_general_season: number | null; rank_general_season_total: number | null
  // Percentil de ELO por temporada (del elo_final de ESA etapa). El bloque Nivel lee el de la última etapa
  // cronológica (etapaUltima), la misma de la que sale el ELO.
  elo_percentil_temp: number | null
  // Fecha del primer partido de la competición (ISO YYYY-MM-DD), para ordenar por calendario. NULL hasta el
  // próximo re-export de fichas -> hasta entonces el orden cae en faseCompeticion.
  fecha_inicio: string | null
}
// Carrera ordenada: temporada DESC, y dentro de la temporada orden_temporada ASC (lo decide el pipeline).
export async function getCarreraV2(cod: string): Promise<CarreraRow[]> {
  return cacheJugador(async () => {
    const { data, error } = await supabase.from('web_jugador_carrera').select(COLS_CARRERA).eq('codjugador', cod)
    if (error) throw error   // fecha_inicio es columna NUEVA -> no cachear [] si la query falla (ver checklist)
    return ((data || []) as any[]).sort((a, b) =>
      String(b.codtemporada).localeCompare(String(a.codtemporada)) || (a.orden_temporada ?? 0) - (b.orden_temporada ?? 0)) as CarreraRow[]
    // keyParts: v3-copa (copa/playoff como filas de carrera) -> v4-finicio (fecha_inicio al select). Bump para
    // forzar cache-miss GLOBAL (el Data Cache persiste entre deploys). Ver también E-cache.
  }, ['getCarreraV2', 'v5-elo-comp', cod], cod)   // v5: elo_final pasó a ser por competición (cierre por fecha)
}

export async function getActuacionesV2(cod: string): Promise<any[]> {
  return cacheJugador(async () => {
    let r = await supabase.from('web_jugador_actuaciones').select(COLS_ACTUACIONES + ', es_local').eq('codjugador', cod).order('rank')
    if (r.error) r = await supabase.from('web_jugador_actuaciones').select(COLS_ACTUACIONES).eq('codjugador', cod).order('rank')
    const rows = (r.data || []) as any[]
    // web_jugador_actuaciones no trae jornada ni minutos, pero web_jugador_partidos SÍ (mismo codacta):
    // se cruza por codacta para poder mostrarlos. Ver punto 10.
    const codactas = rows.map((a) => a.codacta).filter(Boolean)
    if (codactas.length) {
      const { data } = await supabase.from('web_jugador_partidos').select('codacta, jornada, minutos, ronda_label, fecha')
        .eq('codjugador', cod).in('codacta', codactas)
      const m = new Map<string, { jornada: number | null; minutos: number | null; ronda_label: string | null; fecha: string | null }>()
      for (const p of (data || []) as any[]) m.set(String(p.codacta), { jornada: p.jornada, minutos: p.minutos, ronda_label: p.ronda_label ?? null, fecha: p.fecha ?? null })
      for (const a of rows) { const e = m.get(String(a.codacta)); if (e) { a.jornada = e.jornada; a.minutos = e.minutos; a.ronda_label = e.ronda_label; a.fecha = e.fecha } }
    }
    return rows
  }, ['getActuacionesV2', 'copa-fc-fecha', cod], cod)   // copa-fc: resultado favor-contra; -fecha: +fecha al cruce (bump caché)
}

export async function getHitosV2(cod: string): Promise<HitoRow[]> {
  return cacheJugador(async () => {
    const { data } = await supabase.from('web_jugador_hitos').select(COLS_HITOS).eq('codjugador', cod)
    return (data || []) as unknown as HitoRow[]
  }, ['getHitosV2', cod], cod)
}

// Alerta disciplinaria MÁS RECIENTE del jugador (web_alertas_tarjetas es por jornada). Null si no hay.
export type AlertaRow = {
  estado: string | null; codtemporada: number | null; jornada: number | null
  amarillas_ciclo: number | null; ciclo_umbral: number | null; dobles_amarillas: number | null
  rojas_directas: number | null; nombre_equipo: string | null
}
// `temp` = temporada de la ficha: los ciclos de tarjetas NO cruzan temporadas, así que la alerta debe ser de
// ESA temporada (si no, en una ficha de 2026-27 se colaba la foto-final de un ciclo de T21). Sin temp -> la
// más reciente de cualquier temporada (comportamiento antiguo, por si algún llamador lo necesita).
export async function getAlertaActual(cod: string, temp?: number | null): Promise<AlertaRow | null> {
  return cacheJugador(async () => {
    const cols = 'estado, codtemporada, jornada, amarillas_ciclo, ciclo_umbral, dobles_amarillas, rojas_directas, nombre_equipo'
    let q = supabase.from('web_alertas_tarjetas').select(cols).eq('codjugador', cod)
    if (temp != null) q = q.eq('codtemporada', temp)
    const { data } = await q.order('codtemporada', { ascending: false }).order('jornada', { ascending: false }).limit(1)
    return ((data && data[0]) as AlertaRow) || null
  }, ['getAlertaActual', cod, String(temp ?? '')], cod)
}

// Texto humano de la alerta disciplinaria. NUNCA muestra el código crudo (CICLO_COMPLETADO…) ni dice
// "completado" con un ciclo a medias: prioriza el conteo real del ciclo vigente. Ver DECISIONES (D23).
export function alertaHumana(a: AlertaRow | null): string | null {
  if (!a) return null
  const um = a.ciclo_umbral ?? 5
  const ac = a.amarillas_ciclo ?? 0
  if (ac > 0 && ac < um) return `<b>En ciclo</b> — ${ac} de ${um} amarillas.${ac === um - 1 ? ' Una más y cumple sanción.' : ''}`
  if (ac >= um && um > 0) return `<b>Ciclo completado</b> — ${ac} amarillas: sanción por acumulación.`
  if ((a.rojas_directas ?? 0) > 0) return `<b>Sancionado</b> — roja directa.`
  if ((a.dobles_amarillas ?? 0) > 0) return `<b>Sancionado</b> — doble amarilla.`
  if (a.estado === 'SANCIONADO') return `<b>Sancionado</b>`
  return null
}

// ¿El jugador tiene algún partido con goles_encajados no nulo? (para decidir si mostrar "P. a 0").
export async function tienePorteriaDato(cod: string): Promise<boolean> {
  return cacheJugador(async () => {
    const { data } = await supabase.from('web_jugador_partidos').select('id')
      .eq('codjugador', cod).not('goles_encajados', 'is', null).limit(1)
    return !!(data && data.length)
  }, ['tienePorteriaDato', cod], cod)
}

// Totales de tarjetas de TODA la carrera desde web_jugador_partidos. Sus tres columnas son DISJUNTAS
// a nivel de evento: amarilla simple, doble amarilla y roja directa no se solapan (la doble no suma
// al ciclo de sanción, va aparte). OJO: web_jugador_carrera.tarjetas_rojas mezcla rojas directas +
// dobles, por eso NO se usa aquí. web_jugador_partidos tiene una fila por partido jugado y su recuento
// coincide EXACTO con la suma de pj de carrera (verificado en los 38.173 jugadores).
export async function getTarjetasTotales(cod: string): Promise<{ amarillas: number; dobles: number; rojas: number }> {
  return cacheJugador(async () => {
    const { data } = await supabase.from('web_jugador_partidos')
      .select('amarillas, dobles_amarilla, rojas').eq('codjugador', cod)
    let amarillas = 0, dobles = 0, rojas = 0
    for (const p of (data || []) as any[]) {
      amarillas += p.amarillas ?? 0
      dobles += p.dobles_amarilla ?? 0
      rojas += p.rojas ?? 0
    }
    return { amarillas, dobles, rojas }
  }, ['getTarjetasTotales', cod], cod)
}

// Cortes de percentil (métrica/categoría/temporada). Devuelve la 4-tupla o null si no hay fila.
export async function getPercentilCortes(
  metrica: string, categoria: string | null, codtempInt: number | null
): Promise<[number, number, number, number] | null> {
  if (!categoria || codtempInt == null) return null
  // No es jugador-scoped (percentiles por categoría+temporada, compartidos): se etiqueta por temporada.
  return cacheTagged(async () => {
    const { data } = await supabase.from('web_percentiles')
      .select('p20, p40, p60, p80').eq('metrica', metrica).eq('categoria', categoria).eq('codtemporada', codtempInt).limit(1).maybeSingle()
    if (!data) return null
    const c = [data.p20, data.p40, data.p60, data.p80]
    if (c.some((x) => x == null)) return null
    return c as [number, number, number, number]
    // keyParts v2: el pipeline recalculó web_percentiles.elo_jugador (de elo_actual a elo_final por temporada).
    // TAG PROPIO `cortes:<metrica>:<t>` (NO temporada:): estos cortes son de la FICHA (color del ELO). Con
    // temporada:<t> heredaban el temporada:<activa> nocturno y enfriaban TODAS las fichas activas cada noche por
    // un dato que apenas se mueve noche a noche (percentiles de una categoría entera). Con el tag propio, el ciclo
    // nocturno NO los toca; se refrescan cuando de verdad cambian: en un REBAREMO (el pipeline debe emitir
    // `cortes:elo_jugador:<t>`), y opcionalmente un barrido SEMANAL. Ver CHECKLIST (cobertura rebaremo). El key
    // sigue con codtempInt (caché por temporada) y el bump 'v2' fuerza refresco global si cambia la fórmula.
  }, ['getPercentilCortes', 'v2', metrica, String(categoria), codtempInt], [`cortes:${metrica}:${codtempInt}`])
}

// Cortes de ELO por categoría/temporada, validados; si son degenerados o no hay, cae a CORTES_FIJOS.elo.
export async function getCortesElo(categoria: string | null, codtempInt: number | null): Promise<readonly [number, number, number, number]> {
  const p = await getPercentilCortes('elo_jugador', categoria, codtempInt)
  return p && cortesValidos(p) ? p : CORTES_FIJOS.elo
}

// --- Partidos jugados de UNA temporada (todas las competiciones), orden jornada ASC ---
const COLS_PART = 'codacta, codtemporada, codgrupo, jornada, ronda_label, fecha, equipo_nombre, escudo, codequipo, ' +
  'rival_cod, rival_nombre, rival_escudo, resultado, titular, minutos, goles, amarillas, dobles_amarilla, ' +
  'rojas, puntos, elo_delta, goles_encajados, competicion'
export async function getPartidosTemporada(cod: string, codtemp: string): Promise<any[]> {
  return cacheJugador(async () => {
    const q = (c: string) => supabase.from('web_jugador_partidos').select(c)
      .eq('codjugador', cod).eq('codtemporada', codtemp).order('jornada', { ascending: true })
    let r = await q(COLS_PART + ', es_local')
    if (r.error) r = await q(COLS_PART)
    return (r.data || []) as any[]
    // Tag SOLO jugador:<cod> (NO temporada:): son hechos de partido del jugador, cambian cuando JUEGA (y entonces
    // el censo nocturno emite jugador:<cod>). Quitarle temporada: evita que el temporada:<activa> del ELO nocturno
    // enfríe la ficha cada noche en balde. Rebaremo (reescribe pts_fantasy): cubierto por el censo jugador: que
    // ya emite `_revalidar.py --temporada <c>` — ver CHECKLIST. La clave conserva codtemp (caché por temporada).
  }, ['getPartidosTemporada', 'copa-fc', cod, String(codtemp)], cod)   // copa-fc: resultado ya favor-contra (copa/playoff normalizados)
}

// --- Ámbito: por competición de la temporada, la secuencia de jornadas con estado (incluidas ausencias) ---
export type JornadaDatum = {
  jornada: number
  codacta?: string   // clave ÚNICA por partido (en copa la jornada colisiona entre rondas) -> React key del gráfico
  ronda?: string | null   // COPA: texto de la ronda ("Fase de grupos", "Final"...) -> el front lo muestra en vez de "J N"
  estado: { tipo: 'valor'; v: number } | { tipo: 'no_jugo' } | { tipo: 'sin_dato' }
  goles?: number; amarillas?: number; dobles?: number; rojas?: number; gc?: number | null
  eloDelta?: number | null   // #7 Δ ELO del partido, para el carril de ELO por jornada
  titular?: boolean; minutos?: number; rol?: RolPartido
  rivalNombre?: string | null; rivalEscudo?: string | null; resultado?: string | null; esLocal?: boolean | null
}
export type CompAmbito = { codgrupo: string; nombre_comp: string; jornadas: JornadaDatum[] }

// Resultados del grupo con escudos y nombres (para pintar el rival también en jornadas NO jugadas).
// Partidos del equipo en el grupo (para pintar rival en jornadas NO jugadas). Se casa por CODEQUIPO (estable),
// con fallback a nombre en filas sin codequipo (copa), igual que getResultadosGrupo en @/lib/equipo.
type ResRich = { codacta: string; jornada: number; fecha: string | null; ronda_label: string | null; gl: number | null; gv: number | null; nl: string; nv: string; el: string | null; ev: string | null; cl: string | null; cv: string | null }
async function resultadosGrupoRich(codequipo: string | number | null, nombre: string | null, codgrupo: string): Promise<ResRich[]> {
  if (codequipo == null && !nombre) return []
  const cols = 'codacta, jornada, fecha, ronda_label, goles_local, goles_visitante, nombre_local, nombre_visitante, escudo_local, escudo_visitante, codequipo_local, codequipo_visitante'
  const base = () => supabase.from('web_resultados').select(cols).eq('codgrupo', codgrupo)
  // UNIÓN codequipo ∪ nombre (dedup): code casa liga; nombre casa copa y códigos reasignados viejos. Unívoco en el grupo.
  const qs: PromiseLike<{ data: unknown }>[] = []
  if (codequipo != null) qs.push(base().eq('codequipo_local', String(codequipo)), base().eq('codequipo_visitante', String(codequipo)))
  if (nombre) qs.push(base().eq('nombre_local', nombre), base().eq('nombre_visitante', nombre))
  const rs = await Promise.all(qs)
  const seen = new Set<string>(), out: ResRich[] = []
  for (const rr of rs) for (const r of ((rr.data || []) as any[])) {
    const k = String(r.codacta ?? `${r.jornada}|${r.nombre_local}|${r.nombre_visitante}`)   // dedup por acta (única por partido)
    if (seen.has(k)) continue; seen.add(k)
    out.push({ codacta: String(r.codacta ?? ''), jornada: r.jornada, fecha: r.fecha ?? null, ronda_label: r.ronda_label ?? null,
      gl: r.goles_local, gv: r.goles_visitante, nl: r.nombre_local, nv: r.nombre_visitante,
      el: r.escudo_local, ev: r.escudo_visitante, cl: r.codequipo_local, cv: r.codequipo_visitante })
  }
  return out
}

// Cruza partidos jugados con las jornadas reales del equipo (web_resultados) para materializar las
// AUSENCIAS: una jornada que el equipo jugó y el jugador no aparece -> {tipo:'no_jugo'}. Sin este cruce,
// una lesión larga sería invisible. Ver DECISIONES-PENDIENTES.md (D3).
export async function getAmbitoTemporada(cod: string, codtemp: string): Promise<CompAmbito[]> {
  return cacheJugador(async () => {
  const partidos = await getPartidosTemporada(cod, codtemp)
  if (partidos.length === 0) return []

  // Agrupar por codgrupo (una competición).
  const porGrupo = new Map<string, any[]>()
  for (const p of partidos) {
    const g = String(p.codgrupo ?? '')
    if (!porGrupo.has(g)) porGrupo.set(g, [])
    porGrupo.get(g)!.push(p)
  }

  const comps: CompAmbito[] = []
  for (const [codgrupo, ps] of Array.from(porGrupo.entries())) {
    const nombreEquipo: string | null = ps[0]?.equipo_nombre ?? null
    const codeqEquipo: string | null = ps[0]?.codequipo ?? null
    const nombreComp: string = ps[0]?.competicion ?? 'Competición'
    // Partidos reales del equipo en ese grupo (para las ausencias), con rival/escudo/resultado.
    const teamRows = await resultadosGrupoRich(codeqEquipo, nombreEquipo, codgrupo)
    // Keyed por CODACTA (único por partido), NO por número de jornada: en copa la final y el 1er grupo comparten
    // jornada=1 -> colisionaban (se perdía un partido y se descolocaba el orden). La fecha ISO da el orden real.
    const teamPorActa = new Map<string, ResRich>()
    for (const r of teamRows) if (r.gl != null && r.codacta) teamPorActa.set(r.codacta, r)
    const jugadas = new Map<string, any>()
    for (const p of ps) if (p.codacta) jugadas.set(String(p.codacta), p)
    // Unión de ACTAS del equipo ∪ del jugador. Ausencia = acta que el equipo jugó y el jugador NO (no está en jugadas)
    // -> se preserva la detección de huecos, ahora por partido en vez de por número de jornada.
    const actasEquipo = new Set<string>(Array.from(teamPorActa.keys()).concat(Array.from(jugadas.keys())))
    const isoF = (f: string | null | undefined) => (f && /^\d{2}\/\d{2}\/\d{4}$/.test(f) ? f.slice(6, 10) + f.slice(3, 5) + f.slice(0, 2) : '99999999')
    const fechaDeActa = (a: string) => (jugadas.get(a)?.fecha ?? teamPorActa.get(a)?.fecha) as string | null | undefined

    const jornadas: JornadaDatum[] = Array.from(actasEquipo)
      .sort((a, b) => isoF(fechaDeActa(a)).localeCompare(isoF(fechaDeActa(b))))   // más antiguo primero (izquierda -> derecha)
      .map((acta) => {
        const p = jugadas.get(acta)
        if (!p) {
          // Ausencia: rival y resultado desde los resultados del equipo (perspectiva del equipo).
          const r = teamPorActa.get(acta)
          if (!r) return { codacta: acta, jornada: 0, estado: { tipo: 'no_jugo' } }
          const local = filaEsLocal({ codequipo_local: r.cl, codequipo_visitante: r.cv, nombre_local: r.nl }, nombreEquipo, codeqEquipo)
          const gf = (local ? r.gl : r.gv) ?? 0, gc = (local ? r.gv : r.gl) ?? 0
          return {
            codacta: acta, jornada: r.jornada, ronda: r.ronda_label ?? null, estado: { tipo: 'no_jugo' },
            rivalNombre: local ? r.nv : r.nl, rivalEscudo: local ? r.ev : r.el,
            resultado: `${gf}-${gc} ${gf > gc ? 'G' : gf < gc ? 'P' : 'E'}`, esLocal: local,
          }
        }
        const rol = derivarRol(!!p.titular, p.minutos ?? 0, p.rojas ?? 0, p.dobles_amarilla ?? 0)
        return {
          codacta: acta, jornada: p.jornada, ronda: p.ronda_label ?? null,
          estado: { tipo: 'valor', v: p.puntos ?? 0 },
          goles: p.goles ?? 0, amarillas: p.amarillas ?? 0, dobles: p.dobles_amarilla ?? 0,
          rojas: p.rojas ?? 0, gc: p.goles_encajados ?? null, eloDelta: p.elo_delta ?? null, titular: !!p.titular, minutos: p.minutos ?? 0, rol,
          rivalNombre: p.rival_nombre ?? null, rivalEscudo: p.rival_escudo ?? null,
          resultado: p.resultado ?? null, esLocal: p.es_local ?? null,
        }
      })
    comps.push({ codgrupo, nombre_comp: nombreComp, jornadas })
  }
  // Liga (más jornadas) primero.
  return comps.sort((a, b) => b.jornadas.length - a.jornadas.length)
    // Tag SOLO jugador:<cod> (NO temporada:), como getPartidosTemporada: hechos de partido del jugador; el
    // temporada:<activa> nocturno los invalidaba en balde y enfriaba la ficha. Rebaremo cubierto por el censo
    // jugador: de `_revalidar.py --temporada <c>`. Clave conserva codtemp (caché por temporada).
  }, ['getAmbitoTemporada', 'copa-acta-fc', cod, String(codtemp)], cod)   // copa-acta-fc: codacta + orden fecha (bugs 1/2) + resultado favor-contra
}

// --- Forma: ventanas de últimas 5 / 10 / temporada sobre los partidos JUGADOS de la temporada ---
export type Ventana = { label: string; media: number | null; pj: number; delta: number | null }
export function ventanasForma(partidos: any[]): Ventana[] {
  const jug = partidos.filter((p) => p.puntos != null).sort((a, b) => a.jornada - b.jornada)
  const pts = jug.map((p) => p.puntos as number)
  const media = (arr: number[]) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null)
  const mTemp = media(pts)
  const win = (n: number) => {
    const s = pts.slice(-n)
    const m = media(s)
    return { media: m, pj: s.length, delta: m != null && mTemp != null ? m - mTemp : null }
  }
  const w5 = win(5), w10 = win(10)
  return [
    { label: 'Últimas 5', ...w5 },
    { label: 'Últimas 10', ...w10 },
    { label: 'Temporada', media: mTemp, pj: pts.length, delta: null },
  ]
}

// --- Racha de 5 chips V/E/D de la temporada (más reciente a la derecha) ---
export function racha5DePartidos(partidos: any[]): ChipRacha[] {
  return partidos
    .filter((p) => p.resultado != null)
    .sort((a, b) => a.jornada - b.jornada)
    .slice(-5)
    .map((p): ChipRacha => {
      const { marcador, signo } = marcadorLocalVisitante(p.resultado, p.es_local)
      return { signo: signo as 'G' | 'E' | 'P', jornada: p.jornada ?? null, marcador, rival: p.rival_nombre ?? null }
    })
    .filter((c) => c.signo === 'G' || c.signo === 'E' || c.signo === 'P')
}

// --- Casa / Fuera de la temporada: PJ, goles, media de puntos ---
export type SplitLocal = { pj: number; goles: number; media: number | null }
export function splitCasaFuera(partidos: any[]): { casa: SplitLocal; fuera: SplitLocal; hayLocal: boolean } {
  const agg = (rows: any[]): SplitLocal => {
    const pts = rows.map((r) => r.puntos).filter((x) => x != null) as number[]
    return { pj: rows.length, goles: rows.reduce((s, r) => s + (r.goles ?? 0), 0), media: pts.length ? pts.reduce((s, x) => s + x, 0) / pts.length : null }
  }
  const conLocal = partidos.filter((p) => p.es_local != null)
  return {
    casa: agg(partidos.filter((p) => p.es_local === true)),
    fuera: agg(partidos.filter((p) => p.es_local === false)),
    hayLocal: conLocal.length > 0,
  }
}

// --- Balance del equipo CON él y SIN él (V/E/D). Cruza resultados del equipo con las jornadas jugadas.
// Umbral de publicación: 8 partidos por lado; por debajo -> muestra insuficiente. NUNCA "impacto".
export type Balance = { pg: number; pe: number; pp: number; pj: number }
export async function balanceEquipo(partidos: any[]): Promise<{ con: Balance; sin: Balance; suficiente: boolean }> {
  const zero = (): Balance => ({ pg: 0, pe: 0, pp: 0, pj: 0 })
  const con = zero(), sin = zero()
  // Un grupo/nombre por competición (misma temporada). Cruce por codgrupo.
  const grupos = new Map<string, { nombre: string | null; codequipo: string | null }>()
  const jugadasPorGrupo = new Map<string, Set<number>>()
  for (const p of partidos) {
    const g = String(p.codgrupo ?? '')
    if (!grupos.has(g)) grupos.set(g, { nombre: p.equipo_nombre ?? null, codequipo: p.codequipo ?? null })
    if (!jugadasPorGrupo.has(g)) jugadasPorGrupo.set(g, new Set())
    jugadasPorGrupo.get(g)!.add(p.jornada)
  }
  for (const [g, { nombre, codequipo }] of Array.from(grupos.entries())) {
    if (!nombre && codequipo == null) continue
    const rows = await getResultadosGrupo(codequipo, nombre, g)
    const jugadas = jugadasPorGrupo.get(g)!
    for (const r of rows) {
      if (r.goles_local == null || r.goles_visitante == null) continue
      const local = filaEsLocal(r, nombre, codequipo)
      const gf = (local ? r.goles_local : r.goles_visitante) as number
      const gc = (local ? r.goles_visitante : r.goles_local) as number
      const bucket = jugadas.has(r.jornada) ? con : sin
      bucket.pj++
      if (gf > gc) bucket.pg++
      else if (gf < gc) bucket.pp++
      else bucket.pe++
    }
  }
  return { con, sin, suficiente: con.pj >= 8 && sin.pj >= 8 }
}

// --- Últimos 3 partidos jugados de la temporada (más reciente primero) ---
export function ultimosDePartidos(partidos: any[], n = 3): any[] {
  return [...partidos].filter((p) => p.puntos != null).sort((a, b) => b.jornada - a.jornada).slice(0, n)
}

// Color de rendimiento por escala. Devuelve la clase de PALETA_TEXTO para un valor y sus cortes.
export function nivelDe(valor: number | null, cortes: readonly [number, number, number, number]): 0 | 1 | 2 | 3 | 4 | null {
  if (valor == null) return null
  return escalon(valor, cortes)
}

export { tempLabel }
