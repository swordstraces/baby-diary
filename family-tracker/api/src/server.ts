import Fastify from 'fastify'
import cors from '@fastify/cors'
import jwt from '@fastify/jwt'
import { registerAuthRoutes } from './routes/auth'
import { registerMeRoutes } from './routes/me'
import { registerRecordRoutes } from './routes/records'
import { registerHandoffRoutes } from './routes/handoff'

const port = Number(process.env.PORT) || 3000
const host = process.env.HOST || '0.0.0.0'
const jwtSecret = process.env.JWT_SECRET || 'dev-change-me-in-production'
const webOrigin = process.env.WEB_ORIGIN || 'http://localhost:5173'

async function buildServer() {
  const fastify = Fastify({
    logger: true,
  })

  await fastify.register(cors, {
    origin: webOrigin.split(',').map((s) => s.trim()),
    credentials: true,
  })

  await fastify.register(jwt, {
    secret: jwtSecret,
  })

  fastify.get('/health', async () => ({ ok: true }))

  await fastify.register(
    async (api) => {
      await registerAuthRoutes(api)
      await registerMeRoutes(api)
      await registerRecordRoutes(api)
      await registerHandoffRoutes(api)
    },
    { prefix: '/api' },
  )

  return fastify
}

async function main() {
  const app = await buildServer()
  try {
    await app.listen({ port, host })
    app.log.info({ port, host, webOrigin }, 'API running')
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

void main()
