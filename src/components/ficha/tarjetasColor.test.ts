import { describe, it, expect } from 'vitest'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

// Las tarjetas se pintan con --card-y / --card-r en todo el sitio, y solo ellas. --e0 es el rojo de los valores
// NEGATIVOS (perdió, baja, encajados): una roja con --e0 sale de otro tono que en la ficha de jugador y la portada,
// y un negativo con --card-r parece una tarjeta. Los colores de tarjeta se definen UNA vez, en globals.css.
const SRC = join(__dirname, '..', '..')
const GLOBALS = join(SRC, 'app', 'globals.css')
const ficheros = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n)
  return statSync(p).isDirectory() ? ficheros(p) : /\.(tsx?|css)$/.test(n) && !/\.test\.tsx?$/.test(n) ? [p] : []
})
const TODOS = ficheros(SRC)
const lineas = (f: string) => readFileSync(f, 'utf8').split(/\r?\n/)
// Lo que cuenta como «hablar de tarjetas» en una línea: un icono, la palabra o las clases de evento de tarjeta.
const DE_TARJETA = /Tarjeta|amarilla|roja|doble|\.ev-t[adr]\b/i
// Hex con color (no los grises casi negros/blancos de texto, como #08111f): canal máx − mín >= 40.
const conColor = (h: string) => {
  const x = h.length === 4 ? h.slice(1).split('').map((c) => c + c).join('') : h.slice(1)
  const c = [0, 2, 4].map((i) => parseInt(x.slice(i, i + 2), 16))
  return Math.max(...c) - Math.min(...c) >= 40
}
const esComentario = (l: string) => /^\s*(\/\/|\/\*|\*)/.test(l)

describe('color de las tarjetas', () => {
  it('ningún icono de tarjeta dentro de un estilo con --e0', () => {
    const malos = TODOS.filter((f) => f.endsWith('.tsx')).flatMap((f) =>
      // style={{ color: 'var(--e0)', … }}><TarjetaRoja …
      Array.from(readFileSync(f, 'utf8').matchAll(/var\(--e0\)[^<>]*>\s*<Tarjeta\w*/g)).map((m) => `${relative(SRC, f)}: ${m[0]}`))
    expect(malos).toEqual([])
  })
  it('ninguna regla CSS de eventos de tarjeta (ev-ta, ev-td, ev-tr) con --e0', () => {
    const malos = TODOS.filter((f) => f.endsWith('.css')).flatMap((f) =>
      Array.from(readFileSync(f, 'utf8').matchAll(/([^{}]+)\{([^{}]*)\}/g))
        .filter((m) => /\.ev-t[adr]\b/.test(m[1]) && m[2].includes('--e0'))
        .map((m) => `${relative(SRC, f)}: ${m[1].trim()}`))
    expect(malos).toEqual([])
  })
  it('--card-r solo en tarjetas: cada uso tiene un icono o la palabra en esa línea o las dos siguientes', () => {
    const malos = TODOS.filter((f) => f !== GLOBALS).flatMap((f) => {
      const ls = lineas(f)
      return ls.flatMap((l, i) => l.includes('var(--card-r)') && !DE_TARJETA.test(ls.slice(i, i + 3).join('\n'))
        ? [`${relative(SRC, f)}:${i + 1}: ${l.trim()}`] : [])
    })
    expect(malos).toEqual([])
  })
  it('ningún color de tarjeta fijo en hexadecimal fuera de globals.css', () => {
    const g = readFileSync(GLOBALS, 'utf8')
    const hex = ['--card-y', '--card-r'].map((v) => g.match(new RegExp(`${v}:\\s*(#[0-9a-fA-F]{3,8})`))?.[1]?.toLowerCase())
    expect(hex.every(Boolean)).toBe(true)
    const malos = TODOS.filter((f) => f !== GLOBALS).flatMap((f) => {
      const ls = lineas(f)
      const cerca = (i: number) => DE_TARJETA.test(ls.slice(Math.max(0, i - 2), i + 3).join('\n'))
      return ls.flatMap((l, i) => {
        if (esComentario(l)) return []
        const h = (l.match(/#[0-9a-fA-F]{6}\b|#[0-9a-fA-F]{3}\b/g) || []).filter(conColor)
        if (!h.length) return []
        // 1) El valor exacto de globals en cualquier sitio. 2) Un hex con color cerca de una tarjeta (±2 líneas).
        // 3) Una constante con hex que se USA cerca de una tarjeta (así se escapaba `const YEL = '#d9a400'`,
        //    declarada lejos de las amarillas que pintaba).
        const nombre = l.match(/\bconst\s+(\w+)\s*=/)?.[1]
        const usoCerca = !!nombre && ls.some((u, j) => j !== i && new RegExp(`\\b${nombre}\\b`).test(u) && cerca(j))
        return h.some((x) => hex.includes(x.toLowerCase())) || cerca(i) || usoCerca
          ? [`${relative(SRC, f)}:${i + 1}: ${l.trim()}`] : []
      })
    })
    expect(malos).toEqual([])
  })
})
