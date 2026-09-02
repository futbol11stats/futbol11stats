import Link from 'next/link'
import Sello from '@/components/Sello'
import { nombreOficial, familiaSello } from '@/lib/sellos'
import { codToSlug } from '@/lib/temporadaSlug'
import { segRondaActual, numRondas, historicoLegenda } from '@/lib/competiciones'

// Tarjeta de COMPETICIÓN ÚNICA del sitio (cabecera con sello + título + fila de chips a cada grupo).
// Compartida por la home, /madrid/aficionados y /madrid/juveniles (estaba triplicada casi literal). La
// categoría de la URL entra por prop; la leyenda de nombre histórico solo se pinta si llega `nombreHistorico`.
// Ver MANUAL_DE_ESTILO.md.
type GrupoCard = {
  codtemporada: number; codgrupo: string; nombre_grupo: string; jornada_actual: number
  slug_comp: string; slug_grupo: string; tipo?: string; rondas?: unknown
}

// Denominación corta cuando no hay oficial (nombreOficial cubre la mayoría). Unión de aficionados + juveniles.
const NOMBRE_CORTO: Record<string, string> = {
  '3ª RFEF Madrid': '3ª RFEF',
  '1ª Autonómica Madrid': '1ª Autonómica',
  'Preferente Madrid': 'Preferente',
  '1ª Aficionados Madrid': '1ª Aficionados',
  '2ª Aficionados Madrid': '2ª Aficionados',
  'Nacional Juvenil Madrid': 'Nacional Juvenil',
  '1ª Autonómica Juvenil Madrid': '1ª Autonómica',
  'Preferente Juvenil Madrid': 'Preferente',
  '1ª Juvenil Madrid': '1ª Juvenil',
  '2ª Juvenil Madrid': '2ª Juvenil',
}

export default function CompeticionCard({
  nombre, grupos, categoria, nombreHistorico,
}: {
  nombre: string
  grupos: GrupoCard[]
  categoria: string
  nombreHistorico?: string
}) {
  const temp = codToSlug(grupos[0].codtemporada)
  const famSlug = grupos.find((g) => String(g.codgrupo).startsWith('fam-'))?.slug_comp
  const titulo = nombreOficial(nombre) ?? (NOMBRE_CORTO[nombre] || nombre)
  const hist = historicoLegenda(nombre, nombreHistorico)

  return (
    <div className="bg-pitch-800 rounded-xl border border-pitch-700 overflow-hidden hover:border-grass-500/50 transition-colors">
      <div className="px-4 py-3 border-b border-pitch-700">
        <div className="flex items-center justify-between">
          <span className="font-semibold text-white text-sm flex items-center gap-2"><Sello nombreComp={nombre} src={famSlug ? familiaSello(famSlug, nombre) : undefined} size={24} />{titulo}</span>
          <span className="text-xs text-chalk-600">{temp} · {grupos.length} grupo{grupos.length !== 1 ? 's' : ''}</span>
        </div>
        {hist && (
          <p className="text-chalk-600 text-[length:var(--t-micro)] mt-1 flex items-center gap-1">
            <svg className="w-3 h-3 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Hasta 2023-24: {hist}
          </p>
        )}
      </div>
      <div className="px-4 py-2 flex flex-wrap gap-2">
        {grupos.length > 1 && (
          <Link
            href={`/madrid/${categoria}/${grupos[0].slug_comp}/global/${temp}/jornada-${grupos[0].jornada_actual}/clasificacion`}
            className="text-xs bg-grass-500/15 hover:bg-grass-500 text-grass-300 hover:text-white px-3 py-1.5 rounded-md transition-colors border border-grass-500/30 font-semibold"
          >
            Global
          </Link>
        )}
        {grupos.map((g) => {
          const esCopa = !!g.tipo && g.tipo !== 'LIGA'
          const entrada = esCopa ? 'resultados' : 'clasificacion'
          return (
            <Link
              key={g.codgrupo}
              href={`/madrid/${categoria}/${g.slug_comp}/${g.slug_grupo}/${codToSlug(g.codtemporada)}/${esCopa ? segRondaActual(g) : `jornada-${g.jornada_actual}`}/${entrada}`}
              className="text-xs bg-pitch-700 hover:bg-grass-500 text-chalk-200 hover:text-white px-3 py-1.5 rounded-md transition-colors"
            >
              {esCopa ? `Ver competición · ${numRondas(g)} ronda${numRondas(g) === 1 ? '' : 's'}` : `${g.nombre_grupo} · J${g.jornada_actual}`}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
