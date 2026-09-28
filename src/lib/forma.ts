import { claveFecha, claveFechaDesc } from '@/lib/fechaOrden'

// Lógica PURA del bloque de forma de la ficha de jugador (ventanas, orden cronológico, últimos partidos).
// Vive aparte de jugadorV2.ts a propósito: ese módulo instancia el cliente de Supabase al importarse, así que
// nada de lo que contiene se podía testear. Aquí no hay acceso a datos, solo cálculo.

export type Ventana = { label: string; media: number | null; pj: number; delta: number | null }

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
export const cronoAsc = (a: any, b: any) =>
  claveFecha(a.fecha_iso, a.fecha).localeCompare(claveFecha(b.fecha_iso, b.fecha))
  || ((a.jornada ?? 0) - (b.jornada ?? 0))
export const cronoDesc = (a: any, b: any) =>
  claveFechaDesc(b.fecha_iso, b.fecha).localeCompare(claveFechaDesc(a.fecha_iso, a.fecha))
  || ((b.jornada ?? 0) - (a.jornada ?? 0))

export function ventanasForma(partidos: any[]): Ventana[] {
  const jug = partidos.filter((p) => p.puntos != null).sort(cronoAsc)
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
export function ultimosDePartidos(partidos: any[], n = 3): any[] {
  return [...partidos].filter((p) => p.puntos != null).sort(cronoDesc).slice(0, n)
}
