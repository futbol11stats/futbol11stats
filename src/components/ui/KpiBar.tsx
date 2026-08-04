// Rejilla de 3 a 5 KPIs de columnas iguales, con separadores verticales entre ellas. Cada KPI muestra
// una cifra grande (`valor`, con `className` opcional para el color/escala) y una etiqueta pequeña (`clave`).
export default function KpiBar({
  items,
}: {
  items: { valor: string; clave: string; className?: string }[]
}) {
  return (
    <div
      className="grid"
      style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}
    >
      {items.map((it, i) => (
        <div
          key={i}
          className={`flex flex-col items-center justify-center px-2 py-2 text-center ${
            i > 0 ? 'border-l border-pitch-700' : ''
          }`}
        >
          <span
            className={`font-display font-bold leading-none tabular-nums ${it.className ?? 'text-chalk-100'}`}
            style={{ fontSize: 'var(--n-sm)' }}
          >
            {it.valor}
          </span>
          <span
            className="mt-1 uppercase tracking-wide text-chalk-600"
            style={{ fontSize: 'var(--t-micro)' }}
          >
            {it.clave}
          </span>
        </div>
      ))}
    </div>
  )
}
