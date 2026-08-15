// FUENTE ÚNICA de la "temporada viva", data-driven por competición. Sustituye a los cinco hardcodes
// anteriores (LIVE_COD ×2, LIVE_SEASON, y el .eq('codtemporada',21)+'2025-26' de los índices).
//
// Criterio: cada competición muestra la temporada más reciente con AL MENOS un partido jugado. La fuente es
// la vista `web_temporada_activa` (max codtemporada con resultado en web_resultados, por categoria+slug_comp).
// Encima se aplica una VENTANA [T_top-1, T_top] (T_top = la temporada más nueva con juego en cualquier
// competición) para: (a) no resucitar competiciones difuntas (última jugada hace años), y (b) que las que aún
// no han pasado a la temporada nueva no desaparezcan durante el arranque escalonado.
//
// Con todo en T21 hoy: T_top=21, ventana={21,20}, no hay ninguna competición en 20 -> se muestran solo las de
// 21 (idéntico al comportamiento actual). El comportamiento nuevo solo aparece cuando exista la primera fila
// T22 con partidos jugados.
//
// NOTA: getTemporadasActivas devuelve un ARRAY (serializable) para poder cachearlo con unstable_cache. Los
// derivados que son Map (mapaActivas) son funciones PURAS que se construyen fuera del cache (un Map cacheado
// se serializaría a {}).

import { supabase } from '@/lib/supabase'
import { cacheIndices } from '@/lib/cacheComp'
import { esViejaCopa } from '@/lib/competiciones'

export type TempActiva = { categoria: string; slug_comp: string; temporada_activa: number }

const CAT_BD: Record<string, string> = { aficionados: 'AFICIONADO', juveniles: 'JUVENIL' }

// Vista `web_temporada_activa` -> array. Cacheado (tag 'indices'; el pipeline lo revalida al cargar datos).
export async function getTemporadasActivas(): Promise<TempActiva[]> {
  return cacheIndices(async () => {
    const { data } = await supabase.from('web_temporada_activa').select('categoria, slug_comp, temporada_activa')
    return (data || []) as TempActiva[]
  }, ['web_temporada_activa'])
}

// T_top y suelo de la ventana. floor = T_top - 1 (las dos temporadas "actuales").
function ventana(activas: TempActiva[]): { tTop: number; floor: number } {
  const tTop = activas.reduce((m, a) => Math.max(m, a.temporada_activa), 0)
  return { tTop, floor: tTop - 1 }
}

// Temporadas de la ventana (para filtrar web_grupos con .in()). Como mucho dos valores: [T_top, T_top-1].
function temporadasVentana(activas: TempActiva[]): number[] {
  const { tTop, floor } = ventana(activas)
  return tTop ? [tTop, floor] : []
}

// PURA. Mapa `categoria|slug_comp` -> temporada_activa, SOLO dentro de la ventana (las difuntas fuera).
export function mapaActivas(activas: TempActiva[]): Map<string, number> {
  const { floor } = ventana(activas)
  const m = new Map<string, number>()
  for (const a of activas) if (a.temporada_activa >= floor) m.set(`${a.categoria}|${a.slug_comp}`, a.temporada_activa)
  return m
}

// PURA. Suelo vivo (badge activo/inactivo) = la temporada viva más ANTIGUA aún en curso (min activa dentro de
// la ventana). Un jugador/equipo es ACTIVO si su última temporada >= suelo. Con todo en T21 -> 21. Cuando una
// copa pase a T22 pero el resto siga en T21, el suelo se queda en 21 (no marca inactivos en falso); solo sube
// a 22 cuando TODAS han pasado. Se usa MIN, no MAX, a propósito: con MAX, en cuanto una copa pasara a T22
// todos los jugadores de T21 quedarían inactivos de golpe.
export function sueloVivo(activas: TempActiva[]): number {
  const { floor } = ventana(activas)
  const enVentana = activas.filter((a) => a.temporada_activa >= floor).map((a) => a.temporada_activa)
  return enVentana.length ? Math.min(...enVentana) : 0
}

// Async directo para el badge (jugador, equipo, buscador). getTemporadasActivas ya está cacheado.
export async function getSueloVivo(): Promise<number> {
  return sueloVivo(await getTemporadasActivas())
}

// Grupos a mostrar en el índice de una categoría: cada competición en SU temporada activa (dentro de la
// ventana), sin las páginas viejas de copa (familia canónica). Centralizado aquí para que home, aficionados y
// juveniles compartan la misma lógica (fuente única). Devuelve un array (serializable) -> cacheable.
export async function getGruposIndice(categoriaBD: 'AFICIONADO' | 'JUVENIL') {
  return cacheIndices(async () => {
    const activas = await getTemporadasActivas()
    const seasons = temporadasVentana(activas)
    if (!seasons.length) return [] as any[]
    const { data } = await supabase.from('web_grupos')
      .select('codtemporada, nombre_comp, nombre_grupo, codgrupo, categoria, jornada_actual, slug_comp, slug_grupo, tipo, rondas')
      .eq('categoria', categoriaBD).in('codtemporada', seasons).order('nombre_comp')
    const m = mapaActivas(activas)
    return (data || [])
      .filter((g: any) => m.get(`${categoriaBD}|${g.slug_comp}`) === g.codtemporada)
      .filter((g: any) => !esViejaCopa(g.slug_comp))
  }, ['getGruposIndice', categoriaBD])
}

// ¿La temporada `codtemporada` es la ACTIVA de esta competición (dentro de la ventana)? Para el badge "EN
// JUEGO" de la ficha de competición. Sustituye a `codtemporada === LIVE_COD`. Recibe la categoria de URL
// (aficionados|juveniles) y el slug_comp.
export async function esTemporadaActiva(categoriaUrl: string, slugComp: string, codtemporada: number): Promise<boolean> {
  const m = mapaActivas(await getTemporadasActivas())
  return m.get(`${CAT_BD[categoriaUrl] ?? categoriaUrl}|${slugComp}`) === codtemporada
}
