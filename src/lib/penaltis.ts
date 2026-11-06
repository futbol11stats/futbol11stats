// Tanda de penaltis de copa/playoff (web_resultados.penaltis_local/penaltis_visitante; NULL si no hubo tanda).
// Solo se enseña cuando el partido acabó en EMPATE y no hay resolución posterior: si hay motivo_estado (p. ej.
// acta 5562583: 1-1 con tanda 3-5 y luego 3-0 del Juez Único) manda el marcador resuelto y la tanda se calla.
// Es solo una nota bajo el marcador: rachas y chips V/E/D siguen leyendo el partido como empate.
export type Tanda = { local: number; visitante: number; pasa: 'local' | 'visitante' }

export function tandaPenaltis(r: {
  goles_local: number | null; goles_visitante: number | null
  penaltis_local?: number | null; penaltis_visitante?: number | null
  motivo_estado?: string | null; incidencia?: string | null; estado_partido?: string | null
}): Tanda | null {
  const { goles_local: gL, goles_visitante: gV, penaltis_local: pL, penaltis_visitante: pV } = r
  if (gL == null || gV == null || gL !== gV) return null
  if (pL == null || pV == null || pL === pV) return null
  if ((r.motivo_estado ?? '').trim() !== '' || r.incidencia || r.estado_partido === 'suspendido') return null
  return { local: pL, visitante: pV, pasa: pL > pV ? 'local' : 'visitante' }
}
