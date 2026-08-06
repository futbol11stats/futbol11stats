import FormaHero from '@/components/equipo/FormaHero'
import { PALETA_TEXTO, escalon, CORTES_FIJOS } from '@/lib/escala'
import type { Ventana } from '@/lib/jugadorV2'
import type { ChipRacha } from '@/lib/equipo'

function claseMedia(m: number | null): string {
  return m == null ? 'text-chalk-500' : PALETA_TEXTO[escalon(m, CORTES_FIJOS.mediaPartido)]
}
const signoDelta = (d: number | null) =>
  d == null ? 'text-chalk-600' : d > 0.05 ? 'text-grass-400' : d < -0.05 ? 'text-red-400' : 'text-chalk-600'
const conSignoDelta = (d: number | null) => (d == null ? '' : `${d > 0 ? '+' : ''}${d.toFixed(2)}`)

// Sección Forma: tres tarjetas (últimas 5 / 10 / temporada) con media coloreada y delta vs la media de
// la temporada; debajo, la racha de cinco chips V/E/D (reutiliza FormaHero de la ficha de equipo).
export default function Forma({ ventanas, racha }: { ventanas: Ventana[]; racha: ChipRacha[] }) {
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {ventanas.map((v) => (
          <div key={v.label} className="rounded-xl border border-pitch-700 bg-pitch-800 px-3 py-3 text-center">
            <div className="uppercase tracking-wide text-chalk-600" style={{ fontSize: 'var(--t-micro)' }}>{v.label}</div>
            <div className={`font-display font-bold tabular-nums leading-none mt-1 ${claseMedia(v.media)}`} style={{ fontSize: 'var(--n-md)' }}>
              {v.media != null ? v.media.toFixed(2) : '—'}
            </div>
            <div className="mt-1 flex items-center justify-center gap-1.5" style={{ fontSize: 'var(--t-micro)' }}>
              <span className="text-chalk-600 tabular-nums">{v.pj} PJ</span>
              {v.delta != null && <span className={`tabular-nums ${signoDelta(v.delta)}`}>{conSignoDelta(v.delta)}</span>}
            </div>
          </div>
        ))}
      </div>
      {racha.length > 0 && (
        <div className="mt-3">
          <FormaHero forma={racha} ultimaVictoria={null} miga="últimos 5 · reciente →" tempEtiqueta={null} />
        </div>
      )}
    </div>
  )
}
