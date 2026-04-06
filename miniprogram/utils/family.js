/**
 * family.js - 家庭管理工具
 * 当前家庭信息缓存、成员判断
 */

const { query, getById } = require('./cloud')
const { FAMILY_ROLES } = require('./constants')

/**
 * 获取用户的家庭信息（含缓存）
 * 通过 login 云函数获取成员信息（云函数有管理员权限，不受前端安全规则限制）
 */
async function getFamilyInfo(openId) {
  // 通过云函数查询，避免前端安全规则拦截
  const { callFunction, getById } = require('./cloud')
  try {
    const loginRes = await callFunction('login')
    if (loginRes.success && loginRes.data && loginRes.data.member) {
      const member = loginRes.data.member
      const familyRes = await getById('families', member.familyId)
      if (familyRes.success) {
        return { family: familyRes.data, member }
      }
    }
  } catch (err) {
    console.error('[family] getFamilyInfo 失败:', err)
  }
  return null
}

/**
 * 获取家庭所有成员（通过 login 云函数，不受前端安全规则限制）
 */
async function getFamilyMembers(familyId) {
  const { callFunction } = require('./cloud')
  const res = await callFunction('login', { action: 'getMembers', familyId })
  // cloud.callFunction 返回 { success, data: 云函数result }
  // login getMembers 返回 { success, data: [] }
  if (res.success && res.data && res.data.success && Array.isArray(res.data.data)) {
    return res.data.data
  }
  return []
}

/**
 * 获取家庭宝宝信息
 */
async function getFamilyBabies(familyId) {
  const res = await query('babies', { familyId }, { pageSize: 10 })
  if (res.success) {
    return res.data
  }
  return []
}

/**
 * 缓存家庭信息到本地
 */
function cacheFamilyInfo(familyInfo) {
  try {
    wx.setStorageSync('currentFamily', familyInfo)
  } catch (e) {
    console.error('[family] 缓存家庭信息失败:', e)
  }
}

/**
 * 从本地缓存获取家庭信息
 */
function getCachedFamilyInfo() {
  try {
    return wx.getStorageSync('currentFamily')
  } catch (e) {
    return null
  }
}

module.exports = {
  getFamilyInfo,
  getFamilyMembers,
  getFamilyBabies,
  cacheFamilyInfo,
  getCachedFamilyInfo
}
