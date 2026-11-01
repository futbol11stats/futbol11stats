import { describe, it, expect } from 'vitest'
import { ordenarPorFechaHora } from '@/lib/fechaOrden'

// Pestaña Resultados: orden cronológico puro por fecha y hora, sin separar jugados de pendientes (2026-11-01).
describe('Resultados · orden cronológico puro', () => {
  // Así lo devolvía la BD (order fecha = TEXTO): los del 01/11 pendientes ARRIBA, los jugados del 31/10 abajo.
  const r = (id: number, fecha: string, hora: string | null) => ({ id, fecha, hora })
  const bd = [r(1, '01/11/2026', '11:30'), r(2, '01/11/2026', '11:30'), r(3, '01/11/2026', null), r(4, '01/11/2026', '20:00'),
    r(5, '31/10/2026', '17:00'), r(6, '31/10/2026', '16:00')]
  it('por fecha y hora; a igual hora, el orden de entrada; sin hora al final de su día', () => {
    expect(ordenarPorFechaHora(bd).map((x) => x.id)).toEqual([6, 5, 1, 2, 4, 3])
  })
  it('fecha_iso manda si viene; no muta la entrada', () => {
    const e = [{ id: 1, fecha: '01/11/2026', fecha_iso: '2026-11-01', hora: '10:00' }, { id: 2, fecha: null, fecha_iso: '2026-10-31', hora: '10:00' }]
    expect(ordenarPorFechaHora(e).map((x) => x.id)).toEqual([2, 1])
    expect(e[0].id).toBe(1)
  })
})
