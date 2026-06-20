import Link from 'next/link'
import { GRANT_TYPES } from '@/lib/rights'
import { Stagger, StaggerItem } from '@/components/motion'
import { Card, CardBody, Badge, EmptyState, buttonClasses, IconContracts, IconPlus } from '@/components/ui'
import { TERRITORY_AR, termLabel } from '@/lib/labels'
import type { ClientTree } from '../page'

/**
 * Contracts tab: each contract is a summary card linking to its own detail page
 * (/contracts/[id]) — the full annex→work tree now lives there, not here.
 */
export function ContractsTab({
  clientId,
  contracts,
  canCreateContract,
  canGenerate,
}: {
  clientId: string
  contracts: ClientTree['contracts']
  canCreateContract: boolean
  canGenerate: boolean
}) {
  if (contracts.length === 0) {
    return (
      <EmptyState
        icon={<IconContracts className="h-6 w-6" />}
        title="لا توجد عقود بعد"
        body="لم يُبرم أي عقد مع هذا العميل حتى الآن."
        action={
          canCreateContract ? (
            <Link href={`/clients/${clientId}/contracts/new`} className={buttonClasses('primary')}>
              <IconPlus className="h-4 w-4" /> أضف أول عقد
            </Link>
          ) : undefined
        }
      />
    )
  }

  return (
    <Stagger className="space-y-4" stagger={0.06}>
      {contracts.map((contract) => {
        const grantLabel = GRANT_TYPES[contract.grantType as keyof typeof GRANT_TYPES]
        const annexCount = contract.annexes.length
        const workCount = contract.annexes.reduce((sum, a) => sum + a.works.length, 0)

        return (
          <StaggerItem key={String(contract.id)}>
            <Link href={`/contracts/${String(contract.id)}`} className="block rounded-xl focus-ring">
              <Card interactive>
                <CardBody className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="gold">عقد رئيسي</Badge>
                      <h2 className="text-base font-semibold text-foreground">
                        {grantLabel?.ar ?? String(contract.grantType)}
                      </h2>
                    </div>
                    {canGenerate && <span className="text-xs text-gold-600">إنشاء PDF متاح ←</span>}
                  </div>
                  <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <div className="flex gap-1.5">
                      <dt className="text-muted">النطاق:</dt>
                      <dd className="text-foreground">
                        {TERRITORY_AR[contract.territory as string] ?? String(contract.territory)}
                      </dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-muted">المدة:</dt>
                      <dd className="text-foreground">{termLabel(contract.termMonths as number)}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-muted">الملاحق:</dt>
                      <dd className="text-foreground tabular-nums">{annexCount}</dd>
                    </div>
                    <div className="flex gap-1.5">
                      <dt className="text-muted">الأعمال:</dt>
                      <dd className="text-foreground tabular-nums">{workCount}</dd>
                    </div>
                  </dl>
                </CardBody>
              </Card>
            </Link>
          </StaggerItem>
        )
      })}
    </Stagger>
  )
}
