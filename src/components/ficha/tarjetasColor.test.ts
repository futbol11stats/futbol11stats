import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// Las tarjetas se pintan con --card-y / --card-r en todo el sitio. --e0 es el rojo de los valores NEGATIVOS
// (perdió, baja, encajados): una roja con --e0 sale de otro tono que en la ficha de jugador y la portada.
const SRC = join(__dirname, '..', '..')
const ficheros = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n)
  return statSync(p).isDirectory() ? ficheros(p) : /\.(tsx|css)$/.test(n) ? [p] : []
})

describe('color de las tarjetas', () => {
  it('ningún icono de tarjeta dentro de un estilo con --e0', () => {
    const malos = ficheros(SRC).filter((f) => f.endsWith('.tsx')).flatMap((f) =>
      // style={{ color: 'var(--e0)', … }}><TarjetaRoja …
      Array.from(readFileSync(f, 'utf8').matchAll(/var\(--e0\)[^<>]*>\s*<Tarjeta\w*/g)).map((m) => `${relative(SRC, f)}: ${m[0]}`))
    expect(malos).toEqual([])
  })
  it('ninguna regla CSS de eventos de tarjeta (ev-ta, ev-td, ev-tr) con --e0', () => {
    const malos = ficheros(SRC).filter((f) => f.endsWith('.css')).flatMap((f) =>
      Array.from(readFileSync(f, 'utf8').matchAll(/([^{}]+)\{([^{}]*)\}/g))
        .filter((m) => /\.ev-t[adr]\b/.test(m[1]) && m[2].includes('--e0'))
        .map((m) => `${relative(SRC, f)}: ${m[1].trim()}`))
    expect(malos).toEqual([])
  })
})
