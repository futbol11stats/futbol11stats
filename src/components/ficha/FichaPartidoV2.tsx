import './v2/ficha.css'
import Link from 'next/link'
import { Fragment, type ReactNode } from 'react'
import { CalendarPlus, MapPin, Trophy, ShieldCheck } from 'lucide-react'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import IndicadorLocal from '@/components/IndicadorLocal'
import NombreEquipo from '@/components/NombreEquipo'
import Pastilla from '@/components/Pastilla'
import SuperficieCampo from '@/components/SuperficieCampo'
import CalendarLink from '@/components/calendario/CalendarLink'
import { Balon, TarjetaAmarilla, TarjetaDoble, TarjetaRoja, FlechaEntra, FlechaSale, Guante } from '@/components/iconos'
import { googleRenderUrl } from '@/lib/ics'
import { SITE_URL } from '@/lib/seo'
import { partidoSlug } from '@/lib/partidoSlug'
import { nombreCompleto, nombreEquipo } from '@/lib/nombre'
import MatchRow from '@/components/ficha/v2/MatchRow'
import PlayerRow from '@/components/ui/PlayerRow'
import SectionHeader from '@/components/ui/SectionHeader'
import PartidoTabs from '@/components/ficha/PartidoTabs'
import PlayerAvatar from '@/components/ui/PlayerAvatar'
import FormaStrip from '@/components/ui/FormaStrip'
import type { PartidoFicha, PartidoJugador, PartidoMini, PartidoLado } from '@/lib/partido'
// Fondo de la pastilla de PUNTOS fantasy (baza propia; verde para lo bueno, el ámbar está reservado).
const ptsStyle = (p: number | null) => p == null ? { background: 'rgba(255,255,255,.05)', color: 'var(--ink-4)' }
  : p >= 8 ? { background: 'var(--e3)', color: '#08111f' }
    : p >= 4 ? { background: 'var(--e2)', color: '#08111f' }
      : p < 0 ? { background: 'var(--card-r)', color: '#fff' }
        : { background: 'rgba(255,255,255,.09)', color: 'var(--ink-2)' }

// "05/09/2026" -> "5 sep" (hero de partido futuro): mes en minúscula, día sin cero a la izquierda.
const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const fechaCorta = (f: string | null): string => {
  const m = f ? /^(\d{2})\/(\d{2})\/\d{4}$/.exec(f) : null
  return m ? `${parseInt(m[1], 10)} ${MESES_CORTOS[parseInt(m[2], 10) - 1] ?? ''}`.trim() : (f || '')
}

// Eventos del jugador CON SU MINUTO (web_partido_eventos); si no hubiera minuto, cae a los conteos.
function Eventos({ j }: { j: PartidoJugador }) {
  const out: ReactNode[] = []
  if (j.golesMin.length) j.golesMin.forEach((m, i) => out.push(<span key={`g${i}`} className="ev ev-gol"><Balon size={11} />{m}′</span>))
  else if (j.goles > 0) out.push(<span key="gc" className="ev ev-gol"><Balon size={11} />{j.goles > 1 ? `×${j.goles}` : ''}</span>)
  if (j.dobleMin != null || j.dobles > 0) out.push(<span key="td" className="ev ev-td"><TarjetaDoble size={11} />{j.dobleMin != null ? `${j.dobleMin}′` : ''}</span>)
  else if (j.amarillaMin != null || j.amarillas > 0) out.push(<span key="ta" className="ev ev-ta"><TarjetaAmarilla size={11} />{j.amarillaMin != null ? `${j.amarillaMin}′` : ''}</span>)
  if (j.rojaMin != null || j.rojas > 0) out.push(<span key="tr" className="ev ev-tr"><TarjetaRoja size={11} />{j.rojaMin != null ? `${j.rojaMin}′` : ''}</span>)
  if (j.entra != null) out.push(<span key="in" className="ev ev-in"><FlechaEntra size={11} />{j.entra}′</span>)
  if (j.sale != null) out.push(<span key="out" className="ev ev-out"><FlechaSale size={11} />{j.sale}′</span>)
  return <>{out}</>
}

// Tratamiento de portero REUTILIZADO de la plantilla: guante ámbar = portería a cero; {n}+guante tenue = goles
// encajados. (Mismo icono/color que filaDatos de FichaEquipoV2.)
function Portero({ j }: { j: PartidoJugador }) {
  if (j.golesEncajados == null) return null
  return j.golesEncajados === 0
    ? <span className="ev ev-pac" title="Portería a cero"><Guante size={11} /></span>
    : <span className="ev ev-gc" title={`${j.golesEncajados} goles encajados`}>{j.golesEncajados}<Guante size={11} /></span>
}

