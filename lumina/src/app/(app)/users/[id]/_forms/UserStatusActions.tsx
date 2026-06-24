'use client'

import { resetPassword, toggleDisabled, removeUser, hardRemoveUser, setAvatar, clearAvatar, type ActionState } from '../actions'
import { useActionToast } from '@/components/forms/useActionToast'
import { useQuickAdd } from '@/app/(app)/clients/[id]/_forms/useQuickAdd'
import { Button, Dialog, Field, Input, FileInput, buttonClasses } from '@/components/ui'

const initial: ActionState = { error: null }

export function UserStatusActions({
  user,
}: {
  user: { id: string; disabled: boolean; hasAvatar: boolean }
}) {
  const disableForm = useActionToast(toggleDisabled, initial, user.disabled ? 'تم تفعيل الحساب' : 'تم تعطيل الحساب')
  const avatarSet = useActionToast(setAvatar, initial, 'تم تحديث الصورة')
  const avatarClear = useActionToast(clearAvatar, initial, 'تمت إزالة الصورة')
  const pw = useQuickAdd(resetPassword, initial, 'تم تعيين كلمة مرور جديدة')
  const del = useQuickAdd(removeUser, initial, 'تم نقل المستخدم إلى المحذوفات')
  const hardDel = useQuickAdd(hardRemoveUser, initial, 'تم حذف المستخدم نهائيًا')

  return (
    <div className="space-y-5">
      {/* Disable / enable */}
      <form action={disableForm.formAction} className="flex items-center justify-between gap-3">
        <input type="hidden" name="id" value={user.id} />
        <input type="hidden" name="disable" value={user.disabled ? 'false' : 'true'} />
        <div>
          <p className="text-sm font-medium text-foreground">{user.disabled ? 'الحساب معطّل' : 'الحساب نشط'}</p>
          <p className="text-xs text-muted">
            {user.disabled ? 'لا يمكنه تسجيل الدخول حاليًا.' : 'تعطيل الحساب يوقف الدخول ويُنهي كل الجلسات.'}
          </p>
        </div>
        <Button type="submit" variant={user.disabled ? 'secondary' : 'danger'} loading={disableForm.pending}>
          {user.disabled ? 'تفعيل' : 'تعطيل'}
        </Button>
      </form>
      {disableForm.state.error && (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">{disableForm.state.error}</p>
      )}

      {/* Avatar */}
      <div className="space-y-2 border-t border-line pt-5">
        <p className="text-sm font-medium text-foreground">الصورة الشخصية</p>
        <form action={avatarSet.formAction} className="flex flex-wrap items-center gap-3">
          <input type="hidden" name="id" value={user.id} />
          <FileInput name="avatar" accept="image/*" required />
          <Button type="submit" variant="secondary" loading={avatarSet.pending}>رفع الصورة</Button>
        </form>
        {user.hasAvatar && (
          <form action={avatarClear.formAction}>
            <input type="hidden" name="id" value={user.id} />
            <button type="submit" className={buttonClasses('ghost', 'sm')}>إزالة الصورة</button>
          </form>
        )}
        {avatarSet.state.error && (
          <p role="alert" className="text-sm text-danger">{avatarSet.state.error}</p>
        )}
      </div>

      {/* Reset password + delete */}
      <div className="flex flex-wrap gap-3 border-t border-line pt-5">
        <Button type="button" variant="secondary" onClick={() => pw.setOpen(true)}>إعادة تعيين كلمة المرور</Button>
        <Button type="button" variant="danger" onClick={() => del.setOpen(true)}>حذف المستخدم</Button>
      </div>

      <Dialog open={pw.open} onClose={() => pw.setOpen(false)} title="إعادة تعيين كلمة المرور">
        <form action={pw.formAction} className="space-y-4" noValidate>
          <input type="hidden" name="id" value={user.id} />
          <Field label="كلمة المرور الجديدة" htmlFor="password" required hint="8 أحرف على الأقل.">
            <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
          </Field>
          {pw.state.error && <p role="alert" className="text-sm text-danger">{pw.state.error}</p>}
          <div className="flex gap-3">
            <Button type="submit" loading={pw.pending}>تعيين</Button>
            <button type="button" onClick={() => pw.setOpen(false)} className={buttonClasses('ghost')}>إلغاء</button>
          </div>
        </form>
      </Dialog>

      <Dialog
        open={del.open || hardDel.open}
        onClose={() => { del.setOpen(false); hardDel.setOpen(false) }}
        title="حذف المستخدم"
      >
        <div className="space-y-5">
          <p className="text-sm text-muted">اختر طريقة الحذف. الحذف النهائي لا يمكن التراجع عنه.</p>

          {/* Soft delete — recoverable for 3 days */}
          <form action={del.formAction} className="space-y-3 rounded-lg border border-line p-4">
            <input type="hidden" name="id" value={user.id} />
            <div>
              <p className="text-sm font-medium text-foreground">نقل إلى المحذوفات</p>
              <p className="mt-1 text-xs text-muted">
                يُعطَّل الحساب وتُنهى جلساته، ويمكن استرجاعه خلال <strong>٣ أيام</strong> من سلة المحذوفات.
              </p>
            </div>
            {del.state.error && <p role="alert" className="text-sm text-danger">{del.state.error}</p>}
            <Button type="submit" variant="secondary" loading={del.pending}>
              نقل إلى المحذوفات
            </Button>
          </form>

          {/* Hard delete — permanent */}
          <form action={hardDel.formAction} className="space-y-3 rounded-lg border border-danger/40 p-4">
            <input type="hidden" name="id" value={user.id} />
            <div>
              <p className="text-sm font-medium text-danger">حذف نهائي</p>
              <p className="mt-1 text-xs text-muted">
                يُحذف المستخدم نهائيًا دون فترة استرجاع. لا يمكن التراجع عن هذا الإجراء.
              </p>
            </div>
            {hardDel.state.error && <p role="alert" className="text-sm text-danger">{hardDel.state.error}</p>}
            <Button type="submit" variant="danger" loading={hardDel.pending}>
              حذف نهائي
            </Button>
          </form>

          <div>
            <button
              type="button"
              onClick={() => { del.setOpen(false); hardDel.setOpen(false) }}
              className={buttonClasses('ghost')}
            >
              إلغاء
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
