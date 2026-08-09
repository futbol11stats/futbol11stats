export const revalidate = 2592000

import type { Metadata } from 'next'

type Params = Promise<{ categoria: string; slug_comp: string; temporada: string; jornada: string; tab: string }>

// Vista GLOBAL v2: se construye en el último incremento (clasificación por grupos, líderes de grupo…).
// De momento placeholder para que la ruta exista sin romper el build. noindex mientras tanto.
export async function generateMetadata(): Promise<Metadata> {
  return { title: 'Competición · Global · Fútbol11Stats', robots: { index: false, follow: false } }
}

export default async function Page({ params }: { params: Params }) {
  await params
  return (
    <div className="fjv2 fcv2">
      <div className="hero"><div className="hero-name"><div className="comp">Global</div></div></div>
      <p className="vacio">La vista global v2 se está construyendo.</p>
    </div>
  )
}