// Fila de jugador con el marcado REAL de la plantilla (.pl): avatar, nombre (Barlow), .pl-me (Pastilla + eventos con
// icono + portero), .pl-elo (Δ ELO del partido, verde sube / rojo baja) y .pl-val con los puntos fantasy.
function Fila({ j }: { j: PartidoJugador }) {
  return (
    <PlayerRow
      nombre={j.nombre} pos={j.pos} dorsal={j.dorsal || undefined} href={j.href}
      muted={!j.jugado}
      meta={<><Eventos j={j} /><Portero j={j} /></>}
      valor={j.puntos != null ? j.puntos : '—'} valorStyle={ptsStyle(j.puntos)}
      elo={j.eloDelta}
    />
  )
}

// Forma reciente junto al nombre del equipo: la tira ÚNICA del sitio (FormaStrip, cuadrito con letra G/E/P),
// la MISMA que la clasificación — no dots sueltos. Más reciente a la derecha (reverse: los minis vienen DESC).
function FormaDots({ nombre, minis }: { nombre: string; minis: PartidoMini[] }) {
  if (!minis.length) return null
  const arr = minis.slice(0, 5).map((m) => {
    const home = m.local === nombre
    const gf = home ? (m.golesLocal ?? 0) : (m.golesVisitante ?? 0)
    const gc = home ? (m.golesVisitante ?? 0) : (m.golesLocal ?? 0)
    const s: 'G' | 'E' | 'P' = gf > gc ? 'G' : gf < gc ? 'P' : 'E'
    return { s, t: `${gf}-${gc}` }
  }).reverse()
  return <FormaStrip items={arr.map((x) => x.s)} titles={arr.map((x) => x.t)} size={15} gap={3} />
}

// #1 Cuerpo técnico: solo hay ENTRENADOR en el dato. Fila estilo .pl con pastilla de rol; el día que el pipeline
// traiga más staff/ficha, encaja sin rehacer. "No presenta" (el equipo no presentó entrenador) = hecho del acta:
// se muestra TENUE y sin pastilla, para distinguirlo de un nombre real.
function CuerpoTecnico({ nombre }: { nombre: string }) {
  if (/no\s*presenta/i.test(nombre)) return <div className="al-tec-none">No presenta</div>
  return <PlayerRow tec nombreCompletoUI pastilla={false} nombre={nombre} meta={<span className="rol-pill">Entrenador</span>} />
}

const TeamHead = ({ lado, forma }: { lado: PartidoLado; forma: PartidoMini[] }) => (
  <div className="al-team">
    <EscudoBox escudo={lado.escudo} nombre={lado.nombre} size={24} radius={5} />
    <span className="tn"><NombreEquipo codequipo={lado.codequipo} nombre={lado.nombre} /></span>
    <FormaDots nombre={lado.nombre} minis={forma} />
  </div>
)
// #6 encabezado de columna: rotula las dos cifras de la derecha (la leyenda de abajo refuerza).
const ColsHead = () => <div className="al-cols"><span className="h-pts">PTS</span><span className="h-elo">Δ ELO</span></div>
// #5 rótulo explícito para distinguirlo del Δ ELO por jugador.
const MovElo = ({ mov }: { mov: number }) => <div className="al-elo">Movimiento ELO de equipo <b className={mov >= 0 ? 'pos' : 'neg'}>{mov >= 0 ? '+' : ''}{mov.toLocaleString('es-ES', { maximumFractionDigits: 1 })}</b></div>
// Empareja dos listas por índice hasta la más larga; la posición que falta va null (celda vacía).
const pares = <T,>(a: T[], b: T[]): [T | null, T | null][] =>
  Array.from({ length: Math.max(a.length, b.length) }, (_, i) => [a[i] ?? null, b[i] ?? null])

