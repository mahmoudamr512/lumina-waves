import type { OcrProvider } from './provider'

export class TesseractProvider implements OcrProvider {
  async extract(filePath: string): Promise<string> {
    const { createWorker } = await import('tesseract.js')
    const worker = await createWorker('ara+eng')
    try {
      const { data } = await worker.recognize(filePath)
      return data.text
    } finally {
      await worker.terminate()
    }
  }
}
