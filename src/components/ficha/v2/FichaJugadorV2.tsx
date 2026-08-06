import Link from 'next/link'
import { notFound } from 'next/navigation'
import { supabase, escudoUrl } from '@/lib/supabase'
import EscudoImg from '@/components/EscudoImg'
import NombreEquipo from '@/components/NombreEquipo'
import Sello from '@/components/Sello'
import Pastilla from '@/components/Pastilla'
import LigaPastilla from '@/components/LigaPastilla'
import CopasLinea from '@/components/CopasLinea'
import SectionNav from '@/components/ui/SectionNav'
import KpiBar from '@/components/ui/KpiBar'
import CompartirBtn from '@/components/ficha/v2/CompartirBtn'
import AmbitoJornadas from '@/components/ficha/v2/AmbitoJornadas'
import Forma from '@/components/ficha/v2/Forma'
import Analisis from '@/components/ficha/v2/Analisis'
import Nivel from '@/components/ficha/v2/Nivel'
import Totales from '@/components/ficha/v2/Totales'
import Temporadas from '@/components/ficha/v2/Temporadas'
import { getEquipoActualInfo } from '@/lib/equipo'
import { formatNombre, tempLabel, jugadorSlug, LIVE_COD, POS_LABEL } from '@/lib/jugador'
import { PALETA_TEXTO, escalon, CORTES_FIJOS } from '@/lib/escala'
import {
  getJugadorV2, getCarreraV2, getAlertaActual, getAmbitoTemporada, getCortesElo, labelToCod,
  getPartidosTemporada, ventanasForma, racha5DePartidos, splitCasaFuera, balanceEquipo,
  type CarreraRow,
} from '@/lib/jugadorV2'

const num = (n: number | null | undefined) => (n ?? 0).toLocaleString('es-ES')
const iniciales = (nombre: string) => {
  const w = nombre.split(/\s+/).filter(Boolean)
  return (w.length ? (w[0][0] + (w[1]?.[0] ?? w[0][1] ?? '')) : '?').toUpperCase()
}
const AVATAR_POS: Record<string, string> = {
  POR: 'from-orange-500/45 ring-orange-500/60', DEF: 'from-blue-500/45 ring-blue-500/60',
  MED: 'from-grass-500/45 ring-grass-400/60', DEL: 'from-red-500/45 ring-red-500/60',
}

// Color de rendimiento (clase de texto) para un valor con sus cortes; '' si no hay valor.
function claseNivel(valor: number | null | undefined, cortes: readonly [number, number, number, number]): string {
  return valor == null ? 'text-chalk-100' : PALETA_TEXTO[escalon(valor, cortes)]
}

