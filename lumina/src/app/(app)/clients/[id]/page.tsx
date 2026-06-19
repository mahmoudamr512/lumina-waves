import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { getClientTree } from '@/services/clients'
import { GRANT_TYPES } from '@/lib/rights'
import { FadeIn, Stagger, StaggerItem } from '@/components/motion'
import { cn } from '@/lib/cn'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) return {}
  const tree = await getClientTree(id)
  const name = tree?.stageName ?? tree?.legalName ?? id
  return { title: `${name} | Lumina Waves` }
}

const TERRITORY_AR: Record<string, string> = {
  EGYPT: 'جمهورية مصر العربية',
  MENA: 'منطقة الشرق الأوسط وشمال إفريقيا',
  WORLDWIDE: 'جميع أنحاء العالم',
}

const CREDIT_ROLE_AR: Record<string, string> = {
  AUTHOR: 'مؤلف',
  COMPOSER: 'ملحن',
  ARRANGER: 'موزع',
  PERFORMER: 'مطرب/مؤدّي',
  PRODUCER: 'منتج',
}

const WORK_STATUS_AR: Record<string, string> = {
  PENDING_ANNEX: 'في انتظار الملحق',
  LINKED: 'مرتبط',
}

const DOC_STATUS_AR: Record<string, string> = {
  DRAFT: 'مسودة',
  EXECUTED: 'منفّذ',
}

/**
 * Client tree detail (RSC). Shows the full hierarchy:
 * Client → MasterContract → Annex → Work → Credit / Document.
 * Sensitive fields are redacted server-side by getClientTree; the page
 * simply renders whatever the service returns.
 */