// ALINEACIONES en una ÚNICA rejilla 1fr|1fr: cada fila lógica (titular i, suplente i, entrenador…) ocupa la MISMA
// fila de grid en las dos columnas, así quedan alineadas fila a fila aunque un equipo lleve más suplentes que el otro
// (la celda que sobra va vacía y SIN bordes, no descoloca ni deja hueco raro a la columna llena). En móvil son dos
// columnas compactas (ver ficha.css @media); en desktop, dos columnas anchas. Reemplaza al apilado de 390px.
function AlineacionesGrid({ p }: { p: PartidoFicha }) {
  const cel = (node: ReactNode, side: 'l' | 'r', cls = '') =>
    <div className={`alg-c alg-${side}${node ? (cls ? ` ${cls}` : '') : ' alg-empty'}`}>{node}</div>
  const filas = (a: PartidoJugador[], b: PartidoJugador[], key: string) =>
    pares(a, b).map(([x, y], i) => (
      <Fragment key={`${key}${i}`}>
        {cel(x ? <Fila j={x} /> : null, 'l', 'alg-pl')}
        {cel(y ? <Fila j={y} /> : null, 'r', 'alg-pl')}
      </Fragment>
    ))
  const L = p.local, V = p.visitante
  const haySub = L.suplentes.length > 0 || V.suplentes.length > 0
  const hayTec = !!p.entrenadorLocal || !!p.entrenadorVisitante
  const hayMov = p.movEloLocal != null || p.movEloVisitante != null
  return (
    <div className="al-grid">
      {cel(<TeamHead lado={L} forma={p.formaLocal} />, 'l', 'alg-head')}
      {cel(<TeamHead lado={V} forma={p.formaVisitante} />, 'r', 'alg-head')}
      {cel(<ColsHead />, 'l')}
      {cel(<ColsHead />, 'r')}
      {filas(L.titulares, V.titulares, 't')}
      {haySub && <>
        {cel(L.suplentes.length ? <div className="al-sub">Suplentes</div> : null, 'l')}
        {cel(V.suplentes.length ? <div className="al-sub">Suplentes</div> : null, 'r')}
      </>}
      {filas(L.suplentes, V.suplentes, 's')}
      {hayTec && <>
        {cel(p.entrenadorLocal ? <div className="al-sub">Entrenador</div> : null, 'l')}
        {cel(p.entrenadorVisitante ? <div className="al-sub">Entrenador</div> : null, 'r')}
        {cel(p.entrenadorLocal ? <CuerpoTecnico nombre={p.entrenadorLocal} /> : null, 'l')}
        {cel(p.entrenadorVisitante ? <CuerpoTecnico nombre={p.entrenadorVisitante} /> : null, 'r')}
      </>}
      {hayMov && <>
        {cel(p.movEloLocal != null ? <MovElo mov={p.movEloLocal} /> : null, 'l')}
        {cel(p.movEloVisitante != null ? <MovElo mov={p.movEloVisitante} /> : null, 'r')}
      </>}
    </div>
  )
}

// Fila de resultado reutilizando el componente del sitio (.rmatch), enlazada a la ficha del partido.
function MiniPartido({ m }: { m: PartidoMini }) {
  const jugado = m.golesLocal != null && m.golesVisitante != null
  const gL = m.golesLocal as number, gV = m.golesVisitante as number
  return (
    <Link className="rmatch-wrap mini-link" href={`/madrid/partido/${partidoSlug(m.codacta, m.local, m.visitante)}`}>
      <div className="rmatch">
        <div className="rside"><EscudoBox escudo={m.escudoLocal} nombre={m.local} size={22} radius={5} /><span className={`rnm${jugado && gL > gV ? ' w' : ''}`}>{m.local}</span></div>
        <div className="rsc">{jugado ? <><span style={{ color: gL > gV ? 'var(--e3)' : gL < gV ? 'var(--e0)' : 'var(--ink-2)' }}>{gL}</span><span className="rsc-sep">-</span><span style={{ color: gV > gL ? 'var(--e3)' : gV < gL ? 'var(--e0)' : 'var(--ink-2)' }}>{gV}</span></> : 'vs'}</div>
        <div className="rside v"><EscudoBox escudo={m.escudoVisitante} nombre={m.visitante} size={22} radius={5} /><span className={`rnm${jugado && gV > gL ? ' w' : ''}`}>{m.visitante}</span></div>
      </div>
      {m.fecha && <div className="rmeta">{m.fecha}</div>}
    </Link>
  )
}

// Fila COMPACTA de forma reciente (dos columnas a 390px): rival + marcador (orden local-visitante del sitio, coloreado
// por el resultado del EQUIPO) + casa/avión + Δ ELO del partido (verde sube / rojo baja; solo liga — en copa viene null).
// Forma de la ficha de partido: la MISMA fila .match compartida (MatchRow), en su variante compacta para caber a
// dos columnas. Añade el FANTASY del equipo (pastilla, mismo color que la ficha de equipo) y la COMPETICIÓN en la
// meta (contexto liga/copa); mantiene el ΔELO. Enlaza a la ficha del partido. Orden Puntos · ELO como en todo el sitio.
function MiniForma({ m, teamCod }: { m: PartidoMini; teamCod: string }) {
  const jugado = m.golesLocal != null && m.golesVisitante != null
  const esLocal = m.codLocal === teamCod
  const rival = esLocal ? m.visitante : m.local
  const rivalEsc = esLocal ? m.escudoVisitante : m.escudoLocal
  const rivalCod = esLocal ? m.codVisitante : m.codLocal
  const gL = (m.golesLocal ?? 0), gV = (m.golesVisitante ?? 0)
  const gf = esLocal ? gL : gV, gc = esLocal ? gV : gL
  const signo: 'G' | 'E' | 'P' | null = !jugado ? null : gf > gc ? 'G' : gf < gc ? 'P' : 'E'
  return (
    <MatchRow
      compact
      marcador={jugado ? `${gL}-${gV}` : null}
      signo={signo}
      propioNombre={esLocal ? m.local : m.visitante}
      propioEscudo={esLocal ? m.escudoLocal : m.escudoVisitante}
      propioCod={teamCod}
      rivalEscudo={rivalEsc}
      rivalNombre={rival}
      rivalCod={rivalCod ?? null}
      esLocal={esLocal}
      fecha={m.fecha}
      etiqueta={m.compNombre || undefined}
      goles={jugado && gf > 0 ? gf : undefined}
      p0={jugado && gc === 0}
      ta={m.ta} td={m.td} tr={m.tr}
      eloDelta={m.eloDelta}
      href={`/madrid/partido/${partidoSlug(m.codacta, m.local, m.visitante)}`}
    />
  )
}

