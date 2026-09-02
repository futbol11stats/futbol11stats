import EscudoBox from '@/components/ficha/v2/EscudoBox'
import NombreJugador from '@/components/NombreJugador'
import { colorElo } from '@/lib/equipoV2'
import {
  Balon, Guante, Escudo, Guion, TarjetaAmarilla, TarjetaDoble, TarjetaRoja,
} from '@/components/iconos'
import { Home, Plane } from 'lucide-react'
import type { CifrasComp } from '@/lib/competicionV2'
import Badge11 from '@/components/ui/Badge11'

const mil = (n: number | null | undefined) => (n == null ? '—' : Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.'))
const med1 = (v: number | null | undefined) => (v == null ? '—' : Number(v).toFixed(1).replace('.', ','))


type Lideres = { goleador?: any; portero?: any; elo?: any; tarjetas?: any } | null

function LidCard({ k, icon, color, val, unit, j, fichas }: {
  k: string; icon: React.ReactNode; color: string; val: React.ReactNode; unit: string; j: any; fichas: { has(x: string): boolean } | null
}) {
  if (!j || val == null) return null
  return (
    <div className="lid">
      <span className="esc"><EscudoBox escudo={j.escudo} nombre={j.nombre_equipo} size={40} radius={9} /></span>
      <div className="mid">
        <div className="k"><span style={{ color, display: 'flex' }}>{icon}</span>{k}</div>
        <div className="nm"><NombreJugador codjugador={j.codjugador} nombre={j.nombre} fichas={fichas} /></div>
        <div className="eq">{j.nombre_equipo}</div>
      </div>
      <div className="lval"><b style={{ color }}>{val}</b><span>{unit}</span></div>
    </div>
  )
}

// Panorama de la competición (líderes + cifras), a ancho completo y dependiente del ámbito (grupo o global).
// Compartido por FichaCompeticionV2 y FichaCompeticionGlobalV2: mismos datos, mismo diseño.
export default function Panorama({ lideres, cifras, kpis, fichas, subLideres, subCifras }: {
  lideres: Lideres
  cifras: CifrasComp | null
  kpis: { equipos: number; partidos: number; goles: number; golesPj: number | null; eloMedio: number | null }
  fichas: { has(x: string): boolean } | null
  subLideres: string
  subCifras: string
}) {
  const hayLideres = lideres && (lideres.goleador || lideres.portero || lideres.elo || lideres.tarjetas)
  return (
    <div className="panorama">
      {hayLideres && (
        <>
          <div className="pan-h"><div className="pan-t">Líderes</div><div className="pan-s">{subLideres}</div></div>
          <div className="lid-grid">
            <LidCard k="Goleador" icon={<Balon size={13} />} color="var(--e4)" val={lideres!.goleador?.goles} unit="GOLES" j={lideres!.goleador} fichas={fichas} />
            <LidCard k="Portero" icon={<Guante size={13} />} color="var(--amber)" val={lideres!.portero?.goles} unit="P. A CERO" j={lideres!.portero} fichas={fichas} />
            <LidCard k="Mejor ELO" icon={<Badge11 bg="var(--e3)" ink="#0a1628" size={15} />} color="var(--e3)" val={lideres!.elo?.elo != null ? mil(lideres!.elo.elo) : null} unit="ELO" j={lideres!.elo} fichas={fichas} />
            <LidCard k="Más tarjetas" icon={<TarjetaAmarilla size={12} />} color="var(--card-y)" val={lideres!.tarjetas?.amarillas} unit="AMARILLAS" j={lideres!.tarjetas} fichas={fichas} />
          </div>
        </>
      )}

      {cifras && (
        <>
          <div className="pan-h" style={{ paddingTop: hayLideres ? 18 : 0 }}>
            <div className="pan-t">La competición en cifras</div><div className="pan-s">{subCifras}</div>
          </div>
          <div className="cifras">
            <div className="cgrupo"><h4>Competición</h4>
              <div className="cfila"><span className="ci"><Escudo size={13} /></span><span className="ck">Equipos</span><span className="cv">{kpis.equipos || '—'}</span></div>
              <div className="cfila"><span className="ci"><span style={{ fontFamily: 'var(--font-display), sans-serif', fontWeight: 700, fontSize: 'var(--t-cap)', color: 'var(--ink-3)', lineHeight: 1 }}>PJ</span></span><span className="ck">Partidos jugados</span><span className="cv">{mil(cifras.disputados)} <small>de {mil(cifras.totalPartidos)}</small></span></div>
              <div className="cfila"><span className="ci" style={{ color: colorElo(kpis.eloMedio) || 'var(--e3)' }}><Badge11 bg={colorElo(kpis.eloMedio) || 'var(--e3)'} ink="#0a1628" size={15} /></span><span className="ck">ELO medio por equipo</span><span className="cv" style={{ color: colorElo(kpis.eloMedio) || undefined }}>{mil(kpis.eloMedio)}</span></div>
            </div>
            <div className="cgrupo"><h4>Goles</h4>
              <div className="cfila"><span className="ci" style={{ color: 'var(--e4)' }}><Balon size={13} /></span><span className="ck">Goles marcados</span><span className="cv">{mil(cifras.goles)}</span></div>
              <div className="cfila"><span className="ci" style={{ color: 'var(--e4)' }}><Balon size={13} /></span><span className="ck">Media por partido</span><span className="cv">{med1(cifras.mediaGoles)}</span></div>
              <div className="cfila"><span className="ci" style={{ color: 'var(--amber)' }}><Guante size={13} /></span><span className="ck">Porterías a cero</span><span className="cv">{mil(cifras.p0)}</span></div>
            </div>
            <div className="cgrupo"><h4>Resultados</h4>
              <div className="cfila"><span className="ci" style={{ color: 'var(--e3)' }}><Home size={13} /></span><span className="ck">Victoria local</span><span className="cv">{cifras.vLocalPct} %</span></div>
              <div className="cfila"><span className="ci"><Guion size={13} /></span><span className="ck">Empates</span><span className="cv">{cifras.empPct} %</span></div>
              <div className="cfila"><span className="ci" style={{ color: 'var(--e3)' }}><Plane size={13} /></span><span className="ck">Victoria visitante</span><span className="cv">{cifras.vVisitPct} %</span></div>
            </div>
            <div className="cgrupo"><h4>Disciplina</h4>
              <div className="cfila"><span className="ci" style={{ color: 'var(--card-y)' }}><TarjetaAmarilla size={12} /></span><span className="ck">Amarillas</span><span className="cv">{mil(cifras.amarillas)}</span></div>
              <div className="cfila"><span className="ci" style={{ color: 'var(--card-y)' }}><TarjetaDoble size={13} /></span><span className="ck">Dobles amarillas</span><span className="cv">{mil(cifras.dobles)}</span></div>
              <div className="cfila"><span className="ci" style={{ color: 'var(--card-r)' }}><TarjetaRoja size={12} /></span><span className="ck">Rojas</span><span className="cv">{mil(cifras.rojas)}</span></div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
