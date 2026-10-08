import { describe, it, expect } from 'vitest'
import { PAGINA_RETIRADA } from '@/lib/paginaRetirada'

// Esta página existe porque alguien pidió no estar publicado. Lo que estos casos protegen no es el aspecto,
// es que no se filtre el nombre y que no se le quite el control al visitante.

describe('página de ficha retirada · lo que NO debe llevar', () => {
  it('es una CONSTANTE, no una función: no hay forma de pasarle el nombre ni el slug', () => {
    expect(typeof PAGINA_RETIRADA).toBe('string')
  })

  it('el título es genérico y no identifica a nadie', () => {
    const t = PAGINA_RETIRADA.match(/<title>([^<]*)<\/title>/)
    expect(t?.[1]).toBe('Ficha no disponible | Fútbol11Stats')
  })

  it('no emite og:title ni ningún metadato que pudiera arrastrar el nombre', () => {
    expect(PAGINA_RETIRADA).not.toMatch(/property="og:/)
    expect(PAGINA_RETIRADA).not.toMatch(/name="description"/)
  })

  it('NO lleva redirección automática: ni meta refresh, ni location, ni temporizador', () => {
    expect(PAGINA_RETIRADA).not.toMatch(/http-equiv="refresh"/i)
    expect(PAGINA_RETIRADA).not.toMatch(/location\s*[.=]/)
    expect(PAGINA_RETIRADA).not.toMatch(/setTimeout|setInterval/)
  })

  it('no lleva script alguno (el cuerpo de un 410 no debe ejecutar nada)', () => {
    expect(PAGINA_RETIRADA).not.toMatch(/<script/i)
  })
})

describe('página de ficha retirada · lo que SÍ debe llevar', () => {
  it('noindex en el cuerpo, además del que va en cabecera', () => {
    expect(PAGINA_RETIRADA).toMatch(/<meta name="robots" content="noindex/)
  })

  it('la marca del sitio, para que se vea que la página es nuestra', () => {
    expect(PAGINA_RETIRADA).toMatch(/Fútbol<b>11<\/b>Stats/)
  })

  it('enlace a la portada y a la búsqueda', () => {
    expect(PAGINA_RETIRADA).toMatch(/href="\/"/)
    expect(PAGINA_RETIRADA).toMatch(/href="\/buscar"/)
  })

  it('dice que la retirada es permanente, que es lo que de verdad ocurrió', () => {
    expect(PAGINA_RETIRADA).toMatch(/permanente/)
  })

  it('es autosuficiente: lleva sus estilos dentro y no depende de la hoja del sitio', () => {
    expect(PAGINA_RETIRADA).toMatch(/<style>/)
    expect(PAGINA_RETIRADA).not.toMatch(/<link[^>]+stylesheet/)
  })

  it('cabe de sobra en una respuesta de edge', () => {
    expect(PAGINA_RETIRADA.length).toBeLessThan(8000)
  })
})
