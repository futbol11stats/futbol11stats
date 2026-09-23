import { describe, it, expect } from 'vitest'
import { calcPrime } from './prime'

// El gate es la mitad del valor de este cálculo: un prime pintado sobre una horquilla que aún no
// significa nada (curva corta) o inexistente (máx = mín) sería un número con pinta de dato.
// El 4º argumento es elo_curva_n (puntos de la curva de ELO, con copa y playoff), NO partidos.
describe('calcPrime', () => {
  it('el ejemplo del diseño: 890-1.000 y hoy 945 → 50%', () => {
    expect(calcPrime(945, 890, 1000, 20)).toBe(50)
  })

  it('en su máximo → 100; en su mínimo → 0', () => {
    expect(calcPrime(1000, 890, 1000, 20)).toBe(100)
    expect(calcPrime(890, 890, 1000, 20)).toBe(0)
  })

  it('por encima del máximo publicado se capa a 100 (el export va por detrás del ELO vivo)', () => {
    expect(calcPrime(1050, 890, 1000, 20)).toBe(100)
    expect(calcPrime(800, 890, 1000, 20)).toBe(0)
  })

  it('curva de menos de 5 puntos → null', () => {
    expect(calcPrime(945, 890, 1000, 4)).toBeNull()
    expect(calcPrime(945, 890, 1000, 5)).toBe(50)
  })

  it('máximo y mínimo iguales (o invertidos) → null, no una división por cero', () => {
    expect(calcPrime(945, 945, 945, 20)).toBeNull()
    expect(calcPrime(945, 1000, 890, 20)).toBeNull()
  })

  it('cualquier dato ausente → null (no se inventa un 0)', () => {
    expect(calcPrime(null, 890, 1000, 20)).toBeNull()
    expect(calcPrime(945, null, 1000, 20)).toBeNull()
    expect(calcPrime(945, 890, null, 20)).toBeNull()
    expect(calcPrime(945, 890, 1000, null)).toBeNull()
  })
})
