import { describe, it, expect } from 'vitest'
import { tandaPenaltis } from '@/lib/penaltis'

const base = { goles_local: 1, goles_visitante: 1, penaltis_local: 4, penaltis_visitante: 2, motivo_estado: null }

describe('tandaPenaltis', () => {
  it('empate con tanda: cifras de cada lado y quién pasa', () => {
    expect(tandaPenaltis(base)).toEqual({ local: 4, visitante: 2, pasa: 'local' })
    expect(tandaPenaltis({ ...base, penaltis_local: 3, penaltis_visitante: 5 })?.pasa).toBe('visitante')
  })
  it('sin tanda (NULL) o sin jugar -> nada', () => {
    expect(tandaPenaltis({ ...base, penaltis_local: null, penaltis_visitante: null })).toBeNull()
    expect(tandaPenaltis({ ...base, goles_local: null, goles_visitante: null })).toBeNull()
  })
  it('con resolución (motivo_estado) manda el marcador resuelto: acta 5562583, 3-0 con tanda 3-5', () => {
    expect(tandaPenaltis({ goles_local: 3, goles_visitante: 0, penaltis_local: 3, penaltis_visitante: 5, motivo_estado: 'Resultado Resolución Juez Único RFFM' })).toBeNull()
    expect(tandaPenaltis({ ...base, motivo_estado: 'Resultado Resolución Juez Único RFFM' })).toBeNull()
  })
  it('marcador que no es empate -> nada, aunque traiga tanda', () => {
    expect(tandaPenaltis({ ...base, goles_local: 2 })).toBeNull()
  })
  it('administrativo o suspendido -> nada', () => {
    expect(tandaPenaltis({ ...base, incidencia: 'local' })).toBeNull()
    expect(tandaPenaltis({ ...base, estado_partido: 'suspendido' })).toBeNull()
  })
})
