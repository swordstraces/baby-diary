// pages/mine/mine.js
const cloud = require('../../utils/cloud')
const { cleanAvatarPath, resolveAvatarUrl } = require('../../utils/avatar')
const { IDENTITY_OPTIONS, IDENTITY_LABELS } = require('../../utils/constants')
const app = getApp()

Page({
  data: {
    identityText: '',
    identityEmoji: '👤',
    currentFamily: null,
    notification: true,
    userInfo: {
      avatarUrl: '',
      nickname: ''
    }
  },

  onLoad() {
    // 页面加载时无需特殊处理
  },

  onShow() {
    this.setData({
      currentFamily: app.globalData.currentFamily || null
    })

    // 如果账户信息已就绪（member 已加载），直接显示
    if (app.globalData.openId && app.globalData.member) {
      this._loadIdentity()
    } else if (!this._hasRegisteredCallback) {
      // 否则等待 _initAccount 完成（和 index.js 一样的机制）
      this._hasRegisteredCallback = true
      if (!app.accountReadyCallbacks) app.accountReadyCallbacks = []
      app.accountReadyCallbacks.push(() => {
        this.setData({ currentFamily: app.globalData.currentFamily || null })
        this._loadIdentity()
      })
    }
  },

  // 从成员记录加载身份信息
  async _loadIdentity() {
    const openId = app.globalData.openId

    if (!openId) {
      this.setData({ identityText: '', userInfo: { avatarUrl: '', nickname: '' } })
      return
    }

    // 优先使用 app._initAccount 通过 login 云函数获取的 member 信息
    // （前端直接查 members 集合会被安全规则拦截，被邀请者查不到自己）
    const member = app.globalData.member

    if (member) {
      const identity = member.identity || ''
      const avatarUrl = await resolveAvatarUrl(member.avatar)
      const identityItem = IDENTITY_OPTIONS.find(opt => opt.value === identity)

      this.setData({
        identityText: identity ? IDENTITY_LABELS[identity] : '',
        identityEmoji: identityItem ? identityItem.emoji : '👤',
        userInfo: {
          avatarUrl,
          nickname: member.nickname || ''
        }
      })
    }
  },

  // 修改身份（跳转到身份编辑页面）
  editIdentity() {
    const family = app.globalData.currentFamily
    const openId = app.globalData.openId

    if (!family || !openId) {
      wx.showToast({ title: '请先创建或加入家庭', icon: 'none' })
      return
    }

    // 跳转到身份编辑页面
    wx.navigateTo({ url: '/pages/identity-edit/identity-edit' })
  },

  // 跳转宝宝信息
  goToBabyEdit() {
    wx.navigateTo({ url: '/pages/baby-edit/baby-edit' })
  },

  // 跳转家庭管理
  goToFamily() {
    wx.navigateTo({ url: '/pages/family/family' })
  },

  // 跳转隐私政策
  goToPrivacy() {
    wx.navigateTo({ url: '/pages/privacy/privacy' })
  },

  // 消息提醒切换
  toggleNotification() {
    const newVal = !this.data.notification
    this.setData({ notification: newVal })
    if (newVal) {
      wx.showToast({
        title: '订阅成功',
        icon: 'success'
      })
    }
  },

  // 导出数据
  exportData() {
    wx.showActionSheet({
      itemList: ['导出为文本', '导出为图片'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this._exportAsText()
        } else {
          this._exportAsImage()
        }
      }
    })
  },

  _exportAsText() {
    const family = app.globalData.currentFamily
    const baby = app.globalData.currentBaby

    if (!family || !baby) {
      wx.showToast({ title: '请先创建家庭', icon: 'none' })
      return
    }

    wx.showLoading({ title: '导出中...' })

    cloud.query('records', { familyId: family._id }, { pageSize: 1000 })
      .then(res => {
        if (!res.success || !res.data || res.data.length === 0) {
          wx.hideLoading()
          wx.showToast({ title: '暂无记录可导出', icon: 'none' })
          return
        }

        const records = res.data

        // 按时间排序
        records.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))

        // 生成文本内容
        let content = `宝贝日记数据导出\n`
        content += `导出时间：${new Date().toLocaleString('zh-CN')}\n`
        content += `家庭：${family.name}\n`
        content += `宝宝：${baby.name || '未命名'}\n`
        content += `宝宝生日：${baby.birthday ? new Date(baby.birthday).toLocaleDateString('zh-CN') : '未设置'}\n`
        content += `共 ${records.length} 条记录\n`
        content += `${'='.repeat(40)}\n\n`

        const typeLabels = {
          feeding: '喂养',
          sleep: '睡眠',
          diaper: '换尿布',
          mood: '情绪',
          food: '辅食',
          health: '健康'
        }

        records.forEach((record, index) => {
          const time = new Date(record.createTime).toLocaleString('zh-CN')
          const typeLabel = typeLabels[record.type] || record.type
          content += `[${records.length - index}] ${time}\n`
          content += `类型：${typeLabel}\n`

          if (record.subtype) {
            content += `子类型：${record.subtype}\n`
          }

          if (record.amount !== undefined && record.amount !== null) {
            content += `数量：${record.amount}\n`
          }

          if (record.notes) {
            content += `备注：${record.notes}\n`
          }

          if (record.operator) {
            content += `记录者：${record.operator}\n`
          }

          content += `${'-'.repeat(30)}\n`
        })

        // 设置到剪贴板
        wx.setClipboardData({
          data: content,
          success: () => {
            wx.hideLoading()
            wx.showModal({
              title: '导出成功',
              content: '数据已复制到剪贴板，您可以粘贴到记事本或其他应用中保存',
              showCancel: false
            })
          },
          fail: () => {
            wx.hideLoading()
            wx.showToast({ title: '导出失败', icon: 'none' })
          }
        })
      })
      .catch(err => {
        wx.hideLoading()
        console.error('[mine] 导出文本失败:', err)
        wx.showToast({ title: '导出失败', icon: 'none' })
      })
  },

  _exportAsImage() {
    const family = app.globalData.currentFamily
    const baby = app.globalData.currentBaby

    if (!family || !baby) {
      wx.showToast({ title: '请先创建家庭', icon: 'none' })
      return
    }

    wx.showLoading({ title: '导出中...' })

    // 获取今日数据用于生成报告图片
    const today = new Date()
    const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate())
    const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1)

    cloud.queryByDateRange(
      'records',
      { familyId: family._id },
      'createTime',
      startDate.toISOString(),
      endDate.toISOString()
    ).then(res => {
      wx.hideLoading()

      if (!res.success) {
        wx.showToast({ title: '加载记录失败', icon: 'none' })
        return
      }

      // 跳转到报告页面生成图片
      wx.navigateTo({
        url: '/pages/report/report?exportMode=true',
        success: () => {
          wx.showToast({ title: '请在报告页面保存图片', icon: 'none', duration: 2000 })
        }
      })
    }).catch(err => {
      wx.hideLoading()
      console.error('[mine] 导出图片失败:', err)
      wx.showToast({ title: '导出失败', icon: 'none' })
    })
  },

  // 关于
  showAbout() {
    wx.showModal({
      title: '宝贝日记',
      content: '一款面向新生儿的家庭协作养娃记录小程序。\n\n版本：v1.0.0\n\n帮助全家人一起记录宝宝的日常活动，自动生成每日报告。',
      showCancel: false
    })
  }
})
