import { v4 as uuid } from 'uuid';
import type {
  Message,
  MessageBlock,
  MainTextMessageBlock,
  ThinkingMessageBlock,
  ImageMessageBlock,
  CodeMessageBlock,
  CitationMessageBlock,
  TranslationMessageBlock,
  TableMessageBlock,
  MultiModelMessageBlock,
  ChartMessageBlock,
  MathMessageBlock
} from '../types/newMessage.ts';
import {
  MessageBlockType,
  MessageBlockStatus,
  AssistantMessageStatus,
  UserMessageStatus
} from '../types/newMessage.ts';
import type { Model } from '../types';
import store from '../store';
import { messageBlocksSelectors } from '../store/slices/messageBlocksSlice';

/**
 * 创建用户消息
 */
export function createUserMessage(options: {
  content: string;
  assistantId: string;
  topicId: string;
  modelId?: string;
  model?: Model;
  images?: Array<{ url: string }>;
}): { message: Message; blocks: MessageBlock[] } {
  const { content, assistantId, topicId, modelId, model, images } = options;
  const messageId = uuid();
  const now = new Date().toISOString();

  // 创建主文本块
  const mainTextBlock: MainTextMessageBlock = {
    id: uuid(),
    messageId,
    type: MessageBlockType.MAIN_TEXT,
    content,
    createdAt: now,
    status: MessageBlockStatus.SUCCESS
  };

  // 创建消息对象
  const message: Message = {
    id: messageId,
    role: 'user',
    assistantId,
    topicId,
    createdAt: now,
    status: UserMessageStatus.SUCCESS,
    modelId,
    model,
    blocks: [mainTextBlock.id]
  };

  const blocks: MessageBlock[] = [mainTextBlock];

  // 如果有图片，创建图片块
  if (images && Array.isArray(images) && images.length > 0) {
    for (const image of images) {
      if (image.url) {
        const imageBlock = createImageBlock(messageId, {
          url: image.url,
          mimeType: guessImageMimeType(image.url)
        });
        blocks.push(imageBlock);
        message.blocks.push(imageBlock.id);
      }
    }
  }

  return { message, blocks };
}

/**
 * 创建助手消息
 */
export function createAssistantMessage(options: {
  assistantId: string;
  topicId: string;
  modelId?: string;
  model?: Model;
  askId?: string;
  initialContent?: string;
  status?: AssistantMessageStatus; // 添加状态参数
}): { message: Message; blocks: MessageBlock[] } {
  const { assistantId, topicId, modelId, model, askId, initialContent = '', status = AssistantMessageStatus.SUCCESS } = options;
  const messageId = uuid();
  const now = new Date().toISOString();

  // 根据消息状态确定块状态
  let blockStatus: MessageBlockStatus = MessageBlockStatus.SUCCESS;
  if (status === AssistantMessageStatus.PENDING || status === AssistantMessageStatus.PROCESSING) {
    blockStatus = MessageBlockStatus.PROCESSING as MessageBlockStatus;
  } else if (status === AssistantMessageStatus.STREAMING) {
    blockStatus = MessageBlockStatus.STREAMING as MessageBlockStatus;
  } else if (status === AssistantMessageStatus.ERROR) {
    blockStatus = MessageBlockStatus.ERROR as MessageBlockStatus;
  } else if (status === AssistantMessageStatus.SEARCHING) {
    blockStatus = MessageBlockStatus.PROCESSING as MessageBlockStatus;
  }

  // 创建主文本块，使用initialContent或空字符串
  const mainTextBlock: MainTextMessageBlock = {
    id: uuid(),
    messageId,
    type: MessageBlockType.MAIN_TEXT,
    content: initialContent, // 使用提供的内容，不再设置默认值
    createdAt: now,
    status: blockStatus // 使用根据消息状态确定的块状态
  };

  // 创建消息对象
  const message: Message = {
    id: messageId,
    role: 'assistant',
    assistantId,
    topicId,
    createdAt: now,
    status, // 使用传入的状态
    modelId,
    model,
    askId,
    blocks: [mainTextBlock.id]
  };

  return { message, blocks: [mainTextBlock] };
}

/**
 * 创建系统消息
 */
