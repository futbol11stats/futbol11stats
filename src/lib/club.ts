import { supabase } from '@/lib/supabase'
import { cacheIndices, cacheEquipo } from '@/lib/cacheComp'

// Índice de clubes y páginas de club. La entidad "club" agrupa filiales y juveniles por `codclub` (id troncal
// RFFM, estable a cambios de nombre). Metadatos en `web_club`. PRIVACIDAD (decisión cerrada): se publican
// nombre oficial, localidad, provincia, delegación, portal web y escudo; NUNCA domicilio, CIF ni código postal.
// PERÍMETRO DE MENORES: las páginas de club listan equipos (incl. juveniles) por su NOMBRE DE EQUIPO, nunca
// personas; no consultan web_jugador.
//
// Notas de datos (verificadas 2026-08):
//  - ESCUDO del club: web_club.escudo trae la RUTA RFFM cruda (/pnfg/pimg/Clubes/...), no el hash rehospedado
//    que usan los escudos de equipo -> con escudoUrl() daría 404. Se usa el escudo del PRIMER EQUIPO (crest
//    limpio del club) en su lugar. Pendiente en el pipeline: rehospedar los escudos de club (ver PENDIENTES).
//  - NOMBRE del club: web_club.nombre_club viene NULL en 84 clubes; se cae a web_equipo.nombre_club (poblado).
//  - CAMPO: no es del club (sus equipos juegan en instalaciones distintas). Va por EQUIPO, de su TEMPORADA MÁS
//    RECIENTE con partidos (su último campo conocido); NINGUNO si no hay uno claro -> silencio.

export { clubSlug, codclubFromSlug } from '@/lib/clubSlug'

// Campo de UN equipo (para la ficha de equipo). El pipeline ya lo publica en web_equipo (columnas campo_*): no se
// deriva. `codigo` presente = el equipo tiene campo identificado; `lat`/`lng` dan el PIN exacto en Maps (resuelve
// el problema del topónimo). `localidad` es la del CAMPO (campo_localidad), NUNCA la del club (puede estar en otro
// municipio). Cacheado con tag equipo:<cod>.
export type CampoEquipo = { codigo: string | null; nombre: string | null; localidad: string | null; lat: number | null; lng: number | null }
export async function getCampoEquipo(codequipo: string): Promise<CampoEquipo> {
  return cacheEquipo(async () => {
    const { data } = await supabase.from('web_equipo')
      .select('campo_codigo, campo_nombre, campo_localidad, campo_lat, campo_lng')
      .eq('codequipo', String(codequipo)).limit(1).maybeSingle()
    const c = data as { campo_codigo?: string | null; campo_nombre?: string | null; campo_localidad?: string | null; campo_lat?: number | null; campo_lng?: number | null } | null
    return { codigo: c?.campo_codigo ?? null, nombre: c?.campo_nombre ?? null, localidad: c?.campo_localidad ?? null, lat: c?.campo_lat ?? null, lng: c?.campo_lng ?? null }
  }, ['getCampoEquipo', 'v2-webequipo', String(codequipo)], codequipo)
}

// Códigos de SUPERFICIE del acta RFFM (verificados en el dato 2026-08: HA/H.A. y HB/T; no existe HN). Se
// traducen a etiqueta legible. Cualquier otro paréntesis final (p.ej. "(CONDESA CHINCHON 1)") NO es superficie
// -> se deja como parte del nombre.
const SUPERFICIE: Record<string, string> = { HA: 'hierba artificial', HN: 'hierba natural', HB: 'hierba natural', T: 'tierra' }
// Separa el nombre del campo de su código de superficie final. `nombre` sin el código; `superficie` legible o null.
export function parseCampo(campo: string | null): { nombre: string; superficie: string | null } {
  if (!campo) return { nombre: '', superficie: null }
  const m = campo.match(/\s*\(([A-Za-z.]{1,4})\)\s*$/)   // paréntesis final de 1-4 letras/puntos (posible código)
  if (m) {
    const code = m[1].replace(/\./g, '').toUpperCase()   // "H.A." -> "HA"
    if (SUPERFICIE[code]) return { nombre: campo.slice(0, m.index).trim(), superficie: SUPERFICIE[code] }
  }
  return { nombre: campo.trim(), superficie: null }
}
// Texto para listas (página de club): "NOMBRE · superficie" (o solo nombre si no hay superficie conocida).
export function campoLabel(campo: string | null): string {
  const { nombre, superficie } = parseCampo(campo)
  return superficie ? `${nombre} · ${superficie}` : nombre
}
// Enlace a Google Maps del campo, EN ESTE ORDEN (nunca cae a la localidad del CLUB — ése era el bug del topónimo):
//   1. lat+lng -> PIN EXACTO (maps?q=lat,lng). Resuelve de raíz la ambigüedad del nombre.
//   2. sin coords pero con nombre -> búsqueda "campo de fútbol <nombre sin código superficie>, <campo_localidad>".
//   3. sin campo (ni coords ni nombre) -> null: NO se enlaza.
export function campoMapsUrl(c: CampoEquipo): string | null {
  if (c.lat != null && c.lng != null) return `https://www.google.com/maps?q=${c.lat},${c.lng}`
  if (c.nombre) {
    const q = `campo de fútbol ${parseCampo(c.nombre).nombre}${c.localidad ? `, ${c.localidad}` : ''}`
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
  }
  return null
}

