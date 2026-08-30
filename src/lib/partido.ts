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
  href: string | null   // ficha del jugador solo si la tiene
}
export type PartidoLado = { codequipo: string; nombre: string; escudo: string | null; titulares: PartidoJugador[]; suplentes: PartidoJugador[] }
export type PartidoMini = { id: string; fecha: string | null; local: string; escudoLocal: string | null; golesLocal: number | null; visitante: string; escudoVisitante: string | null; golesVisitante: number | null }
export type PartidoFicha = {
  id: string; jugado: boolean; esJuvenil: boolean; codtemporada: number
  categoria: string; slugComp: string; slugGrupo: string; temporada: string; nombreComp: string; jornada: number; compHref: string
  local: PartidoLado; visitante: PartidoLado
  golesLocal: number | null; golesVisitante: number | null; fecha: string | null; hora: string | null
  campoNombre: string | null; campoSuperficie: string | null; campoHref: string | null; campoLat: number | null; campoLng: number | null
  mvp: { nombre: string; puntos: number; lado: 'local' | 'visitante'; href: string | null } | null
  formaLocal: PartidoMini[]; formaVisitante: PartidoMini[]; h2h: PartidoMini[]
}

const POS_ORD: Record<string, number> = { POR: 0, DEF: 1, MED: 2, DEL: 3 }
const isoF = (f: string | null) => (f && /^\d{2}\/\d{2}\/\d{4}$/.test(f) ? f.slice(6, 10) + f.slice(3, 5) + f.slice(0, 2) : '00000000')
const ordenPos = (a: PartidoJugador, b: PartidoJugador) => {
  const pa = POS_ORD[a.pos || ''] ?? 9, pb = POS_ORD[b.pos || ''] ?? 9
  return pa !== pb ? pa - pb : (parseInt(a.dorsal || '99') || 99) - (parseInt(b.dorsal || '99') || 99)
}
const toMini = (r: Record<string, unknown>): PartidoMini => ({
  id: String(r.id), fecha: (r.fecha as string) ?? null,
  local: String(r.nombre_local ?? ''), escudoLocal: (r.escudo_local as string) ?? null, golesLocal: (r.goles_local as number) ?? null,
  visitante: String(r.nombre_visitante ?? ''), escudoVisitante: (r.escudo_visitante as string) ?? null, golesVisitante: (r.goles_visitante as number) ?? null,
})
const MINI_COLS = 'id, fecha, nombre_local, escudo_local, goles_local, nombre_visitante, escudo_visitante, goles_visitante'

async function ultimosDe(codequipo: string, n: number): Promise<PartidoMini[]> {
  if (!codequipo) return []
  const { data } = await supabase.from('web_resultados').select(MINI_COLS)
    .or(`codequipo_local.eq.${codequipo},codequipo_visitante.eq.${codequipo}`).not('goles_local', 'is', null)
  const rows = (data || []) as Array<Record<string, unknown>>
  rows.sort((a, b) => isoF(b.fecha as string).localeCompare(isoF(a.fecha as string)))
  return rows.slice(0, n).map(toMini)
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

export async function getPartido(id: string): Promise<PartidoFicha | null> {
  if (!/^\d+$/.test(id)) return null
  const { data: rRaw } = await supabase.from('web_resultados')
    .select('id, codacta, codtemporada, codgrupo, jornada, nombre_local, escudo_local, goles_local, goles_visitante, nombre_visitante, escudo_visitante, fecha, hora, campo, codigo_campo, campo_lat, campo_lng, codequipo_local, codequipo_visitante, ronda_slug')
    .eq('id', id).maybeSingle()
  const r = rRaw as {
    id: number; codacta: string | null; codtemporada: number; codgrupo: string; jornada: number
    nombre_local: string; escudo_local: string | null; goles_local: number | null; goles_visitante: number | null
    nombre_visitante: string; escudo_visitante: string | null; fecha: string | null; hora: string | null
    campo: string | null; codigo_campo: string | null; campo_lat: number | null; campo_lng: number | null
    codequipo_local: string | null; codequipo_visitante: string | null; ronda_slug: string | null
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

    // Alineaciones: solo si hay acta (partido jugado).
    if (r.codacta) {
      const { data: jpRaw } = await supabase.from('web_jugador_partidos')
        .select('codjugador, codequipo, titular, minutos, goles, amarillas, dobles_amarilla, rojas, puntos, elo_delta, jugado')
        .eq('codacta', r.codacta)
      const partidos = (jpRaw || []) as Array<Record<string, unknown>>
      if (partidos.length) {
        const codjugs = Array.from(new Set(partidos.map((p) => String(p.codjugador))))
        const { data: plRaw } = await supabase.from(rama)
          .select('codjugador, nombre, dorsal_comun, posicion_pastilla')
          .in('codequipo', [codeqL, codeqV].filter(Boolean)).eq('codtemporada', r.codtemporada)
        const plMap = new Map<string, { nombre: string; dorsal: string | null; pos: string | null }>(
          ((plRaw || []) as Array<Record<string, unknown>>).map((p) => [String(p.codjugador), { nombre: String(p.nombre || ''), dorsal: (p.dorsal_comun as string) ?? null, pos: (p.posicion_pastilla as string) ?? null }]))
        const conFicha = await fichasExistentes(codjugs)
        const toJ = (p: Record<string, unknown>): PartidoJugador => {
          const cod = String(p.codjugador)
          const meta = plMap.get(cod) || { nombre: '', dorsal: null, pos: null }
          return {
            codjugador: cod, nombre: meta.nombre, dorsal: meta.dorsal, pos: meta.pos,
            titular: !!p.titular, jugado: !!p.jugado, minutos: (p.minutos as number) || 0,
            goles: (p.goles as number) || 0, amarillas: (p.amarillas as number) || 0, dobles: (p.dobles_amarilla as number) || 0, rojas: (p.rojas as number) || 0,
            puntos: (p.puntos as number) ?? null, eloDelta: (p.elo_delta as number) ?? null,
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
          const meta = plMap.get(String(best.codjugador))
          if (meta?.nombre) mvp = { nombre: meta.nombre, puntos: best.puntos as number, lado: String(best.codequipo) === codeqL ? 'local' : 'visitante', href: conFicha.has(String(best.codjugador)) ? jugadorHref(String(best.codjugador), meta.nombre) : null }
        }
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

    const [formaLocal, formaVisitante, h2h] = await Promise.all([ultimosDe(codeqL, 5), ultimosDe(codeqV, 5), enfrentamientos(codeqL, codeqV, 5)])

    return {
      id: String(r.id), jugado, esJuvenil, codtemporada: r.codtemporada,
      categoria, slugComp: g?.slug_comp || '', slugGrupo: g?.slug_grupo || '', temporada, nombreComp: g?.nombre_comp || 'RFFM · Madrid', jornada: r.jornada, compHref,
      local, visitante, golesLocal: r.goles_local, golesVisitante: r.goles_visitante, fecha: r.fecha, hora: r.hora,
      campoNombre: campoNombre || null, campoSuperficie, campoHref, campoLat: r.campo_lat, campoLng: r.campo_lng,
      mvp, formaLocal, formaVisitante, h2h,
    }
  }, ['getPartido', 'v1', String(r.id)], [String(r.codgrupo)], r.codtemporada)
}
