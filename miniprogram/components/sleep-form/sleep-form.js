// components/sleep-form/sleep-form.js
const { SLEEP_QUALITY } = require('../../utils/constants')
const { createISODateTime, formatDate } = require('../../utils/util')

Component({
  properties: { defaultData: { type: Object, value: {} } },
  data: {
    sleepMode: 'start',
    startTime: '',
    endTime: '',
    quality: '',
    sleepQuality: Object.values(SLEEP_QUALITY)
  },
  lifetimes: {
    attached() {
      if (this.properties.defaultData) {
        const d = this.properties.defaultData
        this.setData({ sleepMode: d.sleepMode || d.mode || 'start', startTime: d.startTime || '', endTime: d.endTime || '', quality: d.quality || '' })
      }
    }
  },
  methods: {
    setMode(e) { this.setData({ sleepMode: e.currentTarget.dataset.mode }); this._emitChange() },
    setQuality(e) { this.setData({ quality: e.currentTarget.dataset.val }); this._emitChange() },
    onStartTimeChange(e) { this.setData({ startTime: e.detail.value }); this._emitChange() },
    onEndTimeChange(e) { this.setData({ endTime: e.detail.value }); this._emitChange() },
    _emitChange() { this.triggerEvent('change', this.getData()) },
    getData() {
      const now = new Date()
      const today = formatDate(now)
      const startISO = this.data.sleepMode === 'both' && this.data.startTime
        ? createISODateTime(today, this.data.startTime)
        : now.toISOString()
      const endISO = this.data.sleepMode === 'both' && this.data.endTime
        ? createISODateTime(today, this.data.endTime)
        : null
      // 计算 duration（分钟）
      let duration = 0
      if (startISO && endISO) {
        duration = Math.round((new Date(endISO) - new Date(startISO)) / 60000)
      }
      return {
        sleepMode: this.data.sleepMode,
        startTime: startISO,
        endTime: endISO,
        duration,
        quality: this.data.quality
      }
    },
    validate() {
      if (this.data.sleepMode === 'both' && (!this.data.startTime || !this.data.endTime)) {
        return { valid: false, message: '请选择入睡和醒来时间' }
      }
      return { valid: true }
    }
  }
})
