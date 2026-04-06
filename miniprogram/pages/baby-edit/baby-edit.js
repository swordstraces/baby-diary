// pages/baby-edit/baby-edit.js
const cloud = require('../../utils/cloud')
const { resolveAvatarUrl } = require('../../utils/avatar')
const app = getApp()

Page({
  data: {
    name: '',
    gender: 'male',
    birthday: '',
    avatarUrl: '',
    saving: false,
    today: '',
    genderEmoji: '👦',
    babyId: ''
  },

  onLoad() {
    const now = new Date()
    const today = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')}`
    this.setData({ today })

    // 加载已有宝宝信息
    const baby = app.globalData.currentBaby
    if (baby && baby._id) {
      // 异步转换头像 URL
      const avatarUrl = baby.avatarUrl || ''
      if (avatarUrl.startsWith('cloud://')) {
        resolveAvatarUrl(avatarUrl).then(url => {
          this.setData({ avatarUrl: url })
        })
      }
      this.setData({
        babyId: baby._id,
        name: baby.name || '',
        gender: baby.gender || 'male',
        birthday: baby.birthday || '',
        avatarUrl: avatarUrl.startsWith('cloud://') ? '' : avatarUrl,
        genderEmoji: baby.gender === 'female' ? '👧' : '👦'
      })
    }
  },

  onNameInput(e) { this.setData({ name: e.detail.value }) },

  setGender(e) {
    const gender = e.currentTarget.dataset.val
    this.setData({
      gender,
      genderEmoji: gender === 'female' ? '👧' : '👦'
    })
  },

  onBirthdayChange(e) { this.setData({ birthday: e.detail.value }) },

  chooseAvatar() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempPath = res.tempFiles[0].tempFilePath
        wx.showLoading({ title: '上传中...', mask: true })

        // 上传到云存储
        const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).substr(2, 8)}.jpg`
        cloud.uploadFile(cloudPath, tempPath).then(res => {
          wx.hideLoading()
          if (res.success) {
            this.setData({ avatarUrl: res.data })
            wx.showToast({ title: '头像上传成功', icon: 'success' })
          } else {
            wx.showToast({ title: '上传失败', icon: 'none' })
          }
        }).catch(err => {
          wx.hideLoading()
          console.error('上传头像失败:', err)
          wx.showToast({ title: '上传失败', icon: 'none' })
        })
      }
    })
  },

  async saveBaby() {
    const { name, gender, birthday, avatarUrl, babyId } = this.data

    if (!name.trim()) {
      wx.showToast({ title: '请输入宝宝姓名', icon: 'none' })
      return
    }
    if (!birthday) {
      wx.showToast({ title: '请选择出生日期', icon: 'none' })
      return
    }

    this.setData({ saving: true })

    const familyId = app.globalData.currentFamily ? app.globalData.currentFamily._id : ''
    const babyData = {
      name: name.trim(),
      gender,
      birthday,
      avatarUrl,
      familyId
    }

    try {
      if (babyId) {
        // 更新
        await cloud.update('babies', babyId, babyData)
      } else {
        // 新建
        const res = await cloud.add('babies', babyData)
        if (res.success) {
          babyData._id = res.data._id
        }
      }

      // 更新全局数据
      app.globalData.currentBaby = { ...babyData, _id: babyId || babyData._id }
      wx.showToast({ title: '保存成功', icon: 'success' })
      setTimeout(() => wx.navigateBack(), 800)
    } catch (err) {
      console.error('保存宝宝信息失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    } finally {
      this.setData({ saving: false })
    }
  }
})
