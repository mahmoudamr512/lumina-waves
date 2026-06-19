/**
 * Lightweight className helper. Joins truthy string values with a space,
 * dropping any undefined / false / empty entries. No external dependency.
 *
 * @example cn('base', isActive && 'active', className)
 */
export function cn(...classes: Array<string | undefined | false>): string {
  return classes.filter(Boolean).join(' ');
}
