import { describe, it, expect } from 'vitest'
import { organizadorCompeticion, sportsEventLd } from './jsonld'

// La tabla de organizadores NO tiene valor por defecto: una competición desconocida sale SIN organizer, no
// atribuida a la RFFM. El día que entre una competición de la RFEF (División de Honor Juvenil), esto es lo
// que evita publicar un organizador falso.
describe('organizadorCompeticion', () => {
  it('una competición publicada devuelve la RFFM con su url', () => {
    expect(organizadorCompeticion('3ª RFEF Madrid'))
      .toEqual({ name: 'Real Federación de Fútbol de Madrid', url: 'https://www.rffm.es' })
  })

  it('tolera espacios de más, que es lo único que normaliza', () => {
    expect(organizadorCompeticion('  2ª Juvenil Madrid  ')?.url).toBe('https://www.rffm.es')
  })

  it('competición que no está en la tabla -> null (NUNCA la RFFM por defecto)', () => {
    expect(organizadorCompeticion('División de Honor Juvenil')).toBeNull()
    expect(organizadorCompeticion('1ª RFEF')).toBeNull()
    expect(organizadorCompeticion(null)).toBeNull()
    expect(organizadorCompeticion('')).toBeNull()
  })
})

const BASE = {
  local: 'EQUIPO A', visitante: 'EQUIPO B',
  startDate: '2026-09-26T16:00:00+02:00',
  campo: 'CAMPO MUNICIPAL', campoCodigo: '2501',
}

describe('sportsEventLd y el organizador', () => {
  it('competición conocida -> organizer con name y url', () => {
    const n = sportsEventLd({ ...BASE, competicionNombre: '3ª RFEF Madrid' })
    expect(n?.organizer).toEqual({
      '@type': 'Organization', name: 'Real Federación de Fútbol de Madrid', url: 'https://www.rffm.es',
    })
  })

  it('competición DESCONOCIDA -> el evento se emite SIN organizer', () => {
    const n = sportsEventLd({ ...BASE, competicionNombre: 'División de Honor Juvenil' })
    expect(n).not.toBeNull()
    expect(n).not.toHaveProperty('organizer')
  })

  it('sin nombre de competición -> tampoco se inventa organizador', () => {
    expect(sportsEventLd(BASE)).not.toHaveProperty('organizer')
  })

  it('sigue sin emitirse nada sin hora o sin campo, y sin superEvent nunca', () => {
    expect(sportsEventLd({ ...BASE, startDate: null })).toBeNull()
    expect(sportsEventLd({ ...BASE, campo: null })).toBeNull()
    expect(sportsEventLd({ ...BASE, incidencia: 'local' })).toBeNull()
    expect(sportsEventLd({ ...BASE, competicion: '3ª RFEF · 2026-27' })).not.toHaveProperty('superEvent')
  })
})
