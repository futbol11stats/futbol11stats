import { supabase } from '@/lib/supabase'
import { cacheIndices } from '@/lib/cacheComp'

// Índice de clubes y páginas de club. La entidad "club" agrupa filiales y juveniles por `codclub` (id troncal
// RFFM, estable a cambios de nombre). Metadatos ricos en `web_club`. PRIVACIDAD (decisión cerrada): se publican
// nombre oficial, localidad, provincia, delegación, portal web y escudo; NUNCA domicilio, CIF ni código postal
// (en clubes amateur el domicilio social suele ser la casa de un directivo). El CAMPO no es del club (sus
// equipos juegan en instalaciones DISTINTAS): va por EQUIPO, derivado de SUS partidos como local (la
// instalación pública más frecuente; NINGUNA si no hay una clara -> silencio antes que dato dudoso).
// PERÍMETRO DE MENORES: las páginas de club listan equipos (incluidos juveniles) por su NOMBRE DE EQUIPO,
// nunca personas. No hay plantillas ni nombres de jugador en ninguna superficie de club.

export { clubSlug, codclubFromSlug } from '@/lib/clubSlug'

// Instalación DOMINANTE de un equipo: la más frecuente SOLO si es líder CLARO (su conteo > el 2º). Empate en
// el máximo o sin datos -> null (silencio antes que dato dudoso).
function campoDominante(m: Map<string, number>): string | null {
  let top: string | null = null, topN = 0, secondN = 0
  for (const [cp, n] of Array.from(m)) {
    if (n > topN) { secondN = topN; topN = n; top = cp }
    else if (n > secondN) { secondN = n }
  }
  return top && topN > secondN ? top : null
}

export type ClubIndexRow = {
  codclub: string; nombre: string; escudo: string | null
  localidad: string | null; provincia: string | null; nEquipos: number; maxTemp: number | null
}

// Índice: SOLO clubes con al menos un equipo en web_equipo (los 11 de web_club con n_equipos=0 quedan fuera;
// son clubes sin equipos registrados —nuevos o inactivos—, no femenino/base). Conteo + última temporada por
// club desde web_equipo (KEYSET), metadatos desde web_club.
export async function getClubesIndex(): Promise<ClubIndexRow[]> {
  return cacheIndices(async () => {
    const conteo = new Map<string, { n: number; maxTemp: number }>()
    let ultimo = ''
    for (;;) {
      let q = supabase.from('web_equipo').select('codequipo, codclub, codtemporada')
        .not('codclub', 'is', null).order('codequipo', { ascending: true }).limit(1000)
      if (ultimo) q = q.gt('codequipo', ultimo)
      const { data, error } = await q
      if (error) throw error
      if (!data || data.length === 0) break
      for (const r of data as { codequipo: string; codclub: string | null; codtemporada: number | null }[]) {
        const cc = String(r.codclub || ''); if (!cc) continue
        const t = Number(r.codtemporada) || 0
        const cur = conteo.get(cc) || { n: 0, maxTemp: 0 }
        cur.n++; if (t > cur.maxTemp) cur.maxTemp = t
        conteo.set(cc, cur)
      }
      ultimo = String((data[data.length - 1] as { codequipo: string }).codequipo)
      if (data.length < 1000) break
    }
    const { data: clubs, error } = await supabase.from('web_club').select('codclub, nombre_club, escudo, localidad, provincia')
    if (error) throw error
    const meta = new Map<string, { nombre_club: string | null; escudo: string | null; localidad: string | null; provincia: string | null }>(
      (clubs || []).map((c: any) => [String(c.codclub), c]))
    const out: ClubIndexRow[] = []
    for (const [cc, { n, maxTemp }] of Array.from(conteo)) {
      const m = meta.get(cc)
      out.push({
        codclub: cc, nombre: m?.nombre_club || '', escudo: m?.escudo ?? null,
        localidad: m?.localidad ?? null, provincia: m?.provincia ?? null, nEquipos: n, maxTemp: maxTemp || null,
      })
    }
    out.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    return out
  }, ['getClubesIndex', 'v1'])
}

