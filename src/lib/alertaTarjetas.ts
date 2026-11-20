// Aviso disciplinario de la ficha de jugador. Lógica pura (sin Supabase) para poder testearla; las lecturas
// están en jugadorV2.ts (getAlertaActual, getSancionPendiente).

export type AlertaRow = {
  estado: string | null; codtemporada: number | null; jornada: number | null
  amarillas_ciclo: number | null; ciclo_umbral: number | null; dobles_amarillas: number | null
  rojas_directas: number | null; nombre_equipo: string | null
}

// Sanción de web_suspendidos (la jornada es la DEL HECHO, no la que se pierde).
export type SuspensionRow = { codgrupo: string; jornada: number; codequipo: string; motivo: string | null; equipo_eliminado: number | null }
// Partido del equipo en ese grupo (web_resultados).
export type PartidoEquipo = { codgrupo: string; jornada: number; codequipo_local: string | null; codequipo_visitante: string | null; goles_local: number | null; goles_visitante: number | null }

export type Aviso = { html: string; tarjeta: 'amarilla' | 'doble' | 'roja' }

// Motivo de web_suspendidos -> texto corto. Formatos vistos: «Roja Directa», «Doble Amarilla», «5ª Tarjeta
// Amarilla (Ciclo)», «3ª amarilla (ciclo 3) · …» (copa).
export function tipoSancion(motivo: string | null): { txt: string; tarjeta: Aviso['tarjeta'] } {
  const m = (motivo || '').toLowerCase()
  if (m.includes('roja')) return { txt: 'roja directa', tarjeta: 'roja' }
  if (m.includes('doble')) return { txt: 'doble amarilla', tarjeta: 'doble' }
  const n = m.match(/(\d+)\s*ª/)
  return { txt: `${n ? n[1] : '5'}ª amarilla`, tarjeta: 'amarilla' }
}

// Sanción SIN CUMPLIR: su equipo no ha jugado (partido con marcador) en ese grupo después de la jornada de la
// sanción. Un descanso no deja fila y un aplazado/suspendido no tiene marcador: ninguno la cumple. Las de
// «equipo eliminado» se cumplen en la próxima edición de la copa (otra temporada): no cuentan aquí. Si hay
// varias pendientes, la más reciente.
export function sancionPendiente(sanciones: SuspensionRow[], partidos: PartidoEquipo[]): SuspensionRow | null {
  const pend = sanciones.filter((s) => !s.equipo_eliminado && !partidos.some((p) =>
    p.codgrupo === s.codgrupo && p.jornada > s.jornada && p.goles_local != null && p.goles_visitante != null
    && (p.codequipo_local === s.codequipo || p.codequipo_visitante === s.codequipo)))
  return pend.sort((a, b) => b.jornada - a.jornada)[0] ?? null
}

// Texto humano del aviso. NUNCA muestra el código crudo (CICLO_COMPLETADO…). Orden:
// 1. Sancionado, solo con una sanción pendiente (las rojas/dobles de la temporada no salen aquí: ya están
//    en Totales). 2. Apercibido: a una amarilla de la sanción (estado del pipeline o el conteo del ciclo),
//    sin caducar por jornadas. 3. En ciclo. Ver DECISIONES (D23).
// `temporadas`: el aviso solo sale en la temporada EN CURSO. En una cerrada la sanción de la última jornada
// quedaría «pendiente» para siempre (su equipo ya no juega) y el apercibimiento no caduca: ninguno sale.
export function alertaHumana(a: AlertaRow | null, sancion: SuspensionRow | null | undefined,
  temporadas: { ficha: number | null; enCurso: number }): Aviso | null {
  if (temporadas.ficha == null || temporadas.ficha !== temporadas.enCurso) return null
  if (sancion) {
    const t = tipoSancion(sancion.motivo)
    return { html: `<b>Sancionado</b> — ${t.txt} · no juega el próximo partido`, tarjeta: t.tarjeta }
  }
  if (!a) return null
  const um = a.ciclo_umbral ?? 5
  const ac = a.amarillas_ciclo ?? 0
  if (a.estado === 'APERCIBIDO' || (um > 1 && ac === um - 1)) {
    const cuenta = ac > 0 && ac < um ? ` — ${ac} de ${um} amarillas` : ''
    return { html: `<b>Apercibido</b>${cuenta}. Una más y cumple sanción.`, tarjeta: 'amarilla' }
  }
  if (ac > 0 && ac < um) return { html: `<b>En ciclo</b> — ${ac} de ${um} amarillas.`, tarjeta: 'amarilla' }
  return null
}
