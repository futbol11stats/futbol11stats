import { supabase, mapaCampoUrl } from '@/lib/supabase'
import { cacheIndices } from '@/lib/cacheComp'

// Directorio y páginas de CAMPO (instalaciones). Datos: web_campo (nombre/dirección/localidad/provincia/CP/coords).
// Los equipos que juegan en cada campo se derivan de los PARTIDOS (web_resultados.codigo_campo -> codequipo_local)
// vía la vista `web_campo_equipo` (ver definición en campo.ts abajo / CHECKLIST del pipeline). Anti-thin: solo
// campos con >=1 equipo. Nombre del campo va CRUDO (con sufijo de superficie "(HA)"); se limpia con parseCampo
// para el slug y para el marcado. PERÍMETRO: se listan EQUIPOS (nunca personas); sus fichas siguen su noindex.

export { campoSlug, codigoCampoFromSlug } from '@/lib/campoSlug'

export type CampoIndexRow = {
  codigo: string; nombre: string; localidad: string | null; provincia: string | null; nEquipos: number; lastIso: string | null
}

// Índice: web_campo (metadatos) + web_campo_resumen (nº equipos + última fecha por campo; 414 filas, una consulta
// -> NO se re-agrega la vista edge por paginado, que daba timeout en build).
export async function getCamposIndex(): Promise<CampoIndexRow[]> {
  return cacheIndices(async () => {
    const { data: res, error: e1 } = await supabase.from('web_campo_resumen').select('codigo_campo, n_equipos, last_iso')
    if (e1) throw e1
    const edges = new Map<string, { n: number; last: string | null }>(
      ((res || []) as { codigo_campo: string; n_equipos: number; last_iso: string | null }[])
        .map((r) => [String(r.codigo_campo), { n: r.n_equipos, last: r.last_iso }]))
    const { data: campos, error } = await supabase.from('web_campo')
      .select('codigo_campo, nombre_campo, localidad, provincia')
    if (error) throw error
    const out: CampoIndexRow[] = []
    for (const c of (campos || []) as { codigo_campo: string; nombre_campo: string | null; localidad: string | null; provincia: string | null }[]) {
      const agg = edges.get(String(c.codigo_campo))
      if (!agg) continue   // anti-thin: campo sin equipos no entra
      out.push({
        codigo: String(c.codigo_campo), nombre: c.nombre_campo || '',
        localidad: c.localidad ?? null, provincia: c.provincia ?? null, nEquipos: agg.n, lastIso: agg.last,
      })
    }
    out.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
    return out
  }, ['getCamposIndex', 'v2-resumen'])
}

// Se pinta EXACTAMENTE como un resultado de búsqueda de equipo -> mismos campos que EquipoHit (escudo, categoría
// = nombre_comp, grupo = grupo_nombre, rama, activo, codtemporada), leídos de web_equipo (misma fuente que el
// buscador). nPartidos viene de la vista del campo (ordena la lista: habituales primero).
// Set de codigo_campo que TIENEN ficha (>=1 equipo -> anti-thin, están en web_campo_resumen). Para decidir si el
// campo de un equipo/partido enlaza a NUESTRA ficha /campos/[slug] (enlace interno) o cae a Google Maps. Se cachea
// el ARRAY (los Set no sobreviven a unstable_cache -> se reconstruye el Set en cada llamada, fuera de la caché).
export async function getCamposConFicha(): Promise<Set<string>> {
  const arr = await cacheIndices(async () => {
    const { data } = await supabase.from('web_campo_resumen').select('codigo_campo')
    return ((data || []) as { codigo_campo: string }[]).map((r) => String(r.codigo_campo))
  }, ['getCamposConFicha', 'v1'])
  return new Set(arr)
}

