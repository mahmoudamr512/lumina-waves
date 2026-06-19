import type { OcrProvider } from './provider'

export class GoogleVisionProvider implements OcrProvider {
  async extract(filePath: string): Promise<string> {
    // @ts-expect-error optional dependency, only loaded when OCR_PROVIDER=google
    const { ImageAnnotatorClient } = await import('@google-cloud/vision')
    const client = new ImageAnnotatorClient()
    const [res] = await client.documentTextDetection(filePath)
    return res.fullTextAnnotation?.text ?? ''
  }
}
