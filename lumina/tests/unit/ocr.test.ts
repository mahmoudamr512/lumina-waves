import { getOcrProvider } from '@/lib/ocr/provider'
test('defaults to tesseract', () => {
  process.env.OCR_PROVIDER = 'tesseract'
  expect(getOcrProvider().constructor.name).toBe('TesseractProvider')
})
