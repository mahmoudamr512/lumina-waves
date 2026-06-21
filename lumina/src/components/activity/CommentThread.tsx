'use client'

import { useEffect, useRef, useState } from 'react'
import { postComment, editCommentDirect, deleteCommentDirect, type CommentActionState } from './actions'
import { useActionToast } from '@/components/forms/useActionToast'
import { Button, Textarea, buttonClasses, EmptyState, IconClients } from '@/components/ui'
import { timeAgoAr, formatDateAr } from '@/lib/labels'

export interface CommentView {
  id: string
  body: string
  createdAt: Date | string
  editedAt: Date | string | null
  author: { id: string | null; name: string; hasAvatar: boolean }
  mine: boolean
}

function Avatar({ author }: { author: CommentView['author'] }) {
  return (
    <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-gold-400/10 text-xs font-semibold text-gold-200">
      {author.hasAvatar && author.id ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={`/avatars/${author.id}`} alt="" className="h-full w-full object-cover" />
      ) : (
        author.name.trim().charAt(0) || '؟'
      )}
    </span>
  )
}

const initial: CommentActionState = { error: null }

export function CommentThread({
  entity,
  entityId,
  path,
  comments,
  isAdmin,
}: {
  entity: string
  entityId: string
  path: string
  comments: CommentView[]
  isAdmin: boolean
}) {
  const { state, formAction, pending } = useActionToast(postComment, initial, 'تم نشر التعليق')
  const formRef = useRef<HTMLFormElement>(null)
  const cleared = useRef<CommentActionState | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    if (state.ok && cleared.current !== state) {
      cleared.current = state
      formRef.current?.reset()
    }
  }, [state])

  return (
    <div className="space-y-6">
      <ul className="space-y-4">
        {comments.length === 0 && (
          <li>
            <EmptyState icon={<IconClients className="h-6 w-6" />} title="لا توجد تعليقات بعد" body="ابدأ النقاش بأول تعليق." />
          </li>
        )}
        {comments.map((c) => (
          <li key={c.id} className="flex gap-3">
            <Avatar author={c.author} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-medium text-foreground">{c.author.name}</span>
                <span className="text-xs text-subtle" title={formatDateAr(c.createdAt, true)}>
                  {timeAgoAr(c.createdAt)}
                </span>
                {c.editedAt && <span className="text-xs text-subtle">(عُدّل)</span>}
              </div>

              {editingId === c.id ? (
                <form
                  action={editCommentDirect}
                  onSubmit={() => setEditingId(null)}
                  className="mt-2 space-y-2"
                >
                  <input type="hidden" name="id" value={c.id} />
                  <input type="hidden" name="path" value={path} />
                  <Textarea name="body" defaultValue={c.body} required rows={3} />
                  <div className="flex gap-2">
                    <Button type="submit" size="sm">حفظ</Button>
                    <button type="button" onClick={() => setEditingId(null)} className={buttonClasses('ghost', 'sm')}>
                      إلغاء
                    </button>
                  </div>
                </form>
              ) : (
                <p className="mt-1 whitespace-pre-wrap break-words text-sm text-foreground/90">{c.body}</p>
              )}

              {(c.mine || isAdmin) && editingId !== c.id && (
                <div className="mt-1 flex gap-3 text-xs">
                  {c.mine && (
                    <button type="button" onClick={() => setEditingId(c.id)} className="text-subtle hover:text-foreground focus-ring rounded">
                      تعديل
                    </button>
                  )}
                  <form action={deleteCommentDirect}>
                    <input type="hidden" name="id" value={c.id} />
                    <input type="hidden" name="path" value={path} />
                    <button type="submit" className="text-subtle hover:text-danger focus-ring rounded">حذف</button>
                  </form>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>

      <form ref={formRef} action={formAction} className="space-y-2 border-t border-line pt-4">
        <input type="hidden" name="entity" value={entity} />
        <input type="hidden" name="entityId" value={entityId} />
        <input type="hidden" name="path" value={path} />
        <Textarea name="body" rows={3} required placeholder="اكتب تعليقًا…" aria-label="تعليق جديد" />
        {state.error && <p role="alert" className="text-sm text-danger">{state.error}</p>}
        <div className="flex justify-end">
          <Button type="submit" loading={pending}>إرسال</Button>
        </div>
      </form>
    </div>
  )
}
