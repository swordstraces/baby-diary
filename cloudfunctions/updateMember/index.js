// 云函数：updateMember - 更新成员信息（管理员或本人均可调用）
// 使用云函数管理员权限，绕过前端数据库安全规则限制
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const callerOpenId = wxContext.OPENID

  const { memberId, avatar, nickname, identity } = event

  if (!memberId) {
    return { success: false, error: '缺少 memberId 参数' }
  }

  // 查询目标成员
  let memberDoc
  try {
    const res = await db.collection('members').doc(memberId).get()
    memberDoc = res.data
  } catch (err) {
    return { success: false, error: '成员不存在' }
  }

  // 权限校验：必须是本人 OR 同一家庭的管理员
  const familyId = memberDoc.familyId

  // 检查调用者是否是本人（兼容 openId 和 _openid 两种字段名）
  const memberOpenId = memberDoc.openId || memberDoc._openid || ''
  const isSelf = memberOpenId === callerOpenId

  // 检查调用者是否是管理员（兼容 openId 和 _openid 字段名）
  let isAdmin = false
  if (!isSelf) {
    try {
      // 先尝试 openId 字段（inviteMember 创建的记录 / 前端创建的 admin 记录）
      const adminRes = await db.collection('members')
        .where({ familyId, openId: callerOpenId, role: 'admin' })
        .limit(1)
        .get()
      if (adminRes.data.length > 0) {
        isAdmin = true
      } else {
        // 再尝试 _openid 字段（部分版本兼容）
        const adminRes2 = await db.collection('members')
          .where({ familyId, _openid: callerOpenId, role: 'admin' })
          .limit(1)
          .get()
        isAdmin = adminRes2.data.length > 0
      }
    } catch (err) {
      isAdmin = false
    }
  }

  if (!isSelf && !isAdmin) {
    return { success: false, error: '没有权限修改该成员信息' }
  }

  // 构建更新数据
  const updateData = {
    updateTime: db.serverDate()
  }

  if (nickname !== undefined && nickname !== null) {
    updateData.nickname = nickname
  }
  if (identity !== undefined && identity !== null) {
    updateData.identity = identity
  }
  if (avatar !== undefined && avatar !== null) {
    updateData.avatar = avatar
  }

  try {
    await db.collection('members').doc(memberId).update({ data: updateData })
    return { success: true }
  } catch (err) {
    console.error('[updateMember] 更新失败:', err)
    return { success: false, error: '更新失败：' + (err.message || err) }
  }
}
