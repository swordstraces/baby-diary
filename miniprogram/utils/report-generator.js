/**
 * report-generator.js - 报告生成逻辑
 */
const { RECORD_TYPES } = require('./constants')

function generateDailyReport(records, date) {
  const report = {
    date,
    summary: {
      feedingCount: 0, totalMilkVolume: 0, breastFeedCount: 0, bottleFeedCount: 0,
      diaperCount: 0, wetCount: 0, stoolCount: 0,
      sleepCount: 0, totalSleepMinutes: 0,
      foodCount: 0, moodCryingCount: 0, healthAlertCount: 0
    },
    feedingDetails: [],
    sleepDetails: [],
    alerts: [],
    suggestions: []
  }

  records.forEach(record => {
    const data = record.data || {}
    switch (record.type) {
      case RECORD_TYPES.FEEDING:
        report.summary.feedingCount++
        if (data.method === 'bottle') {
          report.summary.bottleFeedCount++
          report.summary.totalMilkVolume += (data.volume || 0)
        } else {
          report.summary.breastFeedCount++
        }
        report.feedingDetails.push({ time: record.createTime, method: data.method, volume: data.volume || 0, duration: data.duration || 0, operatorName: record.operatorName })
        break
      case RECORD_TYPES.DIAPER:
        report.summary.diaperCount++
        if (data.diaperType === 'wet' || data.diaperType === 'both') report.summary.wetCount++
        if (data.diaperType === 'stool' || data.diaperType === 'both') report.summary.stoolCount++
        break
      case RECORD_TYPES.SLEEP:
        report.summary.sleepCount++
        if (data.duration) {
          report.summary.totalSleepMinutes += data.duration
          report.sleepDetails.push({ startTime: data.startTime, endTime: data.endTime, duration: data.duration, quality: data.quality })
        } else if (data.startTime && data.endTime) {
          const mins = Math.round((new Date(data.endTime) - new Date(data.startTime)) / 60000)
          report.summary.totalSleepMinutes += mins
          report.sleepDetails.push({ startTime: data.startTime, endTime: data.endTime, duration: mins, quality: data.quality })
        }
        break
      case RECORD_TYPES.MOOD:
        if (data.moodType === 'crying' || data.moodType === 'fussy') report.summary.moodCryingCount++
        break
      case RECORD_TYPES.FOOD:
        report.summary.foodCount++
        break
      case RECORD_TYPES.HEALTH:
        if (data.subType === 'temperature' && data.temperature >= 38.0) {
          report.summary.healthAlertCount++
          report.alerts.push({ type: 'high_fever', message: '体温 ' + data.temperature + '°C，请注意观察', time: record.createTime })
        }
        break
    }
  })

  // 生成建议
  const s = report.summary
  if (s.feedingCount === 0) {
    report.suggestions.push('今日还没有喂奶记录，记得及时喂奶哦')
    report.alerts.push({ type: 'no_feeding', message: '今日暂无喂奶记录' })
  } else if (s.feedingCount < 6) {
    report.suggestions.push('今日喂奶' + s.feedingCount + '次，新生儿一般需要8-12次，请关注')
  }
  if (s.diaperCount === 0) report.suggestions.push('今日还没有换尿布记录')
  if (s.totalSleepMinutes > 0 && s.totalSleepMinutes < 8 * 60) {
    report.suggestions.push('今日睡眠' + (s.totalSleepMinutes / 60).toFixed(1) + '小时，新生儿每天需要14-17小时睡眠')
  }
  if (s.moodCryingCount >= 3) report.suggestions.push('今日哭闹较频繁，请留意宝宝是否有不适')
  if (s.healthAlertCount > 0) report.suggestions.push('有体温异常记录，建议密切关注或咨询医生')

  return report
}

function generateStatusText(report) {
  if (!report) return '还没有今天的记录'
  const parts = []
  if (report.summary.feedingCount > 0) parts.push('吃奶' + report.summary.feedingCount + '次')
  if (report.summary.diaperCount > 0) parts.push('换了' + report.summary.diaperCount + '片尿布')
  if (report.summary.totalSleepMinutes > 0) parts.push('睡了' + Math.round(report.summary.totalSleepMinutes / 60) + '小时')
  return parts.length > 0 ? '今天' + parts.join('，') : '今天还没有记录'
}

module.exports = { generateDailyReport, generateStatusText }
