// 云函数：init - 一键初始化数据库集合
// 部署后在微信开发者工具中右键「云端测试」调用一次即可
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 需要创建的集合列表
const COLLECTIONS = [
  'families',       // 家庭组
  'members',        // 家庭成员
  'babies',         // 宝宝信息
  'records',        // 所有活动记录
  'daily_reports',  // 每日报告
  'comments',       // 记录评论
  'invites'         // 邀请码
]

exports.main = async (event, context) => {
  const results = []

  for (const name of COLLECTIONS) {
    try {
      await db.createCollection(name)
      results.push({ collection: name, status: 'created' })
      console.log(`✅ 集合 ${name} 创建成功`)
    } catch (err) {
      // 集合已存在时会报错，属于正常情况
      if (err.errCode === -1 || (err.message && err.message.includes('already exists'))) {
        results.push({ collection: name, status: 'already_exists' })
        console.log(`⚠️ 集合 ${name} 已存在，跳过`)
      } else {
        results.push({ collection: name, status: 'error', error: err.message })
        console.error(`❌ 集合 ${name} 创建失败:`, err.message)
      }
    }
  }

  return {
    success: true,
    message: '数据库初始化完成',
    details: results
  }
}