export function createSystemMessage(options: {
  content: string;
  assistantId: string;
  topicId: string;
}): { message: Message; blocks: MessageBlock[] } {
  const { content, assistantId, topicId } = options;
  const messageId = uuid();
  const now = new Date().toISOString();

  // 创建主文本块
  const mainTextBlock: MainTextMessageBlock = {
    id: uuid(),
    messageId,
    type: MessageBlockType.MAIN_TEXT,
    content,
    createdAt: now,
    status: MessageBlockStatus.SUCCESS
  };

  // 创建消息对象
  const message: Message = {
    id: messageId,
    role: 'system',
    assistantId,
    topicId,
    createdAt: now,
    status: AssistantMessageStatus.SUCCESS,
    blocks: [mainTextBlock.id]
  };

  return { message, blocks: [mainTextBlock] };
}

/**
 * 创建思考块
 */
export function createThinkingBlock(messageId: string, content: string = ''): MessageBlock {
  return {
    id: uuid(),
    messageId,
    type: MessageBlockType.THINKING,
    content,
    createdAt: new Date().toISOString(),
    status: MessageBlockStatus.PENDING
  };
}

/**
 * 创建图片块
 */
export function createImageBlock(messageId: string, imageData: {
  url: string;
  base64Data?: string;
  mimeType: string;
  width?: number;
  height?: number;
  size?: number;
}): MessageBlock {
  return {
    id: uuid(),
    messageId,
    type: MessageBlockType.IMAGE,
    ...imageData,
    createdAt: new Date().toISOString(),
    status: MessageBlockStatus.SUCCESS
  };
}

/**
 * 创建代码块
 */
export function createCodeBlock(messageId: string, content: string, language?: string): MessageBlock {
  return {
    id: uuid(),
    messageId,
    type: MessageBlockType.CODE,
    content,
    language,
    createdAt: new Date().toISOString(),
    status: MessageBlockStatus.SUCCESS
  };
}

/**
 * 查找消息的所有主文本块
 */
export function findMainTextBlocks(message: Message): MainTextMessageBlock[] {
  if (!message || !message.blocks || message.blocks.length === 0) {
    return [];
  }

  try {
    const state = store.getState();
    const textBlocks: MainTextMessageBlock[] = [];

    for (const blockId of message.blocks) {
      try {
        const block = messageBlocksSelectors.selectById(state, blockId);
        if (block && block.type === MessageBlockType.MAIN_TEXT) {
          textBlocks.push(block as MainTextMessageBlock);
        }
      } catch (error) {
        console.error(`[findMainTextBlocks] 获取块 ${blockId} 失败:`, error);
      }
    }

    // 如果没有找到任何主文本块，创建一个默认的
    if (textBlocks.length === 0) {
      console.warn(`[findMainTextBlocks] 消息 ${message.id} 没有主文本块，创建默认块`);

      // 尝试从旧版本的content属性获取内容
      let content = '';
      if (typeof (message as any).content === 'string') {
        content = (message as any).content;
      }

      // 创建一个默认的主文本块
      const defaultBlock: MainTextMessageBlock = {
        id: 'default-block-' + Date.now(),
        messageId: message.id,
        type: MessageBlockType.MAIN_TEXT,
        content: content || '你好', // 使用默认内容
        createdAt: new Date().toISOString(),
        status: MessageBlockStatus.SUCCESS
      };

      textBlocks.push(defaultBlock);
    }

    return textBlocks;
  } catch (error) {
    console.error('[findMainTextBlocks] 查找主文本块失败:', error);

    // 返回一个默认的主文本块
    return [{
      id: 'error-block-' + Date.now(),
      messageId: message.id,
      type: MessageBlockType.MAIN_TEXT,
      content: '你好', // 使用默认内容
      createdAt: new Date().toISOString(),
      status: MessageBlockStatus.SUCCESS
    }];
  }
}

/**
 * 查找消息的所有思考块
 */
export function findThinkingBlocks(message: Message): ThinkingMessageBlock[] {
  if (!message || !message.blocks || message.blocks.length === 0) {
    return [];
  }

  const state = store.getState();
  const thinkingBlocks: ThinkingMessageBlock[] = [];

  for (const blockId of message.blocks) {
    const block = messageBlocksSelectors.selectById(state, blockId);
    if (block && block.type === MessageBlockType.THINKING) {
      thinkingBlocks.push(block as ThinkingMessageBlock);
    }
  }

  return thinkingBlocks;
}

