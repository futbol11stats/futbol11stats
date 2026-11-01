import type { PartidoMini } from '@/lib/partido'
import { claveFecha, claveFechaHora, FECHA_AL_FINAL } from '@/lib/fechaOrden'

// Ficha de PARTIDO: rachas, forma y Cara a cara se cuentan HASTA EL MOMENTO DEL PARTIDO, no hasta hoy. Antes el
// historial era el de hoy menos el propio partido, así que la ficha de un partido de septiembre enseñaba como
// "cómo llegaban" rachas y últimos partidos jugados DESPUÉS (decisión 2026-11-01).

// Partidos ANTERIORES al partido `ref`, en el orden recibido (DESC). Fuera: el propio partido, los provisionales
// (no computan) y lo que no se puede situar antes con certeza: sin fecha, o del MISMO día sin hora en alguno de los
// dos (un equipo con dos partidos el mismo día: 6 casos medidos en web_resultados).
export function anterioresAl(hist: PartidoMini[], ref: { codacta: string; fecha: string | null; hora: string | null }): PartidoMini[] {
  const dRef = claveFecha(null, ref.fecha)
  if (dRef === FECHA_AL_FINAL) return []
  const kRef = claveFechaHora(null, ref.fecha, ref.hora)
  return hist.filter((m) => {
    if (m.codacta === ref.codacta || m.provisional) return false
    const d = claveFecha(null, m.fecha)
    if (d === FECHA_AL_FINAL) return false
    if (d !== dRef) return d < dRef
    const k = claveFechaHora(null, m.fecha, m.hora)
    return !k.endsWith('~') && !kRef.endsWith('~') && k < kRef
  })
}

// Rachas del equipo `cod` sobre su historial (DESC): actual (desde el más reciente) + récord (racha máxima), para
// "marcando" (marcó ≥1), "victorias" y "invicto" (no perdió). Todas las competiciones — es "la racha del equipo".
export type Rachas = { marcandoAct: number; marcandoRec: number; victoriasAct: number; victoriasRec: number; invictoAct: number; invictoRec: number }
export function rachasDe(cod: string, hist: PartidoMini[]): Rachas {
  const flags = hist.filter((m) => m.golesLocal != null && m.golesVisitante != null).map((m) => {
    const esLocal = m.codLocal === cod
    const gf = esLocal ? (m.golesLocal as number) : (m.golesVisitante as number)
    const gc = esLocal ? (m.golesVisitante as number) : (m.golesLocal as number)
    return { marco: gf > 0, gano: gf > gc, invicto: gf >= gc }
  })
  const actual = (k: 'marco' | 'gano' | 'invicto') => { let n = 0; for (const f of flags) { if (f[k]) n++; else break } return n }
  const record = (k: 'marco' | 'gano' | 'invicto') => { let mx = 0, c = 0; for (const f of flags) { if (f[k]) { c++; if (c > mx) mx = c } else c = 0 } return mx }
  return { marcandoAct: actual('marco'), marcandoRec: record('marco'), victoriasAct: actual('gano'), victoriasRec: record('gano'), invictoAct: actual('invicto'), invictoRec: record('invicto') }
}

// "Tras el partido": racha antes -> después, por concepto. Después = historial anterior + el propio partido.
// Récord: 'bate' si supera el récord de ANTES del partido, 'iguala' si lo alcanza (y es > 0), null si no.
export type RachaTras = { antes: number; despues: number; record: 'iguala' | 'bate' | null }
export type RachasTras = { marcando: RachaTras; victorias: RachaTras; invicto: RachaTras }
export function rachasTras(cod: string, anteriores: PartidoMini[], partido: PartidoMini): RachasTras {
  const pre = rachasDe(cod, anteriores)
  const post = rachasDe(cod, [partido, ...anteriores])
  const uno = (antes: number, rec: number, despues: number): RachaTras =>
    ({ antes, despues, record: despues > 0 && despues > rec ? 'bate' : despues > 0 && despues === rec ? 'iguala' : null })
  return {
    marcando: uno(pre.marcandoAct, pre.marcandoRec, post.marcandoAct),
    victorias: uno(pre.victoriasAct, pre.victoriasRec, post.victoriasAct),
    invicto: uno(pre.invictoAct, pre.invictoRec, post.invictoAct),
  }
}
