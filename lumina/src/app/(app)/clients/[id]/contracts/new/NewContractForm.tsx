'use client'

import { useActionState, useState } from 'react'
import { addContract, type AddContractState } from './actions'
import { cn } from '@/lib/cn'

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
  // A sale & assignment (تنازل كامل) is a one-time buyout: show the amount field
  // and hide the licensing/management fields (term, %, settlement, notice).
  const [grantType, setGrantType] = useState('EXCLUSIVE_LICENSE')
  const isSale = grantType === 'FULL_ASSIGNMENT'

  return (
    <form action={formAction} className="space-y-6" dir="rtl">
      <input type="hidden" name="clientId" value={clientId} />

      {/* Grant type */}
      <div className="space-y-1.5">
        <label htmlFor="grantType" className="block text-sm font-medium text-foreground">
          نوع المنح <span className="text-red-400">*</span>
        </label>
        <select
          id="grantType"
          name="grantType"
          required
          value={grantType}
          onChange={(e) => setGrantType(e.target.value)}
          className={cn(
            'w-full rounded-lg border border-border-elevation bg-surface px-3 py-2 text-sm text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-gold-400/50',
          )}
        >
          {Object.entries(grantTypes).map(([key, val]) => (
            <option key={key} value={key}>
              {val.ar}
            </option>
          ))}
        </select>
      </div>

      {/* Territory */}
      <div className="space-y-1.5">
        <label htmlFor="territory" className="block text-sm font-medium text-foreground">
          النطاق الجغرافي <span className="text-red-400">*</span>
        </label>
        <select
          id="territory"
          name="territory"
          required
          defaultValue="EGYPT"
          className={cn(
            'w-full rounded-lg border border-border-elevation bg-surface px-3 py-2 text-sm text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-gold-400/50',
          )}
        >
          {TERRITORY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Licensing/management fields — hidden for a sale & assignment */}
      {!isSale && (
      <>
      {/* Term months + Revenue share */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="termMonths" className="block text-sm font-medium text-foreground">
            مدة العقد (بالأشهر)
          </label>
          <input
            id="termMonths"
            name="termMonths"
            type="number"
            min={1}
            max={240}
            defaultValue={36}
            className={cn(
              'w-full rounded-lg border border-border-elevation bg-surface px-3 py-2 text-sm text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-gold-400/50',
            )}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="revenueSharePct" className="block text-sm font-medium text-foreground">
            نسبة الطرف الأول ٪
          </label>
          <input
            id="revenueSharePct"
            name="revenueSharePct"
            type="number"
            min={0}
            max={100}
            step={0.01}
            defaultValue={70}
            className={cn(
              'w-full rounded-lg border border-border-elevation bg-surface px-3 py-2 text-sm text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-gold-400/50',
            )}
          />
        </div>
      </div>

      {/* Settlement freq + Notice days */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <label htmlFor="settlementFreq" className="block text-sm font-medium text-foreground">
            دورية المحاسبة
          </label>
          <select
            id="settlementFreq"
            name="settlementFreq"
            defaultValue="QUARTERLY"
            className={cn(
              'w-full rounded-lg border border-border-elevation bg-surface px-3 py-2 text-sm text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-gold-400/50',
            )}
          >
            {SETTLEMENT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="noticeDays" className="block text-sm font-medium text-foreground">
            مهلة الإخطار (أيام)
          </label>
          <input
            id="noticeDays"
            name="noticeDays"
            type="number"
            min={0}
            max={365}
            defaultValue={90}
            className={cn(
              'w-full rounded-lg border border-border-elevation bg-surface px-3 py-2 text-sm text-foreground',
              'focus:outline-none focus:ring-2 focus:ring-gold-400/50',
            )}
          />
        </div>
      </div>
      </>
      )}

      {/* Buyout / consideration amount — only for a sale & assignment (تنازل كامل) */}
      {isSale && (
      <div className="space-y-1.5">
        <label htmlFor="amountEgp" className="block text-sm font-medium text-foreground">
          مبلغ البيع/التنازل (جنيه مصري) <span className="text-red-400">*</span>
        </label>
        <input
          id="amountEgp"
          name="amountEgp"
          type="number"
          min={0}
          step={100}
          placeholder="مثال: 10000"
          className={cn(
            'w-full rounded-lg border border-border-elevation bg-surface px-3 py-2 text-sm text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-gold-400/50',
          )}
        />
        <p className="text-xs text-muted">يُحوَّل المبلغ تلقائيًا إلى تفقيط (بالحروف) في العقد.</p>
      </div>
      )}

      {/* Signed date */}
      <div className="space-y-1.5">
        <label htmlFor="signedDate" className="block text-sm font-medium text-foreground">
          تاريخ التوقيع
        </label>
        <input
          id="signedDate"
          name="signedDate"
          type="date"
          className={cn(
            'w-full rounded-lg border border-border-elevation bg-surface px-3 py-2 text-sm text-foreground',
            'focus:outline-none focus:ring-2 focus:ring-gold-400/50',
          )}
        />
      </div>

      {/* Coverage checkboxes */}
      <fieldset className="space-y-2">
        <legend className="block text-sm font-medium text-foreground">
          صور الاستغلال <span className="text-red-400">*</span>
          <span className="mr-1 text-xs font-normal text-muted">(يجب اختيار واحدة على الأقل — المادة 149)</span>
        </legend>
        <div className="grid grid-cols-2 gap-2 rounded-lg border border-border-elevation bg-surface/40 p-3">
          {Object.entries(coverage).map(([key, val]) => (
            <label
              key={key}
              className="flex cursor-pointer items-center gap-2 rounded-lg p-2 text-sm transition hover:bg-white/5"
            >
              <input
                type="checkbox"
                name="coverage"
                value={key}
                className="accent-gold-400 h-4 w-4 rounded"
              />
              <span className="text-foreground">{val.ar}</span>
            </label>
          ))}
        </div>
      </fieldset>

      {/* Error */}
      {state.error && (
        <p className="rounded-lg border border-red-500/20 bg-red-500/10 px-4 py-2.5 text-sm text-red-400">
          {state.error}
        </p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-2">
        <a
          href={`/clients/${clientId}`}
          className="text-sm text-muted transition hover:text-foreground"
        >
          إلغاء
        </a>
        <button
          type="submit"
          disabled={pending}
          className={cn(
            'rounded-lg bg-gold-400 px-5 py-2 text-sm font-semibold text-ink transition',
            'hover:bg-gold-200 focus:outline-none focus:ring-2 focus:ring-gold-400/50',
            'disabled:cursor-not-allowed disabled:opacity-50',
          )}
        >
          {pending ? 'جارٍ الحفظ…' : 'حفظ العقد'}
        </button>
      </div>
    </form>
  )
}
