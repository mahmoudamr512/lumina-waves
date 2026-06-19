import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { auth } from '@/lib/auth'
import { can } from '@/lib/authz'
import { getClientTree } from '@/services/clients'
import { GRANT_TYPES } from '@/lib/rights'
import { FadeIn, Stagger, StaggerItem } from '@/components/motion'
import { cn } from '@/lib/cn'
import AddAnnexButton from './AddAnnexButton'
import AttachDocumentForm from './AttachDocumentForm'
import AddReleaseForm from './AddReleaseForm'
import AddTrackForm from './AddTrackForm'
import AddFolderForm from './AddFolderForm'
import FolderAttachForm from './FolderAttachForm'

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

const RELEASE_TYPE_AR: Record<string, string> = {
  SINGLE: 'أغنية منفردة',
  EP: 'EP',
  ALBUM: 'ألبوم',
}

const RELEASE_STATUS_AR: Record<string, string> = {
  PLANNED: 'مخطط له',
  RELEASED: 'صدر',
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
  const canCreate = can(role, 'create', 'MasterContract') && ['ADMIN', 'LEGAL', 'OPERATIONS'].includes(role)
  const canAttach = can(role, 'create', 'Document')
  const canAddRelease = can(role, 'create', 'Work')
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
            <div className="flex items-center gap-3">
              {canCreate && (
                <Link
                  href={`/clients/${id}/contracts/new`}
                  className="rounded-lg bg-gold-400 px-4 py-2 text-sm font-semibold text-ink transition hover:bg-gold-200 focus:outline-none focus:ring-2 focus:ring-gold-400/50"
                >
                  + إضافة عقد
                </Link>
              )}
              <Link
                href="/clients"
                className="text-sm text-muted transition hover:text-foreground"
              >
                ← العودة إلى العملاء
              </Link>
            </div>
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
          {canCreate && (
            <Link
              href={`/clients/${id}/contracts/new`}
              className="mt-2 rounded-lg bg-gold-400 px-5 py-2 text-sm font-semibold text-ink transition hover:bg-gold-200"
            >
              أضف أول عقد
            </Link>
          )}
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
                            <dt className="text-muted">
                              {contract.grantType === 'FULL_ASSIGNMENT' ? 'مبلغ التنازل:' : 'الحد الأدنى:'}
                            </dt>
                            <dd className="text-foreground">
                              {((contract.minPayoutCents as number) / 100).toLocaleString('en-US')} ج.م.
                            </dd>
                          </div>
                        )}
                      </dl>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      {canGenerate && (
                        <Link
                          href={`/contracts/${String(contract.id)}/generate`}
                          className="rounded-lg border border-gold-400/30 px-3 py-1.5 text-xs font-medium text-gold-200 transition hover:border-gold-400/60 hover:text-gold-100 focus:outline-none focus:ring-2 focus:ring-gold-200"
                        >
                          إنشاء مستند PDF
                        </Link>
                      )}
                      <AddAnnexButton contractId={String(contract.id)} clientId={id} />
                    </div>
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
                            <a
                              href={`/documents/${String(doc.id)}`}
                              className="text-foreground underline-offset-2 transition hover:text-gold-200 hover:underline"
                            >
                              {String(doc.filename)}
                            </a>
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

                  {/* Attach document at contract level */}
                  {canAttach && (
                    <div className="border-b border-border-elevation px-5 py-3">
                      <p className="mb-2 text-xs font-medium text-muted">إرفاق مستند بالعقد</p>
                      <AttachDocumentForm clientId={id} contractId={String(contract.id)} />
                    </div>
                  )}

                  {/* Annexes */}
                  {contract.annexes.length === 0 ? (
                    <p className="px-5 py-4 text-sm text-muted">
                      لا توجد ملاحق بعد — اضغط &ldquo;إضافة ملحق&rdquo; لإنشاء أول ملحق.
                    </p>
                  ) : (
                    <div className="divide-y divide-border-elevation">
                      {contract.annexes.map((annex) => (
                        <div key={String(annex.id)} className="space-y-3 px-5 py-4">
                          {/* Annex header */}
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="text-sm font-semibold text-foreground">
                              ملحق رقم {annex.number}
                            </h3>
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-muted">
                                {new Date(annex.annexDate as Date).toLocaleDateString('ar-EG', {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })}
                              </span>
                              <Link
                                href={`/clients/${id}/annexes/${String(annex.id)}/works/new`}
                                className="rounded border border-border-elevation px-2.5 py-1 text-xs font-medium text-muted transition hover:border-gold-400/40 hover:text-gold-200"
                              >
                                + إضافة عمل
                              </Link>
                            </div>
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

                          {annex.works.length === 0 && (
                            <p className="ms-4 text-xs text-muted">
                              لا توجد أعمال في هذا الملحق بعد.
                            </p>
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
                                    <a
                                      href={`/documents/${String(doc.id)}`}
                                      className="text-foreground underline-offset-2 transition hover:text-gold-200 hover:underline"
                                    >
                                      {String(doc.filename)}
                                    </a>
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

                          {/* Attach document at annex level */}
                          {canAttach && (
                            <div className="ms-4">
                              <AttachDocumentForm clientId={id} annexId={String(annex.id)} />
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

      {/* ── الإصدارات (Releases) ──────────────────────────────────────── */}
      <FadeIn delay={0.1}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 border-b border-border-elevation pb-3">
            <h2 className="font-display text-xl font-semibold text-foreground">الإصدارات</h2>
            {canAddRelease && <AddReleaseForm clientId={id} />}
          </div>

          {tree.releases.length === 0 ? (
            <p className="text-sm text-muted">لا توجد إصدارات بعد.</p>
          ) : (
            <div className="space-y-4">
              {tree.releases.map((release) => (
                <div
                  key={String(release.id)}
                  className="overflow-hidden rounded-2xl border border-border-elevation bg-surface/70"
                >
                  {/* Release header */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border-elevation bg-surface/40 px-5 py-3">
                    <div className="space-y-0.5">
                      <h3 className="text-base font-semibold text-foreground">{release.title}</h3>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                        <span className="rounded-full bg-white/5 px-2 py-0.5">
                          {RELEASE_TYPE_AR[release.type] ?? String(release.type)}
                        </span>
                        <span
                          className={cn(
                            'rounded-full px-2 py-0.5 font-medium',
                            release.status === 'RELEASED'
                              ? 'bg-gold-400/10 text-gold-200'
                              : 'bg-white/5 text-muted',
                          )}
                        >
                          {RELEASE_STATUS_AR[release.status] ?? String(release.status)}
                        </span>
                        {release.releaseDate && (
                          <span>
                            {new Date(release.releaseDate as Date).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })}
                          </span>
                        )}
                      </div>
                    </div>
                    {canAddRelease && (
                      <AddTrackForm releaseId={String(release.id)} clientId={id} />
                    )}
                  </div>

                  {/* Tracks */}
                  {release.works.length === 0 ? (
                    <p className="px-5 py-3 text-xs text-muted">لا توجد مقطوعات بعد.</p>
                  ) : (
                    <div className="divide-y divide-border-elevation">
                      {release.works.map((work) => (
                        <div key={String(work.id)} className="space-y-2 px-5 py-3">
                          <p className="text-sm font-medium text-foreground">{work.title}</p>
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
                </div>
              ))}
            </div>
          )}
        </div>
      </FadeIn>

      {/* ── المجلدات (Folders) ────────────────────────────────────────── */}
      <FadeIn delay={0.15}>
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 border-b border-border-elevation pb-3">
            <h2 className="font-display text-xl font-semibold text-foreground">المجلدات</h2>
            {canAttach && <AddFolderForm clientId={id} />}
          </div>

          {tree.folders.length === 0 ? (
            <p className="text-sm text-muted">لا توجد مجلدات بعد.</p>
          ) : (
            <div className="space-y-3">
              {tree.folders.map((folder) => (
                <div
                  key={String(folder.id)}
                  className="overflow-hidden rounded-2xl border border-border-elevation bg-surface/70"
                >
                  {/* Folder header */}
                  <div className="flex items-center justify-between gap-3 border-b border-border-elevation bg-surface/40 px-5 py-3">
                    <div className="flex items-center gap-2">
                      <FolderIcon />
                      <span className="text-sm font-semibold text-foreground">{folder.name}</span>
                    </div>
                    {canAttach && <AddFolderForm clientId={id} parentId={String(folder.id)} label="+ مجلد فرعي" />}
                  </div>

                  <div className="space-y-3 px-5 py-3">
                    {/* Documents in this folder */}
                    {folder.documents.length > 0 && (
                      <ul className="space-y-1.5" role="list">
                        {folder.documents.map((doc) => (
                          <li
                            key={String(doc.id)}
                            className="flex items-center justify-between gap-2 text-sm"
                          >
                            <a
                              href={`/documents/${String(doc.id)}`}
                              className="text-foreground underline-offset-2 transition hover:text-gold-200 hover:underline"
                            >
                              {String(doc.filename)}
                            </a>
                            <span className="text-xs text-muted">
                              {new Date(doc.createdAt as Date).toLocaleDateString('ar-EG', {
                                year: 'numeric',
                                month: 'short',
                                day: 'numeric',
                              })}
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {folder.documents.length === 0 && folder.children.length === 0 && (
                      <p className="text-xs text-muted">المجلد فارغ.</p>
                    )}

                    {/* Upload to folder */}
                    {canAttach && <FolderAttachForm clientId={id} folderId={String(folder.id)} />}

                    {/* Sub-folders */}
                    {folder.children.length > 0 && (
                      <div className="ms-4 space-y-2 border-s border-border-elevation ps-4">
                        {folder.children.map((child) => (
                          <div
                            key={String(child.id)}
                            className="overflow-hidden rounded-xl border border-border-elevation bg-surface/40"
                          >
                            <div className="flex items-center gap-2 border-b border-border-elevation px-4 py-2">
                              <FolderIcon />
                              <span className="text-xs font-semibold text-foreground">{child.name}</span>
                            </div>
                            <div className="space-y-2 px-4 py-2">
                              {child.documents.length === 0 ? (
                                <p className="text-xs text-muted">المجلد الفرعي فارغ.</p>
                              ) : (
                                <ul className="space-y-1" role="list">
                                  {child.documents.map((doc) => (
                                    <li key={String(doc.id)} className="text-xs">
                                      <a
                                        href={`/documents/${String(doc.id)}`}
                                        className="text-foreground underline-offset-2 transition hover:text-gold-200 hover:underline"
                                      >
                                        {String(doc.filename)}
                                      </a>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {canAttach && <FolderAttachForm clientId={id} folderId={String(child.id)} />}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </FadeIn>
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

function FolderIcon() {
  return (
    <svg
      aria-hidden="true"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="text-gold-600"
    >
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
    </svg>
  )
}
