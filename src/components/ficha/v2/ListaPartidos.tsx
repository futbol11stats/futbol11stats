import EscudoImg from '@/components/EscudoImg'
import NombreEquipo from '@/components/NombreEquipo'
import IndicadorLocal from '@/components/IndicadorLocal'
import { Guante } from '@/components/iconos'
import { marcadorLocalVisitante, colorSigno, conSigno, signoCls, fechaCorta } from '@/lib/jugador'

export type PartidoLite = {
  escudo: string | null; equipoNombre: string | null; rivalCod: string | null; rivalNombre: string | null
  resultado: string | null; fecha: string | null; goles: number | null; pts: number | null
  gc: number | null; esLocal?: boolean | null
}

function Row({ p, portero }: { p: PartidoLite; portero: boolean }) {
  const { marcador, signo } = marcadorLocalVisitante(p.resultado, p.esLocal)
  const g = p.goles ?? 0, c = p.gc ?? 0
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <span className="inline-flex items-center justify-center w-8 h-8 bg-white rounded-sm flex-shrink-0 p-0.5">
        <EscudoImg escudo={p.escudo} nombre={p.equipoNombre ?? undefined} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 min-w-0 font-display uppercase text-white" style={{ fontSize: 'var(--t-sm)' }}>
            {p.esLocal != null ? <IndicadorLocal esLocal={p.esLocal} /> : <span className="font-body normal-case text-chalk-500 flex-shrink-0" style={{ fontSize: 'var(--t-cap)' }}>vs</span>}
            <span className="truncate min-w-0"><NombreEquipo codequipo={p.rivalCod} nombre={p.rivalNombre} /></span>
          </span>
          <span className={`font-semibold tabular-nums flex-shrink-0 ${colorSigno(signo)}`} style={{ fontSize: 'var(--t-cap)' }}>{marcador}</span>
        </div>
        <div className="text-chalk-600 truncate" style={{ fontSize: 'var(--t-micro)' }}>{fechaCorta(p.fecha)} · con {p.equipoNombre}</div>
      </div>
      <div className="flex items-center gap-3 flex-shrink-0 text-center">
        <div className="w-9">
          {portero ? (
            <div className="font-display font-bold tabular-nums flex items-center justify-center gap-1" style={{ fontSize: 'var(--t-lead)' }}>
              {c === 0 ? <Guante size={14} /> : null}<span className={c === 0 ? 'text-chalk-400' : 'text-white'}>{c}</span>
            </div>
          ) : (
            <div className={`font-display font-bold tabular-nums ${g > 0 ? 'text-white' : 'text-chalk-700'}`} style={{ fontSize: 'var(--t-lead)' }}>{g}</div>
          )}
          <div className="uppercase tracking-wide text-chalk-600" style={{ fontSize: 'var(--t-micro)' }}>{portero ? 'GC' : g === 1 ? 'gol' : 'goles'}</div>
        </div>
        <div className="w-9">
          <div className={`font-display font-bold tabular-nums ${signoCls(p.pts)}`} style={{ fontSize: 'var(--t-lead)' }}>{conSigno(p.pts)}</div>
          <div className="uppercase tracking-wide text-chalk-600" style={{ fontSize: 'var(--t-micro)' }}>pts</div>
        </div>
      </div>
    </div>
  )
}

export default function ListaPartidos({ rows, portero }: { rows: PartidoLite[]; portero: boolean }) {
  if (rows.length === 0) return null
  return (
    <div className="rounded-xl border border-pitch-700 bg-pitch-800 divide-y divide-pitch-700/60">
      {rows.map((p, i) => <Row key={i} p={p} portero={portero} />)}
    </div>
  )
}
