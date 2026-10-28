import { describe, it, expect, vi } from 'vitest'

// equipoV2.ts crea el cliente de Supabase al cargar el módulo: se mockea (mismo recurso que provisional.test.ts).
vi.mock('@/lib/supabase', () => ({ supabase: {}, sel: vi.fn() }))

import { ordenarHitos } from '@/lib/equipoV2'

// Hitos de equipo: del MÁS RECIENTE al más antiguo por fecha; mejor_temporada (sin fecha) al final de su temporada.
// codtemporada llega como TEXTO desde web_equipo_hitos.
const h = (tipo_hito: string, fecha: string | null, codtemporada: string) => ({ tipo_hito, fecha, codtemporada })

describe('hitos de equipo · orden', () => {
  // Orden de Supabase deliberadamente revuelto (lo más viejo primero).
  const crudo = [
    h('mayor_goleada', '18/09/2021', '17'),
    h('mejor_temporada', null, '18'),          // T18 = 2022-23 -> cierre 30/06/2023
    h('partidos_acumulados', '20/11/2022', '18'),
    h('mejor_racha', '14/05/2023', '18'),
    h('mayor_goleada', '05/10/2025', '21'),
  ]
  it('más reciente primero; mejor_temporada encabeza su temporada', () => {
    expect(ordenarHitos(crudo).map((x) => `${x.tipo_hito}@${x.fecha ?? 'T' + x.codtemporada}`)).toEqual([
      'mayor_goleada@05/10/2025',
      'mejor_temporada@T18',
      'mejor_racha@14/05/2023',
      'partidos_acumulados@20/11/2022',
      'mayor_goleada@18/09/2021',
    ])
  })
  it('control: el orden de entrada no cambia el resultado (es un orden, no el de Supabase)', () => {
    expect(ordenarHitos([...crudo].reverse())).toEqual(ordenarHitos(crudo))
  })
  it('empate de fecha -> orden fijo por tipo', () => {
    const r = ordenarHitos([h('partidos_acumulados', '01/02/2024', '19'), h('mayor_goleada', '01/02/2024', '19'), h('mejor_racha', '01/02/2024', '19')])
    expect(r.map((x) => x.tipo_hito)).toEqual(['mejor_racha', 'mayor_goleada', 'partidos_acumulados'])
  })
  it('sin fecha ni temporada -> al final; no muta la entrada', () => {
    const entrada = [h('mejor_temporada', null, null as any), h('mayor_goleada', '18/09/2021', '17')]
    expect(ordenarHitos(entrada).map((x) => x.tipo_hito)).toEqual(['mayor_goleada', 'mejor_temporada'])
    expect(entrada[0].tipo_hito).toBe('mejor_temporada')
  })
})
