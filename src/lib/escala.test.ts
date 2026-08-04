import { describe, it, expect } from 'vitest'
import { derivarRol } from './escala'

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
