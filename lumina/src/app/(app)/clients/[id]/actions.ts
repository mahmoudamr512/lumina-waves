'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createAnnex } from '@/services/annexes'
import { uploadDocument, generateAnnexPdf } from '@/services/documents'
import { createRelease, addTrackToRelease } from '@/services/releases'
import { createFolder } from '@/services/folders'
import { softDeleteClient, hardDeleteClient } from '@/services/clients'
import { AuthzError } from '@/lib/errors'

export interface DeleteClientState {
  error: string | null
  ok?: boolean
}

/** Move the client to trash (3-day recovery window). Admin-only. */
export async function removeClient(_prev: DeleteClientState, fd: FormData): Promise<DeleteClientState> {
  const id = String(fd.get('id') ?? '')
  try {
    await softDeleteClient(id)
  } catch (err) {
    if (err instanceof AuthzError) return { error: 'ليس لديك صلاحية لحذف العميل.' }
    return { error: 'تعذّر حذف العميل. يُرجى المحاولة مرة أخرى.' }
  }
  revalidatePath('/clients')
  redirect('/clients')
}

/** Permanent delete — no 3-day recovery window. Admin-only. */
export async function hardRemoveClient(_prev: DeleteClientState, fd: FormData): Promise<DeleteClientState> {
  const id = String(fd.get('id') ?? '')
  try {
    await hardDeleteClient(id)
  } catch (err) {
    if (err instanceof AuthzError) return { error: 'ليس لديك صلاحية لحذف العميل.' }
    return { error: 'تعذّر حذف العميل. يُرجى المحاولة مرة أخرى.' }
  }
  revalidatePath('/clients')
  redirect('/clients')
}

export interface AnnexState {
  error: string | null
  /** True once the mutation succeeded — dialogs toast and close on this. */
  ok?: boolean
}

export async function addAnnex(
  _prev: AnnexState,
  formData: FormData,
): Promise<AnnexState> {
  const contractId = String(formData.get('contractId') ?? '').trim()
  const clientId = String(formData.get('clientId') ?? '').trim()

  if (!contractId) return { error: 'معرّف العقد مفقود.' }

  try {
    await createAnnex({ contractId, annexDate: new Date() })
  } catch (err) {
    if (err instanceof AuthzError) return { error: 'ليس لديك صلاحية لإضافة ملحق.' }
    return { error: 'تعذّر إضافة الملحق. يُرجى المحاولة مرة أخرى.' }
  }

  revalidatePath('/clients/' + clientId)
  return { error: null, ok: true }
}

export interface GenAnnexState {
  error: string | null
  ok?: boolean
}

/** Generate a prefilled DRAFT PDF for an annex; it appears in the annex's documents. */
export async function generateAnnexDraft(
  _prev: GenAnnexState,
  formData: FormData,
): Promise<GenAnnexState> {
  const annexId = String(formData.get('annexId') ?? '').trim()
  const contractId = String(formData.get('contractId') ?? '').trim()
  if (!annexId) return { error: 'معرّف الملحق مفقود.' }

  try {
    await generateAnnexPdf(annexId)
  } catch (err) {
    if (err instanceof AuthzError) return { error: 'ليس لديك صلاحية لإنشاء مسودة الملحق.' }
    return { error: 'تعذّر إنشاء مسودة الملحق. يُرجى المحاولة مرة أخرى.' }
  }

  if (contractId) revalidatePath('/contracts/' + contractId)
  return { error: null, ok: true }
}

export interface AttachState {
  error: string | null
  /** True once the mutation succeeded — dialogs toast and close on this. */
  ok?: boolean
}

export async function attachDocument(
  _prev: AttachState,
  formData: FormData,
): Promise<AttachState> {
  const file = formData.get('file') as File | null
  const contractId = String(formData.get('contractId') ?? '').trim() || undefined
  const annexId = String(formData.get('annexId') ?? '').trim() || undefined
  const folderId = String(formData.get('folderId') ?? '').trim() || undefined
  const clientId = String(formData.get('clientId') ?? '').trim()

  if (!file || file.size === 0) return { error: 'يرجى اختيار ملف للرفع.' }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    await uploadDocument({ buffer, filename: file.name, contractId, annexId, folderId })
  } catch (err) {
    if (err instanceof AuthzError) return { error: 'ليس لديك صلاحية لرفع المستندات.' }
    return { error: 'تعذّر رفع المستند. يُرجى المحاولة مرة أخرى.' }
  }

  revalidatePath('/clients/' + clientId)
  return { error: null, ok: true }
}