// #1 Pronóstico ELO: prosa, sin % ni cuota. Solo la FRASE (las cifras van enfrentadas en la tarjeta).
const fmtElo = (n: number) => Math.round(n).toString()
const fmtDelta = (m: number) => `${m >= 0 ? '+' : '−'}${Math.abs(Math.round(m))}`
function favoritoFrase(a: number | null, b: number | null): { texto: string; lado: 'local' | 'visitante' | 'igual' } | null {
  if (a == null || b == null) return null
  const d = a - b, ad = Math.abs(d)
  if (ad < 15) return { texto: 'Llegaban igualados en ELO', lado: 'igual' }
  const grado = ad >= 60 ? 'partía como claro favorito' : ad >= 25 ? 'partía por delante' : 'partía ligeramente por delante'
  return { texto: grado, lado: d > 0 ? 'local' : 'visitante' }
}
// #3 Contexto de puesto (solo dentro de esta competición; requiere jornada anterior -> no en J1).
function ctxPuesto(pre: number | null, post: number | null): string | null {
  if (pre == null || post == null) return null
  // Lidera con el puesto y lo ancla a "la clasificación" (no al ELO de justo encima). Movimiento compacto para móvil.
  const base = `${post}.º en la clasificación`
  if (post < pre) return `${base} · sube ${pre - post}`
  if (post > pre) return `${base} · baja ${post - pre}`
  return `${base} · se mantiene`
}
// #5 Texto del hito (se excluyen los "*_registrado" en la capa de datos).
const HITO_TX: Record<string, (v: number | null) => string> = {
  debut: () => 'debutó',
  primer_gol: () => 'marcó su primer gol',
  primer_hat_trick: () => 'firmó su primer hat-trick',
  primera_porteria_cero: () => 'dejó su primera portería a cero',
  goles_acumulados: (v) => `alcanzó los ${v} goles`,
  partidos_acumulados: (v) => `llegó a los ${v} partidos`,
  porterias_cero_acumuladas: (v) => `sumó ${v} porterías a cero`,
  temporada_completa: () => 'completó la temporada',
}
function hitoTexto(h: PartidoFicha['hitos'][number]): string {
  const base = HITO_TX[h.tipo]?.(h.valor) || h.detalle || h.tipo.replace(/_/g, ' ')
  return h.contexto ? `${base} · ${h.contexto}` : base
}

// #3/#4 Tarjeta de pronóstico: ELO con el que llegaban ENFRENTADOS (como el marcador), la frase del favorito, y tras
// el partido el ELO final + Δ + contexto de puesto por equipo. Nombres con NombreEquipo (bien formateados), no formatNombre.
// VENTAJA DE LOCALÍA — MEDIDA sobre nuestros datos (web_resultados, liga, sin copa por sede a veces neutral):
// el equipo local se lleva ≈0,540 de los puntos en igualdad de fuerzas. Estable en el tiempo (T17-T21: 0,538-0,549)
// y entre categorías (juvenil 0,542 / aficionado 0,540), sobre ~106.000 partidos. Medido 2026-08-31.
// Derivación: H = 400·log10(0,540/0,460) ≈ 28. A igualdad de ELO, +28 reproduce esa cuota 0,540.
// Para revisar el criterio (o reajustar la localía), cambia SOLO esta constante — no toques la fórmula.
const HOME_ADV_ELO = 28
// Empate: el amateur empata ~15% (la mitad que el profesional). El pico de la banda (a igualdad) se calibra a ese ~15%.
const DRAW_PEAK = 0.22

// Probabilidad 1-X-2 DERIVADA DEL ELO (se calcula AL RENDERIZAR, con el ELO del momento). No es una predicción nuestra:
// es la lectura estándar de la diferencia de ELO (logística D=400) + la localía medida + una banda de empate que crece
// cuanto más igualados llegan. Sin decimales en pantalla: la proporción la da la barra y la lectura, la frase.
function probsElo(a: number | null, b: number | null): { l: number; e: number; v: number } | null {
  if (a == null || b == null) return null
  const pl = 1 / (1 + Math.pow(10, -((a + HOME_ADV_ELO) - b) / 400))   // cuota de puntos esperada del local (con localía)
  const pe = DRAW_PEAK * (1 - Math.abs(2 * pl - 1))                     // empate: máximo a la igualdad, ->0 si hay abismo
  const l = Math.max(0, pl - pe / 2), v = Math.max(0, 1 - pl - pe / 2), e = Math.max(0, pe)
  const s = l + e + v || 1
  return { l: l / s, e: e / s, v: v / s }
}
// Porcentajes ENTEROS (sin decimales) que SUMAN 100, por mayor resto (evita 99/101). Uno por tramo: local/empate/
// visitante. "62% · 23% · 15%" informa sin parecer una cuota de apuestas; la proporción exacta la da la barra.
function pct3(p: { l: number; e: number; v: number }): [number, number, number] {
  const raw = [p.l * 100, p.e * 100, p.v * 100]
  const out = raw.map(Math.floor)
  const resto = 100 - out.reduce((a, b) => a + b, 0)
  const orden = raw.map((x, i) => [x - Math.floor(x), i] as [number, number]).sort((a, b) => b[0] - a[0])
  for (let k = 0; k < resto; k++) out[orden[k % 3][1]]++
  return out as [number, number, number]
}

