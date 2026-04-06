import type { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { generateInviteCode } from '../lib/invite'
import { hashPassword, verifyPassword } from '../lib/password'
import { MemberRole } from '@prisma/client'

function normalizeLoginKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '')
}

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post<{
    Body: {
      familyName: string
      babyName?: string
      adminDisplayName: string
      adminLoginKey: string
      password: string
    }
  }>('/register-family', async (request, reply) => {
    const { familyName, babyName, adminDisplayName, adminLoginKey, password } = request.body ?? {}
    if (!familyName?.trim() || !adminDisplayName?.trim() || !password || password.length < 6) {
      return reply.status(400).send({ error: '家庭名称、管理员昵称和密码为必填，密码至少 6 位' })
    }
    const key = normalizeLoginKey(adminLoginKey || adminDisplayName)
    if (key.length < 2) {
      return reply.status(400).send({ error: '登录代号至少 2 个字符（字母数字）' })
    }

    let inviteCode = generateInviteCode()
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.family.findUnique({ where: { inviteCode } })
      if (!exists) break
      inviteCode = generateInviteCode()
    }

    const passwordHash = await hashPassword(password)

    const result = await prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: {
          name: familyName.trim(),
          inviteCode,
        },
      })
      const baby = await tx.baby.create({
        data: {
          familyId: family.id,
          name: (babyName && babyName.trim()) || '宝宝',
        },
      })
      const member = await tx.member.create({
        data: {
          familyId: family.id,
          displayName: adminDisplayName.trim(),
          loginKey: key,
          role: MemberRole.ADMIN,
          passwordHash,
        },
      })
      return { family, baby, member }
    })

    const token = app.jwt.sign({ sub: result.member.id, familyId: result.family.id })
    return {
      token,
      inviteCode: result.family.inviteCode,
      family: { id: result.family.id, name: result.family.name },
      baby: { id: result.baby.id, name: result.baby.name },
      member: { id: result.member.id, displayName: result.member.displayName, loginKey: result.member.loginKey },
    }
  })

  app.post<{
    Body: {
      inviteCode: string
      displayName: string
      loginKey: string
      password: string
      identityTag?: string
    }
  }>('/join', async (request, reply) => {
    const { inviteCode, displayName, loginKey, password, identityTag } = request.body ?? {}
    if (!inviteCode?.trim() || !displayName?.trim() || !password || password.length < 6) {
      return reply.status(400).send({ error: '邀请码、昵称和密码为必填，密码至少 6 位' })
    }
    const key = normalizeLoginKey(loginKey)
    if (key.length < 2) {
      return reply.status(400).send({ error: '登录代号至少 2 个字符' })
    }

    const family = await prisma.family.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
    })
    if (!family) {
      return reply.status(404).send({ error: '邀请码无效' })
    }

    const taken = await prisma.member.findUnique({
      where: { familyId_loginKey: { familyId: family.id, loginKey: key } },
    })
    if (taken) {
      return reply.status(409).send({ error: '该登录代号已被使用，请换一个' })
    }

    const passwordHash = await hashPassword(password)
    const member = await prisma.member.create({
      data: {
        familyId: family.id,
        displayName: displayName.trim(),
        loginKey: key,
        role: MemberRole.MEMBER,
        identityTag: identityTag?.trim() || null,
        passwordHash,
      },
    })

    const token = app.jwt.sign({ sub: member.id, familyId: family.id })
    return {
      token,
      family: { id: family.id, name: family.name },
      member: { id: member.id, displayName: member.displayName, loginKey: member.loginKey },
    }
  })

  app.post<{
    Body: { inviteCode: string; loginKey: string; password: string }
  }>('/login', async (request, reply) => {
    const { inviteCode, loginKey, password } = request.body ?? {}
    if (!inviteCode?.trim() || !loginKey?.trim() || !password) {
      return reply.status(400).send({ error: '邀请码、登录代号和密码为必填' })
    }

    const family = await prisma.family.findUnique({
      where: { inviteCode: inviteCode.trim().toUpperCase() },
    })
    if (!family) {
      return reply.status(401).send({ error: '邀请码或账号无效' })
    }

    const key = normalizeLoginKey(loginKey)
    const member = await prisma.member.findUnique({
      where: { familyId_loginKey: { familyId: family.id, loginKey: key } },
    })
    if (!member) {
      return reply.status(401).send({ error: '邀请码或账号无效' })
    }

    const ok = await verifyPassword(password, member.passwordHash)
    if (!ok) {
      return reply.status(401).send({ error: '密码错误' })
    }

    const token = app.jwt.sign({ sub: member.id, familyId: family.id })
    return {
      token,
      family: { id: family.id, name: family.name },
      member: { id: member.id, displayName: member.displayName, loginKey: member.loginKey },
    }
  })
}
