import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { RecordType } from '@prisma/client'

async function latestOfType(familyId: string, babyId: string, type: RecordType) {
  return prisma.record.findFirst({
    where: { familyId, babyId, type },
    orderBy: { createdAt: 'desc' },
    include: {
      createdBy: {
        select: { id: true, displayName: true, identityTag: true },
      },
    },
  })
}

export async function registerHandoffRoutes(app: FastifyInstance) {
  app.get<{ Querystring: { babyId?: string } }>('/handoff', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: '未登录' })
    }

    const familyId = request.user.familyId
    const babyId = request.query.babyId
    if (!babyId) {
      return reply.status(400).send({ error: '缺少 babyId' })
    }

    const baby = await prisma.baby.findFirst({
      where: { id: babyId, familyId },
    })
    if (!baby) {
      return reply.status(404).send({ error: '宝宝不存在' })
    }

    const since = new Date()
    since.setHours(since.getHours() - 24)

    const [feeding, diaper, sleep, todayCount] = await Promise.all([
      latestOfType(familyId, baby.id, RecordType.FEEDING),
      latestOfType(familyId, baby.id, RecordType.DIAPER),
      latestOfType(familyId, baby.id, RecordType.SLEEP),
      prisma.record.count({
        where: {
          familyId,
          babyId: baby.id,
          createdAt: { gte: since },
        },
      }),
    ])

    const feedingAt = feeding?.createdAt
    let feedingGapMin: number | null = null
    if (feedingAt) {
      feedingGapMin = Math.round((Date.now() - feedingAt.getTime()) / 60000)
    }

    return {
      baby: { id: baby.id, name: baby.name },
      last24hRecordCount: todayCount,
      lastFeeding: feeding,
      feedingGapMinutes: feedingGapMin,
      lastDiaper: diaper,
      lastSleep: sleep,
      hints: buildHint(feedingGapMin),
    }
  })
}

function buildHint(feedingGapMin: number | null): string[] {
  const hints: string[] = []
  if (feedingGapMin === null) {
    hints.push('还没有喂奶记录，记得补充一次。')
  } else if (feedingGapMin >= 240) {
    hints.push('已超过 4 小时未记录喂奶，请确认宝宝是否需要进食。')
  } else if (feedingGapMin >= 180) {
    hints.push('距离上次喂奶已 3 小时以上，留意宝宝需求。')
  }
  return hints
}
