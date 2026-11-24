import { describe, it, expect } from 'vitest'
import { alertaHumana, sancionPendiente, tipoSancion, type AlertaRow, type SuspensionRow, type PartidoEquipo } from './alertaTarjetas'

const alerta = (o: Partial<AlertaRow>): AlertaRow => ({
  estado: 'EN_CICLO', codtemporada: 22, jornada: 10, amarillas_ciclo: 0, ciclo_umbral: 5,
  dobles_amarillas: 0, rojas_directas: 0, nombre_equipo: 'X', ...o,
})
const sancion = (o: Partial<SuspensionRow> = {}): SuspensionRow =>
  ({ codgrupo: 'G', jornada: 5, codequipo: 'E', motivo: 'Roja Directa', equipo_eliminado: 0, ...o })
const partido = (jornada: number, o: Partial<PartidoEquipo> = {}): PartidoEquipo =>
  ({ codgrupo: 'G', jornada, codequipo_local: 'E', codequipo_visitante: 'R', goles_local: 1, goles_visitante: 0, ...o })

describe('sancionPendiente', () => {
  it('cumplida si su equipo jugó con marcador después de la jornada de la sanción', () => {
    expect(sancionPendiente([sancion()], [partido(6, { codequipo_local: 'R', codequipo_visitante: 'E' })])).toBeNull()
  })
  it('pendiente si su equipo aún no ha jugado', () => {
    expect(sancionPendiente([sancion()], [])).toEqual(sancion())
  })
  it('un aplazado/suspendido (sin marcador) o un descanso no la cumplen', () => {
    const aplazado = partido(6, { goles_local: null, goles_visitante: null })
    // J6 sin partido del equipo (descanso): solo hay partidos de otros equipos
    const otros = partido(6, { codequipo_local: 'A', codequipo_visitante: 'B' })
    expect(sancionPendiente([sancion()], [aplazado, otros])).not.toBeNull()
  })
  it('un partido de otro grupo, o de la misma jornada, no la cumple', () => {
    expect(sancionPendiente([sancion()], [partido(6, { codgrupo: 'OTRO' }), partido(5)])).not.toBeNull()
  })
  it('equipo eliminado de copa: se cumple en la próxima edición, no esta temporada', () => {
    expect(sancionPendiente([sancion({ equipo_eliminado: 1 })], [])).toBeNull()
  })
  it('con una cumplida y otra pendiente, la pendiente', () => {
    const vieja = sancion({ jornada: 2 }), nueva = sancion({ jornada: 9, motivo: 'Doble Amarilla' })
    expect(sancionPendiente([vieja, nueva], [partido(3)])).toEqual(nueva)
  })
})

describe('tipoSancion', () => {
  it('motivos de web_suspendidos', () => {
    expect(tipoSancion('Roja Directa').txt).toBe('roja directa')
    expect(tipoSancion('Doble Amarilla').tarjeta).toBe('doble')
    expect(tipoSancion('5ª Tarjeta Amarilla (Ciclo)').txt).toBe('5ª amarilla')
    expect(tipoSancion('3ª amarilla (ciclo 3) · equipo eliminado (próxima edición)').txt).toBe('3ª amarilla')
  })
})

const T22 = { ficha: 22, enCurso: 22 }

describe('alertaHumana', () => {
  it('temporada cerrada: ni Sancionado ni Apercibido (la sanción de la última jornada no se cumple nunca)', () => {
    const T21 = { ficha: 21, enCurso: 22 }
    expect(alertaHumana(alerta({ codtemporada: 21 }), sancion({ jornada: 34 }), T21)).toBeNull()
    expect(alertaHumana(alerta({ codtemporada: 21, amarillas_ciclo: 4 }), null, T21)).toBeNull()
    expect(alertaHumana(alerta({ codtemporada: 21, estado: 'APERCIBIDO' }), null, T21)).toBeNull()
    expect(alertaHumana(alerta({ amarillas_ciclo: 4 }), null, { ficha: null, enCurso: 22 })).toBeNull()
  })
  it('Sancionado solo con sanción pendiente', () => {
    expect(alertaHumana(alerta({}), sancion(), T22)?.html).toBe('<b>Sancionado</b> — roja directa · no juega el próximo partido')
    expect(alertaHumana(null, sancion({ motivo: 'Doble Amarilla' }), T22)?.html).toContain('doble amarilla')
  })
  it('sin sanción pendiente, una roja de la temporada no pone «Sancionado»', () => {
    expect(alertaHumana(alerta({ estado: 'SUSPENDIDO', rojas_directas: 1 }), null, T22)).toBeNull()
    expect(alertaHumana(alerta({ estado: 'SANCIONADO', dobles_amarillas: 1 }), null, T22)).toBeNull()
  })
  it('APERCIBIDO: estado del pipeline, o 4 de 5 / 2 de 3', () => {
    expect(alertaHumana(alerta({ estado: 'APERCIBIDO', amarillas_ciclo: 4 }), null, T22)?.html)
      .toBe('<b>Apercibido</b> — 4 de 5 amarillas. Una más y cumple sanción.')
    expect(alertaHumana(alerta({ estado: 'APERCIBIDO', amarillas_ciclo: null }), null, T22)?.html).toBe('<b>Apercibido</b>. Una más y cumple sanción.')
    expect(alertaHumana(alerta({ estado: 'SUSPENDIDO', amarillas_ciclo: 4 }), null, T22)?.html).toContain('Apercibido')
    expect(alertaHumana(alerta({ amarillas_ciclo: 2, ciclo_umbral: 3 }), null, T22)?.html).toContain('Apercibido')
  })
  it('la sanción manda sobre el apercibimiento', () => {
    expect(alertaHumana(alerta({ estado: 'APERCIBIDO', amarillas_ciclo: 4 }), sancion(), T22)?.html).toContain('Sancionado')
  })
  it('fila no vigente: ni Sancionado, ni Apercibido, ni En ciclo', () => {
    expect(alertaHumana(alerta({ vigente: false }), sancion(), T22)).toBeNull()
    expect(alertaHumana(alerta({ vigente: false, estado: 'APERCIBIDO', amarillas_ciclo: 4 }), null, T22)).toBeNull()
    expect(alertaHumana(alerta({ vigente: false, amarillas_ciclo: 2 }), null, T22)).toBeNull()
  })
  it('vigente true, nulo o sin columna: como antes', () => {
    expect(alertaHumana(alerta({ vigente: true, amarillas_ciclo: 2 }), null, T22)?.html).toBe('<b>En ciclo</b> — 2 de 5 amarillas.')
    expect(alertaHumana(alerta({ vigente: null, estado: 'APERCIBIDO', amarillas_ciclo: 4 }), null, T22)?.html).toContain('Apercibido')
    expect(alertaHumana(alerta({}), sancion(), T22)?.html).toContain('Sancionado')
  })
  it('en ciclo y ciclo reiniciado', () => {
    expect(alertaHumana(alerta({ amarillas_ciclo: 2 }), null, T22)?.html).toBe('<b>En ciclo</b> — 2 de 5 amarillas.')
    expect(alertaHumana(alerta({ estado: 'CICLO_COMPLETADO', amarillas_ciclo: 0 }), null, T22)).toBeNull()
  })
})
