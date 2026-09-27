import { describe, it, expect } from 'vitest'
import { claveFecha, FECHA_AL_FINAL } from './fechaOrden'

// Este helper existe porque depender de UNA sola fecha ya nos rompió dos superficies (ELO de copa y orden
// del feed .ics) cuando un re-export vació fecha_iso en las filas de copa. Los dos primeros tests son el
// contrato: cada fuente por separado tiene que bastar.
describe('claveFecha', () => {
  it('usa fecha_iso cuando viene', () => {
    expect(claveFecha('2026-03-05', '05/03/2026')).toBe('2026-03-05')
  })

  it('cae a la fecha de mostrar cuando fecha_iso falta (el caso de copa)', () => {
    expect(claveFecha(null, '05/03/2026')).toBe('2026-03-05')
  })

  it('las dos fuentes dan la MISMA clave, así que mezclar filas no altera el orden', () => {
    expect(claveFecha('2026-03-05', null)).toBe(claveFecha(null, '05/03/2026'))
  })

  it('sin ninguna fecha válida va al FINAL, nunca al principio', () => {
    expect(claveFecha(null, null)).toBe(FECHA_AL_FINAL)
    expect(claveFecha(undefined, 'mañana')).toBe(FECHA_AL_FINAL)
    expect(claveFecha('', '')).toBe(FECHA_AL_FINAL)
  })

  it('ordena de verdad (es lo único para lo que sirve)', () => {
    const filas = [
      { fecha_iso: null, fecha: '05/03/2026' },
      { fecha_iso: '2025-11-12', fecha: '12/11/2025' },
      { fecha_iso: null, fecha: null },
      { fecha_iso: null, fecha: '17/12/2025' },
    ]
    const orden = filas
      .map((f) => claveFecha(f.fecha_iso, f.fecha))
      .sort((a, b) => a.localeCompare(b))
    expect(orden).toEqual(['2025-11-12', '2025-12-17', '2026-03-05', FECHA_AL_FINAL])
  })
})
