'use client'

import { useRouter } from 'next/navigation'

export default function JornadaSelector({
  jornadaNum,
  totalJornadas,
  baseUrl,
  tab,
}: {
  jornadaNum: number
  totalJornadas: number
  baseUrl: string
  tab: string
}) {
  const router = useRouter()

  return (
    <select
      value={jornadaNum}
      onChange={(e) => router.push(`${baseUrl}/jornada-${e.target.value}/${tab}`)}
      className="bg-pitch-700 text-white text-xs rounded-md px-3 py-1.5 border border-pitch-600 focus:outline-none focus:border-grass-500 cursor-pointer"
      aria-label="Seleccionar jornada"
    >
      {Array.from({ length: totalJornadas }, (_, i) => i + 1).map((n) => (
        <option key={n} value={n}>
          Jornada {n}
        </option>
      ))}
    </select>
  )
}
