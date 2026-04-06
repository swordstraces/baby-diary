// pages/identity-edit/identity-edit.js
const cloud = require('../../utils/cloud')
const { cleanAvatarPath, resolveAvatarUrl } = require('../../utils/avatar')
const { IDENTITY_OPTIONS, IDENTITY_LABELS } = require('../../utils/constants')
const app = getApp()

Page({
  data: {
    avatarUrl: '',
    avatarTempPath: '', // 临时头像路径
    nickname: '',
    identityOptions: IDENTITY_OPTIONS,
    selectedIndex: 0,
    selectedIdentityLabel: '',
    memberId: null,
    uploading: false
  },

  onLoad() {
    this._loadMemberInfo()
  },

  // 加载当前成员信息
  async _loadMemberInfo() {
    const openId = app.globalData.openId

    if (!openId) {
      wx.showToast({ title: '请先创建或加入家庭', icon: 'none' })
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
      return
    }

    // 优先从 globalData.member 读取（由 login 云函数获取）
    // 前端直接查 members 集合会被安全规则拦截
    const member = app.globalData.member
    if (member) {
      const identity = member.identity || ''

      // 查找身份对应的索引
      const index = IDENTITY_OPTIONS.findIndex(opt => opt.value === identity)
      const defaultIndex = index >= 0 ? index : 0

      // 转换头像 cloud:// → https://
      const avatarUrl = await resolveAvatarUrl(member.avatar)

      this.setData({
        memberId: member._id,
        avatarUrl,
        nickname: member.nickname || '',
        selectedIndex: defaultIndex,
        selectedIdentityLabel: identity ? IDENTITY_LABELS[identity] : ''
      })
    } else {
      wx.showToast({ title: '请先创建或加入家庭', icon: 'none' })
      setTimeout(() => { wx.navigateBack() }, 1500)
    }
  },

  // 选择头像
  onChooseAvatar(e) {
    console.log('[identity-edit] 选择头像', e.detail)
    const avatarUrl = e.detail.avatarUrl

    if (!avatarUrl) {
      wx.showToast({ title: '选择头像失败', icon: 'none' })
      return
    }

    this.setData({
      avatarTempPath: avatarUrl
    })

    // 立即上传头像
    this._uploadAvatar(avatarUrl)
  },

  // 上传头像到云存储
  async _uploadAvatar(filePath) {
    if (this.data.uploading) {
      return
    }

    this.setData({ uploading: true })

    try {
      const cloudPath = `avatars/${Date.now()}_${Math.random().toString(36).substr(2, 9)}.jpg`

      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath
      })

      if (uploadRes.fileID) {
        this.setData({ avatarUrl: uploadRes.fileID })
        console.log('[identity-edit] 头像上传成功:', uploadRes.fileID)
      } else {
        throw new Error('上传失败：未返回 fileID')
      }
    } catch (err) {
      console.error('[identity-edit] 头像上传失败:', err)
      wx.showToast({ title: '上传失败', icon: 'none' })
    } finally {
      this.setData({ uploading: false })
    }
  },

  // 输入昵称
  onNicknameInput(e) {
    this.setData({ nickname: e.detail.value })
  },

  // 选择身份
  onIdentityChange(e) {
    const index = e.detail.value
    const selected = IDENTITY_OPTIONS[index]
    this.setData({
      selectedIndex: index,
      selectedIdentityLabel: selected.label
    })
  },

  // 保存
  async onSave() {
    const { memberId, avatarUrl, nickname, selectedIndex, uploading } = this.data

    // 验证必填项
    if (!nickname.trim()) {
      wx.showToast({ title: '请输入昵称', icon: 'none' })
      return
    }

    if (uploading) {
      wx.showToast({ title: '头像上传中，请稍候', icon: 'none' })
      return
    }

    const selectedIdentity = IDENTITY_OPTIONS[selectedIndex]
    if (!selectedIdentity) {
      wx.showToast({ title: '请选择身份', icon: 'none' })
      return
    }

    try {
      wx.showLoading({ title: '保存中...' })

      const updateData = {
        nickname: nickname.trim(),
        identity: selectedIdentity.value
      }

      // 如果有上传了头像，也更新头像
      if (avatarUrl) {
        updateData.avatar = cleanAvatarPath(avatarUrl)
      }

      // 改用云函数更新，绕过数据库安全规则权限限制
      const updateRes = await wx.cloud.callFunction({
        name: 'updateMember',
        data: {
          memberId,
          ...updateData
        }
      })

      if (!updateRes.result || !updateRes.result.success) {
        throw new Error(updateRes.result && updateRes.result.error || '更新失败')
      }

      // 同步更新 globalData.member（避免其他页面读到旧数据）
      if (app.globalData.member && app.globalData.member._id === memberId) {
        app.globalData.member = {
          ...app.globalData.member,
          ...updateData
        }
      }

      wx.hideLoading()
      wx.showToast({ title: '保存成功', icon: 'success' })

      // 返回上一页
      setTimeout(() => {
        wx.navigateBack()
      }, 1500)
    } catch (err) {
      wx.hideLoading()
      console.error('[identity-edit] 保存失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  }
})
