import { supabase } from '@/lib/supabase'
import { cacheComp } from '@/lib/cacheComp'
import { CATEGORIA_SLUG, SITE_URL } from '@/lib/seo'
import { codToSlug } from '@/lib/temporadaSlug'
import { parseCampo, campoSlug } from '@/lib/campoSlug'
import { campoMapsUrl } from '@/lib/club'
import { getCamposConFicha } from '@/lib/campo'
import { fichasExistentes, jugadorHref } from '@/lib/jugador'

// Ficha de PARTIDO. Datos del acta ya publicados: web_resultados (cabecera) + web_jugador_partidos (por jugador y
// partido: titular/minutos/goles/tarjetas/PUNTOS fantasy/Δ ELO, keyed por codacta) + web_equipo_plantilla_{rama}
// (nombre/dorsal/posición, incl. menores). PENDIENTE del pipeline (aditivo): minuto de cada evento, entrenador,
// árbitro. Baza propia = fantasy + Δ ELO por jugador + MVP del partido. Perímetro: el nombre enlaza a su ficha
// SOLO si existe (menores no -> texto plano); juveniles noindex.

export type PartidoJugador = {
  codjugador: string; nombre: string; dorsal: string | null; pos: string | null
  titular: boolean; jugado: boolean; minutos: number
  goles: number; amarillas: number; dobles: number; rojas: number
  puntos: number | null; eloDelta: number | null
  // Minutos de cada evento (de web_partido_eventos): golesMin[], y el minuto de tarjeta/cambio.
  golesMin: number[]; amarillaMin: number | null; dobleMin: number | null; rojaMin: number | null
  entra: number | null; sale: number | null
  golesEncajados: number | null   // solo porteros (portería a cero = 0); null para el resto
  href: string | null   // ficha del jugador solo si la tiene
}
export type PartidoLado = { codequipo: string; nombre: string; escudo: string | null; titulares: PartidoJugador[]; suplentes: PartidoJugador[] }
export type PartidoMini = { codacta: string; fecha: string | null; local: string; escudoLocal: string | null; golesLocal: number | null; visitante: string; escudoVisitante: string | null; golesVisitante: number | null
  // Para la forma con ΔELO: codequipos (de qué lado iba el equipo) + el ELO POR PARTIDO de la propia fila
  // (elo_pre/post local y visitante, denormalizado por el pipeline en web_resultados). grupo/jornada/temporada se
  // conservan por contexto. eloDelta = el Δ ya resuelto (post − pre del lado del equipo de la forma).
  codLocal?: string; codVisitante?: string; codgrupo?: string | null; jornada?: number | null; codtemporada?: number | null
  eloPreLocal?: number | null; eloPostLocal?: number | null; eloPreVisitante?: number | null; eloPostVisitante?: number | null; eloDelta?: number | null }
export type PartidoFicha = {
  id: string; codacta: string; jugado: boolean; esJuvenil: boolean; codtemporada: number
  categoria: string; slugComp: string; slugGrupo: string; temporada: string; nombreComp: string; jornada: number; compHref: string
  local: PartidoLado; visitante: PartidoLado
  golesLocal: number | null; golesVisitante: number | null; fecha: string | null; hora: string | null
  campoNombre: string | null; campoSuperficie: string | null; campoHref: string | null; campoLat: number | null; campoLng: number | null
  mvp: { nombre: string; pos: string | null; puntos: number; lado: 'local' | 'visitante'; href: string | null } | null
  formaLocal: PartidoMini[]; formaVisitante: PartidoMini[]; h2h: PartidoMini[]
  rachasLocal: Rachas; rachasVisitante: Rachas   // marcando/victorias/invicto: actual + récord, por equipo
  // Datos del acta (web_partido_*): árbitros (SOLO nombre + rol — sin enlace/ranking, decisión de privacidad) y
  // entrenador jefe por equipo.
  arbitros: { nombre: string; rol: string }[]
  entrenadorLocal: string | null; entrenadorVisitante: string | null
  // #1 Pronóstico ELO: elo con el que LLEGABA cada equipo (jornada anterior en el grupo, o último conocido).
  // #2 Movimiento de ELO del partido por equipo (eloPost - eloPre). #3 Contexto de puesto (antes/después de la
  // jornada, solo dentro de esta competición). Copa se discrimina por codgrupo_familia; liga por codgrupo numérico.
  // elo/pos = null cuando no hay dato (equipo sin histórico) — se trata como "sin dato", no como equipo flojo.
  eloPreLocal: number | null; eloPreVisitante: number | null
  eloPostLocal: number | null; eloPostVisitante: number | null
  movEloLocal: number | null; movEloVisitante: number | null
  posPreLocal: number | null; posPostLocal: number | null
  posPreVisitante: number | null; posPostVisitante: number | null
  // #5 Hitos/efemérides ligados a este partido (web_jugador_hitos por codacta).
  hitos: { codjugador: string; nombre: string; lado: 'local' | 'visitante'; tipo: string; detalle: string | null; valor: number | null; ambito: string | null; contexto: string | null; href: string | null }[]
}

