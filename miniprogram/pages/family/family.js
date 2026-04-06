// pages/family/family.js
const cloud = require('../../utils/cloud')
const { cleanAvatarPath } = require('../../utils/avatar')
const { FAMILY_ROLES, IDENTITY_LABELS } = require('../../utils/constants')
const app = getApp()

Page({
  data: {
    family: null,
    members: [],
    babyInfo: {},
    isOwner: false,  // 是否是创建者（管理员）
    currentOpenId: '',
    createTimeText: '',
    showIdentityPicker: false,  // 是否显示身份选择器
    newMemberId: '',  // 新创建或编辑的成员ID
    editingMember: null,  // 正在编辑的成员信息（null 表示新建）
    // 展平的编辑成员初始值，避免 wxml 里复杂表达式导致 observer 读到旧值
    editingAvatar: '',
    editingNickname: '',
    editingIdentity: ''
  },

  onLoad() {
    this._loadFamilyData()
  },

  onShow() {
    // 无论有无家庭都刷新，确保解散后和加入后都能正确更新 UI
    this._loadFamilyData()
  },

  async _loadFamilyData() {
    const family = app.globalData.currentFamily
    if (!family) {
      // 没有家庭，确保页面状态清空
      this.setData({ family: null, members: [], babyInfo: {}, isOwner: false })
      return
    }

    try {
      // 加载成员列表（通过 login 云函数，前端直接查 members 集合会被安全规则拦截）
      // cloud.callFunction 返回 { success, data: res.result }，login getMembers 返回 { success, data: [] }
      const membersRes = await cloud.callFunction('login', { action: 'getMembers', familyId: family._id })
      const members = (membersRes.success && membersRes.data && membersRes.data.success)
        ? membersRes.data.data || []
        : []

      // 更新 globalData.members
      app.globalData.members = members

      // 判断当前用户是否是创建者（管理员）
      const openId = app.globalData.openId
      const isOwner = !!members.find(m => m.openId === openId && m.role === FAMILY_ROLES.ADMIN)

      // 加载宝宝信息
      let babyInfo = app.globalData.currentBaby || {}
      if (!babyInfo._id) {
        const babyRes = await cloud.queryOne('babies', { familyId: family._id })
        if (babyRes.success && babyRes.data) {
          babyInfo = babyRes.data
          app.globalData.currentBaby = babyInfo
        }
      }

      // 格式化创建时间
      const created = new Date(family.createTime)
      const createTimeText = `${created.getFullYear()}/${created.getMonth() + 1}/${created.getDate()}`

      this.setData({
        family,
        members,
        babyInfo,
        isOwner,
        currentOpenId: openId,
        createTimeText
      })
    } catch (err) {
      console.error('加载家庭数据失败:', err)
      wx.showToast({ title: '加载家庭数据失败', icon: 'none' })
    }
  },

  // 创建家庭
  createFamily() {
    this._doCreateFamilyModal()
  },

  // 弹出创建家庭的 Modal
  _doCreateFamilyModal() {
    wx.showModal({
      title: '创建家庭',
      content: '请输入家庭名称（默认："我的家庭"）',
      editable: true,
      placeholderText: '我的家庭',
      confirmText: '创建',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          const name = (res.content || '').trim() || '我的家庭'
          this._execCreateFamily(name)
        }
      },
      fail: () => {
        // 低版本微信不支持 editable，降级为直接使用默认名称
        wx.showModal({
          title: '创建家庭',
          content: '将以"我的家庭"为名称创建，创建后可修改。',
          confirmText: '创建',
          cancelText: '取消',
          success: (res) => {
            if (res.confirm) {
              this._execCreateFamily('我的家庭')
            }
          }
        })
      }
    })
  },

  // 执行创建家庭（抽出以便复用）
  async _execCreateFamily(name) {
    wx.showLoading({ title: '创建中...' })
    try {
      const openId = app.globalData.openId

      // 生成6位随机邀请码
      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
      let inviteCode = ''
      for (let i = 0; i < 6; i++) {
        inviteCode += chars.charAt(Math.floor(Math.random() * chars.length))
      }

      // 创建家庭
      const familyRes = await cloud.add('families', {
        name,
        ownerId: openId,
        memberIds: [openId],
        inviteCode,
        createTime: new Date().toISOString()
      })

      if (familyRes.success) {
        const familyId = familyRes.data._id
        // 创建者自动成为管理员成员
        const memberRes = await cloud.add('members', {
          familyId,
          openId,
          role: FAMILY_ROLES.ADMIN,
          joinTime: new Date().toISOString()
        })

        // 更新全局数据
        app.globalData.currentFamily = {
          _id: familyId,
          name,
          ownerId: openId,
          memberIds: [openId],
          inviteCode,
          createTime: new Date().toISOString()
        }

        // 加载所有成员（通过 login 云函数）
        const membersRes = await cloud.callFunction('login', { action: 'getMembers', familyId })
        if (membersRes.success && membersRes.data && membersRes.data.success && Array.isArray(membersRes.data.data)) {
          app.globalData.members = membersRes.data.data
          // 设置 globalData.member（当前用户自己，mine 页面需要）
          const selfMember = membersRes.data.data.find(m => m.openId === openId)
          if (selfMember) {
            app.globalData.member = selfMember
          }
        }

        wx.hideLoading()

        // 弹出身份选择器（新建，无初始值）
        this.setData({
          newMemberId: memberRes.data._id,
          editingMember: null,
          editingAvatar: '',
          editingNickname: '',
          editingIdentity: '',
          showIdentityPicker: true
        })

      } else {
        wx.hideLoading()
        wx.showToast({ title: familyRes.error || '创建失败', icon: 'none' })
      }
    } catch (err) {
      wx.hideLoading()
      console.error('创建家庭失败:', err)
      wx.showToast({ title: '系统错误', icon: 'none' })
    }
  },

  // 编辑成员身份（只有创建者可以）
  onEditMember(e) {
    if (!this.data.isOwner) return

    const { memberId, member } = e.detail
    console.log('[family] 编辑成员:', { memberId, member })

    // 展平编辑成员信息，确保 identity-picker observer 能拿到最新值
    const editingAvatar = (member && member.avatar) || ''
    const editingNickname = (member && member.nickname) || ''
    const editingIdentity = (member && member.identity) || ''

    this.setData({
      newMemberId: memberId,
      editingMember: member,
      editingAvatar,
      editingNickname,
      editingIdentity,
      showIdentityPicker: true   // 最后设置 show，确保 picker 读到最新 initial 值
    })
  },

  // 移除成员（只有创建者可以）
  async onRemoveMember(e) {
    if (!this.data.isOwner) return

    const memberId = e.detail.memberId
    const member = this.data.members.find(m => m._id === memberId)
    const identityText = member && member.identity ? IDENTITY_LABELS[member.identity] : '该成员'

    wx.showModal({
      title: '确认移除',
      content: `确定要将${identityText}从家庭中移除吗？`,
      confirmColor: '#FF6B6B',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '移除中...' })
          try {
            // 通过云函数删除（管理员权限，绕过前端数据库安全规则）
            const removeRes = await wx.cloud.callFunction({
              name: 'deleteMember',
              data: { memberId }
            })
            if (!removeRes.result || !removeRes.result.success) {
              throw new Error(removeRes.result && removeRes.result.error || '移除失败')
            }
            wx.hideLoading()
            wx.showToast({ title: '已移除', icon: 'success' })
            this._loadFamilyData()
          } catch (err) {
            wx.hideLoading()
            wx.showToast({ title: '移除失败', icon: 'none' })
          }
        }
      }
    })
  },

  // === 页面跳转 ===

  goToInvite(e) {
    // 获取点击时传递的 mode 参数（data-mode）
    const mode = e.currentTarget.dataset.mode
    const url = mode ? `/pages/invite/invite?mode=${mode}` : '/pages/invite/invite'
    wx.navigateTo({ url })
  },

  goToBabyEdit() {
    wx.navigateTo({ url: '/pages/baby-edit/baby-edit' })
  },

  // === 身份选择器 ===

  // 确认身份选择
  async onIdentityConfirm(e) {
    const { avatar, nickname, identity } = e.detail
    console.log('[family] onIdentityConfirm:', { avatar, nickname, identity, newMemberId: this.data.newMemberId, editingMember: this.data.editingMember })

    try {
      wx.showLoading({ title: '保存中...', mask: true })

      // 清理头像路径
      const cleanAvatar = cleanAvatarPath(avatar)

      // 调用云函数更新（管理员可修改他人信息，绕过数据库安全规则）
      const updateRes = await wx.cloud.callFunction({
        name: 'updateMember',
        data: {
          memberId: this.data.newMemberId,
          avatar: cleanAvatar,
          nickname,
          identity
        }
      })
      console.log('[family] 更新成员结果:', updateRes)

      if (!updateRes.result || !updateRes.result.success) {
        throw new Error(updateRes.result && updateRes.result.error || '更新失败')
      }

      // 更新 globalData.members 中的成员信息
      const members = app.globalData.members || []
      const memberIndex = members.findIndex(m => m._id === this.data.newMemberId)
      if (memberIndex !== -1) {
        members[memberIndex] = {
          ...members[memberIndex],
          avatar: cleanAvatar,
          nickname,
          identity
        }
        app.globalData.members = members
      }

      // 同步更新 globalData.member（如果编辑的是当前用户自己）
      if (app.globalData.member && app.globalData.member._id === this.data.newMemberId) {
        app.globalData.member = {
          ...app.globalData.member,
          avatar: cleanAvatar,
          nickname,
          identity
        }
      }

      // 更新页面 members 数组
      const pageMembers = this.data.members
      const pageMemberIndex = pageMembers.findIndex(m => m._id === this.data.newMemberId)
      if (pageMemberIndex !== -1) {
        pageMembers[pageMemberIndex] = {
          ...pageMembers[pageMemberIndex],
          avatar: cleanAvatar,
          nickname,
          identity
        }
        this.setData({ members: pageMembers })
      }

      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success' })

      // 关闭身份选择器
      this.setData({
        showIdentityPicker: false,
        newMemberId: '',
        editingMember: null,
        editingAvatar: '',
        editingNickname: '',
        editingIdentity: ''
      })

      // 刷新家庭数据后返回上一页
      this._loadFamilyData()
      setTimeout(() => {
        wx.navigateBack()
      }, 500)

    } catch (err) {
      wx.hideLoading()
      console.error('[family] 保存身份信息失败:', err)
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
  },

  // 取消身份选择
  onIdentityCancel() {
    this.setData({
      showIdentityPicker: false,
      editingMember: null,
      editingAvatar: '',
      editingNickname: '',
      editingIdentity: ''
    })
  },

  // 显示隐私政策对话框
  _showPrivacyDialog() {
    return new Promise((resolve) => {
      wx.showModal({
        title: '隐私政策',
        content: '在使用本应用前，请您仔细阅读并同意《隐私政策》，了解我们如何收集、使用和保护您的个人信息。',
        confirmText: '同意并继续',
        cancelText: '查看隐私政策',
        confirmColor: '#FF8C6B',
        success: (res) => {
          if (res.confirm) {
            // 同意隐私政策
            wx.setStorageSync('privacy_agreed', true)
            resolve(true)
          } else if (res.cancel) {
            // 查看隐私政策
            wx.navigateTo({
              url: '/pages/privacy/privacy',
              success: () => {
                // 查看隐私政策后不再继续创建流程
                resolve(false)
              }
            })
          }
        }
      })
    })
  },

  // 解散家庭（只有创建者可以）
  dissolveFamily() {
    if (!this.data.isOwner) return

    wx.showModal({
      title: '确认解散',
      content: '解散后所有记录将被删除，此操作不可恢复！',
      confirmColor: '#FF6B6B',
      confirmText: '解散',
      success: async (res) => {
        if (res.confirm) {
          wx.showLoading({ title: '解散中...' })
          try {
            const familyId = this.data.family._id

            // 通过云函数解散家庭（批量删除所有关联数据）
            const dissolveRes = await wx.cloud.callFunction({
              name: 'deleteFamily',
              data: { familyId }
            })

            if (!dissolveRes.result || !dissolveRes.result.success) {
              throw new Error(dissolveRes.result && dissolveRes.result.error || '解散失败')
            }

            // 清除全局数据
            app.globalData.currentFamily = null
            app.globalData.currentBaby = null
            app.globalData.members = []

            wx.hideLoading()
            wx.showToast({ title: '已解散', icon: 'success' })
            this.setData({ family: null, members: [], babyInfo: {}, showIdentityPicker: false })

            // 清空本地缓存的设置
            wx.removeStorageSync('userSettings')
          } catch (err) {
            wx.hideLoading()
            console.error('[family] 解散家庭失败:', err)
            // 即使云函数失败，也提供强制清除本地状态的选项
            wx.showModal({
              title: '操作失败',
              content: '解散请求失败（可能是云函数未部署）。是否强制清除本地家庭数据？',
              confirmText: '强制清除',
              cancelText: '取消',
              confirmColor: '#FF6B6B',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  app.globalData.currentFamily = null
                  app.globalData.currentBaby = null
                  app.globalData.members = []
                  wx.removeStorageSync('userSettings')
                  this.setData({ family: null, members: [], babyInfo: {}, showIdentityPicker: false })
                  wx.showToast({ title: '本地数据已清除', icon: 'none' })
                }
              }
            })
          }
        }
      }
    })
  }
})
