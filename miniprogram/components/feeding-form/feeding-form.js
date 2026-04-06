// components/feeding-form/feeding-form.js
Component({
  properties: {
    defaultData: { type: Object, value: {} }
  },

  data: {
    method: '',       // breast_left / breast_right / breast_both / bottle
    volume: '',       // ml（奶瓶模式）
    duration: ''      // 分钟（母乳模式）
  },

  lifetimes: {
    attached() {
      if (this.properties.defaultData) {
        const d = this.properties.defaultData
        this.setData({
          method: d.method || '',
          volume: d.volume || '',
          duration: d.duration || ''
        })
      }
    }
  },

  methods: {
    selectMethod(e) {
      this.setData({ method: e.currentTarget.dataset.method })
      this._emitChange()
    },

    onVolumeInput(e) {
      this.setData({ volume: e.detail.value })
      this._emitChange()
    },

    onDurationInput(e) {
      this.setData({ duration: e.detail.value })
      this._emitChange()
    },

    adjustVolume(e) {
      const delta = parseInt(e.currentTarget.dataset.delta)
      let vol = parseInt(this.data.volume) || 0
      vol = Math.max(0, vol + delta)
      this.setData({ volume: String(vol) })
      this._emitChange()
    },

    adjustDuration(e) {
      const delta = parseInt(e.currentTarget.dataset.delta)
      let dur = parseInt(this.data.duration) || 0
      dur = Math.max(0, dur + delta)
      this.setData({ duration: String(dur) })
      this._emitChange()
    },

    setVolume(e) {
      this.setData({ volume: e.currentTarget.dataset.val })
      this._emitChange()
    },

    setDuration(e) {
      this.setData({ duration: e.currentTarget.dataset.val })
      this._emitChange()
    },

    _emitChange() {
      this.triggerEvent('change', {
        method: this.data.method,
        volume: parseInt(this.data.volume) || 0,
        duration: parseInt(this.data.duration) || 0
      })
    },

    /**
     * 获取当前表单数据（供父页面调用）
     */
    getData() {
      return {
        method: this.data.method,
        volume: parseInt(this.data.volume) || 0,
        duration: parseInt(this.data.duration) || 0
      }
    },

    /**
     * 校验表单
     */
    validate() {
      if (!this.data.method) {
        return { valid: false, message: '请选择喂养方式' }
      }
      if (this.data.method === 'bottle' && !this.data.volume) {
        return { valid: false, message: '请输入奶量' }
      }
      return { valid: true }
    }
  }
})
