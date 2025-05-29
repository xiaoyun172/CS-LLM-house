import { dexieStorage } from '../../../services/DexieStorageService';
import { getMainTextContent, findImageBlocks, findFileBlocks } from '../../../utils/blockUtils';
import { getFileTypeByExtension, readFileContent, FileTypes } from '../../../utils/fileUtils';
import type { MCPTool, Message } from '../../../types'; // 补充Message类型
import { REFERENCE_PROMPT } from '../../../config/prompts';

export const prepareMessagesForApi = async (
  topicId: string,
  assistantMessageId: string,
  _mcpTools?: MCPTool[] // 添加下划线前缀表示未使用的参数
) => {
  // 🔥 关键修复：使用getTopicMessages获取包含content字段的消息
  // 这样可以获取到多模型对比选择后保存的内容
  const messages = await dexieStorage.getTopicMessages(topicId);

  // 按创建时间排序消息，确保顺序正确
  const sortedMessages = [...messages].sort((a, b) => {
    const timeA = new Date(a.createdAt).getTime();
    const timeB = new Date(b.createdAt).getTime();
    return timeA - timeB; // 升序排列，最早的在前面
  });

  // 获取当前助手消息
  const assistantMessage = sortedMessages.find((msg: Message) => msg.id === assistantMessageId);
  if (!assistantMessage) {
    throw new Error(`找不到助手消息 ${assistantMessageId}`);
  }

  // 获取当前助手消息的创建时间
  const assistantMessageTime = new Date(assistantMessage.createdAt).getTime();

  // 获取当前助手ID，用于获取系统提示词
  const topic = await dexieStorage.getTopic(topicId);
  const assistantId = topic?.assistantId;

  // 获取系统提示词
  let systemPrompt = '';
  if (assistantId) {
    const assistant = await dexieStorage.getAssistant(assistantId);
    if (assistant) {
      systemPrompt = assistant.systemPrompt || '';

      // 如果话题有自定义提示词，优先使用话题的提示词
      if (topic && topic.prompt) {
        systemPrompt = topic.prompt;
      }
    }
  }

  // 转换为API请求格式，只包含当前助手消息之前的消息
  const apiMessages = [];

  for (const message of sortedMessages) {
    // 跳过当前正在处理的助手消息和所有system消息
    if (message.id === assistantMessageId || message.role === 'system') {
      continue;
    }

    // 只包含创建时间早于当前助手消息的消息
    const messageTime = new Date(message.createdAt).getTime();
    if (messageTime >= assistantMessageTime) {
      continue;
    }

    // 获取消息内容 - 检查是否有知识库缓存（风格）
    let content = getMainTextContent(message);

    // 如果是用户消息，检查是否有知识库搜索结果
    if (message.role === 'user') {
      const cacheKey = `knowledge-search-${message.id}`;
      const cachedReferences = window.sessionStorage.getItem(cacheKey);

      if (cachedReferences && content) {
        try {
          const references = JSON.parse(cachedReferences);
          if (references && references.length > 0) {
            // 应用REFERENCE_PROMPT格式（风格）
            const referenceContent = `\`\`\`json\n${JSON.stringify(references, null, 2)}\n\`\`\``;
            content = REFERENCE_PROMPT
              .replace('{question}', content)
              .replace('{references}', referenceContent);

            console.log(`[prepareMessagesForApi] 为消息 ${message.id} 应用了知识库上下文，引用数量: ${references.length}`);

            // 清除缓存
            window.sessionStorage.removeItem(cacheKey);
          }
        } catch (error) {
          console.error('[prepareMessagesForApi] 解析知识库缓存失败:', error);
        }
      }
    }

    // 检查是否有文件或图片块
    const imageBlocks = findImageBlocks(message);
    const fileBlocks = findFileBlocks(message);

    // 如果没有文件和图片，使用简单格式
    if (imageBlocks.length === 0 && fileBlocks.length === 0) {
      apiMessages.push({
        role: message.role,
        content: content || '' // 确保content不为undefined或null
      });
    } else {
      // 有文件或图片时，使用多模态格式
      const parts = [];

      // 确保至少有一个文本部分，即使内容为空
      // 这样可以避免parts数组为空导致API请求失败
      parts.push({ type: 'text', text: content || '' });

      // 处理图片块
      for (const imageBlock of imageBlocks) {
        if (imageBlock.url) {
          parts.push({
            type: 'image_url',
            image_url: {
              url: imageBlock.url
            }
          });
        } else if (imageBlock.file && imageBlock.file.base64Data) {
          let base64Data = imageBlock.file.base64Data;
          if (base64Data.includes(',')) {
            base64Data = base64Data.split(',')[1];
          }
          parts.push({
            type: 'image_url',
            image_url: {
              url: `data:${imageBlock.file.mimeType || 'image/jpeg'};base64,${base64Data}`
            }
          });
        }
      }

      // 处理文件块
      for (const fileBlock of fileBlocks) {
        if (fileBlock.file) {
          const fileType = getFileTypeByExtension(fileBlock.file.name || fileBlock.file.origin_name || '');

          // 处理文本、代码和文档类型的文件
          if (fileType === FileTypes.TEXT || fileType === FileTypes.CODE || fileType === FileTypes.DOCUMENT) {
            try {
              const fileContent = await readFileContent(fileBlock.file);
              if (fileContent) {
                // 按照最佳实例格式：文件名\n文件内容
                const fileName = fileBlock.file.origin_name || fileBlock.file.name || '未知文件';
                parts.push({
                  type: 'text',
                  text: `${fileName}\n${fileContent}`
                });
              }
            } catch (error) {
              console.error(`[prepareMessagesForApi] 读取文件内容失败:`, error);
            }
          }
        }
      }

      apiMessages.push({
        role: message.role,
        content: parts
      });
    }
  }

  // 在数组开头添加系统消息
  // 注意：MCP 工具注入现在由提供商层的智能切换机制处理
  apiMessages.unshift({
    role: 'system',
    content: systemPrompt
  });

  return apiMessages;
};