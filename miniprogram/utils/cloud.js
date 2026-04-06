/**
 * cloud.js - 云开发SDK封装
 * 数据库CRUD操作、文件上传、统一错误处理
 *
 * 重要：db 和 command 完全内部化，不通过 module.exports 暴露
 * 所有需要 command 的查询操作都封装在本模块内部
 */

// ===== 懒初始化 =====
let _db = null
let _cmd = null

async function waitForCloudInit() {
  try {
    const app = getApp()
    // 云 SDK 已初始化，快速返回（避免与 _initAccount 形成循环等待）
    if (app && app._cloudReady) return
    // 云尚未初始化，等待 init promise 完成
    if (app && app._cloudInitPromise) await app._cloudInitPromise
  } catch (e) {}
}

function getDb() {
  if (!_db) {
    // 安全检查：确保 wx.cloud 已初始化
    if (!wx.cloud) {
      console.error('[cloud] wx.cloud 不可用，请检查基础库版本')
      return null
    }
    try {
      _db = wx.cloud.database()
      _cmd = _db.command
    } catch (err) {
      console.error('[cloud] 获取数据库实例失败:', err)
      return null
    }
  }
  return _db
}

function getCmd() {
  if (!_cmd) {
    getDb()
  }
  return _cmd
}

// 只暴露纯函数引用，不暴露任何 getter
module.exports = {
  add, getById, query, queryOne, update, remove, count,
  queryByDateRange, getOpenId,
  aggregateByDate, watchCollection,
  uploadFile, deleteFile, callFunction
}

// ===== 账户与权限 =====

/**
 * 获取当前用户的 OpenID
 */
async function getOpenId() {
  try {
    const res = await callFunction('login')
    // 云函数 login 返回 { openid, appid, unionid }
    if (res.success && res.data) {
      return res.data.openid || ''
    }
    return ''
  } catch (err) {
    console.error('[cloud] getOpenId 失败:', err)
    return ''
  }
}

// ===== 通用操作 =====

async function add(collection, data) {
  try {
    await waitForCloudInit()
    const db = getDb()
    if (!db) return { success: false, error: '数据库未初始化' }
    
    // 拷贝数据对象，避免修改原始对象
    const docData = Object.assign({}, data)
    docData.createTime = db.serverDate()
    docData.updateTime = db.serverDate()
    
    const res = await db.collection(collection).add({ data: docData })
    return { success: true, data: res }
  } catch (err) {
    console.error(`[cloud] add ${collection} 失败:`, err)
    return { success: false, error: err }
  }
}

async function getById(collection, id) {
  try {
    await waitForCloudInit()
    const db = getDb()
    if (!db) return { success: false, error: '数据库未初始化' }
    const res = await db.collection(collection).doc(id).get()
    return { success: true, data: res.data }
  } catch (err) {
    console.error(`[cloud] getById ${collection}/${id} 失败:`, err)
    return { success: false, error: err }
  }
}

async function query(collection, where = {}, options = {}) {
  try {
    await waitForCloudInit()
    const db = getDb()
    if (!db) return { success: false, error: '数据库未初始化' }
    const { page = 1, pageSize = 20, orderBy = 'createTime', order = 'desc' } = options
    const skip = (page - 1) * pageSize

    const res = await db.collection(collection)
      .where(where)
      .orderBy(orderBy, order)
      .skip(skip)
      .limit(pageSize)
      .get()

    return {
      success: true,
      data: res.data,
      page,
      pageSize,
      // 用返回条数推断是否还有更多（无需额外 count() 请求）
      hasMore: res.data.length === pageSize
    }
  } catch (err) {
    console.error(`[cloud] query ${collection} 失败:`, err)
    return { success: false, error: err }
  }
}

async function queryOne(collection, where = {}) {
  try {
    await waitForCloudInit()
    const db = getDb()
    if (!db) return { success: false, error: '数据库未初始化' }
    const res = await db.collection(collection).where(where).limit(1).get()
    if (res.data && res.data.length > 0) {
      return { success: true, data: res.data[0] }
    }
    return { success: true, data: null }
  } catch (err) {
    console.error(`[cloud] queryOne ${collection} 失败:`, err)
    return { success: false, error: err }
  }
}

async function update(collection, id, data) {
  try {
    await waitForCloudInit()
    const db = getDb()
    if (!db) return { success: false, error: '数据库未初始化' }
    data.updateTime = db.serverDate()
    const res = await db.collection(collection).doc(id).update({ data })
    return { success: true, data: res }
  } catch (err) {
    console.error(`[cloud] update ${collection}/${id} 失败:`, err)
    return { success: false, error: err }
  }
}

