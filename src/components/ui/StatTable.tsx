import type { ReactNode } from 'react'
import { escudoUrl } from '@/lib/supabase'
import type { FichaInfo } from '@/lib/jugador'
import EscudoImg from '@/components/EscudoImg'
import NombreJugador from '@/components/NombreJugador'
import NombreEquipo from '@/components/NombreEquipo'
import Pastilla from '@/components/Pastilla'
import { GrupoBadge } from '@/components/tablas'

// Tabla de estadísticas ÚNICA del sitio, dirigida por CONFIG de columnas. Sustituye a las ~11 tablas
// gemelas de tablas.tsx (goleadores, PF, ELO, tarjetas, XI óptimo, top5…), que solo se diferenciaban en
// las columnas de métrica y el orden. La IDENTIDAD (rango + escudo + pastilla + nombre + grupo) es fija:
// se renderiza SIEMPRE igual, a través de los mismos átomos que el resto del sitio.
//
// REFLOW MÓVIL (lo delicado): la columna de identidad queda FIJA (sticky, left:0) y las métricas hacen
// scroll horizontal por debajo. Antes el móvil OCULTABA columnas (`hidden md:table-cell`) y TRUNCABA el
// nombre (`.col-nombre` con max-width) — se rompía la regla de oro nº2. Aquí el nombre va `nowrap` con
// ancho NATURAL: cabe entero a cualquier anchura; si no cabe la métrica, se descubre haciendo scroll,
// nunca comiéndose el nombre. Ver MANUAL_DE_ESTILO.md.

type Fichas = Map<string, FichaInfo> | null | undefined

export type StatCol<T> = {
  key: string
  head: ReactNode                 // contenido del <th> (texto o icono de tarjeta)
  title?: string                  // tooltip para cabeceras-icono
  cell: (r: T) => ReactNode
  align?: 'left' | 'center'       // por defecto center
  accent?: boolean                // métrica principal: cabecera grass-400 + valor bold blanco
}

export type StatIdent<T> = {
  head?: string                                            // 'Jugador' | 'Equipo' (por defecto Jugador)
  rank?: (r: T, i: number) => ReactNode                    // rango, dentro de la celda fija
  cod?: (r: T) => string | number | null | undefined       // codjugador/codequipo -> enlace/fichas
  nombre: (r: T) => string
  pos?: (r: T) => { pos: string | null; estimada?: boolean } | null  // pastilla (solo jugador)
  escudo?: (r: T) => string | null | undefined
  grupo?: (r: T) => { label: string; href: string } | undefined
  team?: boolean                                           // identidad = equipo (NombreEquipo, sin pastilla)
  // Columna "Equipo" (texto) que sigue a la identidad; en móvil se alcanza con scroll (antes se ocultaba).
  equipoNombre?: (r: T) => string | null | undefined
  equipoCod?: (r: T) => string | number | null | undefined
}

export type StatTableProps<T> = {
  rows: T[]
  cols: StatCol<T>[]
  rowKey: (r: T, i: number) => string
  ident: StatIdent<T>
  fichas?: Fichas
  leyenda?: ReactNode
  empty?: string
}

export default function StatTable<T>({ rows, cols, rowKey, ident, fichas, leyenda, empty = 'Sin datos' }: StatTableProps<T>) {
  const hasEquipo = !!ident.equipoNombre
  const total = 1 + (hasEquipo ? 1 : 0) + cols.length
  return (
    <>
      <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-x-auto">
        <table className="w-full tabla-clasificacion st">
          <thead>
            <tr className="border-b border-pitch-700">
              <th className="st-id text-left">{ident.head ?? (ident.team ? 'Equipo' : 'Jugador')}</th>
              {hasEquipo && <th className="text-left">Equipo</th>}
              {cols.map((c) => (
                <th key={c.key} title={c.title}
                  className={`${c.align === 'left' ? 'text-left' : 'text-center'} ${c.accent ? 'text-grass-400' : ''}`}>
                  {c.head}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const cod = ident.cod?.(r) ?? null
              const nombre = ident.nombre(r)
              const posInfo = ident.pos?.(r)
              const esc = ident.escudo?.(r) ?? null
              const grupo = ident.grupo?.(r)
              return (
                <tr key={rowKey(r, i)} className="border-b border-pitch-700/50 last:border-0">
                  <td className="st-id col-nombre font-medium text-white">
                    <span className="flex items-center gap-2 min-w-0">
                      {ident.rank && <span className="st-rk font-mono text-xs text-chalk-600 flex-shrink-0">{ident.rank(r, i)}</span>}
                      {escudoUrl(esc) && (
                        <span className="escudo-box inline-flex items-center justify-center w-7 h-7 bg-white rounded-sm flex-shrink-0 p-0.5">
                          <EscudoImg escudo={esc} nombre={nombre} />
                        </span>
                      )}
                      {posInfo && !ident.team && <Pastilla pos={posInfo.pos} estimada={posInfo.estimada} size="mini" />}
                      <span className="st-nm">
                        {ident.team
                          ? <NombreEquipo codequipo={cod as string | undefined} nombre={nombre} />
                          : <NombreJugador codjugador={cod as string | number} nombre={nombre} fichas={fichas} />}
                      </span>
                      {grupo && <GrupoBadge grupo={grupo} />}
                    </span>
                  </td>
                  {hasEquipo && (
                    <td className="text-chalk-600 text-xs whitespace-nowrap">
                      <NombreEquipo codequipo={ident.equipoCod?.(r) as string | undefined} nombre={ident.equipoNombre!(r) ?? ''} />
                    </td>
                  )}
                  {cols.map((c) => (
                    <td key={c.key} className={`${c.align === 'left' ? 'text-left' : 'text-center'} ${c.accent ? 'font-bold text-white' : 'text-chalk-600'}`}>
                      {c.cell(r)}
                    </td>
                  ))}
                </tr>
              )
            })}
            {rows.length === 0 && (
              <tr><td colSpan={total} className="text-chalk-600 text-sm text-center py-8">{empty}</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {leyenda && <p className="mt-2 text-xs text-chalk-600 leading-relaxed">{leyenda}</p>}
    </>
  )
}
