import type { ReactNode } from 'react'
import { Balon, Guante, Escudo, Reloj, Camiseta, CamisetaHueca, TarjetaAmarilla, TarjetaDoble, TarjetaRoja } from '@/components/iconos'
import { colorMediaJug } from '@/lib/competicionV2'
import { fmtNum } from '@/lib/formato'

// Líneas de datos de las pestañas de TEMPORADA, con los mismos glifos y colores que las de jornada
// (gol verde, guante ámbar, reloj minutos, tarjetas cada una su color). Compartidas por grupo y global.
// Van dentro de .pl-stats (FilaJugador), así que son fragmentos de <span>. Cuando un dato no tiene icono
// natural, se deja como texto abreviado dentro de la misma línea (no se pierde).
//
// CONVENCIÓN DEL CERO (para no redecidirla en cada pestaña nueva):
//   El 0 se MUESTRA cuando la métrica es el ASUNTO de la pestaña; se OMITE cuando es contexto secundario.
//   - El asunto de cada ranking va en el CHIP de la derecha y siempre se muestra, incluido el 0
//     (p. ej. Porteros: 0 porterías a cero en 24 partidos es justo lo que esa pestaña mide → chip "0").
//   - En la LÍNEA de datos (contexto), un 0 se omite igual que se omiten las 0 tarjetas
//     (p. ej. Fantasy: los goles son contexto → sin goles no se pinta balón+0; el asunto es el chip).
//   - JORNADA (partido único): el 0 nunca informa → se omite SIEMPRE (goles, portería a cero y tarjetas).
//     Ver filaJornada() en FichaCompeticionV2.tsx.
const fmt2 = (v: number | null | undefined) => (v == null ? '—' : Number(v).toFixed(2).replace('.', ','))
const med1 = (v: number | null | undefined) => (v == null ? '—' : Number(v).toFixed(1).replace('.', ','))

// Goleadores (temporada): PJ · goles/PJ · partidos con gol · minutos por gol. El chip son los goles.
export function datosGoleadorTemp(j: any): ReactNode {
  return (
    <>
      {j.pj != null && <span>{j.pj}<Escudo size={11} /></span>}
      {j.goles_pj != null && <span style={{ color: 'var(--e3)' }}>{fmt2(j.goles_pj)}<Balon size={11} />/PJ</span>}
      {j.partidos_con_gol != null && <span>{j.partidos_con_gol} con gol</span>}
      {j.min_gol != null && j.min_gol > 0 && <span>{Math.round(j.min_gol)}<Reloj size={11} />/gol</span>}
    </>
  )
}

// Porteros (temporada): PJ · goles encajados · encajados/PJ · % porterías a cero. El chip son las P0.
export function datosPorteroTemp(j: any): ReactNode {
  const encPj = j.goles_enc != null && j.pj ? fmt2(j.goles_enc / j.pj) : null
  return (
    <>
      {j.pj != null && <span>{j.pj}<Escudo size={11} /></span>}
      {j.goles_enc != null && <span style={{ color: 'var(--e0)' }}>{j.goles_enc}<Balon size={11} /> enc.</span>}
      {encPj != null && <span>{encPj} enc/PJ</span>}
      {j.p0_pct != null && <span style={{ color: 'var(--amber)' }}>{Math.round(j.p0_pct)}%<Guante size={11} /></span>}
    </>
  )
}

// Fantasy (temporada): media destacada + PJ + goles. El chip son los puntos fantasy.
export function datosFantasyTemp(j: any): ReactNode {
  const c = colorMediaJug(j.media_fantasy)
  return (
    <>
      <span className="mediabadge" style={{ color: c || 'var(--ink-2)', borderColor: c || 'var(--line)' }}>⌀ {med1(j.media_fantasy)}</span>
      {j.pj != null && <span>{j.pj}<Escudo size={11} /></span>}
      {j.goles != null && j.goles > 0 && <span style={{ color: 'var(--e3)' }}>{j.goles}<Balon size={11} /></span>}
    </>
  )
}

// ELO (temporada): PJ + máximo y mínimo de la temporada (sin icono natural → texto). El chip es el ELO actual.
export function datosEloTemp(j: any): ReactNode {
  return (
    <>
      {j.pj != null && <span>{j.pj}<Escudo size={11} /></span>}
      <span>máx <b className="num">{j.elo_max != null ? fmtNum(j.elo_max) : '—'}</b></span>
      <span>mín <b className="num">{j.elo_min != null ? fmtNum(j.elo_min) : '—'}</b></span>
    </>
  )
}

// XI de la temporada (web_xi_optimo): goles + racha 5p + power. El chip son los puntos fantasy totales.
export function datosXiTemp(j: any): ReactNode {
  return (
    <>
      <span style={{ color: 'var(--e3)' }}>{j.goles ?? 0}<Balon size={11} /></span>
      {j.racha_5p != null && <span>racha {j.racha_5p}</span>}
      {j.power_ranking != null && <span>power {j.power_ranking}</span>}
    </>
  )
}

