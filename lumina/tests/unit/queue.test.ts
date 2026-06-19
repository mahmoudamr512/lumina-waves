import { queues } from '@/lib/queue'
test('queues are defined', () => {
  expect(queues.ocr.name).toBe('ocr')
  expect(queues.index.name).toBe('index')
})
