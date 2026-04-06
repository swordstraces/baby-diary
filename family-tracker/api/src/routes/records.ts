import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { RecordType } from '@prisma/client'

const recordTypes = new Set(Object.values(RecordType))

export async function registerRecordRoutes(app: FastifyInstance) {
  app.get<{
    Querystring: { babyId?: string; type?: string; limit?: string; before?: string }
  }>('/records', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: '未登录' })
    }

    const familyId = request.user.familyId
    const { babyId, type, limit: limitStr, before } = request.query
    if (!babyId) {
      return reply.status(400).send({ error: '缺少 babyId' })
    }

    const baby = await prisma.baby.findFirst({
      where: { id: babyId, familyId },
    })
    if (!baby) {
      return reply.status(404).send({ error: '宝宝不存在' })
    }

    const limit = Math.min(Math.max(Number(limitStr) || 40, 1), 100)
    const where: {
      familyId: string
      babyId: string
      type?: RecordType
      createdAt?: { lt: Date }
    } = { familyId, babyId: baby.id }

    if (type && recordTypes.has(type as RecordType)) {
      where.type = type as RecordType
    }
    if (before) {
      const d = new Date(before)
      if (!Number.isNaN(d.getTime())) {
        where.createdAt = { lt: d }
      }
    }

    const items = await prisma.record.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        createdBy: {
          select: { id: true, displayName: true, loginKey: true, identityTag: true },
        },
      },
    })

    return { items }
  })

  app.post<{
    Body: {
      babyId: string
      type: string
      payload?: Record<string, unknown>
      note?: string
    }
  }>('/records', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: '未登录' })
    }

    const memberId = request.user.sub
    const familyId = request.user.familyId
    const { babyId, type, payload, note } = request.body ?? {}

    if (!babyId || !type || !recordTypes.has(type as RecordType)) {
      return reply.status(400).send({ error: 'babyId 与有效 type 为必填' })
    }

    const baby = await prisma.baby.findFirst({
      where: { id: babyId, familyId },
    })
    if (!baby) {
      return reply.status(404).send({ error: '宝宝不存在' })
    }

    const record = await prisma.record.create({
      data: {
        familyId,
        babyId: baby.id,
        type: type as RecordType,
        payload: (payload ?? {}) as object,
        note: note?.trim() || null,
        createdByMemberId: memberId,
      },
      include: {
        createdBy: {
          select: { id: true, displayName: true, loginKey: true, identityTag: true },
        },
      },
    })

    return record
  })

  app.get<{ Params: { id: string } }>('/records/:id', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: '未登录' })
    }

    const familyId = request.user.familyId
    const { id } = request.params

    const record = await prisma.record.findFirst({
      where: { id, familyId },
      include: {
        createdBy: {
          select: { id: true, displayName: true, loginKey: true, identityTag: true },
        },
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            member: {
              select: { id: true, displayName: true, loginKey: true },
            },
          },
        },
      },
    })
    if (!record) {
      return reply.status(404).send({ error: '记录不存在' })
    }
    return record
  })

  app.post<{
    Params: { id: string }
    Body: { text: string }
  }>('/records/:id/comments', async (request, reply) => {
    try {
      await request.jwtVerify()
    } catch {
      return reply.status(401).send({ error: '未登录' })
    }

    const memberId = request.user.sub
    const familyId = request.user.familyId
    const { id } = request.params
    const text = request.body?.text?.trim()
    if (!text) {
      return reply.status(400).send({ error: '评论内容不能为空' })
    }

    const record = await prisma.record.findFirst({
      where: { id, familyId },
    })
    if (!record) {
      return reply.status(404).send({ error: '记录不存在' })
    }

    const comment = await prisma.comment.create({
      data: {
        recordId: id,
        memberId,
        text,
      },
      include: {
        member: {
          select: { id: true, displayName: true, loginKey: true },
        },
      },
    })
    return comment
  })
}
