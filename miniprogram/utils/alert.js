/**
 * alert.js - 异常检测规则
 */
const { ALERT_THRESHOLDS, RECORD_TYPES } = require('./constants')

/**
 * 检查最近记录是否存在异常
 * @param {Array} recentRecords 最近的记录列表（按时间倒序）
 * @returns {Array} 异常提醒列表
 */
function checkAlerts(recentRecords) {
  const alerts = []

  // 检查喂奶间隔
  const feedingAlert = _checkFeedingInterval(recentRecords)
  if (feedingAlert) alerts.push(feedingAlert)

  // 检查体温
  const tempAlert = _checkTemperature(recentRecords)
  if (tempAlert) alerts.push(tempAlert)

  return alerts
}

function _checkFeedingInterval(records) {
  const feedings = records.filter(r => r.type === RECORD_TYPES.FEEDING)
  if (feedings.length === 0) {
    // 查看最早的记录时间，如果超过4小时没有喂奶记录
    const now = Date.now()
    const firstRecord = records[records.length - 1]
    if (firstRecord) {
      const firstTime = new Date(firstRecord.createTime).getTime()
      if (now - firstTime > ALERT_THRESHOLDS.FEEDING_INTERVAL) {
        return { type: 'no_feeding', level: 'warning', message: '已超过4小时没有喂奶记录' }
      }
    }
    return null
  }

  const lastFeeding = feedings[0]
  const lastTime = new Date(lastFeeding.createTime).getTime()
  const elapsed = Date.now() - lastTime

  if (elapsed > ALERT_THRESHOLDS.FEEDING_INTERVAL) {
    const hours = Math.floor(elapsed / 3600000)
    return { type: 'feeding_interval', level: 'warning', message: '距离上次喂奶已' + hours + '小时' }
  }
  return null
}

function _checkTemperature(records) {
  const healthRecords = records.filter(r => r.type === RECORD_TYPES.HEALTH)
  for (const record of healthRecords) {
    const data = record.data || {}
    if (data.subType === 'temperature') {
      if (data.temperature >= ALERT_THRESHOLDS.HIGH_TEMPERATURE) {
        return { type: 'high_fever', level: 'danger', message: '体温 ' + data.temperature + '°C，高于38°C' }
      }
      if (data.temperature < ALERT_THRESHOLDS.LOW_TEMPERATURE) {
        return { type: 'low_temp', level: 'warning', message: '体温 ' + data.temperature + '°C，低于36°C' }
      }
    }
  }
  return null
}

module.exports = { checkAlerts }
