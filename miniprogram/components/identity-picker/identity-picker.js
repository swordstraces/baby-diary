// components/identity-picker/identity-picker.js
const cloud = require('../../utils/cloud')
const { cleanAvatarPath, resolveAvatarUrl } = require('../../utils/avatar')
const { IDENTITY_OPTIONS, IDENTITY_LABELS, IDENTITY_FULL_LABELS } = require('../../utils/constants')

Component({
  options: {
    multipleSlots: true
  },

  properties: {
    show: {
      type: Boolean,
      value: false
    },
    // 初始值（用于编辑模式）
    initialAvatar: {
      type: String,
      value: ''
    },
    initialNickname: {
      type: String,
      value: ''
    },
    initialIdentity: {
      type: String,
      value: ''
    }
  },

  data: {
    avatarUrl: '',
    nickname: '',
    avatarTempPath: '', // 头像临时路径，需要上传到云存储
    identityOptions: IDENTITY_OPTIONS,
    selectedIdentityValue: '',
    selectedIdentityLabel: '',
    selectedIndex: -1
  },

  observers: {
    'show': function(show) {
      if (show) {
        // 打开选择器时，初始化数据
        const rawAvatar = cleanAvatarPath(this.properties.initialAvatar)
        const nickname = this.properties.initialNickname || ''
        const identityValue = this.properties.initialIdentity || ''
        const selectedIndex = IDENTITY_OPTIONS.findIndex(item => item.value === identityValue)
        const selectedIdentityLabel = identityValue ? (IDENTITY_FULL_LABELS[identityValue] || '') : ''

        this.setData({
          avatarUrl: '',
          nickname,
          selectedIdentityValue: identityValue,
          selectedIdentityLabel,
          selectedIndex: selectedIndex >= 0 ? selectedIndex : -1
        })

        // 异步转换 cloud:// → https://（自定义组件中 cloud:// 会被当相对路径）
        if (rawAvatar && rawAvatar.startsWith('cloud://')) {
          resolveAvatarUrl(rawAvatar).then(url => {
            this.setData({ avatarUrl: url })
          })
        } else if (rawAvatar) {
          this.setData({ avatarUrl: rawAvatar })
        }
      }
    }
  },

  methods: {
    // 阻止冒泡
    stopPropagation() {},

    // 选择头像
    onChooseAvatar(e) {
      console.log('[identity-picker] 开始选择头像', e.detail)
      const { avatarUrl } = e.detail

      // 检查 avatarUrl 是否有效
      if (!avatarUrl) {
        console.warn('[identity-picker] 头像 URL 为空')
        wx.showToast({ title: '选择头像失败，将使用默认头像', icon: 'none' })
        return
      }

      this.setData({
        avatarTempPath: avatarUrl,
        avatarUrl
      })

      console.log('[identity-picker] 头像设置成功:', avatarUrl)
    },

    // 输入昵称
    onNicknameInput(e) {
      this.setData({
        nickname: e.detail.value
      })
    },

    // 选择身份
    onIdentityChange(e) {
      const index = e.detail.value
      const identityValue = IDENTITY_OPTIONS[index].value
      this.setData({
        selectedIndex: index,
        selectedIdentityValue: identityValue,
        selectedIdentityLabel: IDENTITY_FULL_LABELS[identityValue] || ''
      })
    },

    // 取消
    onCancel() {
      this.resetData()
      this.triggerEvent('cancel')
    },

    // 确认
    async onConfirm() {
      // 验证
      if (!this.data.nickname) {
        wx.showToast({ title: '请输入昵称', icon: 'none' })
        return
      }

      if (!this.data.selectedIdentityValue) {
        wx.showToast({ title: '请选择身份', icon: 'none' })
        return
      }

      wx.showLoading({ title: '保存中...', mask: true })

      try {
        // 如果选择了头像，先上传到云存储
        let avatarCloudUrl = this.data.avatarUrl || ''  // 默认使用当前的 avatarUrl（可能是云存储路径）
        if (this.data.avatarTempPath) {
          console.log('[identity-picker] 开始上传头像:', this.data.avatarTempPath)
          
          try {
            const cloudPath = `avatars/${Date.now()}-${Math.random().toString(36).substr(2, 8)}.jpg`
            const uploadRes = await cloud.uploadFile(cloudPath, this.data.avatarTempPath)
            
            if (uploadRes.success) {
              avatarCloudUrl = uploadRes.data
              // 更新 avatarUrl 为云存储路径，用于显示
              this.setData({ avatarUrl: avatarCloudUrl })
              console.log('[identity-picker] 头像上传成功:', avatarCloudUrl)
            } else {
              console.error('[identity-picker] 头像上传失败:', uploadRes.error)
              wx.showToast({ title: '头像上传失败，将使用默认头像', icon: 'none' })
              // 上传失败仍然继续，使用空头像（会显示默认表情）
            }
          } catch (uploadErr) {
            console.error('[identity-picker] 头像上传异常:', uploadErr)
            // 模拟器中可能出现 ENOENT 错误，捕获后继续执行
            // 真机上通常不会出现这个问题
          }
        }

        wx.hideLoading()

        // 清理头像路径
        const cleanAvatarCloudUrl = cleanAvatarPath(avatarCloudUrl)

        console.log('[identity-picker] 触发确认事件:', {
          hasAvatar: !!avatarCloudUrl,
          nickname: this.data.nickname,
          identity: this.data.selectedIdentityValue,
          originalAvatarUrl: avatarCloudUrl,
          cleanAvatarUrl: cleanAvatarCloudUrl
        })

        // 触发确认事件
        this.triggerEvent('confirm', {
          avatar: cleanAvatarCloudUrl,
          nickname: this.data.nickname,
          identity: this.data.selectedIdentityValue
        })

        // 重置数据
        this.resetData()

      } catch (err) {
        wx.hideLoading()
        console.error('[identity-picker] 保存失败:', err)
        wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      }
    },

    // 重置数据
    resetData() {
      this.setData({
        avatarUrl: '',
        nickname: '',
        avatarTempPath: '',
        selectedIdentityValue: '',
        selectedIndex: -1
      })
    }
  }
})
