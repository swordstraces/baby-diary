// 云函数：deleteMember - 删除成员（管理员可删除同家庭其他成员）
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const callerOpenId = wxContext.OPENID
  const { memberId } = event

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

  const familyId = memberDoc.familyId

  // 权限校验：调用者必须是同家庭的管理员
  let isAdmin = false
  try {
    const adminRes = await db.collection('members')
      .where({ familyId, openId: callerOpenId, role: 'admin' })
      .limit(1)
      .get()
    isAdmin = adminRes.data.length > 0
  } catch (err) {
    isAdmin = false
  }

  if (!isAdmin) {
    return { success: false, error: '没有权限执行此操作' }
  }

  // 不允许删除管理员自己（用解散家庭功能）
  if (memberDoc.role === 'admin') {
    return { success: false, error: '不能移除管理员，如需解散家庭请使用解散功能' }
  }

  // 删除成员
  try {
    await db.collection('members').doc(memberId).remove()

    // 更新家庭的 memberIds
    const memberOpenId = memberDoc.openId || memberDoc._openid || ''
    if (memberOpenId) {
      await db.collection('families').doc(familyId).update({
        data: {
          memberIds: _.pull(memberOpenId),
          updateTime: db.serverDate()
        }
      })
    }

    return { success: true }
  } catch (err) {
    console.error('[deleteMember] 删除失败:', err)
    return { success: false, error: '删除失败：' + (err.message || err) }
  }
}
