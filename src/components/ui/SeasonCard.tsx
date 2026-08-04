// Tarjeta de temporada. Es `flex-col` a propósito: la franja de desenlace va SIEMPRE al final con
// `mt-auto` y a ancho completo, nunca en la misma fila que el título — con textos largos como
// "DESCENSO" se desbordaría. `acento` tiñe el borde superior (color libre, p.ej. el de la competición).

type Cifra = { valor: string; etiqueta: string; className?: string }

const FRANJA: Record<'asc' | 'desc' | 'po' | 'neutro', string> = {
  asc: 'bg-grass-500/25 text-grass-300',
  desc: 'bg-red-500/25 text-red-300',
  po: 'bg-amber-500/25 text-amber-400',
  neutro: 'bg-pitch-700 text-chalk-200',
}

export default function SeasonCard({
  titulo,
  subtitulo,
  cifras,
  stats,
  franja,
  acento,
}: {
  titulo: string
  subtitulo: string
  cifras: [Cifra, Cifra]
  stats: { valor: string; etiqueta: string }[]
  franja: { texto: string; tono: 'asc' | 'desc' | 'po' | 'neutro' }
  acento?: string
}) {
  return (
    <div
      className="flex flex-col overflow-hidden rounded-lg border border-pitch-700 bg-pitch-800"
      style={acento ? { borderTopColor: acento, borderTopWidth: 3 } : undefined}
    >
      <div className="flex flex-col gap-3 p-3">
        <div>
          <div className="font-display font-bold leading-tight text-chalk-100" style={{ fontSize: 'var(--h-sec)' }}>
            {titulo}
          </div>
          <div className="text-chalk-600" style={{ fontSize: 'var(--t-cap)' }}>
            {subtitulo}
          </div>
        </div>

        <div className="flex gap-4">
          {cifras.map((c, i) => (
            <div key={i} className="flex flex-col">
              <span
                className={`font-display font-bold leading-none tabular-nums ${c.className ?? 'text-chalk-100'}`}
                style={{ fontSize: 'var(--n-md)' }}
              >
                {c.valor}
              </span>
              <span className="mt-0.5 uppercase tracking-wide text-chalk-600" style={{ fontSize: 'var(--t-micro)' }}>
                {c.etiqueta}
              </span>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2">
          {stats.map((s, i) => (
            <div key={i} className="flex flex-col items-center text-center">
              <span className="font-display font-semibold tabular-nums text-chalk-200" style={{ fontSize: 'var(--n-sm)' }}>
                {s.valor}
              </span>
              <span className="uppercase tracking-wide text-chalk-600" style={{ fontSize: 'var(--t-micro)' }}>
                {s.etiqueta}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        className={`mt-auto w-full px-3 py-1 text-center font-display font-semibold uppercase tracking-wide ${FRANJA[franja.tono]}`}
        style={{ fontSize: 'var(--t-cap)' }}
      >
        {franja.texto}
      </div>
    </div>
  )
}
