# 思考标签处理测试

## 测试目的
验证移动端对 `<think>` 和 `</think>` 标签的处理是否正确

## 测试步骤

1. **启动应用**
   ```bash
   npm run dev
   ```

2. **发送包含思考标签的消息**
   
   测试消息示例：
   ```
   <think>
   这是一个思考过程，用户应该看不到这部分内容。
   我需要分析这个问题...
   </think>
   
   这是用户应该看到的回复内容。
   ```

3. **预期结果**
   - ✅ 思考内容应该显示在独立的 ThinkingBlock 组件中
   - ✅ 主消息内容不应该包含 `<think>` 标签
   - ✅ 思考块应该可以折叠/展开
   - ✅ 控制台应该显示正确的事件日志

## 修复内容

### 1. 修复了 OpenAI Provider
- 将 `streamCompletion` 函数替换为 `OpenAIStreamProcessor` 类
- 确保思考标签被正确分离

### 2. 修复了 ResponseHandler
- 添加了事件监听器，将流式事件转换为回调
- 确保思考内容正确处理

### 3. 关键变更
- `src/shared/api/openai/provider.ts`: 使用正确的流处理器
- `src/shared/services/messages/ResponseHandler.ts`: 添加事件转换层

## 验证方法

1. **控制台日志检查**
   ```
   [ResponseHandler] 收到思考增量事件，长度: X
   [ResponseHandler] 收到文本增量事件，长度: Y
   [OpenAIStreamProcessor] 发送思考增量事件
   [OpenAIStreamProcessor] 发送思考完成事件
   ```

2. **UI 检查**
   - 查看是否有独立的思考块
   - 确认主消息不包含思考标签
   - 测试思考块的折叠功能

3. **数据库检查**
   - 思考内容应该存储在 THINKING 类型的块中
   - 主文本应该存储在 MAIN_TEXT 类型的块中

## 测试用例

### 用例 1：纯思考内容
```
<think>
这是纯思考内容，没有其他回复。
</think>
```

### 用例 2：思考 + 回复
```
<think>
让我思考一下这个问题...
</think>

这是我的回复。
```

### 用例 3：多段思考
```
<think>
第一段思考...
</think>

中间的回复内容。

<think>
第二段思考...
</think>

最后的回复内容。
```

## 成功标准

- ✅ 所有思考内容都显示在独立的 ThinkingBlock 中
- ✅ 主消息内容干净，无思考标签
- ✅ 与功能对等
- ✅ 无控制台错误
