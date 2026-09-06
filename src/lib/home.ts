// Digest de la HOME. El pipeline lo publica precalculado (ver PETICION_PIPELINE_HOME_DIGEST.md), así que la
// home hace pocas lecturas diminutas — nada de agregar ~100 grupos en cada regeneración (la operación que
// tumbó la BD). Dos bloques en la MISMA tabla `web_home_lideres` (columna `bloque`) + cifras en `web_home_cifras`.
// El enlace de cada competición (a su ficha grupo) se arma web-side con un lookup acotado a los ~13 codgrupos
// del digest en `web_grupos` (slug_comp/slug_grupo/categoria/jornada) — barato.
import { supabase } from '@/lib/supabase'
import { codToSlug } from '@/lib/temporadaSlug'

// El "líder" en la forma que espera Panorama (LidCard lee nombre_equipo/escudo/codjugador/nombre + la métrica),
// más la competición enlazada (nombre_comp/grupo_nombre/href) para pintarla bajo el líder.
type LidJ = {
  codjugador: string; nombre: string; nombre_equipo: string | null; escudo: string | null
  nombre_comp: string | null; grupo_nombre: string | null; href: string | null; [k: string]: unknown
} | null

export type HomeCatLider = {
  tipo: string; orden: number | null; categoria_rama: string | null; nombre_comp: string | null
  grupo_nombre: string | null; codgrupo: string | null; href: string | null
  codjugador: string; nombre: string; equipo_nombre: string | null; escudo: string | null; valor: number | null
}
export type HomeMetricas = { goleador: LidJ; portero: LidJ; pf: LidJ; mediaPf: LidJ; elo: LidJ; tarjetas: LidJ }
export type HomeCifras = {
  partidos_disputados: number; partidos_totales: number; goles: number; media_goles: number | null
  pct_local: number; pct_empate: number; pct_visitante: number; amarillas: number; dobles: number; rojas: number
  // Enganche: aparecen cuando el pipeline las publique en web_home_cifras (select('*') ya las trae). Hoy null.
  equipos?: number | null; elo_medio?: number | null; porterias_cero?: number | null
} | null

export async function getHomeDigest(): Promise<{
  categorias: HomeCatLider[]; metricas: HomeMetricas; cifras: HomeCifras; codtemporada: number | null
}> {
  const [lid, cif] = await Promise.all([
    supabase.from('web_home_lideres')
      .select('bloque, tipo, orden, categoria_rama, nombre_comp, grupo_nombre, codgrupo, codjugador, nombre, equipo_nombre, escudo, valor, codtemporada'),
    supabase.from('web_home_cifras').select('*').limit(1).maybeSingle(),
  ])
  const rows = (lid.data || []) as any[]
  const codtemporada = (rows[0]?.codtemporada ?? null) as number | null
  const tempSlug = codtemporada != null ? codToSlug(codtemporada) : null

  // Enlace de cada competición a su ficha de grupo. Lookup acotado a los codgrupos del digest.
  const codgrupos = Array.from(new Set(rows.map((r) => r.codgrupo).filter(Boolean))) as string[]
  const hrefByGrupo = new Map<string, string>()
  if (codgrupos.length && tempSlug) {
    const { data: g } = await supabase.from('web_grupos')
      .select('codgrupo, categoria, slug_comp, slug_grupo, jornada_actual').in('codgrupo', codgrupos)
    for (const x of (g || []) as any[]) {
      const rama = x.categoria === 'JUVENIL' ? 'juveniles' : 'aficionados'
      hrefByGrupo.set(String(x.codgrupo), `/madrid/${rama}/${x.slug_comp}/${x.slug_grupo}/${tempSlug}/jornada-${x.jornada_actual || 1}/clasificacion`)
    }
  }
  const hrefDe = (codgrupo: string | null) => (codgrupo ? hrefByGrupo.get(String(codgrupo)) ?? null : null)

  // Bloque de categorías: una por nivel, ordenada por `orden` (rama-relativo: afic 1-5, juvenil 101-105).
  // Solo se PINTA la categoría que ya tiene líder: una competición de la temporada activa que aún no ha
  // arrancado (0 jornadas) no aporta "Mejor PF" -> no se pinta, y su tarjeta aparece sola cuando el pipeline
  // publique su líder (con la primera jornada). No dejamos placeholder. Los 6 líderes por métrica (bloque B)
  // sí se completan con lo que haya. (Contrato documentado en PETICION_PIPELINE_HOME_DIGEST.md.)
  const categorias = rows
    .filter((r) => r.bloque === 'categoria' && r.codjugador)
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0))
    .map((r) => ({ ...r, href: hrefDe(r.codgrupo) })) as HomeCatLider[]

  // Bloque de métricas: 6 filas -> forma de Panorama (cada métrica en la propiedad que su LidCard lee) +
  // la competición enlazada.
  const m = new Map(rows.filter((r) => r.bloque === 'metrica').map((r) => [String(r.tipo), r]))
  const asJ = (r: any, key: string): LidJ =>
    r ? {
      codjugador: String(r.codjugador), nombre: r.nombre, nombre_equipo: r.equipo_nombre, escudo: r.escudo,
      nombre_comp: r.nombre_comp ?? null, grupo_nombre: r.grupo_nombre ?? null, href: hrefDe(r.codgrupo),
      [key]: r.valor,
    } : null
  const metricas: HomeMetricas = {
    goleador: asJ(m.get('goleador'), 'goles'),
    portero: asJ(m.get('portero'), 'goles'),
    pf: asJ(m.get('pf'), 'pts_fantasy'),
    mediaPf: asJ(m.get('media_pf'), 'media_fantasy'),
    elo: asJ(m.get('elo'), 'elo'),
    tarjetas: asJ(m.get('tarjetas'), 'amarillas'),
  }
  return { categorias, metricas, cifras: (cif.data ?? null) as HomeCifras, codtemporada }
}
