// components/member-card/member-card.js
const { cleanAvatarPath, resolveAvatarUrl } = require('../../utils/avatar')
const { IDENTITY_LABELS, IDENTITY_OPTIONS } = require('../../utils/constants')

Component({
  properties: {
    member: { type: Object, value: {} },
    isOwner: { type: Boolean, value: false },
    currentOpenId: { type: String, value: '' }
  },

  data: {
    identityLabel: '未设置身份',
    isCurrentUser: false,
    cleanAvatar: ''  // 可直接用于 <image src> 的 URL
  },

  observers: {
    'member.identity': function(identity) {
      let label = '未设置身份'
      if (identity && IDENTITY_LABELS[identity]) {
        label = IDENTITY_LABELS[identity]
      }
      this.setData({ identityLabel: label })
    },
    'member, currentOpenId': function(member, currentOpenId) {
      const isCurrentUser = !!(member && member.openId && currentOpenId && member.openId === currentOpenId)

      // 先清空头像，避免旧的 cloud:// 路径在组件里被渲染
      this.setData({ isCurrentUser, cleanAvatar: '' })

      // 异步转 https://（自定义组件中 cloud:// 会被渲染层当相对路径）
      const rawAvatar = member && member.avatar ? member.avatar : ''
      if (rawAvatar) {
        resolveAvatarUrl(rawAvatar).then(url => {
          if (url) this.setData({ cleanAvatar: url })
        })
      }
    }
  },

  methods: {
    // 编辑成员身份（管理员）
    onEdit() {
      if (!this.data.isOwner) return
      this.triggerEvent('edit', { memberId: this.data.member._id, member: this.data.member })
    },

    // 移除成员（管理员）
    onRemove() {
      if (!this.data.isOwner) return
      this.triggerEvent('remove', { memberId: this.data.member._id })
    }
  }
})
