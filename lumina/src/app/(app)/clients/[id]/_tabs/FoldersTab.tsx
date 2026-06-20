import { Card, CardHeader, CardBody, EmptyState, IconFolder } from '@/components/ui'
import { formatDateAr } from '@/lib/labels'
import AddFolderForm from '../AddFolderForm'
import FolderAttachForm from '../FolderAttachForm'
import type { ClientTree } from '../page'

function DocLink({ id, filename, date }: { id: string; filename: string; date?: Date | string }) {
  return (
    <li className="flex items-center justify-between gap-2 text-sm">
      <a
        href={`/documents/${id}`}
        className="rounded text-foreground underline-offset-2 transition hover:text-gold-200 hover:underline focus-ring"
      >
        {filename}
      </a>
      {date && <span className="shrink-0 text-xs text-muted">{formatDateAr(date)}</span>}
    </li>
  )
}

/** Folders tab: the folder tree with modal create/subfolder/attach. */
export function FoldersTab({
  clientId,
  folders,
  canAttach,
}: {
  clientId: string
  folders: ClientTree['folders']
  canAttach: boolean
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4">
        <h2 className="font-display text-xl font-semibold text-foreground">المجلدات</h2>
        {canAttach && <AddFolderForm clientId={clientId} />}
      </div>

      {folders.length === 0 ? (
        <EmptyState
          icon={<IconFolder className="h-6 w-6" />}
          title="لا توجد مجلدات بعد"
          body="أنشئ أول مجلد لتنظيم مستندات هذا العميل."
        />
      ) : (
        <div className="space-y-3">
          {folders.map((folder) => (
            <Card key={String(folder.id)}>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <IconFolder className="h-4 w-4 text-gold-600" />
                  <span className="text-sm font-semibold text-foreground">{folder.name}</span>
                </div>
                {canAttach && (
                  <div className="flex items-center gap-2">
                    <AddFolderForm clientId={clientId} parentId={String(folder.id)} label="مجلد فرعي" />
                    <FolderAttachForm clientId={clientId} folderId={String(folder.id)} folderName={folder.name} />
                  </div>
                )}
              </CardHeader>

              <CardBody className="space-y-3">
                {folder.documents.length > 0 ? (
                  <ul className="space-y-1.5">
                    {folder.documents.map((doc) => (
                      <DocLink
                        key={String(doc.id)}
                        id={String(doc.id)}
                        filename={String(doc.filename)}
                        date={doc.createdAt as Date}
                      />
                    ))}
                  </ul>
                ) : (
                  folder.children.length === 0 && <p className="text-xs text-muted">المجلد فارغ.</p>
                )}

                {folder.children.length > 0 && (
                  <div className="space-y-2 border-s border-line ps-4">
                    {folder.children.map((child) => (
                      <div key={String(child.id)} className="rounded-lg border border-line bg-surface-raised">
                        <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-2">
                          <div className="flex items-center gap-2">
                            <IconFolder className="h-3.5 w-3.5 text-gold-600" />
                            <span className="text-xs font-semibold text-foreground">{child.name}</span>
                          </div>
                          {canAttach && (
                            <FolderAttachForm clientId={clientId} folderId={String(child.id)} folderName={child.name} />
                          )}
                        </div>
                        <div className="px-4 py-2">
                          {child.documents.length === 0 ? (
                            <p className="text-xs text-muted">المجلد الفرعي فارغ.</p>
                          ) : (
                            <ul className="space-y-1">
                              {child.documents.map((doc) => (
                                <DocLink key={String(doc.id)} id={String(doc.id)} filename={String(doc.filename)} />
                              ))}
                            </ul>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardBody>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
