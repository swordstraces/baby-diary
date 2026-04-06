export type MemberRole = 'ADMIN' | 'MEMBER'

export type RecordType = 'FEEDING' | 'DIAPER' | 'SLEEP' | 'MOOD' | 'FOOD' | 'HEALTH'

export type MemberSummary = {
  id: string
  displayName: string
  loginKey: string
  role: MemberRole
  identityTag?: string | null
}

export type BabySummary = {
  id: string
  name: string
  birthDate?: string | null
}

export type FamilySummary = {
  id: string
  name: string
  inviteCode: string
  createdAt: string
}

export type MeResponse = {
  member: MemberSummary
  family: FamilySummary | null
  babies: BabySummary[]
  members: MemberSummary[]
}

export type RecordAuthor = Pick<MemberSummary, 'id' | 'displayName' | 'loginKey' | 'identityTag'>

export type CareRecord = {
  id: string
  familyId: string
  babyId: string
  type: RecordType
  payload: Record<string, unknown>
  note?: string | null
  createdByMemberId: string
  createdAt: string
  createdBy: RecordAuthor
  comments?: CommentItem[]
}

export type CommentItem = {
  id: string
  recordId: string
  memberId: string
  text: string
  createdAt: string
  member: Pick<MemberSummary, 'id' | 'displayName' | 'loginKey'>
}

export type HandoffResponse = {
  baby: BabySummary
  last24hRecordCount: number
  lastFeeding: CareRecord | null
  feedingGapMinutes: number | null
  lastDiaper: CareRecord | null
  lastSleep: CareRecord | null
  hints: string[]
}
