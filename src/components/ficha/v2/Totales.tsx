import { Calendario, Reloj, Balon, Camiseta, CamisetaHueca, TarjetaAmarilla, TarjetaRoja, Guante } from '@/components/iconos'

const num = (n: number | null | undefined) => (n ?? 0).toLocaleString('es-ES')

function Tile({ Icon, valor, label, acento }: { Icon: React.ComponentType<{ size?: number }>; valor: string; label: string; acento?: boolean }) {
  return (
    <div className="rounded-xl border border-pitch-700 bg-pitch-800 px-2 py-2.5 text-center">
      <div className="flex items-center justify-center text-grass-400 mb-1"><Icon size={16} /></div>
      <div className={`font-display font-bold tabular-nums leading-none ${acento ? 'text-grass-400' : 'text-white'}`} style={{ fontSize: 'var(--n-sm)' }}>{valor}</div>
      <div className="uppercase tracking-wide text-chalk-600 mt-0.5" style={{ fontSize: 'var(--t-micro)' }}>{label}</div>
    </div>
  )
}

// Sección Totales (TODAS LAS TEMPORADAS): ocho casillas con icono + dorsal triple.
export default function Totales({ pj, minutos, goles, titular, suplente, amarillas, rojas, porteriasCero, dorsalUltimo, dorsalComun, dorsalesOtros }: {
  pj: number | null; minutos: number | null; goles: number | null; titular: number | null; suplente: number | null
  amarillas: number; rojas: number; porteriasCero: number | null
  dorsalUltimo: number | null; dorsalComun: number | null; dorsalesOtros: number[]
}) {
  return (
    <div>
      <div className="grid grid-cols-4 gap-2">
        <Tile Icon={Calendario} valor={num(pj)} label="Partidos" />
        <Tile Icon={Reloj} valor={num(minutos)} label="Minutos" />
        <Tile Icon={Balon} valor={num(goles)} label="Goles" acento />
        <Tile Icon={Camiseta} valor={num(titular)} label="Titular" />
        <Tile Icon={CamisetaHueca} valor={num(suplente)} label="Suplente" />
        <Tile Icon={TarjetaAmarilla} valor={num(amarillas)} label="Amarillas" />
        <Tile Icon={TarjetaRoja} valor={num(rojas)} label="Rojas" />
        <Tile Icon={Guante} valor={num(porteriasCero)} label="P. a 0" acento />
      </div>

      {(dorsalUltimo != null || dorsalComun != null || dorsalesOtros.length > 0) && (
        <div className="mt-2 rounded-xl border border-pitch-700 bg-pitch-800 px-3 py-2.5 flex items-center gap-4">
          <span className="font-display font-bold text-chalk-500" style={{ fontSize: 'var(--n-sm)' }}>#</span>
          {dorsalUltimo != null && <div className="text-center"><div className="font-display font-bold text-white tabular-nums" style={{ fontSize: 'var(--n-sm)' }}>{dorsalUltimo}</div><div className="uppercase tracking-wide text-chalk-600" style={{ fontSize: 'var(--t-micro)' }}>Último</div></div>}
          {dorsalComun != null && dorsalComun !== dorsalUltimo && <div className="text-center"><div className="font-display font-bold text-chalk-300 tabular-nums" style={{ fontSize: 'var(--n-sm)' }}>{dorsalComun}</div><div className="uppercase tracking-wide text-chalk-600" style={{ fontSize: 'var(--t-micro)' }}>Común</div></div>}
          {dorsalesOtros.length > 0 && <div className="min-w-0"><div className="text-chalk-500 tabular-nums truncate" style={{ fontSize: 'var(--t-sm)' }}>{dorsalesOtros.join(', ')}</div><div className="uppercase tracking-wide text-chalk-600" style={{ fontSize: 'var(--t-micro)' }}>Otros</div></div>}
        </div>
      )}
    </div>
  )
}
