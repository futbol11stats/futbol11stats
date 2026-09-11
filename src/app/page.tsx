export const revalidate = 2592000  // ISR 30d (Fluid CPU free tier): contenido congelado en pretemporada; cada deploy/re-export invalida TODA la caché, así que los datos nuevos llegan igual. De ~4 regeneraciones/día/URL a 1 por deploy.

import type { Metadata } from 'next'
import Link from 'next/link'
import JsonLd from '@/components/JsonLd'
import { graphLd, websiteLd, organizationLd } from '@/lib/jsonld'
import { ORDEN_AFICIONADOS, ORDEN_JUVENILES } from '@/lib/competiciones'
import CompeticionCard from '@/components/ui/CompeticionCard'
import { getGruposIndice } from '@/lib/temporadas'
import '@/components/ficha/v2/ficha.css'
import Panorama from '@/components/ficha/v2/Panorama'
import EscudoBox from '@/components/ficha/v2/EscudoBox'
import NombreJugador from '@/components/NombreJugador'
import Sello from '@/components/Sello'
import { getHomeDigest } from '@/lib/home'
import { fichasExistentes } from '@/lib/jugador'
import { nombreEquipo } from '@/lib/nombre'
import { fmtNum } from '@/lib/formato'
import { getNumTemporadas, ALCANCE } from '@/lib/alcance'
import { codToSlug } from '@/lib/temporadaSlug'
import { Balon, Guante, Escudo, Guion, TarjetaAmarilla, TarjetaDoble, TarjetaRoja } from '@/components/iconos'
import { Home as IconHome, Plane } from 'lucide-react'
import Badge11 from '@/components/ui/Badge11'
import { colorElo } from '@/lib/equipoV2'

// Marca neutral con Madrid como ámbito ACTUAL (preparada para ampliar a otras federaciones). generateMetadata
// (no metadata estático) para DERIVAR el nº de temporadas del dato (no escrito a mano); las cifras de volumen
// salen de la fuente única ALCANCE. Ver [[alcance.ts]].
export async function generateMetadata(): Promise<Metadata> {
  const nTemp = await getNumTemporadas()
  const title = 'Fútbol11Stats — Estadísticas del fútbol aficionado · Madrid'
  return {
    title,
    description: `Clasificaciones, goleadores, fantasy y ELO del fútbol aficionado y juvenil. Todas las competiciones de la RFFM (Madrid): ${nTemp} temporadas, más de ${fmtNum(ALCANCE.partidos)} partidos y ${fmtNum(ALCANCE.jugadores)} jugadores.`,
    alternates: { canonical: '/' },
    openGraph: {
      title,
      description: 'Clasificaciones, goleadores, fantasy y ELO del fútbol aficionado y juvenil de Madrid.',
      url: '/',
      siteName: 'Fútbol11Stats',
      locale: 'es_ES',
      type: 'website',
    },
  }
}

// Orden desde la fuente única (aficionados + juveniles); cada rama filtra el que le toca.
const COMPETICION_ORDER = [...ORDEN_AFICIONADOS, ...ORDEN_JUVENILES]

