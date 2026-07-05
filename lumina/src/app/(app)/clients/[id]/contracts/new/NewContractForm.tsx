'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useActionState, useEffect, useRef, useState } from 'react'
import { addContract, type AddContractState } from './actions'
import { Button, Field, Input, Select, buttonClasses, useToast } from '@/components/ui'

const TERRITORY_OPTIONS = [
  { value: 'EGYPT', label: 'جمهورية مصر العربية' },
  { value: 'WORLDWIDE', label: 'جمهورية مصر العربية وجميع أنحاء العالم' },
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
  coverageModes: Record<string, { ar: string; en: string }>
}

const initialState: AddContractState = { error: null }

export default function NewContractForm({ clientId, grantTypes, coverageModes }: Props) {
  const [state, formAction, pending] = useActionState(addContract, initialState)
  const router = useRouter()
  const { toast } = useToast()
  const handled = useRef<AddContractState | null>(null)

  // A SALE (بيع وتنازل) is a one-time buyout: show the amount + works-Excel
  // fields and hide the licensing/management fields (term, %, settlement, notice).
  const [grantType, setGrantType] = useState('DISTRIBUTION')
  const isSale = grantType === 'SALE'

  useEffect(() => {
    if (state.ok && handled.current !== state) {
      handled.current = state
      toast({ title: 'تم حفظ العقد', variant: 'success' })
      router.push(state.contractId ? `/contracts/${state.contractId}` : `/clients/${clientId}`)
    }
  }, [state, toast, router, clientId])

  return (
    // encType is required so the file (works Excel/CSV) actually travels with the FormData
    <form action={formAction} encType="multipart/form-data" className="space-y-6">
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

      {/* Coverage mode (radio group) — controls which paragraph the granting clause renders. */}
      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium text-foreground">
          نطاق التغطية <span className="text-gold-400">*</span>
        </legend>
        <div className="grid gap-2 rounded-lg border border-line bg-ink-soft p-3">
          {Object.entries(coverageModes).map(([key, val], i) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-3 rounded-lg p-2 text-sm transition hover:bg-white/5"
            >
              <input
                type="radio"
                name="coverageMode"
                value={key}
                defaultChecked={i === 0}
                required
                className="h-4 w-4 accent-gold-400"
              />
              <span className="text-foreground">{val.ar}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Free-text exclusions — appended to the granting clause as «باستثناء …». */}
      <Field
        label="استثناءات من التغطية"
        htmlFor="coverageExclusions"
        hint='افصل بين البنود بفواصل، مثل: TikTok، Spotify. تظهر في العقد كـ «باستثناء: …».'
      >
        <Input
          id="coverageExclusions"
          name="coverageExclusions"
          type="text"
          placeholder="TikTok، Spotify"
          autoComplete="off"
        />
      </Field>

      {/* Excel/CSV upload for the SALE consideration table (Art.3 works list). */}
      {isSale && (
        <Field
          label="قائمة المصنفات المُشتراة (Excel أو CSV)"
          htmlFor="worksFile"
          hint="عمودان: (1) اسم المؤدّي، (2) اسم المصنّف. يتم إنشاء ملحق تلقائيًا يحتوي على هذه المصنفات."
        >
          <input
            id="worksFile"
            name="worksFile"
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            className="block w-full rounded-lg border border-line bg-ink-soft px-3 py-2 text-sm text-foreground file:mr-3 file:rounded-md file:border-0 file:bg-gold-400 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ink hover:file:bg-gold-300"
          />
        </Field>
      )}

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
