// components/record-card/record-card.js
const { cleanAvatarPath, resolveAvatarUrl } = require('../../utils/avatar')
const { RECORD_TYPE_CONFIG, FEEDING_METHODS, DIAPER_TYPES, SLEEP_QUALITY, MOOD_TYPES, FOOD_ACCEPTANCE, HEALTH_SUB_TYPES, STOOL_COLORS, IDENTITY_LABELS } = require('../../utils/constants')

Component({
  properties: {
    record: { type: Object, value: {} }
  },
  data: {
    config: {},
    displayTime: '',
    summary: '',
    displayOperatorName: '',
    avatarPlaceholder: '',
    cleanOperatorAvatar: ''  // 清理后的头像路径
  },
  observers: {
    'record': function(record) {
      if (!record || !record.type) return
      const config = RECORD_TYPE_CONFIG[record.type] || {}
      const displayTime = this._formatTimeStr(record.recordTime || record.createTime)
      const summary = this._summaryFromRecord(record)

      // 计算显示的操作者名称：优先使用身份标签（去掉 emoji），其次使用昵称
      let displayOperatorName = ''
      if (record.identity && IDENTITY_LABELS[record.identity]) {
        // 从 IDENTITY_LABELS 中去掉 emoji，只保留中文字符
        const fullLabel = IDENTITY_LABELS[record.identity]  // 如 "👨 爸爸"
        for (let i = 0; i < fullLabel.length; i++) {
          const char = fullLabel[i]
          if (char >= '\u4e00' && char <= '\u9fff') {
            displayOperatorName = fullLabel.substring(i)  // 从第一个中文字符开始截取
            break
          }
        }
      }
      if (!displayOperatorName && record.operatorName && record.operatorName !== '匿名') {
        displayOperatorName = record.operatorName
      }

      // 计算头像占位符：跳过 emoji，取第一个中文字符
      let avatarPlaceholder = '匿'
      if (displayOperatorName) {
        // 跳过 emoji（emoji 占 2 个字符位置），取第一个中文字符
        for (let i = 0; i < displayOperatorName.length; i++) {
          const char = displayOperatorName[i]
          // 检查是否为中文字符（Unicode 范围）
          if (char >= '\u4e00' && char <= '\u9fff') {
            avatarPlaceholder = char
            break
          }
        }
      }

      // 异步转 https://（自定义组件中 cloud:// 会被当相对路径）
      // 先清空，避免旧的 cloud:// 路径被渲染
      this.setData({ config, displayTime, summary, displayOperatorName, avatarPlaceholder, cleanOperatorAvatar: '' })

      if (record.operatorAvatar) {
        resolveAvatarUrl(record.operatorAvatar).then(url => {
          if (url) this.setData({ cleanOperatorAvatar: url })
        })
      }
    }
  },
  methods: {
    onTap() {
      if (this.data.record._id) {
        wx.navigateTo({
          url: `/pages/record-detail/record-detail?id=${this.data.record._id}`
        })
      }
    },

    onLongPress() {
      if (this.data.record._id) {
        wx.showActionSheet({
          itemList: ['查看详情', '编辑', '删除'],
          success: (res) => {
            const recordId = this.data.record._id
            switch (res.tapIndex) {
              case 0: // 查看详情
                wx.navigateTo({
                  url: `/pages/record-detail/record-detail?id=${recordId}`
                })
                break
              case 1: // 编辑
                wx.navigateTo({
                  url: `/pages/add-record/add-record?id=${recordId}`
                })
                break
              case 2: // 删除
                wx.showModal({
                  title: '确认删除',
                  content: '删除后无法恢复，确定要删除这条记录吗？',
                  confirmColor: '#DC2626',
                  confirmText: '删除',
                  success: async (res) => {
                    if (res.confirm) {
                      try {
                        const cloud = require('../../utils/cloud')
                        wx.showLoading({ title: '删除中...' })
                        const deleteRes = await cloud.remove('records', recordId)
                        if (deleteRes.success) {
                          wx.showToast({ title: '删除成功', icon: 'success' })
                          // 通知父组件刷新
                          this.triggerEvent('delete', { recordId })
                        } else {
                          throw new Error(deleteRes.error || '删除失败')
                        }
                      } catch (err) {
                        console.error('删除记录失败:', err)
                        wx.showToast({ title: '删除失败', icon: 'none' })
                      } finally {
                        wx.hideLoading()
                      }
                    }
                  }
                })
                break
            }
          }
        })
      }
    },

    _formatTimeStr(timeStr) {
      if (!timeStr) return ''
      const date = new Date(timeStr)
      const now = new Date()
      const isToday = date.toDateString() === now.toDateString()
      const h = date.getHours().toString().padStart(2, '0')
      const m = date.getMinutes().toString().padStart(2, '0')
      const time = `${h}:${m}`
      if (isToday) return time
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${month}/${day} ${time}`
    },

    _summaryFromRecord(record) {
      const data = record.data || {}
      let summary = ''

      switch (record.type) {
        case 'feeding': {
          if (data.method === 'bottle') {
            summary = `奶瓶 ${data.volume || 0}ml`
          } else {
            const methodLabel = data.method === 'breast_left' ? '左侧' : data.method === 'breast_right' ? '右侧' : '双侧'
            summary = `母乳(${methodLabel}) ${data.duration || 0}分钟`
          }
          break
        }
        case 'diaper': {
          const dt = data.diaperType
          if (dt === 'wet') summary = '嘘嘘'
          else if (dt === 'stool') {
            if (data.stoolColor) {
              const stoolColor = STOOL_COLORS.find(c => c.value === data.stoolColor)
              summary = `便便(${stoolColor ? stoolColor.label : data.stoolColor})`
            } else {
              summary = '便便'
            }
          }
          else summary = '嘘嘘+便便'
          break
        }
        case 'sleep': {
          if (data.sleepMode === 'start') summary = '入睡'
          else if (data.sleepMode === 'end') summary = '醒来'
          else {
            const hrs = data.duration ? Math.floor(data.duration / 60) : 0
            const mins = data.duration ? data.duration % 60 : 0
            summary = hrs > 0 ? `${hrs}小时${mins}分钟` : `${mins}分钟`
            if (data.quality) {
              const q = SLEEP_QUALITY[data.quality.toUpperCase()]
              if (q) summary += ` · ${q.label}`
            }
          }
          break
        }
        case 'mood': {
          const mt = Object.values(MOOD_TYPES).find(t => t.value === data.moodType)
          summary = mt ? mt.label : '情绪记录'
          if (data.duration) summary += ` ${data.duration}分钟`
          break
        }
        case 'food': {
          summary = (data.foods || []).join('、') || '辅食'
          if (data.acceptance) {
            const acc = Object.values(FOOD_ACCEPTANCE).find(a => a.value === data.acceptance)
            if (acc) summary += ` · ${acc.label}`
          }
          break
        }
        case 'health': {
          const st = Object.values(HEALTH_SUB_TYPES).find(s => s.value === data.subType)
          summary = st ? st.label : '健康'
          if (data.subType === 'temperature') summary += ` ${data.temperature}℃`
          else if (data.subType === 'medicine') summary += ` ${data.medicineName || ''}`
          else if (data.subType === 'vaccine') summary += ` ${data.vaccineName || ''}`
          else if (data.subType === 'weight') summary += ` ${data.weight}kg`
          else if (data.subType === 'height') summary += ` ${data.height}cm`
          else if (data.subType === 'headCircumference') summary += ` ${data.headCircumference}cm`
          break
        }
        default:
          summary = '记录'
      }

      return summary
    }
  }
})