export default async function Home() {
  // Cada categoría en la temporada activa de cada competición (fuente única data-driven).
  // + Digest de home (líderes + cifras) precalculado por el pipeline: DOS lecturas diminutas, cache-safe.
  const [aficionados, juvenil, digest, numTemporadas] = await Promise.all([
    getGruposIndice('AFICIONADO'), getGruposIndice('JUVENIL'), getHomeDigest(), getNumTemporadas(),
  ])
  const { categorias, metricas, cifras, codtemporada } = digest
  const tempLabel = codtemporada != null ? codToSlug(codtemporada) : ''
  const codsLid = [
    ...categorias.map((c) => c.codjugador),
    ...Object.values(metricas).filter(Boolean).map((j: any) => j.codjugador),
  ]
  const fichasLid = codsLid.length ? await fichasExistentes(codsLid) : new Set<string>()
  const hayMetricas = !!(metricas.goleador || metricas.portero || metricas.pf || metricas.mediaPf || metricas.elo || metricas.tarjetas)

  // Ordenar por número de grupo en cliente (evita orden alfabético tipo "Grupo 10" < "Grupo 2")
  const sortG = (arr: typeof aficionados) => arr.sort((a, b) => {
    const numA = parseInt(a.nombre_grupo.replace(/\D/g, '')) || 0
    const numB = parseInt(b.nombre_grupo.replace(/\D/g, '')) || 0
    return numA - numB
  })
  sortG(aficionados)
  sortG(juvenil)

  // Agrupar por competición
  const groupBy = (arr: typeof aficionados) => {
    const map: Record<string, typeof aficionados> = {}
    for (const g of arr) {
      if (!map[g.nombre_comp]) map[g.nombre_comp] = []
      map[g.nombre_comp].push(g)
    }
    return map
  }

  const aficionadosMap = groupBy(aficionados)
  const juvenilMap = groupBy(juvenil)

  return (
    <div>
      <JsonLd data={graphLd(websiteLd(), organizationLd())} />
      {/* Hero */}
      <section className="relative overflow-hidden bg-pitch-800 border-b border-pitch-700">
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 40px, #1a7a3c 40px, #1a7a3c 41px), repeating-linear-gradient(90deg, transparent, transparent 40px, #1a7a3c 40px, #1a7a3c 41px)'
          }} />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 py-10 md:py-14">
          <div className="max-w-2xl">
            <p className="text-grass-400 text-sm font-semibold uppercase tracking-widest mb-3">
              Real Federación de Fútbol de Madrid
            </p>
            <h1 className="font-display text-5xl md:text-7xl font-extrabold text-white leading-none mb-4">
              FÚTBOL MADRID<br />
              <span className="text-grass-400">EN DATOS</span>
            </h1>
            <p className="text-chalk-600 text-lg mb-8">
              Clasificaciones, goleadores, fantasy y ELO de todas las competiciones RFFM.
              {' '}{numTemporadas} temporadas · {fmtNum(ALCANCE.partidos)}+ partidos · {fmtNum(ALCANCE.jugadores)}+ jugadores.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/madrid/aficionados" className="bg-grass-500 hover:bg-grass-400 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm">
                Aficionados
              </Link>
              <Link href="/madrid/juveniles" className="bg-pitch-700 hover:bg-pitch-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm border border-pitch-600">
                Juvenil
              </Link>
              {/* Eje distinto (directorio, no categoría): estilo propio. Hub que enlaza a las 40k fichas. */}
              <Link href="/clubes" className="bg-pitch-800 hover:bg-grass-500 text-grass-300 hover:text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm border border-grass-500/40">
                Clubes
              </Link>
              <Link href="/campos" className="bg-pitch-800 hover:bg-grass-500 text-grass-300 hover:text-white font-semibold px-5 py-2.5 rounded-lg transition-colors text-sm border border-grass-500/40">
                Campos
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* LO QUE PASA EN LA RFFM — dos bloques de líderes + cifras, del digest del pipeline. Se reutilizan las
          piezas de la ficha de competición (Panorama, .lid, .cifras), por eso el contenedor es .fjv2 fcv2. */}
      {(categorias.length > 0 || hayMetricas || cifras) && (
        <div className="fjv2 fcv2">
          <div className="max-w-7xl mx-auto">
            {/* A · Mejor jugador de cada categoría (por PF) — el hallazgo, arriba. DOS columnas: aficionados a la
                izquierda, juvenil a la derecha (cada columna ordenada por `orden`). Competición enlazada. */}
            {categorias.length > 0 && (
              <div className="panorama">
                <div className="pan-h">
                  <div className="pan-t">Mejor jugador de cada categoría</div>
                  <div className="pan-s">por puntos fantasy{tempLabel ? ` · ${tempLabel}` : ''}</div>
                </div>
                <div className="lid-cols2">
                  {(['aficionados', 'juvenil'] as const).map((rama) => {
                    const cds = categorias.filter((c) => c.categoria_rama === rama)
                    if (!cds.length) return null
                    return (
                      <div className="lid-col" key={rama}>
                        <div className="lid-col-h">{rama === 'juvenil' ? 'Juvenil' : 'Aficionados'}</div>
                        {cds.map((r) => (
                          <div className="lid" key={r.tipo}>
                            <span className="esc"><EscudoBox escudo={r.escudo} nombre={r.equipo_nombre ?? undefined} size={40} radius={9} /></span>
                            <div className="mid">
                              <div className="k">
                                {r.href
                                  ? <Link href={r.href}><Sello nombreComp={r.nombre_comp} size={15} />{r.nombre_comp}{r.grupo_nombre ? ` · ${r.grupo_nombre}` : ''}</Link>
                                  : <><Sello nombreComp={r.nombre_comp} size={15} />{r.nombre_comp}{r.grupo_nombre ? ` · ${r.grupo_nombre}` : ''}</>}
                              </div>
                              <div className="nm"><NombreJugador codjugador={r.codjugador} nombre={r.nombre} fichas={fichasLid} /></div>
                              <div className="eq">{nombreEquipo(r.equipo_nombre)}</div>
                            </div>
                            <div className="lval"><b style={{ color: 'var(--e3)' }}>{fmtNum(Math.round(r.valor ?? 0))}</b><span>PF</span></div>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {/* B · Los 6 líderes por métrica de toda la RFFM (Panorama, sin cifras: las pintamos aparte). */}
            {hayMetricas && (
              <Panorama
                lideres={metricas} cifras={null}
                kpis={{ equipos: 0, partidos: 0, goles: 0, golesPj: null, eloMedio: null }}
                fichas={fichasLid}
                subLideres={`toda la RFFM${tempLabel ? ` · ${tempLabel}` : ''}`} subCifras=""
              />
            )}

            {/* C · La RFFM en cifras (totales del digest; sin equipos/ELO/porterías, que el digest no trae). */}
            {cifras && (
              <div className="panorama">
                <div className="pan-h"><div className="pan-t">La RFFM en cifras</div><div className="pan-s">{tempLabel ? `${tempLabel} · ` : ''}toda la competición</div></div>
                <div className="cifras">
                  <div className="cgrupo"><h4>Competición</h4>
                    {cifras.equipos != null && <div className="cfila"><span className="ci"><Escudo size={13} /></span><span className="ck">Equipos</span><span className="cv">{fmtNum(cifras.equipos)}</span></div>}
                    <div className="cfila"><span className="ci"><span style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, fontSize: 'var(--t-cap)', color: 'var(--ink-3)', lineHeight: 1 }}>PJ</span></span><span className="ck">Partidos jugados</span><span className="cv">{fmtNum(cifras.partidos_disputados)} <small>de {fmtNum(cifras.partidos_totales)}</small></span></div>
                    {cifras.elo_medio != null && <div className="cfila"><span className="ci"><Badge11 bg="var(--e3)" ink="#0a1628" size={15} /></span><span className="ck">ELO medio por equipo</span><span className="cv" style={{ color: colorElo(cifras.elo_medio) || undefined }}>{fmtNum(cifras.elo_medio)}</span></div>}
                  </div>
                  <div className="cgrupo"><h4>Goles</h4>
                    <div className="cfila"><span className="ci" style={{ color: 'var(--e4)' }}><Balon size={13} /></span><span className="ck">Marcados</span><span className="cv">{fmtNum(cifras.goles)}</span></div>
                    <div className="cfila"><span className="ci" style={{ color: 'var(--e4)' }}><Balon size={13} /></span><span className="ck">Media por partido</span><span className="cv">{(cifras.media_goles ?? 0).toFixed(1).replace('.', ',')}</span></div>
                    {cifras.porterias_cero != null && <div className="cfila"><span className="ci" style={{ color: 'var(--amber)' }}><Guante size={13} /></span><span className="ck">Porterías a cero</span><span className="cv">{fmtNum(cifras.porterias_cero)}</span></div>}
                  </div>
                  <div className="cgrupo"><h4>Resultados</h4>
                    <div className="cfila"><span className="ci" style={{ color: 'var(--e3)' }}><IconHome size={13} /></span><span className="ck">Victoria local</span><span className="cv">{Math.round(cifras.pct_local)} %</span></div>
                    <div className="cfila"><span className="ci"><Guion size={13} /></span><span className="ck">Empates</span><span className="cv">{Math.round(cifras.pct_empate)} %</span></div>
                    <div className="cfila"><span className="ci" style={{ color: 'var(--e3)' }}><Plane size={13} /></span><span className="ck">Victoria visitante</span><span className="cv">{Math.round(cifras.pct_visitante)} %</span></div>
                  </div>
                  <div className="cgrupo"><h4>Disciplina</h4>
                    <div className="cfila"><span className="ci" style={{ color: 'var(--card-y)' }}><TarjetaAmarilla size={12} /></span><span className="ck">Amarillas</span><span className="cv">{fmtNum(cifras.amarillas)}</span></div>
                    <div className="cfila"><span className="ci" style={{ color: 'var(--card-y)' }}><TarjetaDoble size={13} /></span><span className="ck">Dobles</span><span className="cv">{fmtNum(cifras.dobles)}</span></div>
                    <div className="cfila"><span className="ci" style={{ color: 'var(--card-r)' }}><TarjetaRoja size={12} /></span><span className="ck">Rojas</span><span className="cv">{fmtNum(cifras.rojas)}</span></div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Competiciones */}
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid md:grid-cols-2 gap-10">
          {/* Aficionados */}
          <div>
            <h2 className="font-display text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-grass-500 rounded-full inline-block" />
              Aficionados
            </h2>
            <div className="space-y-3">
              {[...COMPETICION_ORDER.filter(c => aficionadosMap[c]), ...Object.keys(aficionadosMap).filter(c => !COMPETICION_ORDER.includes(c)).sort()].map(comp => (
                <CompeticionCard
                  key={comp}
                  nombre={comp}
                  grupos={aficionadosMap[comp]}
                  categoria="aficionados"
                />
              ))}
            </div>
          </div>

          {/* Juvenil */}
          <div>
            <h2 className="font-display text-2xl font-bold text-white mb-6 flex items-center gap-2">
              <span className="w-1 h-6 bg-amber-500 rounded-full inline-block" />
              Juvenil
            </h2>
            <div className="space-y-3">
              {[...COMPETICION_ORDER.filter(c => juvenilMap[c]), ...Object.keys(juvenilMap).filter(c => !COMPETICION_ORDER.includes(c)).sort()].map(comp => (
                <CompeticionCard
                  key={comp}
                  nombre={comp}
                  grupos={juvenilMap[comp]}
                  categoria="juveniles"
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

