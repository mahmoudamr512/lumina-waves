import { readFile } from 'node:fs/promises'
import { auth } from '@/lib/auth'
import { db } from '@/lib/db'

// Roles allowed to download sensitive contract PDFs (same as generation gate)
const SENSITIVE_DOC_ROLES = ['ADMIN', 'LEGAL']

/**
 * Streams the generated draft PDF to authorized roles.
 * - ADMIN and LEGAL only (same sensitive-allowlist as generateContractPdf).
 * - storagePath is never exposed to the client — only the Document id is in the URL.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string; docId: string }> },
) {
  const { docId } = await params

  // Authenticate
  const session = await auth()
  if (!session?.user) {
    return new Response('غير مصرح', { status: 401 })
  }

  // Sensitive allowlist check
  if (!SENSITIVE_DOC_ROLES.includes(session.user.role)) {
    return new Response('ليس لديك صلاحية لتحميل هذا المستند.', { status: 403 })
  }

  // Load document record (soft-delete-filtered via db extension)
  const doc = await db.document.findUnique({ where: { id: docId } })
  if (!doc) {
    return new Response('المستند غير موجود.', { status: 404 })
  }

  // Read the file from disk (storagePath is an internal server-only path)
  let arrayBuf: ArrayBuffer
  let byteLength: number
  try {
    const buf = await readFile(doc.storagePath)
    byteLength = buf.byteLength
    arrayBuf = buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength)
  } catch {
    return new Response('تعذّر قراءة الملف.', { status: 500 })
  }

  return new Response(arrayBuf, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${doc.filename}"`,
      'Content-Length': byteLength.toString(),
      // Prevent caching of sensitive documents
      'Cache-Control': 'no-store',
    },
  })
}
