'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useMemo, useRef, useState } from 'react'
import { uploadDocumentAction, type UploadDocumentState } from './actions'
import { Button, Field, FileInput, Select, buttonClasses, useToast } from '@/components/ui'

export interface ClientOption {
  id: string
  label: string
  contracts: Array<{ id: string; label: string; annexes: Array<{ id: string; label: string }> }>
}

const initialState: UploadDocumentState = { error: null }

/**
 * Upload form with dependent pickers (client → contract → annex) instead of raw
 * UUID inputs. Only the chosen contract/annex IDs are submitted; all three are
 * optional (a document can be uploaded unattached).
 */
export function UploadDocumentForm({ clients }: { clients: ClientOption[] }) {
  const [state, formAction, pending] = useActionState(uploadDocumentAction, initialState)
  const router = useRouter()
  const { toast } = useToast()
  const handled = useRef<UploadDocumentState | null>(null)

  const [clientId, setClientId] = useState('')
  const [contractId, setContractId] = useState('')
  const [annexId, setAnnexId] = useState('')

  const contracts = useMemo(
    () => clients.find((c) => c.id === clientId)?.contracts ?? [],
    [clients, clientId],
  )
  const annexes = useMemo(
    () => contracts.find((c) => c.id === contractId)?.annexes ?? [],
    [contracts, contractId],
  )

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state
      toast({ title: 'تم رفع المستند', variant: 'success' })
      router.push('/documents')
    }
  }, [state, toast, router])

  return (
    <form action={formAction} className="space-y-6" encType="multipart/form-data" noValidate>
      {/* The action reads contractId/annexId — submit the picker selections. */}
      <input type="hidden" name="contractId" value={contractId} />
      <input type="hidden" name="annexId" value={annexId} />

      <Field label="الملف" htmlFor="file" required hint="الصيغ المدعومة: PDF، PNG، JPG، TIFF">
        <FileInput id="file" name="file" required accept=".pdf,.png,.jpg,.jpeg,.tiff" />
      </Field>

      {clients.length > 0 && (
        <div className="space-y-4 rounded-lg border border-line bg-ink-soft p-4">
          <p className="text-xs text-muted">اربط المستند (اختياري): اختر العميل ثم العقد ثم الملحق.</p>

          <Field label="العميل" htmlFor="pick-client">
            <Select
              id="pick-client"
              value={clientId}
              onChange={(e) => {
                setClientId(e.target.value)
                setContractId('')
                setAnnexId('')
              }}
            >
              <option value="">— بدون ربط —</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </Select>
          </Field>

          {clientId && contracts.length > 0 && (
            <Field label="العقد" htmlFor="pick-contract">
              <Select
                id="pick-contract"
                value={contractId}
                onChange={(e) => {
                  setContractId(e.target.value)
                  setAnnexId('')
                }}
              >
                <option value="">— بدون عقد —</option>
                {contracts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}

          {contractId && annexes.length > 0 && (
            <Field label="الملحق" htmlFor="pick-annex">
              <Select id="pick-annex" value={annexId} onChange={(e) => setAnnexId(e.target.value)}>
                <option value="">— بدون ملحق —</option>
                {annexes.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </Select>
            </Field>
          )}
        </div>
      )}

      {state.error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" loading={pending}>
          {pending ? 'جارٍ الرفع…' : 'رفع المستند'}
        </Button>
        <Link href="/documents" className={buttonClasses('ghost')}>
          إلغاء
        </Link>
      </div>
    </form>
  )
}
