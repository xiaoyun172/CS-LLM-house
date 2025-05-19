# AetherLink 移动应用开发文档

[![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/1600822305/CS-LLM-house)

## 项目概述

官方交流群Q群 点击链接加入群聊【AetherLink 官方群】：http://qm.qq.com/cgi-bin/qm/qr?_wv=1027&k=V-b46WoBNLIM4oc34JMULwoyJ3hyrKac&authKey=q%2FSwCcxda4e55ygtwp3h9adQXhqBLZ9wJdvM0QxTjXQkbxAa2tHoraOGy2fiibyY&noverify=0&group_code=930126592

AetherLink移动应用是一个基于现代Web技术构建的跨平台AI助手应用。该应用支持与多种AI模型（如OpenAI、Google Gemini、Anthropic Claude、Grok、硅基流动、火山方舟等）的交互，提供流畅的对话体验，并支持Android平台部署。应用采用React、TypeScript和Capacitor框架开发，具有高度可定制的模型配置、多主题聊天管理、AI思考过程可视化、语音合成等特色功能。

## 技术栈

- **前端框架**: React 19、Material UI 7
- **构建工具**: Vite 6
- **编程语言**: TypeScript 5.8
- **移动框架**: Capacitor 7
- **状态管理**: Redux & Redux Toolkit 2.8
- **API集成**: OpenAI、Google Gemini、Anthropic Claude、Grok、硅基流动、火山方舟等AI模型
- **存储**: IndexedDB (idb)、localStorage
- **样式**: MUI组件 + 自定义CSS
- **语音合成**: 硅基流动TTS API、Web Speech API

## 系统要求

- **Node.js**: v18.x 或更高
- **npm**: v9.x 或更高
- **Android Studio**: 用于Android平台开发
- **JDK**: Java 11 或更高版本
- **Vite**: 6.x 或更高版本
- **Capacitor CLI**: 7.x 或更高版本
- **React**: 19.x
- **TypeScript**: 5.8.x

## 项目结构

```
AetherLink/
├── android/                # Android平台相关代码和配置
│   ├── app/                # Android应用主要代码
│   │   ├── src/            # 源代码目录
│   │   │   ├── main/       # 主要代码
│   │   │   │   ├── assets/ # Web资源和配置文件
│   │   │   │   ├── java/   # Java代码
│   │   │   │   └── res/    # Android资源文件(布局、图标等)
│   │   │   └── test/       # 测试代码
│   │   └── build.gradle    # 应用级构建配置
│   ├── build.gradle        # 项目级构建配置
│   ├── capacitor.settings.gradle # Capacitor插件配置
│   └── variables.gradle    # 全局变量和版本配置
├── public/                 # 静态资源文件和公共资产
│   └── assets/             # 图标、图片等公共资源
├── src/                    # 源代码目录
│   ├── assets/             # 应用内图片、字体等资源
│   ├── components/         # 可复用UI组件
│   │   ├── BackButtonHandler/ # Android返回键处理组件，管理返回键行为
│   │   ├── ChatInput/      # 聊天输入框组件，处理消息输入和发送
│   │   ├── ExitConfirmDialog/ # 退出确认对话框，防止意外退出应用
│   │   ├── MessageItem/    # 单条消息展示组件，渲染用户和AI消息
│   │   ├── MessageList/    # 消息列表容器组件，管理消息流和滚动
│   │   ├── ModelManagement/ # 模型管理相关组件，处理模型选择和配置
│   │   ├── RouterWrapper/  # 路由包装组件，提供路由转换和动画
│   │   ├── TopicList/      # 聊天主题列表组件，显示历史对话记录
│   │   ├── TopicManagement/ # 话题管理组件，包含分组和拖拽功能
│   │   │   ├── AssistantTab.tsx # 助手标签页组件
│   │   │   ├── GroupComponents.tsx # 分组相关组件
│   │   │   ├── GroupDialog.tsx # 创建/编辑分组对话框
│   │   │   ├── Sidebar.tsx # 侧边栏主组件
│   │   │   ├── SidebarTabs.tsx # 侧边栏标签页组件
│   │   │   ├── TopicTab.tsx # 话题标签页组件
│   │   │   └── index.ts # 导出组件
│   │   ├── ChatToolbar/    # 聊天工具栏组件，提供聊天页面顶部操作
│   │   ├── message/        # 消息相关子组件
│   │   │   ├── ThinkingProcess/ # AI思考过程展示组件
│   │   │   └── MessageActions/  # 消息操作按钮组件
│   │   ├── settings/       # 设置相关组件
│   │   │   └── ModelCard/  # 模型卡片组件，展示单个模型信息
│   │   └── toolbar/        # 工具栏相关组件
│   ├── pages/              # 页面级组件
│   │   ├── ChatPage/       # 聊天主界面
│   │   │   ├── components/ # 聊天页面子组件
│   │   │   │   ├── ModelSelector.tsx # 模型选择器组件
│   │   │   │   └── ... # 其他聊天页面子组件
│   │   │   ├── hooks/ # 聊天页面自定义钩子
│   │   │   │   ├── useModelSelection.ts # 模型选择逻辑钩子
│   │   │   │   └── ... # 其他聊天页面钩子
│   │   │   └── index.tsx # 聊天页面主组件
│   │   ├── DevToolsPage/   # 开发者调试工具页面，提供日志和API调试
│   │   ├── Settings/       # 设置相关页面
│   │   │   ├── AppearanceSettings/ # 外观设置，主题和字体配置
│   │   │   ├── BehaviorSettings/   # 行为设置，如发送方式和通知
│   │   │   ├── DefaultModelSettings/ # 默认模型设置页面
│   │   │   ├── ModelProviderSettings/ # 模型提供商设置页面
│   │   │   ├── AddProviderPage/ # 添加提供商页面
│   │   │   ├── DataSettings/ # 数据管理设置，包括备份和恢复
│   │   │   ├── VoiceSettings/ # 语音设置，TTS配置
│   │   │   ├── index.tsx # 设置主页面
│   │   │   └── AboutPage/  # 关于页面，显示应用信息
│   │   └── WelcomePage/    # 欢迎/引导页面，首次使用时显示
│   ├── routes/             # 路由配置和导航逻辑
│   │   └── index.tsx       # 路由定义和配置
│   ├── shared/             # 共享代码和业务逻辑
│   │   ├── api/            # API接口封装
│   │   │   ├── anthropic/  # Anthropic Claude API集成
│   │   │   ├── google/     # Google Gemini API集成
│   │   │   ├── grok/       # Grok API集成
│   │   │   ├── openai/     # OpenAI API集成
│   │   │   ├── siliconflow/ # 硅基流动API集成
│   │   │   ├── volcengine/ # 火山方舟API集成
│   │   │   ├── deepseek/   # DeepSeek API集成
│   │   │   └── index.ts    # API统一入口和路由
│   │   ├── data/           # 静态数据和预设配置
│   │   │   ├── models/     # 预设模型配置
│   │   │   └── presetModels.ts # 预设模型数据
│   │   ├── hooks/          # 自定义React Hooks
│   │   │   ├── useAppState/ # 应用状态管理Hook
│   │   │   ├── useModels/  # 模型管理Hook
│   │   │   └── ... # 其他自定义Hook
│   │   ├── services/       # 业务服务层
│   │   │   ├── APIService.ts # API服务，处理模型获取和消息发送
│   │   │   ├── AssistantService.ts # 助手服务，管理AI助手配置
│   │   │   ├── LoggerService.ts # 日志记录服务，统一日志管理
│   │   │   ├── ThinkingService.ts # AI思考过程处理服务
│   │   │   ├── TTSService.ts # 文本到语音转换服务
│   │   │   ├── ImageUploadService.ts # 图片上传服务，处理图片选择和压缩
│   │   │   └── storageService.ts # 存储服务(IndexedDB/localStorage)
│   │   ├── store/          # Redux状态管理
│   │   │   ├── messagesSlice.ts # 消息状态管理
│   │   │   ├── settingsSlice.ts # 设置状态管理
│   │   │   ├── slices/     # 其他状态切片
│   │   │   │   ├── groupsSlice.ts # 分组状态管理
│   │   │   │   └── ... # 其他状态切片
│   │   │   └── index.ts    # Store配置和导出
│   │   ├── types/          # TypeScript类型定义
│   │   │   ├── Assistant.ts # 助手类型定义
│   │   │   └── index.ts    # 核心类型定义，包含消息、模型等类型
│   │   └── utils/          # 工具函数和辅助方法
│   │       ├── api/        # API相关工具函数
│   │       ├── format/     # 格式化工具函数
│   │       ├── storage/    # 本地存储工具函数
│   │       └── index.ts    # 通用工具函数，如ID生成、Token计算等
│   ├── App.tsx             # 应用根组件，包含主题和路由配置
│   ├── main.tsx            # 应用入口文件，渲染根组件
│   └── index.css           # 全局样式
├── capacitor.config.ts     # Capacitor移动应用配置，定义应用ID和插件设置
├── index.html              # 应用入口HTML文件
├── package.json            # 项目依赖和脚本配置
├── tsconfig.json           # TypeScript编译配置(引用配置)
├── tsconfig.app.json       # 应用代码TypeScript配置
├── tsconfig.node.json      # Node环境TypeScript配置
├── vite.config.ts          # Vite构建工具配置，包含优化和分包策略
├── tailwind.config.js      # Tailwind CSS配置
└── eslint.config.js        # ESLint代码规范配置
```

## 安装指南

1. **克隆仓库**

```bash
git clone https://github.com/1600822305/AetherLink.git
cd AetherLink
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

### 自动构建与持续集成

AetherLink配置了GitHub Actions工作流，可以自动构建和发布Android APK:

#### 调试构建

每当代码推送到主分支或创建Pull Request时，会自动触发调试构建:

- 工作流会构建Web应用并将其打包为Android APK
- 构建完成后，可以在GitHub Actions的构建作业中下载APK
- 也可以手动在GitHub界面中触发构建

#### 发布构建

当创建新的版本标签（如`v1.0.0`）时，会自动触发发布构建:

- 工作流会构建Web应用并使用标准调试密钥创建APK
- 构建完成后，会自动创建GitHub Release并上传APK
- 所有构建都使用Android标准调试密钥（兼容当前测试版本）
- 发布的APK标记为预发布(prerelease)版本

#### 注意事项

- 当前配置适用于测试阶段，使用调试密钥保持与现有版本兼容
- 未来正式发布时，请提前通知用户使用备份功能保存数据，并迁移到新版本

### 发布到应用商店

1. 创建签名密钥:

```bash
keytool -genkey -v -keystore cs-aetherlink.keystore -alias cs-aetherlink -keyalg RSA -keysize 2048 -validity 10000
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

AetherLink支持从各大AI提供商API自动获取可用模型列表：

- 支持OpenAI、Claude (Anthropic)、Gemini (Google)、Grok (xAI)、硅基流动和火山方舟等主流AI提供商
- 自动处理不同API格式和端点路径
- 智能适配自定义中转站API
- 提供优雅的回退机制，当API请求失败时使用预设模型列表
- 支持的API端点:
  - OpenAI: `/v1/models`
  - Claude: `/v1/models`
  - Gemini: `/v1beta/models`
  - Grok: `/v1/models`
  - 硅基流动: `/v1/models`
  - 火山方舟: `/api/v3/models`
  - 自定义中转站: 自动检测并适配

### 移动端优化

AetherLink针对移动设备进行了多项优化：

- **返回键智能处理**：根据当前页面上下文智能处理Android返回键行为
  - 在聊天和欢迎页面显示退出确认对话框
  - 在其他页面返回上一级页面
  - 防止意外退出应用
- **响应式布局**：自适应不同屏幕尺寸和方向
- **触摸优化**：针对触摸交互优化的UI元素和手势
- **性能优化**：减少不必要的渲染和计算，确保在移动设备上流畅运行

### AI思考过程

AetherLink支持显示AI的思考过程，目前主要支持Grok模型的思考过程展示：

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

### 语音合成功能

AetherLink支持将AI回复转换为语音：

- **多种语音合成选项**：
  - 硅基流动TTS API：高质量的中文语音合成
  - Web Speech API：作为备选方案的浏览器原生语音合成
- **语音控制功能**：
  - 播放/暂停控制
  - 语音选择
  - 语速调整
- **集成到消息界面**：
  - 每条AI消息都有语音播放按钮
  - 播放状态可视化
  - 流式响应完成后自动启用语音播放功能

## 移动端输入问题解决方案

### 问题描述

在Android平台上，聊天输入框存在以下问题：
- 复制粘贴功能不正常或无法使用
- 输入框尺寸过小，不适合触摸操作
- 在某些设备上输入区域显示异常或无法正常接收输入

### 解决方案

通过以下关键改进解决了输入问题：

1. **移除React Native Web的TextInput组件**
   - 将`<TextInput>`组件替换为标准HTML的`<textarea>`元素
   - 使用原生Web元素避免了跨平台兼容性问题
   - 确保复制粘贴等原生功能正常运行

2. **简化DOM结构与样式**
   - 使用内联样式替代MUI样式系统，减少样式冲突
   - 简化组件嵌套层次，提高渲染性能
   - 直接设置元素样式，避免多层样式覆盖带来的问题

3. **优化触摸体验**
   - 增大输入区域和按钮尺寸，改善触摸操作体验
   - 设置合理的内边距和间距，防止误触
   - 优化聚焦和失焦行为，在某些Android设备上解决键盘弹出问题

4. **焦点管理**
   - 添加特殊的焦点管理逻辑，解决部分设备上的输入问题
   - 实现组件挂载后的自动聚焦和模糊处理
   - 使用延时处理确保DOM完全加载后再处理焦点

### 代码实现

关键实现代码：

```tsx
// 使用标准HTML textarea替代React Native Web的TextInput
<textarea
  ref={textareaRef}
  style={{
    fontSize: '16px',
    padding: '12px 0',
    border: 'none',
    outline: 'none',
    width: '100%',
    backgroundColor: 'transparent',
    lineHeight: '1.5',
    fontFamily: 'inherit',
    resize: 'none',
    overflow: 'hidden',
    minHeight: '24px',
    maxHeight: '80px'
  }}
  placeholder="和ai助手说点什么"
  value={message}
  onChange={handleChange}
  onKeyPress={handleKeyPress}
  disabled={isLoading}
  rows={1}
/>

// 焦点管理代码
useEffect(() => {
  // 设置一个延迟以确保组件挂载后聚焦生效
  const timer = setTimeout(() => {
    if (textareaRef.current) {
      // 聚焦后立即模糊，解决某些Android设备上的复制粘贴问题
      textareaRef.current.focus();
      textareaRef.current.blur();
    }
  }, 300);

  return () => clearTimeout(timer);
}, []);
```

这种方法不仅解决了当前的输入问题，还提高了组件的可维护性和性能。通过使用Web标准元素而非跨平台包装组件，我们避免了额外的抽象层带来的潜在问题，同时确保了更好的平台兼容性。