// Sancionados (Tarjetas temporada): ciclos, dobles y rojas con sus iconos. El chip es el total de sanciones.
export function datosSancionado(j: any, umbral: number): ReactNode {
  return (
    <>
      {j.ciclos_completados > 0 && <span style={{ color: 'var(--card-y)' }}>{j.ciclos_completados}× ({umbral}<TarjetaAmarilla size={10} />)</span>}
      {j.dobles_amarillas > 0 && <span style={{ color: 'var(--card-y)' }}>{j.dobles_amarillas}<TarjetaDoble size={11} /></span>}
      {j.rojas_directas > 0 && <span style={{ color: 'var(--card-r)' }}>{j.rojas_directas}<TarjetaRoja size={10} /></span>}
    </>
  )
}
// Equipos (juego limpio / banquillos): amarillas, dobles, rojas con iconos.
export function datosTarjetasEquipo(a: number, d: number, r: number): ReactNode {
  return (
    <>
      {a > 0 && <span style={{ color: 'var(--card-y)' }}>{a}<TarjetaAmarilla size={10} /></span>}
      {d > 0 && <span style={{ color: 'var(--card-y)' }}>{d}<TarjetaDoble size={11} /></span>}
      {r > 0 && <span style={{ color: 'var(--card-r)' }}>{r}<TarjetaRoja size={10} /></span>}
      {a === 0 && d === 0 && r === 0 && <span>sin tarjetas</span>}
    </>
  )
}

// --- Leyendas de iconos al pie de cada listado ---
const leyItem = (icon: ReactNode, label: string, color?: string): ReactNode => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginRight: 16 }}>
    {icon && <span style={{ color, display: 'inline-flex' }}>{icon}</span>}{label}
  </span>
)
export const leyGoleadorTemp = (<>{leyItem(<Balon size={12} />, 'valor: goles', 'var(--e4)')}{leyItem(<Escudo size={12} />, 'PJ')}{leyItem(<Balon size={12} />, '/PJ: media de goles', 'var(--e3)')}{leyItem(null, 'con gol: partidos en los que marcó')}{leyItem(<Reloj size={12} />, 'minutos por gol')}</>)
export const leyPorteroTemp = (<>{leyItem(<Guante size={12} />, 'valor: porterías a cero', 'var(--amber)')}{leyItem(<Escudo size={12} />, 'PJ')}{leyItem(<Balon size={12} />, 'goles encajados', 'var(--e0)')}{leyItem(null, 'enc/PJ · % a cero')}</>)
export const leyFantasyTemp = (<>{leyItem(null, 'valor: puntos fantasy acumulados')}{leyItem(null, '⌀ media por partido')}{leyItem(<Escudo size={12} />, 'PJ')}{leyItem(<Balon size={12} />, 'goles', 'var(--e3)')}</>)
export const leyEloTemp = (<>{leyItem(null, 'valor: ELO actual')}{leyItem(<Escudo size={12} />, 'PJ')}{leyItem(null, 'máx / mín de la temporada')}</>)
export const leyXiTemp = (<>{leyItem(null, 'valor: puntos fantasy acumulados')}{leyItem(<Balon size={12} />, 'goles', 'var(--e3)')}{leyItem(null, 'racha 5p · power ranking')}</>)
export const leySancionados = (umbral: number): ReactNode => (<>{leyItem(<TarjetaAmarilla size={11} />, `ciclos de ${umbral} amarillas`, 'var(--card-y)')}{leyItem(<TarjetaDoble size={12} />, 'dobles amarillas', 'var(--card-y)')}{leyItem(<TarjetaRoja size={11} />, 'rojas directas', 'var(--card-r)')}</>)
export const leyJuegoLimpio = (<>{leyItem(<TarjetaAmarilla size={11} />, 'amarillas', 'var(--card-y)')}{leyItem(<TarjetaDoble size={12} />, 'dobles (expulsión)', 'var(--card-y)')}{leyItem(<TarjetaRoja size={11} />, 'rojas directas', 'var(--card-r)')}</>)
// Leyenda de las líneas de JORNADA (filaJornada): titular/suplente, minutos, gol/portería a cero, tarjetas.
export const leyJornada = (<>{leyItem(<Camiseta size={12} />, 'titular')}{leyItem(<CamisetaHueca size={12} />, 'suplente')}{leyItem(<Reloj size={12} />, 'minutos')}{leyItem(<Balon size={12} />, 'goles', 'var(--e3)')}{leyItem(<Guante size={12} />, 'portería a cero', 'var(--amber)')}{leyItem(<TarjetaAmarilla size={11} />, 'amarilla', 'var(--card-y)')}{leyItem(<TarjetaRoja size={11} />, 'roja', 'var(--card-r)')}</>)
