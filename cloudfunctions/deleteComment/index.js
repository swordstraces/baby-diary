// cloudfunctions/deleteComment/index.js
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

/**
 * 删除评论（管理员专用）
 * 
 * 请求参数：
 * {
 *   commentId: string  // 评论 ID
 *   familyId: string   // 家庭 ID（用于权限验证）
 * }
 * 
 * 返回结果：
 * {
 *   success: boolean,
 *   message: string
 * }
 */
exports.main = async (event, context) => {
  const { commentId, familyId } = event
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID

  if (!commentId) {
    return { success: false, message: '评论 ID 不能为空' }
  }

  if (!familyId) {
    return { success: false, message: '家庭 ID 不能为空' }
  }

  try {
    // 1. 获取评论信息，确认该评论属于当前家庭
    const commentRes = await db.collection('comments').doc(commentId).get()
    if (!commentRes.data) {
      return { success: false, message: '评论不存在' }
    }

    const comment = commentRes.data
    if (comment.familyId !== familyId) {
      return { success: false, message: '无权删除该评论' }
    }

    // 2. 检查当前用户是否为该家庭的管理员
    const memberRes = await db.collection('members')
      .where({
        openId: openId,
        familyId: familyId,
        role: 'admin'
      })
      .get()

    if (memberRes.data.length === 0) {
      return { success: false, message: '只有管理员可以删除评论' }
    }

    // 3. 删除评论
    await db.collection('comments').doc(commentId).remove()

    return { success: true, message: '删除成功' }
  } catch (err) {
    console.error('[deleteComment] 错误:', err)
    return { success: false, message: '删除失败: ' + err.message }
  }
}
