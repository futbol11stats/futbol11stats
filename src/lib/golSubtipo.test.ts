import { describe, it, expect } from 'vitest'
import { subtipoGol, sufijoGol, esColumnaInexistente } from '@/lib/golSubtipo'

describe('subtipoGol', () => {
  it('penalti y propia puerta', () => {
    expect(subtipoGol('penalti')).toBe('penalti')
    expect(subtipoGol('pp')).toBe('pp')
    expect(subtipoGol(' PP ')).toBe('pp')
  })
  it('columna ausente, vacía o valor desconocido -> gol normal', () => {
    expect(subtipoGol(undefined)).toBeNull()
    expect(subtipoGol(null)).toBeNull()
    expect(subtipoGol('')).toBeNull()
    expect(subtipoGol('falta')).toBeNull()
  })
})

describe('sufijoGol', () => {
  it('(p), (p.p.) o nada', () => {
    expect(`34′${sufijoGol('penalti')}`).toBe('34′ (p)')
    expect(`71′${sufijoGol('pp')}`).toBe('71′ (p.p.)')
    expect(sufijoGol(null)).toBe('')
  })
})

describe('esColumnaInexistente', () => {
  it('solo los códigos de columna que no existe', () => {
    expect(esColumnaInexistente({ code: '42703' })).toBe(true)
    expect(esColumnaInexistente({ code: 'PGRST204' })).toBe(true)
    expect(esColumnaInexistente({ code: '57014' })).toBe(false)
    expect(esColumnaInexistente(null)).toBe(false)
  })
})
