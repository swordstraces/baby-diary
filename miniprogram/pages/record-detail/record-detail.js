// pages/record-detail/record-detail.js
const cloud = require('../../utils/cloud')
const { cleanAvatarPath, resolveAvatarUrl } = require('../../utils/avatar')
const { isAdmin } = require('../../utils/auth')
const {
  RECORD_TYPE_CONFIG, FEEDING_METHODS, DIAPER_TYPES,
  STOOL_COLORS, SLEEP_QUALITY, MOOD_TYPES, MOOD_REASONS,
  SOOTHE_METHODS, FOOD_ACCEPTANCE, HEALTH_SUB_TYPES, IDENTITY_LABELS
} = require('../../utils/constants')
const app = getApp()

Page({
  data: {
    record: {},
    typeConfig: {},
    displayTime: '',
    dataList: [],
    comments: [],
    commentText: '',
    recordId: '',
    isAdmin: false  // 是否为管理员
  },

  onLoad(options) {
    // 参数校验：确保 id 存在且非空
    if (!options.id || !options.id.trim()) {
      wx.showToast({ title: '参数错误', icon: 'none' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }
    
    this.setData({ recordId: options.id })
    this._loadRecord(options.id)
  },

  async _loadRecord(id) {
    wx.showLoading({ title: '加载中...' })
    try {
      const res = await cloud.getById('records', id)
      if (res.success && res.data) {
        const record = res.data
        const typeConfig = RECORD_TYPE_CONFIG[record.type] || {}
        this.setData({
          record,
          typeConfig,
          displayTime: this._formatTime(record.recordTime || record.createTime)
        })
        this._buildDataList(record)
        this._loadComments(id)

        // 设置导航标题
        wx.setNavigationBarTitle({ title: typeConfig.label + '详情' })

        // 检查管理员权限
        this._checkAdminPermission()
      }
    } catch (err) {
      console.error('加载记录失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  async _loadComments(recordId) {
    try {
      const res = await cloud.query('comments', { recordId }, {
        pageSize: 50, orderBy: 'createTime', order: 'asc'
      })
      if (res.success) {
        const comments = await Promise.all(res.data.map(async c => {
          console.log('[_loadComments] 评论原始数据:', {
            identity: c.identity,
            operatorName: c.operatorName,
            content: c.content
          })

          // 优先使用身份标签（去掉 emoji），如果 identity 不存在或为空，则使用 operatorName
          let displayName = '匿名'
          if (c.identity && IDENTITY_LABELS[c.identity]) {
            // 从 IDENTITY_LABELS 中去掉 emoji，只保留中文字符
            const fullLabel = IDENTITY_LABELS[c.identity]  // 如 "👨 爸爸"
            for (let i = 0; i < fullLabel.length; i++) {
              const char = fullLabel[i]
              if (char >= '\u4e00' && char <= '\u9fff') {
                displayName = fullLabel.substring(i)  // 从第一个中文字符开始截取
                break
              }
            }
          } else if (c.operatorName && c.operatorName !== '匿名') {
            displayName = c.operatorName
          }

          console.log('[_loadComments] 评论显示名称:', displayName)

          // 转换头像 cloud:// → https://
          const displayAvatar = await resolveAvatarUrl(c.avatar)

          // 渐进式清理：如果路径需要清理，更新回数据库
          const cleanedPath = cleanAvatarPath(c.avatar)
          if (cleanedPath !== c.avatar && cleanedPath) {
            console.log('[_loadComments] 发现旧头像路径，正在清理并更新数据库:', c.avatar, '->', cleanedPath)
            cloud.update('comments', c._id, { avatar: cleanedPath })
              .catch(err => console.error('[_loadComments] 更新头像路径失败:', err))
          }

          return {
            ...c,
            displayTime: this._formatTimeRelative(c.createTime),
            displayName,
            displayAvatar
          }
        }))
        this.setData({ comments })
      }
    } catch (err) {
      console.error('加载评论失败:', err)
    }
  },

  _buildDataList(record) {
    const data = record.data || {}
    const list = []

    switch (record.type) {
      case 'feeding': {
        if (data.method === 'bottle') {
          list.push({ label: '喂奶方式', value: '奶瓶' })
          list.push({ label: '奶量', value: `${data.volume || 0}ml` })
        } else {
          const methodMap = { breast_left: '母乳（左侧）', breast_right: '母乳（右侧）', breast_both: '母乳（双侧）' }
          list.push({ label: '喂奶方式', value: methodMap[data.method] || data.method })
          list.push({ label: '时长', value: `${data.duration || 0}分钟` })
        }
        break
      }
      case 'diaper': {
        const diaperMap = { wet: '嘘嘘', stool: '便便', both: '嘘嘘+便便' }
        list.push({ label: '类型', value: diaperMap[data.diaperType] || data.diaperType })
        if (data.stoolColor) {
          const sc = STOOL_COLORS.find(c => c.value === data.stoolColor)
          list.push({ label: '便便颜色', value: sc ? sc.label : data.stoolColor })
        }
        if (data.note) list.push({ label: '备注', value: data.note })
        break
      }
      case 'sleep': {
        const modeMap = { start: '入睡', end: '醒来', both: '完整记录' }
        list.push({ label: '记录类型', value: modeMap[data.sleepMode] || data.sleepMode })
        if (data.duration) list.push({ label: '睡眠时长', value: `${data.duration}分钟` })
        if (data.quality) {
          const q = Object.values(SLEEP_QUALITY).find(s => s.value === data.quality)
          list.push({ label: '睡眠质量', value: q ? q.label : data.quality })
        }
        break
      }
      case 'mood': {
        const mt = Object.values(MOOD_TYPES).find(t => t.value === data.moodType)
        list.push({ label: '情绪', value: mt ? mt.label : data.moodType })
        if (data.reasons && data.reasons.length > 0) {
          const reasons = data.reasons.map(r => {
            const found = MOOD_REASONS.find(mr => mr.value === r)
            return found ? found.label : r
          })
          list.push({ label: '可能原因', value: reasons.join('、') })
        }
        if (data.sootheMethod) {
          const sm = SOOTHE_METHODS.find(s => s.value === data.sootheMethod)
          list.push({ label: '安抚方式', value: sm ? sm.label : data.sootheMethod })
        }
        if (data.duration) list.push({ label: '持续时长', value: `${data.duration}分钟` })
        break
      }
      case 'food': {
        if (data.foods) list.push({ label: '食物', value: data.foods.join('、') })
        const amountMap = { little: '少', normal: '中', much: '多' }
        if (data.amount) list.push({ label: '食量', value: amountMap[data.amount] || data.amount })
        if (data.acceptance) {
          const acc = Object.values(FOOD_ACCEPTANCE).find(a => a.value === data.acceptance)
          list.push({ label: '接受程度', value: acc ? acc.label : data.acceptance })
        }
        if (data.isNewFood) list.push({ label: '新食物', value: '是（请注意观察过敏反应）' })
        break
      }
      case 'health': {
        const hst = Object.values(HEALTH_SUB_TYPES).find(s => s.value === data.subType)
        if (hst) list.push({ label: '类型', value: hst.label })
        if (data.subType === 'temperature') {
          list.push({ label: '体温', value: `${data.temperature}℃` })
          if (data.measurePos) {
            const posMap = { armpit: '腋下', oral: '口腔', ear: '耳温', forehead: '额头', rectal: '肛温' }
            list.push({ label: '测量部位', value: posMap[data.measurePos] || data.measurePos })
          }
        }
        if (data.subType === 'medicine') {
          list.push({ label: '药物', value: data.medicineName || '' })
          list.push({ label: '剂量', value: `${data.medicineDose || 0} ${data.doseUnit || 'ml'}` })
        }
        if (data.subType === 'vaccine') {
          list.push({ label: '疫苗', value: data.vaccineName || '' })
        }
        break
      }
    }

    // 添加观察笔记
    if (record.note) {
      list.push({ label: '笔记', value: record.note })
    }

    this.setData({ dataList: list })
  },

  // 评论输入
  onCommentInput(e) {
    this.setData({ commentText: e.detail.value })
  },

  // 提交评论
  async submitComment() {
    const text = this.data.commentText.trim()
    
    // 安全校验1：检查内容
    if (!text) {
      wx.showToast({ title: '请输入评论内容', icon: 'none' })
      return
    }
    
    // 安全校验2：内容长度限制（1-500字符）
    if (text.length > 500) {
      wx.showToast({ title: '评论内容不能超过500字', icon: 'none' })
      return
    }
    
    // 安全校验3：检查登录状态
    if (!app.globalData.openId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }
    
    // 安全校验4：检查是否有家庭
    if (!app.globalData.currentFamily || !app.globalData.currentFamily._id) {
      wx.showToast({ title: '请先加入家庭', icon: 'none' })
      return
    }

    try {
      // 从 globalData.member 读取当前用户的成员信息（由 login 云函数获取）
      // 前端直接查 members 集合会被安全规则拦截
      const member = app.globalData.member

      console.log('[submitComment] 成员数据:', member)

      // 优先使用身份标签，其次使用昵称，最后使用微信昵称
      let operatorName = '匿名'
      if (member && member.nickname) {
        operatorName = member.nickname
      } else if (app.globalData.userInfo && app.globalData.userInfo.nickName) {
        operatorName = app.globalData.userInfo.nickName
      }

      // 修复头像路径
      const cleanAvatar = cleanAvatarPath(member && member.avatar ? member.avatar : '')

      const commentData = {
        recordId: this.data.recordId,
        content: text,
        operatorId: app.globalData.openId || '',
        operatorName,
        identity: member ? member.identity : '',
        avatar: cleanAvatar,
        createTime: new Date().toISOString()
      }

      await cloud.add('comments', commentData)

      this.setData({ commentText: '' })
      wx.showToast({ title: '评论成功', icon: 'success' })
      this._loadComments(this.data.recordId)
    } catch (err) {
      console.error('评论失败:', err)
      wx.showToast({ title: '评论失败', icon: 'none' })
    }
  },

  _formatTime(timeStr) {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const m = (date.getMonth() + 1).toString().padStart(2, '0')
    const d = date.getDate().toString().padStart(2, '0')
    const h = date.getHours().toString().padStart(2, '0')
    const min = date.getMinutes().toString().padStart(2, '0')
    return `${m}月${d}日 ${h}:${min}`
  },

  _formatTimeRelative(timeStr) {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now - date
    if (diff < 60 * 1000) return '刚刚'
    if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)}分钟前`
    if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)}小时前`
    const h = date.getHours().toString().padStart(2, '0')
    const min = date.getMinutes().toString().padStart(2, '0')
    return `${h}:${min}`
  },

  // 编辑记录
  editRecord() {
    const recordId = this.data.recordId
    if (!recordId) return
    wx.navigateTo({
      url: `/pages/add-record/add-record?id=${recordId}`
    })
  },

  // 删除记录
  deleteRecord() {
    const recordId = this.data.recordId
    if (!recordId) return

    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条记录吗？',
      confirmColor: '#DC2626',
      confirmText: '删除',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })
            const res = await cloud.remove('records', recordId)
            if (res.success) {
              wx.showToast({ title: '删除成功', icon: 'success' })
              // 返回上一页并刷新
              setTimeout(() => {
                wx.navigateBack()
              }, 800)
            } else {
              throw new Error(res.error || '删除失败')
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
  },

  // 检查管理员权限
  _checkAdminPermission() {
    if (!Array.isArray(app.globalData.members) || !app.globalData.openId) {
      return false
    }
    const currentMember = app.globalData.members.find(m => m.openId === app.globalData.openId)
    const isAdmin = currentMember && currentMember.role === 'admin'
    this.setData({ isAdmin })
    return isAdmin
  },

  // 删除评论
  deleteComment(e) {
    const commentId = e.currentTarget.dataset.id
    if (!commentId) return

    // 权限检查：只有管理员可以删除评论
    if (!this.data.isAdmin) {
      wx.showToast({ title: '只有管理员可以删除评论', icon: 'none' })
      return
    }

    wx.showModal({
      title: '确认删除',
      content: '删除后无法恢复，确定要删除这条评论吗？',
      confirmColor: '#DC2626',
      confirmText: '删除',
      success: async (res) => {
        if (res.confirm) {
          try {
            wx.showLoading({ title: '删除中...' })

            // 调用云函数删除评论（管理员权限验证在服务器端）
            const cloudRes = await wx.cloud.callFunction({
              name: 'deleteComment',
              data: {
                commentId: commentId,
                familyId: app.globalData.currentFamily && app.globalData.currentFamily._id
              }
            })

            const result = cloudRes.result

            if (result.success) {
              wx.showToast({ title: '删除成功', icon: 'success' })
              // 重新加载评论列表
              this._loadComments(this.data.recordId)
            } else {
              throw new Error(result.message || '删除失败')
            }
          } catch (err) {
            console.error('删除评论失败:', err)
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          } finally {
            wx.hideLoading()
          }
        }
      }
    })
  }
})