/**
 * 查找消息的所有图片块
 */
export function findImageBlocks(message: Message): ImageMessageBlock[] {
  if (!message || !message.blocks || message.blocks.length === 0) {
    return [];
  }

  const state = store.getState();
  const imageBlocks: ImageMessageBlock[] = [];

  for (const blockId of message.blocks) {
    const block = messageBlocksSelectors.selectById(state, blockId);
    if (block && block.type === MessageBlockType.IMAGE) {
      imageBlocks.push(block as ImageMessageBlock);
    }
  }

  return imageBlocks;
}

/**
 * 查找消息的所有代码块
 */
export function findCodeBlocks(message: Message): CodeMessageBlock[] {
  if (!message || !message.blocks || message.blocks.length === 0) {
    return [];
  }

  const state = store.getState();
  const codeBlocks: CodeMessageBlock[] = [];

  for (const blockId of message.blocks) {
    const block = messageBlocksSelectors.selectById(state, blockId);
    if (block && block.type === MessageBlockType.CODE) {
      codeBlocks.push(block as CodeMessageBlock);
    }
  }

  return codeBlocks;
}

/**
 * 查找消息的所有引用块
 */
export function findCitationBlocks(message: Message): CitationMessageBlock[] {
  if (!message || !message.blocks || message.blocks.length === 0) {
    return [];
  }

  const state = store.getState();
  const citationBlocks: CitationMessageBlock[] = [];

  for (const blockId of message.blocks) {
    const block = messageBlocksSelectors.selectById(state, blockId);
    if (block && block.type === MessageBlockType.CITATION) {
      citationBlocks.push(block as CitationMessageBlock);
    }
  }

  return citationBlocks;
}

/**
 * 获取消息的主要文本内容
 */
export function getMainTextContent(message: Message): string {
  const textBlocks = findMainTextBlocks(message);
  return textBlocks.map(block => block.content).join('\n\n');
}

/**
 * 获取消息的所有文本内容（包括各类块）
 */
export function getAllTextContent(message: Message): string {
  if (!message || !message.blocks || message.blocks.length === 0) {
    return '';
  }

  const state = store.getState();
  const textParts: string[] = [];

  for (const blockId of message.blocks) {
    const block = messageBlocksSelectors.selectById(state, blockId);
    if (!block) continue;

    switch (block.type) {
      case MessageBlockType.MAIN_TEXT:
      case MessageBlockType.THINKING:
      case MessageBlockType.CODE:
      case MessageBlockType.CITATION:
      case MessageBlockType.TRANSLATION:
        textParts.push((block as any).content);
        break;
      case MessageBlockType.ERROR:
        textParts.push(`Error: ${(block as any).content}`);
        break;
      case MessageBlockType.IMAGE:
        textParts.push('[Image]');
        break;
      case MessageBlockType.FILE:
        textParts.push(`[File: ${(block as any).name}]`);
        break;
      case MessageBlockType.TOOL:
        textParts.push(`[Tool: ${(block as any).name}]`);
        break;
      case MessageBlockType.TABLE:
        textParts.push('[Table]');
        break;
      case MessageBlockType.MULTI_MODEL:
        const multiModel = block as MultiModelMessageBlock;
        textParts.push(`[多模型响应: ${multiModel.responses.length}个模型]`);
        break;
      case MessageBlockType.CHART:
        const chart = block as ChartMessageBlock;
        textParts.push(`[图表: ${chart.chartType}]`);
        break;
      case MessageBlockType.MATH:
        textParts.push(`[公式: ${(block as MathMessageBlock).content}]`);
        break;
      default:
        break;
    }
  }

  return textParts.join('\n\n');
}

/**
 * 统一创建消息函数
 */
export function createMessage(options: {
  role: 'user' | 'assistant' | 'system';
  content?: string;
  topicId: string;
  assistantId: string;
  modelId?: string;
  model?: Model;
  askId?: string;
}): { message: Message; blocks: MessageBlock[] } {
  const {
    role,
    content = '',
    topicId,
    assistantId,
    modelId,
    model,
    askId
  } = options;

  if (role === 'user') {
    return createUserMessage({
      content,
      assistantId,
      topicId,
      modelId,
      model
    });
  } else if (role === 'assistant') {
    return createAssistantMessage({
      assistantId,
      topicId,
      modelId,
      model,
      askId,
      initialContent: content
    });
  } else {
    return createSystemMessage({
      content,
      assistantId,
      topicId
    });
  }
}

