// src/lib/drive.ts
// Google Drive client — LAZY init. The google auth/drive client is never
// constructed at module load time so that importing this module is always safe
// when GOOGLE_SERVICE_ACCOUNT_JSON / DRIVE_FOLDER_ID are absent (dev, CI, etc.).

import { google } from 'googleapis'

const FOLDER_MIME = 'application/vnd.google-apps.folder'

/** Returns true only when both required env vars are non-empty strings. */
export function isDriveConfigured(): boolean {
  return !!(process.env.GOOGLE_SERVICE_ACCOUNT_JSON && process.env.DRIVE_FOLDER_ID)
}

/** Lazily create the authenticated Drive client on each call. */
function getDriveClient() {
  // Parse the credentials JSON — safe because we only call this after isDriveConfigured()
  const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON!)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  return google.drive({ version: 'v3', auth })
}

/**
 * Walk `parts`, creating each missing folder segment as a child of the previous.
 * Starts from DRIVE_FOLDER_ID as the root.
 * Returns the Drive folder-id of the deepest folder in the path.
 */
export async function ensureFolderPath(parts: string[]): Promise<string> {
  const drive = getDriveClient()
  let parent = process.env.DRIVE_FOLDER_ID!

  for (const name of parts) {
    const escaped = name.replace(/'/g, "\\'")
    const q = `name='${escaped}' and '${parent}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`
    const found = await drive.files.list({ q, fields: 'files(id)' })
    const existing = found.data.files?.[0]?.id

    if (existing) {
      parent = existing
    } else {
      const created = await drive.files.create({
        requestBody: { name, mimeType: FOLDER_MIME, parents: [parent] },
        fields: 'id',
      })
      parent = created.data.id!
    }
  }

  return parent
}

/**
 * Upload (or overwrite) a file in the given Drive folder.
 * If a file with the same name already exists in the folder, it is overwritten;
 * otherwise a new file is created.
 */
export async function upsertFile(
  folderId: string,
  name: string,
  buf: Buffer,
  mime: string,
): Promise<string> {
  const drive = getDriveClient()
  const escaped = name.replace(/'/g, "\\'")
  const q = `name='${escaped}' and '${folderId}' in parents and trashed=false`
  const found = await drive.files.list({ q, fields: 'files(id)' })
  const existing = found.data.files?.[0]?.id

  if (existing) {
    const updated = await drive.files.update({
      fileId: existing,
      media: { mimeType: mime, body: buf },
      fields: 'id',
    })
    return updated.data.id!
  }

  const created = await drive.files.create({
    requestBody: { name, parents: [folderId] },
    media: { mimeType: mime, body: buf },
    fields: 'id',
  })
  return created.data.id!
}

/**
 * Convenience wrapper — serialise `obj` to JSON and upsert it as `name` inside `folderId`.
 */
export async function upsertJson(folderId: string, name: string, obj: unknown): Promise<string> {
  const buf = Buffer.from(JSON.stringify(obj, null, 2), 'utf8')
  return upsertFile(folderId, name, buf, 'application/json')
}
