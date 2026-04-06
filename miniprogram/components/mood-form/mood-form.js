// components/mood-form/mood-form.js
const { MOOD_TYPES, MOOD_REASONS, SOOTHE_METHODS } = require('../../utils/constants')

Component({
  properties: { defaultData: { type: Object, value: {} } },
  data: {
    moodTypes: Object.values(MOOD_TYPES),
    moodType: '',
    reasons: MOOD_REASONS.map(r => ({ ...r, _selected: false })),
    sootheMethods: SOOTHE_METHODS,
    sootheMethod: '',
    duration: ''
  },
  lifetimes: {
    attached() {
      if (this.properties.defaultData) {
        const d = this.properties.defaultData
        const selectedArr = d.reasons || []
        this.setData({
          moodType: d.moodType || '',
          reasons: MOOD_REASONS.map(r => ({ ...r, _selected: selectedArr.indexOf(r.value) >= 0 })),
          sootheMethod: d.sootheMethod || '',
          duration: d.duration || ''
        })
      }
    }
  },
  methods: {
    selectMood(e) { this.setData({ moodType: e.currentTarget.dataset.val }); this._emitChange() },
    toggleReason(e) {
      const val = e.currentTarget.dataset.val
      const reasons = this.data.reasons.map(r => ({
        ...r,
        _selected: r.value === val ? !r._selected : r._selected
      }))
      this.setData({ reasons })
      this._emitChange()
    },
    selectSoothe(e) { this.setData({ sootheMethod: e.currentTarget.dataset.val }); this._emitChange() },
    onDurationInput(e) { this.setData({ duration: e.detail.value }); this._emitChange() },
    _emitChange() {
      this.triggerEvent('change', this.getData())
    },
    getData() {
      const selectedReasons = this.data.reasons.filter(r => r._selected).map(r => r.value)
      return {
        moodType: this.data.moodType,
        reasons: selectedReasons,
        sootheMethod: this.data.sootheMethod,
        duration: parseInt(this.data.duration) || 0
      }
    },
    validate() {
      if (!this.data.moodType) return { valid: false, message: '请选择情绪状态' }
      return { valid: true }
    }
  }
})
