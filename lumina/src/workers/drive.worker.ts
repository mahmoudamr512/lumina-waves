// src/workers/drive.worker.ts
// Backs up a client's full subtree (data.json per client/contract/annex) to
// Google Drive on demand. Registered as a BullMQ worker on the 'drive' queue.
//
// Safe no-op: if Drive is not configured (GOOGLE_SERVICE_ACCOUNT_JSON or
// DRIVE_FOLDER_ID are absent/empty), backupClient logs and returns immediately
// so mutations never fail due to a missing Drive integration.

import { Worker } from 'bullmq'
import { connectionOptions } from '@/lib/queue'
import { isDriveConfigured, ensureFolderPath, upsertJson } from '@/lib/drive'
import { db } from '@/lib/db'

/**
 * Rebuild the Drive subtree for a single client:
 *   /<clientName>/data.json
 *   /<clientName>/Master Contract <year>/data.json
 *   /<clientName>/Master Contract <year>/Annex <n>/data.json
 *
 * If Drive is not configured this is a safe no-op.
 */
export async function backupClient(clientId: string): Promise<void> {
  if (!isDriveConfigured()) {
    console.info('[drive.worker] Drive not configured — skipping backup for client', clientId)
    return
  }

  const client = await db.client.findUnique({
    where: { id: clientId },
    include: {
      contracts: {
        include: {
          annexes: {
            include: {
              works: { include: { credits: true } },
            },
          },
        },
      },
    },
  })

  if (!client) {
    console.warn('[drive.worker] Client not found:', clientId)
    return
  }

  const folderName = client.stageName ?? client.legalName
  const clientFolderId = await ensureFolderPath([folderName])
  await upsertJson(clientFolderId, 'data.json', client)

  for (const contract of client.contracts) {
    const year = contract.signedDate?.getFullYear() ?? ''
    const contractFolderName = `Master Contract ${year}`.trim()
    const contractFolderId = await ensureFolderPath([folderName, contractFolderName])
    await upsertJson(contractFolderId, 'data.json', contract)

    for (const annex of contract.annexes) {
      const annexFolderName = `Annex ${annex.number}`
      const annexFolderId = await ensureFolderPath([folderName, contractFolderName, annexFolderName])
      await upsertJson(annexFolderId, 'data.json', annex)
    }
  }
}

// Register the BullMQ worker. The handler is exported separately so it can be
// unit-tested without opening a real Redis connection.
new Worker('drive', async (job) => backupClient(job.data.clientId), { connection: connectionOptions })
