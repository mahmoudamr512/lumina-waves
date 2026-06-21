import { NextResponse } from 'next/server'
import { createReadStream } from 'node:fs'
import { realpath } from 'node:fs/promises'
import path from 'node:path'
import { loadSession } from '@/lib/session'
import { db } from '@/lib/db'
import { avatarContentType } from '@/lib/avatars'

const STORAGE_ROOT = path.resolve(process.env.STORAGE_DIR ?? './.storage')

/**
 * Serve a user's profile picture. Avatars are not sensitive, so any
 * authenticated user may view them; unauthenticated requests get 404.
 * Path-traversal/symlink guarded against the storage root (mirrors the
 * document download route).
 */
export async function GET(_req: Request, { params }: { params: Promise<{ userId: string }> }) {
  const me = await loadSession()
  if (!me) return new NextResponse('Not Found', { status: 404 })

  const { userId } = await params
  const user = await db.user.findUnique({ where: { id: userId }, select: { avatarPath: true } })
  if (!user?.avatarPath) return new NextResponse('Not Found', { status: 404 })

  const resolved = path.resolve(user.avatarPath)
  if (resolved !== STORAGE_ROOT && !resolved.startsWith(STORAGE_ROOT + path.sep)) {
    return new NextResponse('Not Found', { status: 404 })
  }
  let real: string
  try {
    real = await realpath(resolved)
  } catch {
    return new NextResponse('Not Found', { status: 404 })
  }
  if (real !== STORAGE_ROOT && !real.startsWith(STORAGE_ROOT + path.sep)) {
    return new NextResponse('Not Found', { status: 404 })
  }

  const nodeStream = createReadStream(real)
  const webStream = new ReadableStream({
    start(controller) {
      nodeStream.on('data', (chunk) => controller.enqueue(typeof chunk === 'string' ? Buffer.from(chunk) : chunk))
      nodeStream.on('end', () => controller.close())
      nodeStream.on('error', (err) => controller.error(err))
    },
    cancel() {
      nodeStream.destroy()
    },
  })

  return new NextResponse(webStream, {
    status: 200,
    headers: { 'Content-Type': avatarContentType(real), 'Cache-Control': 'private, max-age=60' },
  })
}
