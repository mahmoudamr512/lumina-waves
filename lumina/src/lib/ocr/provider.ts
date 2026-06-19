import { TesseractProvider } from './tesseract'
import { GoogleVisionProvider } from './google-vision'

export interface OcrProvider {
  extract(filePath: string): Promise<string>
}

export function getOcrProvider(): OcrProvider {
  return process.env.OCR_PROVIDER === 'google'
    ? new GoogleVisionProvider()
    : new TesseractProvider()
}
