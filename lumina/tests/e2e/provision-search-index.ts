import 'dotenv/config'
import { indexDocument } from '../../src/lib/search'

async function main() {
  await indexDocument({
    id: 'e2e-test-doc-search',
    title: 'وثيقة اختبار البحث',
    ocrText: 'هذا نص تجريبي للبحث',
    clientName: 'عميل التجربة',
  })
  console.log('[e2e] search index seeded')
}

main().catch((err) => {
  console.error('[e2e] search index seed failed:', err)
  process.exit(1)
})
