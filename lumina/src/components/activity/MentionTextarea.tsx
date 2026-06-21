'use client'

import { useRef, useState } from 'react'
import { searchMentions } from './mention-actions'

interface MentionUser {
  id: string
  name: string
  hasAvatar: boolean
}

/**
 * Uncontrolled comment textarea with inline `@` autocomplete. The body is the
 * `name` field; chosen mention ids are written to a hidden `mentionIds` input
 * (comma-joined), recomputed from the current text so removed mentions drop.
 * Being uncontrolled means a parent `form.reset()` clears it natively.
 */
export function MentionTextarea({ name = 'body', placeholder }: { name?: string; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null)
  const hiddenRef = useRef<HTMLInputElement>(null)
  const picked = useRef<Record<string, string>>({}) // id -> name
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [suggestions, setSuggestions] = useState<MentionUser[]>([])
  const [open, setOpen] = useState(false)

  function recomputeHidden(text: string) {
    const ids = Object.entries(picked.current)
      .filter(([, n]) => text.includes(`@${n}`))
      .map(([id]) => id)
    if (hiddenRef.current) hiddenRef.current.value = ids.join(',')
  }

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const text = e.target.value
    recomputeHidden(text)
    const caret = e.target.selectionStart ?? text.length
    const m = /@(\S{0,30})$/.exec(text.slice(0, caret))
    if (!m) {
      setOpen(false)
      return
    }
    const token = m[1]
    if (debounce.current) clearTimeout(debounce.current)
    debounce.current = setTimeout(async () => {
      const res = await searchMentions(token).catch(() => [])
      setSuggestions(res)
      setOpen(res.length > 0)
    }, 150)
  }

  function pick(u: MentionUser) {
    const el = ref.current
    if (!el) return
    const caret = el.selectionStart ?? el.value.length
    const before = el.value.slice(0, caret).replace(/@(\S{0,30})$/, `@${u.name} `)
    el.value = before + el.value.slice(caret)
    picked.current[u.id] = u.name
    recomputeHidden(el.value)
    setOpen(false)
    el.focus()
  }

  return (
    <div className="relative">
      <textarea
        ref={ref}
        name={name}
        onChange={onChange}
        rows={3}
        required
        placeholder={placeholder}
        aria-label="تعليق جديد"
        className="w-full rounded-lg border border-line bg-surface-raised px-3 py-2 text-sm text-foreground placeholder:text-subtle focus-ring"
      />
      <input ref={hiddenRef} type="hidden" name="mentionIds" defaultValue="" />
      {open && (
        <ul className="absolute z-50 mt-1 max-h-56 w-64 overflow-auto rounded-lg border border-line-strong bg-surface-raised shadow-xl">
          {suggestions.map((u) => (
            <li key={u.id}>
              <button
                type="button"
                onClick={() => pick(u)}
                className="flex w-full items-center gap-2 px-3 py-2 text-start text-sm text-foreground transition hover:bg-white/5 focus-ring"
              >
                <span className="grid h-6 w-6 shrink-0 place-items-center overflow-hidden rounded-full bg-gold-400/10 text-[10px] font-semibold text-gold-200">
                  {u.hasAvatar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/avatars/${u.id}`} alt="" className="h-full w-full object-cover" />
                  ) : (
                    u.name.trim().charAt(0) || '؟'
                  )}
                </span>
                {u.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