function PronoCard({ p }: { p: PartidoFicha }) {
  const hayPre = p.eloPreLocal != null && p.eloPreVisitante != null
  const hayPost = p.eloPostLocal != null && p.eloPostVisitante != null
  const fav = favoritoFrase(p.eloPreLocal, p.eloPreVisitante)
  const prob = probsElo(p.eloPreLocal, p.eloPreVisitante)
  const pc = prob ? pct3(prob) : null
  const ctxL = ctxPuesto(p.posPreLocal, p.posPostLocal)
  const ctxV = ctxPuesto(p.posPreVisitante, p.posPostVisitante)
  if (!hayPre && !hayPost && !ctxL && !ctxV) return null
  const favLado = fav && fav.lado !== 'igual' ? (fav.lado === 'local' ? p.local : p.visitante) : null
  const teamPost = (post: number | null, mov: number | null, ctx: string | null, lado: PartidoLado) => (
    <div className="pp-team">
      <EscudoBox escudo={lado.escudo} nombre={lado.nombre} size={18} radius={4} />
      {post != null && <span className="pp-elo"><span className="pp-elo-lbl">ELO</span> {fmtElo(post)}{mov != null && <b style={{ color: mov >= 0 ? 'var(--e3)' : 'var(--e0)' }}> {fmtDelta(mov)}</b>}</span>}
      {ctx && <span className="pp-ctx">{ctx}</span>}
    </div>
  )
  return (
    <section className="prono gc-prono">
      <div className="prono-k">Pronóstico · probabilidad por ELO</div>
      {hayPre && (
        <div className="prono-elos">
          <EscudoBox escudo={p.local.escudo} nombre={p.local.nombre} size={20} radius={4} />
          <span className="pe-vals"><b className={fav?.lado === 'local' ? 'fav' : ''}>{fmtElo(p.eloPreLocal as number)}</b><span className="pe-sep">—</span><b className={fav?.lado === 'visitante' ? 'fav' : ''}>{fmtElo(p.eloPreVisitante as number)}</b></span>
          <EscudoBox escudo={p.visitante.escudo} nombre={p.visitante.nombre} size={20} radius={4} />
        </div>
      )}
      {prob && pc && (<>
        {/* Barra de probabilidad DERIVADA DEL ELO: local | empate | visitante. El ancho lleva 2 decimales SOLO en el
            CSS (nunca visibles); sobre cada tramo, el % ENTERO (sin decimales, suman 100) — informa sin parecer cuota. */}
        <div className="prono-bar" aria-hidden="true">
          <span className="pb pb-l" style={{ width: `${(prob.l * 100).toFixed(2)}%` }} />
          <span className="pb pb-e" style={{ width: `${(prob.e * 100).toFixed(2)}%` }} />
          <span className="pb pb-v" style={{ width: `${(prob.v * 100).toFixed(2)}%` }} />
        </div>
        <div className="prono-barpct">
          <span style={{ width: `${(prob.l * 100).toFixed(2)}%` }}>{pc[0]}%</span>
          <span style={{ width: `${(prob.e * 100).toFixed(2)}%` }}>{pc[1]}%</span>
          <span style={{ width: `${(prob.v * 100).toFixed(2)}%` }}>{pc[2]}%</span>
        </div>
        <div className="prono-barleg"><span>Local</span><span>Empate</span><span>Visitante</span></div>
      </>)}
      {fav && <div className="prono-fav">{favLado ? <><b><NombreEquipo codequipo={favLado.codequipo} nombre={favLado.nombre} /></b> {fav.texto}</> : fav.texto}</div>}
      {prob && <div className="prono-note">Probabilidad estimada a partir del ELO, no una predicción.</div>}
      {(hayPost || ctxL || ctxV) && <>
        <div className="prono-div"><span>tras el partido</span></div>
        <div className="prono-post">
          {teamPost(p.eloPostLocal, p.movEloLocal, ctxL, p.local)}
          {teamPost(p.eloPostVisitante, p.movEloVisitante, ctxV, p.visitante)}
        </div>
      </>}
    </section>
  )
}

