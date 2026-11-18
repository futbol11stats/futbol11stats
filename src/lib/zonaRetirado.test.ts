import { describe, it, expect } from 'vitest'
import { zonaDeFila } from '@/lib/zonaFila'

// Clasificación de liga: el RETIRADO se pinta con la zona que publica el pipeline. Casos reales de 2ª Aficionada
// (sin descensos): Loeches (G6) y Miraflor 'B' (G9) llegan retirados con la zona vacía.
describe('zona de la fila de un retirado', () => {
  it('zona vacía: sin color de zona (solo el rótulo RETIRADO)', () => {
    expect(zonaDeFila(true, null)).toBeNull()
    expect(zonaDeFila(true, '')).toBeNull()
  })
  it('descenso_directo: fondo de descenso, como hasta ahora', () => {
    expect(zonaDeFila(true, 'descenso_directo')).toBe('descenso_directo')
  })
  it('un equipo no retirado conserva su zona tal cual', () => {
    expect(zonaDeFila(false, 'ascenso_directo')).toBe('ascenso_directo')
    expect(zonaDeFila(false, null)).toBeNull()
    expect(zonaDeFila(null, 'descenso_directo')).toBe('descenso_directo')
  })
})
