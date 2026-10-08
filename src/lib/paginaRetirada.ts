// Cuerpo HTML de la respuesta 410 de una ficha suprimida (derecho al olvido).
//
// POR QUÉ ES UNA CADENA Y NO UNA PÁGINA DE NEXT: el 410 solo se puede emitir desde el middleware —una página
// del App Router no puede fijar un código arbitrario; solo tiene notFound() (404) y redirect()—. Y el
// middleware corre en el edge ANTES de renderizar, así que no puede usar el layout, ni el componente de
// cabecera, ni las clases de Tailwind, ni las fuentes de next/font (sus woff2 llevan hash en el nombre).
// Todo lo que pinte esta respuesta tiene que ser autosuficiente.
//
// CONSECUENCIA ASUMIDA: esto es una COPIA A MANO de la cabecera, con los colores de tailwind.config.js
// escritos literales. Si la paleta o el logotipo cambian, esta página NO se entera. Para que la deriva sea
// barata se reproduce lo mínimo reconocible —marca, barra superior, dos enlaces— y no se intenta clonar el
// header entero (ni el buscador, que es un componente cliente). La tipografía es la del sistema: las fuentes
// del sitio no son alcanzables desde aquí, y traerlas de Google reintroduciría la cadena externa que se quitó
// a propósito.
//
// LO QUE NO LLEVA, Y ES DELIBERADO:
//   - NI UNA PALABRA DEL SLUG. La URL contiene `${codjugador}-${nombre}`, así que leer el slug para el título,
//     para un encabezado o para og:title publicaría el nombre de quien pidió no estar publicado, justo en la
//     página que existe porque lo pidió. El <title> es genérico y el cuerpo no recibe ningún parámetro: esta
//     constante no es una función, precisamente para que no se le pueda pasar el nombre.
//   - NINGUNA REDIRECCIÓN AUTOMÁTICA. Mueve la página debajo de quien está leyendo, rompe el botón de atrás y
//     es un fallo de accesibilidad si no se puede detener. Los enlaces visibles hacen el mismo trabajo sin
//     quitarle el control al visitante.

const CSS = `
:root{--pitch-900:#0a1628;--pitch-800:#0f2040;--pitch-700:#142952;--grass-500:#1a7a3c;--grass-400:#22a050;--chalk-100:#f0f4f8;--chalk-600:#718096}
*,*::before,*::after{box-sizing:border-box}
body{margin:0;min-height:100vh;display:flex;flex-direction:column;background:var(--pitch-900);color:var(--chalk-100);line-height:1.5;
font-family:system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif,"Apple Color Emoji","Segoe UI Emoji"}
a{color:inherit}
.hdr{border-bottom:1px solid var(--pitch-700);background:var(--pitch-800)}
.hdr-in{max-width:80rem;margin:0 auto;padding:0 1rem;height:4rem;display:flex;align-items:center}
.marca{display:flex;align-items:center;gap:.625rem;text-decoration:none}
.disco{width:2.5rem;height:2.5rem;border-radius:9999px;background:var(--grass-500);color:#fff;display:flex;
align-items:center;justify-content:center;font-size:1.125rem;font-weight:700;flex-shrink:0}
.marca-txt{font-size:1.75rem;font-weight:800;letter-spacing:-.02em;color:#fff}
.marca-txt b{color:var(--grass-400);font-weight:800}
main{flex:1;max-width:34rem;margin:0 auto;padding:4rem 1rem}
h1{font-size:1.75rem;font-weight:800;letter-spacing:-.02em;margin:0 0 .75rem}
p{margin:0 0 1rem;color:var(--chalk-100)}
.sutil{color:var(--chalk-600);font-size:.875rem}
.acciones{display:flex;flex-wrap:wrap;gap:.75rem;margin-top:1.75rem}
.btn{display:inline-block;padding:.625rem 1.125rem;border-radius:.5rem;text-decoration:none;font-weight:600;font-size:.9375rem}
.btn-p{background:var(--grass-500);color:#fff}
.btn-p:hover{background:var(--grass-400)}
.btn-s{border:1px solid var(--pitch-700);color:var(--chalk-100)}
.btn-s:hover{border-color:var(--grass-400)}
footer{border-top:1px solid var(--pitch-700);padding:2rem 1rem;color:var(--chalk-600);font-size:.75rem}
.ft-in{max-width:34rem;margin:0 auto;display:flex;flex-wrap:wrap;gap:.25rem 1rem}
footer a{text-decoration:underline}
@media (max-width:420px){.marca-txt{font-size:1.4rem}main{padding:2.5rem 1rem}}
`.replace(/\n/g, '')

export const PAGINA_RETIRADA = `<!doctype html><html lang="es"><head><meta charset="utf-8">`
  + `<meta name="viewport" content="width=device-width,initial-scale=1">`
  + `<meta name="robots" content="noindex,nofollow">`
  + `<title>Ficha no disponible | Fútbol11Stats</title>`
  + `<style>${CSS}</style></head><body>`
  + `<header class="hdr"><div class="hdr-in">`
  + `<a class="marca" href="/"><span class="disco">11</span>`
  + `<span class="marca-txt">Fútbol<b>11</b>Stats</span></a>`
  + `</div></header>`
  + `<main>`
  + `<h1>Ficha retirada</h1>`
  + `<p>Esta ficha se ha eliminado de forma permanente y ya no está disponible.</p>`
  + `<p class="sutil">Cualquier persona puede pedir la retirada de su perfil, sin justificar el motivo, `
  + `y la exclusión se mantiene en las actualizaciones posteriores.</p>`
  + `<div class="acciones">`
  + `<a class="btn btn-p" href="/">Ir a la portada</a>`
  + `<a class="btn btn-s" href="/buscar">Buscar un jugador o un equipo</a>`
  + `</div>`
  + `</main>`
  + `<footer><div class="ft-in">`
  + `<a href="/privacidad">Privacidad</a><a href="/aviso-legal">Aviso legal</a><a href="/sobre">Sobre el proyecto</a>`
  + `</div></footer>`
  + `</body></html>`
