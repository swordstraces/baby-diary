// pages/add-record/add-record.js
const { RECORD_TYPE_CONFIG, RECORD_TYPES } = require('../../utils/constants')
const cloud = require('../../utils/cloud')
const { cleanAvatarPath } = require('../../utils/avatar')
const app = getApp()

Page({
  data: {
    recordType: 'feeding',
    recordTime: '',
    note: '',
    showNote: false,
    submitting: false,
    submitHint: '',
    formData: {},
    isEdit: false,
    editId: '',
    editData: null,

    // 类型列表
    typeList: Object.keys(RECORD_TYPE_CONFIG).map(key => ({
      type: key,
      ...RECORD_TYPE_CONFIG[key]
    })),

    // 当前类型配置
    currentConfig: RECORD_TYPE_CONFIG[RECORD_TYPES.FEEDING]
  },

  onLoad(options) {
    // 设置默认时间为当前时间
    const now = new Date()
    const timeStr = this._formatTime(now)
    this.setData({ recordTime: timeStr })

    // 如果有传入 type，切换到对应类型
    if (options.type) {
      this.setData({
        recordType: options.type,
        currentConfig: RECORD_TYPE_CONFIG[options.type]
      })
      // 动态设置导航栏标题
      wx.setNavigationBarTitle({
        title: '记录' + RECORD_TYPE_CONFIG[options.type].label
      })
    }

    // 如果有传入 id，进入编辑模式
    if (options.id) {
      this._loadRecord(options.id)
    }
  },

  // 切换记录类型
  switchType(e) {
    const type = e.currentTarget.dataset.type
    this.setData({
      recordType: type,
      currentConfig: RECORD_TYPE_CONFIG[type],
      submitHint: ''
    })
    wx.setNavigationBarTitle({
      title: '记录' + RECORD_TYPE_CONFIG[type].label
    })
  },

  // 时间变更
  onTimeChange(e) {
    this.setData({ recordTime: e.detail.value })
  },

  // 表单数据变更
  onFormChange(e) {
    this.setData({ formData: e.detail })
  },

  // 备注开关
  toggleNote() {
    this.setData({ showNote: !this.data.showNote })
  },

  // 备注输入
  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  // 提交记录
  async submitRecord() {
    // 获取表单组件实例并校验
    const form = this.selectComponent('#form')
    if (!form) {
      this.setData({ submitHint: '表单加载异常，请返回重试' })
      return
    }

    const validation = form.validate()
    if (!validation.valid) {
      this.setData({ submitHint: validation.message })
      return
    }

    if (this.data.submitting) return
    
    // 强制校验家庭与宝宝信息
    if (!app.globalData.currentFamily || !app.globalData.currentBaby) {
      this.setData({ submitHint: '请先进入“我的-家庭管理”创建或加入家庭' })
      wx.showModal({
        title: '缺少上下文',
        content: '记录需要关联家庭与宝宝，请先完成创建。',
        confirmText: '去创建',
        success: (res) => {
          if (res.confirm) wx.navigateTo({ url: '/pages/family/family' })
        }
      })
      return
    }

    this.setData({ submitting: true, submitHint: '' })

    try {
      const formData = form.getData()
      const now = new Date()

      // 构造完整时间：今天日期 + 选择的时间
      const [hours, minutes] = this.data.recordTime.split(':')
      const recordDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(),
        parseInt(hours), parseInt(minutes), 0)

      const record = {
        type: this.data.recordType,
        data: formData,
        note: this.data.note || '',
        recordTime: recordDate.toISOString(),
        operatorId: app.globalData.openId || '',
        ...(await this._getOperatorInfo())
      }

      if (this.data.isEdit) {
        // 编辑模式
        const res = await cloud.update('records', this.data.editId, record)
        if (!res.success) throw new Error(res.error)
        wx.showToast({ title: '修改成功', icon: 'success' })
      } else {
        // 新建模式
        if (app.globalData.currentFamily) {
          record.familyId = app.globalData.currentFamily._id
        }
        if (app.globalData.currentBaby) {
          record.babyId = app.globalData.currentBaby._id
        }
        const res = await cloud.add('records', record)
        if (!res.success) throw new Error(res.error)
        wx.showToast({ title: '记录成功', icon: 'success' })
      }

      // 延迟返回
      setTimeout(() => {
        wx.navigateBack()
      }, 800)

    } catch (err) {
      console.error('提交记录失败:', err)
      this.setData({
        submitting: false,
        submitHint: '保存失败，请重试'
      })
    }
  },

  // 加载已有记录（编辑模式）
  async _loadRecord(id) {
    try {
      wx.showLoading({ title: '加载中...' })
      const res = await cloud.getById('records', id)
      const record = res.success ? res.data : null
      if (record) {
        const typeConfig = RECORD_TYPE_CONFIG[record.type]
        const recordDate = new Date(record.recordTime)
        this.setData({
          isEdit: true,
          editId: id,
          recordType: record.type,
          currentConfig: typeConfig,
          editData: record.data,
          note: record.note || '',
          showNote: !!record.note,
          recordTime: this._formatTime(recordDate)
        })
        wx.setNavigationBarTitle({ title: '编辑' + typeConfig.label })
      }
    } catch (err) {
      console.error('加载记录失败:', err)
      wx.showToast({ title: '加载失败', icon: 'none' })
    } finally {
      wx.hideLoading()
    }
  },

  // 获取记录者信息（头像、昵称、身份）
  async _getOperatorInfo() {
    // 优先从 globalData.member 读取（由 app._initAccount 通过 login 云函数获取）
    // 前端直接查 members 集合会被安全规则拦截，被邀请者查不到自己
    const member = app.globalData.member
    if (member) {
      const cleanAvatar = cleanAvatarPath(member.avatar)
      return {
        operatorName: member.nickname || '家庭成员',
        identity: member.identity || '',
        operatorAvatar: cleanAvatar
      }
    }

    return { operatorName: '家庭成员', identity: '', operatorAvatar: '' }
  },

  // 格式化时间 HH:mm
  _formatTime(date) {
    const h = date.getHours().toString().padStart(2, '0')
    const m = date.getMinutes().toString().padStart(2, '0')
    return `${h}:${m}`
  }
})
