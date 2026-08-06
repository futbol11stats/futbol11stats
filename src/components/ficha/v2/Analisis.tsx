import { PALETA_TEXTO, escalon, CORTES_FIJOS } from '@/lib/escala'
import type { Balance, SplitLocal } from '@/lib/jugadorV2'
import { Casa, Avion } from '@/components/iconos'

function pct(n: number, total: number): number {
  return total > 0 ? Math.round((n / total) * 100) : 0
}

// Barra V/E/D proporcional (verde/gris/rojo) con el % de victorias a la derecha.
function BarraBalance({ label, b }: { label: React.ReactNode; b: Balance }) {
  const g = pct(b.pg, b.pj), e = pct(b.pe, b.pj), p = 100 - g - e
  return (
    <div>
      <div className="flex items-center justify-between mb-1" style={{ fontSize: 'var(--t-sm)' }}>
        <span className="text-chalk-400 truncate min-w-0">{label}</span>
        <span className="text-chalk-500 tabular-nums flex-shrink-0 ml-2">{b.pj} PJ · <span className="text-grass-400 font-medium">{g}% V</span></span>
      </div>
      <div className="flex h-3 rounded-full overflow-hidden bg-pitch-700">
        <span className="bg-grass-500" style={{ width: `${g}%` }} />
        <span className="bg-chalk-600/60" style={{ width: `${e}%` }} />
        <span className="bg-red-500/80" style={{ width: `${p}%` }} />
      </div>
      <div className="flex justify-between mt-0.5 text-chalk-600 tabular-nums" style={{ fontSize: 'var(--t-micro)' }}>
        <span>{b.pg}V</span><span>{b.pe}E</span><span>{b.pp}D</span>
      </div>
    </div>
  )
}

function claseMedia(m: number | null): string {
  return m == null ? 'text-chalk-500' : PALETA_TEXTO[escalon(m, CORTES_FIJOS.mediaPartido)]
}

function CardLocal({ Icon, titulo, s }: { Icon: React.ComponentType<{ size?: number }>; titulo: string; s: SplitLocal }) {
  return (
    <div className="rounded-xl border border-pitch-700 bg-pitch-800 px-3 py-3">
      <div className="flex items-center gap-1.5 text-chalk-500 mb-2" style={{ fontSize: 'var(--t-cap)' }}>
        <Icon size={14} /> {titulo}
      </div>
      <div className="grid grid-cols-3 gap-1 text-center">
        <div><div className="font-display font-bold text-white tabular-nums" style={{ fontSize: 'var(--n-sm)' }}>{s.pj}</div><div className="text-chalk-600" style={{ fontSize: 'var(--t-micro)' }}>PJ</div></div>
        <div><div className="font-display font-bold text-white tabular-nums" style={{ fontSize: 'var(--n-sm)' }}>{s.goles}</div><div className="text-chalk-600" style={{ fontSize: 'var(--t-micro)' }}>Goles</div></div>
        <div><div className={`font-display font-bold tabular-nums ${claseMedia(s.media)}`} style={{ fontSize: 'var(--n-sm)' }}>{s.media != null ? s.media.toFixed(2) : '—'}</div><div className="text-chalk-600" style={{ fontSize: 'var(--t-micro)' }}>Media</div></div>
      </div>
    </div>
  )
}

// Sección Análisis. Balance del equipo CON él / SIN él (nunca "impacto"). Si cualquiera de los dos lados
// tiene < 8 partidos, no se publican porcentajes -> aviso de muestra insuficiente. Debajo, casa/fuera.
export default function Analisis({ nombreEquipo, con, sin, suficiente, casa, fuera, hayLocal }: {
  nombreEquipo: string | null; con: Balance; sin: Balance; suficiente: boolean
  casa: SplitLocal; fuera: SplitLocal; hayLocal: boolean
}) {
  return (
    <div>
      <div className="rounded-xl border border-pitch-700 bg-pitch-800 px-3 py-3">
        <div className="text-chalk-500 uppercase tracking-wide mb-2" style={{ fontSize: 'var(--t-micro)' }}>Balance del equipo</div>
        {suficiente ? (
          <div className="space-y-3">
            <BarraBalance label={<>Con <span className="text-white">{nombreEquipo || 'él'}</span></>} b={con} />
            <BarraBalance label="Sin él" b={sin} />
          </div>
        ) : (
          <p className="text-chalk-500" style={{ fontSize: 'var(--t-sm)' }}>
            Muestra insuficiente para publicar porcentajes (con él {con.pj} · sin él {sin.pj}; hacen falta 8 por lado).
          </p>
        )}
      </div>

      {hayLocal && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          <CardLocal Icon={Casa} titulo="En casa" s={casa} />
          <CardLocal Icon={Avion} titulo="Fuera" s={fuera} />
        </div>
      )}
    </div>
  )
}
