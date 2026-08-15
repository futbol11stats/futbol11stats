export const revalidate = 2592000

import type { Metadata } from 'next'
import FichaCompeticionGlobalV2 from '@/components/ficha/v2/FichaCompeticionGlobalV2'

type Params = Promise<{ categoria: string; slug_comp: string; temporada: string; jornada: string; tab: string }>

// v2 en construcción: noindex mientras se levanta (evita duplicar con la ruta actual).
export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Competición · Global · Fútbol11Stats', robots: { index: false, follow: false } }
}

export default async function Page({ params }: { params: Params }) {
  const { categoria, slug_comp, temporada, jornada, tab } = await params
  return (
    <FichaCompeticionGlobalV2
      categoria={categoria}
      slugComp={slug_comp}
      temporada={temporada}
      jornada={jornada}
      tab={tab}
      suf="/v2"
    />
  )
}
