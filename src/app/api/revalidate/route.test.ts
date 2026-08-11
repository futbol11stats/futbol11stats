import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mockeamos next/cache: el test verifica la LÓGICA del handler (auth, parseo, lote, respuesta), no la
// invalidación real de Next (solo observable en runtime). El factory no referencia variables externas
// (evita el hoisting de vi.mock).
vi.mock('next/cache', () => ({ revalidateTag: vi.fn(), revalidatePath: vi.fn() }))

import { revalidateTag, revalidatePath } from 'next/cache'
import { POST } from './route'

const rTag = vi.mocked(revalidateTag)
const rPath = vi.mocked(revalidatePath)
const SECRET = 'test-secret'

beforeEach(() => {
  process.env.REVALIDATE_SECRET = SECRET
  rTag.mockClear()
  rPath.mockClear()
})

function req(body: unknown, secret?: string): Request {
  return new Request('http://localhost/api/revalidate', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...(secret ? { 'x-revalidate-secret': secret } : {}) },
    body: typeof body === 'string' ? body : JSON.stringify(body),
  })
}

describe('POST /api/revalidate', () => {
  it('401 sin cabecera de secreto', async () => {
    const res = await POST(req({ tags: ['comp:1'] }))
    expect(res.status).toBe(401)
    expect(rTag).not.toHaveBeenCalled()
  })

  it('401 con secreto incorrecto', async () => {
    const res = await POST(req({ tags: ['comp:1'] }, 'malo'))
    expect(res.status).toBe(401)
  })

  it('401 si no hay REVALIDATE_SECRET configurado (aunque manden cabecera)', async () => {
    delete process.env.REVALIDATE_SECRET
    const res = await POST(req({ tags: ['comp:1'] }, 'cualquiera'))
    expect(res.status).toBe(401)
  })

  it('revalida tags y paths deduplicados y responde el recuento', async () => {
    const res = await POST(req({ tags: ['comp:1', 'comp:1', 'temporada:21'], paths: ['/madrid/x'] }, SECRET))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ revalidated: true, tags: 2, paths: 1 })
    expect(rTag).toHaveBeenCalledTimes(2)
    expect(rTag).toHaveBeenCalledWith('comp:1', 'max')
    expect(rTag).toHaveBeenCalledWith('temporada:21', 'max')
    expect(rPath).toHaveBeenCalledTimes(1)
    expect(rPath).toHaveBeenCalledWith('/madrid/x')
  })

  it('400 si tags y paths vienen vacíos', async () => {
    const res = await POST(req({}, SECRET))
    expect(res.status).toBe(400)
    expect(rTag).not.toHaveBeenCalled()
  })

  it('400 si el cuerpo no es JSON válido', async () => {
    const res = await POST(req('{no es json', SECRET))
    expect(res.status).toBe(400)
  })

  it('413 si el lote supera el máximo (1000) y no revalida nada', async () => {
    const tags = Array.from({ length: 1001 }, (_, i) => `comp:${i}`)
    const res = await POST(req({ tags }, SECRET))
    expect(res.status).toBe(413)
    expect(rTag).not.toHaveBeenCalled()
  })

  it('ignora entradas que no son strings no vacías', async () => {
    const res = await POST(req({ tags: ['comp:1', 2, null, ''], paths: 'x' }, SECRET))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ revalidated: true, tags: 1, paths: 0 })
  })
})
