import { describe, it, expect } from 'vitest'
import { codToSlug, slugToCod, universoTemporadas } from './temporadaSlug'

// La relación cod<->slug es LINEAL y está verificada contra web_grupos.nombre_temporada (cod 17 = 2021-2022
// ... cod 22 = 2026-2027, sin gaps). Estos tests la fijan: si alguien vuelve a introducir una lista topada o
// rompe la fórmula, caen. El caso T22 es el que motivó el arreglo (la copa nueva daba 404).
describe('codToSlug', () => {
  it('reproduce las temporadas conocidas 17..21 (paridad con los mapas viejos)', () => {
    expect(codToSlug(17)).toBe('2021-22')
    expect(codToSlug(18)).toBe('2022-23')
    expect(codToSlug(19)).toBe('2023-24')
    expect(codToSlug(20)).toBe('2024-25')
    expect(codToSlug(21)).toBe('2025-26')
  })

  it('la temporada nueva funciona sola: cod 22 -> 2026-27, cod 23 -> 2027-28', () => {
    expect(codToSlug(22)).toBe('2026-27')
    expect(codToSlug(23)).toBe('2027-28')
  })
})

describe('slugToCod', () => {
  it('inverte el slug de URL (incluida la nueva)', () => {
    expect(slugToCod('2025-26')).toBe(21)
    expect(slugToCod('2026-27')).toBe(22)
  })

  it('rechaza slugs malformados (null, no el año siguiente)', () => {
    expect(slugToCod('undefined')).toBeNull()   // el bug: el índice metía "undefined" en la URL
    expect(slugToCod('2026-2027')).toBeNull()   // forma larga: no es slug de URL
    expect(slugToCod('2025-99')).toBeNull()     // el segundo par no es el año siguiente
    expect(slugToCod('abc')).toBeNull()
  })

  it('round-trip cod -> slug -> cod para 17..25', () => {
    for (let c = 17; c <= 25; c++) expect(slugToCod(codToSlug(c))).toBe(c)
  })
})

describe('universoTemporadas', () => {
  it('desciende desde el techo (dato) hasta el suelo de datos (17)', () => {
    expect(universoTemporadas(22)).toEqual([22, 21, 20, 19, 18, 17])
    expect(universoTemporadas(21)).toEqual([21, 20, 19, 18, 17])
  })

  it('nunca baja del suelo aunque el techo sea menor', () => {
    expect(universoTemporadas(10)).toEqual([17])
  })
})
