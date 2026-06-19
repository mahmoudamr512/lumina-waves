import 'dotenv/config'
import { PrismaClient } from '@/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'

const SOFT_MODELS = ['User', 'Client', 'MasterContract', 'Annex', 'Work', 'Document']

function makeAdapter() {
  return new PrismaPg({ connectionString: process.env.DATABASE_URL! })
}

const base = new PrismaClient({ adapter: makeAdapter() })

export const db = base.$extends({
  query: {
    $allModels: {
      async findMany({ model, args, query }) {
        if (SOFT_MODELS.includes(model)) args.where = { ...args.where, deletedAt: null }
        return query(args)
      },
      async findUnique({ model, args, query }) {
        const row = await query(args)
        return SOFT_MODELS.includes(model) && (row as any)?.deletedAt ? null : row
      },
      async findFirst({ model, args, query }) {
        if (SOFT_MODELS.includes(model)) args.where = { ...args.where, deletedAt: null }
        return query(args)
      },
    },
  },
  client: {
    $includeDeleted: base,
    async $softDelete(model: string, id: string, purgeAfter: Date) {
      // @ts-expect-error dynamic model access
      return base[model[0].toLowerCase() + model.slice(1)].update({
        where: { id },
        data: { deletedAt: new Date(), purgeAfter },
      })
    },
  },
})
