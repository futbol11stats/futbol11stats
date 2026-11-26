import { describe, it, expect } from 'vitest'
import { rotuloCategoria, rotuloPosicion } from './rotuloNivel'

describe('rótulos del bloque Nivel', () => {
  it('la fila de posición lleva la competición de la etapa en una segunda línea', () => {
    expect(rotuloPosicion('Delantero', 'Preferente')).toEqual({ label: 'Delantero', sub: 'Preferente' })
    expect(rotuloPosicion('Delantero', '1ª Autonómica Juvenil')).toEqual({ label: 'Delantero', sub: '1ª Autonómica Juvenil' })
  })
  it('mismo nombre que la fila de categoría, el corto si existe', () => {
    for (const c of ['Preferente', '2ª Aficionada', 'Copa RFEF Fase Autonómica', 'Play Off Tercera Federación']) {
      expect(rotuloPosicion('Portero', c).sub).toBe(rotuloCategoria(c))
    }
    expect(rotuloCategoria('Copa RFEF Fase Autonómica')).toBe('Copa RFEF')
    expect(rotuloCategoria('Play Off Tercera Federación')).toBe('Play Off 3ª RFEF')
    expect(rotuloCategoria('1ª Autonómica Juvenil')).toBe('1ª Autonómica Juvenil')
  })
  it('sin competición, solo la demarcación', () => {
    expect(rotuloPosicion('Defensa', null)).toEqual({ label: 'Defensa', sub: null })
    expect(rotuloPosicion('Defensa', '')).toEqual({ label: 'Defensa', sub: null })
  })
})
