import { vi } from 'vitest'

const searchMock = vi.fn(async () => ({ hits: [] }))
const addDocumentsMock = vi.fn(async () => ({}))

vi.mock('meilisearch', () => ({
  Meilisearch: class {
    index() {
      return { search: searchMock, addDocuments: addDocumentsMock }
    }
  },
}))

import { search, indexDocument } from '@/lib/search'

test('search normalizes the query', async () => {
  await search('أحمد')
  expect(searchMock).toHaveBeenCalledWith('احمد', expect.anything())
})

test('indexDocument normalizes ocrText and title', async () => {
  await indexDocument({ id: 'doc-1', title: 'أحمد', ocrText: 'إبراهيم' })
  expect(addDocumentsMock).toHaveBeenCalledWith(
    expect.arrayContaining([
      expect.objectContaining({
        ocrText: 'ابراهيم',
        title_n: 'احمد',
      }),
    ]),
  )
})