const POS_ORD: Record<string, number> = { POR: 0, DEF: 1, MED: 2, DEL: 3 }
const isoF = (f: string | null) => (f && /^\d{2}\/\d{2}\/\d{4}$/.test(f) ? f.slice(6, 10) + f.slice(3, 5) + f.slice(0, 2) : '00000000')
const ordenPos = (a: PartidoJugador, b: PartidoJugador) => {
  const pa = POS_ORD[a.pos || ''] ?? 9, pb = POS_ORD[b.pos || ''] ?? 9
  return pa !== pb ? pa - pb : (parseInt(a.dorsal || '99') || 99) - (parseInt(b.dorsal || '99') || 99)
}
const toMini = (r: Record<string, unknown>): PartidoMini => ({
  codacta: String(r.codacta ?? ''), fecha: (r.fecha as string) ?? null,
  local: String(r.nombre_local ?? ''), escudoLocal: (r.escudo_local as string) ?? null, golesLocal: (r.goles_local as number) ?? null,
  visitante: String(r.nombre_visitante ?? ''), escudoVisitante: (r.escudo_visitante as string) ?? null, golesVisitante: (r.goles_visitante as number) ?? null,
  codLocal: String(r.codequipo_local ?? ''), codVisitante: String(r.codequipo_visitante ?? ''),
  codgrupo: (r.codgrupo as string) ?? null, jornada: (r.jornada as number) ?? null, codtemporada: (r.codtemporada as number) ?? null,
  eloPreLocal: (r.elo_pre_local as number) ?? null, eloPostLocal: (r.elo_post_local as number) ?? null,
  eloPreVisitante: (r.elo_pre_visitante as number) ?? null, eloPostVisitante: (r.elo_post_visitante as number) ?? null,
})
const MINI_COLS = 'codacta, fecha, codtemporada, codgrupo, jornada, nombre_local, escudo_local, goles_local, nombre_visitante, escudo_visitante, goles_visitante, codequipo_local, codequipo_visitante, elo_pre_local, elo_post_local, elo_pre_visitante, elo_post_visitante'

// Historial COMPLETO de partidos jugados del equipo (DESC por fecha). Se usa para la forma (últimos 5) y para las
// rachas (no hace falta consulta extra: ya se traían todos y se cortaban). Filtrar el propio partido va en getPartido.
async function historialDe(codequipo: string): Promise<PartidoMini[]> {
  if (!codequipo) return []
  const { data } = await supabase.from('web_resultados').select(MINI_COLS)
    .or(`codequipo_local.eq.${codequipo},codequipo_visitante.eq.${codequipo}`).not('goles_local', 'is', null)
  const rows = (data || []) as Array<Record<string, unknown>>
  rows.sort((a, b) => isoF(b.fecha as string).localeCompare(isoF(a.fecha as string)))
  return rows.map(toMini)
}

