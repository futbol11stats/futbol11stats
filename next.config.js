// Cabecera de caché de los ESTÁTICOS DE `public/`. Next los sirve por defecto con
// `max-age=0, must-revalidate`, así que el navegador revalida en CADA página: los cinco sellos se pedían
// ~1.400 veces al día, frente a las ~320 de un chunk inmutable. Son logos federativos: no cambian.
//
// NO lleva `immutable`, y es deliberado: estas URLs NO están versionadas (`/sellos/rffm.png` a pelo, sin
// hash ni ?v=). Con `immutable` un sello sustituido en el sitio se quedaría clavado en los navegadores
// hasta que caducara, sin forma de forzarlo ni recargando. Con `max-age` a secas, una recarga revalida.
// REGLA SI ALGÚN DÍA SE SUSTITUYE UN SELLO: renómbralo, o tardará hasta 7 días en llegar a quien ya lo tenga.
//
// Lista EXPLÍCITA en vez de un comodín: un `source` amplio (`/:path*`) casaría también con las páginas y
// les pondría caché de navegador a documentos HTML que hoy son ISR. El riesgo no compensa ahorrar tres
// líneas. Comprobado en el build local que las páginas conservan su `s-maxage=2592000`.
//
// `/favicon.ico` entra aquí aunque NO viva en `public/` (lo sirve la convención `src/app/favicon.ico`):
// salía con el mismo `max-age=0, must-revalidate` y se pide ~200 veces al día. Dejarlo fuera habría sido
// arreglar media familia.
const ESTATICOS_PUBLIC = ['/sellos/:path*', '/logo.png', '/og-f11s.png', '/LogoF11S_ig.svg', '/favicon.ico']
const CACHE_ESTATICOS = 'public, max-age=604800, s-maxage=2592000, stale-while-revalidate=86400'

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return ESTATICOS_PUBLIC.map((source) => ({
      source,
      headers: [{ key: 'Cache-Control', value: CACHE_ESTATICOS }],
    }))
  },

  async redirects() {
    return [
      // La antigua /datos-y-derechos se reparte en /aviso-legal (carácter no oficial + propiedad
      // intelectual) y /privacidad; su canónica es el Aviso Legal, que enlaza a la Privacidad.
      // permanent:true -> 308 (redirección permanente; Google lo trata igual que un 301).
      { source: '/datos-y-derechos', destination: '/aviso-legal', permanent: true },

      // Retirada de las rutas /v2 (ya son duplicados del contenido canónico, que se sirve en la ruta sin
      // sufijo). 308 permanente a la canónica equivalente (quita el /v2), para que URLs guardadas/compartidas
      // no den 404. El slug no canónico encadena un segundo 308 (el de la propia ruta canónica). Global antes
      // que grupo (más específico: literal `global`), aunque el patrón de grupo también lo cubriría.
      { source: '/madrid/jugador/:slug/:temporada/v2', destination: '/madrid/jugador/:slug/:temporada', permanent: true },
      { source: '/madrid/jugador/:slug/v2', destination: '/madrid/jugador/:slug', permanent: true },
      { source: '/madrid/equipo/:slug/:temporada/v2', destination: '/madrid/equipo/:slug/:temporada', permanent: true },
      { source: '/madrid/equipo/:slug/v2', destination: '/madrid/equipo/:slug', permanent: true },
      { source: '/madrid/:categoria/:slugComp/global/:temporada/:jornada/:tab/v2', destination: '/madrid/:categoria/:slugComp/global/:temporada/:jornada/:tab', permanent: true },
      { source: '/madrid/:categoria/:slugComp/:slugGrupo/:temporada/:jornada/:tab/v2', destination: '/madrid/:categoria/:slugComp/:slugGrupo/:temporada/:jornada/:tab', permanent: true },
    ]
  },
}

module.exports = nextConfig