export type ClubEquipoRow = {
  codequipo: string; nombre: string; rama: string | null
  nombre_comp: string | null; grupo_nombre: string | null; escudo: string | null
  activo: boolean | null; codtemporada: number | null
  campo: string | null   // instalación habitual de ESTE equipo (más frecuente como local), o null si no hay una clara
}
export type ClubFicha = {
  codclub: string; nombre: string; escudo: string | null
  localidad: string | null; provincia: string | null; delegacion: string | null; portal_web: string | null
  equipos: ClubEquipoRow[]; maxTemp: number | null
}

export async function getClub(codclub: string): Promise<ClubFicha | null> {
  return cacheIndices(async () => {
    // Metadatos del club (SIN domicilio/CIF/CP: privacidad). throw en error -> no cachear null falso (ver checklist).
    const { data: c, error } = await supabase.from('web_club')
      .select('codclub, nombre_club, escudo, localidad, provincia, delegacion, portal_web')
      .eq('codclub', codclub).limit(1).maybeSingle()
    if (error) throw error
    if (!c) return null
    // Equipos del club (todos: aficionado + juveniles). SOLO nombre de EQUIPO, nunca personas.
    const { data: eqs, error: e2 } = await supabase.from('web_equipo')
      .select('codequipo, nombre, rama, nombre_comp, grupo_nombre, escudo, activo, codtemporada')
      .eq('codclub', codclub)
    if (e2) throw e2
    const todos = (eqs || []) as unknown as ClubEquipoRow[]
    if (todos.length === 0) return null   // club sin equipos -> no hay página
    // Dedup por nombre: un mismo equipo puede tener 2 codequipo si la RFFM reasignó el código -> se conserva el
    // más reciente (max codtemporada) para no listarlo dos veces.
    const dd = new Map<string, ClubEquipoRow>()
    for (const e of todos) {
      const ex = dd.get(e.nombre)
      if (!ex || (Number(e.codtemporada) || 0) > (Number(ex.codtemporada) || 0)) dd.set(e.nombre, e)
    }
    const equipos = Array.from(dd.values())
    // Campo POR EQUIPO: instalación más frecuente en SUS partidos como local; NULL si no hay una clara (empate
    // en el máximo -> silencio). Una sola consulta a web_resultados por todos los equipos del club. Enriquecimiento:
    // si falla, todos quedan sin campo (no rompe la página).
    const nombres = Array.from(new Set(equipos.map((e) => e.nombre).filter(Boolean)))
    const porEquipo = new Map<string, Map<string, number>>()   // nombre_local -> (campo -> conteo)
    if (nombres.length) {
      const { data: res } = await supabase.from('web_resultados').select('nombre_local, campo')
        .in('nombre_local', nombres).not('campo', 'is', null)
      for (const r of (res || []) as { nombre_local: string | null; campo: string | null }[]) {
        const nl = (r.nombre_local || '').trim(); const cp = (r.campo || '').trim()
        if (!nl || !cp) continue
        const m = porEquipo.get(nl) || new Map<string, number>()
        m.set(cp, (m.get(cp) || 0) + 1); porEquipo.set(nl, m)
      }
    }
    for (const e of equipos) {
      const m = porEquipo.get((e.nombre || '').trim())
      e.campo = m ? campoDominante(m) : null
    }
    const maxTemp = equipos.reduce((m, e) => Math.max(m, Number(e.codtemporada) || 0), 0) || null
    return {
      codclub: String(c.codclub), nombre: (c as any).nombre_club, escudo: (c as any).escudo,
      localidad: (c as any).localidad, provincia: (c as any).provincia, delegacion: (c as any).delegacion,
      portal_web: (c as any).portal_web, equipos, maxTemp,
    }
  }, ['getClub', 'v1', codclub])
}
