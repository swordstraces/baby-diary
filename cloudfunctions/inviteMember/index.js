// 云函数：inviteMember - 邀请成员加入家庭
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { inviteCode, nickname, avatar } = event
  // 始终从 wxContext 获取 openId，不信任前端传入（前端可能还没拿到）
  const openId = wxContext.OPENID

  if (!openId) {
    return { success: false, error: '无法获取用户身份，请重试' }
  }

  // 查找邀请码对应的家庭
  const familyRes = await db.collection('families')
    .where({ inviteCode })
    .limit(1).get()

  if (familyRes.data.length === 0) {
    return { success: false, error: '邀请码无效' }
  }

  const family = familyRes.data[0]

  // 检查是否已经是成员
  const existingMember = await db.collection('members')
    .where({ familyId: family._id, openId })
    .limit(1).get()

  if (existingMember.data.length > 0) {
    return { success: false, error: '已经是家庭成员' }
  }

  // 添加成员
  const memberData = {
    familyId: family._id,
    openId,
    nickname: nickname || '家庭成员',  // 统一用 nickname（小写n）
    avatar: avatar || '',
    role: 'member',
    joinTime: db.serverDate()
  }

  const addRes = await db.collection('members').add({ data: memberData })

  console.log('[inviteMember] 成员添加结果:', addRes)
  console.log('[inviteMember] 成员 ID:', addRes._id)

  // 更新家庭的成员列表
  await db.collection('families').doc(family._id).update({
    data: {
      memberIds: db.command.push(openId),
      updateTime: db.serverDate()
    }
  })

  return {
    success: true,
    data: {
      memberId: addRes._id,
      familyId: family._id,
      familyName: family.name,
      role: 'member'
    }
  }
}