/**
 * 将文本内容智能分割成多个块
 * 用于处理复杂的文本内容，如包含代码块、图片链接等的内容
 */
export function splitContentIntoBlocks(messageId: string, content: string): MessageBlock[] {
  const blocks: MessageBlock[] = [];
  const now = new Date().toISOString();

  // 简单的代码块检测正则表达式：```language ... ```
  const codeBlockRegex = /```([a-zA-Z0-9]*)\n([\s\S]*?)```/g;

  // 简单的图片链接检测正则表达式：![alt](url)
  const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;

  // 记录上一个匹配结束的位置
  let lastIndex = 0;

  // 临时保存提取的代码块
  const extractedBlocks: {
    type: 'code' | 'image';
    start: number;
    end: number;
    content: string;
    language?: string;
    url?: string;
  }[] = [];

  // 提取代码块
  let match: RegExpExecArray | null;
  while ((match = codeBlockRegex.exec(content)) !== null) {
    extractedBlocks.push({
      type: 'code',
      start: match.index,
      end: match.index + match[0].length,
      content: match[2],
      language: match[1] || undefined
    });
  }

  // 提取图片链接
  while ((match = imageRegex.exec(content)) !== null) {
    extractedBlocks.push({
      type: 'image',
      start: match.index,
      end: match.index + match[0].length,
      content: match[1], // alt text
      url: match[2]
    });
  }

  // 排序提取的块，按照它们在原始文本中的位置
  extractedBlocks.sort((a, b) => a.start - b.start);

  // 处理文本和提取的块
  for (const block of extractedBlocks) {
    // 如果提取的块前面有文本，创建文本块
    if (block.start > lastIndex) {
      const textContent = content.slice(lastIndex, block.start);
      if (textContent.trim()) {
        blocks.push({
          id: uuid(),
          messageId,
          type: MessageBlockType.MAIN_TEXT,
          content: textContent,
          createdAt: now,
          status: MessageBlockStatus.SUCCESS
        });
      }
    }

    // 创建提取的块
    if (block.type === 'code') {
      blocks.push({
        id: uuid(),
        messageId,
        type: MessageBlockType.CODE,
        content: block.content,
        language: block.language,
        createdAt: now,
        status: MessageBlockStatus.SUCCESS
      });
    } else if (block.type === 'image' && block.url) {
      blocks.push({
        id: uuid(),
        messageId,
        type: MessageBlockType.IMAGE,
        url: block.url,
        mimeType: guessImageMimeType(block.url),
        createdAt: now,
        status: MessageBlockStatus.SUCCESS
      });
    }

    lastIndex = block.end;
  }

  // 处理剩余的文本
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex);
    if (textContent.trim() || blocks.length === 0) {
      blocks.push({
        id: uuid(),
        messageId,
        type: MessageBlockType.MAIN_TEXT,
        content: textContent,
        createdAt: now,
        status: MessageBlockStatus.SUCCESS
      });
    }
  }

  return blocks;
}

/**
 * 尝试推测图片的MIME类型
 */
function guessImageMimeType(url: string): string {
  if (url.startsWith('data:')) {
    const mimeMatch = url.match(/^data:([^;]+);/);
    return mimeMatch ? mimeMatch[1] : 'image/jpeg';
  }

  const extension = url.split('.').pop()?.toLowerCase();
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    case 'svg':
      return 'image/svg+xml';
    default:
      return 'image/jpeg';
  }
}

/**
 * 添加块到消息
 */
export function addBlockToMessage(message: Message, block: MessageBlock): Message {
  if (!message.blocks.includes(block.id)) {
    return {
      ...message,
      blocks: [...message.blocks, block.id],
      updatedAt: new Date().toISOString()
    };
  }
  return message;
}

/**
 * 移除块从消息
 */
