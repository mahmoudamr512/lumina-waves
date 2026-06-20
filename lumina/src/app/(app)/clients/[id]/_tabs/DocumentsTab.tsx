import { Table, THead, TBody, TR, TH, TD, Badge, EmptyState, statusVariant, IconDocuments } from '@/components/ui'
import { DOC_STATUS_AR, formatDateAr } from '@/lib/labels'
import type { ClientTree } from '../page'

interface DocRow {
  id: string
  filename: string
  status: string
  createdAt: Date | string | null
  context: string
}

/**
 * Documents tab: every document belonging to this client — across contracts,
 * annexes, and folders — in one openable table. Attaching documents happens in
 * the Contracts and Folders tabs where the target context is unambiguous.
 */
export function DocumentsTab({
  contracts,
  folders,
}: {
  contracts: ClientTree['contracts']
  folders: ClientTree['folders']
}) {
  const rows: DocRow[] = []

  for (const contract of contracts) {
    for (const doc of contract.documents) {
      rows.push({
        id: String(doc.id),
        filename: String(doc.filename),
        status: String(doc.status),
        createdAt: doc.createdAt as Date,
        context: 'عقد رئيسي',
      })
    }
    for (const annex of contract.annexes) {
      for (const doc of annex.documents) {
        rows.push({
          id: String(doc.id),
          filename: String(doc.filename),
          status: String(doc.status),
          createdAt: doc.createdAt as Date,
          context: `ملحق رقم ${annex.number}`,
        })
      }
    }
  }

  for (const folder of folders) {
    for (const doc of folder.documents) {
      rows.push({
        id: String(doc.id),
        filename: String(doc.filename),
        status: String(doc.status),
        createdAt: doc.createdAt as Date,
        context: `مجلد: ${folder.name}`,
      })
    }
    for (const child of folder.children) {
      for (const doc of child.documents) {
        rows.push({
          id: String(doc.id),
          filename: String(doc.filename),
          status: String(doc.status),
          createdAt: doc.createdAt as Date,
          context: `مجلد: ${folder.name} / ${child.name}`,
        })
      }
    }
  }

  if (rows.length === 0) {
    return (
      <EmptyState
        icon={<IconDocuments className="h-6 w-6" />}
        title="لا توجد مستندات بعد"
        body="أرفق مستندات من تبويب العقود أو المجلدات."
      />
    )
  }

  return (
    <Table>
      <THead>
        <tr>
          <TH>الملف</TH>
          <TH>السياق</TH>
          <TH>الحالة</TH>
          <TH>التاريخ</TH>
        </tr>
      </THead>
      <TBody>
        {rows.map((row) => (
          <TR key={row.id}>
            <TD>
              <a
                href={`/documents/${row.id}`}
                className="rounded text-foreground underline-offset-2 transition hover:text-gold-200 hover:underline focus-ring"
              >
                {row.filename}
              </a>
            </TD>
            <TD className="text-muted">{row.context}</TD>
            <TD>
              <Badge variant={statusVariant(row.status)}>
                {DOC_STATUS_AR[row.status] ?? row.status}
              </Badge>
            </TD>
            <TD className="text-muted">{row.createdAt ? formatDateAr(row.createdAt) : '—'}</TD>
          </TR>
        ))}
      </TBody>
    </Table>
  )
}
