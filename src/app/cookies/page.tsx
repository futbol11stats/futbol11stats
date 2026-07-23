import type { Metadata } from 'next'
import Link from 'next/link'
import CookieSettingsButton from '@/components/CookieSettingsButton'

export const metadata: Metadata = {
  title: 'Política de cookies | Fútbol11Stats',
  description:
    'Qué cookies usa Fútbol11Stats: analítica de Google Analytics (solo con tu consentimiento) y la analítica sin cookies de Vercel. Cómo cambiar tu elección.',
  alternates: { canonical: '/cookies' },
}

export default function CookiesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8 text-chalk-200">
      <nav className="text-sm text-chalk-600 mb-6 flex items-center gap-2">
        <Link href="/" className="hover:text-white transition-colors">Inicio</Link>
        <span>·</span>
        <span className="text-white">Cookies</span>
      </nav>

      <h1 className="font-display text-3xl md:text-4xl font-bold text-white">Política de cookies</h1>
      <p className="text-chalk-600 text-xs mt-1 mb-6">Última actualización: 23 de julio de 2026</p>

      <div className="space-y-4 text-sm leading-relaxed">
        <p>
          En Fútbol11Stats usamos cookies únicamente con fines de <strong>analítica</strong>, y solo
          las de Google Analytics, que <strong>no se cargan si no las aceptas</strong>. Al entrar por
          primera vez verás un aviso con dos opciones de igual valor, «Aceptar» y «Rechazar».
        </p>

        <h2 className="font-display text-xl font-bold text-white pt-2">Google Analytics (GA4) — requiere tu consentimiento</h2>
        <p>
          Si aceptas, cargamos Google Analytics 4 (proveedor: Google Ireland Ltd.). Instala cookies
          propias del servicio (por ejemplo <code>_ga</code> y <code>_ga_&lt;ID&gt;</code>) cuya finalidad
          es <strong>medir de forma agregada las visitas y el uso del sitio</strong> (páginas vistas,
          navegación, dispositivo aproximado) para mejorarlo. Si rechazas —o mientras no elijas— estas
          cookies <strong>no se instalan</strong> y no se hace ninguna petición a Google.
        </p>

        <h2 className="font-display text-xl font-bold text-white pt-2">Vercel Web Analytics — sin cookies</h2>
        <p>
          Usamos además la analítica de Vercel, que <strong>no utiliza cookies</strong> ni identifica a
          los visitantes: mide páginas vistas de forma anónima y agregada. Al no usar cookies, funciona
          siempre y no requiere consentimiento.
        </p>

        <h2 className="font-display text-xl font-bold text-white pt-2">Cambiar tu elección</h2>
        <p>
          Puedes revisar o cambiar tu decisión cuando quieras con este botón (también disponible en el
          pie de página): <CookieSettingsButton />. Al reabrir el aviso puedes «Rechazar» para retirar
          el consentimiento; a partir de ese momento no se cargará Google Analytics.
        </p>

        <h2 className="font-display text-xl font-bold text-white pt-2">Dónde se guarda tu elección</h2>
        <p>
          Tu preferencia se almacena en el <strong>almacenamiento local</strong> (localStorage) de tu
          navegador, no en una cookie de seguimiento. Puedes borrarla desde los datos de navegación de
          tu navegador o con el botón de arriba.
        </p>
      </div>
    </div>
  )
}
