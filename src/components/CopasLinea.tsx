import Link from 'next/link'
import Sello from '@/components/Sello'
import { nombreCortoCopa } from '@/lib/sellos'
import type { CopaEquipo } from '@/lib/equipo'

// Línea de pastillas de COPA de la temporada en curso (hero de equipo y de jugador).
// Cada pastilla: sello de la copa + nombre corto + estado ("Copa RFFM · Cuartos"), enlazada a
// la vista de esa copa. Sin copas -> no renderiza nada (el hero no muestra la línea).
export default function CopasLinea({ copas, className = '' }: { copas: CopaEquipo[]; className?: string }) {
  if (!copas || copas.length === 0) return null
  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {copas.map((c, i) => {
        const inner = (
          <>
            <Sello nombreComp={c.nombre_comp} size={18} />
            <span className="font-display uppercase tracking-tight">{nombreCortoCopa(c.nombre_comp)}</span>
            {c.estado && <span className="text-chalk-500 font-body normal-case">· {c.estado}</span>}
          </>
        )
        const cls = 'inline-flex items-center gap-1.5 pl-1 pr-2 py-0.5 rounded-full bg-pitch-700/60 ring-1 ring-inset ring-pitch-600 text-xs text-chalk-200'
        return c.href ? (
          <Link key={i} href={c.href} className={`${cls} hover:ring-grass-500/50 hover:text-white transition-colors`}>{inner}</Link>
        ) : (
          <span key={i} className={cls}>{inner}</span>
        )
      })}
    </div>
  )
}
