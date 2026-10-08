import { describe, it, expect } from 'vitest'
import { PAGINA_RETIRADA } from '@/lib/paginaRetirada'
import tailwind from '../../tailwind.config.js'

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

// --------------------------------------------------------------------------------------------------
// DERIVA DE LA PALETA.
//
// Esta página no puede usar Tailwind (el middleware corre en el edge, antes de renderizar), así que lleva
// los colores escritos a mano. Eso la convierte en un VALOR SIN MANTENEDOR: si alguien cambia la paleta en
// tailwind.config.js, el sitio entero cambia y esta página se queda con los colores viejos, sin que nada
// avise. Es la misma familia de fallo que el canonical que salía de un grupo arbitrario y que los
// comentarios que sobreviven a su verdad: algo correcto el día que se escribió, que deja de serlo sin
// romperse.
//
// Lo que hace este bloque es ponerle un mantenedor: cambiar la paleta rompe el test.
const paleta = (tailwind as any).theme.extend.colors as Record<string, Record<string, string>>

// exec en bucle y no [...matchAll()]: el target de tsconfig no permite recorrer el iterador (TS2802).
function tokensDeLaPagina(): Array<[string, string, string]> {
  const root = PAGINA_RETIRADA.match(/:root\{([^}]*)\}/)
  if (!root) return []
  const re = /--([a-z]+)-(\d+):\s*(#[0-9a-fA-F]{3,8})/g
  const out: Array<[string, string, string]> = []
  let m: RegExpExecArray | null
  while ((m = re.exec(root[1])) !== null) out.push([m[1], m[2], m[3].toLowerCase()])
  return out
}

describe('página de ficha retirada · la paleta no puede derivar en silencio', () => {
  it('declara sus colores como tokens en :root (si desaparecen, el resto del bloque no probaría nada)', () => {
    expect(tokensDeLaPagina().length).toBeGreaterThanOrEqual(7)
  })

  it.each(tokensDeLaPagina())('--%s-%s vale lo mismo que en tailwind.config.js', (familia, tono, valor) => {
    const esperado = paleta[familia]?.[tono]
    expect(esperado, `la paleta ya no tiene ${familia}-${tono}: o se renombró, o esta página quedó huérfana`).toBeDefined()
    expect(valor).toBe(String(esperado).toLowerCase())
  })

  it('no hay NINGÚN color suelto fuera de :root que se salte la comprobación anterior', () => {
    // Si se escribe un hex directamente en una regla, los casos de arriba no lo ven y la deriva vuelve por
    // la puerta de atrás. Solo se admite el blanco puro, que no sale de la paleta.
    const sinRoot = PAGINA_RETIRADA.replace(/:root\{[^}]*\}/, '')
    const re = /#[0-9a-fA-F]{3,8}\b/g
    const sueltos: string[] = []
    let m: RegExpExecArray | null
    while ((m = re.exec(sinRoot)) !== null) {
      const c = m[0].toLowerCase()
      if (c !== '#fff' && c !== '#ffffff') sueltos.push(c)
    }
    expect(sueltos, 'usa una variable de :root en lugar de un hex literal').toEqual([])
  })
})
