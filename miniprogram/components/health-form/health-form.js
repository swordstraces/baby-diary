// components/health-form/health-form.js
const { HEALTH_SUB_TYPES, ALERT_THRESHOLDS } = require('../../utils/constants')

Component({
  properties: {
    defaultData: { type: Object, value: {} }
  },
  data: {
    subType: 'temperature',
    subTypes: [
      { ...HEALTH_SUB_TYPES.TEMPERATURE, emoji: '🌡️' },
      { ...HEALTH_SUB_TYPES.MEDICINE, emoji: '💊' },
      { ...HEALTH_SUB_TYPES.VACCINE, emoji: '💉' },
      { ...HEALTH_SUB_TYPES.WEIGHT, emoji: '⚖️' },
      { ...HEALTH_SUB_TYPES.HEIGHT, emoji: '📏' },
      { ...HEALTH_SUB_TYPES.HEAD, emoji: '🧠' }
    ],

    // 体温相关
    temperature: '',
    tempStatus: '',
    tempStatusText: '',
    measurePos: 'armpit',
    measurePositions: [
      { label: '腋下', value: 'armpit' },
      { label: '口腔', value: 'oral' },
      { label: '耳温', value: 'ear' },
      { label: '额头', value: 'forehead' },
      { label: '肛温', value: 'rectal' }
    ],
    quickTemps: ['36.0', '36.5', '37.0', '37.5', '38.0', '38.5', '39.0'],

    // 用药相关
    medicineName: '',
    medicineDose: '',
    doseUnit: 'ml',

    // 疫苗相关
    vaccineName: '',
    injectPos: 'left_arm',
    injectPositions: [
      { label: '左上臂', value: 'left_arm' },
      { label: '右上臂', value: 'right_arm' },
      { label: '左大腿', value: 'left_leg' },
      { label: '右大腿', value: 'right_leg' },
      { label: '臀部', value: 'hip' }
    ],
    reactions: [
      { label: '无反应', value: 'none', _selected: false },
      { label: '红肿', value: 'redness', _selected: false },
      { label: '发热', value: 'fever', _selected: false },
      { label: '哭闹', value: 'crying', _selected: false },
      { label: '嗜睡', value: 'drowsy', _selected: false },
      { label: '食欲下降', value: 'appetite_loss', _selected: false },
      { label: '皮疹', value: 'rash', _selected: false }
    ],

    // 体重相关
    weight: '',
    quickWeights: ['3.0', '3.5', '4.0', '4.5', '5.0', '5.5', '6.0', '7.0', '8.0', '9.0', '10.0'],

    // 身高相关
    height: '',
    quickHeights: ['50', '55', '60', '65', '70', '75', '80', '85', '90', '95', '100'],

    // 头围相关
    headCircumference: '',
    quickHeads: ['33', '34', '35', '36', '37', '38', '39', '40', '42', '44', '46']
  },
  lifetimes: {
    attached() {
      if (this.properties.defaultData) {
        const d = this.properties.defaultData
        this.setData({
          subType: d.subType || 'temperature',
          temperature: d.temperature || '',
          measurePos: d.measurePos || 'armpit',
          medicineName: d.medicineName || '',
          medicineDose: d.medicineDose || '',
          doseUnit: d.doseUnit || 'ml',
          vaccineName: d.vaccineName || '',
          injectPos: d.injectPos || 'left_arm',
          weight: d.weight || '',
          height: d.height || '',
          headCircumference: d.headCircumference || ''
        })
        // 恢复 reactions 选中状态
        if (d.reactions && d.reactions.length > 0) {
          const reactions = this.data.reactions.map(r => ({
            ...r,
            _selected: d.reactions.indexOf(r.value) >= 0
          }))
          this.setData({ reactions })
        }
        if (d.temperature) this._updateTempStatus(parseFloat(d.temperature))
      }
    }
  },
  methods: {
    // 子类型切换
    selectSubType(e) {
      this.setData({ subType: e.currentTarget.dataset.val })
      this._emitChange()
    },

    // === 体温 ===
    adjustTemp(e) {
      const delta = parseFloat(e.currentTarget.dataset.delta)
      let val = parseFloat(this.data.temperature) || 36.5
      val = Math.round((val + delta) * 10) / 10
      val = Math.max(35.0, Math.min(42.0, val))
      this.setData({ temperature: val.toFixed(1) })
      this._updateTempStatus(val)
      this._emitChange()
    },

    setTemp(e) {
      const val = parseFloat(e.currentTarget.dataset.val)
      this.setData({ temperature: val.toFixed(1) })
      this._updateTempStatus(val)
      this._emitChange()
    },

    _updateTempStatus(val) {
      let status = 'normal'
      let text = '体温正常'
      if (val >= ALERT_THRESHOLDS.HIGH_TEMPERATURE) {
        status = 'high'
        text = '体温偏高，请注意观察'
      } else if (val < ALERT_THRESHOLDS.LOW_TEMPERATURE) {
        status = 'low'
        text = '体温偏低，请注意保暖'
      }
      this.setData({ tempStatus: status, tempStatusText: text })
    },

    selectMeasurePos(e) {
      this.setData({ measurePos: e.currentTarget.dataset.val })
      this._emitChange()
    },

    // === 用药 ===
    onMedicineNameInput(e) {
      this.setData({ medicineName: e.detail.value })
      this._emitChange()
    },

    onMedicineDoseInput(e) {
      this.setData({ medicineDose: e.detail.value })
      this._emitChange()
    },

    setDoseUnit(e) {
      this.setData({ doseUnit: e.currentTarget.dataset.val })
      this._emitChange()
    },

    // === 疫苗 ===
    onVaccineNameInput(e) {
      this.setData({ vaccineName: e.detail.value })
      this._emitChange()
    },

    selectInjectPos(e) {
      this.setData({ injectPos: e.currentTarget.dataset.val })
      this._emitChange()
    },

    toggleReaction(e) {
      const val = e.currentTarget.dataset.val
      let reactions = this.data.reactions.map(r => ({ ...r }))

      if (val === 'none') {
        // "无反应"与其他互斥
        const noneItem = reactions.find(r => r.value === 'none')
        const wasNoneSelected = noneItem._selected
        reactions = reactions.map(r => ({ ...r, _selected: false }))
        if (!wasNoneSelected) {
          reactions.find(r => r.value === 'none')._selected = true
        }
      } else {
        // 先取消"无反应"
        const noneItem = reactions.find(r => r.value === 'none')
        if (noneItem) noneItem._selected = false
        // 翻转当前项
        const target = reactions.find(r => r.value === val)
        if (target) target._selected = !target._selected
      }

      this.setData({ reactions })
      this._emitChange()
    },

    // === 体重 ===
    adjustWeight(e) {
      const delta = parseFloat(e.currentTarget.dataset.delta)
      let val = parseFloat(this.data.weight) || 3.0
      val = Math.round((val + delta) * 10) / 10
      val = Math.max(0.5, Math.min(30.0, val))
      this.setData({ weight: val.toFixed(1) })
      this._emitChange()
    },

    setWeight(e) {
      const val = parseFloat(e.currentTarget.dataset.val)
      this.setData({ weight: val.toFixed(1) })
      this._emitChange()
    },

    // === 身高 ===
    adjustHeight(e) {
      const delta = parseFloat(e.currentTarget.dataset.delta)
      let val = parseFloat(this.data.height) || 50
      val = Math.round(val + delta)
      val = Math.max(30, Math.min(130, val))
      this.setData({ height: val.toString() })
      this._emitChange()
    },

    setHeight(e) {
      const val = parseFloat(e.currentTarget.dataset.val)
      this.setData({ height: val.toString() })
      this._emitChange()
    },

    // === 头围 ===
    adjustHead(e) {
      const delta = parseFloat(e.currentTarget.dataset.delta)
      let val = parseFloat(this.data.headCircumference) || 35
      val = Math.round((val + delta) * 10) / 10
      val = Math.max(25, Math.min(60, val))
      this.setData({ headCircumference: val.toFixed(1) })
      this._emitChange()
    },

    setHead(e) {
      const val = parseFloat(e.currentTarget.dataset.val)
      this.setData({ headCircumference: val.toFixed(1) })
      this._emitChange()
    },

    _emitChange() {
      this.triggerEvent('change', this.getData())
    },

    getData() {
      const base = { subType: this.data.subType }
      switch (this.data.subType) {
        case 'temperature':
          return { ...base, temperature: parseFloat(this.data.temperature) || 0, measurePos: this.data.measurePos }
        case 'medicine':
          return { ...base, medicineName: this.data.medicineName, medicineDose: this.data.medicineDose, doseUnit: this.data.doseUnit }
        case 'vaccine':
          return { ...base, vaccineName: this.data.vaccineName, injectPos: this.data.injectPos, reactions: this.data.reactions.filter(r => r._selected).map(r => r.value) }
        case 'weight':
          return { ...base, weight: parseFloat(this.data.weight) || 0 }
        case 'height':
          return { ...base, height: parseFloat(this.data.height) || 0 }
        case 'headCircumference':
          return { ...base, headCircumference: parseFloat(this.data.headCircumference) || 0 }
        default:
          return base
      }
    },

    validate() {
      switch (this.data.subType) {
        case 'temperature':
          if (!this.data.temperature) return { valid: false, message: '请记录体温' }
          break
        case 'medicine':
          if (!this.data.medicineName.trim()) return { valid: false, message: '请输入药物名称' }
          if (!this.data.medicineDose) return { valid: false, message: '请输入剂量' }
          break
        case 'vaccine':
          if (!this.data.vaccineName.trim()) return { valid: false, message: '请输入疫苗名称' }
          break
        case 'weight':
          if (!this.data.weight) return { valid: false, message: '请记录体重' }
          break
        case 'height':
          if (!this.data.height) return { valid: false, message: '请记录身高' }
          break
        case 'headCircumference':
          if (!this.data.headCircumference) return { valid: false, message: '请记录头围' }
          break
      }
      return { valid: true }
    }
  }
})
