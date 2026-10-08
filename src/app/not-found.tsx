import type { Metadata } from 'next'
import Link from 'next/link'

// 404 del sitio entero. Hasta ahora este fichero no existía, así que Next servía su página por defecto:
// "404 · This page could not be found", en inglés, sin cabecera, sin logotipo y sin un enlace. Importa más
// desde que la lista blanca de pestañas y el tope de jornada convirtieron en 404 muchas URLs que antes
// devolvían 200.
//
// DOS CAMINOS LLEGAN AQUÍ, y Next los sirve distinto. Medido sobre el build de producción, no en dev:
//
//   · URL que no casa con ninguna ruta -> se renderiza EN EL SERVIDOR dentro del layout raíz. El HTML ya
//     trae la cabecera, el logotipo, el buscador y el pie.
//   · notFound() desde una página      -> el servidor responde 404 con el <body> VACÍO
//     (`<div hidden>`); el documento es <html id="__next_error__"> y toda la interfaz viaja en el payload
//     de React. El cliente la pinta, y al pintarla monta el layout completo, así que el visitante acaba
//     viendo la misma página con su cabecera real.
//
// La consecuencia a tener presente: por el segundo camino, un cliente SIN JavaScript ve un 404 en blanco.
// No se puede evitar desde aquí (lo decide Next) y no afecta al SEO —el código sigue siendo 404 y Google
// no indexa 404—, pero conviene no descubrirlo dos veces. Se probó una cabecera de repuesto para ese caso
// y se retiró al medir que el cuerpo servido está vacío: no habría nada que enseñar sin JavaScript, y con
// JavaScript ya aparece la cabecera de verdad. Era código muerto más una regla CSS frágil.
//
// EL TEXTO ES GENÉRICO A PROPÓSITO: no dice ni insinúa que la página existiera. Esta misma pantalla la ve
// quien teclea mal una dirección y quien sigue un enlace viejo, y "ya no está disponible" sería falso en el
// primer caso. Para la baja permanente de una ficha hay página aparte, con su 410 y su propio texto
// (lib/paginaRetirada.ts).

export const metadata: Metadata = {
  title: 'Página no encontrada | Fútbol11Stats',
  robots: { index: false, follow: true },
}

export default function NoEncontrada() {
  return (
    <div className="max-w-xl mx-auto px-4 py-16 md:py-24">
      <h1 className="font-display font-bold text-4xl md:text-5xl tracking-tight text-white">
        Página no encontrada
      </h1>
      <p className="mt-3 text-chalk-100">
        La dirección que has abierto no corresponde a ninguna página de Fútbol11Stats.
      </p>
      <p className="mt-2 text-sm text-chalk-600">
        Puede que el enlace esté mal escrito o que apunte a una página que nunca existió.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/"
          className="inline-block rounded-lg bg-grass-500 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-grass-400"
        >
          Ir a la portada
        </Link>
        <Link
          href="/buscar"
          className="inline-block rounded-lg border border-pitch-700 px-5 py-2.5 text-sm font-semibold text-chalk-100 transition-colors hover:border-grass-400"
        >
          Buscar un jugador o un equipo
        </Link>
      </div>
      <p className="mt-10 flex flex-wrap gap-x-4 gap-y-1 text-sm text-chalk-600">
        <Link href="/madrid/aficionados" className="underline hover:text-white transition-colors">Aficionados</Link>
        <Link href="/madrid/juveniles" className="underline hover:text-white transition-colors">Juveniles</Link>
        <Link href="/clubes" className="underline hover:text-white transition-colors">Clubes</Link>
        <Link href="/campos" className="underline hover:text-white transition-colors">Campos</Link>
      </p>
    </div>
  )
}
