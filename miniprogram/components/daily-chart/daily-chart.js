// components/daily-chart/daily-chart.js
// 使用 Canvas 2D API 绘制简易折线图

Component({
  properties: {
    title: { type: String, value: '' },
    data: { type: Array, value: [] },     // [{ label, value }]
    color: { type: String, value: '#FF8C6B' },
    height: { type: Number, value: 300 },
    labels: { type: Array, value: [] }
  },
  data: {
    canvasId: ''
  },
  lifetimes: {
    attached() {
      this.setData({
        canvasId: 'chart_' + Math.random().toString(36).substr(2, 8)
      })
    },
    detached() {
      if (this._drawTimer) {
        clearTimeout(this._drawTimer)
        this._drawTimer = null
      }
    }
  },
  observers: {
    'data': function(data) {
      if (data && data.length > 0) {
        if (this._drawTimer) clearTimeout(this._drawTimer)
        this._drawTimer = setTimeout(() => {
          this._drawTimer = null
          this._draw()
        }, 300)
      }
    }
  },
  methods: {
    _draw() {
      const data = this.data.data
      if (!data || data.length === 0) return

      const query = this.createSelectorQuery()
      query.select(`#${this.data.canvasId}`)
        .fields({ node: true, size: true })
        .exec((res) => {
          if (!res[0]) return
          const canvas = res[0].node
          const ctx = canvas.getContext('2d')
          let dpr = 1
          try {
            dpr = wx.getWindowInfo ? wx.getWindowInfo().pixelRatio : (wx.getSystemInfoSync ? wx.getSystemInfoSync().pixelRatio : 1)
          } catch (e) {
            console.warn('获取 windowInfo 失败:', e)
          }
          const width = res[0].width
          const height = res[0].height

          canvas.width = width * dpr
          canvas.height = height * dpr
          ctx.scale(dpr, dpr)

          const values = data.map(d => d.value)
          const maxVal = Math.max(...values, 1)
          const minVal = Math.min(...values, 0)
          const range = maxVal - minVal || 1

          const padding = { top: 20, right: 20, bottom: 20, left: 20 }
          const chartW = width - padding.left - padding.right
          const chartH = height - padding.top - padding.bottom

          // 绘制渐变填充
          const gradient = ctx.createLinearGradient(0, padding.top, 0, height - padding.bottom)
          gradient.addColorStop(0, this.data.color + '33')
          gradient.addColorStop(1, this.data.color + '05')

          const points = data.map((d, i) => ({
            x: padding.left + (chartW / Math.max(data.length - 1, 1)) * i,
            y: padding.top + chartH - ((d.value - minVal) / range) * chartH
          }))

          // 填充区域
          ctx.beginPath()
          ctx.moveTo(points[0].x, height - padding.bottom)
          points.forEach(p => ctx.lineTo(p.x, p.y))
          ctx.lineTo(points[points.length - 1].x, height - padding.bottom)
          ctx.closePath()
          ctx.fillStyle = gradient
          ctx.fill()

          // 绘制线条
          ctx.beginPath()
          ctx.moveTo(points[0].x, points[0].y)
          for (let i = 1; i < points.length; i++) {
            ctx.lineTo(points[i].x, points[i].y)
          }
          ctx.strokeStyle = this.data.color
          ctx.lineWidth = 2
          ctx.lineJoin = 'round'
          ctx.stroke()

          // 根据数据点数量自适应显示策略
          const isDense = data.length > 10  // 超过10个数据点认为是密集模式

          // 密集模式：只画曲线，不画数据点和数值标签
          if (!isDense) {
            // 稀疏模式（7天）：显示数据点和数值标签
            points.forEach(p => {
              ctx.beginPath()
              ctx.arc(p.x, p.y, 6, 0, Math.PI * 2)
              ctx.fillStyle = '#fff'
              ctx.fill()
              ctx.strokeStyle = this.data.color
              ctx.lineWidth = 3
              ctx.stroke()
            })

            // 绘制数值标签
            ctx.fillStyle = this.data.color
            ctx.font = 'bold 14px sans-serif'
            ctx.textAlign = 'center'
            points.forEach((p, i) => {
              ctx.fillText(values[i].toString(), p.x, p.y - 12)
            })
          }
        })
    }
  }
})
