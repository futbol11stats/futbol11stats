import { describe, it, expect } from 'vitest'
import { etapaDelElo, percentilDelElo } from '@/lib/eloEtapa'

const et = (o: Partial<Parameters<typeof percentilDelElo>[0] & object> & { id: string }) => ({
  elo_final: null, elo_percentil_temp: null, fecha_fin: null, nombre_comp: null, categoria_nivel: 1, ...o,
})

// El Nivel pinta un ELO y un percentil: los dos tienen que salir de la misma etapa.
describe('ELO y percentil de la misma etapa', () => {
  const liga = et({ id: 'liga', elo_final: 885, elo_percentil_temp: 71.6, fecha_fin: '2026-11-02', nombre_comp: 'Preferente' })
  const copa = et({ id: 'copa', elo_final: 870, elo_percentil_temp: 40.2, fecha_fin: '2026-10-15', nombre_comp: 'Copa', categoria_nivel: null })
  const cero = et({ id: 'cero', fecha_fin: '2026-11-08', nombre_comp: '1ª Autonómica' })   // 0 PJ: sin ELO ni percentil

  it('el percentil es el de la etapa que aporta el ELO, con su competición', () => {
    const e = etapaDelElo([copa, cero, liga])!
    expect(e.id).toBe('liga')
    expect(percentilDelElo(e)).toEqual({ pct: 71, nombreComp: 'Preferente' })
  })
  it('una etapa posterior sin ELO (0 PJ) no se lleva ni el ELO ni el percentil', () => {
    expect(etapaDelElo([cero, liga])!.id).toBe('liga')
  })
  it('tope 99 y sin percentil cuando la etapa no tiene ELO', () => {
    expect(percentilDelElo(et({ id: 'x', elo_final: 1500, elo_percentil_temp: 99.8 })).pct).toBe(99)
    expect(percentilDelElo(et({ id: 'y', elo_percentil_temp: 50 })).pct).toBeNull()
    expect(percentilDelElo(undefined).pct).toBeNull()
  })
})
