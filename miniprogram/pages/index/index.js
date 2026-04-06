// pages/index/index.js
const cloud = require('../../utils/cloud')
const { cleanAvatarPath, resolveAvatarUrl } = require('../../utils/avatar')
const { isAdmin } = require('../../utils/auth')
const { generateDailyReport, generateStatusText } = require('../../utils/report-generator')
const { getBabyAge } = require('../../utils/util')
const app = getApp()

Page({
  // 防重入实例变量（不走 setData，避免序列化）
  _loadingData: false,

  data: {
    babyInfo: {},
    babyAgeText: '',
    statusPhrase: '今天还没开始记录哦~',
    todayStats: null,
    recentRecords: [],
    hasFamily: false,
    recentComments: [],
    showReplyModal: false,
    replyCommentId: '',
    replyTargetName: '',
    replyContent: '',
    isAdmin: false  // 是否为管理员
  },

  onLoad() {
    // 如果账户已就绪，直接加载；否则等待回调
    if (app.globalData.currentFamily) {
      this._reloadAll()
    } else {
      // 使用数组方式注册回调，避免覆盖其他页面的回调
      if (!app.accountReadyCallbacks) app.accountReadyCallbacks = []
      app.accountReadyCallbacks.push(() => {
        this._reloadAll()
      })
    }
  },

  onShow() {
    if (app.globalData.currentFamily) {
      this._reloadAll()
    }
  },

  // 记录删除事件
  onRecordDelete(e) {
    console.log('[index] 记录删除:', e.detail)
    // 删除成功后，重新加载数据
    this._reloadAll()
  },

  _reloadAll() {
    const hasFamily = !!(app.globalData.currentFamily && app.globalData.currentBaby)
    if (!hasFamily) {
      // 没有家庭/宝宝时，强制清空所有数据
      this.setData({
        babyInfo: {},
        babyAgeText: '',
        statusPhrase: '今天还没开始记录哦~',
        todayStats: null,
        recentRecords: [],
        hasFamily: false
      })
    } else {
      this.setData({ hasFamily })
      this._loadBabyInfo()
      this._loadTodayData()
      // 检查管理员权限
      this._checkAdminPermission()
    }
  },

  onPullDownRefresh() {
    this._loadTodayData()
      .then(() => wx.stopPullDownRefresh())
      .catch(() => wx.stopPullDownRefresh())
  },

  // 加载宝宝信息（异步转换头像URL）
  async _loadBabyInfo() {
    const baby = app.globalData.currentBaby
    if (baby) {
      let avatarUrl = baby.avatarUrl || ''
      if (avatarUrl && avatarUrl.startsWith('cloud://')) {
        avatarUrl = await resolveAvatarUrl(avatarUrl)
      }
      this.setData({
        babyInfo: { ...baby, avatarUrl },
        babyAgeText: getBabyAge(baby.birthday)
      })
    }
  },

  // 加载今日数据（防重入）
  async _loadTodayData() {
    if (this._loadingData) return
    const family = app.globalData.currentFamily
    const baby = app.globalData.currentBaby
    if (!family || !family._id || !baby || !baby._id) return

    this._loadingData = true

    const now = new Date()
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
    const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1).toISOString()

    try {
      const res = await cloud.queryByDateRange(
        'records',
        { familyId: family._id, babyId: baby._id },
        'recordTime',
        todayStart, todayEnd,
        { pageSize: 50, orderBy: 'recordTime', order: 'desc' }
      )

      if (res.success) {
        const records = res.data || []
        this._processTodayData(records)
        this.setData({ recentRecords: records.slice(0, 5) })
        this._loadRecentComments()
      }
    } catch (err) {
      console.error('加载今日数据失败:', err)
    } finally {
      this._loadingData = false
    }
  },

  // 处理今日数据统计
  _processTodayData(records) {
    if (!records || records.length === 0) {
      this.setData({ todayStats: null, statusPhrase: '今天还没开始记录哦~' })
      return
    }

    const stats = {
      feeding: { count: 0, totalVolume: 0 },
      diaper: { count: 0 },
      sleep: { count: 0, totalMinutes: 0 },
      mood: { count: 0 },
      food: { count: 0 },
      health: { count: 0 }
    }

    records.forEach(r => {
      if (stats[r.type]) {
        stats[r.type].count++
        if (r.type === 'feeding' && r.data && r.data.volume) {
          stats.feeding.totalVolume += r.data.volume
        }
        if (r.type === 'sleep' && r.data && r.data.duration) {
          stats.sleep.totalMinutes += r.data.duration
        }
      }
    })

    const todayStats = [
      { type: 'feeding', value: stats.feeding.count, label: `喂奶${stats.feeding.count > 0 ? ' · ' + stats.feeding.totalVolume + 'ml' : ''}` },
      { type: 'diaper', value: stats.diaper.count, label: '换尿布' },
      { type: 'sleep', value: Math.round(stats.sleep.totalMinutes / 60 * 10) / 10, label: '睡眠(h)' },
      { type: 'mood', value: stats.mood.count, label: '情绪' }
    ]

    let statusPhrase = ''
    try {
      const now = new Date()
      const todayStr = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0')
      const report = generateDailyReport(records, todayStr)
      statusPhrase = generateStatusText(report)
    } catch (err) {
      console.error('生成状态短语失败:', err)
    }

    this.setData({ todayStats, statusPhrase })
  },

  // 加载最近留言
  async _loadRecentComments() {
    const family = app.globalData.currentFamily
    if (!family) return

    try {
      const res = await cloud.query(
        'comments',
        { familyId: family._id },
        { pageSize: 5, orderBy: 'createTime', order: 'desc' }
      )

      if (res.success && res.data) {
        const currentOpenId = app.globalData.openId

        // 只获取顶级留言（没有 parentId 的）
        const topLevelComments = res.data.filter(item => !item.parentId)

        // 为每个留言加载回复（使用 Promise.allSettled 避免单个失败影响整体）
        const results = await Promise.allSettled(
          topLevelComments.map(async comment => {
            try {
              // 加载该留言的回复
              const repliesRes = await cloud.query(
                'comments',
                { parentId: comment._id },
                { pageSize: 10, orderBy: 'createTime', order: 'asc' }
              )

              const replies = repliesRes.success && repliesRes.data
                ? repliesRes.data.map(reply => ({
                    _id: reply._id,
                    authorName: reply.nickname,
                    authorIdentity: reply.identity,
                    content: reply.content
                  }))
                : []

              // 判断当前用户是否点赞
              const likedBy = comment.likedBy || []
              const isLiked = likedBy.includes(currentOpenId)

              const timeText = this._formatCommentTime(comment.createTime)

              // 转换头像路径（cloud:// → https://）
              const authorAvatar = await resolveAvatarUrl(comment.avatar)

              // 渐进式清理：如果路径需要清理，更新回数据库
              const cleanedPath = cleanAvatarPath(comment.avatar)
              if (cleanedPath && cleanedPath !== comment.avatar) {
                console.log('[index] 发现旧头像路径，正在清理并更新数据库:', comment.avatar, '->', cleanedPath)
                cloud.update('comments', comment._id, { avatar: cleanedPath })
                  .catch(err => console.error('[index] 更新头像路径失败:', err))
              }

              return {
                _id: comment._id,
                content: comment.content,
                authorId: comment.openId,
                authorIdentity: comment.identity,
                authorName: comment.nickname,
                authorAvatar,
                timeText,
                isCurrentUser: comment.openId === currentOpenId,
                replies,
                likeCount: comment.likeCount || 0,
                isLiked
              }
            } catch (err) {
              console.error('[index] 加载留言回复失败:', comment._id, err)
              // 单个失败返回基础信息，不影响其他留言
              const likedBy = comment.likedBy || []
              const timeText = this._formatCommentTime(comment.createTime)
              const authorAvatar = await resolveAvatarUrl(comment.avatar)
              return {
                _id: comment._id,
                content: comment.content,
                authorId: comment.openId,
                authorIdentity: comment.identity,
                authorName: comment.nickname,
                authorAvatar,
                timeText,
                isCurrentUser: comment.openId === currentOpenId,
                replies: [],
                likeCount: comment.likeCount || 0,
                isLiked: likedBy.includes(currentOpenId)
              }
            }
          })
        )

        const commentsWithReplies = results
          .filter(r => r.status === 'fulfilled')
          .map(r => r.value)

        this.setData({ recentComments: commentsWithReplies })
      }
    } catch (err) {
      console.error('加载最近留言失败:', err)
    }
  },

  // 格式化留言时间
  _formatCommentTime(createTime) {
    if (!createTime) return ''

    const now = new Date()
    const time = new Date(createTime)
    const diff = now - time

    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return '刚刚'
    if (minutes < 60) return `${minutes}分钟前`
    if (hours < 24) return `${hours}小时前`
    if (days < 7) return `${days}天前`

    // 超过7天显示具体日期
    const year = time.getFullYear()
    const month = String(time.getMonth() + 1).padStart(2, '0')
    const day = String(time.getDate()).padStart(2, '0')
    const hour = String(time.getHours()).padStart(2, '0')
    const minute = String(time.getMinutes()).padStart(2, '0')

    // 如果是今年，不显示年份
    if (year === now.getFullYear()) {
      return `${month}-${day} ${hour}:${minute}`
    }
    return `${year}-${month}-${day} ${hour}:${minute}`
  },

  // 显示留言输入框
  showCommentInput() {
    wx.showModal({
      title: '写留言',
      editable: true,
      placeholderText: '写下对宝宝或家人的话...',
      success: async (res) => {
        if (res.confirm && res.content && res.content.trim()) {
          await this._submitComment(res.content.trim())
        }
      }
    })
  },

  // 提交留言
  async _submitComment(content) {
    const family = app.globalData.currentFamily
    const members = app.globalData.members || []
    const currentOpenId = app.globalData.openId

    if (!family) {
      wx.showToast({ title: '请先加入家庭', icon: 'none' })
      return
    }

    // 从 members 数组中查找当前用户
    const currentMember = members.find(m => m.openId === currentOpenId)
    if (!currentMember) {
      wx.showToast({ title: '请先完善个人信息', icon: 'none' })
      return
    }

    wx.showLoading({ title: '发送中...' })

    try {
      // 修复头像路径
      const cleanAvatar = cleanAvatarPath(currentMember.avatar)

      const res = await cloud.add('comments', {
        familyId: family._id,
        openId: currentOpenId,
        identity: currentMember.identity,
        nickname: currentMember.nickname,
        avatar: cleanAvatar,
        content,
        createTime: new Date().toISOString()
      })

      if (res.success) {
        wx.hideLoading()
        wx.showToast({ title: '留言成功', icon: 'success' })
        // 重新加载留言
        this._loadRecentComments()
      } else {
        wx.hideLoading()
        wx.showToast({ title: '留言失败', icon: 'none' })
      }
    } catch (err) {
      console.error('提交留言失败:', err)
      wx.hideLoading()
      wx.showToast({ title: '留言失败', icon: 'none' })
    }
  },

  goToSetup() {
    wx.navigateTo({ url: '/pages/family/family' })
  },
  goToBabyEdit() {
    wx.navigateTo({ url: '/pages/baby-edit/baby-edit' })
  },
  goToTimeline() {
    wx.switchTab({ url: '/pages/timeline/timeline' })
  },

  // 点赞/取消点赞
  async toggleLike(e) {
    const { id, liked } = e.currentTarget.dataset
    const app = getApp()
    const openId = app.globalData.openId

    if (!openId) {
      wx.showToast({ title: '请先登录', icon: 'none' })
      return
    }

    try {
      // 获取当前留言
      const commentRes = await cloud.getById('comments', id)
      if (!commentRes.success || !commentRes.data) {
        throw new Error('留言不存在')
      }

      const comment = commentRes.data
      const likedBy = comment.likedBy || []

      if (liked) {
        // 取消点赞
        const newLikedBy = likedBy.filter(uid => uid !== openId)
        await cloud.update('comments', id, {
          likedBy: newLikedBy,
          likeCount: newLikedBy.length
        })
      } else {
        // 点赞
        if (!likedBy.includes(openId)) {
          likedBy.push(openId)
        }
        await cloud.update('comments', id, {
          likedBy: likedBy,
          likeCount: likedBy.length
        })
      }

      // 更新本地数据
      const comments = this.data.recentComments.map(c => {
        if (c._id === id) {
          return {
            ...c,
            isLiked: !liked,
            likeCount: liked ? (c.likeCount || 0) - 1 : (c.likeCount || 0) + 1
          }
        }
        return c
      })

      this.setData({ recentComments: comments })
    } catch (err) {
      console.error('点赞失败:', err)
      wx.showToast({ title: '操作失败', icon: 'none' })
    }
  },

  // 显示回复输入框
  showReplyInput(e) {
    const { id } = e.currentTarget.dataset
    const comment = this.data.recentComments.find(c => c._id === id)
    if (!comment) return

    this.setData({
      showReplyModal: true,
      replyCommentId: id,
      replyTargetName: comment.authorName || comment.authorIdentity || '未知用户',
      replyContent: ''
    })
  },

  // 隐藏回复输入框
  hideReplyInput() {
    this.setData({
      showReplyModal: false,
      replyCommentId: '',
      replyTargetName: '',
      replyContent: ''
    })
  },

  // 阻止事件冒泡
  stopPropagation() {
    // 阻止点击输入框关闭弹窗
  },

  // 回复内容输入
  onReplyInput(e) {
    this.setData({ replyContent: e.detail.value })
  },

  // 提交回复
  async submitReply() {
    const { replyCommentId, replyContent } = this.data

    // 先做所有验证检查（不显示 loading）
    if (!replyContent.trim()) {
      wx.showToast({ title: '请输入回复内容', icon: 'none' })
      return
    }

    const app = getApp()
    const family = app.globalData.currentFamily
    const members = app.globalData.members || []
    const currentOpenId = app.globalData.openId

    if (!family) {
      wx.showToast({ title: '请先加入家庭', icon: 'none' })
      return
    }

    const currentMember = members.find(m => m.openId === currentOpenId)
    if (!currentMember) {
      wx.showToast({ title: '请先完善个人信息', icon: 'none' })
      return
    }

    // 所有检查通过后，才显示 loading
    wx.showLoading({ title: '发送中...' })

    try {
      // 修复头像路径
      const cleanAvatar = cleanAvatarPath(currentMember.avatar)

      // 创建回复记录（使用 comments 集合，通过 parentId 关联）
      const res = await cloud.add('comments', {
        familyId: family._id,
        parentId: replyCommentId,
        openId: currentOpenId,
        identity: currentMember.identity,
        nickname: currentMember.nickname,
        avatar: cleanAvatar,
        content: replyContent.trim(),
        createTime: new Date().toISOString()
      })

      if (res.success) {
        wx.hideLoading()
        wx.showToast({ title: '回复成功', icon: 'success' })
        this.hideReplyInput()
        // 重新加载留言
        this._loadRecentComments()
      } else {
        wx.hideLoading()
        wx.showToast({ title: '回复失败', icon: 'none' })
      }
    } catch (err) {
      console.error('提交回复失败:', err)
      wx.hideLoading()
      wx.showToast({ title: '回复失败', icon: 'none' })
    }
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
              wx.hideLoading()
              wx.showToast({ title: '删除成功', icon: 'success' })
              // 重新加载评论列表
              this._loadRecentComments()
            } else {
              wx.hideLoading()
              throw new Error(result.message || '删除失败')
            }
          } catch (err) {
            console.error('删除评论失败:', err)
            wx.hideLoading()
            wx.showToast({ title: err.message || '删除失败', icon: 'none' })
          }
        }
      }
    })
  }
})