export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await auth()
  if (!session?.user) redirect('/login')
  const role = session.user.role

  const tree = await getClientTree(id)
  if (!tree) notFound()

  const canGenerate = can(role, 'create', 'Document') && ['ADMIN', 'LEGAL'].includes(role)
  const title = tree.stageName ?? tree.legalName

  return (
    <section className="space-y-8">
      <FadeIn>
        <header className="border-b border-border-elevation pb-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-1.5">
              <h1 className="font-display text-3xl font-semibold text-gold-metallic">{title}</h1>
              {tree.stageName && tree.stageName !== tree.legalName && (
                <p className="text-base text-muted">{tree.legalName}</p>
              )}
              <div className="flex flex-wrap items-center gap-3 pt-1 text-sm text-muted">
                {tree.nationalId ? (
                  <span dir="ltr" className="font-mono tabular-nums">
                    {tree.nationalId}
                  </span>
                ) : (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2.5 py-0.5 text-xs"
                    title="غير مصرّح لك بعرض هذه البيانات"
                  >
                    <LockIcon />
                    محجوب
                  </span>
                )}
                {tree.phone && <span>{tree.phone}</span>}
                {tree.address && <span>{tree.address}</span>}
              </div>
            </div>
            <Link
              href="/clients"
              className="text-sm text-muted transition hover:text-foreground"
            >
              ← العودة إلى العملاء
            </Link>
          </div>
        </header>
      </FadeIn>

      {tree.contracts.length === 0 ? (
        <FadeIn
          delay={0.1}
          className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-border-elevation py-16 text-center"
        >
          <p className="text-lg font-medium text-foreground">لا توجد عقود بعد</p>
          <p className="text-sm text-muted">لم يُبرم أي عقد مع هذا العميل حتى الآن.</p>
        </FadeIn>
      ) : (
        <Stagger className="space-y-6" stagger={0.06} delayChildren={0.05}>
          {tree.contracts.map((contract) => {
            const grantLabel = GRANT_TYPES[contract.grantType as keyof typeof GRANT_TYPES]
            const termMonths = contract.termMonths as number
            const termYears =
              termMonths % 12 === 0
                ? `${termMonths / 12} ${termMonths / 12 === 1 ? 'سنة' : 'سنوات'}`
                : `${termMonths} شهرًا`

            return (
              <StaggerItem key={contract.id}>
                <div className="overflow-hidden rounded-2xl border border-border-elevation bg-surface/70">
                  {/* Contract header */}
                  <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border-elevation bg-surface/40 p-5">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-medium uppercase tracking-wide text-gold-600">
                          عقد رئيسي
                        </span>
                        <span className="font-mono text-xs text-muted">
                          {String(contract.id).slice(0, 8)}…
                        </span>
                      </div>
                      <h2 className="text-lg font-semibold text-foreground">
                        {grantLabel?.ar ?? String(contract.grantType)}
                      </h2>
                      <dl className="flex flex-wrap gap-x-5 gap-y-0.5 text-sm">
                        <div className="flex gap-1.5">
                          <dt className="text-muted">النطاق:</dt>
                          <dd className="text-foreground">
                            {TERRITORY_AR[contract.territory as string] ?? String(contract.territory)}
                          </dd>
                        </div>
                        <div className="flex gap-1.5">
                          <dt className="text-muted">المدة:</dt>
                          <dd className="text-foreground">{termYears}</dd>
                        </div>
                        {contract.revenueShareBps != null && (
                          <div className="flex gap-1.5">
                            <dt className="text-muted">الحصة:</dt>
                            <dd className="text-foreground">
                              {((contract.revenueShareBps as number) / 100).toFixed(2)}%
                            </dd>
                          </div>
                        )}
                        {contract.minPayoutCents != null && (
                          <div className="flex gap-1.5">
                            <dt className="text-muted">الحد الأدنى:</dt>
                            <dd className="text-foreground">
                              {((contract.minPayoutCents as number) / 100).toFixed(2)} ج.م.
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                    {canGenerate && (
                      <Link
                        href={`/contracts/${String(contract.id)}/generate`}
                        className="shrink-0 rounded-lg border border-gold-400/30 px-3 py-1.5 text-xs font-medium text-gold-200 transition hover:border-gold-400/60 hover:text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-200"
                      >
                        إنشاء مستند PDF
                      </Link>
                    )}
                  </div>

                  {/* Contract-level documents */}
                  {contract.documents.length > 0 && (
                    <div className="border-b border-border-elevation px-5 py-3">
                      <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
                        مستندات العقد
                      </p>
                      <ul className="space-y-1.5" role="list">
                        {contract.documents.map((doc) => (
                          <li
                            key={String(doc.id)}
                            className="flex items-center justify-between gap-3 text-sm"
                          >
                            <span className="text-foreground">{String(doc.filename)}</span>
                            <div className="flex shrink-0 items-center gap-2">
                              <span
                                className={cn(
                                  'rounded-full px-2 py-0.5 text-xs font-medium',
                                  doc.status === 'EXECUTED'
                                    ? 'bg-gold-400/10 text-gold-200'
                                    : 'bg-white/5 text-muted',
                                )}
                              >
                                {DOC_STATUS_AR[doc.status as string] ?? String(doc.status)}
                              </span>
                              <span className="text-xs text-muted">
                                {new Date(doc.createdAt as Date).toLocaleDateString('ar-EG', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                })}
                              </span>
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Annexes */}
                  {contract.annexes.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-muted">لا توجد ملاحق بعد.</p>
                  ) : (
                    <div className="divide-y divide-border-elevation">
                      {contract.annexes.map((annex) => (
                        <div key={String(annex.id)} className="space-y-3 px-5 py-4">
                          {/* Annex header */}
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-foreground">
                              ملحق رقم {annex.number}
                            </h3>
                            <span className="text-xs text-muted">
                              {new Date(annex.annexDate as Date).toLocaleDateString('ar-EG', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric',
                              })}
                            </span>
                          </div>

                          {/* Works under this annex */}
                          {annex.works.length > 0 && (
                            <div className="ms-4 space-y-2 border-s border-border-elevation ps-4">
                              {annex.works.map((work) => (
                                <div
                                  key={String(work.id)}
                                  className="space-y-2 rounded-xl border border-border-elevation bg-surface/40 p-3"
                                >
                                  <div className="flex items-start justify-between gap-2">
                                    <p className="text-sm font-medium text-foreground">
                                      {work.title}
                                    </p>
                                    <span
                                      className={cn(
                                        'shrink-0 rounded-full px-2 py-0.5 text-xs font-medium',
                                        work.status === 'LINKED'
                                          ? 'bg-gold-400/10 text-gold-200'
                                          : 'bg-white/5 text-muted',
                                      )}
                                    >
                                      {WORK_STATUS_AR[work.status] ?? work.status}
                                    </span>
                                  </div>
                                  {work.credits.length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {work.credits.map((credit) => (
                                        <span
                                          key={credit.id}
                                          className="inline-flex items-center gap-1 rounded-full bg-white/5 px-2 py-0.5 text-xs text-muted"
                                        >
                                          <span className="text-gold-600">
                                            {CREDIT_ROLE_AR[credit.role] ?? credit.role}:
                                          </span>
                                          <span>{credit.name}</span>
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Annex-level documents */}
                          {annex.documents.length > 0 && (
                            <div className="ms-4 border-s border-border-elevation ps-4">
                              <p className="mb-1.5 text-xs text-muted">مستندات الملحق</p>
                              <ul className="space-y-1" role="list">
                                {annex.documents.map((doc) => (
                                  <li
                                    key={String(doc.id)}
                                    className="flex items-center justify-between gap-2 text-xs"
                                  >
                                    <span className="text-foreground">{String(doc.filename)}</span>
                                    <span
                                      className={cn(
                                        'rounded-full px-2 py-0.5 font-medium',
                                        doc.status === 'EXECUTED'
                                          ? 'bg-gold-400/10 text-gold-200'
                                          : 'bg-white/5 text-muted',
                                      )}
                                    >
                                      {DOC_STATUS_AR[doc.status as string] ?? String(doc.status)}
                                    </span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </StaggerItem>
            )
          })}
        </Stagger>
      )}
    </section>
  )
}

function LockIcon() {
  return (
    <svg
      aria-hidden="true"
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  )
}