async function remove(collection, id) {
  try {
    await waitForCloudInit()
    const db = getDb()
    if (!db) return { success: false, error: '数据库未初始化' }
    const res = await db.collection(collection).doc(id).remove()
    return { success: true, data: res }
  } catch (err) {
    console.error(`[cloud] remove ${collection}/${id} 失败:`, err)
    return { success: false, error: err }
  }
}

async function count(collection, where = {}) {
  try {
    await waitForCloudInit()
    const db = getDb()
    if (!db) return { success: false, error: '数据库未初始化' }
    const res = await db.collection(collection).where(where).count()
    return { success: true, data: res.total }
  } catch (err) {
    console.error(`[cloud] count ${collection} 失败:`, err)
    return { success: false, error: err }
  }
}

// ===== 日期范围查询（command 操作完全封装在内部） =====

/**
 * 按日期范围查询记录
 * @param {string} collection - 集合名
 * @param {object} baseWhere - 基础查询条件（如 {familyId, babyId}）
 * @param {string} dateField - 日期字段名（如 'createTime'）
 * @param {string} startDate - 起始时间 ISO 字符串
 * @param {string} endDate - 结束时间 ISO 字符串
 * @param {object} options - 分页等选项
 */
async function queryByDateRange(collection, baseWhere, dateField, startDate, endDate, options) {
  try {
    await waitForCloudInit()
    const db = getDb()
    const _ = getCmd()
    if (!db || !_) return { success: false, error: '数据库未初始化' }

    const where = Object.assign({}, baseWhere, {
      [dateField]: _.gte(startDate).and(_.lt(endDate))
    })

    return query(collection, where, options)
  } catch (err) {
    console.error(`[cloud] queryByDateRange ${collection} 失败:`, err)
    return { success: false, error: err }
  }
}

async function aggregateByDate(collection, familyId, babyId, startDate, endDate) {
  try {
    await waitForCloudInit()
    const db = getDb()
    const _ = getCmd()
    if (!db || !_) return { success: false, error: '数据库未初始化' }
    const res = await db.collection(collection)
      .where({
        familyId,
        babyId,
        createTime: _.gte(startDate).and(_.lt(endDate))
      })
      .get()
    return { success: true, data: res.data }
  } catch (err) {
    console.error(`[cloud] aggregateByDate 失败:`, err)
    return { success: false, error: err }
  }
}

// ===== 监听（实时同步） =====

/**
 * 监听集合变化
 * @param {string} collection - 集合名
 * @param {object} where - 查询条件（普通对象，不应包含 command 操作符）
 * @param {function} onChange - 变化回调
 * @param {function} onError - 错误回调
 */
function watchCollection(collection, where, onChange, onError) {
  try {
    const db = getDb()
    if (!db) {
      console.error(`[cloud] watch ${collection} 失败: 数据库未初始化`)
      return null
    }
    const watcher = db.collection(collection)
      .where(where)
      .watch({
        onChange: (snapshot) => {
          if (onChange) onChange(snapshot)
        },
        onError: (err) => {
          console.error(`[cloud] watch ${collection} 错误:`, err)
          if (onError) onError(err)
        }
      })
    return watcher
  } catch (err) {
    console.error(`[cloud] watch ${collection} 初始化失败:`, err)
    return null
  }
}

// ===== 文件操作 =====

async function uploadFile(cloudPath, filePath) {
  try {
    await waitForCloudInit()
    const res = await wx.cloud.uploadFile({ cloudPath, filePath })
    return { success: true, data: res.fileID }
  } catch (err) {
    console.error('[cloud] uploadFile 失败:', err)
    return { success: false, error: err }
  }
}

async function deleteFile(fileIDs) {
  try {
    await waitForCloudInit()
    const res = await wx.cloud.deleteFile({ fileList: fileIDs })
    return { success: true, data: res.fileList }
  } catch (err) {
    console.error('[cloud] deleteFile 失败:', err)
    return { success: false, error: err }
  }
}

// ===== 云函数调用 =====

async function callFunction(name, data = {}) {
  try {
    await waitForCloudInit()
    const res = await wx.cloud.callFunction({ name, data })
    return { success: true, data: res.result }
  } catch (err) {
    console.error(`[cloud] callFunction ${name} 失败:`, err)
    return { success: false, error: err }
  }
}
