import type { ReactNode } from 'react'

const mil = (n: number | null | undefined) => (n == null ? '—' : Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'))

// Fila de ranking: insignia + etiqueta + #rank/total + barra de percentil (10 segmentos). Presentacional
// (sirve en servidor y en cliente). La usa el bloque Nivel: el ranking GENERAL en servidor (fijo) y las filas
// de CATEGORÍA/POSICIÓN en el cliente (NivelRankings, que sigue la pastilla). Devuelve null si no hay rank.
export default function RankFila({ insignia, label, rank, total }: {
  insignia: ReactNode; label: string; rank: number | null; total: number | null
}) {
  if (!rank) return null
  const p = total ? Math.min(99, Math.floor((1 - rank / total) * 100)) : null
  const ll = p != null ? Math.round(p / 10) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '9px 0', borderTop: '1px solid var(--line-2)' }}>
      <span style={{ width: 24, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>{insignia}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, fontSize: 'var(--t-cap)' }}>
          <span style={{ color: 'var(--ink-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
          <span className="num" style={{ fontSize: 'var(--t-sm)', flexShrink: 0 }}><span style={{ color: 'var(--e3)' }}>#{mil(rank)}</span><span style={{ color: 'var(--ink-4)' }}> / {mil(total)}</span></span>
        </div>
        <div style={{ display: 'flex', gap: 2, marginTop: 5 }}>
          {Array.from({ length: 10 }).map((_, i) => <span key={i} style={{ height: 6, flex: 1, borderRadius: 2, background: (p != null && i < ll) ? 'var(--e3)' : 'rgba(255,255,255,.1)' }} />)}
        </div>
      </div>
    </div>
  )
}
