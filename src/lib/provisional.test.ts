import { describe, it, expect, vi } from 'vitest'

// equipoV2.ts crea el cliente de Supabase al cargar el módulo: se mockea (mismo recurso que jornadasEquipo.test.ts).
vi.mock('@/lib/supabase', () => ({ supabase: {}, sel: vi.fn() }))

import { esProvisional, PROVISIONAL_CORTO } from '@/lib/rotulos'
import { buildJornadasEquipo, formaEquipo, type ClasifRow } from '@/lib/equipoV2'
import type { ResultadoRow } from '@/lib/equipo'
import { matchVevent } from '@/lib/ics'

// PROVISIONAL (decisión 2026-10-26, opción A): marcador publicado con el acta abierta (web_resultados.computa=false).
// Se ENSEÑA con marca y NO CUENTA (forma, rachas, cara a cara, Últimos partidos). Esto fija la regla única y que
// el filtro saca al provisional y SOLO a él.

describe('esProvisional · la regla única', () => {
  it('marcador + computa=false -> provisional', () => {
    expect(esProvisional({ goles_local: 2, goles_visitante: 1, computa: false })).toBe(true)
  })
  it('control: computa=true, NULL o ausente -> NO (ausencia no es provisional)', () => {
    expect(esProvisional({ goles_local: 2, goles_visitante: 1, computa: true })).toBe(false)
    expect(esProvisional({ goles_local: 2, goles_visitante: 1, computa: null })).toBe(false)
    expect(esProvisional({ goles_local: 2, goles_visitante: 1 })).toBe(false)
  })
  it('control: sin marcador (suspendido, futuro) -> NO aunque computa=false', () => {
    expect(esProvisional({ goles_local: null, goles_visitante: null, computa: false })).toBe(false)
  })
})

const clasif = (jornada: number): ClasifRow => ({
  jornada, pos: 1, pts: null, pts_fantasy: jornada * 10, mov: null, elo: null, pj: null,
  gf: null, gc: null, pg: null, pe: null, pp: null, fecha_iso: `2026-09-${String(jornada).padStart(2, '0')}`,
})
// J1..J5 ganadas 2-1; J6 PERDIDA 0-3 y provisional. Si el filtro no actuara, la racha acabaría en P.
const res = (jornada: number, provisional = false): ResultadoRow => ({
  jornada, fecha: `${String(jornada).padStart(2, '0')}/09/2026`, fecha_iso: `2026-09-${String(jornada).padStart(2, '0')}`,
  goles_local: provisional ? 0 : 2, goles_visitante: provisional ? 3 : 1,
  nombre_local: 'NUESTRO', nombre_visitante: 'RIVAL ' + jornada,
  codequipo_local: '100', codequipo_visitante: String(200 + jornada), codacta: 'A' + jornada,
  computa: provisional ? false : true,
})

describe('ficha de equipo · gráfico y racha', () => {
  const serie = [1, 2, 3, 4, 5, 6].map(clasif)
  const jornadas = buildJornadasEquipo(serie, [1, 2, 3, 4, 5].map((j) => res(j)).concat(res(6, true)), 'NUESTRO', '100')

  it('el gráfico SIGUE enseñando el provisional, marcado', () => {
    const j6 = jornadas.find((j) => j.jornada === 6)!
    expect(j6.marcador).toBe('0-3')
    expect(j6.provisional).toBe(true)
    expect(jornadas.filter((j) => j.provisional).map((j) => j.jornada)).toEqual([6])
  })
  it('la racha de Rendimiento NO lo cuenta: J1..J5, sin la derrota provisional', () => {
    const { racha } = formaEquipo(jornadas)
    expect(racha.map((r) => r.jornada)).toEqual([1, 2, 3, 4, 5])
    expect(racha.every((r) => r.signo === 'G')).toBe(true)
  })
  it('control positivo: el mismo partido con computa=true SÍ entra (y la racha acaba en P)', () => {
    const conComputa = buildJornadasEquipo(serie, [1, 2, 3, 4, 5, 6].map((j) => ({ ...res(j, j === 6), computa: true })), 'NUESTRO', '100')
    expect(formaEquipo(conComputa).racha.map((r) => r.signo)).toEqual(['G', 'G', 'G', 'G', 'P'])
  })
})

describe('.ics · el título dice provisional', () => {
  const base = {
    codgrupo: 'g', jornada: 7, codequipoLocal: '1', codequipoVisitante: '2', nombreLocal: 'A', nombreVisitante: 'B',
    golesLocal: 2, golesVisitante: 1, fecha: '25/10/2026', hora: '11:00', campoNombre: null, direccion: null,
    lat: null, lng: null, competicion: 'X · Jornada 7', url: 'https://x', perspectiva: 'local' as const,
  }
  it('provisional -> marcador con "(provisional)"', () => {
    expect(matchVevent({ ...base, provisional: true }, Date.UTC(2026, 9, 26))).toContain(`A 2-1 B (${PROVISIONAL_CORTO.toLowerCase()})`)
  })
  it('control: sin la marca, el título no cambia', () => {
    const ve = matchVevent(base, Date.UTC(2026, 9, 26)) as string
    expect(ve).toContain('SUMMARY:Casa · A 2-1 B\r\n')
    expect(ve.toLowerCase()).not.toContain('provisional')
  })
})
