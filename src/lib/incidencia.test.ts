import { describe, it, expect } from 'vitest'
import { parseIncidencia, ladoNoDisputado, NO_DISPUTADO } from '@/lib/rotulos'
import { sportsEventLd } from '@/lib/jsonld'
import { tandaPenaltis } from '@/lib/penaltis'

// web_resultados.incidencia admite 'administrativo' (regla 2.5: 3-0/0-3 sin ningún gol, tarjeta ni cambio): no
// disputado SIN saber qué equipo no lo disputó. Mismo trato que los demás no disputados, sin señalar a nadie.
describe("incidencia 'administrativo'", () => {
  it('se reconoce como no disputado (antes la lista de 3 valores la convertía en NULL = jugado)', () => {
    expect(parseIncidencia('administrativo')).toBe('administrativo')
    for (const v of ['local', 'visitante', 'ambos'] as const) expect(parseIncidencia(v)).toBe(v)
    expect(parseIncidencia(null)).toBeNull()
    expect(parseIncidencia('otra-cosa')).toBeNull()
  })
  it('no señala a ningún equipo; los demás valores siguen igual', () => {
    expect(ladoNoDisputado('administrativo', 'Local CF', 'Visitante CF')).toBe('')
    expect(ladoNoDisputado('local', 'Local CF', 'Visitante CF')).toBe('Local CF no lo disputó')
    expect(ladoNoDisputado('visitante', 'Local CF', 'Visitante CF')).toBe('Visitante CF no lo disputó')
    expect(ladoNoDisputado('ambos', 'Local CF', 'Visitante CF')).toBe('Ninguno de los dos equipos lo disputó')
    expect(ladoNoDisputado(null, 'Local CF', 'Visitante CF')).toBe('')
  })
  it('mismo rótulo que el resto de no disputados', () => {
    expect(NO_DISPUTADO).toBe('No disputado · resultado administrativo')
  })
  it('sin evento en el marcado (SportsEvent fuera), como cualquier no disputado', () => {
    const ev = {
      local: 'Local CF', visitante: 'Visitante CF', golesLocal: 3, golesVisitante: 0,
      startDate: '2026-10-17T13:30:00+02:00', campo: 'Campo Municipal', url: 'https://www.futbol11stats.com/madrid/partido/1',
    }
    expect(sportsEventLd(ev)).not.toBeNull()   // control: el mismo partido sin incidencia sí es evento
    expect(sportsEventLd({ ...ev, incidencia: 'administrativo' })).toBeNull()
  })
  it('tampoco enseña tanda de penaltis', () => {
    expect(tandaPenaltis({ goles_local: 1, goles_visitante: 1, penaltis_local: 4, penaltis_visitante: 2, incidencia: 'administrativo' })).toBeNull()
  })
})
