import 'dotenv/config'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { PrismaClient } from '../generated/prisma/client.js'

const adapter = new PrismaMariaDb({
  host: process.env.DATABASE_HOST ?? 'localhost',
  port: Number(process.env.DATABASE_PORT ?? 3307),
  user: process.env.DATABASE_USER ?? 'vetflow',
  password: process.env.DATABASE_PASSWORD ?? 'vetflow_dev',
  database: process.env.DATABASE_NAME ?? 'vetflow_clinic',
  connectionLimit: 5,
  allowPublicKeyRetrieval:
    process.env.DATABASE_ALLOW_PUBLIC_KEY_RETRIEVAL === 'true',
})

export const prisma = new PrismaClient({
  adapter,
})