export type CampoEquipoRow = {
  codequipo: string; nombre: string; escudo: string | null; rama: string | null
  nombre_comp: string | null; grupo_nombre: string | null; codtemporada: string | null; activo: boolean | null
  nPartidos: number
}
export type CampoFicha = {
  codigo: string; nombre: string
  direccion: string | null; localidad: string | null; provincia: string | null; cp: string | null
  lat: number | null; lng: number | null
  mapaUrl: string | null   // mapa estático OSM del bucket (solo si el campo está en el manifiesto web_campo_mapa)
  equipos: CampoEquipoRow[]
}

export async function getCampo(codigo: string): Promise<CampoFicha | null> {
  return cacheIndices(async () => {
    const { data: cRaw, error } = await supabase.from('web_campo')
      .select('codigo_campo, nombre_campo, direccion, localidad, provincia, codigo_postal, lat, lng')
      .eq('codigo_campo', codigo).limit(1).maybeSingle()
    if (error) throw error
    const c = cRaw as { codigo_campo: string; nombre_campo: string | null; direccion: string | null; localidad: string | null; provincia: string | null; codigo_postal: string | null; lat: number | null; lng: number | null } | null
    if (!c) return null
    // Equipos que juegan allí como LOCAL, por nº de partidos (habituales primero). La vista solo aporta el orden
    // (codequipo + n_partidos); los atributos para pintarlos se leen de web_equipo, la MISMA fuente que el buscador.
    const { data: eqs, error: e2 } = await supabase.from('web_campo_equipo')
      .select('codequipo, n_partidos')
      .eq('codigo_campo', codigo).order('n_partidos', { ascending: false })
    if (e2) throw e2
    const orden = (eqs || []) as { codequipo: string; n_partidos: number }[]
    if (orden.length === 0) return null   // anti-thin: sin equipos, no hay página
    const codeqs = orden.map((o) => String(o.codequipo))
    const { data: metaEq } = await supabase.from('web_equipo')
      .select('codequipo, nombre, escudo, rama, nombre_comp, grupo_nombre, codtemporada, activo')
      .in('codequipo', codeqs)
    const metaMap = new Map<string, { nombre: string | null; escudo: string | null; rama: string | null; nombre_comp: string | null; grupo_nombre: string | null; codtemporada: number | string | null; activo: boolean | null }>(
      ((metaEq || []) as { codequipo: string }[]).map((m) => [String(m.codequipo), m as never]))
    const equipos: CampoEquipoRow[] = orden.map((o) => {
      const m = metaMap.get(String(o.codequipo))
      return {
        codequipo: String(o.codequipo),
        nombre: m?.nombre || '',
        escudo: m?.escudo ?? null,
        rama: m?.rama ?? null,
        nombre_comp: m?.nombre_comp ?? null,
        grupo_nombre: m?.grupo_nombre ?? null,
        codtemporada: m?.codtemporada != null ? String(m.codtemporada) : null,
        activo: m?.activo ?? null,
        nPartidos: o.n_partidos,
      }
    }).filter((e) => e.nombre)   // descarta cualquier codequipo sin fila en web_equipo (no debería ocurrir)
    if (equipos.length === 0) return null
    // ¿Tiene mapa estático generado? (manifiesto). Opcional: si la consulta fallara, la ficha se sirve sin mapa.
    // updated_at -> token de versión (epoch) para la URL del PNG: cambia si se re-genera tras mover el campo.
    const { data: mapaRow } = await supabase.from('web_campo_mapa').select('codigo_campo, updated_at').eq('codigo_campo', codigo).maybeSingle()
    const mr = mapaRow as { updated_at: string | null } | null
    const mapaVer = mr?.updated_at ? Date.parse(mr.updated_at) : NaN
    return {
      codigo: String(c.codigo_campo), nombre: c.nombre_campo || '',
      direccion: c.direccion ?? null, localidad: c.localidad ?? null, provincia: c.provincia ?? null, cp: c.codigo_postal ?? null,
      lat: c.lat ?? null, lng: c.lng ?? null,
      mapaUrl: mr ? mapaCampoUrl(codigo, Number.isFinite(mapaVer) ? mapaVer : null) : null,
      equipos,
    }
  }, ['getCampo', 'v1', codigo])
}
