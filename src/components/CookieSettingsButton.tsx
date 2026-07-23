'use client'

// Botón "Configurar cookies" del footer: borra la elección y reabre el banner (CookieConsent
// escucha el evento 'cookie-consent:reset').
export default function CookieSettingsButton() {
  return (
    <button
      type="button"
      onClick={() => {
        localStorage.removeItem('cookie-consent')
        window.dispatchEvent(new Event('cookie-consent:reset'))
      }}
      className="underline hover:text-white transition-colors"
    >
      Configurar cookies
    </button>
  )
}
