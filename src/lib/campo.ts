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

export type CampoEquipoRow = { codequipo: string; nombre: string; nombre_comp: string | null; rama: string | null; nPartidos: number }
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
    // Equipos que juegan allí como LOCAL, por nº de partidos (habituales primero).
    const { data: eqs, error: e2 } = await supabase.from('web_campo_equipo')
      .select('codequipo, nombre_equipo, nombre_comp, rama, n_partidos')
      .eq('codigo_campo', codigo).order('n_partidos', { ascending: false })
    if (e2) throw e2
    const equipos: CampoEquipoRow[] = ((eqs || []) as { codequipo: string; nombre_equipo: string | null; nombre_comp: string | null; rama: string | null; n_partidos: number }[])
      .map((e) => ({ codequipo: String(e.codequipo), nombre: e.nombre_equipo || '', nombre_comp: e.nombre_comp ?? null, rama: e.rama ?? null, nPartidos: e.n_partidos }))
    if (equipos.length === 0) return null   // anti-thin: sin equipos, no hay página
    // ¿Tiene mapa estático generado? (manifiesto). Opcional: si la consulta fallara, la ficha se sirve sin mapa.
    const { data: mapaRow } = await supabase.from('web_campo_mapa').select('codigo_campo').eq('codigo_campo', codigo).maybeSingle()
    return {
      codigo: String(c.codigo_campo), nombre: c.nombre_campo || '',
      direccion: c.direccion ?? null, localidad: c.localidad ?? null, provincia: c.provincia ?? null, cp: c.codigo_postal ?? null,
      lat: c.lat ?? null, lng: c.lng ?? null,
      mapaUrl: mapaRow ? mapaCampoUrl(codigo) : null,
      equipos,
    }
  }, ['getCampo', 'v1', codigo])
}
