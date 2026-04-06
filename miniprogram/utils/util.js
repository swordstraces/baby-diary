/**
 * util.js - 通用工具函数
 * 日期格式化、时间计算、数据校验等
 */

/**
 * 格式化日期为 YYYY-MM-DD
 */
function formatDate(date) {
  if (typeof date === 'string') date = new Date(date)
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * 格式化时间为 HH:mm
 */
function formatTime(date) {
  if (typeof date === 'string') date = new Date(date)
  const h = String(date.getHours()).padStart(2, '0')
  const min = String(date.getMinutes()).padStart(2, '0')
  return `${h}:${min}`
}

/**
 * 格式化日期时间为 YYYY-MM-DD HH:mm
 */
function formatDateTime(date) {
  if (typeof date === 'string') date = new Date(date)
  return `${formatDate(date)} ${formatTime(date)}`
}

/**
 * 获取友好的相对时间（如"刚刚"、"5分钟前"、"2小时前"）
 */
function formatRelativeTime(date) {
  if (typeof date === 'string') date = new Date(date)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const seconds = Math.floor(diff / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)

  if (seconds < 60) return '刚刚'
  if (minutes < 60) return `${minutes}分钟前`
  if (hours < 24) return `${hours}小时前`
  if (days < 7) return `${days}天前`
  return formatDate(date)
}

/**
 * 计算两个时间之间的时长（分钟）
 */
function getDurationMinutes(startTime, endTime) {
  const start = typeof startTime === 'string' ? new Date(startTime) : startTime
  const end = typeof endTime === 'string' ? new Date(endTime) : endTime
  return Math.round((end.getTime() - start.getTime()) / 60000)
}

/**
 * 格式化时长（分钟 → "X小时X分钟"）
 */
function formatDuration(minutes) {
  if (!minutes || minutes < 0) return '0分钟'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}分钟`
  if (m === 0) return `${h}小时`
  return `${h}小时${m}分钟`
}

/**
 * 获取今日的起止时间
 */
function getTodayRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

/**
 * 创建 ISO 8601 格式的日期时间（兼容 iOS）
 * @param {string} dateStr - YYYY-MM-DD 格式的日期
 * @param {string} timeStr - HH:mm 格式的时间
 * @returns {string} ISO 8601 格式的字符串
 */
function createISODateTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null
  // 格式：YYYY-MM-DDTHH:mm:00
  return `${dateStr}T${timeStr}:00`
}

/**
 * 获取指定日期的起止时间
 */
function getDateRange(dateStr) {
  const date = new Date(dateStr)
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000)
  return { start, end }
}

/**
 * 计算宝宝月龄
 */
function getBabyAge(birthday) {
  const birth = typeof birthday === 'string' ? new Date(birthday) : birthday
  const now = new Date()
  const months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  const days = now.getDate() - birth.getDate()

  if (months < 1) {
    // 不足1个月，显示天数
    const totalDays = Math.floor((now.getTime() - birth.getTime()) / (24 * 60 * 60 * 1000))
    return totalDays + '天'
  }
  if (months < 12) {
    return months + '个月'
  }
  const years = Math.floor(months / 12)
  const remainMonths = months % 12
  if (remainMonths === 0) return years + '岁'
  return years + '岁' + remainMonths + '个月'
}

/**
 * 生成唯一ID（用于邀请码等）
 */
function generateId(length = 6) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 去掉容易混淆的字符
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

/**
 * 防抖函数
 */
function debounce(fn, delay = 500) {
  let timer = null
  return function (...args) {
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 显示加载提示
 */
function showLoading(title = '加载中...') {
  wx.showLoading({ title, mask: true })
}

/**
 * 隐藏加载提示
 */
function hideLoading() {
  wx.hideLoading()
}

/**
 * 显示成功提示
 */
function showSuccess(title) {
  wx.showToast({ title, icon: 'success', duration: 1500 })
}

/**
 * 显示错误提示
 */
function showError(title) {
  wx.showToast({ title, icon: 'none', duration: 2000 })
}

/**
 * 确认对话框
 */
function showConfirm(content, title = '提示') {
  return new Promise((resolve) => {
    wx.showModal({
      title,
      content,
      confirmColor: '#FF8C6B',
      success: (res) => resolve(res.confirm),
      fail: () => resolve(false)
    })
  })
}

module.exports = {
  formatDate,
  formatTime,
  formatDateTime,
  formatRelativeTime,
  getDurationMinutes,
  formatDuration,
  getTodayRange,
  getDateRange,
  getBabyAge,
  createISODateTime,
  generateId,
  debounce,
  showLoading,
  hideLoading,
  showSuccess,
  showError,
  showConfirm
}
