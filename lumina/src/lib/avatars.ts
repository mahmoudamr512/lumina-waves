import { mkdir, writeFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { ValidationError } from '@/lib/errors'

const STORAGE = process.env.STORAGE_DIR ?? './.storage'
const AVATAR_MAX_BYTES = 2 * 1024 * 1024 // 2 MB
const ALLOWED_EXT = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif'])

/**
 * Persist a profile-picture upload to STORAGE_DIR under a server-generated UUID
 * filename (the user-supplied name is never used in the path). Validates that it
 * is a small image. Returns the on-disk path. Throws ValidationError on bad input.
 */
export async function saveAvatarFile(file: File): Promise<string> {
  if (!file || file.size === 0) throw new ValidationError('INVALID_AVATAR', 'no file')
  if (file.size > AVATAR_MAX_BYTES) throw new ValidationError('INVALID_AVATAR', 'too large')
  const rawExt = path.extname(file.name).toLowerCase()
  if (!ALLOWED_EXT.has(rawExt)) throw new ValidationError('INVALID_AVATAR', 'bad type')

  const storageDir = path.resolve(STORAGE)
  await mkdir(storageDir, { recursive: true })
  const onDisk = path.join(storageDir, `avatar-${randomUUID()}${rawExt}`)

  // Defense-in-depth: the resolved path must stay inside the storage root.
  const resolved = path.resolve(onDisk)
  if (resolved !== storageDir && !resolved.startsWith(storageDir + path.sep)) {
    throw new ValidationError('INVALID_AVATAR', 'path')
  }

  const buf = Buffer.from(await file.arrayBuffer())
  await writeFile(onDisk, buf)
  return onDisk
}

export function avatarContentType(filePath: string): string {
  switch (path.extname(filePath).toLowerCase()) {
    case '.png': return 'image/png'
    case '.jpg':
    case '.jpeg': return 'image/jpeg'
    case '.webp': return 'image/webp'
    case '.gif': return 'image/gif'
    default: return 'application/octet-stream'
  }
}
