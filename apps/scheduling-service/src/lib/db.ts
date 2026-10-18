import 'dotenv/config'
import { randomUUID } from 'node:crypto'
import mongoose from 'mongoose'

export const DEFAULT_URI = 'mongodb://127.0.0.1:27017/vetflow_scheduling'

/** IDs are UUID strings, so they look the same across all services. */
export const uuidId = { type: String, default: () => randomUUID() }

export async function connectDatabase() {
  // MONGODB_DB_NAME lets several services share one connection string
  // (for example a MongoDB Atlas cluster), each with its own database.
  const dbName = process.env.MONGODB_DB_NAME
  await mongoose.connect(process.env.MONGODB_URI ?? DEFAULT_URI, {
    serverSelectionTimeoutMS: 10_000,
    ...(dbName && { dbName }),
  })
  // Make sure unique indexes exist before accepting requests.
  await Promise.all(
    Object.values(mongoose.models).map((model) => model.init()),
  )
}

export function disconnectDatabase() {
  return mongoose.disconnect()
}

export async function pingDatabase() {
  await mongoose.connection.db?.admin().ping()
}

export function isDuplicateKeyError(error: unknown) {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 11000
  )
}
