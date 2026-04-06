import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'

export async function registerMeRoutes(app: FastifyInstance) {
  app.get('/me', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: '未登录' })
    }

    const memberId = request.user.sub
    const member = await prisma.member.findUnique({
      where: { id: memberId },
      select: {
        id: true,
        displayName: true,
        loginKey: true,
        role: true,
        identityTag: true,
        familyId: true,
      },
    })
    if (!member) {
      return reply.status(401).send({ error: '用户不存在' })
    }

    const [family, babies, members] = await Promise.all([
      prisma.family.findUnique({
        where: { id: member.familyId },
        select: { id: true, name: true, inviteCode: true, createdAt: true },
      }),
      prisma.baby.findMany({
        where: { familyId: member.familyId },
        orderBy: { createdAt: 'asc' },
        select: { id: true, name: true, birthDate: true },
      }),
      prisma.member.findMany({
        where: { familyId: member.familyId },
        orderBy: { createdAt: 'asc' },
        select: {
          id: true,
          displayName: true,
          loginKey: true,
          role: true,
          identityTag: true,
        },
      }),
    ])

    return {
      member,
      family,
      babies,
      members,
    }
  })
}
