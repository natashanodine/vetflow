import 'dotenv/config'
import { buildApp } from './app.js'
import { connectDatabase } from './lib/db.js'
import './models/index.js'

const port = Number(process.env.PORT ?? 3001)
const host = process.env.HOST ?? '0.0.0.0'

const app = buildApp()

async function start() {
  try {
    await connectDatabase()
    await app.listen({
      port,
      host,
    })
  } catch (error) {
    app.log.error(error)
    process.exit(1)
  }
}

await start()