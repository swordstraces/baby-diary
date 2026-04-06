# 🍼 宝贝日记 Baby Tracker

一款面向新生儿的**家庭协作养娃记录**微信小程序。支持父母、育儿嫂、爷爷奶奶等多角色共同记录宝宝的日常活动，自动生成每日报告，方便全家了解宝宝状况、协调照护工作。

## ✨ 功能亮点

- **六大活动记录**：喂奶、换尿布、睡眠、情绪、辅食、体温/用药/疫苗
- **多人家庭协作**：创建家庭组，邀请成员，所有记录实时同步
- **每日总结报告**：自动汇总当日活动，7天趋势图表，与前日对比
- **异常智能提醒**：长时间未喂奶、体温偏高等自动检测
- **深色模式**：夜间喂奶场景友好，减少屏幕亮度刺激
- **观察笔记 & 评论**：每条记录可添加笔记，家庭成员可评论交流

## 🛠 技术栈

| 技术 | 说明 |
|------|------|
| 前端框架 | 微信小程序原生（WXML + WXSS + JS） |
| UI 组件 | TDesign 微信小程序版 |
| 后端服务 | 微信云开发（云数据库 + 云函数 + 云存储） |
| 数据库 | 云开发 NoSQL（MongoDB 兼容） |
| 图表 | Canvas 2D API |

**无需额外服务器**，云开发免费额度完全覆盖家庭使用场景。

## 📁 项目结构

```
baby-tracker/
├── miniprogram/                   # 小程序前端
│   ├── pages/                     # 9个页面
│   │   ├── index/                 # 首页 - 今日概览
│   │   ├── timeline/              # 记录时间线
│   │   ├── report/                # 每日报告
│   │   ├── mine/                  # 我的/设置
│   │   ├── add-record/            # 添加记录（通用）
│   │   ├── record-detail/         # 记录详情+评论
│   │   ├── family/                # 家庭管理
│   │   ├── baby-edit/             # 宝宝信息编辑
│   │   ├── identity-edit/         # 身份编辑
│   │   └── invite/                # 邀请成员
│   ├── components/                # 11个组件
│   │   ├── feeding-form/          # 喂奶表单
│   │   ├── diaper-form/           # 换尿布表单
│   │   ├── sleep-form/            # 睡眠表单
│   │   ├── mood-form/             # 情绪表单
│   │   ├── food-form/             # 辅食表单
│   │   ├── health-form/           # 健康表单
│   │   ├── record-card/           # 记录卡片
│   │   ├── quick-actions/         # 快捷操作网格
│   │   ├── daily-chart/           # 日报图表
│   │   ├── member-card/           # 成员卡片
│   │   ├── identity-picker/       # 身份选择器
│   │   └── empty-state/           # 空状态
│   ├── utils/                     # 工具模块
│   │   ├── cloud.js               # 云数据库封装
│   │   ├── auth.js                # 用户授权
│   │   ├── family.js              # 家庭管理工具
│   │   ├── report-generator.js    # 报告生成
│   │   ├── alert.js               # 异常检测
│   │   ├── avatar.js              # 头像路径工具
│   │   ├── constants.js           # 常量定义
│   │   └── util.js                # 通用工具
│   ├── styles/                    # 全局样式
│   │   ├── variables.wxss         # CSS 变量/设计 Token
│   │   └── common.wxss            # 通用样式类
│   └── images/                    # 静态资源
├── cloudfunctions/                # 云函数
│   ├── init/                      # 数据库初始化
│   ├── login/                     # 用户登录
│   ├── generateReport/            # 定时生成每日报告
│   ├── inviteMember/              # 邀请成员处理
│   ├── checkAlerts/               # 定时异常检查
│   └── deleteComment/             # 评论删除
├── project.config.example.json    # 项目配置模板
├── miniprogram/app.example.js     # 应用入口模板
└── SETUP_GUIDE.md                 # 从零开始上线指南
```

## 🚀 快速开始

> 详细部署步骤请参考 [SETUP_GUIDE.md](./SETUP_GUIDE.md)

### 前置要求

1. **微信开发者工具**：[下载地址](https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html)
2. **微信小程序 AppID**：在 [微信公众平台](https://mp.weixin.qq.com/) 注册获取
3. **云开发环境**：在微信开发者工具中开通

### 三步配置

**1. 创建配置文件**

```bash
# 从模板创建项目配置
cp project.config.example.json project.config.json
cp miniprogram/app.example.js miniprogram/app.js
```

**2. 填入你的信息**

在 `project.config.json` 中填入 AppID，在 `miniprogram/app.js` 中填入云环境 ID。

**3. 部署云函数**

在微信开发者工具中，右键每个云函数文件夹 →「上传并部署：云端安装依赖」。

先部署 `init` 云函数，运行它来自动创建所有数据库集合。

### 数据库集合

| 集合名 | 用途 |
|--------|------|
| `families` | 家庭组信息 |
| `members` | 家庭成员 |
| `babies` | 宝宝信息 |
| `records` | 所有活动记录 |
| `daily_reports` | 每日报告 |
| `comments` | 记录评论 |
| `invites` | 邀请码 |

## 📱 页面说明

| 页面 | 说明 |
|------|------|
| **首页** | 宝宝状态卡片、快捷记录 6 宫格、最近动态 |
| **时间线** | 按日期浏览所有记录，支持类型筛选 |
| **每日报告** | 当日汇总、7天趋势图、异常提醒 |
| **我的** | 设置、家庭管理、身份编辑 |

## ⚠️ 注意事项

- **云开发配额**：免费额度为数据库 2GB、云函数调用 40万次/月，家庭使用绰绰有余
- **数据安全**：建议在云数据库安全规则中限制只有家庭成员可读写
- **隐私合规**：上线前需在微信公众平台填写隐私协议

## 📄 许可协议

MIT License
