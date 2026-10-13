import { describe, it, expect, vi } from 'vitest'

// buildJornadasEquipo es una función PURA, pero vive en equipoV2.ts, que importa el cliente de Supabase y lo
// crea al cargar el módulo (`createClient` en el cuerpo, no dentro de una función). Importarla aquí
// reventaría con "supabaseUrl is required". Se mockea el módulo entero: el test no toca la base de datos ni
// la necesita. Mismo recurso que el mock de next/cache en route.test.ts.
vi.mock('@/lib/supabase', () => ({ supabase: {}, sel: vi.fn() }))

import { buildJornadasEquipo, type ClasifRow } from '@/lib/equipoV2'
import type { ResultadoRow } from '@/lib/equipo'

// R4 · El gráfico "Puntos y ELO por jornada" va en CRONOLOGÍA, no por número de jornada.
//
// El caso que fuerza la diferencia es real y frecuente: un partido aplazado o adelantado. Si la J10 se juega
// entre la J3 y la J4, el eje tiene que decir J3 · J10 · J4 · J5. Las etiquetas desordenadas son la verdad.
//
// Y hay una trampa que estos casos protegen: pts_fantasy en web_clasificacion es ACUMULADO POR NÚMERO DE
// JORNADA, así que el fantasy de una jornada (la resta con la anterior) debe calcularse ANTES de reordenar.
// Si se reordena primero, la resta coge el acumulado equivocado y salen cifras sin sentido.

const clasif = (jornada: number, pts_fantasy: number, fecha_iso: string): ClasifRow => ({
  jornada, pos: 1, pts: null, pts_fantasy, mov: null, elo: null, pj: null,
  gf: null, gc: null, pg: null, pe: null, pp: null, fecha_iso,
})

const res = (jornada: number, fecha: string, fecha_iso: string): ResultadoRow => ({
  jornada, fecha, fecha_iso,
  goles_local: 2, goles_visitante: 1,
  nombre_local: 'NUESTRO', nombre_visitante: 'RIVAL ' + jornada,
  codequipo_local: '100', codequipo_visitante: String(200 + jornada),
  codacta: 'A' + jornada,
})

describe('buildJornadasEquipo · orden cronológico', () => {
  // Acumulado por jornada: J1=10, J2=25, J3=40, J4=46, J10=100 -> fantasy propio 10, 15, 15, 6, 54
  const serie = [
    clasif(1, 10, '2026-09-06'),
    clasif(2, 25, '2026-09-13'),
    clasif(3, 40, '2026-09-20'),
    clasif(4, 46, '2026-10-04'),
    clasif(10, 100, '2026-09-27'),   // ADELANTADA: se juega entre la J3 y la J4
  ].sort((a, b) => a.jornada - b.jornada)   // getSerieLiga la entrega ordenada por jornada

  const resultados = [
    res(1, '06/09/2026', '2026-09-06'), res(2, '13/09/2026', '2026-09-13'),
    res(3, '20/09/2026', '2026-09-20'), res(4, '04/10/2026', '2026-10-04'),
    res(10, '27/09/2026', '2026-09-27'),
  ]

  const out = buildJornadasEquipo(serie, resultados, 'NUESTRO', '100')

  it('el eje sale en orden de FECHA, con las etiquetas desordenadas', () => {
    expect(out.map((j) => j.jornada)).toEqual([1, 2, 3, 10, 4])
  })

  it('el fantasy de cada jornada se calcula ANTES de reordenar (acumulado por jornada)', () => {
    const porJornada = Object.fromEntries(out.map((j) => [j.jornada, j.fan]))
    expect(porJornada[1]).toBe(10)
    expect(porJornada[2]).toBe(15)
    expect(porJornada[3]).toBe(15)
    expect(porJornada[4]).toBe(6)    // 46 − 40, su anterior POR JORNADA es la 3, no la 10
    expect(porJornada[10]).toBe(54)  // 100 − 46, su anterior por jornada es la 4
  })

  it('sin reordenar, "las últimas" serían las equivocadas: la última cronológica es la J4', () => {
    expect(out[out.length - 1].jornada).toBe(4)
  })

  it('una jornada SIN jugar se ordena por la fecha de su propia fila de clasificación', () => {
    const s = [clasif(1, 10, '2026-09-06'), clasif(2, 10, '2026-09-13')]
    const o = buildJornadasEquipo(s, [res(1, '06/09/2026', '2026-09-06')], 'NUESTRO', '100')
    expect(o.map((j) => j.jornada)).toEqual([1, 2])
    expect(o[1].marcador).toBeNull()   // sin resultado: la fila existe, sin marcador
  })

  it('a igual fecha, desempata por jornada (no queda al azar)', () => {
    const s = [clasif(7, 10, '2026-10-11'), clasif(6, 5, '2026-10-11')].sort((a, b) => a.jornada - b.jornada)
    const o = buildJornadasEquipo(s, [], 'NUESTRO', '100')
    expect(o.map((j) => j.jornada)).toEqual([6, 7])
  })
})
