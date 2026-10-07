import { describe, it, expect } from 'vitest'
import { jornadaSegValida } from '@/lib/competiciones'

// El eje [jornada] aceptaba CUALQUIER cosa: `jornada-999` y `jornada-abc` devolvían 200 con un cuerpo del
// mismo tamaño que la jornada real (medido), y en copa un slug de ronda inexistente caía a la ronda actual.
// Lo que estos casos fijan es la frontera: qué sigue siendo 200 y qué pasa a 404.

const LIGA = { tipo: 'LIGA', total_jornadas: 30 }
const COPA = {
  tipo: 'COPA',
  total_jornadas: 4,
  rondas: [
    { n: 1, idx: 1, slug: 'dieciseisavos', label: 'Dieciseisavos' },
    { n: 2, idx: 2, slug: 'octavos', label: 'Octavos' },
    { n: 3, idx: 3, slug: 'semifinales', label: 'Semifinales' },
    { n: 4, idx: 4, slug: 'final', label: 'Final' },
  ],
}

describe('jornadaSegValida · liga', () => {
  it('acepta una jornada jugada', () => expect(jornadaSegValida('jornada-4', LIGA)).toBe(true))
  it('acepta el tope exacto', () => expect(jornadaSegValida('jornada-30', LIGA)).toBe(true))
  it('ACEPTA una jornada futura que está en el calendario: existe, solo no tiene datos aún, y tiene visitas reales', () =>
    expect(jornadaSegValida('jornada-29', LIGA)).toBe(true))
  it('rechaza por encima del tope', () => expect(jornadaSegValida('jornada-31', LIGA)).toBe(false))
  it('rechaza el absurdo que devolvía 200', () => expect(jornadaSegValida('jornada-999', LIGA)).toBe(false))
  it('rechaza lo no numérico', () => expect(jornadaSegValida('jornada-abc', LIGA)).toBe(false))
  it('rechaza un segmento con otra forma', () => expect(jornadaSegValida('final', LIGA)).toBe(false))
  it('rechaza el prefijo suelto', () => expect(jornadaSegValida('jornada-', LIGA)).toBe(false))
  it('rechaza negativos (el signo no es numérico para el patrón)', () => expect(jornadaSegValida('jornada--3', LIGA)).toBe(false))
  it('acepta el 0 histórico del time-machine: su canonical ya colapsa a la actual, y un 404 rompería enlaces viejos', () =>
    expect(jornadaSegValida('jornada-0', LIGA)).toBe(true))
  it('sin total_jornadas solo sobrevive el 0 (no se inventa un tope)', () => {
    expect(jornadaSegValida('jornada-1', { tipo: 'LIGA', total_jornadas: null })).toBe(false)
    expect(jornadaSegValida('jornada-0', { tipo: 'LIGA', total_jornadas: null })).toBe(true)
  })
})

describe('jornadaSegValida · copa por familia', () => {
  it('acepta un slug de ronda real', () => expect(jornadaSegValida('final', COPA)).toBe(true))
  it('acepta otro slug de ronda real', () => expect(jornadaSegValida('semifinales', COPA)).toBe(true))
  it('rechaza un slug de ronda inventado, que antes caía a la ronda actual', () =>
    expect(jornadaSegValida('cuartos-inventados', COPA)).toBe(false))
  it('acepta jornada-N dentro del nº de rondas (URLs viejas de copa antes de los slugs)', () =>
    expect(jornadaSegValida('jornada-3', COPA)).toBe(true))
  it('rechaza jornada-N por encima del nº de rondas', () => expect(jornadaSegValida('jornada-5', COPA)).toBe(false))
  it('el tope lo manda el nº de RONDAS, no total_jornadas', () => {
    expect(jornadaSegValida('jornada-4', { ...COPA, total_jornadas: 99 })).toBe(true)
    expect(jornadaSegValida('jornada-9', { ...COPA, total_jornadas: 99 })).toBe(false)
  })
})
