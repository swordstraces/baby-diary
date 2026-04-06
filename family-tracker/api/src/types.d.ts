import '@fastify/jwt'

declare module '@fastify/jwt' {
  interface FastifyJWT {
    payload: { sub: string; familyId: string }
    user: { sub: string; familyId: string }
  }
}
