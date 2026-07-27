'use client'

import { useState } from 'react'
import Link from 'next/link'
import { LogIn, LogOut, ArrowRightLeft } from 'lucide-react'
import EscudoImg from '@/components/EscudoImg'
import NombreEquipo from '@/components/NombreEquipo'
import { formatNombre } from '@/lib/supabase'
import { jugadorHref } from '@/lib/jugador'
import Pastilla from '@/components/Pastilla'
import { fechaCortaYMD, tempLabel, type MovimientoRow, type FichaMov } from '@/lib/equipo'

// Altas/bajas del equipo. FICHAJE (entrante verde con procedencia / saliente rojo con destino) y,
// como categoría PROPIA y discreta, las PROMOCIONES INTERNAS (mismo club, otro equipo) — nunca
// mezcladas con los fichajes. Cada bloque colapsa a `inicial` con "ver los N".
// `fichas`: codjugador -> nombre canónico de web_jugador (quien tiene ficha). El nombre se muestra
// SIEMPRE con formatNombre (Nombre Apellidos); se enlaza solo si hay ficha (menores -> texto plano).

function Fila({ m, fichas }: { m: MovimientoRow; fichas: Record<string, FichaMov> }) {
  const entra = m.direccion === 'entra'
  const promo = m.clase === 'PROMOCION_INTERNA'
  const Icon = promo ? ArrowRightLeft : entra ? LogIn : LogOut
  const color = promo ? 'text-chalk-500 bg-pitch-700 ring-pitch-600' : entra ? 'text-grass-300 bg-grass-500/15 ring-grass-400/25' : 'text-red-300 bg-red-500/15 ring-red-500/25'
  const preposicion = entra ? 'desde' : 'a'
  const ficha = m.codjugador ? fichas[m.codjugador] : undefined
  const nombre = formatNombre(ficha?.nombre ?? m.nombre)
  const href = ficha?.enlazable && m.codjugador ? jugadorHref(m.codjugador, ficha.nombre) : null
  return (
    <li className="flex items-center gap-3 px-3 py-2 border-b border-pitch-700/50 last:border-0">
      <span className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center ring-1 ring-inset ${color}`}>
        <Icon className="w-3.5 h-3.5" strokeWidth={2.5} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          {/* Pastilla mini para quien tenga posición (adultos de web_jugador o menores de la plantilla
              juvenil); el enlace solo para quien tiene ficha (enlazable). */}
          {ficha?.pos && <Pastilla pos={ficha.pos} estimada={ficha.estimada} size="mini" />}
          <span className="text-sm font-display font-medium text-white truncate uppercase min-w-0">
            {href ? <Link href={href} className="hover:text-grass-300 hover:underline decoration-grass-500/60 underline-offset-2 transition-colors">{nombre}</Link> : nombre}
          </span>
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-chalk-600 min-w-0">
          {m.equipo_rel_cod ? (
            <>
              <span className="flex-shrink-0">{preposicion}</span>
              {m.equipo_rel_escudo && (
                <span className="inline-flex items-center justify-center w-4 h-4 bg-white rounded-sm flex-shrink-0 p-px">
                  <EscudoImg escudo={m.equipo_rel_escudo} nombre={m.equipo_rel_nombre ?? undefined} />
                </span>
              )}
              <span className="truncate text-chalk-500">
                <NombreEquipo codequipo={m.equipo_rel_cod} nombre={m.equipo_rel_nombre} />
              </span>
            </>
          ) : (
            <span className="text-chalk-600">{entra ? 'procedencia sin registro' : 'destino sin registro'}</span>
          )}
        </div>
      </div>
      <span className="flex-shrink-0 text-[11px] text-chalk-600 tabular-nums text-right">
        {m.fecha ? fechaCortaYMD(m.fecha) : (m.codtemporada ? tempLabel(m.codtemporada) : '')}
      </span>
    </li>
  )
}

function Bloque({ titulo, filas, inicial, discreto, fichas }: { titulo: string; filas: MovimientoRow[]; inicial: number; discreto?: boolean; fichas: Record<string, FichaMov> }) {
  const [abierto, setAbierto] = useState(false)
  if (filas.length === 0) return null
  const visibles = abierto ? filas : filas.slice(0, inicial)
  return (
    <div className={discreto ? 'mt-4' : ''}>
      <h3 className={`text-xs font-semibold mb-2 ${discreto ? 'text-chalk-600' : 'text-chalk-400'}`}>{titulo}</h3>
      <ol className="bg-pitch-800 rounded-xl border border-pitch-700">
        {visibles.map((m, i) => <Fila key={`${m.codjugador}-${m.direccion}-${m.codtemporada}-${i}`} m={m} fichas={fichas} />)}
      </ol>
      {filas.length > inicial && (
        <button type="button" onClick={() => setAbierto((v) => !v)}
          className="mt-1.5 text-xs font-medium text-grass-400 hover:text-grass-300 transition-colors">
          {abierto ? 'Ver menos' : `Ver los ${filas.length}`}
        </button>
      )}
    </div>
  )
}

export default function Movimientos({ fichajes, promociones, fichas }: { fichajes: MovimientoRow[]; promociones: MovimientoRow[]; fichas: Record<string, FichaMov> }) {
  if (fichajes.length === 0 && promociones.length === 0) {
    return <p className="text-sm text-chalk-600">Sin altas ni bajas registradas.</p>
  }
  return (
    <div>
      <Bloque titulo="Altas y bajas" filas={fichajes} inicial={6} fichas={fichas} />
      <Bloque titulo="Promociones internas" filas={promociones} inicial={4} discreto fichas={fichas} />
    </div>
  )
}