// ── Releases ──────────────────────────────────────────────────────────────────

export interface ReleaseState {
  error: string | null
  /** True once the mutation succeeded — dialogs toast and close on this. */
  ok?: boolean
}

export async function addRelease(
  _prev: ReleaseState,
  formData: FormData,
): Promise<ReleaseState> {
  const clientId = String(formData.get('clientId') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim()
  const type = String(formData.get('type') ?? 'SINGLE').trim() as 'SINGLE' | 'EP' | 'ALBUM'
  const releaseDateRaw = String(formData.get('releaseDate') ?? '').trim()
  const releaseDate = releaseDateRaw ? new Date(releaseDateRaw) : undefined

  if (!title) return { error: 'عنوان الإصدار مطلوب.' }

  try {
    await createRelease({ clientId, title, type, releaseDate })
  } catch (err) {
    if (err instanceof AuthzError) return { error: 'ليس لديك صلاحية لإضافة إصدار.' }
    return { error: 'تعذّر إضافة الإصدار. يُرجى المحاولة مرة أخرى.' }
  }

  revalidatePath('/clients/' + clientId)
  return { error: null, ok: true }
}

export interface TrackState {
  error: string | null
  /** True once the mutation succeeded — dialogs toast and close on this. */
  ok?: boolean
}

export async function addTrack(
  _prev: TrackState,
  formData: FormData,
): Promise<TrackState> {
  const releaseId = String(formData.get('releaseId') ?? '').trim()
  const clientId = String(formData.get('clientId') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim()
  const creditName = String(formData.get('creditName') ?? '').trim()
  const creditRole = String(formData.get('creditRole') ?? 'PERFORMER').trim() as 'AUTHOR' | 'COMPOSER' | 'ARRANGER' | 'PERFORMER' | 'PRODUCER'

  if (!title) return { error: 'عنوان المقطوعة مطلوب.' }

  const credits = creditName ? [{ role: creditRole, name: creditName }] : []

  try {
    await addTrackToRelease({ releaseId, title, credits })
  } catch (err) {
    if (err instanceof AuthzError) return { error: 'ليس لديك صلاحية لإضافة مقطوعة.' }
    return { error: 'تعذّر إضافة المقطوعة. يُرجى المحاولة مرة أخرى.' }
  }

  revalidatePath('/clients/' + clientId)
  return { error: null, ok: true }
}

// ── Folders ───────────────────────────────────────────────────────────────────

export interface FolderState {
  error: string | null
  /** True once the mutation succeeded — dialogs toast and close on this. */
  ok?: boolean
}

export async function addFolder(
  _prev: FolderState,
  formData: FormData,
): Promise<FolderState> {
  const clientId = String(formData.get('clientId') ?? '').trim()
  const name = String(formData.get('name') ?? '').trim()
  const parentId = String(formData.get('parentId') ?? '').trim() || undefined

  if (!name) return { error: 'اسم المجلد مطلوب.' }

  try {
    await createFolder({ clientId, name, parentId })
  } catch (err) {
    if (err instanceof AuthzError) return { error: 'ليس لديك صلاحية لإنشاء مجلد.' }
    return { error: 'تعذّر إنشاء المجلد. يُرجى المحاولة مرة أخرى.' }
  }

  revalidatePath('/clients/' + clientId)
  return { error: null, ok: true }
}

export async function attachToFolder(
  _prev: AttachState,
  formData: FormData,
): Promise<AttachState> {
  const file = formData.get('file') as File | null
  const folderId = String(formData.get('folderId') ?? '').trim()
  const clientId = String(formData.get('clientId') ?? '').trim()

  if (!file || file.size === 0) return { error: 'يرجى اختيار ملف للرفع.' }
  if (!folderId) return { error: 'معرّف المجلد مفقود.' }

  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    await uploadDocument({ buffer, filename: file.name, folderId })
  } catch (err) {
    if (err instanceof AuthzError) return { error: 'ليس لديك صلاحية لرفع المستندات.' }
    return { error: 'تعذّر رفع الملف. يُرجى المحاولة مرة أخرى.' }
  }

  revalidatePath('/clients/' + clientId)
  return { error: null, ok: true }
}
