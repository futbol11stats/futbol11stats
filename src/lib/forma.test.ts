import { describe, it, expect } from 'vitest'
import { ventanasForma, ultimosDePartidos } from './forma'

// EL CASO REAL que destapó el bug (T22 de un jugador de 3ª RFEF): 3 partidos de Copa RFEF con jornadas
// 1-2-3 jugados en AGOSTO, y 4 de liga con jornadas 1-2-3-4 en SEPTIEMBRE. Ordenar por jornada los
// INTERCALA, así que la ventana de "últimas 5" promediaba cinco partidos que no eran los cinco últimos.
// Los puntos están elegidos para que las dos ordenaciones den medias DISTINTAS: por fecha sale 2, por
// jornada salía 4. Si alguien vuelve a ordenar por jornada, este test cae.
const COPA_AGOSTO = [
  { jornada: 1, fecha: '12/08/2026', puntos: 10, resultado: 'G', jugado: true },
  { jornada: 2, fecha: '15/08/2026', puntos: 10, resultado: 'G', jugado: true },
  { jornada: 3, fecha: '19/08/2026', puntos: 10, resultado: 'G', jugado: true },
]
const LIGA_SEPTIEMBRE = [
  { jornada: 1, fecha: '05/09/2026', puntos: 0, resultado: 'P', jugado: true },
  { jornada: 2, fecha: '12/09/2026', puntos: 0, resultado: 'P', jugado: true },
  { jornada: 3, fecha: '19/09/2026', puntos: 0, resultado: 'P', jugado: true },
  { jornada: 4, fecha: '27/09/2026', puntos: 0, resultado: 'P', jugado: true },
]
// Mezclados a propósito: el orden de llegada de la BD no debe influir.
const MEZCLA = [LIGA_SEPTIEMBRE[1], COPA_AGOSTO[2], LIGA_SEPTIEMBRE[3], COPA_AGOSTO[0],
                LIGA_SEPTIEMBRE[0], COPA_AGOSTO[1], LIGA_SEPTIEMBRE[2]]

describe('bloque FORMA con competiciones mezcladas', () => {
  it('"últimas 5" toma los cinco últimos POR FECHA (media 2), no por jornada (que daría 4)', () => {
    const v = ventanasForma(MEZCLA)
    const u5 = v.find((x) => x.label === 'Últimas 5')
    expect(u5?.pj).toBe(5)
    expect(u5?.media).toBe(2)
  })

  it('la media de temporada no depende del orden', () => {
    const v = ventanasForma(MEZCLA)
    expect(v.find((x) => x.label === 'Temporada')?.media).toBeCloseTo(30 / 7, 6)
  })

  // La racha de 5 chips usa EL MISMO comparador (cronoAsc), pero vive en jugadorV2 porque necesita
  // marcadorLocalVisitante, que arrastra el cliente de BD. El mecanismo queda cubierto por estos tests.

  it('"últimos partidos" empieza por el más reciente de verdad', () => {
    expect(ultimosDePartidos(MEZCLA, 3).map((p) => p.fecha))
      .toEqual(['27/09/2026', '19/09/2026', '12/09/2026'])
  })
})
