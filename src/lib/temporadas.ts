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

// FLAG **ACTIVO** — el índice abre cada competición en su temporada más reciente con CALENDARIO publicado
// (web_grupos), aunque no haya jugado ninguna jornada. (Hasta que se activó, abría en la última temporada con
// ≥1 partido jugado, vía web_temporada_activa; ese es el camino de más abajo, hoy inalcanzable.)
// AVISO QUE SIGUE EN PIE: defaultear ~100 competiciones a una temporada en frío castiga a la BD (ver
// AUDITORIA_CONSUMO_VERCEL.md; hubo un 500 por statement timeout). Si se vuelve a ver, pre-calentar acotado.
// OJO: este comentario decía "FLAG (OFF) — NO ACTIVAR" con la constante ya en true; corregido 2026-09-25.
// ALCANCE deliberadamente ACOTADO a getGruposIndice: NO toca getTemporadasActivas, así que el suelo
// activo/inactivo (sueloVivo) y el badge "En juego" (esTemporadaActiva) NO cambian; y la pastilla sigue siendo
// "Por comenzar" porque la decide tienePartidosJugados, no esto.
const ABRIR_TEMPORADA_CON_CALENDARIO = true

// Vista `web_temporada_activa` -> array. Cacheado (tag 'indices'; el pipeline lo revalida al cargar datos).
export async function getTemporadasActivas(): Promise<TempActiva[]> {
  return cacheIndices(async () => {
    const { data, error } = await supabase.from('web_temporada_activa').select('categoria, slug_comp, temporada_activa')
    // REGLA: el build NO debe depender del estado de la BD. Si la consulta falla o viene vacía (BD saturada,
    // p.ej. un export corriendo a la vez), LANZAMOS en vez de devolver []. Un [] aquí vaciaría los índices de
    // navegación y —peor— se cachearía (unstable_cache) -> índice fantasma servido a usuarios. Lanzar NO se
    // cachea (unstable_cache no guarda rechazos) y hace el fallo VISIBLE (el build cae / ISR mantiene la última
    // versión buena) en vez de publicar una página que parece correcta y no lo es.
    if (error) throw new Error(`[indices] web_temporada_activa: ${error.message || 'error sin mensaje'}`)
    if (!data || data.length === 0) throw new Error('[indices] web_temporada_activa devolvió 0 filas (¿BD saturada?)')
    return data as TempActiva[]
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
    // CAMINO EN USO (el flag está en true): cada competición en su temporada más reciente con grupo publicado
    // (calendario), aunque 0 jugado. No depende de web_temporada_activa ni de sueloVivo -> acotado al índice.
    if (ABRIR_TEMPORADA_CON_CALENDARIO) {
      const { data, error } = await supabase.from('web_grupos')
        .select('codtemporada, nombre_comp, nombre_grupo, codgrupo, categoria, jornada_actual, slug_comp, slug_grupo, tipo, rondas')
        .eq('categoria', categoriaBD).order('nombre_comp')
      if (error) throw new Error(`[indices] web_grupos (${categoriaBD}): ${error.message || 'error sin mensaje'}`)
      if (!data || data.length === 0) throw new Error(`[indices] web_grupos (${categoriaBD}) devolvió 0 filas (¿BD saturada?)`)
      // max(codtemporada) por competición, ignorando las páginas viejas de copa.
      // LA CLAVE ES `nombre_comp`, NO `slug_comp` (arreglo 2026-09-25). Tiene que ser LA MISMA con la que
      // agrupa quien consume esto (la home agrupa por nombre_comp, page.tsx), o una competición cuyo slug
      // cambió aparece DOS VECES en la misma tarjeta.
      // Qué pasaba: en el rebrand de 2023-24 los slugs se corrieron un puesto — 2ª Aficionados pasó de
      // `tercera` a `segunda`, 1ª Aficionados de `segunda` a `primera`, Preferente de `primera` a
      // `preferente`, 1ª Autonómica de `preferente` a `primera-autonomica` —. Al deduplicar por slug, cada
      // slug reutilizado quedaba con max=T22 y sus filas viejas perdían... salvo `tercera`, que nadie
      // heredó: se quedaba con max=T19 (2023-24) y sus 20 grupos sobrevivían. De ahí las dos pastillas por
      // grupo en 2ª Aficionados (J1 de T22 + J30 de T19; J26 en el grupo 12, y nada en los grupos 21-22,
      // que en 2023-24 no existían). Solo fallaba la ÚLTIMA de la cadena de renombrados.
      const maxPorComp = new Map<string, number>()
      for (const g of data as any[]) {
        if (!g.slug_comp || esViejaCopa(g.slug_comp)) continue
        const c = Number(g.codtemporada)
        if (!maxPorComp.has(g.nombre_comp) || c > (maxPorComp.get(g.nombre_comp) as number)) maxPorComp.set(g.nombre_comp, c)
      }
      const res = (data as any[]).filter((g) => g.slug_comp && !esViejaCopa(g.slug_comp)
        && Number(g.codtemporada) === maxPorComp.get(g.nombre_comp))
      if (res.length === 0) throw new Error(`[indices] web_grupos (${categoriaBD}) quedó vacío tras seleccionar por calendario`)
      return res
    }

    // CAMINO ANTIGUO (solo si el flag vuelve a false): la última temporada con ≥1 partido jugado.
    const activas = await getTemporadasActivas()   // lanza si la BD no responde (y no cachea vacío)
    const seasons = temporadasVentana(activas)
    if (!seasons.length) throw new Error('[indices] getGruposIndice: sin temporadas en ventana (web_temporada_activa vacío)')
    const { data, error } = await supabase.from('web_grupos')
      .select('codtemporada, nombre_comp, nombre_grupo, codgrupo, categoria, jornada_actual, slug_comp, slug_grupo, tipo, rondas')
      .eq('categoria', categoriaBD).in('codtemporada', seasons).order('nombre_comp')
    // Mismo principio que getTemporadasActivas: nunca publicar un índice de competiciones vacío por un timeout.
    // Es la navegación principal del sitio; mejor un fallo visible (build cae / ISR sirve la versión buena) que
    // una home/categoría sin enlaces que parece correcta. El throw no se cachea (no envenena la caché 'indices').
    if (error) throw new Error(`[indices] web_grupos (${categoriaBD}): ${error.message || 'error sin mensaje'}`)
    if (!data || data.length === 0) throw new Error(`[indices] web_grupos (${categoriaBD}) devolvió 0 filas (¿BD saturada?)`)
    const m = mapaActivas(activas)
    const res = data
      .filter((g: any) => m.get(`${categoriaBD}|${g.slug_comp}`) === g.codtemporada)
      .filter((g: any) => !esViejaCopa(g.slug_comp))
    if (res.length === 0) throw new Error(`[indices] web_grupos (${categoriaBD}) quedó vacío tras filtrar por temporada activa (dato inconsistente)`)
    return res
  // La clave es MANUAL (este getter no usa hashCols: el select no cambia, cambia la lógica de filtrado),
  // así que el token 'v2-nombre' es obligatorio: sin bumpearlo la home seguiría sirviendo el índice
  // cacheado con las pastillas duplicadas.
  }, ['getGruposIndice', 'v2-nombre', ABRIR_TEMPORADA_CON_CALENDARIO ? 'cal' : 'jugado', categoriaBD])
}

// ¿La temporada `codtemporada` es la ACTIVA de esta competición (dentro de la ventana)? Para el badge "EN
// JUEGO" de la ficha de competición. Sustituye a `codtemporada === LIVE_COD`. Recibe la categoria de URL
// (aficionados|juveniles) y el slug_comp.
export async function esTemporadaActiva(categoriaUrl: string, slugComp: string, codtemporada: number): Promise<boolean> {
  const m = mapaActivas(await getTemporadasActivas())
  return m.get(`${CAT_BD[categoriaUrl] ?? categoriaUrl}|${slugComp}`) === codtemporada
}
