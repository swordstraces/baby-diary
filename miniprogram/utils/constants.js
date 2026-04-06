/**
 * constants.js - 常量定义
 * 记录类型枚举、情绪类型、角色枚举、默认值等
 */

// 记录类型
const RECORD_TYPES = {
  FEEDING: 'feeding',
  DIAPER: 'diaper',
  SLEEP: 'sleep',
  MOOD: 'mood',
  FOOD: 'food',
  HEALTH: 'health'
}

// 记录类型配置（图标用emoji占位，实际项目中替换为图片）
const RECORD_TYPE_CONFIG = {
  [RECORD_TYPES.FEEDING]: {
    label: '喂奶',
    icon: '🍼',
    color: '#FF8C6B',
    bgColor: 'rgba(255, 140, 107, 0.1)',
    tagClass: 'tag-feeding'
  },
  [RECORD_TYPES.DIAPER]: {
    label: '换尿布',
    icon: '🧷',
    color: '#4ECDC4',
    bgColor: 'rgba(78, 205, 196, 0.1)',
    tagClass: 'tag-diaper'
  },
  [RECORD_TYPES.SLEEP]: {
    label: '睡眠',
    icon: '🌙',
    color: '#7C83FD',
    bgColor: 'rgba(124, 131, 253, 0.1)',
    tagClass: 'tag-sleep'
  },
  [RECORD_TYPES.MOOD]: {
    label: '情绪',
    icon: '😊',
    color: '#BFA000',
    bgColor: 'rgba(255, 230, 109, 0.15)',
    tagClass: 'tag-mood'
  },
  [RECORD_TYPES.FOOD]: {
    label: '辅食',
    icon: '🥣',
    color: '#95E1D3',
    bgColor: 'rgba(149, 225, 211, 0.1)',
    tagClass: 'tag-food'
  },
  [RECORD_TYPES.HEALTH]: {
    label: '健康',
    icon: '💊',
    color: '#FF6B6B',
    bgColor: 'rgba(255, 107, 107, 0.1)',
    tagClass: 'tag-health'
  }
}

// 喂奶方式
const FEEDING_METHODS = {
  BREAST_LEFT: { label: '母乳（左侧）', value: 'breast_left' },
  BREAST_RIGHT: { label: '母乳（右侧）', value: 'breast_right' },
  BREAST_BOTH: { label: '母乳（双侧）', value: 'breast_both' },
  BOTTLE: { label: '奶瓶', value: 'bottle' }
}

// 尿布类型
const DIAPER_TYPES = {
  WET: { label: '嘘嘘', value: 'wet', emoji: '💧' },
  STOOL: { label: '便便', value: 'stool', emoji: '💩' },
  BOTH: { label: '都有', value: 'both', emoji: '💦' }
}

// 便便颜色/状态
const STOOL_COLORS = [
  { label: '黑色（胎便）', value: 'black' },
  { label: '墨绿色', value: 'dark_green' },
  { label: '黄绿色', value: 'yellow_green' },
  { label: '金黄色', value: 'golden' },
  { label: '棕色', value: 'brown' },
  { label: '绿色', value: 'green' },
  { label: '白色', value: 'white' },
  { label: '红色', value: 'red' }
]

// 睡眠质量
const SLEEP_QUALITY = {
  GOOD: { label: '睡得好', value: 'good', emoji: '😴' },
  NORMAL: { label: '一般', value: 'normal', emoji: '😐' },
  RESTLESS: { label: '不安稳', value: 'restless', emoji: '😬' }
}

// 情绪类型
const MOOD_TYPES = {
  CRYING: { label: '哭闹', value: 'crying', emoji: '😭' },
  FUSSY: { label: '烦躁', value: 'fussy', emoji: '😤' },
  CALM: { label: '平静', value: 'calm', emoji: '😌' },
  HAPPY: { label: '开心', value: 'happy', emoji: '😊' }
}

// 哭闹可能原因
const MOOD_REASONS = [
  { label: '饿了', value: 'hungry' },
  { label: '困了', value: 'sleepy' },
  { label: '尿布湿了', value: 'diaper' },
  { label: '需要抱抱', value: 'hold' },
  { label: '肚子不舒服', value: 'colic' },
  { label: '太热了', value: 'hot' },
  { label: '太冷了', value: 'cold' },
  { label: '受到惊吓', value: 'scared' },
  { label: '其他', value: 'other' }
]

