import { AuthzError, ValidationError } from '@/lib/errors'

/** Map service errors to friendly Arabic messages for the user-management forms. */
export function userErrorMessage(e: unknown): string {
  if (e instanceof ValidationError) {
    switch (e.code) {
      case 'DUPLICATE_EMAIL':
        return 'البريد الإلكتروني مستخدم بالفعل.'
      case 'WRONG_PASSWORD':
        return 'كلمة المرور الحالية غير صحيحة.'
      case 'LAST_ADMIN':
        return 'يجب الإبقاء على مدير واحد نشط على الأقل.'
      case 'SELF_ACTION':
        return 'لا يمكنك تنفيذ هذا الإجراء على حسابك الشخصي.'
      case 'INVALID_AVATAR':
        return 'الصورة غير صالحة (يجب أن تكون صورة بحجم أقل من ٢ ميجابايت).'
      default:
        return 'تعذّر إتمام العملية.'
    }
  }
  if (e instanceof AuthzError) return 'ليس لديك صلاحية لتنفيذ هذا الإجراء.'
  return 'حدث خطأ غير متوقع.'
}
