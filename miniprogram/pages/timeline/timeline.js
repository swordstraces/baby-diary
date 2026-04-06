// pages/timeline/timeline.js
const cloud = require('../../utils/cloud')
const { RECORD_TYPE_CONFIG } = require('../../utils/constants')
const app = getApp()

const WEEKDAYS = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']

Page({
  data: {
    currentDate: '',
    displayDate: '',
    weekdayText: '',
    records: [],
    filteredRecords: [],
    filterType: '',
    daySummary: [],
    hasMore: false,
    loading: false,
    page: 1,

    typeFilters: Object.keys(RECORD_TYPE_CONFIG).map(key => ({
      type: key,
      label: RECORD_TYPE_CONFIG[key].label,
      icon: RECORD_TYPE_CONFIG[key].icon
    }))
  },

  onLoad() {
    this._setDate(new Date())
    // 如果账户未就绪，注册回调以重新加载
    if (!app.globalData.currentFamily) {
      // 使用数组方式注册回调，避免覆盖其他页面的回调
      if (!app.accountReadyCallbacks) app.accountReadyCallbacks = []
      app.accountReadyCallbacks.push(() => {
        if (this.data.currentDate) {
          this._loadRecords()
        }
      })
    }
  },

  onShow() {
    if (app.globalData.currentFamily && this.data.currentDate) {
      this._loadRecords()
    }
  },

  // 记录删除事件
  onRecordDelete(e) {
    console.log('[timeline] 记录删除:', e.detail)
    // 删除成功后，重新加载记录
    this._loadRecords()
  },

  onPullDownRefresh() {
    this._loadRecords()
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

    this.setData({
      currentDate: dateStr,
      displayDate: isToday ? '今天' : `${m}月${d}日`,
      weekdayText: WEEKDAYS[date.getDay()],
      page: 1,
      records: []
    })
    this._loadRecords()
  },

  prevDay() {
    const d = new Date(this.data.currentDate)
    d.setDate(d.getDate() - 1)
    this._setDate(d)
  },

  nextDay() {
    const d = new Date(this.data.currentDate)
    d.setDate(d.getDate() + 1)
    const now = new Date()
    if (d > now) return
    this._setDate(d)
  },

  onDatePick(e) {
    const date = new Date(e.detail.value)
    if (!isNaN(date.getTime())) {
      this._setDate(date)
    }
  },

  setFilter(e) {
    const type = e.currentTarget.dataset.type
    this.setData({ filterType: type })
    this._applyFilter()
  },

  _applyFilter() {
    const { records, filterType } = this.data
    const filtered = filterType
      ? records.filter(r => r.type === filterType)
      : records
    this.setData({ filteredRecords: filtered })
  },

  // 加载记录
  async _loadRecords() {
    const familyId = app.globalData.currentFamily ? app.globalData.currentFamily._id : ''
    const babyId = app.globalData.currentBaby ? app.globalData.currentBaby._id : ''
    if (!familyId) return

    this.setData({ loading: true })

    const date = new Date(this.data.currentDate)
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString()
    const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString()

    try {
      const res = await cloud.queryByDateRange('records',
        { familyId, babyId },
        'recordTime',
        dayStart, dayEnd,
        { pageSize: 50, orderBy: 'recordTime', order: 'desc' }
      )

      if (res.success) {
        this.setData({
          records: res.data,
          hasMore: res.hasMore
        })
        this._applyFilter()
        this._buildDaySummary(res.data)
      }
    } catch (err) {
      console.error('加载记录失败:', err)
      wx.showToast({ title: '加载记录失败', icon: 'none' })
    } finally {
      this.setData({ loading: false })
    }
  },

  // 加载更多
  async loadMore() {
    if (this.data.loading || !this.data.hasMore) return
    this.setData({ loading: true, page: this.data.page + 1 })

    try {
      const familyId = app.globalData.currentFamily ? app.globalData.currentFamily._id : ''
      const babyId = app.globalData.currentBaby ? app.globalData.currentBaby._id : ''
      const date = new Date(this.data.currentDate)
      const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate()).toISOString()
      const dayEnd = new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1).toISOString()

      const res = await cloud.queryByDateRange('records',
        { familyId, babyId },
        'recordTime',
        dayStart, dayEnd,
        { page: this.data.page, pageSize: 20, orderBy: 'recordTime', order: 'desc' }
      )

      if (res.success) {
        this.setData({
          records: [...this.data.records, ...res.data],
          hasMore: res.hasMore
        })
        this._applyFilter()
      }
    } catch (err) {
      console.error('加载更多失败:', err)
    } finally {
      this.setData({ loading: false })
    }
  },

  _buildDaySummary(records) {
    const counts = {}
    let sleepMinutes = 0
    let totalVolume = 0

    records.forEach(r => {
      counts[r.type] = (counts[r.type] || 0) + 1
      if (r.type === 'sleep' && r.data && r.data.duration) {
        sleepMinutes += r.data.duration
      }
      if (r.type === 'feeding' && r.data && r.data.volume) {
        totalVolume += r.data.volume
      }
    })

    const summary = []
    if (counts.feeding) summary.push({ type: 'feeding', icon: '🍼', value: counts.feeding, unit: `次 · ${totalVolume}ml` })
    if (counts.diaper) summary.push({ type: 'diaper', icon: '🧷', value: counts.diaper, unit: '次' })
    if (sleepMinutes > 0) summary.push({ type: 'sleep', icon: '🌙', value: Math.round(sleepMinutes / 60 * 10) / 10, unit: '小时' })
    if (counts.mood) summary.push({ type: 'mood', icon: '😊', value: counts.mood, unit: '次' })

    this.setData({ daySummary: summary })
  }
})
