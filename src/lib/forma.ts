import { claveFecha, claveFechaDesc } from '@/lib/fechaOrden'

// Lógica PURA del bloque de forma de la ficha de jugador (ventanas, orden cronológico, últimos partidos).
// Vive aparte de jugadorV2.ts a propósito: ese módulo instancia el cliente de Supabase al importarse, así que
// nada de lo que contiene se podía testear. Aquí no hay acceso a datos, solo cálculo.

export type Ventana = { label: string; media: number | null; pj: number; delta: number | null }

// FASE 1 DE LA BARANDILLA (2026-09-29). Lo que estos bloques necesitan de un partido, con dos decisiones
// deliberadas en el tipo:
//
//  · `fecha` es OBLIGATORIA. Son bloques CRONOLÓGICOS: una fila sin fecha no se puede colocar en la serie.
//    Antes la entrada era `any[]`, así que nada obligaba a traerla — y de ahí que tres funciones acabaran
//    ordenando por lo único que sí tenían a mano, la jornada.
//  · `jornadaEtiqueta` se llama así, y no `jornada`, para que ordenar por ella se lea MAL. Es el mismo truco
//    que funcionó con `fechaOrden`: `sort((a,b) => a.jornadaEtiqueta - b.jornadaEtiqueta)` no parece un
//    despiste, parece una decisión que hay que justificar. La jornada sigue valiendo para PINTAR ("J3") y
//    como DESEMPATE dentro del mismo día; lo que no vale es como criterio de orden.
export type PartidoCrono = {
  fecha: string | null
  fecha_iso?: string | null
  jornadaEtiqueta?: number | null
}

// Adaptador en el BORDE: las filas llegan de la BD con `jornada`. Se renombra aquí, una sola vez, para que
// dentro de estos bloques el nombre ya avise. No convierte nada más: el resto de campos viajan intactos.
export function aPartidoCrono<T extends { fecha?: unknown; fecha_iso?: unknown; jornada?: unknown }>(p: T) {
  return { ...p, fecha: (p.fecha as string | null) ?? null, jornadaEtiqueta: (p.jornada as number | null) ?? null }
}

// EL orden de una lista que mezcla competiciones. Tiene nombre propio para que un `.sort()` suelto al lado
// se lea como lo que sería: una excepción a la regla.
export const ordenCronologico = <T extends PartidoCrono>(ps: readonly T[]): T[] => [...ps].sort(cronoAsc)
export const ordenCronologicoInverso = <T extends PartidoCrono>(ps: readonly T[]): T[] => [...ps].sort(cronoDesc)

// CRONOLOGÍA, NO JORNADA. Estos bloques MEZCLAN competiciones (liga + copa + playoff del jugador en esa
// temporada), y en copa la jornada no ordena: la fase de grupos vale toda 1 y una final vale 1, 2, 6 u 8
// según la competición. Caso real que lo destapó (T22): 3 partidos de Copa RFEF con jornadas 1-2-3 jugados
// del 12 al 19 de AGOSTO y 4 de liga con jornadas 1-2-3-4 del 5 al 27 de SEPTIEMBRE -> por jornada se
// intercalan, así que "Últimas 5" promediaba cinco partidos que no eran los cinco últimos. No era un orden
// feo: era una media mal calculada.
// web_jugador_partidos NO tiene fecha_iso (3,5 M filas, todas DD/MM/AAAA), así que la conversión la hace
// claveFecha — la única implementación, con tests — y no un parser propio. Se le pasa `fecha_iso` igualmente
// para que se use sola el día que el pipeline la publique aquí también.
// La jornada queda como DESEMPATE: dos partidos el mismo día deben salir siempre en el mismo orden (el HTML
// de una ficha ISR no puede bailar entre regeneraciones).
export const cronoAsc = (a: PartidoCrono, b: PartidoCrono) =>
  claveFecha(a.fecha_iso, a.fecha).localeCompare(claveFecha(b.fecha_iso, b.fecha))
  || ((a.jornadaEtiqueta ?? 0) - (b.jornadaEtiqueta ?? 0))
export const cronoDesc = (a: PartidoCrono, b: PartidoCrono) =>
  claveFechaDesc(b.fecha_iso, b.fecha).localeCompare(claveFechaDesc(a.fecha_iso, a.fecha))
  || ((b.jornadaEtiqueta ?? 0) - (a.jornadaEtiqueta ?? 0))

export function ventanasForma<T extends PartidoCrono & { puntos?: number | null }>(partidos: readonly T[]): Ventana[] {
  const jug = ordenCronologico(partidos.filter((p) => p.puntos != null))
  const pts = jug.map((p) => p.puntos as number)
  const media = (arr: number[]) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null)
  const mTemp = media(pts)
  const win = (n: number) => {
    const s = pts.slice(-n)
    const m = media(s)
    return { media: m, pj: s.length, delta: m != null && mTemp != null ? m - mTemp : null }
  }
  const w5 = win(5), w10 = win(10)
  return [
    { label: 'Últimas 5', ...w5 },
    { label: 'Últimas 10', ...w10 },
    { label: 'Temporada', media: mTemp, pj: pts.length, delta: null },
  ]
}

// --- Últimos 3 partidos jugados de la temporada (más reciente primero) ---
export function ultimosDePartidos<T extends PartidoCrono & { puntos?: number | null }>(partidos: readonly T[], n = 3): T[] {
  return ordenCronologicoInverso(partidos.filter((p) => p.puntos != null)).slice(0, n)
}
