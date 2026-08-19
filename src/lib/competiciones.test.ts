import { describe, it, expect } from 'vitest'
import { faseCompeticion, ordenPorFechaOFase } from './competiciones'

// Orden cronológico INVERSO (lo más reciente primero), también DENTRO de la temporada: playoff → liga → copa.
describe('ordenPorFechaOFase — reciente primero dentro de la temporada', () => {
  const liga = (fini: string | null) => ({ fase: 1, fechaInicio: fini })
  const copa = (fini: string | null) => ({ fase: 0, fechaInicio: fini })
  const playoff = (fini: string | null) => ({ fase: 2, fechaInicio: fini })

  it('México T21 (2025-26): liga 2025-09-06 antes que Copa 2025-08-13', () => {
    const cards = [copa('2025-08-13'), liga('2025-09-06')]
    cards.sort(ordenPorFechaOFase)
    expect(cards.map((c) => c.fechaInicio)).toEqual(['2025-09-06', '2025-08-13'])
  })

  it('México T17 (2021-22): Play Off 2022-05-08 antes que liga 2021-09-04', () => {
    const cards = [liga('2021-09-04'), playoff('2022-05-08')]
    cards.sort(ordenPorFechaOFase)
    expect(cards.map((c) => c.fechaInicio)).toEqual(['2022-05-08', '2021-09-04'])
  })

  it('Móstoles URJC T19: Play Off 2024-05-19 → liga 2023-09-09 → Copa 2023-08-16', () => {
    const cards = [copa('2023-08-16'), liga('2023-09-09'), playoff('2024-05-19')]
    cards.sort(ordenPorFechaOFase)
    expect(cards.map((c) => c.fechaInicio)).toEqual(['2024-05-19', '2023-09-09', '2023-08-16'])
  })

  it('fallback a FASE descendente cuando falta fecha (playoff 2 → liga 1 → copa 0)', () => {
    const cards = [copa(null), liga(null), playoff(null)]
    cards.sort(ordenPorFechaOFase)
    expect(cards.map((c) => c.fase)).toEqual([2, 1, 0])
  })

  it('faseCompeticion: liga(nivel) 1, copa 0, playoff 2', () => {
    expect(faseCompeticion('3ª RFEF', 1)).toBe(1)
    expect(faseCompeticion('Copa RFEF Fase Autonómica', null)).toBe(0)
    expect(faseCompeticion('PLAY OFF TERCERA RFEF', null)).toBe(2)
  })
})
