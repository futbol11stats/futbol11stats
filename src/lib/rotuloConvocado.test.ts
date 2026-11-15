import { describe, it, expect } from 'vitest'
import { rotuloConvocado } from '@/lib/rotulos'

// Etapa de carrera con 0 PJ (convocado en el último acta, de otro club, sin jugar): se rotula la convocatoria.
describe('rotuloConvocado', () => {
  it('rotula la etapa de 0 PJ con sus convocatorias', () => {
    expect(rotuloConvocado({ pj: 0, convocatorias: 3 })).toBe('Convocado · 3 conv. · 0 PJ')
  })
  it('sin la columna convocatorias (aún no publicada) omite la cifra', () => {
    expect(rotuloConvocado({ pj: 0 })).toBe('Convocado · 0 PJ')
    expect(rotuloConvocado({ pj: 0, convocatorias: null })).toBe('Convocado · 0 PJ')
  })
  it('una etapa con partidos (o sin dato de PJ) no lleva rótulo', () => {
    expect(rotuloConvocado({ pj: 2, convocatorias: 3 })).toBeNull()
    expect(rotuloConvocado({ pj: null, convocatorias: 3 })).toBeNull()
  })
})
