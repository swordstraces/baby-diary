// 云函数：login - 获取用户openId及成员信息 / 头像URL转换
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const openId = wxContext.OPENID

  // action: getAvatarUrls - 云函数有管理员权限，不受存储安全规则限制
  if (event.action === 'getAvatarUrls') {
    const fileList = event.fileList || []
    if (!fileList.length) return { urls: {} }

    try {
      const res = await cloud.getTempFileURL({ fileList })
      const urls = {}
      if (res.fileList) {
        for (const file of res.fileList) {
          if (file.fileID && file.tempFileURL && file.status === 0) {
            urls[file.fileID] = file.tempFileURL
          }
        }
      }
      return { urls }
    } catch (err) {
      console.error('[login] getAvatarUrls failed:', err)
      return { urls: {} }
    }
  }

  // action: getMembers - 获取某家庭的全部成员列表
  if (event.action === 'getMembers') {
    const familyId = event.familyId
    if (!familyId) return { success: false, message: '缺少 familyId' }

    try {
      const res = await db.collection('members')
        .where({ familyId })
        .limit(50)
        .get()
      return { success: true, data: res.data || [] }
    } catch (err) {
      console.error('[login] getMembers failed:', err)
      return { success: false, message: '查询失败' }
    }
  }

  // 默认 action: 登录 + 获取成员信息
  let memberData = null

  try {
    // 先用 openId 字段查（inviteMember / family.js 创建的文档）
    const memberRes = await db.collection('members')
      .where({ openId })
      .limit(1)
      .get()

    if (memberRes.data && memberRes.data.length > 0) {
      memberData = memberRes.data[0]
    } else {
      // 兼容旧数据：用 _openid 字段查（前端 db.add 创建的文档，云数据库自动写入 _openid）
      const memberRes2 = await db.collection('members')
        .where({ _openid: openId })
        .limit(1)
        .get()
      if (memberRes2.data && memberRes2.data.length > 0) {
        memberData = memberRes2.data[0]
      }
    }
  } catch (err) {
    console.error('[login] 查询成员记录失败:', err)
  }

  return {
    openid: openId,
    appid: wxContext.APPID,
    unionid: wxContext.UNIONID,
    member: memberData
  }
}