// Rachas del equipo `cod` sobre su historial (DESC): actual (desde el más reciente) + récord (racha máxima), para
// "marcando" (marcó ≥1), "victorias" y "invicto" (no perdió). Todas las competiciones — es "la racha del equipo".
export type Rachas = { marcandoAct: number; marcandoRec: number; victoriasAct: number; victoriasRec: number; invictoAct: number; invictoRec: number }
function rachasDe(cod: string, hist: PartidoMini[]): Rachas {
  const flags = hist.filter((m) => m.golesLocal != null && m.golesVisitante != null).map((m) => {
    const esLocal = m.codLocal === cod
    const gf = esLocal ? (m.golesLocal as number) : (m.golesVisitante as number)
    const gc = esLocal ? (m.golesVisitante as number) : (m.golesLocal as number)
    return { marco: gf > 0, gano: gf > gc, invicto: gf >= gc }
  })
  const actual = (k: 'marco' | 'gano' | 'invicto') => { let n = 0; for (const f of flags) { if (f[k]) n++; else break } return n }
  const record = (k: 'marco' | 'gano' | 'invicto') => { let mx = 0, c = 0; for (const f of flags) { if (f[k]) { c++; if (c > mx) mx = c } else c = 0 } return mx }
  return { marcandoAct: actual('marco'), marcandoRec: record('marco'), victoriasAct: actual('gano'), victoriasRec: record('gano'), invictoAct: actual('invicto'), invictoRec: record('invicto') }
}
async function enfrentamientos(a: string, b: string, n: number): Promise<PartidoMini[]> {
  if (!a || !b) return []
  const { data } = await supabase.from('web_resultados').select(MINI_COLS)
    .or(`and(codequipo_local.eq.${a},codequipo_visitante.eq.${b}),and(codequipo_local.eq.${b},codequipo_visitante.eq.${a})`)
    .not('goles_local', 'is', null)
  const rows = (data || []) as Array<Record<string, unknown>>
  rows.sort((x, y) => isoF(y.fecha as string).localeCompare(isoF(x.fecha as string)))
  return rows.slice(0, n).map(toMini)
}

