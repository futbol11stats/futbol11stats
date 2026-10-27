import { describe, it, expect, vi } from 'vitest'

// equipoV2.ts crea el cliente de Supabase al cargar el módulo: se mockea (mismo recurso que provisional.test.ts).
vi.mock('@/lib/supabase', () => ({ supabase: {}, sel: vi.fn() }))

import { rankFacetas } from '@/lib/equipoV2'

// "Ranking por faceta · en su grupo": el RETIRADO (web_clasificacion.retirado) no entra. Caso real Pref. Juvenil G5:
// el retirado tiene GC 21 y adelantaba en "menos goles en contra" a un equipo con GC 29.
const fila = (codequipo: string, gf: number, gc: number, pts_fantasy: number, retirado = false) => ({ codequipo, gf, gc, pts_fantasy, retirado })
const grupo = [fila('A', 26, 4, 510), fila('B', 10, 29, 129), fila('C', 15, 22, 154), fila('RET', 0, 21, 0, true)]

describe('ranking por faceta · sin el retirado', () => {
  it('los demás se ordenan sin él (GC: B pasa de 4º a 3º)', () => {
    expect(rankFacetas(grupo, 'B')).toEqual({ gf: 3, gc: 3, ptsFan: 3, n: 3 })
  })
  it('control: el mismo grupo sin la marca SÍ lo cuenta', () => {
    expect(rankFacetas(grupo.map((r) => ({ ...r, retirado: false })), 'B').gc).toBe(4)
  })
  it('en su propia ficha no hay ranking (n=0 -> el bloque no se pinta)', () => {
    expect(rankFacetas(grupo, 'RET')).toEqual({ gf: null, gc: null, ptsFan: null, n: 0, retirado: true })
  })
})
