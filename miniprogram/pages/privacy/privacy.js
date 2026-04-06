// pages/privacy/privacy.js
Page({
  data: {
    // 隐私政策版本号
    version: '1.0.0',
    // 更新日期（自动取当前日期）
    updateDate: new Date().toISOString().split('T')[0],
  },

  onLoad() {
    wx.setNavigationBarTitle({
      title: '隐私政策'
    });
  },

  // 复制邮箱地址
  copyEmail() {
    wx.setClipboardData({
      data: 'support@babytracker.com',
      success: () => {
        wx.showToast({
          title: '已复制邮箱地址',
          icon: 'success'
        });
      }
    });
  },
});
