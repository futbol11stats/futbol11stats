'use client'

import { useState } from 'react'
import BarChartJornadas from '@/components/graficos/BarChartJornadas'
import Track from '@/components/ui/Track'
import EscudoImg from '@/components/EscudoImg'
import IndicadorLocal from '@/components/IndicadorLocal'
import { derivarRol, escalon, PALETA_FONDO, PALETA_TEXTO } from '@/lib/escala'
import {
  Balon, Guante, TarjetaAmarilla, TarjetaDoble, TarjetaRoja,
  Camiseta, CamisetaHueca, TrianguloArriba, TrianguloAbajo,
} from '@/components/iconos'
import type { CompAmbito, JornadaDatum } from '@/lib/jugadorV2'

// Subrayado de color del rival según el resultado (perspectiva del jugador): verde gana / gris empata / rojo pierde.
function bordeResultado(resultado: string | null | undefined): string {
  const s = (resultado || '').trim().match(/([GEP])$/i)?.[1]?.toUpperCase()
  return s === 'G' ? 'border-grass-400' : s === 'P' ? 'border-red-400' : 'border-chalk-500'
}

// Rangos de cada escalón para la leyenda, derivados de los cortes de puntosPartido.
function rangos(cortes: readonly [number, number, number, number]): string[] {
  const [a, b, c, d] = cortes
  return [`< ${a}`, `${a}-${b - 1}`, `${b}-${c - 1}`, `${c}-${d - 1}`, `${d}+`]
}

export default function AmbitoJornadas({ comps, cortes }: {
  comps: CompAmbito[]
  cortes: readonly [number, number, number, number]
}) {
  const [sel, setSel] = useState(0)
  if (comps.length === 0) return null
  const comp = comps[Math.min(sel, comps.length - 1)]

  const carriles = [
    {
      // Eventos: gol (×N si varios), tarjetas y guante de portería a cero.
      icono: <Balon size={13} />,
      render: (d: JornadaDatum) => {
        if (d.estado.tipo !== 'valor') return null
        return (
          <span className="inline-flex items-center gap-0.5 text-chalk-300">
            {(d.goles ?? 0) > 0 && (
              <span className="inline-flex items-center text-grass-300">
                <Balon size={12} />{(d.goles ?? 0) > 1 && <span className="tabular-nums" style={{ fontSize: 'var(--t-micro)' }}>×{d.goles}</span>}
              </span>
            )}
            {(d.rojas ?? 0) > 0 ? <span className="text-red-400"><TarjetaRoja size={11} /></span>
              : (d.dobles ?? 0) > 0 ? <span className="text-amber-400"><TarjetaDoble size={11} /></span>
              : (d.amarillas ?? 0) > 0 ? <span className="text-amber-400"><TarjetaAmarilla size={10} /></span> : null}
            {d.gc === 0 && <span style={{ color: '#38bdf8' }}><Guante size={12} /></span>}
          </span>
        )
      },
    },
    {
      // Rol y minutos: consume derivarRol (no se reimplementa la condición). Camiseta sólida = titular,
      // hueca = suplente; ▲ entró, ▼ salió, roja si expulsado.
      icono: <Camiseta size={12} />,
      render: (d: JornadaDatum) => {
        if (d.estado.tipo !== 'valor') return null
        const rol = derivarRol(!!d.titular, d.minutos ?? 0, d.rojas ?? 0, d.dobles ?? 0)
        return (
          <span className="inline-flex items-center gap-0.5 text-chalk-400">
            {d.titular ? <Camiseta size={12} /> : <CamisetaHueca size={12} />}
            {rol === 'expulsado' ? <span className="text-red-400"><TarjetaRoja size={10} /></span>
              : rol === 'sustituido' ? <TrianguloAbajo size={9} />
              : rol === 'entro' ? <TrianguloArriba size={9} /> : null}
          </span>
        )
      },
    },
    {
      // Rival: escudo + subrayado por resultado + casa/avión.
      icono: null,
      render: (d: JornadaDatum) => {
        if (d.estado.tipo !== 'valor') return null
        return (
          <span className={`inline-flex flex-col items-center border-b-2 pb-0.5 ${bordeResultado(d.resultado)}`}>
            <span className="inline-flex items-center justify-center w-4 h-4 bg-white rounded-sm p-px">
              <EscudoImg escudo={d.rivalEscudo ?? null} nombre={d.rivalNombre ?? undefined} />
            </span>
            {d.esLocal != null && <span className="mt-0.5 scale-75 origin-top"><IndicadorLocal esLocal={d.esLocal} /></span>}
          </span>
        )
      },
    },
  ]

  const rango = rangos(cortes)

  return (
    <div>
      {/* Selector de competición (filtra el gráfico dentro de la temporada) */}
      {comps.length > 1 && (
        <Track className="gap-1.5 mb-3" autoCentrarActivo>
          {comps.map((c, i) => (
            <button
              key={c.codgrupo}
              type="button"
              data-activo={i === sel ? 'true' : 'false'}
              onClick={() => setSel(i)}
              className={`flex-shrink-0 whitespace-nowrap rounded-full px-3 py-1 transition-colors ${
                i === sel ? 'bg-grass-500 text-white' : 'bg-pitch-800 text-chalk-500 hover:text-white'
              }`}
              style={{ fontSize: 'var(--t-sm)' }}
            >
              {c.nombre_comp}
            </button>
          ))}
        </Track>
      )}

      <div className="bg-pitch-800 rounded-xl border border-pitch-700 p-3 overflow-hidden">
        <BarChartJornadas
          datos={comp.jornadas}
          estado={(d) => d.estado}
          cortes={cortes}
          carriles={carriles}
          etiqueta={(d) => `J${d.jornada}`}
          mostrarMedia
          destacarUltimo
        />
      </div>

      {/* Leyenda: mismos glifos que pinta el gráfico + rampa de color con rangos */}
      <div className="mt-3 flex flex-col gap-2" style={{ fontSize: 'var(--t-micro)' }}>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-chalk-500">
          <span className="inline-flex items-center gap-1 text-grass-300"><Balon size={12} /> gol</span>
          <span className="inline-flex items-center gap-1 text-amber-400"><TarjetaAmarilla size={10} /> amarilla</span>
          <span className="inline-flex items-center gap-1 text-amber-400"><TarjetaDoble size={11} /> doble</span>
          <span className="inline-flex items-center gap-1 text-red-400"><TarjetaRoja size={11} /> roja</span>
          <span className="inline-flex items-center gap-1" style={{ color: '#38bdf8' }}><Guante size={12} /> portería a 0</span>
          <span className="inline-flex items-center gap-1 text-chalk-400"><Camiseta size={12} /> titular</span>
          <span className="inline-flex items-center gap-1 text-chalk-400"><CamisetaHueca size={12} /> suplente</span>
          <span className="inline-flex items-center gap-1 text-chalk-400"><TrianguloArriba size={9} /> entró</span>
          <span className="inline-flex items-center gap-1 text-chalk-400"><TrianguloAbajo size={9} /> salió</span>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {([1, 2, 3, 4] as const).map((n) => (
            <span key={n} className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 ${PALETA_FONDO[n]} ${PALETA_TEXTO[n]}`}>
              {rango[n]} pts
            </span>
          ))}
          <span className="text-chalk-600">· barra punteada = no jugó</span>
        </div>
      </div>
    </div>
  )
}
