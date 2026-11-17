import { describe, it, expect } from 'vitest'
import { tramoDeGrupo, clasificarAusencia, type ActaCrono } from '@/lib/tramoEtapa'

const a = (codgrupo: string, codequipo: string, dia: string): ActaCrono => ({ codgrupo, codequipo, dia })

// Camarma (Preferente) -> Moratalaz (1ª Autonómica) con 0 PJ: los datos reales de 2282009 en T22.
describe('cambio de equipo sin vuelta', () => {
  const actas = [
    a('pref', '517', '2026-09-13'), a('pref', '517', '2026-09-20'), a('pref', '517', '2026-09-27'),
    a('aut', '624', '2026-11-08'), a('aut', '624', '2026-11-15'),
  ]
  it('la etapa anterior va de su primera acta a la víspera de la primera con el equipo siguiente', () => {
    expect(tramoDeGrupo(actas, 'pref')).toEqual({ desde: '2026-09-13', hasta: '2026-11-08' })
  })
  it('la etapa en curso no tiene corte final', () => {
    expect(tramoDeGrupo(actas, 'aut')).toEqual({ desde: '2026-11-08', hasta: null })
  })
  it('la etapa anterior conserva las jornadas de desconvocado hasta el cambio', () => {
    const t = tramoDeGrupo(actas, 'pref')
    expect(clasificarAusencia('2026-10-18', t, actas, 'pref', '517').tipo).toBe('no_jugo')
    expect(clasificarAusencia('2026-11-08', t, actas, 'pref', '517').tipo).toBe('fuera')
    expect(clasificarAusencia('2026-11-22', t, actas, 'pref', '517').tipo).toBe('fuera')
  })
  it('la etapa nueva no pinta las jornadas de antes de llegar', () => {
    const t = tramoDeGrupo(actas, 'aut')
    expect(clasificarAusencia('2026-09-13', t, actas, 'aut', '624').tipo).toBe('fuera')
    expect(clasificarAusencia('2026-11-01', t, actas, 'aut', '624').tipo).toBe('fuera')
  })
})

// Filial y primer equipo alternando acta a acta.
describe('alterna entre dos equipos', () => {
  const actas = [
    a('A', '1', '2026-09-13'), a('B', '2', '2026-09-20'), a('A', '1', '2026-09-27'),
    a('B', '2', '2026-10-04'), a('A', '1', '2026-10-11'),
  ]
  it('el tramo llega hasta su última acta con el equipo (no se corta en la primera ida)', () => {
    expect(tramoDeGrupo(actas, 'A')).toEqual({ desde: '2026-09-13', hasta: null })
    expect(tramoDeGrupo(actas, 'B')).toEqual({ desde: '2026-09-20', hasta: '2026-10-11' })
  })
  it('la jornada en que jugó con el otro equipo es «con su otro equipo», con margen de fin de semana', () => {
    const t = tramoDeGrupo(actas, 'A')
    const r = clasificarAusencia('2026-09-19', t, actas, 'A', '1')   // sábado del A; jugó el domingo con el B
    expect(r.tipo).toBe('otro_equipo')
    if (r.tipo === 'otro_equipo') expect(r.acta.codgrupo).toBe('B')
    expect(clasificarAusencia('2026-10-25', t, actas, 'A', '1').tipo).toBe('no_jugo')   // ni con uno ni con otro
  })
})

describe('casos de borde', () => {
  const actas = [a('L', '1', '2026-09-13'), a('fam-copa-rffm-t22', '9', '2026-10-01'), a('L', '1', '2026-10-05')]
  it('las copas no recortan la liga ni cuentan como otro equipo', () => {
    expect(tramoDeGrupo(actas, 'L')).toEqual({ desde: '2026-09-13', hasta: null })
    expect(clasificarAusencia('2026-09-28', tramoDeGrupo(actas, 'L'), actas, 'L', '1').tipo).toBe('no_jugo')
  })
  it('un partido sin fecha o un grupo sin tramo se quedan como hasta ahora', () => {
    expect(clasificarAusencia(null, tramoDeGrupo(actas, 'L'), actas, 'L', '1').tipo).toBe('no_jugo')
    expect(clasificarAusencia('2026-09-01', null, actas, 'X', '1').tipo).toBe('no_jugo')
  })
  it('otra competición con el MISMO equipo no es «otro equipo»', () => {
    const mismo = [a('L', '1', '2026-09-13'), a('L2', '1', '2026-09-20')]
    expect(clasificarAusencia('2026-09-20', { desde: '2026-09-13', hasta: null }, mismo, 'L', '1').tipo).toBe('no_jugo')
  })
})
