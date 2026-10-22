import { describe, it, expect } from 'vitest'
import { hayQueDesempatar, elegirGrupo, dedupeGruposPorSlug } from '@/lib/grupoUnico'

// CONTROL POSITIVO OBLIGATORIO, y la razón de que estos tests existan con datos inventados:
//
// Hoy NO queda ni un par duplicado en las seis temporadas publicadas — el pipeline retiró el cascarón el
// 22/10/2026. Así que una comprobación contra el dato real NO PUEDE FALLAR, y un cheque que no puede fallar
// no prueba nada: pasaría igual con las funciones vacías.
//
// Por eso el caso REAL se reconstruye sintéticamente: las dos filas de `JUVENIL/segunda/grupo-9` de T22, una
// con clasificación (27119635) y el cascarón sin ella (27085485), y se comprueba que desempatan y deduplican
// DE VERDAD. Y el negativo: con una sola fila nada cambia y no se pide la consulta extra.

// Las dos filas tal como estaban en web_grupos el 22/10/2026.
const CASCARON = { codgrupo: '27085485', slug_comp: 'segunda', slug_grupo: 'grupo-9', jornada_actual: 4 }
const BUENA = { codgrupo: '27119635', slug_comp: 'segunda', slug_grupo: 'grupo-9', jornada_actual: 4 }
// Solo la buena tenía filas en web_clasificacion (60, hasta la J4). El cascarón tenía 0.
const CON_CLASIF = new Set(['27119635'])

describe('hayQueDesempatar — la consulta extra solo cuando hace falta', () => {
  it('con una sola fila dice que NO (hoy, las 528 claves publicadas)', () => {
    expect(hayQueDesempatar([BUENA])).toBe(false)
  })
  it('con cero filas dice que NO', () => {
    expect(hayQueDesempatar([])).toBe(false)
  })
  it('con dos filas dice que SÍ', () => {
    expect(hayQueDesempatar([CASCARON, BUENA])).toBe(true)
  })
})

describe('elegirGrupo — CONTROL POSITIVO: el caso real, reconstruido', () => {
  it('elige la fila CON clasificación y descarta el cascarón', () => {
    expect(elegirGrupo([CASCARON, BUENA], CON_CLASIF)?.codgrupo).toBe('27119635')
  })

  it('y lo hace venga en el orden que venga de la base (era justo lo que no estaba decidido)', () => {
    expect(elegirGrupo([BUENA, CASCARON], CON_CLASIF)?.codgrupo).toBe('27119635')
    expect(elegirGrupo([CASCARON, BUENA], CON_CLASIF)?.codgrupo).toBe('27119635')
  })

  it('FALLA con la lógica vieja: data[0] habría devuelto el cascarón', () => {
    // Guardia del propio control: si esto dejara de ser cierto, el test de arriba no probaría nada.
    expect([CASCARON, BUENA][0].codgrupo).toBe('27085485')
    expect(elegirGrupo([CASCARON, BUENA], CON_CLASIF)?.codgrupo).not.toBe('27085485')
  })

  it('sin discriminador (NINGUNA tiene clasificación) sigue siendo estable, no aleatorio', () => {
    const vacio = new Set<string>()
    expect(elegirGrupo([CASCARON, BUENA], vacio)?.codgrupo).toBe('27085485')   // el menor
    expect(elegirGrupo([BUENA, CASCARON], vacio)?.codgrupo).toBe('27085485')   // el mismo, al revés
  })

  it('`fam-*` sigue ganando: la regla de copa que ya existía no se toca', () => {
    const familia = { codgrupo: 'fam-copa-rffm-t22', slug_comp: 'copa-rffm', slug_grupo: 'copa' }
    const viejo = { codgrupo: '9988776', slug_comp: 'copa-rffm', slug_grupo: 'copa' }
    // Gana la familia AUNQUE la vieja sea la que tiene clasificación.
    expect(elegirGrupo([viejo, familia], new Set(['9988776']))?.codgrupo).toBe('fam-copa-rffm-t22')
  })
})

describe('elegirGrupo — CONTROL NEGATIVO: con una sola fila no cambia nada', () => {
  it('la devuelve sin mirar siquiera conClasif', () => {
    const vacio = new Set<string>()
    expect(elegirGrupo([BUENA], vacio)?.codgrupo).toBe('27119635')
    expect(elegirGrupo([CASCARON], vacio)?.codgrupo).toBe('27085485')
  })
  it('sin filas devuelve null (lo que la ruta convierte en 404)', () => {
    expect(elegirGrupo([], CON_CLASIF)).toBeNull()
  })
})

describe('dedupeGruposPorSlug — CONTROL POSITIVO: la pastilla doble del índice', () => {
  it('dos filas del mismo slug dejan UNA pastilla', () => {
    const out = dedupeGruposPorSlug([CASCARON, BUENA])
    expect(out).toHaveLength(1)
  })

  it('FALLA sin dedupe: la entrada traía dos, que es lo que se veía en /madrid/juveniles', () => {
    expect([CASCARON, BUENA]).toHaveLength(2)
    expect(dedupeGruposPorSlug([CASCARON, BUENA]).length).toBeLessThan(2)
  })

  it('NO colapsa dos grupos homónimos de competiciones distintas', () => {
    // La trampa de deduplicar por `slug_grupo` a secas: 'grupo-9' existe en varias competiciones.
    const otro = { codgrupo: '555', slug_comp: 'primera', slug_grupo: 'grupo-9', jornada_actual: 6 }
    const out = dedupeGruposPorSlug([BUENA, otro])
    expect(out).toHaveLength(2)
    expect(out.map((g) => g.slug_comp).sort()).toEqual(['primera', 'segunda'])
  })

  it('conserva el orden de entrada de las claves', () => {
    const a = { codgrupo: '1', slug_comp: 'segunda', slug_grupo: 'grupo-1', jornada_actual: 2 }
    const b = { codgrupo: '2', slug_comp: 'segunda', slug_grupo: 'grupo-2', jornada_actual: 2 }
    expect(dedupeGruposPorSlug([b, a, b]).map((g) => g.slug_grupo)).toEqual(['grupo-2', 'grupo-1'])
  })

  it('sobrevive la de jornada_actual mayor (es lo que pinta la pastilla)', () => {
    const atrasada = { codgrupo: '1', slug_comp: 'segunda', slug_grupo: 'grupo-9', jornada_actual: 1 }
    const avanzada = { codgrupo: '2', slug_comp: 'segunda', slug_grupo: 'grupo-9', jornada_actual: 6 }
    expect(dedupeGruposPorSlug([atrasada, avanzada])[0].codgrupo).toBe('2')
    expect(dedupeGruposPorSlug([avanzada, atrasada])[0].codgrupo).toBe('2')
  })
})

describe('dedupeGruposPorSlug — CONTROL NEGATIVO: sin duplicados no toca nada', () => {
  it('devuelve lo mismo y en el mismo orden', () => {
    const lista = [
      { codgrupo: '1', slug_comp: 'segunda', slug_grupo: 'grupo-1', jornada_actual: 4 },
      { codgrupo: '2', slug_comp: 'segunda', slug_grupo: 'grupo-2', jornada_actual: 4 },
      { codgrupo: '3', slug_comp: 'primera', slug_grupo: 'grupo-1', jornada_actual: 6 },
    ]
    expect(dedupeGruposPorSlug(lista)).toEqual(lista)
  })
})
