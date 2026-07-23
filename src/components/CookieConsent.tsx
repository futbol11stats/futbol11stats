'use client'

import { useEffect, useState } from 'react'
import { GoogleAnalytics } from '@next/third-parties/google'

const KEY = 'cookie-consent'
type Consent = 'accepted' | 'rejected' | null

// Puerta dura RGPD/AEPD: Google Analytics (con cookies) SOLO se monta tras "Aceptar" explícito.
// Sin elección o "Rechazar" -> cero peticiones a googletagmanager. Vercel Analytics (sin cookies)
// va fuera de este gate, en el layout. La elección persiste en localStorage.
export default function CookieConsent() {
  const [consent, setConsent] = useState<Consent>(null)
  const [ready, setReady] = useState(false) // evita parpadeo/hydration: el banner solo aparece en cliente

  useEffect(() => {
    const v = localStorage.getItem(KEY)
    setConsent(v === 'accepted' || v === 'rejected' ? v : null)
    setReady(true)
    // "Configurar cookies" (footer) reabre el banner
    const reopen = () => {
      localStorage.removeItem(KEY)
      setConsent(null)
    }
    window.addEventListener('cookie-consent:reset', reopen)
    return () => window.removeEventListener('cookie-consent:reset', reopen)
  }, [])

  const choose = (v: 'accepted' | 'rejected') => {
    localStorage.setItem(KEY, v)
    setConsent(v)
  }

  return (
    <>
      {consent === 'accepted' && <GoogleAnalytics gaId="G-K5GKDM4SE6" />}

      {ready && consent === null && (
        <div
          role="dialog"
          aria-label="Consentimiento de cookies"
          className="fixed inset-x-0 bottom-0 z-50 border-t border-pitch-700 bg-pitch-800/95 backdrop-blur px-4 py-3"
        >
          <div className="max-w-4xl mx-auto flex flex-col sm:flex-row sm:items-center gap-3">
            <p className="text-xs leading-relaxed text-chalk-200 flex-1">
              Usamos cookies de analítica (Google Analytics) para entender el uso del sitio. Las
              estadísticas propias sin cookies funcionan siempre.{' '}
              <a href="/cookies" className="text-grass-400 underline hover:text-grass-300">Más información</a>.
            </p>
            {/* Dos botones de IGUAL prominencia (mismo tamaño y peso visual) — requisito AEPD */}
            <div className="flex gap-2 shrink-0">
              <button
                onClick={() => choose('rejected')}
                className="flex-1 sm:flex-none px-5 py-2 rounded-md text-sm font-semibold bg-pitch-700 text-chalk-100 hover:bg-pitch-600 transition-colors"
              >
                Rechazar
              </button>
              <button
                onClick={() => choose('accepted')}
                className="flex-1 sm:flex-none px-5 py-2 rounded-md text-sm font-semibold bg-pitch-700 text-chalk-100 hover:bg-pitch-600 transition-colors"
              >
                Aceptar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
