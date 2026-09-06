// Digest de la HOME. El pipeline lo publica precalculado (ver PETICION_PIPELINE_HOME_DIGEST.md), así que la
// home hace SOLO DOS lecturas diminutas — nada de agregar ~100 grupos en cada regeneración (la operación que
// tumbó la BD). Dos bloques en la MISMA tabla `web_home_lideres` (columna `bloque`) + cifras en `web_home_cifras`.
import { supabase } from '@/lib/supabase'

// El "líder" en la forma que espera Panorama (LidCard lee nombre_equipo/escudo/codjugador/nombre + la métrica).
type LidJ = { codjugador: string; nombre: string; nombre_equipo: string | null; escudo: string | null; [k: string]: unknown } | null

export type HomeCatLider = {
  tipo: string; orden: number | null; nombre_comp: string | null; grupo_nombre: string | null; codgrupo: string | null
  codjugador: string; nombre: string; equipo_nombre: string | null; escudo: string | null; valor: number | null
}
export type HomeMetricas = { goleador: LidJ; portero: LidJ; pf: LidJ; mediaPf: LidJ; elo: LidJ; tarjetas: LidJ }
export type HomeCifras = {
  partidos_disputados: number; partidos_totales: number; goles: number; media_goles: number | null
  pct_local: number; pct_empate: number; pct_visitante: number; amarillas: number; dobles: number; rojas: number
} | null

export async function getHomeDigest(): Promise<{
  categorias: HomeCatLider[]; metricas: HomeMetricas; cifras: HomeCifras; codtemporada: number | null
}> {
  const [lid, cif] = await Promise.all([
    supabase.from('web_home_lideres')
      .select('bloque, tipo, orden, nombre_comp, grupo_nombre, codgrupo, codjugador, nombre, equipo_nombre, escudo, valor, codtemporada'),
    supabase.from('web_home_cifras').select('*').limit(1).maybeSingle(),
  ])
  const rows = (lid.data || []) as any[]
  // Bloque de categorías: una por nivel, ordenada por `orden` (rama-relativo: afic 1-5, juvenil 101-105).
  const categorias = rows
    .filter((r) => r.bloque === 'categoria')
    .sort((a, b) => (a.orden ?? 0) - (b.orden ?? 0)) as HomeCatLider[]
  // Bloque de métricas: 6 filas -> forma de Panorama (cada métrica en la propiedad que su LidCard lee).
  const m = new Map(rows.filter((r) => r.bloque === 'metrica').map((r) => [String(r.tipo), r]))
  const asJ = (r: any, key: string): LidJ =>
    r ? { codjugador: String(r.codjugador), nombre: r.nombre, nombre_equipo: r.equipo_nombre, escudo: r.escudo, [key]: r.valor } : null
  const metricas: HomeMetricas = {
    goleador: asJ(m.get('goleador'), 'goles'),
    portero: asJ(m.get('portero'), 'goles'),
    pf: asJ(m.get('pf'), 'pts_fantasy'),
    mediaPf: asJ(m.get('media_pf'), 'media_fantasy'),
    elo: asJ(m.get('elo'), 'elo'),
    tarjetas: asJ(m.get('tarjetas'), 'amarillas'),
  }
  const codtemporada = (rows[0]?.codtemporada ?? null) as number | null
  return { categorias, metricas, cifras: (cif.data ?? null) as HomeCifras, codtemporada }
}
