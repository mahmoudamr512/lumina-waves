import { NextRequest, NextResponse } from 'next/server'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import path from 'node:path'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { db } from '@/lib/db'

const STORAGE_ROOT = path.resolve(process.env.STORAGE_DIR ?? './.storage')
// Documents linked to a contract or annex may embed sensitive data (National
// IDs, financial terms), so they are restricted to the same roles allowed to
// generate them.
const SENSITIVE_DOC_ROLES = ['ADMIN', 'LEGAL']

function contentTypeFor(filename: string): string {
  const ext = path.extname(filename).toLowerCase()
  switch (ext) {
    case '.pdf': return 'application/pdf'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.png': return 'image/png'
    case '.gif': return 'image/gif'
    case '.webp': return 'image/webp'
    default: return 'application/octet-stream'
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ docId: string }> },
) {
  const session = await auth()
  if (!session?.user) {
    return new NextResponse('Unauthorized', { status: 401 })
  }
  const role = session.user.role

  // Baseline: the role must be allowed to read documents at all.
  if (!can(role, 'read', 'Document')) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const { docId } = await params
  const doc = await db.document.findUnique({ where: { id: docId } })
  if (!doc) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Contract/annex documents may embed sensitive data → ADMIN/LEGAL only.
  // Return 404 (not 403) on denial to avoid an existence oracle.
  const isSensitive = Boolean(doc.contractId || doc.annexId)
  if (isSensitive && !SENSITIVE_DOC_ROLES.includes(role)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Defense-in-depth: never serve a path outside the storage root.
  const resolved = path.resolve(doc.storagePath)
  if (resolved !== STORAGE_ROOT && !resolved.startsWith(STORAGE_ROOT + path.sep)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  // Verify the file exists on disk
  try {
    await stat(resolved)
  } catch {
    return new NextResponse('File Not Found', { status: 404 })
  }

  const contentType = contentTypeFor(doc.filename)
  const safeFilename = encodeURIComponent(doc.filename).replace(/%20/g, '+')

  // Stream the file using Node.js ReadStream → Web ReadableStream
  const nodeStream = createReadStream(resolved)
  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => {
        controller.enqueue(typeof chunk === 'string' ? Buffer.from(chunk) : chunk)
      })
      nodeStream.on('end', () => controller.close())
      nodeStream.on('error', (err) => controller.error(err))
    },
    cancel() {
      nodeStream.destroy()
    },
  })

  return new NextResponse(webStream, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Cache-Control': 'no-store',
    },
  })
}
