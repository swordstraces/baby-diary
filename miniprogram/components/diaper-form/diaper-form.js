// components/diaper-form/diaper-form.js
const { STOOL_COLORS } = require('../../utils/constants')

Component({
  properties: { defaultData: { type: Object, value: {} } },
  data: {
    diaperType: '', // wet / stool / both
    stoolColor: '',
    stoolColors: STOOL_COLORS
  },
  lifetimes: {
    attached() {
      if (this.properties.defaultData) {
        const d = this.properties.defaultData
        this.setData({ diaperType: d.diaperType || d.type || '', stoolColor: d.stoolColor || '' })
      }
    }
  },
  methods: {
    selectType(e) { this.setData({ diaperType: e.currentTarget.dataset.type }); this._emitChange() },
    selectColor(e) { this.setData({ stoolColor: e.currentTarget.dataset.value }); this._emitChange() },
    _emitChange() {
      this.triggerEvent('change', { diaperType: this.data.diaperType, stoolColor: this.data.stoolColor })
    },
    getData() {
      return { diaperType: this.data.diaperType, stoolColor: this.data.stoolColor }
    },
    validate() {
      if (!this.data.diaperType) return { valid: false, message: '请选择尿布类型' }
      return { valid: true }
    }
  }
})
