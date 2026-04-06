// pages/invite/invite.js
const cloud = require('../../utils/cloud')
const { cleanAvatarPath } = require('../../utils/avatar')
const app = getApp()

Page({
  data: {
    currentMode: 'generate', // 'generate' | 'input'
    inviteCode: '',
    inputCode: '',
    isLoading: true,
    showIdentityPicker: false,
    newMemberId: '',
    joinedFamilyName: ''
  },

  onLoad(options) {
    // 优先级：分享链接 > URL 参数 mode > 默认生成邀请码
    if (options && options.code) {
      // 通过分享链接进入（带邀请码）
      this.setData({ currentMode: 'input', inputCode: options.code })
      this._joinFamily(options.code)
    } else if (options && options.mode === 'input') {
      // 通过"加入家庭"按钮进入，切换到输入模式
      this.setData({ currentMode: 'input' })
      this.setData({ isLoading: false })
    } else {
      // 否则默认生成邀请码
      this._generateCode()
    }
  },

  // 切换模式
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({ currentMode: mode })
    if (mode === 'generate' && !this.data.inviteCode) {
      this._generateCode()
    }
  },

  // 输入邀请码
  onCodeInput(e) {
    this.setData({ inputCode: e.detail.value.toUpperCase() })
  },

  // 通过输入的邀请码加入
  joinByCode() {
    console.log('[invite] 点击了加入按钮')
    const code = this.data.inputCode.trim()
    console.log('[invite] 输入的邀请码:', code)
    if (!code) {
      wx.showToast({ title: '请输入邀请码', icon: 'none' })
      return
    }
    if (code.length !== 6) {
      wx.showToast({ title: '邀请码为6位', icon: 'none' })
      return
    }
    console.log('[invite] 开始调用 _joinFamily')
    this._joinFamily(code)
  },

  // 生成邀请码
  async _generateCode() {
    const family = app.globalData.currentFamily
    if (!family) {
      wx.showToast({ title: '请先创建家庭', icon: 'none' })
      this.setData({ isLoading: false })
      return
    }

    // 如果家庭已经有邀请码，直接使用
    if (family.inviteCode) {
      this.setData({ inviteCode: family.inviteCode, isLoading: false })
      return
    }

    // 生成6位随机码
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length))
    }

    try {
      // 更新家庭的邀请码
      await cloud.update('families', family._id, { inviteCode: code })
      this.setData({ inviteCode: code, isLoading: false })

      // 更新全局数据
      app.globalData.currentFamily.inviteCode = code
    } catch (err) {
      console.error('生成邀请码失败:', err)
      wx.showToast({ title: '生成失败', icon: 'none' })
      this.setData({ isLoading: false })
    }
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
                // 查看隐私政策后不再继续加入流程
                resolve(false)
              }
            })
          }
        }
      })
    })
  },

  // 通过邀请码加入家庭
  async _joinFamily(code) {
    console.log('[invite] 进入 _joinFamily 方法')

    wx.showLoading({ title: '加入中...' })
    try {
      // 确保 openId 已就绪（_initAccount 可能还在异步执行中）
      if (!app.globalData.openId) {
        console.log('[invite] openId 未就绪，等待 _initAccount 完成...')
        await new Promise((resolve) => {
          if (!app.accountReadyCallbacks) app.accountReadyCallbacks = []
          app.accountReadyCallbacks.push(resolve)
          // 超时兜底：5秒后不管有没有 openId 都继续
          setTimeout(resolve, 5000)
        })
      }

      const openId = app.globalData.openId || ''
      console.log('[invite] 准备调用云函数 inviteMember，openId:', openId ? '已获取' : '仍为空')

      // 调用云函数加入家庭（openId 由云函数从 wxContext 获取，前端传入仅作备用）
      const res = await wx.cloud.callFunction({
        name: 'inviteMember',
        data: {
          inviteCode: code,
          nickname: '',
          avatar: ''
        }
      })

      console.log('[invite] 云函数返回结果:', res)

      if (!res.result.success) {
        wx.hideLoading()
        wx.showModal({
          title: '加入失败',
          content: res.result.error || '邀请码无效',
          showCancel: false,
          success: () => {
            if (this.data.currentMode === 'input') {
              // 如果是输入模式，不清空输入框，让用户重试
            } else {
              wx.navigateBack()
            }
          }
        })
        return
      }

      const { memberId, familyId, familyName } = res.result.data

      // 更新全局数据
      await this._updateGlobalData(familyId)

      wx.hideLoading()

      // 弹出身份选择器
      this.setData({
        showIdentityPicker: true,
        newMemberId: memberId,
        joinedFamilyName: familyName
      })
    } catch (err) {
      wx.hideLoading()
      console.error('加入家庭失败:', err)
      wx.showToast({ title: '加入失败', icon: 'none' })
    }
  },

  // 更新全局数据（家庭、宝宝、成员）
  async _updateGlobalData(familyId) {
    try {
      // 更新全局家庭数据
      const familyRes = await cloud.getById('families', familyId)
      if (familyRes.success) {
        app.globalData.currentFamily = familyRes.data
      }

      // 加载该家庭的宝宝信息
      const babyRes = await cloud.queryOne('babies', { familyId })
      if (babyRes.success && babyRes.data) {
        app.globalData.currentBaby = babyRes.data
      }

      // 加载该家庭的所有成员（通过 login 云函数）
      const membersRes = await cloud.callFunction('login', { action: 'getMembers', familyId })
      if (membersRes.success && membersRes.data && membersRes.data.success && Array.isArray(membersRes.data.data)) {
        app.globalData.members = membersRes.data.data
        // 同时更新 globalData.member（刚加入的用户，无条件更新）
        const openId = app.globalData.openId
        const selfMember = membersRes.data.data.find(m => m.openId === openId)
        if (selfMember) {
          app.globalData.member = selfMember
        }
      }
    } catch (err) {
      console.error('更新全局数据失败:', err)
    }
  },

  // === 身份选择器 ===

  // 确认身份选择
  async onIdentityConfirm(e) {
    console.log('[invite] ===== onIdentityConfirm 被调用 =====')
    const { avatar, nickname, identity } = e.detail
    console.log('[invite] 解构后的数据:', { avatar, nickname, identity, newMemberId: this.data.newMemberId })

    try {
      wx.showLoading({ title: '保存中...', mask: true })

      // 清理头像路径
      const cleanAvatar = cleanAvatarPath(avatar)

      // 调用云函数更新（绕过数据库安全规则，支持被邀请者更新自己的信息）
      const updateRes = await wx.cloud.callFunction({
        name: 'updateMember',
        data: {
          memberId: this.data.newMemberId,
          avatar: cleanAvatar,
          nickname,
          identity
        }
      })
      console.log('[invite] 更新成员结果:', updateRes)

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

      // 同步更新 globalData.member（当前用户自己）
      if (app.globalData.member && app.globalData.member._id === this.data.newMemberId) {
        app.globalData.member = {
          ...app.globalData.member,
          avatar: cleanAvatar,
          nickname,
          identity
        }
      }

      wx.hideLoading()
      wx.showToast({ title: '加入成功！', icon: 'success' })

      // 跳转到首页
      setTimeout(() => {
        wx.switchTab({ url: '/pages/index/index' })
      }, 1500)

    } catch (err) {
      wx.hideLoading()
      console.error('[invite] 保存身份信息失败:', err)
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
    }
  },

  // 取消身份选择
  onIdentityCancel() {
    // 取消也跳转到首页，因为已经加入了家庭
    wx.switchTab({ url: '/pages/index/index' })
  },

  // 分享给家人（主动触发分享）
  shareInvite() {
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    })
  },

  // 复制邀请码
  copyCode() {
    if (!this.data.inviteCode) return
    wx.setClipboardData({
      data: this.data.inviteCode,
      success: () => {
        wx.showToast({ title: '已复制', icon: 'success' })
      }
    })
  },

  // 分享
  onShareAppMessage() {
    const family = app.globalData.currentFamily
    return {
      title: `邀请你加入"${family ? family.name : '宝贝日记'}"家庭`,
      path: `/pages/invite/invite?code=${this.data.inviteCode}`
    }
  }
})
