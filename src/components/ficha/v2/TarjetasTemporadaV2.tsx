import type { ReactNode } from 'react'
import RankingComp, { type RankItem } from '@/components/ficha/v2/RankingComp'
import { TarjetaDoble, TarjetaRoja } from '@/components/iconos'
import { datosSancionado, leySancionados, leyJuegoLimpio } from '@/components/ficha/v2/lineasComp'

// Tarjetas de TEMPORADA en estilo v2, compartido por ficha de grupo y global. Reproduce la lógica de la
// tabla clásica (TarjetasTemporadaTab): 3 bloques — Juego limpio (equipos, menos expulsiones primero),
// Banquillos más calientes (cuerpo técnico, top 5, se oculta si no hay) y Sancionados/en ciclo (jugadores).
// Iconos con su color de siempre (mismos que el resto de listados).
const YEL = '#d9a400'
const RED = 'var(--e0)'

function expuls(dobles: number, rojas: number): ReactNode {
  if (!dobles && !rojas) return <span>sin expulsiones</span>
  return (
    <>
      {dobles > 0 && <span style={{ color: 'var(--card-y)' }}>{dobles}<TarjetaDoble size={11} /></span>}
      {rojas > 0 && <span style={{ color: 'var(--card-r)' }}>{rojas}<TarjetaRoja size={10} /></span>}
    </>
  )
}

export default function TarjetasTemporadaV2({ equipos = [], jugadores = [], fichas, ambito, limiteJL }: {
  equipos?: any[]; jugadores?: any[]; fichas?: { has(k: string): boolean } | null; ambito: string; limiteJL?: number
}) {
  // Bloque 1 — Juego limpio: asc por expulsiones (dobles+rojas), luego menos amarillas, luego alfabético.
  const eq = [...equipos].sort((a, b) =>
    (a.dobles + a.rojas) - (b.dobles + b.rojas) ||
    a.amarillas - b.amarillas ||
    (a.nombre_equipo || '').localeCompare(b.nombre_equipo || '', 'es'))
  const eqShow = limiteJL ? eq.slice(0, limiteJL) : eq
  const jlItems: RankItem[] = eqShow.map((t, i) => ({
    rank: i + 1, codequipo: t.codequipo, nombre: t.nombre_equipo, escudo: t.escudo, nombreEquipo: t.nombre_equipo,
    valor: t.amarillas, valorColor: YEL, extra: expuls(t.dobles, t.rojas),
  }))

  // Bloque 1b — Banquillos más calientes: top 5 con tarjetas al cuerpo técnico, desc por expulsiones.
  const banq = [...equipos]
    .filter((t) => (t.amarillas_tec + t.dobles_tec + t.rojas_tec) > 0)
    .sort((a, b) =>
      (b.dobles_tec + b.rojas_tec) - (a.dobles_tec + a.rojas_tec) ||
      b.amarillas_tec - a.amarillas_tec ||
      (a.nombre_equipo || '').localeCompare(b.nombre_equipo || '', 'es'))
    .slice(0, 5)
  const banqItems: RankItem[] = banq.map((t, i) => ({
    rank: i + 1, codequipo: t.codequipo, nombre: t.nombre_equipo, escudo: t.escudo, nombreEquipo: t.nombre_equipo,
    valor: t.amarillas_tec + t.dobles_tec * 2 + t.rojas_tec, valorColor: YEL, extra: expuls(t.dobles_tec, t.rojas_tec),
  }))

  // Bloque 2 — Sancionados: desc por (ciclos+dobles+rojas), luego más rojas, luego más dobles.
  const jg = [...jugadores].sort((a, b) =>
    (b.ciclos_completados + b.dobles_amarillas + b.rojas_directas) - (a.ciclos_completados + a.dobles_amarillas + a.rojas_directas) ||
    b.rojas_directas - a.rojas_directas ||
    b.dobles_amarillas - a.dobles_amarillas).slice(0, 10)
  const umbral = jg[0]?.ciclo_umbral ?? 5
  const sancItems: RankItem[] = jg.map((j, i) => ({
    rank: i + 1, codjugador: j.codjugador, nombre: j.nombre, pos: j.posicion, escudo: j.escudo, nombreEquipo: j.nombre_equipo,
    valor: j.ciclos_completados + j.dobles_amarillas + j.rojas_directas,
    valorColor: (j.dobles_amarillas || j.rojas_directas) ? RED : YEL, extra: datosSancionado(j, umbral),
  }))

  return (
    <>
      <section>
        <div className="s-head"><h2 className="s-title">Juego limpio</h2><div className="s-sub">menos expulsiones primero · {ambito}</div></div>
        {jlItems.length > 0
          ? <><RankingComp items={jlItems} /><div className="leyenda">{leyJuegoLimpio}{limiteJL ? ` Los ${limiteJL} más deportivos de la categoría.` : ''}</div></>
          : <p className="vacio">Sin datos disciplinarios.</p>}
      </section>
      {banqItems.length > 0 && (
        <section>
          <div className="s-head"><h2 className="s-title">Banquillos más calientes</h2><div className="s-sub">amonestaciones al cuerpo técnico · {ambito}</div></div>
          <RankingComp items={banqItems} />
        </section>
      )}
      <section>
        <div className="s-head"><h2 className="s-title">Jugadores expulsados/ciclos de amarillas</h2><div className="s-sub">a fecha actual · {ambito}</div></div>
        {sancItems.length > 0
          ? <><RankingComp items={sancItems} fichas={fichas} /><div className="leyenda">{leySancionados(umbral)} Jugadores con al menos un ciclo de {umbral} amarillas, una doble o una roja directa. No contempla sanciones adicionales del Comité.</div></>
          : <p className="vacio">Ningún jugador sancionado.</p>}
      </section>
    </>
  )
}
