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
import { getResultadosGrupo, type ChipRacha } from '@/lib/equipo'
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
    const { data } = await supabase.from('web_jugador').select(COLS_JUGADOR).eq('codjugador', cod).limit(1).maybeSingle()
    return (data as unknown as JugadorFicha) || null
  }, ['getJugadorV2', cod], cod)
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
}
// Carrera ordenada: temporada DESC, y dentro de la temporada orden_temporada ASC (lo decide el pipeline).
export async function getCarreraV2(cod: string): Promise<CarreraRow[]> {
  return cacheJugador(async () => {
    const { data } = await supabase.from('web_jugador_carrera').select(COLS_CARRERA).eq('codjugador', cod)
    return ((data || []) as any[]).sort((a, b) =>
      String(b.codtemporada).localeCompare(String(a.codtemporada)) || (a.orden_temporada ?? 0) - (b.orden_temporada ?? 0)) as CarreraRow[]
    // keyParts v2: se añadió elo_percentil_temp a COLS_CARRERA. Bump para forzar cache-miss GLOBAL (el Data
    // Cache persiste entre deploys; sin esto seguiría sirviendo filas sin la columna). Ver también E-cache.
  }, ['getCarreraV2', 'v2', cod], cod)
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
      const { data } = await supabase.from('web_jugador_partidos').select('codacta, jornada, minutos')
        .eq('codjugador', cod).in('codacta', codactas)
      const m = new Map<string, { jornada: number | null; minutos: number | null }>()
      for (const p of (data || []) as any[]) m.set(String(p.codacta), { jornada: p.jornada, minutos: p.minutos })
      for (const a of rows) { const e = m.get(String(a.codacta)); if (e) { a.jornada = e.jornada; a.minutos = e.minutos } }
    }
    return rows
  }, ['getActuacionesV2', cod], cod)
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
export async function getAlertaActual(cod: string): Promise<AlertaRow | null> {
  return cacheJugador(async () => {
    const cols = 'estado, codtemporada, jornada, amarillas_ciclo, ciclo_umbral, dobles_amarillas, rojas_directas, nombre_equipo'
    const { data } = await supabase.from('web_alertas_tarjetas').select(cols)
      .eq('codjugador', cod).order('codtemporada', { ascending: false }).order('jornada', { ascending: false }).limit(1)
    return ((data && data[0]) as AlertaRow) || null
  }, ['getAlertaActual', cod], cod)
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
    // Bump para forzar cache-miss GLOBAL de los cortes (persisten entre deploys, tag temporada:).
  }, ['getPercentilCortes', 'v2', metrica, String(categoria), codtempInt], [`temporada:${codtempInt}`])
}

// Cortes de ELO por categoría/temporada, validados; si son degenerados o no hay, cae a CORTES_FIJOS.elo.
export async function getCortesElo(categoria: string | null, codtempInt: number | null): Promise<readonly [number, number, number, number]> {
  const p = await getPercentilCortes('elo_jugador', categoria, codtempInt)
  return p && cortesValidos(p) ? p : CORTES_FIJOS.elo
}

// --- Partidos jugados de UNA temporada (todas las competiciones), orden jornada ASC ---
const COLS_PART = 'codacta, codtemporada, codgrupo, jornada, fecha, equipo_nombre, escudo, codequipo, ' +
  'rival_cod, rival_nombre, rival_escudo, resultado, titular, minutos, goles, amarillas, dobles_amarilla, ' +
  'rojas, puntos, elo_delta, goles_encajados, competicion'
export async function getPartidosTemporada(cod: string, codtemp: string): Promise<any[]> {
  return cacheJugador(async () => {
    const q = (c: string) => supabase.from('web_jugador_partidos').select(c)
      .eq('codjugador', cod).eq('codtemporada', codtemp).order('jornada', { ascending: true })
    let r = await q(COLS_PART + ', es_local')
    if (r.error) r = await q(COLS_PART)
    return (r.data || []) as any[]
  }, ['getPartidosTemporada', cod, String(codtemp)], cod, codtemp)
}

// --- Ámbito: por competición de la temporada, la secuencia de jornadas con estado (incluidas ausencias) ---
export type JornadaDatum = {
  jornada: number
  estado: { tipo: 'valor'; v: number } | { tipo: 'no_jugo' } | { tipo: 'sin_dato' }
  goles?: number; amarillas?: number; dobles?: number; rojas?: number; gc?: number | null
  titular?: boolean; minutos?: number; rol?: RolPartido
  rivalNombre?: string | null; rivalEscudo?: string | null; resultado?: string | null; esLocal?: boolean | null
}
export type CompAmbito = { codgrupo: string; nombre_comp: string; jornadas: JornadaDatum[] }