// Clave = codacta (id federativo del acta): estable pre/post partido y ENTRE re-exports. El id de fila de
// web_resultados NO sirve: el ciclo del pipeline lo reasigna al reexportar (rompería URLs e indexación).
export async function getPartido(codacta: string): Promise<PartidoFicha | null> {
  if (!/^\d+$/.test(codacta)) return null
  const { data: rRaw } = await supabase.from('web_resultados')
    .select('id, codacta, codtemporada, codgrupo, jornada, nombre_local, escudo_local, goles_local, goles_visitante, nombre_visitante, escudo_visitante, fecha, hora, campo, codigo_campo, campo_lat, campo_lng, codequipo_local, codequipo_visitante, ronda_slug, elo_pre_local, elo_post_local, elo_pre_visitante, elo_post_visitante')
    .eq('codacta', codacta).maybeSingle()
  const r = rRaw as {
    id: number; codacta: string | null; codtemporada: number; codgrupo: string; jornada: number
    nombre_local: string; escudo_local: string | null; goles_local: number | null; goles_visitante: number | null
    nombre_visitante: string; escudo_visitante: string | null; fecha: string | null; hora: string | null
    campo: string | null; codigo_campo: string | null; campo_lat: number | null; campo_lng: number | null
    codequipo_local: string | null; codequipo_visitante: string | null; ronda_slug: string | null
    elo_pre_local: number | null; elo_post_local: number | null; elo_pre_visitante: number | null; elo_post_visitante: number | null
  } | null
  if (!r) return null

  return cacheComp(async (): Promise<PartidoFicha> => {
    const { data: gRaw } = await supabase.from('web_grupos')
      .select('categoria, slug_comp, slug_grupo, nombre_comp, tipo').eq('codgrupo', r.codgrupo).eq('codtemporada', r.codtemporada).maybeSingle()
    const g = gRaw as { categoria: string; slug_comp: string; slug_grupo: string; nombre_comp: string | null; tipo: string | null } | null
    const esJuvenil = g?.categoria === 'JUVENIL'
    const categoria = (g && CATEGORIA_SLUG[g.categoria]) || 'aficionados'
    const rama = esJuvenil ? 'web_equipo_plantilla_juvenil' : 'web_equipo_plantilla_aficionado'
    const temporada = codToSlug(r.codtemporada) || ''
    const isLiga = !g?.tipo || g.tipo === 'LIGA'
    const segJornada = isLiga ? `jornada-${r.jornada}` : (r.ronda_slug || `jornada-${r.jornada}`)
    const compHref = g ? `${SITE_URL}/madrid/${categoria}/${g.slug_comp}/${g.slug_grupo}/${temporada}/${segJornada}/resultados` : `${SITE_URL}/`
    const jugado = r.goles_local != null && r.goles_visitante != null
    const codeqL = String(r.codequipo_local ?? ''), codeqV = String(r.codequipo_visitante ?? '')

    const emptyLado = (cod: string, nombre: string, escudo: string | null): PartidoLado => ({ codequipo: cod, nombre, escudo, titulares: [], suplentes: [] })
    let local = emptyLado(codeqL, r.nombre_local, r.escudo_local)
    let visitante = emptyLado(codeqV, r.nombre_visitante, r.escudo_visitante)
    let mvp: PartidoFicha['mvp'] = null
    let hitos: PartidoFicha['hitos'] = []

    // Alineaciones: solo si hay acta (partido jugado).
    if (r.codacta) {
      const { data: jpRaw } = await supabase.from('web_jugador_partidos')
        .select('codjugador, codequipo, titular, minutos, goles, amarillas, dobles_amarilla, rojas, puntos, elo_delta, jugado, goles_encajados')
        .eq('codacta', r.codacta)
      const partidos = (jpRaw || []) as Array<Record<string, unknown>>
      if (partidos.length) {
        const codjugs = Array.from(new Set(partidos.map((p) => String(p.codjugador))))
        const { data: plRaw } = await supabase.from(rama)
          .select('codjugador, nombre, dorsal_comun, posicion_pastilla')
          .in('codequipo', [codeqL, codeqV].filter(Boolean)).eq('codtemporada', r.codtemporada)
        const plMap = new Map<string, { nombre: string; dorsal: string | null; pos: string | null }>(
          ((plRaw || []) as Array<Record<string, unknown>>).map((p) => [String(p.codjugador), { nombre: String(p.nombre || ''), dorsal: (p.dorsal_comun as string) ?? null, pos: (p.posicion_pastilla as string) ?? null }]))
        // EL ACTA ES EL ACTA: la aparición del jugador (y su nombre) NO puede depender de la plantilla ni de la
        // ficha. La plantilla del equipo/temporada da dorsal/posición; para quien no esté en ella (p. ej. un
        // convocado sin ficha o fuera del snapshot) el nombre cae a la maestra web_jugador, que tiene a todos
        // (menores incluidos). conFicha solo decide SI EL NOMBRE ENLAZA. Degradación segura: si la maestra
        // fallara, jugMap queda vacío y se mantiene el comportamiento anterior (solo plantilla).
        const { data: wjRaw } = await supabase.from('web_jugador')
          .select('codjugador, nombre, dorsal_comun, posicion_pastilla').in('codjugador', codjugs)
        const jugMap = new Map<string, { nombre: string; dorsal: string | null; pos: string | null }>(
          ((wjRaw || []) as Array<Record<string, unknown>>).map((p) => [String(p.codjugador), { nombre: String(p.nombre || ''), dorsal: (p.dorsal_comun as string) ?? null, pos: (p.posicion_pastilla as string) ?? null }]))
        const metaDe = (cod: string) => {
          const pl = plMap.get(cod), jg = jugMap.get(cod)
          return { nombre: pl?.nombre || jg?.nombre || '', dorsal: pl?.dorsal ?? jg?.dorsal ?? null, pos: pl?.pos ?? jg?.pos ?? null }
        }
        const conFicha = await fichasExistentes(codjugs)
        // Eventos CON MINUTO (web_partido_eventos): gol/amarilla/doble_amarilla/roja/cambio_entra/cambio_sale.
        const { data: evRaw } = await supabase.from('web_partido_eventos')
          .select('codjugador, tipo, minuto').eq('codacta', r.codacta)
        const evMap = new Map<string, { golesMin: number[]; amarillaMin: number | null; dobleMin: number | null; rojaMin: number | null; entra: number | null; sale: number | null }>()
        for (const ev of (evRaw || []) as Array<{ codjugador: string; tipo: string; minuto: number | null }>) {
          const cod = String(ev.codjugador)
          const e = evMap.get(cod) || { golesMin: [], amarillaMin: null, dobleMin: null, rojaMin: null, entra: null, sale: null }
          const m = ev.minuto ?? null
          if (ev.tipo === 'gol') { if (m != null) e.golesMin.push(m) }
          else if (ev.tipo === 'amarilla') e.amarillaMin = m
          else if (ev.tipo === 'doble_amarilla') e.dobleMin = m
          else if (ev.tipo === 'roja') e.rojaMin = m
          else if (ev.tipo === 'cambio_entra') e.entra = m
          else if (ev.tipo === 'cambio_sale') e.sale = m
          evMap.set(cod, e)
        }
        const toJ = (p: Record<string, unknown>): PartidoJugador => {
          const cod = String(p.codjugador)
          const meta = metaDe(cod)
          const ev = evMap.get(cod) || { golesMin: [], amarillaMin: null, dobleMin: null, rojaMin: null, entra: null, sale: null }
          return {
            codjugador: cod, nombre: meta.nombre, dorsal: meta.dorsal, pos: meta.pos,
            titular: !!p.titular, jugado: !!p.jugado, minutos: (p.minutos as number) || 0,
            goles: (p.goles as number) || 0, amarillas: (p.amarillas as number) || 0, dobles: (p.dobles_amarilla as number) || 0, rojas: (p.rojas as number) || 0,
            puntos: (p.puntos as number) ?? null, eloDelta: (p.elo_delta as number) ?? null,
            golesMin: ev.golesMin.sort((a, b) => a - b), amarillaMin: ev.amarillaMin, dobleMin: ev.dobleMin, rojaMin: ev.rojaMin, entra: ev.entra, sale: ev.sale,
            golesEncajados: (p.goles_encajados as number) ?? null,
            href: conFicha.has(cod) && meta.nombre ? jugadorHref(cod, meta.nombre) : null,
          }
        }
        const ladoDe = (cod: string): { titulares: PartidoJugador[]; suplentes: PartidoJugador[] } => {
          const all = partidos.filter((p) => String(p.codequipo) === cod).map(toJ).filter((j) => j.nombre)
          return {
            titulares: all.filter((j) => j.titular).sort(ordenPos),
            suplentes: all.filter((j) => !j.titular).sort((a, b) => (b.minutos - a.minutos) || ordenPos(a, b)),
          }
        }
        local = { ...local, ...ladoDe(codeqL) }
        visitante = { ...visitante, ...ladoDe(codeqV) }
        // MVP = mayor nº de puntos fantasy del partido.
        let best: Record<string, unknown> | null = null
        for (const p of partidos) if (p.puntos != null && (!best || (p.puntos as number) > (best.puntos as number))) best = p
        if (best) {
          const meta = metaDe(String(best.codjugador))
          if (meta.nombre) mvp = { nombre: meta.nombre, pos: meta.pos, puntos: best.puntos as number, lado: String(best.codequipo) === codeqL ? 'local' : 'visitante', href: conFicha.has(String(best.codjugador)) ? jugadorHref(String(best.codjugador), meta.nombre) : null }
        }
        // #5 Hitos del partido (web_jugador_hitos por codacta). Solo jugadores del acta con nombre; se excluyen los
        // "*_registrado" (primer dato en NUESTRA base, no hito real de carrera).
        const eqDe = new Map(partidos.map((p) => [String(p.codjugador), String(p.codequipo)]))
        const { data: hiRaw } = await supabase.from('web_jugador_hitos')
          .select('codjugador, tipo_hito, ambito, detalle, valor, contexto_nombre').eq('codacta', r.codacta)
        const hMapped = ((hiRaw || []) as Array<{ codjugador: string; tipo_hito: string; ambito: string | null; detalle: string | null; valor: number | null; contexto_nombre: string | null }>)
          .filter((h) => !String(h.tipo_hito).endsWith('_registrado'))
          .map((h) => {
            const cod = String(h.codjugador)
            const meta = metaDe(cod)
            return {
              codjugador: cod, nombre: meta.nombre, lado: (eqDe.get(cod) === codeqL ? 'local' : 'visitante') as 'local' | 'visitante',
              tipo: String(h.tipo_hito), detalle: h.detalle ?? null, valor: (h.valor as number) ?? null,
              ambito: h.ambito ?? null, contexto: h.contexto_nombre ?? null,
              href: conFicha.has(cod) && meta?.nombre ? jugadorHref(cod, meta.nombre) : null,
            }
          })
          .filter((h) => h.nombre)
        // El pipeline registra el mismo hito en ámbito 'categoria' Y 'equipo' -> una fila por (jugador+tipo).
        // Preferimos 'categoria' (aporta el nivel; el equipo ya es obvio en la ficha del partido).
        const hVistos = new Map<string, (typeof hMapped)[number]>()
        for (const h of hMapped) {
          const prev = hVistos.get(`${h.codjugador}|${h.tipo}`)
          if (!prev || (h.ambito === 'categoria' && prev.ambito !== 'categoria')) hVistos.set(`${h.codjugador}|${h.tipo}`, h)
        }
        hitos = Array.from(hVistos.values())
      }
    }

    // Campo -> nuestra ficha si la tiene; si no, Google Maps.
    const { nombre: campoNombre, superficie: campoSuperficie } = parseCampo(r.campo)
    let campoHref: string | null
    if (r.codigo_campo && (await getCamposConFicha()).has(String(r.codigo_campo))) {
      campoHref = `/campos/${campoSlug(String(r.codigo_campo), campoNombre)}`
    } else {
      campoHref = campoMapsUrl({ codigo: r.codigo_campo ?? null, nombre: r.campo, localidad: null, lat: r.campo_lat, lng: r.campo_lng })
    }

    const actaEq = (m: PartidoMini) => m.codacta !== String(r.codacta)   // fuera el propio partido de forma/H2H
    const [histL, histV, h2h, arbRaw, entRaw] = await Promise.all([
      historialDe(codeqL), historialDe(codeqV), enfrentamientos(codeqL, codeqV, 6),
      supabase.from('web_partido_arbitro').select('nombre, rol').eq('codacta', r.codacta),
      supabase.from('web_partido_entrenador').select('codequipo, nombre').eq('codacta', r.codacta),
    ])
    // Árbitros: SOLO nombre + rol (principal primero). Sin enlace, sin ranking, sin agregación por árbitro — nunca
    // (decisión de privacidad del pipeline). Entrenador jefe por equipo.
    const ROL_ORD: Record<string, number> = { 'Árbitro principal': 0, 'Árbitro': 0, 'Árbitro asistente': 1, 'Cuarto árbitro': 2 }
    const arbitros = ((arbRaw.data || []) as Array<{ nombre: string; rol: string }>)
      .filter((a) => a.nombre).sort((a, b) => (ROL_ORD[a.rol] ?? 9) - (ROL_ORD[b.rol] ?? 9))
    const entMap = new Map<string, string>(((entRaw.data || []) as Array<{ codequipo: string; nombre: string }>).map((e) => [String(e.codequipo), String(e.nombre)]))

    // #1 Pronóstico + #2 "tras el partido": ELO por partido DESDE LA PROPIA FILA (web_resultados.elo_pre/post_*).
    // Funciona igual en liga, copa y playoff (per-partido, sin cruzar jornadas -> se acabó el "ambos suben" de copa,
    // que venía de que `jornada` significa cosa distinta en web_resultados (ronda) y web_clasificacion (matchday)).
    // FUTUROS: elo_pre viene poblado, elo_post null -> hay pronóstico, no hay "tras el partido".
    // Null genuino si el pipeline no lo tiene (equipo sin histórico previo, ~1% de los partidos): silencio, nunca 1000.
    const mov = (pre: number | null, post: number | null) => (pre != null && post != null) ? Math.round((post - pre) * 10) / 10 : null
    const eloPreLocal = r.elo_pre_local ?? null, eloPostLocal = r.elo_post_local ?? null
    const eloPreVisitante = r.elo_pre_visitante ?? null, eloPostVisitante = r.elo_post_visitante ?? null

    // #3 Contexto de PUESTO (sube/baja del Xº al Yº): sigue de web_clasificacion, SOLO liga (en copa la jornada no
    // cuadra entre tablas -> null). El ELO ya no depende de esta consulta; se mantiene solo por el puesto.
    const esCopa = String(r.codgrupo).startsWith('fam-')
    const jNum = Number(r.jornada) || 0
    const { data: clRaw } = await supabase.from('web_clasificacion')
      .select('codequipo, jornada, pos, codgrupo, codgrupo_familia')
      .in('codequipo', [codeqL, codeqV].filter(Boolean)).eq('codtemporada', r.codtemporada)
    const clAll = ((clRaw || []) as Array<{ codequipo: string; jornada: number; pos: number | null; codgrupo: string; codgrupo_familia: string | null }>)
    const posDe = (cod: string): { posPre: number | null; posPost: number | null } => {
      if (esCopa) return { posPre: null, posPost: null }
      const mias = clAll.filter((c) => String(c.codequipo) === cod && String(c.codgrupo) === String(r.codgrupo) && c.codgrupo_familia == null)
      const post = mias.find((c) => c.jornada === jNum) || null
      const preG = mias.find((c) => c.jornada === jNum - 1) || null
      return { posPre: preG?.pos ?? null, posPost: post?.pos ?? null }
    }
    const posL = posDe(codeqL), posV = posDe(codeqV)

    // ΔELO por partido de la FORMA. Solo LIGA: elo[j] − elo[j−1] en web_clasificacion. En copa NO es fiable (la
    // ΔELO por partido de la FORMA, DESDE LA PROPIA FILA de cada partido (elo_pre/post_* de web_resultados). Funciona
    // en liga, copa y playoff por igual -> se acabó la asimetría (un equipo con solo partidos de copa se quedaba sin
    // ningún Δ). `cod` = el equipo del que es la forma; se toma su lado (local/visitante) en ese partido concreto.
    // Null genuino si el pipeline no lo tiene (equipo sin histórico previo): silencio, nunca un valor inventado.
    const deltaEloForma = (cod: string, m: PartidoMini): number | null => {
      const esLocal = m.codLocal === cod
      const pre = esLocal ? m.eloPreLocal : m.eloPreVisitante
      const post = esLocal ? m.eloPostLocal : m.eloPostVisitante
      return (pre != null && post != null) ? Math.round((post - pre) * 10) / 10 : null
    }
    const conElo = (arr: PartidoMini[], cod: string) => arr.filter(actaEq).slice(0, 5).map((m) => ({ ...m, eloDelta: deltaEloForma(cod, m) }))

    return {
      id: String(r.id), codacta: String(r.codacta ?? ''), jugado, esJuvenil, codtemporada: r.codtemporada,
      categoria, slugComp: g?.slug_comp || '', slugGrupo: g?.slug_grupo || '', temporada, nombreComp: g?.nombre_comp || 'RFFM · Madrid', jornada: r.jornada, compHref,
      local, visitante, golesLocal: r.goles_local, golesVisitante: r.goles_visitante, fecha: r.fecha, hora: r.hora,
      campoNombre: campoNombre || null, campoSuperficie, campoHref, campoLat: r.campo_lat, campoLng: r.campo_lng,
      mvp,
      formaLocal: conElo(histL, codeqL),
      formaVisitante: conElo(histV, codeqV),
      rachasLocal: rachasDe(codeqL, histL.filter(actaEq)),
      rachasVisitante: rachasDe(codeqV, histV.filter(actaEq)),
      h2h: h2h.filter(actaEq).slice(0, 5),
      arbitros, entrenadorLocal: entMap.get(codeqL) ?? null, entrenadorVisitante: entMap.get(codeqV) ?? null,
      eloPreLocal, eloPreVisitante,
      eloPostLocal, eloPostVisitante,
      movEloLocal: mov(eloPreLocal, eloPostLocal), movEloVisitante: mov(eloPreVisitante, eloPostVisitante),
      posPreLocal: posL.posPre, posPostLocal: posL.posPost,
      posPreVisitante: posV.posPre, posPostVisitante: posV.posPost,
      hitos,
    }
  }, ['getPartido', 'v10-elo-fila', String(r.codacta)], [String(r.codgrupo)], r.codtemporada)
}
