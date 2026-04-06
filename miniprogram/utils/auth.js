/**
 * auth.js - 用户授权管理
 * 登录、获取openId、权限校验
 */

const { callFunction } = require('./cloud')

/**
 * 获取用户openId（通过云函数）
 */
async function getOpenId() {
  try {
    const res = await callFunction('login')
    if (res.success && res.data && res.data.openid) return res.data.openid
    return ''
  } catch (err) {
    console.error('[auth] 获取openId失败:', err)
    return wx.getStorageSync('openId') || ''
  }
}

/**
 * 获取用户信息（头像、昵称）
 * 注意：微信新版getUserInfo需要用户主动点击按钮触发
 */
async function getUserProfile() {
  return new Promise((resolve) => {
    wx.getUserProfile({
      desc: '用于完善宝宝记录中的操作人信息',
      success: (res) => {
        resolve({ success: true, data: res.userInfo })
      },
      fail: (err) => {
        console.error('[auth] getUserProfile失败:', err)
        resolve({ success: false, error: err })
      }
    })
  })
}

/**
 * 检查用户是否已加入家庭
 * 通过 login 云函数获取（云函数有管理员权限，不受前端安全规则限制）
 */
async function checkUserFamily(openId) {
  try {
    const res = await callFunction('login')
    if (res.success && res.data && res.data.member) {
      const member = res.data.member
      return {
        joined: true,
        familyId: member.familyId,
        role: member.role,
        memberInfo: member
      }
    }
    return { joined: false }
  } catch (err) {
    console.error('[auth] checkUserFamily 失败:', err)
    return { joined: false }
  }
}

/**
 * 检查是否为家庭管理员
 */
function isAdmin(memberInfo) {
  return memberInfo && memberInfo.role === 'admin'
}

module.exports = {
  getOpenId,
  getUserProfile,
  checkUserFamily,
  isAdmin
}