// 安抚方式
const SOOTHE_METHODS = [
  { label: '抱抱', value: 'hold' },
  { label: '喂奶', value: 'feed' },
  { label: '换尿布', value: 'diaper' },
  { label: '摇篮', value: 'rock' },
  { label: '白噪音', value: 'white_noise' },
  { label: '安抚奶嘴', value: 'pacifier' },
  { label: '拍嗝', value: 'burp' },
  { label: '其他', value: 'other' }
]

// 辅食接受度
const FOOD_ACCEPTANCE = {
  LOVED: { label: '很喜欢', value: 'loved', emoji: '😍' },
  LIKED: { label: '喜欢', value: 'liked', emoji: '😊' },
  NEUTRAL: { label: '一般', value: 'neutral', emoji: '😐' },
  DISLIKED: { label: '不喜欢', value: 'disliked', emoji: '😕' },
  REFUSED: { label: '拒绝', value: 'refused', emoji: '😤' }
}

// 健康记录子类型
const HEALTH_SUB_TYPES = {
  TEMPERATURE: { label: '体温', value: 'temperature' },
  MEDICINE: { label: '用药', value: 'medicine' },
  VACCINE: { label: '疫苗', value: 'vaccine' },
  WEIGHT: { label: '体重', value: 'weight' },
  HEIGHT: { label: '身高', value: 'height' },
  HEAD: { label: '头围', value: 'headCircumference' }
}

// 家庭角色（权限角色）
const FAMILY_ROLES = {
  ADMIN: 'admin',
  MEMBER: 'member'
}

const FAMILY_ROLE_LABELS = {
  [FAMILY_ROLES.ADMIN]: '管理员',
  [FAMILY_ROLES.MEMBER]: '成员'
}

// 家庭身份列表（简化为7个基本选项）
const IDENTITY_OPTIONS = [
  { label: '爸爸', value: 'father', emoji: '👨', fullLabel: '👨 爸爸' },
  { label: '妈妈', value: 'mother', emoji: '👩', fullLabel: '👩 妈妈' },
  { label: '外婆', value: 'grandma_m', emoji: '👵', fullLabel: '👵 外婆' },
  { label: '奶奶', value: 'grandma_p', emoji: '👵', fullLabel: '👵 奶奶' },
  { label: '外公', value: 'grandpa_m', emoji: '👴', fullLabel: '👴 外公' },
  { label: '爷爷', value: 'grandpa', emoji: '👴', fullLabel: '👴 爷爷' },
  { label: '阿姨', value: 'nanny', emoji: '🧑‍🍼', fullLabel: '🧑‍🍼 阿姨' }
]

// 身份值 → 显示文本的映射（带 emoji）
const IDENTITY_LABELS = {}
IDENTITY_OPTIONS.forEach(item => {
  IDENTITY_LABELS[item.value] = item.emoji + ' ' + item.label
})

// 身份值 → 完整显示文本（带 emoji）的映射（用于列表显示）
const IDENTITY_FULL_LABELS = {}
IDENTITY_OPTIONS.forEach(item => {
  IDENTITY_FULL_LABELS[item.value] = item.emoji + ' ' + item.label
})

// 性别
const GENDER = {
  MALE: { label: '男孩', value: 'male', emoji: '👦' },
  FEMALE: { label: '女孩', value: 'female', emoji: '👧' }
}

// 异常阈值（毫秒）
const ALERT_THRESHOLDS = {
  FEEDING_INTERVAL: 4 * 60 * 60 * 1000, // 4小时未喂奶
  HIGH_TEMPERATURE: 38.0, // 高温阈值
  LOW_TEMPERATURE: 36.0,  // 低温阈值
  SLEEP_DURATION_MAX: 5 * 60 * 60 * 1000 // 单次睡眠超过5小时（新生儿需唤醒喂奶）
}

module.exports = {
  RECORD_TYPES,
  RECORD_TYPE_CONFIG,
  FEEDING_METHODS,
  DIAPER_TYPES,
  STOOL_COLORS,
  SLEEP_QUALITY,
  MOOD_TYPES,
  MOOD_REASONS,
  SOOTHE_METHODS,
  FOOD_ACCEPTANCE,
  HEALTH_SUB_TYPES,
  FAMILY_ROLES,
  FAMILY_ROLE_LABELS,
  IDENTITY_OPTIONS,
  IDENTITY_LABELS,
  IDENTITY_FULL_LABELS,
  GENDER,
  ALERT_THRESHOLDS
}
