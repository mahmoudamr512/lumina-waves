import { PrismaClient } from '@/generated/prisma/client'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/client'
import { PrismaPg } from '@prisma/adapter-pg'

const SOFT_MODELS = ['User', 'Client', 'MasterContract', 'Annex', 'Work', 'Document', 'Release', 'Folder'] as const
type SoftModel = (typeof SOFT_MODELS)[number]

// Map from PascalCase model name to camelCase Prisma delegate key.
const SOFT_MODEL_DELEGATE: Record<SoftModel, keyof typeof base> = {
  User: 'user',
  Client: 'client',
  MasterContract: 'masterContract',
  Annex: 'annex',
  Work: 'work',
  Document: 'document',
  Release: 'release',
  Folder: 'folder',
}

function isSoftModel(model: string): model is SoftModel {
  return (SOFT_MODELS as readonly string[]).includes(model)
}

function makeAdapter() {
  return new PrismaPg({ connectionString: process.env.DATABASE_URL! })
}

const base = new PrismaClient({ adapter: makeAdapter() })

export const db = base.$extends({
  query: {
    $allModels: {
      // ── WHERE-injection sinks (SQL-level filtering) ────────────────────
      async findMany({ model, args, query }) {
        if (isSoftModel(model)) args.where = { ...args.where, deletedAt: null }
        return query(args)
      },
      async findFirst({ model, args, query }) {
        if (isSoftModel(model)) args.where = { ...args.where, deletedAt: null }
        return query(args)
      },
      async findFirstOrThrow({ model, args, query }) {
        if (isSoftModel(model)) args.where = { ...args.where, deletedAt: null }
        return query(args)
      },
      async count({ model, args, query }) {
        if (isSoftModel(model)) args.where = { ...args.where, deletedAt: null }
        return query(args)
      },
      async aggregate({ model, args, query }) {
        if (isSoftModel(model)) {
          // Prisma's aggregate/groupBy args types don't expose `where` generically — dynamic cast required.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const a = args as any
          a.where = { ...a.where, deletedAt: null }
        }
        return query(args)
      },
      async groupBy({ model, args, query }) {
        if (isSoftModel(model)) {
          // Same as aggregate: generic groupBy args lack a typed `where` property.
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const a = args as any
          a.where = { ...a.where, deletedAt: null }
        }
        return query(args)
      },

      // ── Post-query sinks (findUnique only accepts unique where; SQL-level ──
      // ── injection is not available without knowing all unique field sets)  ──
      //
      // Fail-closed design: we force-include `deletedAt` in the internal query
      // even if the caller's `select`/`omit` would exclude it, then strip it
      // from the returned object if the caller did not ask for it — so the
      // public return shape is always correct.
      //
      // KNOWN LIMITATION (Phase 1): relation `include`/nested reads
      // (e.g. findUnique({ include: { annexes: true } })) do NOT filter
      // soft-deleted child rows — this extension only filters top-level
      // queries. Proper enforcement requires schema-level views or per-relation
      // filtering applied recursively to the args tree. That work is deferred
      // to Phase 2.
      async findUnique({ model, args, query }) {
        if (!isSoftModel(model)) return query(args)

        const { needsStrip, patchedArgs } = patchSelectForDeletedAt(args as FindUniqueArgs)
        const row = await query(patchedArgs as typeof args)
        // Cast to access `deletedAt` that was injected by patchSelectForDeletedAt above.
        const record = row as Record<string, unknown> | null
        if (record?.deletedAt) return null
        if (needsStrip && record) delete record.deletedAt
        return row
      },
      async findUniqueOrThrow({ model, args, query }) {
        if (!isSoftModel(model)) return query(args)

        const { needsStrip, patchedArgs } = patchSelectForDeletedAt(args as FindUniqueArgs)
        const row = await query(patchedArgs as typeof args)
        // Cast to access `deletedAt` that was injected by patchSelectForDeletedAt above.
        const record = row as Record<string, unknown>
        if (record?.deletedAt) {
          // Throw P2025 so callers mapping Prisma not-found errors to HTTP 404
          // see a PrismaClientKnownRequestError with code 'P2025', not a plain Error
          throw new PrismaClientKnownRequestError('Record not found (soft-deleted)', {
            code: 'P2025',
            clientVersion: '0.0.0',
          })
        }
        if (needsStrip) delete record.deletedAt
        return row
      },
    },
  },
  client: {
    /**
     * PRIVILEGED ESCAPE HATCH — admin / trash / restore / purge code paths only.
     *
     * This bypasses ALL soft-delete filters and returns the raw PrismaClient.
     * It MUST NOT be used in normal application reads. The only legitimate
     * consumers are the trash-management service, restore flows, and scheduled
     * purge jobs in later phases.
     */
    $includeDeleted: base,

    async $softDelete(model: string, id: string, purgeAfter: Date) {
      if (!isSoftModel(model)) throw new Error(`model not soft-deletable: ${model}`)
      // Dynamic delegate access by camelCase key — Prisma client shape can't be statically indexed.
      const delegate = base[SOFT_MODEL_DELEGATE[model as SoftModel]] as { update: (args: unknown) => Promise<unknown> }
      return delegate.update({
        where: { id },
        data: { deletedAt: new Date(), purgeAfter },
      })
    },
  },
})

// ── Helpers ────────────────────────────────────────────────────────────────────

// Typed shape for findUnique/findUniqueOrThrow args — only the fields we inspect.
type FindUniqueArgs = {
  select?: Record<string, unknown>
  omit?: Record<string, unknown>
  [key: string]: unknown
}

/**
 * Ensures `deletedAt` is included in the query for the fail-closed
 * findUnique/findUniqueOrThrow check, regardless of the caller's
 * `select` or `omit`. Returns a flag so we can strip it afterwards.
 */
function patchSelectForDeletedAt(args: FindUniqueArgs): { needsStrip: boolean; patchedArgs: FindUniqueArgs } {
  if (args.select) {
    const callerWantsDeletedAt = Boolean(args.select.deletedAt)
    if (!callerWantsDeletedAt) {
      return {
        needsStrip: true,
        patchedArgs: { ...args, select: { ...args.select, deletedAt: true } },
      }
    }
  }
  if (args.omit) {
    // Remove deletedAt from omit so the field comes back for our check; destructured to discard it.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { deletedAt: _deletedAt, ...restOmit } = args.omit
    const strippedOmit = Object.keys(restOmit).length ? restOmit : undefined
    return {
      needsStrip: true,
      patchedArgs: { ...args, omit: strippedOmit },
    }
  }
  return { needsStrip: false, patchedArgs: args }
}
