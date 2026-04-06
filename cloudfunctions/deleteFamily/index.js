// 云函数：deleteFamily - 解散家庭（仅管理员可调用）
// 批量删除家庭及其所有关联数据
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 批量删除集合中符合条件的文档（每次最多删除100条，循环处理）
async function batchDelete(collection, where) {
  let deleted = 0
  let hasMore = true
  while (hasMore) {
    const res = await db.collection(collection).where(where).limit(100).get()
    if (res.data.length === 0) {
      hasMore = false
      break
    }
    for (const doc of res.data) {
      try {
        await db.collection(collection).doc(doc._id).remove()
        deleted++
      } catch (err) {
        console.warn(`[deleteFamily] 删除 ${collection}/${doc._id} 失败:`, err.message)
      }
    }
    hasMore = res.data.length === 100
  }
  return deleted
}

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const callerOpenId = wxContext.OPENID
  const { familyId } = event

  if (!familyId) {
    return { success: false, error: '缺少 familyId 参数' }
  }

  // 权限校验：调用者必须是该家庭的管理员
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

  try {
    // 1. 删除所有成员
    const membersDeleted = await batchDelete('members', { familyId })

    // 2. 删除所有宝宝信息
    const babiesDeleted = await batchDelete('babies', { familyId })

    // 3. 删除所有记录
    const recordsDeleted = await batchDelete('records', { familyId })

    // 4. 删除所有日报
    const reportsDeleted = await batchDelete('daily_reports', { familyId })

    // 5. 删除所有邀请码记录
    const invitesDeleted = await batchDelete('invites', { familyId })

    // 6. 删除家庭本身
    await db.collection('families').doc(familyId).remove()

    return {
      success: true,
      stats: {
        members: membersDeleted,
        babies: babiesDeleted,
        records: recordsDeleted,
        reports: reportsDeleted,
        invites: invitesDeleted
      }
    }
  } catch (err) {
    console.error('[deleteFamily] 解散家庭失败:', err)
    return { success: false, error: '解散失败：' + (err.message || err) }
  }
}
