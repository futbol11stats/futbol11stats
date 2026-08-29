import { supabase } from '@/lib/supabase'
import { matchVevent, wrapCalendar } from '@/lib/ics'
import { parseCampo } from '@/lib/campoSlug'
import { SITE_URL, CATEGORIA_SLUG } from '@/lib/seo'
import { codToSlug } from '@/lib/temporadaSlug'

// Feed .ics suscribible de UN equipo: TODA su temporada (histórico + futuro). Los partidos sin hora confirmada
// van como evento de DÍA COMPLETO; al concretarse la hora, el mismo UID pasa a evento con hora en el siguiente
// refresco (no duplica). El emoji del título (🏠/✈️) sale del lado que juega el equipo del feed.
// Nota: solo entran partidos con `codequipo` en la fila (liga). La copa por familia (fam-*) aún no trae codequipo,
// así que no aparece en el feed — pendiente de que el pipeline lo publique.

const DDMMYYYY = /^\d{2}\/\d{2}\/\d{4}$/
const iso = (f: string | null) => (f && DDMMYYYY.test(f) ? f.slice(6, 10) + f.slice(3, 5) + f.slice(0, 2) : '99999999')

export async function buildTeamCalendar(codequipo: string, nowMs: number): Promise<{ ics: string; nombre: string } | null> {
  const cod = String(codequipo)
  const { data: allRaw, error } = await supabase.from('web_resultados')
    .select('codtemporada, codgrupo, jornada, nombre_local, nombre_visitante, codequipo_local, codequipo_visitante, goles_local, goles_visitante, fecha, hora, campo, codigo_campo, campo_lat, campo_lng, ronda_slug, ronda_label')
    .or(`codequipo_local.eq.${cod},codequipo_visitante.eq.${cod}`)
  // NO tragarse el error como "sin partidos": un timeout/error transitorio debe propagarse (503 reintentado),
  // nunca convertirse en 404. Devolver null SOLO cuando de verdad no hay filas. (Ver: fallos silenciosos que
  // devuelven vacío — este era el bug de "El equipo no tiene partidos" con equipos que sí tienen calendario.)
  if (error) throw error
  const all = (allRaw || []) as Array<Record<string, unknown>>
  if (!all.length) return null

  // Temporada = la más reciente en la que el equipo tiene partidos (su calendario "actual").
  const maxSeason = Math.max(...all.map((r) => Number(r.codtemporada) || 0))
  const rows = all.filter((r) => Number(r.codtemporada) === maxSeason)
  if (!rows.length) return null

  // ¿La temporada del equipo NO es la activa del sitio? (transitorio: 2ª Juvenil/2ª Aficionada aún sin ingerir en
  // la activa -> su última temporada es la anterior). Se etiqueta el calendario con su temporada para no hacer
  // pasar lo viejo por actual. Desaparece solo cuando el pipeline ingiera esas categorías.
  const { data: actRaw } = await supabase.from('web_grupos').select('codtemporada').order('codtemporada', { ascending: false }).limit(1)
  const activeSeason = Number((actRaw?.[0] as { codtemporada?: number } | undefined)?.codtemporada) || maxSeason
  const esVieja = maxSeason < activeSeason

  // Nombre del equipo (lado que le corresponde).
  let nombre = ''
  for (const r of rows) { nombre = String(r.codequipo_local) === cod ? String(r.nombre_local) : String(r.nombre_visitante); if (nombre) break }

  // Grupos -> categoría/slug/tipo (para el enlace y la etiqueta de competición). Un equipo puede tener 1+ grupos.
  const codgrupos = Array.from(new Set(rows.map((r) => String(r.codgrupo))))
  const { data: gdata } = await supabase.from('web_grupos')
    .select('codgrupo, categoria, slug_comp, slug_grupo, nombre_comp, tipo')
    .in('codgrupo', codgrupos).eq('codtemporada', maxSeason)
  const gmap = new Map<string, { categoria: string; slug_comp: string; slug_grupo: string; nombre_comp: string | null; tipo: string | null }>(
    ((gdata || []) as Array<{ codgrupo: string }>).map((g) => [String(g.codgrupo), g as never]))

  // Campos -> dirección (LOCATION/DESCRIPTION).
  const codigos = Array.from(new Set(rows.map((r) => r.codigo_campo).filter(Boolean).map(String)))
  const cmap = new Map<string, { direccion: string | null; localidad: string | null; provincia: string | null }>()
  if (codigos.length) {
    const { data: cdata } = await supabase.from('web_campo').select('codigo_campo, direccion, localidad, provincia').in('codigo_campo', codigos)
    for (const c of (cdata || []) as Array<{ codigo_campo: string; direccion: string | null; localidad: string | null; provincia: string | null }>) cmap.set(String(c.codigo_campo), c)
  }

  const tempSlug = codToSlug(maxSeason)
  rows.sort((a, b) => iso(a.fecha as string).localeCompare(iso(b.fecha as string)))

  const vevents: string[] = []
  for (const r of rows) {
    if (!r.fecha || !DDMMYYYY.test(String(r.fecha))) continue   // sin fecha no hay evento
    const g = gmap.get(String(r.codgrupo))
    const cat = g ? CATEGORIA_SLUG[g.categoria] : null
    const isLiga = !g?.tipo || g.tipo === 'LIGA'
    const seg = isLiga ? `jornada-${r.jornada}` : (String(r.ronda_slug || '') || `jornada-${r.jornada}`)
    const url = g && cat && tempSlug
      ? `${SITE_URL}/madrid/${cat}/${g.slug_comp}/${g.slug_grupo}/${tempSlug}/${seg}/resultados`
      : `${SITE_URL}/`
    const competicion = [g?.nombre_comp || 'RFFM · Madrid', isLiga ? `Jornada ${r.jornada}` : (String(r.ronda_label || '') || `Jornada ${r.jornada}`)].filter(Boolean).join(' · ')
    const c = r.codigo_campo ? cmap.get(String(r.codigo_campo)) : null
    const direccion = c ? ([c.direccion, c.localidad, c.provincia].filter(Boolean).join(', ') || null) : null
    const ve = matchVevent({
      codgrupo: String(r.codgrupo), jornada: r.jornada as number,
      codequipoLocal: String(r.codequipo_local ?? r.nombre_local),
      codequipoVisitante: String(r.codequipo_visitante ?? r.nombre_visitante),
      nombreLocal: String(r.nombre_local), nombreVisitante: String(r.nombre_visitante),
      golesLocal: (r.goles_local as number | null) ?? null, golesVisitante: (r.goles_visitante as number | null) ?? null,
      fecha: String(r.fecha), hora: (r.hora as string | null) ?? null,
      campoNombre: r.campo ? (parseCampo(String(r.campo)).nombre || null) : null, direccion,
      lat: (r.campo_lat as number | null) ?? null, lng: (r.campo_lng as number | null) ?? null,
      competicion, url,
      perspectiva: String(r.codequipo_local) === cod ? 'local' : 'visitante',
    }, nowMs)
    if (ve) vevents.push(ve)
  }
  if (!vevents.length) return null
  const calName = esVieja ? `${nombre} · ${tempSlug} · Fútbol11Stats` : `${nombre} · Fútbol11Stats`
  return { ics: wrapCalendar(vevents, { name: calName, ttlHours: 2 }), nombre }
}
