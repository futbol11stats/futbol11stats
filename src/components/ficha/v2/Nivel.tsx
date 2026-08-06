import Sello from '@/components/Sello'
import Pastilla from '@/components/Pastilla'
import { PALETA_TEXTO, PALETA_FONDO, escalon } from '@/lib/escala'
import { POS_LABEL } from '@/lib/jugador'

// Fila de la retícula de rankings.
function RankRow({ insignia, texto, rank, total }: { insignia: React.ReactNode; texto: React.ReactNode; rank: number | null; total: number | null }) {
  if (!rank) return null
  return (
    <div className="flex items-center gap-2 py-1.5 border-b border-pitch-700/50 last:border-0">
      <span className="w-8 flex-shrink-0 flex items-center justify-center">{insignia}</span>
      <span className="flex-1 min-w-0 truncate text-chalk-500" style={{ fontSize: 'var(--t-cap)' }}>{texto}</span>
      <span className="flex-shrink-0 tabular-nums" style={{ fontSize: 'var(--t-sm)' }}>
        <span className="text-grass-400 font-bold">#{rank}</span>
        {total ? <span className="text-chalk-600"> / {total.toLocaleString('es-ES')}</span> : null}
      </span>
    </div>
  )
}

// Sección Nivel: ELO grande + percentil, batería de 10 segmentos, la frase de percentil y la retícula
// de rankings. Los cortes de ELO vienen de web_percentiles (ya validados aguas arriba).
export default function Nivel({ elo, percentil, cortesElo, categoria, posicion, estimada, ranks }: {
  elo: number | null; percentil: number | null
  cortesElo: readonly [number, number, number, number]
  categoria: string | null; posicion: string | null; estimada: boolean | null
  ranks: { general: [number | null, number | null]; categoria: [number | null, number | null]; posicion: [number | null, number | null] }
}) {
  const nivel = elo != null ? escalon(elo, cortesElo) : null
  const llenos = percentil != null ? Math.max(0, Math.min(10, Math.round(percentil / 10))) : 0

  return (
    <div className="rounded-xl border border-pitch-700 bg-pitch-800 px-4 py-4">
      <div className="flex items-end gap-3">
        <div className={`font-display font-bold tabular-nums leading-none ${nivel != null ? PALETA_TEXTO[nivel] : 'text-chalk-200'}`} style={{ fontSize: 'var(--n-lg)' }}>
          {elo != null ? Math.round(elo) : '—'}
        </div>
        <div className="pb-1">
          <div className="text-chalk-500 uppercase tracking-wide" style={{ fontSize: 'var(--t-micro)' }}>ELO</div>
          {percentil != null && <div className="text-chalk-300 tabular-nums" style={{ fontSize: 'var(--t-sm)' }}>Percentil {Math.round(percentil)}</div>}
        </div>
      </div>

      {/* Batería de diez segmentos */}
      <div className="mt-3 flex gap-1">
        {Array.from({ length: 10 }).map((_, i) => (
          <span key={i} className={`h-2.5 flex-1 rounded-sm ${i < llenos ? (nivel != null ? PALETA_FONDO[nivel] : 'bg-grass-500/40') : 'bg-pitch-700'}`} />
        ))}
      </div>

      {percentil != null && categoria && (
        <p className="mt-2 text-chalk-400" style={{ fontSize: 'var(--t-sm)' }}>
          Mejor que el <span className="text-white font-semibold tabular-nums">{Math.round(percentil)} %</span> de los jugadores de su categoría.
        </p>
      )}

      {/* Retícula de rankings */}
      <div className="mt-3 border-t border-pitch-700/60 pt-1">
        <RankRow rank={ranks.general[0]} total={ranks.general[1]}
          insignia={<span className="w-6 h-6 rounded-full bg-grass-500 flex items-center justify-center font-bold text-white leading-none" style={{ fontSize: 'var(--t-cap)' }}>11</span>}
          texto="Madrid (general)" />
        <RankRow rank={ranks.categoria[0]} total={ranks.categoria[1]}
          insignia={categoria ? <Sello nombreComp={categoria} size={18} /> : null} texto={categoria || 'Categoría'} />
        <RankRow rank={ranks.posicion[0]} total={ranks.posicion[1]}
          insignia={<Pastilla pos={posicion} estimada={!!estimada} size="mini" />}
          texto={posicion ? (POS_LABEL[posicion] || posicion) : 'Posición'} />
      </div>
    </div>
  )
}
