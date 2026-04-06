// pages/report/report.js
const cloud = require('../../utils/cloud')
const { RECORD_TYPE_CONFIG, ALERT_THRESHOLDS } = require('../../utils/constants')
const { generateDailyReport } = require('../../utils/report-generator')
const app = getApp()

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

Page({
  data: {
    currentDate: '',
    displayDate: '',
    weekdayText: '',
    today: '',  // 今天的日期，用于限制选择范围
    loading: false,
    summary: [],
    comparison: [],
    alerts: [],
    suggestions: [],
    trendData: { feeding: [], sleep: [], diaper: [] },
    trendLabels: [],
    canvasWidth: 640,
    canvasHeight: 0,
    exportMode: false,  // 是否为导出模式
    timeRange: 7,  // 时间范围：7/14/30天
    timeRangeOptions: [7, 14, 30]  // 可选范围
  },

  onLoad(options) {
    // 检查是否为导出模式
    if (options.exportMode === 'true') {
      this.setData({ exportMode: true })
    }
    // 处理分享进来的参数
    if (options.f && options.b) {
      const familyId = options.f
      const babyId = options.b
      const targetDate = options.d || ''
      // 如果当前用户没有加载过这个家庭，先设置全局数据
      if (!app.globalData.currentFamily || app.globalData.currentFamily._id !== familyId) {
        // 尝试从全局 families 列表找到对应家庭
        const families = app.globalData.families || []
        const family = families.find(f => f._id === familyId)
        if (family) {
          app.globalData.currentFamily = family
        }
      }
      if (!app.globalData.currentBaby || app.globalData.currentBaby._id !== babyId) {
        const baby = (app.globalData.currentFamily && app.globalData.currentFamily.babies) 
          ? app.globalData.currentFamily.babies.find(b => b._id === babyId) 
          : null
        if (baby) {
          app.globalData.currentBaby = baby
        }
      }
      if (targetDate) {
        this._setDate(new Date(targetDate))
        return
      }
    }
    this._setDate(new Date())
  },

  onPullDownRefresh() {
    this._loadReport()
      .then(() => wx.stopPullDownRefresh())
      .catch(() => wx.stopPullDownRefresh())
  },

  _setDate(date) {
    const y = date.getFullYear()
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const d = date.getDate().toString().padStart(2, '0')
    const dateStr = `${y}-${m}-${d}`
    const now = new Date()
    const isToday = date.toDateString() === now.toDateString()

    // 计算今天的日期字符串
    const todayY = now.getFullYear()
    const todayM = (now.getMonth() + 1).toString().padStart(2, '0')
    const todayD = now.getDate().toString().padStart(2, '0')
    const todayStr = `${todayY}-${todayM}-${todayD}`

    this.setData({
      currentDate: dateStr,
      today: todayStr,  // 保存今天的日期
      displayDate: isToday ? '今天' : `${m}月${d}日`,
      weekdayText: WEEKDAYS[date.getDay()]
    })
    this._loadReport()
  },

  prevDay() {
    const d = new Date(this.data.currentDate)
    d.setDate(d.getDate() - 1)
    this._setDate(d)
  },

  nextDay() {
    const d = new Date(this.data.currentDate)
    d.setDate(d.getDate() + 1)
    if (d > new Date()) return
    this._setDate(d)
  },

  // 日历选择器回调
  onDatePick(e) {
    const dateStr = e.detail.value
    this._setDate(new Date(dateStr))
  },

  // 时间范围选择
  onTimeRangeChange(e) {
    const range = parseInt(e.currentTarget.dataset.range)
    this.setData({ timeRange: range })
    this._loadTrend()  // 重新加载趋势数据
  },

  async _loadReport() {
    const familyId = app.globalData.currentFamily ? app.globalData.currentFamily._id : ''
    const babyId = app.globalData.currentBaby ? app.globalData.currentBaby._id : ''
    if (!familyId) return

    this.setData({ loading: true })

    try {
      const todayRecords = await this._getRecordsForDate(this.data.currentDate)

      const yesterday = new Date(this.data.currentDate)
      yesterday.setDate(yesterday.getDate() - 1)
      const yesterdayStr = this._dateToStr(yesterday)
      const yesterdayRecords = await this._getRecordsForDate(yesterdayStr)

      this._buildSummary(todayRecords)
      this._buildComparison(todayRecords, yesterdayRecords)
      this._buildAlertsAndSuggestions(todayRecords)
      await this._loadTrend()

    } catch (err) {
      console.error('加载报告失败:', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  async _getRecordsForDate(dateStr) {
    const familyId = app.globalData.currentFamily ? app.globalData.currentFamily._id : ''
    const babyId = app.globalData.currentBaby ? app.globalData.currentBaby._id : ''
    if (!familyId) return []

    const date = new Date(dateStr)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString()
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString()

    const res = await cloud.queryByDateRange('records',
      { familyId, babyId },
      'recordTime',
      dayStart, dayEnd,
      { pageSize: 100 }
    )

    return res.success ? res.data : []
  },

  _buildSummary(records) {
    const stats = { feeding: 0, diaper: 0, sleepMinutes: 0, totalVolume: 0, mood: 0, food: 0, health: 0 }

    records.forEach(r => {
      if (stats[r.type] !== undefined) stats[r.type]++
      if (r.type === 'feeding' && r.data && r.data.volume) stats.totalVolume += r.data.volume
      if (r.type === 'sleep' && r.data && r.data.duration) stats.sleepMinutes += r.data.duration
    })

    const summary = [
      { type: 'feeding', icon: '🍼', value: stats.feeding, label: `喂奶 ${stats.totalVolume}ml`, color: '#FF8C6B' },
      { type: 'diaper', icon: '🧷', value: stats.diaper, label: '换尿布', color: '#4ECDC4' },
      { type: 'sleep', icon: '🌙', value: parseFloat((stats.sleepMinutes / 60).toFixed(1)), label: '睡眠(h)', color: '#7C83FD' },
      { type: 'mood', icon: '😊', value: stats.mood, label: '情绪', color: '#BFA000' },
      { type: 'food', icon: '🥣', value: stats.food, label: '辅食', color: '#95E1D3' },
      { type: 'health', icon: '💊', value: stats.health, label: '健康', color: '#FF6B6B' }
    ].filter(s => s.value > 0)

    this.setData({ summary })
  },

  _buildComparison(todayRecords, yesterdayRecords) {
    const calcStats = (records) => {
      const s = { feeding: 0, diaper: 0, sleepMin: 0, volume: 0 }
      records.forEach(r => {
        s[r.type] = (s[r.type] || 0) + 1
        if (r.type === 'feeding' && r.data && r.data.volume) s.volume += r.data.volume
        if (r.type === 'sleep' && r.data && r.data.duration) s.sleepMin += r.data.duration
      })
      return s
    }

    const today = calcStats(todayRecords)
    const yesterday = calcStats(yesterdayRecords)

    const items = [
      { label: '喂奶次数', today: today.feeding, yesterday: yesterday.feeding, unit: '次' },
      { label: '奶量', today: today.volume, yesterday: yesterday.volume, unit: 'ml' },
      { label: '换尿布', today: today.diaper, yesterday: yesterday.diaper, unit: '次' },
      { label: '睡眠', today: Math.round(today.sleepMin / 6) / 10, yesterday: Math.round(yesterday.sleepMin / 6) / 10, unit: 'h' }
    ].filter(item => item.today > 0 || item.yesterday > 0)

    const comparison = items.map(item => {
      const diff = item.today - item.yesterday
      return {
        label: item.label,
        today: `${item.today}${item.unit}`,
        diff: diff,
        diffText: diff === 0 ? '持平' : `${Math.abs(diff)}${item.unit}`
      }
    })

    this.setData({ comparison })
  },

  _buildAlertsAndSuggestions(records) {
    const alerts = []
    const suggestions = []
    const feedingRecords = records.filter(r => r.type === 'feeding')

    if (feedingRecords.length >= 2) {
      const sorted = feedingRecords.sort((a, b) => new Date(a.createTime) - new Date(b.createTime))
      for (let i = 1; i < sorted.length; i++) {
        const gap = new Date(sorted[i].createTime) - new Date(sorted[i - 1].createTime)
        if (gap > ALERT_THRESHOLDS.FEEDING_INTERVAL) {
          const hours = Math.round(gap / (60 * 60 * 1000) * 10) / 10
          alerts.push(`两次喂奶间隔超过${hours}小时，请关注宝宝进食情况`)
          break
        }
      }
    }

    records.filter(r => r.type === 'health' && r.data && r.data.subType === 'temperature').forEach(r => {
      if (r.data.temperature >= ALERT_THRESHOLDS.HIGH_TEMPERATURE) {
        alerts.push(`体温${r.data.temperature}℃偏高，建议持续关注`)
      }
    })

    const feedingCount = feedingRecords.length
    if (feedingCount > 0 && feedingCount < 6) {
      suggestions.push(`今日喂奶${feedingCount}次，一般新生儿每天需喂8-12次，请留意是否足够`)
    }
    if (feedingCount === 0 && records.length > 0) {
      alerts.push('今日尚未记录喂奶！')
    }

    const sleepRecords = records.filter(r => r.type === 'sleep')
    const totalSleepMin = sleepRecords.reduce((sum, r) => sum + (r.data && r.data.duration ? r.data.duration : 0), 0)
    if (totalSleepMin > 0) {
      const sleepHours = (totalSleepMin / 60).toFixed(1)
      suggestions.push(`今日睡眠${sleepHours}小时`)
      if (totalSleepMin < 8 * 60) {
        suggestions.push('睡眠时间偏少，注意观察宝宝状态')
      }
    }

    if (alerts.length === 0 && suggestions.length === 0) {
      suggestions.push('今日各项指标正常，宝宝表现不错！')
    }

    this.setData({ alerts, suggestions })
  },

  async _loadTrend() {
    // 根据选择的时间范围构建日期列表
    const days = []
    const dayCount = this.data.timeRange
    for (let i = dayCount - 1; i >= 0; i--) {
      const d = new Date(this.data.currentDate)
      d.setDate(d.getDate() - i)
      days.push({
        dateStr: this._dateToStr(d),
        label: `${d.getMonth() + 1}/${d.getDate()}`
      })
    }

    // 并行请求（Promise.all 替代顺序 await，7次→同时发出）
    const allRecords = await Promise.all(
      days.map(day => this._getRecordsForDate(day.dateStr))
    )

    const labels = []
    const feeding = []
    const sleep = []
    const diaper = []

    days.forEach((day, idx) => {
      const records = allRecords[idx] || []
      let feedCount = 0, sleepMin = 0, diaperCount = 0
      records.forEach(r => {
        if (r.type === 'feeding') feedCount++
        if (r.type === 'sleep' && r.data && r.data.duration) sleepMin += r.data.duration
        if (r.type === 'diaper') diaperCount++
      })
      labels.push(day.label)
      feeding.push({ label: day.label, value: feedCount })
      sleep.push({ label: day.label, value: Math.round(sleepMin / 6) / 10 })
      diaper.push({ label: day.label, value: diaperCount })
    })

    this.setData({
      trendData: { feeding, sleep, diaper },
      trendLabels: labels
    })
  },

  _dateToStr(date) {
    const y = date.getFullYear()
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const d = date.getDate().toString().padStart(2, '0')
    return `${y}-${m}-${d}`
  },

  // 生成报告长图
  async generateReportImage() {
    const baby = app.globalData.currentBaby
    const family = app.globalData.currentFamily
    if (!baby || !family) {
      wx.showToast({ title: '无法生成报告', icon: 'none' })
      return
    }

    wx.showLoading({ title: '生成图片中...' })

    try {
      // 精确计算Canvas高度
      const MARGIN = 30
      const TITLE_HEIGHT = 150
      const SECTION_GAP = 40
      const SUMMARY_CARD_HEIGHT = 180
      const TREND_SECTION_HEIGHT = 100
      const COMPARISON_ITEM_HEIGHT = 60
      const ALERT_ITEM_HEIGHT = 50
      const SUGGESTION_ITEM_HEIGHT = 50
      const FOOTER_HEIGHT = 80

      let y = MARGIN

      // 1. 日期标题
      y += TITLE_HEIGHT

      // 2. 摘要卡片
      if (this.data.summary.length > 0) {
        y += SECTION_GAP
        y += SUMMARY_CARD_HEIGHT
      }

      // 3. 趋势数据
      if (this.data.trendData.feeding.length > 0) {
        y += SECTION_GAP
        y += TREND_SECTION_HEIGHT
      }

      if (this.data.trendData.sleep.length > 0) {
        y += SECTION_GAP
        y += TREND_SECTION_HEIGHT
      }

      if (this.data.trendData.diaper.length > 0) {
        y += SECTION_GAP
        y += TREND_SECTION_HEIGHT
      }

      // 4. 对比
      if (this.data.comparison.length > 0) {
        y += SECTION_GAP
        y += 40
        y += this.data.comparison.length * COMPARISON_ITEM_HEIGHT
      }

      // 5. 异常
      if (this.data.alerts.length > 0) {
        y += SECTION_GAP
        y += 40
        y += this.data.alerts.length * ALERT_ITEM_HEIGHT
      }

      // 6. 建议
      if (this.data.suggestions.length > 0) {
        y += SECTION_GAP
        y += 40
        y += this.data.suggestions.length * SUGGESTION_ITEM_HEIGHT
      }

      // 7. 底部
      y += SECTION_GAP
      y += FOOTER_HEIGHT

      const canvasHeight = y + MARGIN
      this.setData({ canvasHeight })

      // 创建Canvas 2D上下文
      const query = wx.createSelectorQuery().in(this)
      query.select('#reportCanvas')
        .fields({ node: true, size: true })
        .exec(async (res) => {
          if (!res[0]) {
            wx.hideLoading()
            wx.showToast({ title: 'Canvas初始化失败', icon: 'none' })
            return
          }

          const canvas = res[0].node
          const ctx = canvas.getContext('2d')

          // 设置Canvas尺寸
          const dpr = wx.getSystemInfoSync().pixelRatio
          canvas.width = this.data.canvasWidth * dpr
          canvas.height = canvasHeight * dpr
          ctx.scale(dpr, dpr)

          // 绘制白色背景
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, this.data.canvasWidth, canvasHeight)

          y = MARGIN
          const centerX = this.data.canvasWidth / 2

          // 绘制日期标题
          ctx.fillStyle = '#333333'
          ctx.font = 'bold 40px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(`${baby.name}的每日报告`, centerX, y + 50)
          y += 60
          ctx.fillStyle = '#666666'
          ctx.font = '28px sans-serif'
          ctx.fillText(`${this.data.displayDate} ${this.data.weekdayText}`, centerX, y)
          y += 40

          // 绘制分隔线
          ctx.strokeStyle = '#EEEEEE'
          ctx.lineWidth = 2
          ctx.beginPath()
          ctx.moveTo(MARGIN, y)
          ctx.lineTo(this.data.canvasWidth - MARGIN, y)
          ctx.stroke()

          // 绘制摘要卡片
          if (this.data.summary.length > 0) {
            y += SECTION_GAP
            const cardWidth = (this.data.canvasWidth - MARGIN * 2 - 20) / 3
            this.data.summary.forEach((item, idx) => {
              const x = MARGIN + idx * (cardWidth + 10)

              // 绘制卡片背景（渐变色）
              const gradient = ctx.createLinearGradient(x, y, x, y + SUMMARY_CARD_HEIGHT)
              gradient.addColorStop(0, item.color)
              gradient.addColorStop(1, this._lightenColor(item.color, 20))
              ctx.fillStyle = gradient
              ctx.beginPath()
              ctx.roundRect(x, y, cardWidth, SUMMARY_CARD_HEIGHT, 12)
              ctx.fill()

              // 绘制图标
              ctx.fillStyle = '#FFFFFF'
              ctx.font = '50px sans-serif'
              ctx.textAlign = 'center'
              ctx.fillText(item.icon, x + cardWidth / 2, y + 65)

              // 绘制数值（确保数字显示正确）
              ctx.font = 'bold 36px sans-serif'
              let valueText = item.value.toString()
              // 检查是否是数字0
              if (item.value === 0) valueText = '0'
              ctx.fillText(valueText, x + cardWidth / 2, y + 115)

              // 绘制标签
              ctx.font = '24px sans-serif'
              ctx.fillText(item.label, x + cardWidth / 2, y + 155)
            })
            y += SUMMARY_CARD_HEIGHT + 20
          }

          // 绘制趋势数据
          const drawTrendSection = (title, data, unit) => {
            y += SECTION_GAP
            ctx.fillStyle = '#333333'
            ctx.font = 'bold 32px sans-serif'
            ctx.textAlign = 'left'
            ctx.fillText(title, MARGIN, y + 35)
            y += 50

            const trendText = data.map(d => `${d.label}: ${d.value}${unit}`).join('  |  ')
            ctx.fillStyle = '#666666'
            ctx.font = '24px sans-serif'
            ctx.fillText(trendText, MARGIN, y + 30)
            y += 40
          }

          if (this.data.trendData.feeding.length > 0) {
            drawTrendSection('近7天喂奶次数', this.data.trendData.feeding, '次')
          }

          if (this.data.trendData.sleep.length > 0) {
            drawTrendSection('近7天睡眠时长', this.data.trendData.sleep, 'h')
          }

          if (this.data.trendData.diaper.length > 0) {
            drawTrendSection('近7天换尿布次数', this.data.trendData.diaper, '次')
          }

          // 绘制对比
          if (this.data.comparison.length > 0) {
            y += SECTION_GAP
            ctx.fillStyle = '#333333'
            ctx.font = 'bold 32px sans-serif'
            ctx.fillText('与前一天对比', MARGIN, y + 35)
            y += 50

            this.data.comparison.forEach(item => {
              ctx.fillStyle = '#666666'
              ctx.font = '28px sans-serif'
              ctx.textAlign = 'left'
              ctx.fillText(item.label, MARGIN, y + 30)
              ctx.textAlign = 'right'
              ctx.fillText(item.today, this.data.canvasWidth - MARGIN, y + 30)
              y += COMPARISON_ITEM_HEIGHT
            })
          }

          // 绘制异常
          if (this.data.alerts.length > 0) {
            y += SECTION_GAP
            ctx.fillStyle = '#FF6B6B'
            ctx.font = 'bold 32px sans-serif'
            ctx.textAlign = 'left'
            ctx.fillText('⚠️ 异常提醒', MARGIN, y + 35)
            y += 50

            this.data.alerts.forEach(item => {
              ctx.fillStyle = '#666666'
              ctx.font = '26px sans-serif'
              ctx.fillText(`• ${item}`, MARGIN + 20, y + 30)
              y += ALERT_ITEM_HEIGHT
            })
          }

          // 绘制建议
          if (this.data.suggestions.length > 0) {
            y += SECTION_GAP
            ctx.fillStyle = '#333333'
            ctx.font = 'bold 32px sans-serif'
            ctx.fillText('💡 观察 & 建议', MARGIN, y + 35)
            y += 50

            this.data.suggestions.forEach(item => {
              ctx.fillStyle = '#666666'
              ctx.font = '26px sans-serif'
              ctx.fillText(`• ${item}`, MARGIN + 20, y + 30)
              y += SUGGESTION_ITEM_HEIGHT
            })
          }

          // 绘制底部
          y += SECTION_GAP
          ctx.fillStyle = '#999999'
          ctx.font = '22px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('宝贝日记 - 家庭协作养娃记录工具', centerX, y + 40)

          // 导出图片
          wx.canvasToTempFilePath({
            canvas: canvas,
            x: 0,
            y: 0,
            width: this.data.canvasWidth,
            height: canvasHeight,
            destWidth: this.data.canvasWidth * dpr,
            destHeight: canvasHeight * dpr,
            success: (res) => {
              // 保存图片到相册
              wx.saveImageToPhotosAlbum({
                filePath: res.tempFilePath,
                success: () => {
                  wx.hideLoading()

                  // 导出模式下直接返回，普通模式下显示弹窗
                  if (this.data.exportMode) {
                    wx.showToast({
                      title: '已保存到相册',
                      icon: 'success',
                      duration: 2000
                    })
                    // 导出模式下返回上一页
                    setTimeout(() => {
                      wx.navigateBack()
                    }, 1500)
                  } else {
                    wx.showModal({
                      title: '图片已保存',
                      content: '报告图片已保存到相册，可直接分享给家人',
                      showCancel: false
                    })
                  }
                },
                fail: () => {
                  wx.hideLoading()
                  wx.showModal({
                    title: '保存失败',
                    content: '请开启相册权限后再试',
                    showCancel: false
                  })
                }
              })
            },
            fail: (err) => {
              wx.hideLoading()
              console.error('生成图片失败:', err)
              wx.showToast({ title: '生成图片失败', icon: 'none' })
            }
          })
        })
    } catch (err) {
      wx.hideLoading()
      console.error('生成报告图片失败:', err)
      wx.showToast({ title: '生成图片失败', icon: 'none' })
    }
  },

  // 辅助函数：调整颜色亮度
  _lightenColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16)
    const amt = Math.round(2.55 * percent)
    const R = (num >> 16) + amt
    const G = (num >> 8 & 0x00FF) + amt
    const B = (num & 0x0000FF) + amt
    return '#' + (0x1000000 +
      (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)
    ).toString(16).slice(1)
  },

  onShareAppMessage() {
    const baby = app.globalData.currentBaby
    const family = app.globalData.currentFamily
    const familyId = family ? family._id : ''
    const babyId = baby ? baby._id : ''
    return {
      title: `${baby ? baby.name : '宝宝'}的每日报告 - ${this.data.displayDate}`,
      path: `/pages/report/report?f=${familyId}&b=${babyId}&d=${this.data.currentDate}`
    }
  }
})
