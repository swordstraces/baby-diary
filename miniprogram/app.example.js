// app.js - 小程序入口
App({
  // globalData 定义在顶层，确保任何时刻都可以安全访问
  globalData: {
    userInfo: null,
    openId: '',
    currentFamily: null,
    currentBaby: null,
    members: [],
    darkMode: false
  },

  onLaunch: function () {
    // 云初始化放到下一个事件循环，避免阻塞首屏
    this._cloudReady = false
    this._cloudInitPromise = new Promise((resolve) => {
      setTimeout(() => {
        // 必须检查 wx.cloud.init 是真正的函数（cloud SDK 未注入时可能只是空壳）
        if (!wx.cloud || typeof wx.cloud.init !== 'function') {
          console.warn('[app] cloud SDK 不可用，跳过云初始化')
          resolve()
          return
        }
        try {
          wx.cloud.init({
            env: 'YOUR_CLOUD_ENV_ID_HERE',
            traceUser: false
          })
          this._cloudReady = true
          console.log('[app] 云开发初始化成功')
          resolve()  // wx.cloud.init 已完成，云 SDK 可用，立即 resolve
          this._initAccount()  // 后台异步执行账户初始化
        } catch (e) {
          console.error('[app] 云开发初始化失败', e)
          resolve()
        }
      }, 0)
    })

    // 主题检测同样延后，避免个别基础库在启动瞬间同步调用异常
    setTimeout(() => {
      try {
        const appInfo = wx.getAppBaseInfo ? wx.getAppBaseInfo() : null
        if (appInfo && appInfo.theme) {
          this.globalData.darkMode = appInfo.theme === 'dark'
        }
      } catch (e) {
        console.log('获取主题信息失败', e)
      }
      try {
        wx.onThemeChange((result) => {
          this.globalData.darkMode = result.theme === 'dark'
        })
      } catch (e) {
        console.log('onThemeChange 不支持', e)
      }
    }, 0)

    this._loadLocalSettings()
  },

  /**
   * 自动初始化账户信息（家庭、宝宝）
   */
  async _initAccount() {
    const cloud = require('./utils/cloud')
    try {
      // 1. 获取 OpenID
      let openId = this.globalData.openId
      if (!openId) {
        openId = await cloud.getOpenId()
        this.globalData.openId = openId
      }
      if (!openId) return

      // 2. 查找所属家庭成员记录
      const memberRes = await cloud.queryOne('members', { openId })
      if (memberRes.success && memberRes.data) {
        const familyId = memberRes.data.familyId

        // 3. 同时拉取家庭、宝宝和所有成员信息
        const [familyRes, babyRes, membersRes] = await Promise.all([
          cloud.getById('families', familyId),
          cloud.queryOne('babies', { familyId }),
          cloud.query('members', { familyId }, { pageSize: 50 })
        ])

        if (familyRes.success && familyRes.data) this.globalData.currentFamily = familyRes.data
        if (babyRes.success && babyRes.data) this.globalData.currentBaby = babyRes.data
        if (membersRes.success && membersRes.data) this.globalData.members = membersRes.data

        console.log('[app] 账户信息预载完成')
      }
    } catch (err) {
      console.error('[app] 自动初始化账户失败:', err)
    } finally {
      // 通知感兴趣的页面：初始化已尽可能完成
      // 优先使用数组回调机制，兼容旧的单回调方式
      if (this.accountReadyCallbacks && this.accountReadyCallbacks.length) {
        this.accountReadyCallbacks.forEach(cb => {
          try { cb() } catch (e) { console.error('[app] accountReadyCallback 执行失败:', e) }
        })
      }
      if (this.accountReadyCallback) {
        try { this.accountReadyCallback() } catch (e) { console.error('[app] accountReadyCallback 执行失败:', e) }
      }
    }
  },

  /**
   * 加载本地缓存的设置
   */
  _loadLocalSettings() {
    try {
      const settings = wx.getStorageSync('userSettings')
      if (settings) {
        if (settings.familyId) {
          this.globalData.familyId = settings.familyId
        }
        if (settings.babyId) {
          this.globalData.babyId = settings.babyId
        }
      }
    } catch (e) {
      console.error('读取本地设置失败', e)
    }
  },

  /**
   * 保存设置到本地缓存
   */
  saveSettings(data) {
    try {
      const settings = wx.getStorageSync('userSettings') || {}
      Object.assign(settings, data)
      wx.setStorageSync('userSettings', settings)
    } catch (e) {
      console.error('保存本地设置失败', e)
    }
  },

  /**
   * 获取全局数据
   */
  getGlobalData() {
    return this.globalData
  }
})
