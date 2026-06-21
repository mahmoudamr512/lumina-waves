'use client'

import { saveMyProfile, setMyAvatarAction, removeMyAvatarAction, type ActionState } from '../actions'
import { useActionToast } from '@/components/forms/useActionToast'
import { Button, Field, Input, FileInput, buttonClasses } from '@/components/ui'

const initial: ActionState = { error: null }

export function ProfileForm({
  profile,
}: {
  profile: { id: string; name: string; email: string; phone: string | null; hasAvatar: boolean }
}) {
  const save = useActionToast(saveMyProfile, initial, 'تم حفظ ملفك')
  const avatarSet = useActionToast(setMyAvatarAction, initial, 'تم تحديث صورتك')
  const avatarClear = useActionToast(removeMyAvatarAction, initial, 'تمت إزالة صورتك')

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <span className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-full bg-gold-400/10 text-lg font-semibold text-gold-200">
          {profile.hasAvatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={`/avatars/${profile.id}`} alt="" className="h-full w-full object-cover" />
          ) : (
            profile.name.trim().charAt(0) || '؟'
          )}
        </span>
        <div className="space-y-2">
          <form action={avatarSet.formAction} className="flex flex-wrap items-center gap-2">
            <FileInput name="avatar" accept="image/*" required />
            <Button type="submit" variant="secondary" loading={avatarSet.pending}>رفع</Button>
          </form>
          {profile.hasAvatar && (
            <form action={avatarClear.formAction}>
              <button type="submit" className={buttonClasses('ghost', 'sm')}>إزالة الصورة</button>
            </form>
          )}
        </div>
      </div>
      {avatarSet.state.error && <p role="alert" className="text-sm text-danger">{avatarSet.state.error}</p>}

      <form action={save.formAction} className="space-y-5 border-t border-line pt-5" noValidate>
        <Field label="الاسم" htmlFor="name" required>
          <Input id="name" name="name" type="text" required defaultValue={profile.name} autoComplete="off" />
        </Field>
        <Field label="البريد الإلكتروني" htmlFor="email" required>
          <Input id="email" name="email" type="email" required dir="ltr" defaultValue={profile.email} autoComplete="off" />
        </Field>
        <Field label="رقم الجوال" htmlFor="phone">
          <Input id="phone" name="phone" type="tel" dir="ltr" defaultValue={profile.phone ?? ''} autoComplete="off" placeholder="اختياري" />
        </Field>
        {save.state.error && <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2.5 text-sm text-danger">{save.state.error}</p>}
        <Button type="submit" loading={save.pending}>{save.pending ? 'جارٍ الحفظ…' : 'حفظ الملف'}</Button>
      </form>
    </div>
  )
}
