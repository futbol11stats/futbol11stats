import { supabase } from '@/lib/supabase'
import { buildMatchIcs } from '@/lib/ics'
import { parseCampo } from '@/lib/campoSlug'
import { SITE_URL, CATEGORIA_SLUG } from '@/lib/seo'
import { codToSlug } from '@/lib/temporadaSlug'

// .ics por PARTIDO (botón "Añadir a mi calendario" de la pestaña de resultados). Se sirve desde el servidor,
// NO en cliente. Solo genera evento si el partido NO se ha jugado y tiene fecha Y hora (un partido sin hora
// concreta no sirve). El enlace y la competición se reconstruyen aquí desde web_resultados + web_grupos, así
// la URL del botón es limpia (/api/ics/<id>) y cacheable.

const HHMM = /^\d{1,2}:\d{2}$/
const DDMMYYYY = /^\d{2}\/\d{2}\/\d{4}$/

function slugify(s: string): string {
  return (s || '').normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'partido'
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  // El segmento [id] es en realidad el codacta (id federativo del acta): estable entre re-exports. El id de fila
  // de web_resultados NO sirve (el ciclo del pipeline lo reasigna).
  const { id: codacta } = await params
  if (!/^\d+$/.test(codacta)) return new Response('Not found', { status: 404 })

  const { data: rRaw } = await supabase.from('web_resultados')
    .select('id, codtemporada, codgrupo, jornada, nombre_local, nombre_visitante, codequipo_local, codequipo_visitante, goles_local, goles_visitante, fecha, hora, campo, codigo_campo, campo_lat, campo_lng, ronda_slug, ronda_label')
    .eq('codacta', codacta).maybeSingle()
  const r = rRaw as {
    codtemporada: number; codgrupo: string; jornada: number
    nombre_local: string; nombre_visitante: string; codequipo_local: string | null; codequipo_visitante: string | null
    goles_local: number | null; goles_visitante: number | null; fecha: string | null; hora: string | null
    campo: string | null; codigo_campo: string | null; campo_lat: number | null; campo_lng: number | null; ronda_slug: string | null; ronda_label: string | null
  } | null
  if (!r) return new Response('Not found', { status: 404 })

  // CONDICIONES: sin resultado + fecha válida + hora válida (no 00:00).
  const jugado = r.goles_local != null || r.goles_visitante != null
  const fechaOk = !!r.fecha && DDMMYYYY.test(r.fecha)
  const horaOk = !!r.hora && HHMM.test(r.hora) && r.hora !== '00:00'
  if (jugado || !fechaOk || !horaOk) return new Response('Evento no disponible', { status: 404 })

  // Enlace + etiqueta de competición desde web_grupos (categoría/slug/tipo). Copa: segmento = ronda; liga: jornada-N.
  const { data: gRaw } = await supabase.from('web_grupos')
    .select('categoria, slug_comp, slug_grupo, nombre_comp, tipo')
    .eq('codgrupo', r.codgrupo).eq('codtemporada', r.codtemporada).maybeSingle()
  const g = gRaw as { categoria: string; slug_comp: string; slug_grupo: string; nombre_comp: string | null; tipo: string | null } | null

  const cat = g ? CATEGORIA_SLUG[g.categoria] : null
  const tempSlug = codToSlug(r.codtemporada)
  const isLiga = !g?.tipo || g.tipo === 'LIGA'
  const seg = isLiga ? `jornada-${r.jornada}` : (r.ronda_slug || `jornada-${r.jornada}`)
  const url = g && cat && tempSlug
    ? `${SITE_URL}/madrid/${cat}/${g.slug_comp}/${g.slug_grupo}/${tempSlug}/${seg}/resultados`
    : `${SITE_URL}/`
  const competicion = [
    g?.nombre_comp || 'RFFM · Madrid',
    isLiga ? `Jornada ${r.jornada}` : (r.ronda_label || `Jornada ${r.jornada}`),
    tempSlug,
  ].filter(Boolean).join(' · ')

  // Dirección completa del campo (web_campo, por codigo_campo) para LOCATION/DESCRIPTION.
  let direccion: string | null = null
  if (r.codigo_campo) {
    const { data: cRaw } = await supabase.from('web_campo')
      .select('direccion, localidad, provincia').eq('codigo_campo', r.codigo_campo).maybeSingle()
    const c = cRaw as { direccion: string | null; localidad: string | null; provincia: string | null } | null
    if (c) direccion = [c.direccion, c.localidad, c.provincia].filter(Boolean).join(', ') || null
  }

  const ics = buildMatchIcs({
    codgrupo: r.codgrupo,
    jornada: r.jornada,
    codequipoLocal: String(r.codequipo_local ?? r.nombre_local),
    codequipoVisitante: String(r.codequipo_visitante ?? r.nombre_visitante),
    nombreLocal: r.nombre_local,
    nombreVisitante: r.nombre_visitante,
    golesLocal: r.goles_local, golesVisitante: r.goles_visitante,
    fecha: r.fecha as string,
    hora: r.hora,
    campoNombre: r.campo ? (parseCampo(r.campo).nombre || null) : null,
    direccion,
    lat: r.campo_lat, lng: r.campo_lng,
    competicion, url,
    perspectiva: null,   // botón neutro (sin equipo de referencia)
  }, Date.now())
  if (!ics) return new Response('Evento no disponible', { status: 404 })

  const filename = `${slugify(r.nombre_local)}-vs-${slugify(r.nombre_visitante)}.ics`
  return new Response(ics, {
    status: 200,
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'public, max-age=1800, s-maxage=1800',
    },
  })
}
