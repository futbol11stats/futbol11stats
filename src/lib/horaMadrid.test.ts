import { describe, it, expect } from 'vitest'
import { isoMadrid, masMinutos } from './horaMadrid'

// La zona es la mitad del arreglo: un startDate sin desplazamiento lo lee Google como UTC y publica el
// partido una o dos horas mas tarde segun la epoca del anio.
describe('isoMadrid', () => {
  it('invierno = +01:00', () => {
    expect(isoMadrid('13/12/2025', '16:00')).toBe('2025-12-13T16:00:00+01:00')
  })

  it('verano = +02:00', () => {
    expect(isoMadrid('07/09/2025', '12:00')).toBe('2025-09-07T12:00:00+02:00')
  })

  it('los dos cortes de 2026: ultimo domingo de marzo (29) y de octubre (25)', () => {
    expect(isoMadrid('28/03/2026', '18:00')).toBe('2026-03-28T18:00:00+01:00')
    expect(isoMadrid('29/03/2026', '18:00')).toBe('2026-03-29T18:00:00+02:00')
    expect(isoMadrid('24/10/2026', '18:00')).toBe('2026-10-24T18:00:00+02:00')
    expect(isoMadrid('25/10/2026', '18:00')).toBe('2026-10-25T18:00:00+01:00')
  })

  it('sin hora, con 00:00 (= horario sin confirmar en la RFFM) o con basura -> null', () => {
    expect(isoMadrid('13/12/2025', null)).toBeNull()
    expect(isoMadrid('13/12/2025', '00:00')).toBeNull()
    expect(isoMadrid(null, '16:00')).toBeNull()
    expect(isoMadrid('2025-12-13', '16:00')).toBeNull()
    expect(isoMadrid('13/12/2025', '25:00')).toBeNull()
  })
})

describe('masMinutos', () => {
  it('suma los 120 minutos del partido', () => {
    expect(masMinutos('2025-12-13T16:00:00+01:00', 120)).toBe('2025-12-13T18:00:00+01:00')
  })

  it('cruza la medianoche sin perder el dia', () => {
    expect(masMinutos('2025-12-13T23:00:00+01:00', 120)).toBe('2025-12-14T01:00:00+01:00')
  })

  it('un partido que empieza antes del cambio de hora y acaba despues cambia de offset', () => {
    // 25/10/2026 02:30 CEST (+02:00) + 120 min -> 03:30 CET (+01:00): el mismo instante, otra etiqueta.
    expect(masMinutos('2026-10-25T02:30:00+02:00', 120)).toBe('2026-10-25T03:30:00+01:00')
  })

  it('iso invalido -> null, nunca una fecha inventada', () => {
    expect(masMinutos('maniana', 120)).toBeNull()
  })
})
