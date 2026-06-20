'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef, useState } from 'react'
import { addContract, type AddContractState } from './actions'
import { Button, Field, Input, Select, buttonClasses, useToast } from '@/components/ui'

const TERRITORY_OPTIONS = [
  { value: 'EGYPT', label: 'جمهورية مصر العربية' },
  { value: 'MENA', label: 'الشرق الأوسط وشمال إفريقيا' },
  { value: 'WORLDWIDE', label: 'جميع أنحاء العالم' },
]

const SETTLEMENT_OPTIONS = [
  { value: 'MONTHLY', label: 'شهرية' },
  { value: 'QUARTERLY', label: 'ربع سنوية' },
  { value: 'SEMIANNUAL', label: 'نصف سنوية' },
  { value: 'ANNUAL', label: 'سنوية' },
]

interface Props {
  clientId: string
  grantTypes: Record<string, { ar: string; en: string }>
  coverage: Record<string, { ar: string; en: string }>
}

const initialState: AddContractState = { error: null }

export default function NewContractForm({ clientId, grantTypes, coverage }: Props) {
  const [state, formAction, pending] = useActionState(addContract, initialState)
  const router = useRouter()
  const { toast } = useToast()
  const handled = useRef<AddContractState | null>(null)

  // A sale & assignment (تنازل كامل) is a one-time buyout: show the amount field
  // and hide the licensing/management fields (term, %, settlement, notice).
  const [grantType, setGrantType] = useState('EXCLUSIVE_LICENSE')
  const isSale = grantType === 'FULL_ASSIGNMENT'

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state
      toast({ title: 'تم حفظ العقد', variant: 'success' })
      router.push(state.contractId ? `/contracts/${state.contractId}` : `/clients/${clientId}`)
    }
  }, [state, toast, router, clientId])

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="clientId" value={clientId} />

      <Field label="نوع المنح" htmlFor="grantType" required>
        <Select
          id="grantType"
          name="grantType"
          required
          value={grantType}
          onChange={(e) => setGrantType(e.target.value)}
        >
          {Object.entries(grantTypes).map(([key, val]) => (
            <option key={key} value={key}>
              {val.ar}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="النطاق الجغرافي" htmlFor="territory" required>
        <Select id="territory" name="territory" required defaultValue="EGYPT">
          {TERRITORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </Select>
      </Field>

      {!isSale && (
        <>
          <div className="grid grid-cols-2 gap-4">
            <Field label="مدة العقد (بالأشهر)" htmlFor="termMonths">
              <Input id="termMonths" name="termMonths" type="number" min={1} max={240} defaultValue={36} />
            </Field>
            <Field label="نسبة الطرف الأول ٪" htmlFor="revenueSharePct">
              <Input
                id="revenueSharePct"
                name="revenueSharePct"
                type="number"
                min={0}
                max={100}
                step={0.01}
                defaultValue={70}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field label="دورية المحاسبة" htmlFor="settlementFreq">
              <Select id="settlementFreq" name="settlementFreq" defaultValue="QUARTERLY">
                {SETTLEMENT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="مهلة الإخطار (أيام)" htmlFor="noticeDays">
              <Input id="noticeDays" name="noticeDays" type="number" min={0} max={365} defaultValue={90} />
            </Field>
          </div>
        </>
      )}

      {isSale && (
        <Field
          label="مبلغ البيع/التنازل (جنيه مصري)"
          htmlFor="amountEgp"
          required
          hint="يُحوَّل المبلغ تلقائيًا إلى تفقيط (بالحروف) في العقد."
        >
          <Input id="amountEgp" name="amountEgp" type="number" min={0} step={100} placeholder="مثال: 10000" />
        </Field>
      )}

      <Field label="تاريخ التوقيع" htmlFor="signedDate">
        <Input id="signedDate" name="signedDate" type="date" />
      </Field>

      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium text-foreground">
          صور الاستغلال <span className="text-gold-400">*</span>
          <span className="ms-1 text-xs font-normal text-muted">
            (يجب اختيار واحدة على الأقل — المادة 149)
          </span>
        </legend>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-line bg-ink-soft p-3">
          {Object.entries(coverage).map(([key, val]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm transition hover:bg-white/5"
            >
              <input type="checkbox" name="coverage" value={key} className="h-4 w-4 rounded accent-gold-400" />
              <span className="text-foreground">{val.ar}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {state.error && (
        <p role="alert" className="rounded-lg border border-danger/20 bg-danger/10 px-4 py-2.5 text-sm text-danger">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" loading={pending}>
          {pending ? 'جارٍ الحفظ…' : 'حفظ العقد'}
        </Button>
        <Link href={`/clients/${clientId}?tab=contracts`} className={buttonClasses('ghost')}>
          إلغاء
        </Link>
      </div>
    </form>
  )
}
