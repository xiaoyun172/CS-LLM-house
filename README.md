# Cherry Studio 移动应用开发文档

## 项目概述

Cherry Studio移动应用是一个基于现代Web技术构建的跨平台AI助手应用。该应用支持与多种AI模型（如OpenAI、Google Gemini、Anthropic等）的交互，提供流畅的对话体验，并支持Android平台部署。

## 技术栈

- **前端框架**: React、Material UI
- **构建工具**: Vite
- **编程语言**: TypeScript
- **移动框架**: Capacitor
- **状态管理**: Redux & Redux Toolkit
- **API集成**: OpenAI、Google Gemini、Anthropic Claude等AI模型
- **样式**: MUI组件 + 自定义CSS

## 系统要求

- **Node.js**: v16.x 或更高
- **npm**: v8.x 或更高
- **Android Studio**: 用于Android平台开发
- **JDK**: Java 11 或更高版本

## 项目结构

```
cherry-studio-app2/
├── android/                # Android平台相关代码
├── public/                 # 静态资源文件
│   └── assets/             # 公共资源文件
│       └── models/         # 模型相关静态资源
├── src/
│   ├── assets/             # 图片、字体等资源
│   ├── components/         # 可复用组件
│   │   ├── ChatInput/      # 聊天输入组件
│   │   ├── MessageItem/    # 消息项组件
│   │   ├── MessageList/    # 消息列表组件
│   │   ├── ModelManagementDialog.tsx # 模型管理对话框组件
│   │   └── TopicList/      # 话题列表组件
│   ├── pages/              # 页面组件
│   │   ├── ChatPage/       # 聊天页面
│   │   ├── DevToolsPage/   # 开发者工具页面
│   │   ├── Home/           # 主页
│   │   ├── Settings/       # 设置页面
│   │   │   ├── ModelProviderSettings.tsx # 模型提供商设置
│   │   │   └── DefaultModelSettings.tsx  # 默认模型设置
│   │   └── Welcome/        # 欢迎页
│   ├── routes/             # 路由配置
│   └── shared/             # 共享代码
│       ├── api/            # API接口封装
│       │   ├── anthropic.ts # Anthropic Claude API
│       │   ├── google.ts   # Google Gemini API
│       │   ├── grok.ts     # Grok API
│       │   ├── index.ts    # API统一导出
│       │   └── openai.ts   # OpenAI API
│       ├── data/           # 静态数据
│       │   └── presetModels.ts # 预设模型配置
│       ├── services/       # 服务层
│       │   ├── APIService.ts      # API服务（模型获取等）
│       │   ├── LoggerService.ts   # 日志服务
│       │   └── ThinkingService.ts # 思考过程处理服务
│       ├── store/          # Redux状态管理
│       │   ├── index.ts    # Store配置
│       │   └── slices/     # Redux切片
│       │       ├── messagesSlice.ts # 消息状态管理
│       │       └── settingsSlice.ts # 设置状态管理
│       ├── types/          # TypeScript类型定义
│       │   └── index.ts    # 全局类型定义
│       └── utils/          # 工具函数
│           └── index.ts    # 工具函数集合
├── .gitignore              # Git忽略配置
├── capacitor.config.ts     # Capacitor配置
├── index.html              # 应用入口HTML
├── package.json            # 项目依赖管理
├── tsconfig.json           # TypeScript配置
└── vite.config.ts          # Vite构建配置
```

## 安装指南

1. **克隆仓库**

```bash
git clone https://github.com/1600822305/cherry-studio-app2.git
cd cherry-studio-app2
```

2. **安装依赖**

```bash
npm install
```

3. **初始化Capacitor**

```bash
npx cap init
```

## 开发指南

### 启动开发服务器

```bash
npm run dev
```

### 移动端开发

1. **构建Web资源**

```bash
npm run build
```

2. **更新Android项目**

```bash
npx cap sync android
```

3. **打开Android Studio**

```bash
npx cap open android
```

### 主要功能模块

#### 聊天模块

聊天功能在`src/pages/ChatPage.tsx`中实现，支持以下功能：

- 创建和管理多个聊天主题
- 发送消息到AI模型
- 支持流式响应（打字机效果）
- 消息保存与历史记录加载

#### 模型配置

模型配置功能在`src/pages/Settings`目录中实现，支持：

- 添加、编辑和删除AI提供商
- 配置API密钥和基础URL
- 自动从API获取可用模型列表
- 手动添加自定义模型
- 启用/禁用特定模型
- 设置默认模型
- 按组管理模型（如GPT-4系列、Claude系列等）

#### 用户界面

- 使用Material UI组件库实现微信风格的聊天界面
- 支持深色/浅色主题切换
- 适配不同屏幕尺寸的响应式设计

## 构建与部署

### Android APK构建

1. 在Android Studio中打开项目:

```bash
npx cap open android
```

2. 从Android Studio菜单选择 `Build` > `Build Bundle(s) / APK(s)` > `Build APK(s)`

3. 构建完成后，APK将保存在 `android/app/build/outputs/apk/debug/` 目录

### 发布到应用商店

1. 创建签名密钥:

```bash
keytool -genkey -v -keystore cherry-studio.keystore -alias cherry-studio -keyalg RSA -keysize 2048 -validity 10000
```

2. 配置签名信息(在`android/app/build.gradle`中)

3. 构建发布版本APK或AAB

4. 上传到Google Play商店或其他应用分发平台

## 贡献指南

1. Fork本仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m '添加一些功能'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建一个Pull Request

## 许可证

此项目采用MIT许可证 - 详情见LICENSE文件

## 特色功能

### 自动获取模型列表

Cherry Studio支持从各大AI提供商API自动获取可用模型列表：

- 支持OpenAI、Claude (Anthropic)、Gemini (Google)和Grok (xAI)等主流AI提供商
- 自动处理不同API格式和端点路径
- 智能适配自定义中转站API
- 提供优雅的回退机制，当API请求失败时使用预设模型列表
- 支持的API端点:
  - OpenAI: `/v1/models`
  - Claude: `/v1/models`
  - Gemini: `/v1beta/models`
  - 自定义中转站: 自动检测并适配

### AI思考过程

Cherry Studio支持显示AI的思考过程，目前主要支持Grok模型的思考过程展示：

- `ThinkingService`: 专门处理不同AI模型的思考过程，支持从API响应中提取思考内容
- 支持不同模型的思考过程格式化和显示
- 可视化思考时间和过程，改善用户体验
- 支持的模型:
  - Grok-3-Mini-Beta
  - Grok-3-Mini-Fast-Beta

### 开发者工具

内置开发者工具，帮助调试和监控应用:

- 控制台日志查看
- 网络请求监控
- API请求和响应分析
- 思考过程监控
- 模型API调试
