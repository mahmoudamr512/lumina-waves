import { Meilisearch } from 'meilisearch'
import { normalizeArabic } from '@/lib/arabic'

const client = new Meilisearch({
  host: process.env.MEILI_HOST ?? 'http://localhost:7700',
  apiKey: process.env.MEILI_KEY,
})

const idx = () => client.index('documents')

export type DocHit = { id: string; title: string; clientName?: string }

export async function indexDocument(doc: {
  id: string
  title: string
  ocrText?: string
  clientName?: string
}) {
  await idx().addDocuments([
    {
      ...doc,
      ocrText: normalizeArabic(doc.ocrText ?? ''),
      title_n: normalizeArabic(doc.title),
    },
  ])
}

export async function search(query: string): Promise<DocHit[]> {
  const res = await idx().search(normalizeArabic(query), { limit: 50 })
  return res.hits as DocHit[]
}