// Resultados del grupo con escudos y nombres (para pintar el rival también en jornadas NO jugadas).
// web_resultados no trae codequipo -> se filtra por nombre (local o visitante), como en @/lib/equipo.
type ResRich = { jornada: number; gl: number | null; gv: number | null; nl: string; nv: string; el: string | null; ev: string | null }
async function resultadosGrupoRich(nombre: string | null, codgrupo: string): Promise<ResRich[]> {
  if (!nombre) return []
  const cols = 'jornada, goles_local, goles_visitante, nombre_local, nombre_visitante, escudo_local, escudo_visitante'
  const [loc, vis] = await Promise.all([
    supabase.from('web_resultados').select(cols).eq('codgrupo', codgrupo).eq('nombre_local', nombre),
    supabase.from('web_resultados').select(cols).eq('codgrupo', codgrupo).eq('nombre_visitante', nombre),
  ])
  return [...((loc.data || []) as any[]), ...((vis.data || []) as any[])].map((r) => ({
    jornada: r.jornada, gl: r.goles_local, gv: r.goles_visitante, nl: r.nombre_local, nv: r.nombre_visitante,
    el: r.escudo_local, ev: r.escudo_visitante,
  }))
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
    const nombreComp: string = ps[0]?.competicion ?? 'Competición'
    // Jornadas reales del equipo en ese grupo (para las ausencias), con rival/escudo/resultado.
    const teamRows = await resultadosGrupoRich(nombreEquipo, codgrupo)
    const teamPorJornada = new Map<number, ResRich>()
    for (const r of teamRows) if (r.gl != null) teamPorJornada.set(r.jornada, r)
    const jornadasEquipo = new Set<number>(Array.from(teamPorJornada.keys()))
    const jugadas = new Map<number, any>()
    for (const p of ps) jugadas.set(p.jornada, p)
    Array.from(jugadas.keys()).forEach((j) => jornadasEquipo.add(j)) // por si el equipo aún no está en web_resultados

    const jornadas: JornadaDatum[] = Array.from(jornadasEquipo).sort((a, b) => a - b).map((jornada) => {
      const p = jugadas.get(jornada)
      if (!p) {
        // Ausencia: rival y resultado desde los resultados del equipo (perspectiva del equipo).
        const r = teamPorJornada.get(jornada)
        if (!r) return { jornada, estado: { tipo: 'no_jugo' } }
        const local = r.nl === nombreEquipo
        const gf = (local ? r.gl : r.gv) ?? 0, gc = (local ? r.gv : r.gl) ?? 0
        return {
          jornada, estado: { tipo: 'no_jugo' },
          rivalNombre: local ? r.nv : r.nl, rivalEscudo: local ? r.ev : r.el,
          resultado: `${gf}-${gc} ${gf > gc ? 'G' : gf < gc ? 'P' : 'E'}`, esLocal: local,
        }
      }
      const rol = derivarRol(!!p.titular, p.minutos ?? 0, p.rojas ?? 0, p.dobles_amarilla ?? 0)
      return {
        jornada,
        estado: { tipo: 'valor', v: p.puntos ?? 0 },
        goles: p.goles ?? 0, amarillas: p.amarillas ?? 0, dobles: p.dobles_amarilla ?? 0,
        rojas: p.rojas ?? 0, gc: p.goles_encajados ?? null, titular: !!p.titular, minutos: p.minutos ?? 0, rol,
        rivalNombre: p.rival_nombre ?? null, rivalEscudo: p.rival_escudo ?? null,
        resultado: p.resultado ?? null, esLocal: p.es_local ?? null,
      }
    })
    comps.push({ codgrupo, nombre_comp: nombreComp, jornadas })
  }
  // Liga (más jornadas) primero.
  return comps.sort((a, b) => b.jornadas.length - a.jornadas.length)
  }, ['getAmbitoTemporada', cod, String(codtemp)], cod, codtemp)
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
  const grupos = new Map<string, { nombre: string | null }>()
  const jugadasPorGrupo = new Map<string, Set<number>>()
  for (const p of partidos) {
    const g = String(p.codgrupo ?? '')
    if (!grupos.has(g)) grupos.set(g, { nombre: p.equipo_nombre ?? null })
    if (!jugadasPorGrupo.has(g)) jugadasPorGrupo.set(g, new Set())
    jugadasPorGrupo.get(g)!.add(p.jornada)
  }
  for (const [g, { nombre }] of Array.from(grupos.entries())) {
    if (!nombre) continue
    const rows = await getResultadosGrupo(nombre, g)
    const jugadas = jugadasPorGrupo.get(g)!
    for (const r of rows) {
      if (r.goles_local == null || r.goles_visitante == null) continue
      const local = r.nombre_local === nombre
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
