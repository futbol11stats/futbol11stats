'use client'

import { Users, ArrowRightLeft } from 'lucide-react'
import Plantilla, { type PlantillaRow } from './Plantilla'
import Movimientos from './Movimientos'
import { tempLabel, type MovimientoRow } from '@/lib/equipo'
import { useTemporada } from './TemporadaContext'

// Pastillas de temporada (client): filtran PLANTILLA y ALTAS/BAJAS a la temporada elegida (estado
// compartido vía TemporadaContext con el Top 5 del aside). Al cambiar de temporada se remonta cada
// bloque (key=sel) para resetear los "ver más".
export default function EquipoTemporadas({
  plantilla, fichajes, promociones, fichas, nota, completa,
}: {
  plantilla: PlantillaRow[]            // todas las temporadas (cada fila con codtemporada)
  fichajes: MovimientoRow[]
  promociones: MovimientoRow[]
  fichas: Record<string, string>       // codjugador -> nombre canónico (para movimientos)
  nota?: string
  completa?: boolean                   // aficionados: plantilla con PTS/ELO
}) {
  const { sel, setSel, temporadas } = useTemporada()
  const plantillaSel = plantilla.filter((r) => String(r.codtemporada) === String(sel))
  const fichajesSel = fichajes.filter((m) => String(m.codtemporada) === String(sel))
  const promoSel = promociones.filter((m) => String(m.codtemporada) === String(sel))

  return (
    <div className="space-y-8">
      {/* Pastillas de temporada */}
      {temporadas.length > 1 && (
        <div className="scroll-row gap-1.5">
          {temporadas.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setSel(t)}
              className={`text-xs px-3 py-1.5 rounded-md transition-colors ${
                String(t) === String(sel)
                  ? 'bg-grass-500 text-white font-semibold'
                  : 'bg-pitch-700 text-chalk-600 hover:text-white'
              }`}
            >
              {tempLabel(t)}
            </button>
          ))}
        </div>
      )}

      {/* Plantilla */}
      <section>
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">
          <Users className="w-3.5 h-3.5 text-grass-400" strokeWidth={2.5} /> Plantilla
          <span className="text-chalk-600 font-normal normal-case tracking-normal">· {tempLabel(sel)}</span>
        </h2>
        <Plantilla key={sel} filas={plantillaSel} nota={nota} completa={completa} />
      </section>

      {/* Altas y bajas */}
      <section>
        <h2 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2">
          <ArrowRightLeft className="w-3.5 h-3.5 text-grass-400" strokeWidth={2.5} /> Altas y bajas
          <span className="text-chalk-600 font-normal normal-case tracking-normal">· {tempLabel(sel)}</span>
        </h2>
        {fichajesSel.length > 0 || promoSel.length > 0 ? (
          <Movimientos key={sel} fichajes={fichajesSel} promociones={promoSel} fichas={fichas} />
        ) : (
          <p className="text-sm text-chalk-600">Sin altas ni bajas en {tempLabel(sel)}.</p>
        )}
      </section>
    </div>
  )
}
