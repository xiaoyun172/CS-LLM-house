/**
 * OpenAI API模块
 * 导出统一的API接口
 */

// 导出客户端模块
export {
  createClient,
  supportsMultimodal,
  testConnection
} from './client';

// 导出聊天完成模块
export {
  sendChatRequest
} from './chat';

// 导出模型管理模块
export {
  fetchModels,
  fetchModelsWithSDK
} from './models';

// 导出多模态处理模块
export {
  convertToOpenAIMessages,
  hasImages,
  hasOpenAIFormatImages,
  type MessageContentItem
} from './multimodal';

// 导出工具调用模块
export {
  THINKING_TOOL,
  createThinkingToolParams,
  parseThinkingToolCall,
  hasThinkingPrompt
} from './tools';

// 导出流式响应模块
export {
  streamCompletion
} from './stream';

// 导出图像生成模块
export {
  generateImage
} from './image';