export function removeBlockFromMessage(message: Message, blockId: string): Message {
  if (message.blocks.includes(blockId)) {
    return {
      ...message,
      blocks: message.blocks.filter((id: string) => id !== blockId),
      updatedAt: new Date().toISOString()
    };
  }
  return message;
}

/**
 * 将消息导出为简单文本格式
 */
export function exportMessageAsText(message: Message): string {
  const state = store.getState();
  let result = '';

  // 添加角色前缀
  if (message.role === 'user') {
    result += '🧑 用户: \n';
  } else if (message.role === 'assistant') {
    result += '🤖 助手: \n';
  } else {
    result += '💻 系统: \n';
  }

  // 处理每个块
  for (const blockId of message.blocks) {
    const block = messageBlocksSelectors.selectById(state, blockId);
    if (!block) continue;

    switch (block.type) {
      case MessageBlockType.MAIN_TEXT:
      case MessageBlockType.THINKING:
        result += (block as MainTextMessageBlock).content + '\n\n';
        break;

      case MessageBlockType.CODE:
        const codeBlock = block as CodeMessageBlock;
        result += '```' + (codeBlock.language || '') + '\n';
        result += codeBlock.content + '\n';
        result += '```\n\n';
        break;

      case MessageBlockType.CITATION:
        const citationBlock = block as CitationMessageBlock;
        result += `> ${citationBlock.content}\n`;
        if (citationBlock.source) {
          result += `> —— ${citationBlock.source}\n\n`;
        }
        break;

      case MessageBlockType.IMAGE:
        const imageBlock = block as ImageMessageBlock;
        result += `[图片: ${imageBlock.url}]\n\n`;
        break;

      default:
        // 其他类型块暂不处理
        break;
    }
  }

  return result.trim();
}

/**
 * 创建翻译块
 */
export function createTranslationBlock(
  messageId: string,
  content: string,
  sourceContent: string,
  sourceLanguage: string,
  targetLanguage: string,
  sourceBlockId?: string
): MessageBlock {
  return {
    id: uuid(),
    messageId,
    type: MessageBlockType.TRANSLATION,
    content,
    sourceContent,
    sourceLanguage,
    targetLanguage,
    sourceBlockId,
    createdAt: new Date().toISOString(),
    status: MessageBlockStatus.SUCCESS
  };
}

/**
 * 创建表格块
 */
export function createTableBlock(
  messageId: string,
  headers: string[],
  rows: string[][],
  caption?: string
): MessageBlock {
  return {
    id: uuid(),
    messageId,
    type: MessageBlockType.TABLE,
    headers,
    rows,
    caption,
    createdAt: new Date().toISOString(),
    status: MessageBlockStatus.SUCCESS
  };
}

/**
 * 创建多模型响应块
 */
export function createMultiModelBlock(
  messageId: string,
  responses: {
    modelId: string;
    modelName: string;
    content: string;
    status: MessageBlockStatus;
  }[],
  displayStyle: 'horizontal' | 'vertical' | 'fold' | 'grid' = 'vertical'
): MessageBlock {
  return {
    id: uuid(),
    messageId,
    type: MessageBlockType.MULTI_MODEL,
    responses,
    displayStyle,
    createdAt: new Date().toISOString(),
    status: MessageBlockStatus.SUCCESS
  };
}

/**
 * 创建图表块
 */
export function createChartBlock(
  messageId: string,
  chartType: 'bar' | 'line' | 'pie' | 'scatter',
  data: any,
  options?: any
): MessageBlock {
  return {
    id: uuid(),
    messageId,
    type: MessageBlockType.CHART,
    chartType,
    data,
    options,
    createdAt: new Date().toISOString(),
    status: MessageBlockStatus.SUCCESS
  };
}

/**
 * 创建数学公式块
 */
export function createMathBlock(
  messageId: string,
  content: string,
  displayMode: boolean = true
): MessageBlock {
  return {
    id: uuid(),
    messageId,
    type: MessageBlockType.MATH,
    content,
    displayMode,
    createdAt: new Date().toISOString(),
    status: MessageBlockStatus.SUCCESS
  };
}

/**
 * 查找消息的所有翻译块
 */
