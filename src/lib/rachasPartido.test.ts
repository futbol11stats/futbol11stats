import { describe, it, expect } from 'vitest'
import { anterioresAl, rachasDe, rachasTras } from '@/lib/rachasPartido'
import type { PartidoMini } from '@/lib/partido'

// Ficha de partido: rachas/forma/H2H "cómo llegaban" = solo partidos ANTERIORES al partido (decisión 2026-11-01).
// Antes se contaba hasta hoy: un partido de septiembre enseñaba rachas con partidos de octubre.
const m = (codacta: string, fecha: string, gf: number, gc: number, extra: Partial<PartidoMini> = {}): PartidoMini => ({
  codacta, fecha, hora: '12:00', local: 'NOS', escudoLocal: null, golesLocal: gf, visitante: 'RIVAL', escudoVisitante: null, golesVisitante: gc,
  codLocal: '1', codVisitante: '2', ...extra,
})
// Historial DESC (como historialDe): dos de OCTUBRE posteriores, el propio (20/09) y tres anteriores.
const hist = [
  m('O2', '12/10/2026', 0, 2), m('O1', '05/10/2026', 3, 0),
  m('P', '20/09/2026', 2, 1),
  m('A3', '13/09/2026', 1, 0), m('A2', '06/09/2026', 1, 1), m('A1', '30/08/2026', 0, 1),
]
const ref = { codacta: 'P', fecha: '20/09/2026', hora: '12:00' }

describe('anterioresAl · corte en el momento del partido', () => {
  it('solo los anteriores: fuera el propio y TODO lo posterior', () => {
    expect(anterioresAl(hist, ref).map((x) => x.codacta)).toEqual(['A3', 'A2', 'A1'])
  })
  it('control: el corte viejo (solo quitar el propio) metía los de octubre', () => {
    expect(hist.filter((x) => x.codacta !== 'P').map((x) => x.codacta)).toContain('O1')
  })
  it('fechas en meses distintos se comparan como fecha, no como texto DD/MM', () => {
    const r = anterioresAl([m('X', '01/11/2026', 1, 0), m('Y', '31/10/2026', 1, 0)], { codacta: 'Z', fecha: '01/11/2026', hora: '10:00' })
    expect(r.map((x) => x.codacta)).toEqual(['Y'])
  })
  it('mismo día: decide la hora; sin hora en alguno de los dos, fuera (no se puede situar antes)', () => {
    const tarde = { codacta: 'Z', fecha: '20/09/2026', hora: '18:00' }
    expect(anterioresAl([m('M', '20/09/2026', 1, 0, { hora: '11:00' })], tarde).length).toBe(1)
    expect(anterioresAl([m('M', '20/09/2026', 1, 0, { hora: '19:00' })], tarde).length).toBe(0)
    expect(anterioresAl([m('M', '20/09/2026', 1, 0, { hora: null })], tarde).length).toBe(0)
  })
  it('provisionales fuera; partido sin fecha -> sin historial', () => {
    expect(anterioresAl([m('A', '01/09/2026', 1, 0, { provisional: true })], ref).length).toBe(0)
    expect(anterioresAl(hist, { codacta: 'P', fecha: null, hora: null })).toEqual([])
  })
})

describe('rachas · antes y tras el partido', () => {
  const antes = anterioresAl(hist, ref)
  it('el récord de antes se cuenta solo con anteriores (el 3-0 de octubre no entra)', () => {
    const r = rachasDe('1', antes)
    expect(r.marcandoAct).toBe(2); expect(r.invictoAct).toBe(2); expect(r.victoriasAct).toBe(1)
    expect(r.victoriasRec).toBe(1)
  })
  it('tras ganar 2-1: Marcando 2 → 3 (bate), Victorias 1 → 2 (bate), Sin perder 2 → 3 (bate)', () => {
    const t = rachasTras('1', antes, hist[2])
    expect(t.marcando).toEqual({ antes: 2, despues: 3, record: 'bate' })
    expect(t.victorias).toEqual({ antes: 1, despues: 2, record: 'bate' })
    expect(t.invicto).toEqual({ antes: 2, despues: 3, record: 'bate' })
  })
  it('racha rota -> … → 0, sin marca', () => {
    const t = rachasTras('1', antes, m('P', '20/09/2026', 0, 2))
    expect(t.marcando).toEqual({ antes: 2, despues: 0, record: null })
    expect(t.invicto).toEqual({ antes: 2, despues: 0, record: null })
  })
  it('iguala el récord previo, y sin llegar no se marca', () => {
    // Récord previo de victorias = 2 (G G P), actual 1 -> ganar = 2 = iguala.
    const prev = [m('B1', '10/09/2026', 1, 0), m('B2', '03/09/2026', 0, 1), m('B3', '27/08/2026', 2, 0), m('B4', '20/08/2026', 2, 0)]
    expect(rachasTras('1', prev, m('P', '20/09/2026', 1, 0)).victorias).toEqual({ antes: 1, despues: 2, record: 'iguala' })
    const largo = [m('C1', '10/09/2026', 1, 0), m('C2', '03/09/2026', 0, 1), ...[1, 2, 3, 4].map((i) => m('D' + i, `0${i}/08/2026`, 1, 0))]
    expect(rachasTras('1', largo, m('P', '20/09/2026', 1, 0)).victorias.record).toBeNull()
  })
  it('lado visitante: se lee desde su perspectiva', () => {
    const t = rachasTras('2', [], m('P', '20/09/2026', 0, 1))
    expect(t.victorias).toEqual({ antes: 0, despues: 1, record: 'bate' })
  })
})
