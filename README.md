# LLM小屋 移动应用开发文档

## 项目概述

LLM小屋移动应用是一个基于现代Web技术构建的跨平台AI助手应用。该应用支持与多种AI模型（如OpenAI、Google Gemini、Anthropic等）的交互，提供流畅的对话体验，并支持Android平台部署。

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
CS-LLM-house/
├── android/                # Android平台相关代码和配置
├── public/                 # 静态资源文件和公共资产
│   └── assets/             # 图标、图片等公共资源
├── src/                    # 源代码目录
│   ├── assets/             # 应用内图片、字体等资源
│   ├── components/         # 可复用UI组件
│   │   ├── BackButtonHandler/  # Android返回键处理组件
│   │   ├── ChatInput/      # 聊天输入框组件
│   │   ├── ExitConfirmDialog/  # 退出确认对话框
│   │   ├── MessageItem/    # 单条消息展示组件
│   │   ├── MessageList/    # 消息列表容器组件
│   │   ├── ModelManagement/# 模型管理相关组件
│   │   ├── RouterWrapper/  # 路由包装组件
│   │   └── TopicList/      # 聊天主题列表组件
│   ├── pages/              # 页面级组件
│   │   ├── ChatPage/       # 聊天主界面
│   │   ├── DevToolsPage/   # 开发者调试工具页面
│   │   ├── Settings/       # 设置相关页面
│   │   │   ├── AppearanceSettings/ # 外观设置
│   │   │   ├── BehaviorSettings/   # 行为设置
│   │   │   ├── DefaultModelSettings/ # 默认模型设置
│   │   │   └── ModelProviderSettings/ # 模型提供商设置
│   │   └── Welcome/        # 欢迎/引导页面
│   ├── routes/             # 路由配置和导航逻辑
│   └── shared/             # 共享代码和业务逻辑
│       ├── api/            # API接口封装
│       │   ├── anthropic/  # Anthropic Claude API集成
│       │   ├── google/     # Google Gemini API集成
│       │   ├── grok/       # Grok API集成
│       │   └── openai/     # OpenAI API集成
│       ├── data/           # 静态数据和预设配置
│       │   └── models/     # 预设模型配置
│       ├── hooks/          # 自定义React Hooks
│       │   ├── useAppState/# 应用状态管理Hook
│       │   └── useModels/  # 模型管理Hook
│       ├── services/       # 业务服务层
│       │   ├── APIService/ # API服务（模型获取、消息发送等）
│       │   ├── LoggerService/ # 日志记录服务
│       │   └── ThinkingService/ # AI思考过程处理服务
│       ├── store/          # Redux状态管理
│       │   ├── slices/     # Redux状态切片
│       │   │   ├── messages/ # 消息状态管理
│       │   │   ├── models/   # 模型状态管理
│       │   │   └── settings/ # 设置状态管理
│       │   └── index.ts    # Store配置和导出
│       ├── types/          # TypeScript类型定义
│       └── utils/          # 工具函数和辅助方法
│           ├── api/        # API相关工具函数
│           ├── format/     # 格式化工具函数
│           └── storage/    # 本地存储工具函数
├── capacitor.config.ts     # Capacitor移动应用配置
├── index.html              # 应用入口HTML文件
├── package.json            # 项目依赖和脚本配置
├── tsconfig.json           # TypeScript编译配置
└── vite.config.ts          # Vite构建工具配置
```

## 安装指南

1. **克隆仓库**

```bash
git clone https://github.com/1600822305/CS-LLM-house.git
cd CS-LLM-house
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

LLM小屋支持从各大AI提供商API自动获取可用模型列表：

- 支持OpenAI、Claude (Anthropic)、Gemini (Google)和Grok (xAI)等主流AI提供商
- 自动处理不同API格式和端点路径
- 智能适配自定义中转站API
- 提供优雅的回退机制，当API请求失败时使用预设模型列表
- 支持的API端点:
  - OpenAI: `/v1/models`
  - Claude: `/v1/models`
  - Gemini: `/v1beta/models`
  - 自定义中转站: 自动检测并适配

### 移动端优化

LLM小屋针对移动设备进行了多项优化：

- **返回键智能处理**：根据当前页面上下文智能处理Android返回键行为
  - 在聊天和欢迎页面显示退出确认对话框
  - 在其他页面返回上一级页面
  - 防止意外退出应用
- **响应式布局**：自适应不同屏幕尺寸和方向
- **触摸优化**：针对触摸交互优化的UI元素和手势
- **性能优化**：减少不必要的渲染和计算，确保在移动设备上流畅运行

### AI思考过程

LLM小屋支持显示AI的思考过程，目前主要支持Grok模型的思考过程展示：

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
- 移动端性能监控