// RACHAS — un lado de un concepto (marcando/victorias/invicto). Reutiliza la batería del percentil (.batt): 10 celdas
// rellenas en proporción al récord (round(act/rec·10)). El número ACTUAL va hacia FUERA (extremo) y "Récord N" hacia
// el CENTRO (borde interior), enfrentados local↔visitante sin cruzar la vista. Récord igualado (act≥rec) → ámbar +
// banderín, es noticia. Racha rota (0) → batería vacía + número atenuado: se lee como cero, no como error.
function RachaLado({ act, rec, side }: { act: number; rec: number; side: 'l' | 'v' }) {
  const hit = rec > 0 && act >= rec
  // Racha activa (act>0) -> al menos 1 celda, para no confundir "poco" con "rota" (0). Rota -> 0 celdas.
  const cells = rec > 0 && act > 0 ? Math.max(1, Math.min(10, Math.round((act / rec) * 10))) : 0
  const fill = hit ? 'var(--amber)' : side === 'l' ? 'var(--zona-po)' : 'rgb(249,115,22)'
  const nCls = act === 0 ? 'ra-n rota' : hit ? 'ra-n hit' : `ra-n ${side === 'l' ? 'loc' : 'vis'}`
  return (
    <div className={`ra-side ra-${side}`}>
      <div className="ra-track">
        {/* Número + batería en la MISMA línea (centrados verticalmente entre sí); récord/pastilla debajo, sin pisarse. */}
        <div className="ra-topline">
          <span className={nCls}>{act}</span>
          <div className="batt ra-batt">{Array.from({ length: 10 }).map((_, i) => <i key={i} style={i < cells ? { background: fill } : undefined} />)}</div>
        </div>
        {hit ? <span className="ra-hit">▲ iguala su récord</span> : <span className="ra-rec">Récord <b>{rec}</b></span>}
      </div>
    </div>
  )
}
const RACHA_DEFS = [
  { k: 'Marcando', ic: <Balon size={17} /> },
  { k: 'Victorias', ic: <Trophy size={16} /> },
  { k: 'Sin perder', ic: <ShieldCheck size={16} /> },
] as const

