import { faseCompeticion, ordenPorFechaOFase } from '@/lib/competiciones'

type EtapaElo = {
  elo_final: number | null; elo_percentil_temp: number | null
  fecha_fin: string | null; nombre_comp: string | null; categoria_nivel: number | null
}

// Etapa que aporta el ELO de la temporada: la que TERMINÓ más tarde (fecha_fin; fase playoff>liga>copa como
// respaldo) entre las que tienen elo_final. Sin ninguna con ELO, la última de todas (comportamiento previo).
export function etapaDelElo<T extends EtapaElo>(etapas: T[]): T | undefined {
  if (!etapas.length) return undefined
  const conElo = etapas.filter((c) => c.elo_final != null)
  return [...(conElo.length ? conElo : etapas)].sort((a, b) => ordenPorFechaOFase(
    { fechaOrden: a.fecha_fin, fase: faseCompeticion(a.nombre_comp, a.categoria_nivel) },
    { fechaOrden: b.fecha_fin, fase: faseCompeticion(b.nombre_comp, b.categoria_nivel) }))[0]
}

// Percentil del ELO mostrado: de la MISMA etapa que el ELO (floor, tope 99), con su competición para la frase.
// Si el ELO no sale de una etapa (sin etapas, o sin elo_final) no hay percentil que casar con él.
export function percentilDelElo(etapa: EtapaElo | undefined): { pct: number | null; nombreComp: string | null } {
  if (etapa?.elo_final == null || etapa.elo_percentil_temp == null) return { pct: null, nombreComp: etapa?.nombre_comp ?? null }
  return { pct: Math.min(99, Math.floor(etapa.elo_percentil_temp)), nombreComp: etapa.nombre_comp }
}
