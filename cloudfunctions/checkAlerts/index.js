// 云函数：checkAlerts - 定时异常检查
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

// 4小时未喂奶阈值
const FEEDING_THRESHOLD = 4 * 60 * 60 * 1000

exports.main = async (event, context) => {
  // 获取所有家庭
  const familiesRes = await db.collection('families').limit(100).get()
  const results = []

  for (const family of familiesRes.data) {
    const alerts = []

    // 获取最近12小时内的喂奶记录
    const twelveHoursAgo = new Date(Date.now() - 12 * 60 * 60 * 1000)
    const feedingRes = await db.collection('records')
      .where({
        familyId: family._id,
        type: 'feeding',
        createTime: _.gte(twelveHoursAgo)
      })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get()

    if (feedingRes.data.length === 0) {
      // 检查家庭是否有宝宝（有宝宝才提醒）
      const babyRes = await db.collection('babies')
        .where({ familyId: family._id })
        .limit(1).get()
      if (babyRes.data.length > 0) {
        alerts.push({ type: 'no_feeding_recent', message: '超过12小时没有喂奶记录' })
      }
    } else {
      const lastFeeding = feedingRes.data[0]
      const elapsed = Date.now() - new Date(lastFeeding.createTime).getTime()
      if (elapsed > FEEDING_THRESHOLD) {
        const hours = Math.floor(elapsed / 3600000)
        alerts.push({ type: 'feeding_interval', message: '距上次喂奶已' + hours + '小时' })
      }
    }

    if (alerts.length > 0) {
      results.push({ familyId: family._id, alerts })
    }
  }

  return { success: true, checkedFamilies: familiesRes.data.length, alertFamilies: results }
}
