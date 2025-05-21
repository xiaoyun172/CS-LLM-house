# AetherLink 贡献指南

感谢您考虑为 AetherLink 项目做出贡献！这份文档提供了参与项目开发的指导方针和流程。

## 开发环境设置

1. **克隆仓库**

```bash
git clone https://github.com/1600822305/AetherLink.git
cd AetherLink
```

2. **安装依赖**

```bash
npm install
```

3. **启动开发服务器**

```bash
npm run dev
```

## 代码风格和规范

我们使用 ESLint 和 TypeScript 来确保代码质量和一致性。在提交代码前，请确保：

- 代码通过 ESLint 检查：`npm run lint`
- TypeScript 类型检查通过：`tsc -b`
- 遵循项目的文件和组件命名约定

## 分支管理

- `main` 分支是稳定版本分支
- 开发新功能时，请从 `main` 分支创建新的功能分支
- 分支命名规范：`feature/功能名称` 或 `fix/问题描述`

## 提交规范

提交信息应遵循以下格式：

```
类型(范围): 简短描述

详细描述（可选）
```

类型包括：
- `feat`: 新功能
- `fix`: 修复bug
- `docs`: 文档更新
- `style`: 代码风格调整（不影响功能）
- `refactor`: 代码重构
- `perf`: 性能优化
- `test`: 添加或修改测试
- `chore`: 构建过程或辅助工具变动

## 提交 Pull Request

1. 确保你的代码已经通过测试和 lint 检查
2. 更新相关文档
3. 提交 PR 到 `main` 分支
4. 在 PR 描述中详细说明你的更改

## 移动端开发注意事项

在进行移动端开发时：

1. **构建 Web 资源**

```bash
npm run build
```

2. **更新 Android 项目**

```bash
npx cap sync android
```

3. **打开 Android Studio**

```bash
npx cap open android
```

## 项目结构

请熟悉项目的主要目录结构：

```
AetherLink/
├── src/                    # 源代码目录
│   ├── components/         # 可复用UI组件
│   ├── pages/              # 页面组件
│   ├── routes/             # 路由配置
│   ├── shared/             # 共享代码和业务逻辑
│   │   ├── api/            # API接口封装
│   │   ├── hooks/          # 自定义React Hooks
│   │   ├── services/       # 业务服务层
│   │   ├── store/          # Redux状态管理
│   │   ├── types/          # TypeScript类型定义
│   │   └── utils/          # 工具函数
│   ├── App.tsx             # 应用根组件
│   └── main.tsx            # 应用入口文件
├── android/                # Android平台相关代码
├── public/                 # 静态资源文件
└── capacitor.config.ts     # Capacitor配置
```

## 测试

在实现新功能或修复 bug 后，请确保：

1. 在 Web 环境中测试功能
2. 在 Android 设备或模拟器中测试功能
3. 添加适当的单元测试或集成测试

## 问题反馈

如果你发现了 bug 或有新功能建议，请通过 GitHub Issues 提交，并尽可能提供详细信息。

感谢您的贡献！