export default async function FichaJugadorV2({ cod, temporadaLabel }: { cod: string; temporadaLabel: string | null }) {
  const [j, carrera] = await Promise.all([getJugadorV2(cod), getCarreraV2(cod)])
  if (!j) notFound()

  const nombre = formatNombre(j.nombre)
  const slug = jugadorSlug(j.codjugador, j.nombre)
  const portero = !!j.es_portero
  const inactivo = Number(j.codtemporada_ultima) < Number(LIVE_COD)

  // Temporada seleccionada: la del parámetro (si es válida y el jugador la tiene) o la más reciente.
  const temporadasJugador = Array.from(new Set(carrera.map((c) => c.codtemporada)))
  const codPedido = labelToCod(temporadaLabel)
  const tempSel = (codPedido && temporadasJugador.includes(codPedido)) ? codPedido : (carrera[0]?.codtemporada ?? null)
  const etapas = carrera.filter((c) => c.codtemporada === tempSel)
  const etapaPrincipal: CarreraRow | undefined = etapas[0]
  const categoriaSel = etapaPrincipal?.nombre_comp ?? j.categoria_rama ?? null

  // Agregados de la temporada seleccionada (suma de etapas). Media = pts fantasy / PJ.
  const sum = (f: (c: CarreraRow) => number | null) => etapas.reduce((s, c) => s + (f(c) ?? 0), 0)
  const pj = sum((c) => c.pj), golesT = sum((c) => c.goles), ptsF = sum((c) => c.pts_fantasy), minT = sum((c) => c.minutos)
  const media = pj > 0 ? ptsF / pj : null
  const eloSel = etapaPrincipal?.elo_final ?? j.elo_actual ?? null

  const [equipoInfo, cortesElo, alerta, comps, partidosTemp] = await Promise.all([
    inactivo ? Promise.resolve({ copas: [], posicionActual: null }) : getEquipoActualInfo(j.codequipo_actual),
    getCortesElo(categoriaSel, tempSel ? Number(tempSel) : null),
    getAlertaActual(cod),
    tempSel ? getAmbitoTemporada(cod, tempSel) : Promise.resolve([]),
    tempSel ? getPartidosTemporada(cod, tempSel) : Promise.resolve([] as any[]),
  ])
  const { copas, posicionActual } = equipoInfo

  // Forma, casa/fuera y balance del equipo (con/sin él) sobre los partidos de la temporada seleccionada.
  const ventanas = ventanasForma(partidosTemp)
  const racha = racha5DePartidos(partidosTemp)
  const split = splitCasaFuera(partidosTemp)
  const balance = await balanceEquipo(partidosTemp)

  // Totales de carrera: amarillas/rojas no están en web_jugador -> se suman de la carrera.
  const amarillasTotal = carrera.reduce((s, c) => s + (c.tarjetas_amarillas ?? 0), 0)
  const rojasTotal = carrera.reduce((s, c) => s + (c.tarjetas_rojas ?? 0), 0)
  const dorsalesOtros = (j.dorsales_otros || []).filter((d) => d !== j.dorsal_ultimo && d !== j.dorsal_comun)
  const hayNivel = j.elo_actual != null || !!j.rank_general || !!j.rank_categoria || !!j.rank_posicion

  // Nombre en dos líneas: pila pequeño arriba, apellidos grandes.
  const partes = nombre.split(/\s+/)
  const pila = partes[0] ?? ''
  const apellidos = partes.slice(1).join(' ') || pila

  // Secciones presentes (para la barra de anclas).
  const secciones = [
    comps.length > 0 ? { id: 'jornadas', label: 'Por jornada' } : null,
    partidosTemp.length > 0 ? { id: 'forma', label: 'Forma' } : null,
    partidosTemp.length > 0 ? { id: 'analisis', label: 'Análisis' } : null,
    hayNivel ? { id: 'nivel', label: 'Nivel' } : null,
    carrera.length > 0 ? { id: 'totales', label: 'Totales' } : null,
    carrera.length > 0 ? { id: 'temporadas', label: 'Temporadas' } : null,
  ].filter(Boolean) as { id: string; label: string }[]

  // Etiqueta reutilizable para las secciones que NO dependen de la temporada seleccionada.
  const todasTemp = <span className="ml-1.5 rounded bg-pitch-700 px-1.5 py-0.5 text-chalk-500 normal-case tracking-normal" style={{ fontSize: 'var(--t-micro)' }}>Todas las temporadas</span>

  return (
    <div className="max-w-5xl mx-auto px-4 py-6" style={{ fontSize: 'var(--t-body)' }}>

      {/* 1 · HERO */}
      <section className="flex items-start gap-4">
        <div className="relative flex-shrink-0">
          <div className={`w-20 h-20 rounded-2xl flex items-center justify-center font-display font-bold text-white ring-2 ring-inset bg-gradient-to-br to-pitch-800 ${AVATAR_POS[j.posicion_pastilla || ''] || 'from-pitch-600/70 ring-pitch-600'}`}
            style={{ fontSize: 'var(--n-lg)' }}>
            {iniciales(nombre)}
          </div>
          {j.dorsal_ultimo != null && (
            <span className="absolute -bottom-2 -right-2 w-8 h-8 rounded-full bg-pitch-900 ring-2 ring-pitch-600 flex items-center justify-center font-display font-bold text-white tabular-nums"
              style={{ fontSize: 'var(--t-lead)' }}>{j.dorsal_ultimo}</span>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <h1 className="min-w-0 leading-none">
              <span className="block text-chalk-500" style={{ fontSize: 'var(--t-lead)' }}>{pila}</span>
              <span className="block font-display font-bold text-white leading-tight" style={{ fontSize: 'var(--n-lg)' }}>{apellidos}</span>
            </h1>
            <CompartirBtn titulo={`${nombre} · Fútbol11Stats`} className="flex-shrink-0 mt-1" />
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-1.5" style={{ fontSize: 'var(--t-cap)' }}>
            <Pastilla pos={j.posicion_pastilla} estimada={!!j.posicion_es_estimada} />
            {j.posicion_es_estimada && <span className="text-chalk-600" style={{ fontSize: 'var(--t-micro)' }}>est.</span>}
            {j.edad != null && <span className="rounded-full bg-pitch-800 px-2 py-0.5 text-chalk-400 tabular-nums">{j.edad} años</span>}
            {j.equipo_actual_nombre && (
              <span className="inline-flex items-center gap-1 rounded-full bg-pitch-800 px-2 py-0.5 text-chalk-300">
                {escudoUrl(j.escudo_actual) && (
                  <span className="inline-flex items-center justify-center w-4 h-4 bg-white rounded-sm p-px"><EscudoImg escudo={j.escudo_actual} nombre={j.equipo_actual_nombre ?? undefined} /></span>
                )}
                <NombreEquipo codequipo={j.codequipo_actual} nombre={j.equipo_actual_nombre} />
              </span>
            )}
          </div>

          {(categoriaSel || copas.length > 0) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <LigaPastilla nombreComp={etapaPrincipal?.nombre_comp ?? null}
                segments={[etapaPrincipal?.nombre_comp ?? null, etapaPrincipal?.grupo_nombre ?? null, inactivo || posicionActual == null ? null : `${posicionActual}º`]}
                muted={inactivo} />
              <CopasLinea copas={copas} />
              {categoriaSel && <Sello nombreComp={categoriaSel} size={20} />}
            </div>
          )}
        </div>
      </section>

      {/* Franja disciplinaria: solo si hay alerta (ciclo de amarillas o sanción) */}
      {alerta && alerta.estado && (
        <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 flex items-center gap-2 text-amber-300" style={{ fontSize: 'var(--t-sm)' }}>
          <span className="font-semibold uppercase tracking-wide" style={{ fontSize: 'var(--t-micro)' }}>{alerta.estado}</span>
          {alerta.amarillas_ciclo != null && alerta.ciclo_umbral != null && (
            <span className="text-amber-200/80">{alerta.amarillas_ciclo}/{alerta.ciclo_umbral} amarillas del ciclo</span>
          )}
          {(alerta.rojas_directas ?? 0) > 0 && <span className="text-red-300">roja directa</span>}
        </div>
      )}

      {/* 2 · KPIs */}
      <div className="mt-5 rounded-xl border border-pitch-700 bg-pitch-800 py-3">
        <KpiBar items={[
          { valor: num(pj), clave: 'PJ' },
          { valor: num(golesT), clave: portero ? 'P. a 0' : 'Goles' },
          { valor: num(Math.round(ptsF)), clave: 'Pts Fantasy' },
          { valor: media != null ? media.toFixed(2) : '—', clave: 'Media', className: claseNivel(media, CORTES_FIJOS.mediaPartido) },
          { valor: eloSel != null ? String(Math.round(eloSel)) : '—', clave: 'ELO', className: claseNivel(eloSel, cortesElo) },
        ]} />
      </div>

      {/* Barra de anclas */}
      {secciones.length > 0 && <div className="mt-5"><SectionNav secciones={secciones} /></div>}

      {/* 3 · Ámbito */}
      <section className="mt-6">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-chalk-600 mb-2" style={{ fontSize: 'var(--t-micro)' }}>Ámbito</h2>
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-chalk-600" style={{ fontSize: 'var(--t-micro)' }}>Temporada:</span>
          {carrera
            .map((c) => c.codtemporada)
            .filter((t, i, a) => a.indexOf(t) === i)
            .map((t) => {
              const activa = t === tempSel
              return (
                <Link key={t} href={`/madrid/jugador/${slug}/${tempLabel(t)}/v2`}
                  className={`rounded-full px-2.5 py-0.5 tabular-nums transition-colors ${activa ? 'bg-grass-500 text-white' : 'bg-pitch-800 text-chalk-500 hover:text-white'}`}
                  style={{ fontSize: 'var(--t-sm)' }}>{tempLabel(t)}</Link>
              )
            })}
        </div>
        <p className="mt-2 text-chalk-600" style={{ fontSize: 'var(--t-micro)' }}>
          Las secciones marcadas «Todas las temporadas» no dependen de la selección.
        </p>
      </section>

      {/* 4 · Puntos por jornada */}
      {comps.length > 0 && (
        <section id="jornadas" className="mt-6 scroll-mt-24">
          <h2 className="flex items-center gap-1.5 font-semibold uppercase tracking-widest text-chalk-600 mb-2" style={{ fontSize: 'var(--t-micro)' }}>
            Puntos por jornada · <span className="text-chalk-500 normal-case tracking-normal">{tempLabel(tempSel)}</span>
          </h2>
          <AmbitoJornadas comps={comps} cortes={CORTES_FIJOS.puntosPartido} />
        </section>
      )}

      {/* 5 · Forma */}
      {partidosTemp.length > 0 && (
        <section id="forma" className="mt-8 scroll-mt-24">
          <h2 className="font-semibold uppercase tracking-widest text-chalk-600 mb-2" style={{ fontSize: 'var(--t-micro)' }}>Forma · {tempLabel(tempSel)}</h2>
          <Forma ventanas={ventanas} racha={racha} />
        </section>
      )}

      {/* 6 · Análisis */}
      {partidosTemp.length > 0 && (
        <section id="analisis" className="mt-8 scroll-mt-24">
          <h2 className="font-semibold uppercase tracking-widest text-chalk-600 mb-2" style={{ fontSize: 'var(--t-micro)' }}>Análisis · {tempLabel(tempSel)}</h2>
          <Analisis nombreEquipo={etapaPrincipal?.equipo_nombre ?? j.equipo_actual_nombre ?? null}
            con={balance.con} sin={balance.sin} suficiente={balance.suficiente}
            casa={split.casa} fuera={split.fuera} hayLocal={split.hayLocal} />
        </section>
      )}

      {/* 7 · Nivel */}
      {hayNivel && (
        <section id="nivel" className="mt-8 scroll-mt-24">
          <h2 className="font-semibold uppercase tracking-widest text-chalk-600 mb-2" style={{ fontSize: 'var(--t-micro)' }}>Nivel</h2>
          <Nivel elo={j.elo_actual} percentil={j.elo_percentil} cortesElo={cortesElo}
            categoria={categoriaSel} posicion={j.posicion_pastilla} estimada={j.posicion_es_estimada}
            ranks={{
              general: [j.rank_general, j.rank_general_total],
              categoria: [j.rank_categoria, j.rank_categoria_total],
              posicion: [j.rank_posicion, j.rank_posicion_total],
            }} />
        </section>
      )}

      {/* 8 · Totales (todas las temporadas) */}
      {carrera.length > 0 && (
        <section id="totales" className="mt-8 scroll-mt-24">
          <h2 className="flex items-center font-semibold uppercase tracking-widest text-chalk-600 mb-2" style={{ fontSize: 'var(--t-micro)' }}>Totales {todasTemp}</h2>
          <Totales pj={j.pj_total} minutos={j.minutos_total} goles={j.goles_total} titular={j.titular_total}
            suplente={j.suplente_total} amarillas={amarillasTotal} rojas={rojasTotal} porteriasCero={j.porterias_cero_total}
            dorsalUltimo={j.dorsal_ultimo} dorsalComun={j.dorsal_comun} dorsalesOtros={dorsalesOtros} />
        </section>
      )}

      {/* 9 · Temporadas (todas las temporadas) */}
      {carrera.length > 0 && (
        <section id="temporadas" className="mt-8 scroll-mt-24">
          <h2 className="flex items-center font-semibold uppercase tracking-widest text-chalk-600 mb-2" style={{ fontSize: 'var(--t-micro)' }}>Temporadas {todasTemp}</h2>
          <Temporadas carrera={carrera} />
        </section>
      )}

      {/* Pie provisional (se completa en secciones posteriores) */}
      <footer className="mt-12 pt-5 border-t border-pitch-700/60 flex items-center justify-between text-chalk-600" style={{ fontSize: 'var(--t-cap)' }}>
        <CompartirBtn titulo={`${nombre} · Fútbol11Stats`} label="Compartir" />
        <a href={`mailto:futbol11stats@gmail.com?subject=${encodeURIComponent(`Corrección en la ficha de ${nombre}`)}`}
          className="hover:text-white transition-colors">Corregir datos</a>
      </footer>

      <p className="sr-only">{POS_LABEL[j.posicion_pastilla || ''] || ''}</p>
    </div>
  )
}
