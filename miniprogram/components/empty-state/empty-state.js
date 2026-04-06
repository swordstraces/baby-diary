// components/empty-state/empty-state.js
Component({
  properties: {
    message: { type: String, value: '暂无数据' },
    emoji: { type: String, value: '👶' },
    actionText: { type: String, value: '' }
  },
  methods: {
    onAction() {
      this.triggerEvent('action')
    }
  }
})
