// 云函数：generateReport - 每日报告生成
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const _ = db.command

exports.main = async (event, context) => {
  const { familyId, babyId, date } = event
  
  const startDate = new Date(date)
  const endDate = new Date(date)
  endDate.setDate(endDate.getDate() + 1)

  // 获取当日所有记录
  const recordsRes = await db.collection('records')
    .where({
      familyId,
      babyId,
      createTime: _.gte(startDate).and(_.lt(endDate))
    })
    .orderBy('createTime', 'asc')
    .get()

  const records = recordsRes.data

  // 生成报告数据
  const summary = {
    feedingCount: 0, totalMilkVolume: 0,
    diaperCount: 0, wetCount: 0, stoolCount: 0,
    sleepCount: 0, totalSleepMinutes: 0,
    foodCount: 0, moodCryingCount: 0
  }

  records.forEach(record => {
    const data = record.data || {}
    switch (record.type) {
      case 'feeding':
        summary.feedingCount++
        if (data.method === 'bottle') summary.totalMilkVolume += (data.volume || 0)
        break
      case 'diaper':
        summary.diaperCount++
        if (data.type === 'wet' || data.type === 'both') summary.wetCount++
        if (data.type === 'stool' || data.type === 'both') summary.stoolCount++
        break
      case 'sleep':
        summary.sleepCount++
        if (data.startTime && data.endTime) {
          summary.totalSleepMinutes += Math.round((new Date(data.endTime) - new Date(data.startTime)) / 60000)
        }
        break
      case 'food': summary.foodCount++; break
      case 'mood':
        if (data.moodType === 'crying' || data.moodType === 'fussy') summary.moodCryingCount++
        break
    }
  })

  // 写入或更新 daily_reports
  const existingReport = await db.collection('daily_reports')
    .where({ familyId, babyId, date })
    .limit(1).get()

  const reportData = {
    familyId, babyId, date, summary,
    totalRecords: records.length,
    generateTime: db.serverDate()
  }

  if (existingReport.data.length > 0) {
    await db.collection('daily_reports').doc(existingReport.data[0]._id).update({ data: reportData })
  } else {
    await db.collection('daily_reports').add({ data: reportData })
  }

  return { success: true, data: reportData }
}
