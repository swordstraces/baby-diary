/**
 * avatar.js - 头像路径工具
 * 1. 清理错误的路径前缀
 * 2. 自定义组件中 cloud:// 会被当相对路径，需转 https://
 * 3. 通过云函数 getTempFileURL（云函数有管理员权限，不受存储安全规则限制）
 */

const cloud = require('./cloud')

/**
 * 清理头像路径（同步）
 * 移除可能存在的错误前缀，返回干净的 cloud:// 或其他路径
 */
function cleanAvatarPath(avatar) {
  if (!avatar) return ''
  let clean = avatar

  const cloudMatch = clean.match(/(cloud:\/\/[^\s]+)/)
  if (cloudMatch) {
    return cloudMatch[1]
  }

  clean = clean.replace(/^\/pages\/[^/]+\//, '')
  if (clean.startsWith('/')) {
    clean = clean.replace(/^\//, '')
  }
  return clean
}

// 缓存 cloud:// → https:// 的映射，避免重复调用
const _urlCache = {}

// 批量请求的节流：多个 cloud:// 路径合并为一次云函数调用
let _pendingBatch = null
let _batchTimer = null

function _getFromBatch(fileID) {
  // 如果有正在进行的批量请求，加入队列
  if (_pendingBatch) {
    clearTimeout(_batchTimer)
    return new Promise((resolve) => {
      _pendingBatch.push({ fileID, resolve })
      // 50ms 内没有新的请求就发送
      _batchTimer = setTimeout(_flushBatch, 50)
    })
  }
  return null
}

async function _flushBatch() {
  const batch = _pendingBatch
  _pendingBatch = null
  _batchTimer = null
  if (!batch || !batch.length) return

  // 去重
  const uniqueIDs = [...new Set(batch.map(b => b.fileID))]
  const alreadyCached = {}
  const toRequest = []
  for (const id of uniqueIDs) {
    if (_urlCache[id]) {
      alreadyCached[id] = _urlCache[id]
    } else {
      toRequest.push(id)
    }
  }

  // 如果全部命中缓存，直接返回
  if (toRequest.length === 0) {
    for (const item of batch) {
      item.resolve(alreadyCached[item.fileID] || '')
    }
    return
  }

  // 通过云函数调用 getTempFileURL（管理员权限，不受存储安全规则限制）
  try {
    const res = await cloud.callFunction('login', { action: 'getAvatarUrls', fileList: toRequest })
    const urls = (res && res.success && res.data && res.data.urls) ? res.data.urls : {}
    // 写入缓存
    for (const [id, url] of Object.entries(urls)) {
      _urlCache[id] = url
    }
    for (const item of batch) {
      item.resolve(_urlCache[item.fileID] || alreadyCached[item.fileID] || '')
    }
  } catch (err) {
    console.warn('[avatar] batch getAvatarUrls failed:', err)
    for (const item of batch) {
      item.resolve(alreadyCached[item.fileID] || '')
    }
  }
}

/**
 * 解析头像为可用的 URL（异步）
 * 在自定义组件中使用：cloud:// 会被渲染层当相对路径，必须转成 https://
 * @param {string} avatar - 原始头像路径
 * @returns {Promise<string>} 可直接用于 <image src> 的 URL（保证不以 cloud:// 开头）
 */
function resolveAvatarUrl(avatar) {
  const clean = cleanAvatarPath(avatar)
  if (!clean) return Promise.resolve('')

  // 已经是 https:// 开头，直接返回
  if (clean.startsWith('https://') || clean.startsWith('http://')) {
    return Promise.resolve(clean)
  }

  // cloud:// 路径需要转 https://
  if (clean.startsWith('cloud://')) {
    // 命中缓存直接返回
    if (_urlCache[clean]) {
      return Promise.resolve(_urlCache[clean])
    }
    // 尝试加入批量请求
    const batchResult = _getFromBatch(clean)
    if (batchResult) return batchResult

    // 第一个请求，创建批量队列
    _pendingBatch = [{ fileID: clean, resolve: null }]
    // 创建一个 Promise 等待批量结果
    const promise = new Promise((resolve) => {
      _pendingBatch[0].resolve = resolve
      _batchTimer = setTimeout(_flushBatch, 50)
    })
    return promise
  }

  return Promise.resolve(clean)
}

module.exports = { cleanAvatarPath, resolveAvatarUrl }
