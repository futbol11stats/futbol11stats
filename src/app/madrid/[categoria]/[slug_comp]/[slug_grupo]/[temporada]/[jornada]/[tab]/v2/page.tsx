export const revalidate = 2592000  // ISR 30d, como la ruta actual.

import type { Metadata } from 'next'
import FichaCompeticionV2 from '@/components/ficha/v2/FichaCompeticionV2'

type Params = Promise<{ categoria: string; slug_comp: string; slug_grupo: string; temporada: string; jornada: string; tab: string }>

// v2 en construcción: noindex mientras se levanta la ficha (evita duplicar con la ruta actual).
export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Competición · Fútbol11Stats', robots: { index: false, follow: false } }
}

export default async function Page({ params }: { params: Params }) {
  const { categoria, slug_comp, slug_grupo, temporada, jornada, tab } = await params
  return (
    <FichaCompeticionV2
      categoria={categoria}
      slugComp={slug_comp}
      slugGrupo={slug_grupo}
      temporada={temporada}
      jornadaSeg={jornada}
      tab={tab}
    />
  )
}