export default function FichaPartidoV2({ p }: { p: PartidoFicha }) {
  const tieneHora = !!p.hora && /^\d{1,2}:\d{2}$/.test(p.hora) && p.hora !== '00:00'   // la RFFM publica la hora la semana del partido
  const puedeIcs = !p.jugado && !!p.fecha && /^\d{2}\/\d{2}\/\d{4}$/.test(p.fecha) && tieneHora
  const icsUrl = `/api/ics/${p.codacta}`
  const googleUrl = puedeIcs ? googleRenderUrl({ title: `${p.local.nombre} vs ${p.visitante.nombre}`, fecha: p.fecha as string, hora: p.hora as string, campo: p.campoNombre, details: `${p.nombreComp} · Jornada ${p.jornada}\n${SITE_URL}/madrid/partido/${partidoSlug(p.codacta, p.local.nombre, p.visitante.nombre)}` }) : null
  const gL = p.golesLocal ?? 0, gV = p.golesVisitante ?? 0
  const colL = p.jugado ? (gL > gV ? 'var(--e3)' : gL < gV ? 'var(--e0)' : 'var(--ink)') : 'var(--ink)'
  const colV = p.jugado ? (gV > gL ? 'var(--e3)' : gV < gL ? 'var(--e0)' : 'var(--ink)') : 'var(--ink)'
  const mvpLado = p.mvp?.lado === 'local' ? p.local : p.visitante

  return (
    <div className="fjv2 fpv2">
      {/* HERO / MARCADOR */}
      <div className="mhero">
        <div className="over"><Link href={p.compHref}>{p.nombreComp}</Link> · Jornada {p.jornada}</div>
        <div className="mscore">
          <div className="mteam">
            <EscudoBox escudo={p.local.escudo} nombre={p.local.nombre} size={54} radius={12} />
            <span className="tn"><NombreEquipo codequipo={p.local.codequipo} nombre={p.local.nombre} /></span>
            <FormaDots nombre={p.local.nombre} minis={p.formaLocal} />
          </div>
          <div className="mmid">
            {p.jugado ? (
              <>
                <span className="mres"><span style={{ color: colL }}>{gL}</span><span className="sep">-</span><span style={{ color: colV }}>{gV}</span></span>
                <span className="pill n">FINAL</span>
              </>
            ) : (
              // Estado FUTURO: en vez del hueco del marcador, se enmarca "Próximo partido · fecha · hora". Sin hora
              // confirmada (la RFFM la publica la semana del partido) se muestra solo la fecha + "Hora por confirmar".
              <div className="mfut">
                <span className="mfut-k">Próximo partido</span>
                <span className="mfut-fh">{p.fecha ? fechaCorta(p.fecha) : 'Fecha por confirmar'}{tieneHora ? <> · <b>{p.hora}</b></> : ''}</span>
                {p.fecha && !tieneHora && <span className="mfut-sinhora">Hora por confirmar</span>}
              </div>
            )}
          </div>
          <div className="mteam">
            <EscudoBox escudo={p.visitante.escudo} nombre={p.visitante.nombre} size={54} radius={12} />
            <span className="tn"><NombreEquipo codequipo={p.visitante.codequipo} nombre={p.visitante.nombre} /></span>
            <FormaDots nombre={p.visitante.nombre} minis={p.formaVisitante} />
          </div>
        </div>
        <div className="mmeta">
          {/* Jugado: fecha·hora aquí (bajo el marcador). Futuro: ya va enmarcada en el hero -> aquí solo campo. */}
          {p.jugado && (p.fecha || p.hora) && <span>{[p.fecha, p.hora].filter(Boolean).join(' · ')}</span>}
          {p.campoNombre && (
            p.campoHref
              ? <a className="hero-campo" href={p.campoHref} {...(p.campoHref.startsWith('/') ? {} : { target: '_blank', rel: 'noopener noreferrer' })}><MapPin size={12} /><span>{p.campoNombre}</span>{p.campoSuperficie && <span className="campo-sup">· <SuperficieCampo superficie={p.campoSuperficie} /></span>}</a>
              : <span className="hero-campo"><MapPin size={12} /><span>{p.campoNombre}</span></span>
          )}
          {/* #2 Árbitros aquí, bajo el campo: es donde el usuario los busca. Solo nombre + rol, sin enlace (privacidad). */}
          {p.arbitros.length > 0 && <span className="hero-arb">{p.arbitros.map((a, i) => <span key={i}>{i > 0 ? ' · ' : ''}<span className="cap">{a.rol}</span> {nombreCompleto(a.nombre)}</span>)}</span>}
        </div>
        {!p.jugado && puedeIcs && (
          <div className="cal-wrap">
            <CalendarLink appleHref={icsUrl} otherHref={googleUrl || icsUrl} className="cal-btn"><CalendarPlus size={15} /> Añade este partido a tu calendario</CalendarLink>
          </div>
        )}
      </div>

      {/* Pestañas (BeSoccer): el contenido de TODAS se sirve en el HTML y se oculta por CSS (SEO). Resumen agrupa
          lo digest; Alineaciones (el bloque más largo) y Cara a cara van cada una a la suya -> el scroll a 390px
          baja de ~4,6 a ~1,6 pantallas. */}
      <PartidoTabs tabs={[
        {
          id: 'resumen', label: 'Resumen', show: true, panel: (
            <>
              {/* #3/#4 Pronóstico + ELO pre/post + contexto de puesto (tarjeta enfrentada, como el marcador). */}
              <PronoCard p={p} />

              {/* MVP + Efemérides: destacados del partido. Se agrupan en una sola celda (.gc-destacados) para que en
                  escritorio queden apilados en una columna, emparejados con el Cara a cara. */}
              {((p.jugado && p.mvp) || p.hitos.length > 0) && (
                <div className="gc-destacados">
              {/* MVP fantasy — mismo tratamiento que "Top de la plantilla" (fila .pl + rótulo bien visible) */}
              {p.jugado && p.mvp && (
                <section>
                  {/* MVP: es el protagonista. Trofeo ÁMBAR como acento en el rótulo (el ámbar está reservado a
                      playoff/copa/disciplina, pero como acento puntual en el icono no rompe el código) + jerarquía
                      mayor (avatar, nombre y puntos más grandes que una fila normal). SIN fondo dorado. */}
                  <SectionHeader title={<span className="mvp-t"><Trophy size={16} strokeWidth={2.5} style={{ color: 'var(--amber)' }} /> MVP del partido</span>} sub="por puntos fantasy" />
                  <div className="pl mvp-hero">
                    <PlayerAvatar className="pl-av" nombre={p.mvp.nombre} pos={p.mvp.pos} />
                    <div className="pl-mid">
                      <div className="pl-nm">{p.mvp.href ? <Link href={p.mvp.href}>{nombreCompleto(p.mvp.nombre)}</Link> : nombreCompleto(p.mvp.nombre)}</div>
                      <div className="pl-me">{p.mvp.pos && <Pastilla pos={p.mvp.pos} size="mini" />}<span className="mvp-eq">{nombreEquipo(mvpLado.nombre)}</span></div>
                    </div>
                    <div className="pl-val" style={{ background: 'var(--e2)', color: '#08111f' }}>{p.mvp.puntos}</div>
                  </div>
                </section>
              )}

              {/* #5 EFEMÉRIDES — hitos ligados al partido (web_jugador_hitos por codacta). Funciona en copa y liga. */}
              {p.hitos.length > 0 && (
                <section>
                  <SectionHeader title="Efemérides del partido" />
                  <div className="hitos">
                    {p.hitos.map((h, i) => (
                      <div className={`hito hito-${h.lado}`} key={`${h.codjugador}-${h.tipo}-${i}`}>
                        <span className="hito-nm">{h.href ? <Link href={h.href}>{nombreCompleto(h.nombre)}</Link> : nombreCompleto(h.nombre)}</span>
                        <span className="hito-tx">{hitoTexto(h)}</span>
                      </div>
                    ))}
                  </div>
                </section>
              )}
                </div>
              )}

              {/* RACHAS — una barra (batería del percentil) por concepto, enfrentada local | concepto | visitante.
                  Actual hacia fuera, récord hacia el centro; récord igualado en ámbar; racha rota (0) vacía. */}
              {(p.formaLocal.length > 0 || p.formaVisitante.length > 0) && (
                <section className="gc-rachas">
                  <SectionHeader title="Rachas" sub="ahora vs récord" />
                  <div className="rachas">
                    {([
                      [RACHA_DEFS[0], p.rachasLocal.marcandoAct, p.rachasLocal.marcandoRec, p.rachasVisitante.marcandoAct, p.rachasVisitante.marcandoRec],
                      [RACHA_DEFS[1], p.rachasLocal.victoriasAct, p.rachasLocal.victoriasRec, p.rachasVisitante.victoriasAct, p.rachasVisitante.victoriasRec],
                      [RACHA_DEFS[2], p.rachasLocal.invictoAct, p.rachasLocal.invictoRec, p.rachasVisitante.invictoAct, p.rachasVisitante.invictoRec],
                    ] as const).map(([def, la, lr, va, vr]) => (
                      <div className="rrow" key={def.k}>
                        <RachaLado act={la} rec={lr} side="l" />
                        <div className="ra-mid"><span className="ra-ic">{def.ic}</span><span className="ra-k">{def.k}</span></div>
                        <RachaLado act={va} rec={vr} side="v" />
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* ÚLTIMOS PARTIDOS de cada equipo */}
              {(p.formaLocal.length > 0 || p.formaVisitante.length > 0) && (
                <section className="gc-ultimos">
                  <SectionHeader title="Últimos partidos" />
                  {/* Escritorio: dos columnas (una por equipo). Móvil: una columna a ancho completo (ver ficha.css).
                      Fila híbrida (MatchRow): cara a cara + meta; el dato del bloque es el ΔELO del equipo (sin PF). */}
                  <div className="forma-2col">
                    <div className="forma-col">{p.formaLocal.length > 0 && <><div className="al-sub forma-h">{nombreEquipo(p.local.nombre)}</div>{p.formaLocal.map((m) => <MiniForma key={m.codacta} m={m} teamCod={p.local.codequipo} />)}</>}</div>
                    <div className="forma-col">{p.formaVisitante.length > 0 && <><div className="al-sub forma-h">{nombreEquipo(p.visitante.nombre)}</div>{p.formaVisitante.map((m) => <MiniForma key={m.codacta} m={m} teamCod={p.visitante.codequipo} />)}</>}</div>
                  </div>
                </section>
              )}
            </>
          ),
        },
        {
          id: 'alineaciones', label: 'Alineaciones',
          show: p.jugado && (p.local.titulares.length > 0 || p.visitante.titulares.length > 0),
          panel: (
            <section className="gc-alineaciones">
              <SectionHeader title="Alineaciones" />
              <AlineacionesGrid p={p} />
              {/* Leyenda de iconos (misma que la plantilla) para que la ficha se lea igual que las demás. */}
              <div className="pl-ley">
                <span className="lg-item"><span style={{ color: 'var(--e3)', display: 'inline-flex' }}><Balon size={11} /></span>Gol</span>
                <span className="lg-item"><span style={{ color: 'var(--card-y)', display: 'inline-flex' }}><TarjetaAmarilla size={10} /></span>Amarilla</span>
                <span className="lg-item"><span style={{ color: 'var(--e0)', display: 'inline-flex' }}><TarjetaRoja size={11} /></span>Roja</span>
                <span className="lg-item"><span style={{ color: 'var(--e3)', display: 'inline-flex' }}><FlechaEntra size={11} /></span><span style={{ color: 'var(--e0)', display: 'inline-flex' }}><FlechaSale size={11} /></span>Cambio</span>
                <span className="lg-item"><span style={{ color: 'var(--amber)', display: 'inline-flex' }}><Guante size={11} /></span>Portería a cero</span>
                <span className="lg-item"><b style={{ color: 'var(--e3)' }}>+</b>/<b style={{ color: 'var(--e0)' }}>−</b> Δ ELO del partido</span>
                <span className="lg-item">nº = puntos fantasy</span>
              </div>
            </section>
          ),
        },
        {
          id: 'h2h', label: 'Cara a cara', show: p.h2h.length > 0, panel: (
            <section className="gc-h2h">
              <SectionHeader title="Cara a cara" />
              {p.h2h.map((m) => <MiniPartido key={m.codacta} m={m} />)}
            </section>
          ),
        },
      ]} />

    </div>
  )
}