// Escudo del PRIMER EQUIPO = crest limpio del club (los filiales llevan el mismo diseño con una letra). Orden:
// aficionados antes que juveniles, luego categoría más alta (categoria_nivel MENOR), luego más reciente. Toma
// el primero con escudo; si ninguno tiene, null.
function escudoPrimerEquipo(equipos: { rama: string | null; nivel: number | null; temp: number; escudo: string | null }[]): string | null {
  const con = equipos.filter((e) => e.escudo)
  if (!con.length) return null
  con.sort((a, b) =>
    (a.rama === 'juvenil' ? 1 : 0) - (b.rama === 'juvenil' ? 1 : 0) ||
    ((a.nivel ?? 99) - (b.nivel ?? 99)) ||
    (b.temp - a.temp))
  return con[0].escudo
}

// CAPA 1 de la validación de portal_web: SOLO formato. La RFFM guarda ahí a menudo emails, @handles, '.',
// nombres con espacios o esquemas rotos ('www://'). Devuelve una URL absoluta bien formada, o null (y entonces
// ni se enlaza ni va en sameAs). CAPA 2 (que RESPONDE y no está parqueado/en venta): el flag web_club.portal_web_ok
// que publica el pipeline (re-verificado semanal en cola rodante); getClub exige ok===true además de este formato.
export function portalWebValido(raw: string | null | undefined): string | null {
  const s = (raw || '').trim()
  if (!s || s.includes('@') || /\s/.test(s)) return null   // email, @handle, o con espacios -> no es URL
  let u = /^www:\/\//i.test(s) ? s.replace(/^www:\/\//i, 'https://') : s
  if (!/^https?:\/\//i.test(u)) u = 'https://' + u
  let host: string
  try { host = new URL(u).hostname } catch { return null }
  // dominio con TLD alfabético de 2+ (descarta '.', '.CD.MORATA' con punto inicial, hosts sin TLD)
  if (!/^([a-z0-9¡-￿-]+\.)+[a-z¡-￿]{2,}$/i.test(host)) return null
  return u
}

export type ClubIndexRow = {
  codclub: string; nombre: string; escudo: string | null
  localidad: string | null; provincia: string | null; nEquipos: number; maxTemp: number | null
  codgrupos: string[]   // grupos de todos sus equipos -> lastmod real del sitemap (última jornada jugada del club)
}

// Índice: SOLO clubes con equipos en web_equipo. Nombre y escudo se derivan de sus equipos (web_club.nombre_club
// puede venir NULL y web_club.escudo es inservible); localidad/provincia de web_club. nEquipos = nº de equipos
// (codequipos), igual que la ficha, que ya no deduplica por nombre.
export async function getClubesIndex(): Promise<ClubIndexRow[]> {
  return cacheIndices(async () => {
    type Acc = { nombre: string; equipos: { rama: string | null; nivel: number | null; temp: number; escudo: string | null }[]; n: number; maxTemp: number; codgrupos: Set<string> }
    const acc = new Map<string, Acc>()
    let ultimo = ''
    for (;;) {
      let q = supabase.from('web_equipo')
        .select('codequipo, codclub, nombre_club, nombre, rama, nombre_comp, categoria_nivel, escudo, codtemporada, codgrupo')
        .not('codclub', 'is', null).order('codequipo', { ascending: true }).limit(1000)
      if (ultimo) q = q.gt('codequipo', ultimo)
      const { data, error } = await q
      if (error) throw error
      if (!data || data.length === 0) break
      for (const r of data as any[]) {
        const cc = String(r.codclub || ''); if (!cc) continue
        const t = Number(r.codtemporada) || 0
        let a = acc.get(cc)
        if (!a) { a = { nombre: '', equipos: [], n: 0, maxTemp: 0, codgrupos: new Set() }; acc.set(cc, a) }
        if (!a.nombre && r.nombre_club) a.nombre = r.nombre_club
        a.equipos.push({ rama: r.rama, nivel: r.categoria_nivel, temp: t, escudo: r.escudo })
        a.n++
        if (r.codgrupo) a.codgrupos.add(String(r.codgrupo))
        if (t > a.maxTemp) a.maxTemp = t
      }
      ultimo = String((data[data.length - 1] as { codequipo: string }).codequipo)
      if (data.length < 1000) break
    }
    const { data: clubs, error } = await supabase.from('web_club').select('codclub, nombre_club, localidad, provincia')
    if (error) throw error
    const meta = new Map<string, { nombre_club: string | null; localidad: string | null; provincia: string | null }>(
      (clubs || []).map((c: any) => [String(c.codclub), c]))
    const out: ClubIndexRow[] = []
    for (const [cc, a] of Array.from(acc)) {
      const m = meta.get(cc)
      out.push({
        codclub: cc,
        nombre: (m?.nombre_club) || a.nombre || '',
        escudo: escudoPrimerEquipo(a.equipos),
        localidad: m?.localidad ?? null, provincia: m?.provincia ?? null,
        nEquipos: a.n, maxTemp: a.maxTemp || null,
        codgrupos: Array.from(a.codgrupos),
      })
    }
    out.sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'))
    return out
  }, ['getClubesIndex', 'v4-codgrupos'])
}

export type ClubEquipoRow = {
  codequipo: string; nombre: string; rama: string | null
  nombre_comp: string | null; grupo_nombre: string | null; escudo: string | null
  activo: boolean | null; codtemporada: number | null
  // Campo del equipo (del pipeline, web_equipo.campo_*): codigo presente = tiene campo; lat/lng para el pin en Maps.
  campo_codigo: string | null; campo_nombre: string | null; campo_localidad: string | null
  campo_lat: number | null; campo_lng: number | null
}
export type ClubFicha = {
  codclub: string; nombre: string; escudo: string | null
  localidad: string | null; provincia: string | null; delegacion: string | null; portal_web: string | null
  equipos: ClubEquipoRow[]; maxTemp: number | null
}

export async function getClub(codclub: string): Promise<ClubFicha | null> {
  return cacheIndices(async () => {
    // web_club: metadatos publicables (SIN domicilio/CIF/CP). Puede faltar la fila o el nombre.
    const { data: cRaw, error } = await supabase.from('web_club')
      .select('codclub, nombre_club, localidad, provincia, delegacion, portal_web, portal_web_ok')
      .eq('codclub', codclub).limit(1).maybeSingle()
    if (error) throw error
    // Equipos del club (SOLO nombre de EQUIPO, nunca personas).
    const { data: eqs, error: e2 } = await supabase.from('web_equipo')
      .select('codequipo, nombre, nombre_club, rama, nombre_comp, grupo_nombre, escudo, categoria_nivel, activo, codtemporada, ' +
        'campo_codigo, campo_nombre, campo_localidad, campo_lat, campo_lng')
      .eq('codclub', codclub)
    if (e2) throw e2
    const todos = (eqs || []) as any[]
    if (todos.length === 0) return null   // sin equipos -> no hay página

    const nombre = (cRaw as any)?.nombre_club || todos.find((e) => e.nombre_club)?.nombre_club || 'Club'
    // Escudo del club = escudo del PRIMER EQUIPO (web_club.escudo es la ruta RFFM cruda, inservible).
    const escudo = escudoPrimerEquipo(todos.map((e) => ({ rama: e.rama, nivel: e.categoria_nivel, temp: Number(e.codtemporada) || 0, escudo: e.escudo })))

    // SIN dedup por nombre: cada codequipo es un equipo (una ficha) distinto. Deduplicar por (nombre+rama+categoría)
    // BORRABA equipos reales cuando dos filiales comparten esa terna: p.ej. Nuevo Boadilla tiene dos equipos 'G'
    // ACTIVOS en 2ª Juvenil (uno es en realidad el 'I' con la letra mal DERIVADA por el pipeline: la RFFM sí la
    // distingue en actas, pero la tabla equipo la guardó como 'G') -> el dedup colapsaba los dos y desaparecía uno.
    // La única clave que nunca pierde un equipo real es el codequipo. El coste (ver dos veces una letra) es
    // preferible a borrar un equipo; la letra duplicada es una anomalía del dato a corregir en el pipeline.
    // Campo por EQUIPO: ya viene en web_equipo.campo_* (columnas del select), no se deriva. Cada equipo trae su
    // campo_codigo/nombre/localidad/lat/lng directamente.
    const equipos = todos as ClubEquipoRow[]

    const maxTemp = equipos.reduce((m, e) => Math.max(m, Number(e.codtemporada) || 0), 0) || null
    return {
      codclub, nombre, escudo,
      localidad: (cRaw as any)?.localidad ?? null, provincia: (cRaw as any)?.provincia ?? null,
      // Enlace del club: lo manda el flag del pipeline (portal_web_ok = responde y no es tóxico), con el filtro de
      // FORMATO como primera línea. Si el flag no es TRUE -> null (ni enlace ni sameAs).
      delegacion: (cRaw as any)?.delegacion ?? null,
      portal_web: (cRaw as any)?.portal_web_ok === true ? portalWebValido((cRaw as any)?.portal_web) : null,
      equipos, maxTemp,
    }
  }, ['getClub', 'v6-campo-webequipo', codclub])
}