export function findTranslationBlocks(message: Message): TranslationMessageBlock[] {
  if (!message || !message.blocks || message.blocks.length === 0) {
    return [];
  }

  const state = store.getState();
  const translationBlocks: TranslationMessageBlock[] = [];

  for (const blockId of message.blocks) {
    const block = messageBlocksSelectors.selectById(state, blockId);
    if (block && block.type === MessageBlockType.TRANSLATION) {
      translationBlocks.push(block as TranslationMessageBlock);
    }
  }

  return translationBlocks;
}

/**
 * 查找消息的所有表格块
 */
export function findTableBlocks(message: Message): TableMessageBlock[] {
  if (!message || !message.blocks || message.blocks.length === 0) {
    return [];
  }

  const state = store.getState();
  const tableBlocks: TableMessageBlock[] = [];

  for (const blockId of message.blocks) {
    const block = messageBlocksSelectors.selectById(state, blockId);
    if (block && block.type === MessageBlockType.TABLE) {
      tableBlocks.push(block as TableMessageBlock);
    }
  }

  return tableBlocks;
}

/**
 * 查找消息的所有多模型响应块
 */
export function findMultiModelBlocks(message: Message): MultiModelMessageBlock[] {
  if (!message || !message.blocks || message.blocks.length === 0) {
    return [];
  }

  const state = store.getState();
  const multiModelBlocks: MultiModelMessageBlock[] = [];

  for (const blockId of message.blocks) {
    const block = messageBlocksSelectors.selectById(state, blockId);
    if (block && block.type === MessageBlockType.MULTI_MODEL) {
      multiModelBlocks.push(block as MultiModelMessageBlock);
    }
  }

  return multiModelBlocks;
}

/**
 * 查找消息的所有图表块
 */
export function findChartBlocks(message: Message): ChartMessageBlock[] {
  if (!message || !message.blocks || message.blocks.length === 0) {
    return [];
  }

  const state = store.getState();
  const chartBlocks: ChartMessageBlock[] = [];

  for (const blockId of message.blocks) {
    const block = messageBlocksSelectors.selectById(state, blockId);
    if (block && block.type === MessageBlockType.CHART) {
      chartBlocks.push(block as ChartMessageBlock);
    }
  }

  return chartBlocks;
}

/**
 * 查找消息的所有数学公式块
 */
export function findMathBlocks(message: Message): MathMessageBlock[] {
  if (!message || !message.blocks || message.blocks.length === 0) {
    return [];
  }

  const state = store.getState();
  const mathBlocks: MathMessageBlock[] = [];

  for (const blockId of message.blocks) {
    const block = messageBlocksSelectors.selectById(state, blockId);
    if (block && block.type === MessageBlockType.MATH) {
      mathBlocks.push(block as MathMessageBlock);
    }
  }

  return mathBlocks;
}

/**
 * 重置助手消息，创建一个干净的消息对象，为重新生成做准备
 * 
 * @param originalMessage 原始助手消息
 * @param updates 可选的更新内容，例如状态、模型等
 * @returns 重置后的消息对象
 */
export function resetAssistantMessage(
  originalMessage: Message,
  updates?: Partial<Pick<Message, 'status' | 'updatedAt' | 'model' | 'modelId'>>
): Message {
  // 确保只重置助手消息
  if (originalMessage.role !== 'assistant') {
    console.warn(
      `[resetAssistantMessage] 尝试重置非助手消息 (ID: ${originalMessage.id}, Role: ${originalMessage.role})。返回原始消息。`
    );
    return originalMessage;
  }

  // 创建重置后的消息
  return {
    // --- 保留核心标识符 ---
    id: originalMessage.id,  // 保持相同的消息ID
    topicId: originalMessage.topicId,
    askId: originalMessage.askId,  // 保持与原始用户查询的链接

    // --- 保留身份信息 ---
    role: 'assistant',
    assistantId: originalMessage.assistantId,
    model: originalMessage.model,  // 保持模型信息
    modelId: originalMessage.modelId,

    // --- 重置响应内容和状态 ---
    blocks: [],  // 清空块数组
    status: AssistantMessageStatus.PENDING,  // 默认设置为PENDING

    // --- 时间戳 ---
    createdAt: originalMessage.createdAt,  // 保留原始创建时间
    updatedAt: new Date().toISOString(),   // 更新时间设为当前

    // --- 应用传入的更新 ---
    ...updates  // 应用任何特定的更新
  };
}