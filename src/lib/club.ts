import { supabase } from '@/lib/supabase'
import { cacheIndices } from '@/lib/cacheComp'

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

// Instalación DOMINANTE de un equipo en un conjunto de partidos: la más frecuente SOLO si es líder CLARO (su
// conteo > el 2º). Empate en el máximo o sin datos -> null (silencio antes que dato dudoso).
function campoDominante(m: Map<string, number>): string | null {
  let top: string | null = null, topN = 0, secondN = 0
  for (const [cp, n] of Array.from(m)) {
    if (n > topN) { secondN = topN; topN = n; top = cp }
    else if (n > secondN) { secondN = n }
  }
  return top && topN > secondN ? top : null
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
}

// Índice: SOLO clubes con equipos en web_equipo. Nombre y escudo se derivan de sus equipos (web_club.nombre_club
// puede venir NULL y web_club.escudo es inservible); localidad/provincia de web_club. nEquipos = nº de equipos
// (codequipos), igual que la ficha, que ya no deduplica por nombre.
export async function getClubesIndex(): Promise<ClubIndexRow[]> {
  return cacheIndices(async () => {
    type Acc = { nombre: string; equipos: { rama: string | null; nivel: number | null; temp: number; escudo: string | null }[]; n: number; maxTemp: number }
    const acc = new Map<string, Acc>()
    let ultimo = ''
    for (;;) {
      let q = supabase.from('web_equipo')
        .select('codequipo, codclub, nombre_club, nombre, rama, nombre_comp, categoria_nivel, escudo, codtemporada')
        .not('codclub', 'is', null).order('codequipo', { ascending: true }).limit(1000)
      if (ultimo) q = q.gt('codequipo', ultimo)
      const { data, error } = await q
      if (error) throw error
      if (!data || data.length === 0) break
      for (const r of data as any[]) {
        const cc = String(r.codclub || ''); if (!cc) continue
        const t = Number(r.codtemporada) || 0
        let a = acc.get(cc)
        if (!a) { a = { nombre: '', equipos: [], n: 0, maxTemp: 0 }; acc.set(cc, a) }
        if (!a.nombre && r.nombre_club) a.nombre = r.nombre_club
        a.equipos.push({ rama: r.rama, nivel: r.categoria_nivel, temp: t, escudo: r.escudo })
        a.n++
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
      })
    }
    out.sort((x, y) => x.nombre.localeCompare(y.nombre, 'es'))
    return out
  }, ['getClubesIndex', 'v3'])
}

export type ClubEquipoRow = {
  codequipo: string; nombre: string; rama: string | null
  nombre_comp: string | null; grupo_nombre: string | null; escudo: string | null
  activo: boolean | null; codtemporada: number | null
  campo: string | null   // instalación de ESTE equipo en su temporada más reciente con partidos, o null si no hay clara
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
      .select('codequipo, nombre, nombre_club, rama, nombre_comp, grupo_nombre, escudo, categoria_nivel, activo, codtemporada')
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
    const equipos = todos as ClubEquipoRow[]

    // Campo por EQUIPO de su TEMPORADA MÁS RECIENTE con partidos como local (o null si no hay una clara). Se casa
    // por CODEQUIPO (web_resultados ya lo trae en liga): así dos equipos del club con el MISMO nombre (p.ej. las
    // dos 'G'/'B' homónimas) no mezclan sus campos. Copa (sin codequipo) queda fuera: el campo sale de la liga.
    // Enriquecimiento: si falla, todos quedan sin campo.
    const codequipos = Array.from(new Set(equipos.map((e) => String(e.codequipo)).filter(Boolean)))
    if (codequipos.length) {
      const { data: res } = await supabase.from('web_resultados').select('codequipo_local, codtemporada, campo')
        .in('codequipo_local', codequipos).not('campo', 'is', null)
      const porEqTemp = new Map<string, Map<number, Map<string, number>>>()
      for (const r of (res || []) as { codequipo_local: string | null; codtemporada: number | null; campo: string | null }[]) {
        const cq = String(r.codequipo_local || ''), t = Number(r.codtemporada) || 0, cp = (r.campo || '').trim()
        if (!cq || !cp || !t) continue
        let byT = porEqTemp.get(cq); if (!byT) { byT = new Map(); porEqTemp.set(cq, byT) }
        let byC = byT.get(t); if (!byC) { byC = new Map(); byT.set(t, byC) }
        byC.set(cp, (byC.get(cp) || 0) + 1)
      }
      for (const e of equipos) {
        const byT = porEqTemp.get(String(e.codequipo))
        if (!byT) { e.campo = null; continue }
        const maxT = Math.max(...Array.from(byT.keys()))   // temporada más reciente con partidos de ESE equipo
        e.campo = campoDominante(byT.get(maxT)!)
      }
    } else {
      for (const e of equipos) e.campo = null
    }

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
  }, ['getClub', 'v5-portalok', codclub])
}
