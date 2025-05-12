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
├── src/
│   ├── assets/             # 图片、字体等资源
│   ├── components/         # 可复用组件
│   ├── pages/              # 页面组件
│   │   ├── Home/           # 主页
│   │   ├── Settings/       # 设置页
│   │   └── Welcome/        # 欢迎页
│   ├── routes/             # 路由配置
│   └── shared/             # 共享代码
│       ├── api/            # API接口封装
│       ├── data/           # 静态数据
│       ├── services/       # 服务层
│       ├── store/          # Redux状态管理
│       ├── types/          # TypeScript类型定义
│       └── utils/          # 工具函数
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
- 启用/禁用特定模型
- 设置默认模型

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
