import Link from 'next/link'
import type { ReactNode } from 'react'

// Renderizador Markdown mínimo y sin dependencias para las páginas legales. Soporta lo que usan esos
// documentos: # ## ###, párrafos (una línea, separados por línea en blanco), **negrita**, `código`,
// enlaces [texto](url) (internos -> next/link), listas "- " y tablas. La tabla es responsive: tabla en
// pantallas ≥sm y lista de tarjetas por debajo (cabe a 390px). Los separadores "---" se ignoran.

function inline(text: string, kb: string): ReactNode[] {
  const nodes: ReactNode[] = []
  // Orden: **negrita** antes que *cursiva* (si no, ** se comería como dos cursivas).
  const re = /(\*\*([^*]+)\*\*)|(\[([^\]]+)\]\(([^)]+)\))|(`([^`]+)`)|(\*([^*]+)\*)/g
  let last = 0
  let k = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index))
    if (m[1]) {
      // Recursivo: la negrita puede envolver un enlace ("**[Política](/privacidad)**").
      nodes.push(<strong key={`${kb}-b${k}`} className="text-chalk-100 font-semibold">{inline(m[2], `${kb}-b${k++}`)}</strong>)
    } else if (m[3]) {
      const label = m[4], href = m[5]
      const ext = /^https?:\/\//.test(href)
      nodes.push(
        href.startsWith('/') && !ext
          ? <Link key={`${kb}-l${k++}`} href={href} className="underline decoration-chalk-600 hover:text-white transition-colors">{label}</Link>
          : <a key={`${kb}-l${k++}`} href={href} target={ext ? '_blank' : undefined} rel={ext ? 'noopener noreferrer' : undefined} className="underline decoration-chalk-600 hover:text-white transition-colors">{label}</a>
      )
    } else if (m[6]) {
      nodes.push(<code key={`${kb}-c${k++}`} className="text-chalk-200 bg-pitch-800 border border-pitch-700 rounded px-1 py-0.5 text-[0.85em]">{m[7]}</code>)
    } else if (m[8]) {
      nodes.push(<em key={`${kb}-i${k}`} className="italic">{inline(m[9], `${kb}-i${k++}`)}</em>)
    }
    last = re.lastIndex
  }
  if (last < text.length) nodes.push(text.slice(last))
  return nodes
}

const celdas = (fila: string) => fila.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim())

function Tabla({ filas, kb }: { filas: string[]; kb: string }) {
  const cab = celdas(filas[0])
  const cuerpo = filas.slice(2).map(celdas)   // filas[1] es el separador |---|
  return (
    <div>
      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-xs border border-pitch-700 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-pitch-800">
              {cab.map((h, i) => <th key={i} className="text-left font-semibold text-white px-3 py-2 border-b border-pitch-700">{inline(h, `${kb}-th${i}`)}</th>)}
            </tr>
          </thead>
          <tbody>
            {cuerpo.map((fila, ri) => (
              <tr key={ri} className="border-b border-pitch-700/50 last:border-0 align-top">
                {fila.map((c, ci) => <td key={ci} className="px-3 py-2">{inline(c, `${kb}-td${ri}-${ci}`)}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Móvil (<640px, incluye 390px): cada proveedor como tarjeta con etiquetas. */}
      <div className="sm:hidden space-y-2.5">
        {cuerpo.map((fila, ri) => (
          <div key={ri} className="rounded-lg border border-pitch-700 bg-pitch-800/40 p-3 space-y-1">
            <div className="font-semibold text-white">{inline(fila[0], `${kb}-mh${ri}`)}</div>
            {fila.slice(1).map((c, ci) => (
              <div key={ci} className="text-xs"><span className="text-chalk-600">{cab[ci + 1]}: </span>{inline(c, `${kb}-mv${ri}-${ci}`)}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function LegalDoc({ content }: { content: string }) {
  const lineas = content.replace(/\r\n/g, '\n').split('\n')
  const out: ReactNode[] = []
  let i = 0, key = 0
  while (i < lineas.length) {
    const t = lineas[i].trim()
    if (t === '' || t === '---') { i++; continue }
    if (t.startsWith('### ')) { out.push(<h3 key={key} className="font-display text-base font-bold text-white pt-3">{inline(t.slice(4), `k${key}`)}</h3>); key++; i++; continue }
    if (t.startsWith('## ')) { out.push(<h2 key={key} className="font-display text-xl font-bold text-white pt-5">{inline(t.slice(3), `k${key}`)}</h2>); key++; i++; continue }
    if (t.startsWith('# ')) { out.push(<h1 key={key} className="font-display text-3xl md:text-4xl font-bold text-white">{inline(t.slice(2), `k${key}`)}</h1>); key++; i++; continue }
    if (t.startsWith('|')) {
      const filas: string[] = []
      while (i < lineas.length && lineas[i].trim().startsWith('|')) { filas.push(lineas[i].trim()); i++ }
      out.push(<Tabla key={key} filas={filas} kb={`k${key}`} />); key++; continue
    }
    if (t.startsWith('- ')) {
      const items: string[] = []
      while (i < lineas.length && lineas[i].trim().startsWith('- ')) { items.push(lineas[i].trim().slice(2)); i++ }
      out.push(<ul key={key} className="list-disc pl-5 space-y-1.5 marker:text-chalk-600">{items.map((it, idx) => <li key={idx}>{inline(it, `k${key}-${idx}`)}</li>)}</ul>); key++; continue
    }
    // Subtítulo de fecha ("**dominio** · Última actualización: ...") en pequeño y tenue.
    if (/Última actualización/i.test(t)) { out.push(<p key={key} className="text-chalk-600 text-xs -mt-1">{inline(t, `k${key}`)}</p>); key++; i++; continue }
    out.push(<p key={key}>{inline(t, `k${key}`)}</p>); key++; i++
  }
  return <div className="space-y-4 text-sm leading-relaxed">{out}</div>
}
