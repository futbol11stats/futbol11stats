import { describe, it, expect } from 'vitest'
import { derivarRol, escalon, cortesValidos } from './escala'

// Los cinco roles posibles, uno por caso. El orden de las comprobaciones en derivarRol() es
// significativo; el caso crítico lo fija de forma explícita:
//   un TITULAR expulsado a los 60' es 'expulsado', NO 'sustituido'
// (la expulsión se comprueba antes que el minutaje). Si alguien invierte el orden, este test cae.
describe('derivarRol', () => {
  it("titular que completa el partido → 'completo'", () => {
    expect(derivarRol(true, 90, 0, 0)).toBe('completo')
  })

  it("titular sustituido → 'sustituido'", () => {
    expect(derivarRol(true, 60, 0, 0)).toBe('sustituido')
  })

  it("suplente que entra → 'entro'", () => {
    expect(derivarRol(false, 25, 0, 0)).toBe('entro')
  })

  it("no convocado / no juega → 'no_jugo'", () => {
    expect(derivarRol(false, 0, 0, 0)).toBe('no_jugo')
  })

  it("CRÍTICO: titular con roja a los 60' → 'expulsado', no 'sustituido'", () => {
    expect(derivarRol(true, 60, 1, 0)).toBe('expulsado')
  })
})

// Comprobaciones extra del orden de precedencia (no alteran los cinco casos anteriores).
describe('derivarRol · precedencia', () => {
  it('la doble amarilla también expulsa', () => {
    expect(derivarRol(true, 80, 0, 1)).toBe('expulsado')
  })

  it("un suplente expulsado es 'expulsado', no 'entro'", () => {
    expect(derivarRol(false, 15, 1, 0)).toBe('expulsado')
  })

  it("90+ minutos exactos cuentan como 'completo'", () => {
    expect(derivarRol(true, 95, 0, 0)).toBe('completo')
  })
})

// El escalón 0 (rojo) es solo para valores NEGATIVOS. Un 0 real no puede pintarse rojo.
describe('escalon', () => {
  it('un valor de 0 no es rojo (escalón 0), aunque no llegue al primer corte', () => {
    expect(escalon(0, [1, 1, 2, 4])).not.toBe(0)
  })

  it('un valor negativo sí es el escalón 0', () => {
    expect(escalon(-2, [1, 1, 2, 4])).toBe(0)
  })
})

// cortesValidos() detecta rampas degeneradas para que el consumidor caiga a CORTES_FIJOS.
describe('cortesValidos', () => {
  it('cortes empatados no son válidos', () => {
    expect(cortesValidos([1, 1, 2, 4])).toBe(false)
  })

  it('cortes estrictamente crecientes son válidos', () => {
    expect(cortesValidos([1, 2, 3, 4])).toBe(true)
  })
})
