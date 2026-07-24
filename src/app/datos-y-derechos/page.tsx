import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Datos y derechos | Fútbol11Stats',
  description:
    'Cómo se elaboran las fichas de jugador de Fútbol11Stats (datos públicos de competición de la RFFM, solo mayores de edad) y cómo ejercer los derechos de oposición y supresión.',
  alternates: { canonical: '/datos-y-derechos' },
}

const CONTACTO = 'futbol11stats@gmail.com'

export default function DatosYDerechosPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-chalk-200">
      <nav className="text-sm text-chalk-600 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
        <span>·</span>
        <span className="text-white">Datos y derechos</span>
      </nav>

      <h1 className="font-display text-3xl md:text-4xl font-bold text-white">Datos y derechos</h1>
      <p className="text-chalk-600 text-xs mt-1 mb-6">Última actualización: 24 de julio de 2026</p>

      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          Las fichas de jugador de Fútbol11Stats se elaboran de forma automática a partir de{' '}
          <strong>datos públicos de competición</strong> publicados por la Real Federación de Fútbol de
          Madrid (RFFM): actas de partido, clasificaciones y estadísticas oficiales de las ligas. A partir
          de esa información calculamos totales, trayectoria, ELO e hitos. No recogemos datos de contacto,
          ni información privada, ni ningún dato que no proceda de la actividad deportiva en competición
          oficial.
        </p>

        <h2 className="font-display text-xl font-bold text-white pt-2">Solo mayores de edad</h2>
        <p>
          Las fichas se limitan a <strong>jugadores mayores de edad</strong> con actividad en las
          competiciones de aficionados. Los jugadores menores y las categorías juveniles{' '}
          <strong>no tienen ficha</strong> y no son enlazables desde el resto del sitio. El historial
          juvenil solo aparece cuando forma parte de la trayectoria de un jugador que ya es mayor de edad.
        </p>

        <h2 className="font-display text-xl font-bold text-white pt-2">Carácter no oficial</h2>
        <p>
          Fútbol11Stats es un proyecto independiente de análisis estadístico, sin vinculación con la RFFM
          ni con los clubes. Toda la información tiene carácter no oficial y puede ser provisional, errónea
          o incompleta.
        </p>

        <h2 className="font-display text-xl font-bold text-white pt-2">Derechos de oposición y supresión</h2>
        <p>
          Si eres el jugador y no deseas que tu ficha figure en el sitio, puedes ejercer tu derecho de{' '}
          <strong>oposición o supresión</strong> escribiéndonos a{' '}
          <a href={`mailto:${CONTACTO}?subject=Solicitud%20de%20supresi%C3%B3n%20de%20ficha`}
            className="text-grass-400 underline hover:text-grass-300 transition-colors">{CONTACTO}</a>.
          Indícanos tu nombre y el equipo en el que has jugado para poder localizar la ficha; atenderemos
          la solicitud y retiraremos los datos sin necesidad de que justifiques el motivo.
        </p>

        <p className="text-chalk-600 text-xs pt-2">
          Consulta también nuestra <Link href="/cookies" className="underline hover:text-white transition-colors">política de cookies</Link>.
        </p>
      </div>
    </div>
  )
}
