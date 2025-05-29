import { throttle } from 'lodash';
import store from '../../store';
import { dexieStorage } from '../DexieStorageService';
import { EventEmitter, EVENT_NAMES } from '../EventEmitter';
import { createStreamProcessor } from '../StreamProcessingService';
import { MessageBlockStatus, AssistantMessageStatus, MessageBlockType } from '../../types/newMessage';
import type { MessageBlock, ToolMessageBlock } from '../../types/newMessage';
import { newMessagesActions } from '../../store/slices/newMessagesSlice';
import type { ErrorInfo } from '../../store/slices/newMessagesSlice';
import { formatErrorMessage, getErrorType } from '../../utils/error';
import { updateOneBlock, addOneBlock } from '../../store/slices/messageBlocksSlice';


import type { Chunk } from '../../types/chunk';
import { v4 as uuid } from 'uuid';
import { globalToolTracker } from '../../utils/toolExecutionSync';
import { createToolBlock } from '../../utils/messageUtils';
import { hasToolUseTags } from '../../utils/mcpToolParser';
import { parseComparisonResult, createModelComparisonBlock } from '../../utils/modelComparisonUtils';
import { isApiKeyError, retryApiKeyError, showApiKeyConfigHint } from '../../utils/apiKeyErrorHandler';
import { TopicNamingService } from '../TopicNamingService';

/**
 * 响应处理器配置类型
 */
type ResponseHandlerConfig = {
  messageId: string;
  blockId: string;
  topicId: string;
};

// 在文件开头添加错误记录类型定义
type ErrorRecord = Record<string, any>;

/**
 * 响应处理错误
 */
export class ApiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApiError';
  }
}



/**
 * 创建响应处理器
 * 处理API流式响应的接收、更新和完成
 */
export function createResponseHandler({ messageId, blockId, topicId }: ResponseHandlerConfig) {
  // 创建简单的节流数据库更新函数
  const throttledUpdateBlock = throttle((blockId: string, changes: any) => {
    dexieStorage.updateMessageBlock(blockId, changes);
  }, 200); // 200ms节流，减少数据库写入频率

  // 流式处理状态变量
  let accumulatedContent = '';
  let accumulatedThinking = '';
  let thinkingBlockId: string | null = null;
  let mainTextBlockId: string | null = null;

  // 占位符块转换状态跟踪
  let lastBlockId: string | null = blockId;
  let lastBlockType: MessageBlockType | null = MessageBlockType.UNKNOWN;

  // 工具调用ID到块ID的映射 - 参考最佳实例逻辑
  const toolCallIdToBlockIdMap = new Map<string, string>();

  // 创建节流的Redux更新函数，避免无限循环
  const throttledReduxUpdate = throttle((blockId: string, changes: any) => {
    store.dispatch(updateOneBlock({ id: blockId, changes }));
  }, 100); // 100ms节流，与最佳实例保持一致

  // 🔥 新增：创建响应处理器实例，用于事件转换
  let responseHandlerInstance: any = null;

  // 🔥 新增：事件监听器清理函数
  let eventCleanupFunctions: (() => void)[] = [];

  // 实现最佳实例的回调系统
  const callbacks = {
    onTextChunk: (text: string) => {
      accumulatedContent += text;

      if (lastBlockType === MessageBlockType.UNKNOWN) {
        // 第一次收到文本，转换占位符块为主文本块
        lastBlockType = MessageBlockType.MAIN_TEXT;
        mainTextBlockId = lastBlockId;

        const initialChanges = {
          type: MessageBlockType.MAIN_TEXT,
          content: accumulatedContent,
          status: MessageBlockStatus.STREAMING,
          updatedAt: new Date().toISOString()
        };

        // 立即更新Redux状态（转换操作）
        store.dispatch(updateOneBlock({ id: lastBlockId!, changes: initialChanges }));
        // 同时保存到数据库（使用节流）
        throttledUpdateBlock(lastBlockId!, initialChanges);
      } else if (lastBlockType === MessageBlockType.THINKING) {
        // 如果占位符块已经被转换为思考块，需要为普通文本创建新的块
        if (!mainTextBlockId) {
          // 创建新的主文本块
          const newMainTextBlock: MessageBlock = {
            id: uuid(),
            messageId,
            type: MessageBlockType.MAIN_TEXT,
            content: accumulatedContent,
            createdAt: new Date().toISOString(),
            status: MessageBlockStatus.STREAMING
          };

          mainTextBlockId = newMainTextBlock.id;

          // 添加到Redux状态
          store.dispatch(addOneBlock(newMainTextBlock));
          // 保存到数据库
          dexieStorage.saveMessageBlock(newMainTextBlock);

          // 将新块添加到消息的blocks数组
          store.dispatch(newMessagesActions.upsertBlockReference({
            messageId,
            blockId: mainTextBlockId!,
            status: MessageBlockStatus.STREAMING
          }));
        } else {
          // 更新现有的主文本块
          const blockChanges = {
            content: accumulatedContent,
            status: MessageBlockStatus.STREAMING,
            updatedAt: new Date().toISOString()
          };

          throttledReduxUpdate(mainTextBlockId, blockChanges);
          throttledUpdateBlock(mainTextBlockId, blockChanges);
        }
      } else if (lastBlockType === MessageBlockType.MAIN_TEXT && mainTextBlockId) {
        // 更新现有的主文本块
        const blockChanges = {
          content: accumulatedContent,
          status: MessageBlockStatus.STREAMING,
          updatedAt: new Date().toISOString()
        };

        throttledReduxUpdate(mainTextBlockId, blockChanges);
        throttledUpdateBlock(mainTextBlockId, blockChanges);
      }
    },

    onThinkingChunk: (text: string, thinking_millsec?: number) => {
      accumulatedThinking += text;
      if (lastBlockId) {
        if (lastBlockType === MessageBlockType.UNKNOWN) {
          // 第一次收到思考内容，转换占位符块为思考块（立即执行，不节流）
          lastBlockType = MessageBlockType.THINKING;
          thinkingBlockId = lastBlockId;

          const initialChanges = {
            type: MessageBlockType.THINKING,
            content: accumulatedThinking,
            status: MessageBlockStatus.STREAMING,
            thinking_millsec: thinking_millsec || 0,
            updatedAt: new Date().toISOString()
          };

          // 立即更新Redux状态（转换操作）
          store.dispatch(updateOneBlock({ id: lastBlockId, changes: initialChanges }));
          // 同时保存到数据库（使用节流）
          throttledUpdateBlock(lastBlockId, initialChanges);
        } else if (lastBlockType === MessageBlockType.THINKING) {
          // 后续思考内容更新，使用节流更新Redux和数据库
          const blockChanges = {
            content: accumulatedThinking,
            status: MessageBlockStatus.STREAMING,
            thinking_millsec: thinking_millsec || 0,
            updatedAt: new Date().toISOString()
          };

          // 使用节流更新Redux状态，避免过度渲染
          throttledReduxUpdate(lastBlockId, blockChanges);
          // 使用节流更新数据库
          throttledUpdateBlock(lastBlockId, blockChanges);
        }
      }
    }
  };

  // 🔥 移除重复的事件监听器，避免双重处理
  // ResponseHandler应该只通过直接回调处理流式数据，不需要监听全局事件
  // 这样可以避免同一个内容被处理两次的问题
  const setupEventListeners = () => {
    console.log(`[ResponseHandler] 跳过事件监听器设置，使用直接回调处理流式数据`);

    // 返回空的清理函数
    eventCleanupFunctions = [];

    return () => {
      eventCleanupFunctions.forEach(cleanup => cleanup());
    };
  };

  responseHandlerInstance = {
    /**
     * 处理基于最佳实例架构的 Chunk 事件
     * @param chunk Chunk 事件对象
     */
    async handleChunkEvent(chunk: Chunk) {
      try {
        switch (chunk.type) {
          case 'thinking.delta':
            const thinkingDelta = chunk as import('../../types/chunk').ThinkingDeltaChunk;
            console.log(`[ResponseHandler] 处理思考增量，长度: ${thinkingDelta.text.length}`);
            callbacks.onThinkingChunk?.(thinkingDelta.text, thinkingDelta.thinking_millsec);
            break;

          case 'thinking.complete':
            const thinkingComplete = chunk as import('../../types/chunk').ThinkingCompleteChunk;
            console.log(`[ResponseHandler] 处理思考完成，总长度: ${thinkingComplete.text.length}`);
            // 对于完成事件，直接设置完整的思考内容，不调用增量回调
            accumulatedThinking = thinkingComplete.text;

            // 直接处理思考块转换，不使用增量回调
            if (lastBlockId && lastBlockType === MessageBlockType.UNKNOWN) {
              // 第一次收到思考内容，转换占位符块为思考块
              lastBlockType = MessageBlockType.THINKING;
              thinkingBlockId = lastBlockId;

              const initialChanges = {
                type: MessageBlockType.THINKING,
                content: accumulatedThinking,
                status: MessageBlockStatus.STREAMING,
                thinking_millsec: thinkingComplete.thinking_millsec || 0,
                updatedAt: new Date().toISOString()
              };

              console.log(`[ResponseHandler] 将占位符块 ${blockId} 转换为思考块（完成事件）`);

              // 立即更新Redux状态
              store.dispatch(updateOneBlock({ id: lastBlockId, changes: initialChanges }));
              // 同时保存到数据库
              throttledUpdateBlock(lastBlockId, initialChanges);
            }
            break;

          case 'text.delta':
            const textDelta = chunk as import('../../types/chunk').TextDeltaChunk;
            console.log(`[ResponseHandler] 处理文本增量，长度: ${textDelta.text.length}`);
            callbacks.onTextChunk?.(textDelta.text);
            break;

          case 'text.complete':
            const textComplete = chunk as import('../../types/chunk').TextCompleteChunk;
            console.log(`[ResponseHandler] 处理文本完成，总长度: ${textComplete.text.length}`);

            // 🔥 关键修复：检查是否需要追加内容而不是覆盖
            if (accumulatedContent.trim() && !textComplete.text.includes(accumulatedContent)) {
              // 如果已有内容且新内容不包含旧内容，则追加
              const separator = '\n\n';
              accumulatedContent = accumulatedContent + separator + textComplete.text;
              console.log(`[ResponseHandler] 追加文本内容，累积长度: ${accumulatedContent.length}`);
            } else {
              // 否则直接设置（第一次或新内容已包含旧内容）
              accumulatedContent = textComplete.text;
              console.log(`[ResponseHandler] 设置文本内容，长度: ${accumulatedContent.length}`);
            }

            // 直接处理文本块转换，不使用增量回调
            if (lastBlockType === MessageBlockType.UNKNOWN) {
              // 第一次收到文本，转换占位符块为主文本块
              lastBlockType = MessageBlockType.MAIN_TEXT;
              mainTextBlockId = lastBlockId;

              const initialChanges = {
                type: MessageBlockType.MAIN_TEXT,
                content: accumulatedContent,
                status: MessageBlockStatus.STREAMING,
                updatedAt: new Date().toISOString()
              };

              console.log(`[ResponseHandler] 将占位符块 ${blockId} 转换为主文本块（完成事件）`);

              // 立即更新Redux状态
              store.dispatch(updateOneBlock({ id: lastBlockId!, changes: initialChanges }));
              // 同时保存到数据库
              throttledUpdateBlock(lastBlockId!, initialChanges);
            } else if (lastBlockType === MessageBlockType.THINKING) {
              // 如果占位符块已经被转换为思考块，需要为普通文本创建新的块
              if (!mainTextBlockId) {
                // 创建新的主文本块
                const newMainTextBlock: MessageBlock = {
                  id: uuid(),
                  messageId,
                  type: MessageBlockType.MAIN_TEXT,
                  content: accumulatedContent,
                  createdAt: new Date().toISOString(),
                  status: MessageBlockStatus.STREAMING
                };

                mainTextBlockId = newMainTextBlock.id;

                console.log(`[ResponseHandler] 创建新的主文本块 ${mainTextBlockId}（完成事件）`);

                // 添加到Redux状态
                store.dispatch(addOneBlock(newMainTextBlock));
                // 保存到数据库
                dexieStorage.saveMessageBlock(newMainTextBlock);

                // 将新块添加到消息的blocks数组
                store.dispatch(newMessagesActions.upsertBlockReference({
                  messageId,
                  blockId: mainTextBlockId,
                  status: MessageBlockStatus.STREAMING
                }));
              }
            }
            break;

          case 'mcp_tool_in_progress':
            console.log(`[ResponseHandler] 处理工具调用进行中事件`);
            // 创建或更新工具块
            await this.handleToolProgress(chunk as any);
            break;

          case 'mcp_tool_complete':
            console.log(`[ResponseHandler] 处理工具调用完成事件`);
            // 更新工具块状态
            await this.handleToolComplete(chunk as any);
            break;

          default:
            console.log(`[ResponseHandler] 忽略未处理的 chunk 类型: ${chunk.type}`);
            break;
        }
      } catch (error) {
        console.error(`[ResponseHandler] 处理 chunk 事件失败:`, error);
      }
    },

    /**
     * 处理流式响应片段（兼容旧接口）
     * @param chunk 响应片段
     * @param reasoning 推理内容（可选）
     */
    handleChunk(chunk: string, reasoning?: string) {
      // 检查是否被中断 - 如果被中断则停止处理
      const currentState = store.getState();
      const message = currentState.messages.entities[messageId];
      if (message?.status === AssistantMessageStatus.SUCCESS) {
        console.log(`[ResponseHandler] 消息已完成，停止处理新的块`);
        return accumulatedContent;
      }

      // 检查是否是对比结果
      if (chunk === '__COMPARISON_RESULT__' && reasoning) {
        console.log(`[ResponseHandler] 检测到对比结果`);
        this.handleComparisonResult(reasoning);
        return;
      }

      // 检查是否有推理内容
      let isThinking = false;
      let thinkingContent = '';
      let thinkingTime = 0;

      // 优先使用传入的推理内容
      if (reasoning !== undefined && reasoning.trim()) {
        isThinking = true;
        thinkingContent = reasoning;
        thinkingTime = 0;
        console.log(`[ResponseHandler] 接收到推理内容: "${reasoning}"`);
      } else {
        // 尝试解析JSON，检查是否包含思考内容
        try {
          const parsedChunk = JSON.parse(chunk);
          if (parsedChunk && parsedChunk.reasoning) {
            isThinking = true;
            thinkingContent = parsedChunk.reasoning;
            thinkingTime = parsedChunk.reasoningTime || 0;
          }
        } catch (e) {
          // 不是JSON，按普通文本处理
        }
      }

      // 完全模仿最佳实例的回调架构
      if (isThinking) {
        // 调用onThinkingChunk回调
        console.log(`[ResponseHandler] 处理思考内容，长度: ${thinkingContent.length}`);
        callbacks.onThinkingChunk?.(thinkingContent, thinkingTime);
      } else {
        // 调用onTextChunk回调
        console.log(`[ResponseHandler] 处理普通文本，长度: ${chunk.length}`);
        callbacks.onTextChunk?.(chunk);
      }

      // 返回当前累积的内容
      return accumulatedContent;
    },

    /**
     * 处理对比结果
     * @param reasoningData 对比结果的JSON字符串
     */
    async handleComparisonResult(reasoningData: string) {
      try {
        console.log(`[ResponseHandler] 处理对比结果，数据长度: ${reasoningData.length}`);

        // 解析对比结果
        const comboResult = parseComparisonResult(reasoningData);

        if (!comboResult) {
          console.error(`[ResponseHandler] 解析对比结果失败`);
          return;
        }

        console.log(`[ResponseHandler] 成功解析对比结果，模型数量: ${comboResult.modelResults.length}`);

        // 创建对比消息块
        const comparisonBlock = createModelComparisonBlock(comboResult, messageId);

        // 添加到Redux状态
        store.dispatch(addOneBlock(comparisonBlock));

        // 保存到数据库
        await dexieStorage.saveMessageBlock(comparisonBlock);

        // 将块添加到消息的blocks数组（使用最常用的方式）
        const currentMessage = store.getState().messages.entities[messageId];
        if (currentMessage) {
          const updatedBlocks = [...(currentMessage.blocks || []), comparisonBlock.id];

          // 🔧 修复：同时更新 Redux 和数据库
          store.dispatch(newMessagesActions.updateMessage({
            id: messageId,
            changes: {
              blocks: updatedBlocks
            }
          }));

          // 🔧 关键修复：同步更新数据库中的消息blocks数组
          await dexieStorage.updateMessage(messageId, {
            blocks: updatedBlocks
          });

          console.log(`[ResponseHandler] 已更新消息 ${messageId} 的blocks数组: [${updatedBlocks.join(', ')}]`);
        } else {
          console.error(`[ResponseHandler] 找不到消息: ${messageId}`);
        }

        console.log(`[ResponseHandler] 对比块创建完成: ${comparisonBlock.id}`);

        // 更新消息状态为成功
        store.dispatch(newMessagesActions.updateMessage({
          id: messageId,
          changes: {
            status: AssistantMessageStatus.SUCCESS,
            updatedAt: new Date().toISOString()
          }
        }));

      } catch (error) {
        console.error(`[ResponseHandler] 处理对比结果失败:`, error);
      }
    },

    /**
     * 原子性工具块操作 - 使用静态导入
     */
    async atomicToolBlockOperation(toolId: string, toolBlock: any, operation: 'create' | 'update') {
      try {
        // 参考 Cline：使用事务确保原子性
        await dexieStorage.transaction('rw', [
          dexieStorage.message_blocks,
          dexieStorage.messages
        ], async () => {
          if (operation === 'create') {
            // 1. 更新映射
            toolCallIdToBlockIdMap.set(toolId, toolBlock.id);

            // 2. 添加到 Redux 状态
            store.dispatch(addOneBlock(toolBlock));

            // 3. 保存到数据库
            await dexieStorage.saveMessageBlock(toolBlock);

            // 4. 更新消息的 blocks 数组
            store.dispatch(newMessagesActions.upsertBlockReference({
              messageId: messageId,
              blockId: toolBlock.id,
              status: toolBlock.status
            }));
          }
        });

        console.log(`[ResponseHandler] 原子性工具块操作完成: ${operation} - toolId: ${toolId}, blockId: ${toolBlock.id}`);
      } catch (error) {
        console.error(`[ResponseHandler] 原子性工具块操作失败: ${operation} - toolId: ${toolId}:`, error);
        throw error;
      }
    },

    /**
     * 处理单个工具错误 - 参考 Cline 的错误处理机制
     */
    async handleSingleToolError(toolId: string, error: any) {
      try {
        const existingBlockId = toolCallIdToBlockIdMap.get(toolId);
        if (existingBlockId) {
          // 更新工具块状态为错误
          const errorChanges = {
            status: MessageBlockStatus.ERROR,
            error: {
              message: error.message || '工具执行失败',
              details: error.stack || error.toString()
            },
            updatedAt: new Date().toISOString()
          };

          store.dispatch(updateOneBlock({
            id: existingBlockId,
            changes: errorChanges
          }));

          await dexieStorage.updateMessageBlock(existingBlockId, errorChanges);
        }
      } catch (updateError) {
        console.error(`[ResponseHandler] 更新工具错误状态失败:`, updateError);
      }
    },

    /**
     * 处理工具调用进行中事件 - 参考 Cline 的稳定性机制
     */
    async handleToolProgress(chunk: { type: 'mcp_tool_in_progress'; responses: any[] }) {
      try {
        console.log(`[ResponseHandler] 处理工具进行中，工具数量: ${chunk.responses?.length || 0}`);

        if (!chunk.responses || chunk.responses.length === 0) {
          return;
        }

        // 使用静态导入的模块

        // 参考 Cline 的顺序处理机制：逐个处理工具响应，确保稳定性
        for (const toolResponse of chunk.responses) {
          try {
            console.log(`[ResponseHandler] 处理工具响应: toolResponse.id=${toolResponse.id}, tool.name=${toolResponse.tool.name}, tool.id=${toolResponse.tool.id}`);

            // 参考 Cline：如果是 invoking 状态，创建新的工具块
            if (toolResponse.status === 'invoking') {
              // 检查是否已存在该工具的块（防止重复创建）
              const existingBlockId = toolCallIdToBlockIdMap.get(toolResponse.id);
              if (existingBlockId) {
                console.log(`[ResponseHandler] 工具块已存在: ${existingBlockId} (toolId: ${toolResponse.id})`);
                continue;
              }

              // 参考 Cline：标记工具开始执行
              globalToolTracker.startTool(toolResponse.id);

              const toolBlock = createToolBlock(messageId, toolResponse.id, {
                toolName: toolResponse.tool.name,
                arguments: toolResponse.arguments,
                status: MessageBlockStatus.PROCESSING,
                metadata: {
                  rawMcpToolResponse: toolResponse,
                  // 参考 Cline 添加更多元数据
                  toolUseId: toolResponse.id,
                  startTime: new Date().toISOString(),
                  serverName: toolResponse.tool.serverName || 'unknown'
                }
              });

              console.log(`[ResponseHandler] 创建工具块: blockId=${toolBlock.id}, toolId=${toolResponse.id}, toolName=${(toolBlock as ToolMessageBlock).toolName}`);

              // 🔥 修复：简化操作，避免复杂事务
              // 1. 更新映射
              toolCallIdToBlockIdMap.set(toolResponse.id, toolBlock.id);

              // 2. 添加到 Redux 状态
              store.dispatch(addOneBlock(toolBlock));

              // 3. 保存到数据库
              await dexieStorage.saveMessageBlock(toolBlock);

              // 4. 更新消息的 blocks 数组
              store.dispatch(newMessagesActions.upsertBlockReference({
                messageId: messageId,
                blockId: toolBlock.id,
                status: toolBlock.status
              }));

            } else {
              console.warn(`[ResponseHandler] 收到未处理的工具状态: ${toolResponse.status} for ID: ${toolResponse.id}`);
            }
          } catch (toolError) {
            // 参考 Cline 的错误处理：单个工具失败不影响其他工具
            console.error(`[ResponseHandler] 处理单个工具失败 (toolId: ${toolResponse.id}):`, toolError);
            await this.handleSingleToolError(toolResponse.id, toolError);
          }
        }
      } catch (error) {
        console.error(`[ResponseHandler] 处理工具进行中事件失败:`, error);
      }
    },

    /**
     * 原子性工具块更新 - 使用静态导入
     */
    async atomicToolBlockUpdate(blockId: string, changes: any) {
      try {
        await dexieStorage.transaction('rw', [
          dexieStorage.message_blocks
        ], async () => {
          // 1. 更新 Redux 状态
          store.dispatch(updateOneBlock({
            id: blockId,
            changes
          }));

          // 2. 更新数据库
          await dexieStorage.updateMessageBlock(blockId, changes);
        });

        console.log(`[ResponseHandler] 原子性工具块更新完成: blockId: ${blockId}`);
      } catch (error) {
        console.error(`[ResponseHandler] 原子性工具块更新失败: blockId: ${blockId}:`, error);
        throw error;
      }
    },

    /**
     * 计算工具执行时长 - 参考 Cline 的时间跟踪
     */
    calculateToolDuration(toolId: string): number | undefined {
      try {
        const blockId = toolCallIdToBlockIdMap.get(toolId);
        if (!blockId) return undefined;

        const block = store.getState().messageBlocks.entities[blockId];
        if (!block?.metadata?.startTime) return undefined;

        const startTime = new Date(block.metadata.startTime).getTime();
        const endTime = new Date().getTime();
        return endTime - startTime;
      } catch (error) {
        console.error(`[ResponseHandler] 计算工具执行时长失败:`, error);
        return undefined;
      }
    },

    /**
     * 清理工具执行 - 参考 Cline 的清理机制
     */
    async cleanupToolExecution(toolId: string) {
      try {
        // 可以在这里添加工具执行完成后的清理逻辑
        // 例如：清理临时文件、释放资源等
        console.log(`[ResponseHandler] 清理工具执行: toolId: ${toolId}`);
      } catch (error) {
        console.error(`[ResponseHandler] 清理工具执行失败:`, error);
      }
    },

    /**
     * 处理工具调用完成事件 - 参考 Cline 的稳定性机制
     */
    async handleToolComplete(chunk: { type: 'mcp_tool_complete'; responses: any[] }) {
      try {
        console.log(`[ResponseHandler] 处理工具完成，工具数量: ${chunk.responses?.length || 0}`);

        if (!chunk.responses || chunk.responses.length === 0) {
          return;
        }

        // 🔥 修复：预先导入所需模块
        // 注意：这里不需要导入，因为我们使用 atomicToolBlockUpdate 方法

        // 参考 Cline 的顺序处理机制：逐个处理工具完成，确保稳定性
        for (const toolResponse of chunk.responses) {
          try {
            // 参考 Cline：直接使用 toolResponse.id 查找对应的工具块ID
            const existingBlockId = toolCallIdToBlockIdMap.get(toolResponse.id);

            if (toolResponse.status === 'done' || toolResponse.status === 'error') {
              if (!existingBlockId) {
                console.error(`[ResponseHandler] 未找到工具调用 ${toolResponse.id} 对应的工具块ID`);
                continue;
              }

              const finalStatus = toolResponse.status === 'done' ? MessageBlockStatus.SUCCESS : MessageBlockStatus.ERROR;
              const changes: any = {
                content: toolResponse.response,
                status: finalStatus,
                metadata: {
                  rawMcpToolResponse: toolResponse,
                  // 参考 Cline 添加完成时间
                  endTime: new Date().toISOString(),
                  duration: this.calculateToolDuration(toolResponse.id)
                },
                updatedAt: new Date().toISOString()
              };

              if (finalStatus === MessageBlockStatus.ERROR) {
                changes.error = {
                  message: `Tool execution failed/error`,
                  details: toolResponse.response
                };
              }

              console.log(`[ResponseHandler] 更新工具块 ${existingBlockId} (toolId: ${toolResponse.id}) 状态为 ${finalStatus}`);

              // 🔥 修复：简化更新操作，避免复杂事务

              // 1. 更新 Redux 状态
              store.dispatch(updateOneBlock({
                id: existingBlockId,
                changes
              }));

              // 2. 更新数据库
              await dexieStorage.updateMessageBlock(existingBlockId, changes);

              // 参考 Cline：标记工具执行完成
              globalToolTracker.completeTool(toolResponse.id, finalStatus === MessageBlockStatus.SUCCESS);

              // 参考 Cline：工具完成后的清理工作
              await this.cleanupToolExecution(toolResponse.id);

            } else {
              console.warn(`[ResponseHandler] 收到未处理的工具状态: ${toolResponse.status} for ID: ${toolResponse.id}`);
            }
          } catch (toolError) {
            // 参考 Cline 的错误处理：单个工具失败不影响其他工具
            console.error(`[ResponseHandler] 处理单个工具完成失败 (toolId: ${toolResponse.id}):`, toolError);

            // 🔥 修复：即使处理失败也要标记工具完成，避免无限等待
            globalToolTracker.completeTool(toolResponse.id, false);

            await this.handleSingleToolError(toolResponse.id, toolError);
          }
        }
      } catch (error) {
        console.error(`[ResponseHandler] 处理工具完成事件失败:`, error);
      }
    },

    /**
     * 响应完成处理 - 参考 Cline 的稳定性机制
     * @param finalContent 最终内容
     * @returns 累计的响应内容
     */
    async complete(finalContent?: string) {
      // 🔥 关键修复：不要覆盖 accumulatedContent，因为它已经通过流式回调正确累积了所有内容
      // 在工具调用场景中，finalContent 只包含最后一次响应，会丢失之前的内容
      console.log(`[ResponseHandler] 完成处理 - finalContent长度: ${finalContent?.length || 0}, accumulatedContent长度: ${accumulatedContent.length}`);

      // 检查是否是对比结果，如果是则不进行常规的完成处理
      if (finalContent === '__COMPARISON_RESULT__' || accumulatedContent === '__COMPARISON_RESULT__') {
        console.log(`[ResponseHandler] 检测到对比结果，跳过常规完成处理`);
        return accumulatedContent;
      }

      // 参考 Cline：等待所有工具执行完成
      try {
        console.log(`[ResponseHandler] 等待所有工具执行完成...`);
        await globalToolTracker.waitForAllToolsComplete(60000); // 60秒超时
        console.log(`[ResponseHandler] 所有工具执行完成`);
      } catch (error) {
        console.warn(`[ResponseHandler] 等待工具完成超时:`, error);
        // 继续处理，不阻塞响应完成
      }

      // 只有在 accumulatedContent 为空时才使用 finalContent（非流式响应的情况）
      if (!accumulatedContent.trim() && finalContent) {
        accumulatedContent = finalContent;
        console.log(`[ResponseHandler] 使用 finalContent 作为最终内容`);
      } else {
        console.log(`[ResponseHandler] 保持 accumulatedContent 作为最终内容`);
      }

      // 🔥 关键：保留 XML 工具调用标签，让 MainTextBlock 处理原位置渲染
      //
      // 工具块处理流程：
      // 1. ResponseHandler 保留原始内容（包含 <tool_use> 标签）
      // 2. 工具块通过 mcp_tool_in_progress/complete 事件独立创建
      // 3. MainTextBlock 解析 <tool_use> 标签并在原位置插入工具块
      // 4. 这样实现了工具块的原位置渲染，而不是在消息末尾显示
      console.log(`[ResponseHandler] 保留工具标签，支持原位置渲染`);

      // 检查是否包含工具标签（仅用于日志）
      try {
        const hasTools = hasToolUseTags(accumulatedContent);
        if (hasTools) {
          console.log(`[ResponseHandler] 内容包含工具标签，将在原位置渲染工具块`);
        }
      } catch (error) {
        console.error(`[ResponseHandler] 检查工具标签失败:`, error);
      }

      const now = new Date().toISOString();

      // 简化完成处理 - 直接更新状态，不使用流处理器
      // 更新消息状态
      store.dispatch(newMessagesActions.updateMessage({
        id: messageId,
        changes: {
          status: AssistantMessageStatus.SUCCESS,
          updatedAt: now
        }
      }));

      // 更新消息块状态（确保所有相关块都被更新）
      console.log(`[ResponseHandler] 完成时更新块状态 - lastBlockType: ${lastBlockType}, blockId: ${blockId}, mainTextBlockId: ${mainTextBlockId}`);

      if (lastBlockType === MessageBlockType.MAIN_TEXT) {
        // 只有主文本块，更新原始块
        console.log(`[ResponseHandler] 更新主文本块 ${blockId} 状态为 SUCCESS`);
        store.dispatch(updateOneBlock({
          id: blockId,
          changes: {
            content: accumulatedContent,
            status: MessageBlockStatus.SUCCESS,
            updatedAt: now
          }
        }));
      } else if (lastBlockType === MessageBlockType.THINKING) {
        // 有思考块，更新思考块状态
        console.log(`[ResponseHandler] 更新思考块 ${blockId} 状态为 SUCCESS`);
        store.dispatch(updateOneBlock({
          id: blockId,
          changes: {
            content: accumulatedThinking,
            status: MessageBlockStatus.SUCCESS,
            updatedAt: now
          }
        }));

        // 如果还有主文本块，也要更新主文本块状态
        if (mainTextBlockId && mainTextBlockId !== blockId) {
          console.log(`[ResponseHandler] 更新主文本块 ${mainTextBlockId} 状态为 SUCCESS`);
          store.dispatch(updateOneBlock({
            id: mainTextBlockId,
            changes: {
              content: accumulatedContent,
              status: MessageBlockStatus.SUCCESS,
              updatedAt: now
            }
          }));
        }
      } else {
        // 默认情况，更新为主文本块
        console.log(`[ResponseHandler] 默认更新块 ${blockId} 状态为 SUCCESS`);
        store.dispatch(updateOneBlock({
          id: blockId,
          changes: {
            content: accumulatedContent,
            status: MessageBlockStatus.SUCCESS,
            updatedAt: now
          }
        }));
      }

      // 设置主题为非流式响应状态
      store.dispatch(newMessagesActions.setTopicStreaming({
        topicId,
        streaming: false
      }));

      // 设置主题为非加载状态
      store.dispatch(newMessagesActions.setTopicLoading({
        topicId,
        loading: false
      }));

      // 处理思考块完成
      if (thinkingBlockId) {
        // 获取思考块
        const thinkingBlock = store.getState().messageBlocks.entities[thinkingBlockId];

        if (thinkingBlock && thinkingBlock.type === MessageBlockType.THINKING) {
          // 更新思考块状态为完成
          store.dispatch(updateOneBlock({
            id: thinkingBlockId,
            changes: {
              status: MessageBlockStatus.SUCCESS,
              updatedAt: now
            }
          }));

          // 保存到数据库
          dexieStorage.updateMessageBlock(thinkingBlockId, {
            status: MessageBlockStatus.SUCCESS,
            updatedAt: now
          });
        }
      }

      // 发送完成事件
      EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_COMPLETE, {
        text: accumulatedContent,
        messageId,
        blockId,
        topicId
      });

      // 保存最终状态到数据库（根据转换后的块类型）
      const blockUpdatePromises: Promise<void>[] = [];

      // 保存原始块（思考块或主文本块）
      if (lastBlockType === MessageBlockType.THINKING) {
        console.log(`[ResponseHandler] 保存思考块 ${blockId} 到数据库，内容长度: ${accumulatedThinking.length}`);
        blockUpdatePromises.push(dexieStorage.updateMessageBlock(blockId, {
          type: MessageBlockType.THINKING, // 确保类型被正确保存
          content: accumulatedThinking,
          status: MessageBlockStatus.SUCCESS,
          updatedAt: now
        }));
      } else {
        console.log(`[ResponseHandler] 保存主文本块 ${blockId} 到数据库，内容长度: ${accumulatedContent.length}`);
        blockUpdatePromises.push(dexieStorage.updateMessageBlock(blockId, {
          type: MessageBlockType.MAIN_TEXT, // 确保类型被正确保存
          content: accumulatedContent,
          status: MessageBlockStatus.SUCCESS,
          updatedAt: now
        }));
      }

      // 如果有新创建的主文本块，也要保存它
      if (mainTextBlockId && mainTextBlockId !== blockId) {
        console.log(`[ResponseHandler] 保存新创建的主文本块 ${mainTextBlockId} 到数据库，内容长度: ${accumulatedContent.length}`);
        blockUpdatePromises.push(dexieStorage.updateMessageBlock(mainTextBlockId, {
          type: MessageBlockType.MAIN_TEXT, // 确保类型被正确保存
          content: accumulatedContent,
          status: MessageBlockStatus.SUCCESS,
          updatedAt: now
        }));
      }

      // 🔥 关键修复：确保消息的 blocks 数组包含所有相关的块ID，不覆盖现有的工具块
      const currentMessage = store.getState().messages.entities[messageId];
      const existingBlocks = currentMessage?.blocks || [];

      // 收集当前响应处理器创建的块ID
      const newBlockIds = [];
      if (lastBlockType === MessageBlockType.THINKING) {
        newBlockIds.push(blockId); // 思考块
        if (mainTextBlockId && mainTextBlockId !== blockId) {
          newBlockIds.push(mainTextBlockId); // 主文本块
        }
      } else {
        newBlockIds.push(blockId); // 主文本块
      }

      // 合并现有块和新块，避免重复
      const allBlockIds = [...existingBlocks];
      for (const newBlockId of newBlockIds) {
        if (!allBlockIds.includes(newBlockId)) {
          allBlockIds.push(newBlockId);
        }
      }

      console.log(`[ResponseHandler] 完成时的所有块ID: [${allBlockIds.join(', ')}]，现有块: [${existingBlocks.join(', ')}]，新块: [${newBlockIds.join(', ')}]`);

      // 更新消息的 blocks 数组（保留现有的工具块等）
      store.dispatch(newMessagesActions.updateMessage({
        id: messageId,
        changes: {
          blocks: allBlockIds,
          status: AssistantMessageStatus.SUCCESS,
          updatedAt: now
        }
      }));

      // 关键修复：先等待所有块更新完成，然后在事务中保存消息状态
      // 1. 等待所有消息块更新完成（在事务外）
      await Promise.all(blockUpdatePromises);

      // 2. 使用事务保存消息状态，确保原子性
      await dexieStorage.transaction('rw', [
        dexieStorage.messages,
        dexieStorage.topics
      ], async () => {
        // 获取当前消息的最新状态（包含所有块引用）
        const currentMessageState = store.getState().messages.entities[messageId];
        if (currentMessageState) {
          // 获取最新的消息状态（包含所有块引用）
          const updatedMessage = {
            ...currentMessageState,
            blocks: allBlockIds, // 使用我们计算的完整块ID数组
            status: AssistantMessageStatus.SUCCESS,
            updatedAt: now
          };

          console.log(`[ResponseHandler] 保存消息状态，更新后的blocks: [${updatedMessage.blocks?.join(', ')}]`);

          // 更新messages表中的消息（包含最新的blocks数组）
          await dexieStorage.updateMessage(messageId, {
            status: AssistantMessageStatus.SUCCESS,
            updatedAt: now,
            blocks: allBlockIds // 确保完整的blocks数组被保存
          });

          // 更新topic.messages数组中的消息
          const topic = await dexieStorage.topics.get(topicId);
          if (topic) {
            // 确保messages数组存在
            if (!topic.messages) {
              topic.messages = [];
            }

            // 查找消息在数组中的位置
            const messageIndex = topic.messages.findIndex(m => m.id === messageId);

            // 更新或添加消息到话题的messages数组
            if (messageIndex >= 0) {
              topic.messages[messageIndex] = updatedMessage;
            } else {
              topic.messages.push(updatedMessage);
            }

            console.log(`[ResponseHandler] 保存到topic.messages，blocks: [${updatedMessage.blocks?.join(', ')}]`);

            // 保存更新后的话题
            await dexieStorage.topics.put(topic);
          }
        }
      });

      // 基于 Chatbox 原理 - ResponseHandler 不管版本，只负责生成内容
      // 版本管理完全由 messageThunk 在重新生成前处理
      console.log(`[ResponseHandler] 内容生成完成，版本管理由调用方处理`);

      // 发送完成事件
      EventEmitter.emit(EVENT_NAMES.MESSAGE_COMPLETE, {
        id: messageId,
        topicId,
        status: 'success'
      });

      // 触发话题自动命名 - 与最佳实例保持一致
      try {
        // 异步执行话题命名，不阻塞主流程
        setTimeout(async () => {
          // 获取最新的话题数据
          const topic = await dexieStorage.topics.get(topicId);
          if (topic && TopicNamingService.shouldNameTopic(topic)) {
            console.log(`[ResponseHandler] 触发话题自动命名: ${topicId}`);
            const newName = await TopicNamingService.generateTopicName(topic);
            if (newName) {
              console.log(`[ResponseHandler] 话题自动命名成功: ${newName}`);
            }
          }
        }, 1000); // 延迟1秒执行，确保消息已完全保存
      } catch (error) {
        console.error('[ResponseHandler] 话题自动命名失败:', error);
      }

      // 参考 Cline：清理工具跟踪器
      try {
        globalToolTracker.cleanup();
        console.log(`[ResponseHandler] 工具跟踪器清理完成`);
      } catch (error) {
        console.error(`[ResponseHandler] 工具跟踪器清理失败:`, error);
      }

      return accumulatedContent;
    },

    /**
     * 响应被中断时的完成处理
     * @returns 累计的响应内容
     */
    async completeWithInterruption() {
      console.log(`[ResponseHandler] 响应被中断 - 消息ID: ${messageId}, 当前内容长度: ${accumulatedContent.length}`);

      const now = new Date().toISOString();

      try {
        // 如果有内容，添加中断警告
        let finalContent = accumulatedContent;
        if (finalContent.trim()) {
          finalContent += '\n\n---\n\n> ⚠️ **此回复已被用户中断**\n> \n> 以上内容为中断前已生成的部分内容。';
        } else {
          finalContent = '> ⚠️ **回复已被中断，未生成任何内容**\n> \n> 请重新发送消息以获取完整回复。';
        }

        // 更新主文本块内容和状态
        store.dispatch(updateOneBlock({
          id: blockId,
          changes: {
            content: finalContent,
            status: MessageBlockStatus.SUCCESS,
            updatedAt: now,
            metadata: {
              ...store.getState().messageBlocks.entities[blockId]?.metadata,
              interrupted: true, // 标记为被中断
              interruptedAt: now
            }
          }
        }));

        // 更新消息状态
        store.dispatch(newMessagesActions.updateMessage({
          id: messageId,
          changes: {
            status: AssistantMessageStatus.SUCCESS,
            updatedAt: now,
            metadata: {
              interrupted: true,
              interruptedAt: now
            }
          }
        }));

        // 设置主题为非流式响应状态
        store.dispatch(newMessagesActions.setTopicStreaming({
          topicId,
          streaming: false
        }));

        // 设置主题为非加载状态
        store.dispatch(newMessagesActions.setTopicLoading({
          topicId,
          loading: false
        }));

        // 保存到数据库
        await Promise.all([
          dexieStorage.updateMessageBlock(blockId, {
            content: finalContent,
            status: MessageBlockStatus.SUCCESS,
            updatedAt: now,
            metadata: {
              interrupted: true,
              interruptedAt: now
            }
          }),
          dexieStorage.updateMessage(messageId, {
            status: AssistantMessageStatus.SUCCESS,
            updatedAt: now,
            metadata: {
              interrupted: true,
              interruptedAt: now
            }
          })
        ]);

        // 发送完成事件
        EventEmitter.emit(EVENT_NAMES.STREAM_TEXT_COMPLETE, {
          text: finalContent,
          messageId,
          blockId,
          topicId,
          interrupted: true
        });

        // 发送消息完成事件
        EventEmitter.emit(EVENT_NAMES.MESSAGE_COMPLETE, {
          id: messageId,
          topicId,
          status: 'success',
          interrupted: true
        });

        console.log(`[ResponseHandler] 中断处理完成 - 最终内容长度: ${finalContent.length}`);
        return finalContent;

      } catch (error) {
        console.error(`[ResponseHandler] 中断处理失败:`, error);
        // 如果处理失败，回退到普通完成处理
        return await this.complete(accumulatedContent);
      }
    },

    /**
     * 响应失败处理
     * @param error 错误对象
     */
    async fail(error: Error) {
      console.error(`[ResponseHandler] 响应失败 - 消息ID: ${messageId}, 错误: ${error.message}`);

      // 🔥 新增：检测 API Key 问题并提供重试机制
      const { checkAndHandleApiKeyError } = await import('../../utils/apiKeyErrorHandler');
      const isApiKeyError = await checkAndHandleApiKeyError(error, messageId, topicId);
      if (isApiKeyError) {
        // API Key 错误已被处理，不需要继续执行错误处理流程
        return;
      }

      // 获取错误消息
      const errorMessage = error.message || '响应处理失败';

      // 获取错误类型
      const errorType = getErrorType(error);

      // 获取错误详情
      const errorDetails = formatErrorMessage(error);

      // 创建错误记录对象
      const errorRecord: ErrorRecord = {
        message: errorMessage,
        timestamp: new Date().toISOString(),
        code: error.name || 'ERROR',
        type: errorType
      };

      // 创建更详细的错误信息对象用于Redux状态
      const errorInfo: ErrorInfo = {
        message: errorMessage,
        code: error.name || 'ERROR',
        type: errorType,
        timestamp: new Date().toISOString(),
        details: errorDetails,
        context: {
          messageId,
          blockId,
          topicId
        }
      };

      // 创建错误数据块
      const errorChunk: Chunk = {
        type: 'error',
        error: {
          message: errorMessage,
          details: errorDetails,
          type: errorType
        }
      };

      // 使用流处理器处理错误数据块
      const streamProcessor = createStreamProcessor({
        onError: (_err) => {
          // 使用新的 action 更新消息状态
          store.dispatch(newMessagesActions.updateMessage({
            id: messageId,
            changes: {
              status: AssistantMessageStatus.ERROR
            }
          }));

          // 设置主题为非流式响应状态
          store.dispatch(newMessagesActions.setTopicStreaming({
            topicId,
            streaming: false
          }));

          // 设置主题为非加载状态
          store.dispatch(newMessagesActions.setTopicLoading({
            topicId,
            loading: false
          }));

          // 记录错误到Redux状态
          store.dispatch(newMessagesActions.setError({
            error: errorInfo,
            topicId
          }));

          // 更新Redux状态中的消息块
          store.dispatch(updateOneBlock({
            id: blockId,
            changes: {
              status: MessageBlockStatus.ERROR,
              error: errorRecord
            }
          }));
        }
      });

      // 处理错误数据块
      streamProcessor(errorChunk);

      // 发送错误事件通知
      EventEmitter.emit(EVENT_NAMES.STREAM_ERROR, {
        error: errorInfo,
        messageId,
        blockId,
        topicId
      });

      // 保存错误状态到数据库
      await Promise.all([
        dexieStorage.updateMessageBlock(blockId, {
          status: MessageBlockStatus.ERROR,
          error: errorRecord
        }),
        dexieStorage.updateMessage(messageId, {
          status: AssistantMessageStatus.ERROR
        })
      ]);

      // 发送消息完成事件（错误状态）
      EventEmitter.emit(EVENT_NAMES.MESSAGE_COMPLETE, {
        id: messageId,
        topicId,
        status: 'error',
        error: errorMessage
      });

      // 参考 Cline：清理工具跟踪器（错误情况）
      try {
        globalToolTracker.reset(); // 错误时重置所有状态
        console.log(`[ResponseHandler] 工具跟踪器重置完成（错误处理）`);
      } catch (cleanupError) {
        console.error(`[ResponseHandler] 工具跟踪器重置失败:`, cleanupError);
      }

      throw error;
    }
  };

  // 🔥 新增：设置事件监听器
  setupEventListeners();

  // 🔥 新增：添加清理方法到返回对象
  responseHandlerInstance.cleanup = () => {
    eventCleanupFunctions.forEach(cleanup => cleanup());
  };

  return responseHandlerInstance;
}

export default createResponseHandler;

/**
 * 创建响应状态action creator - 向后兼容
 */
export const setResponseState = ({ topicId, status, loading }: { topicId: string; status: string; loading: boolean }) => {
  // 设置流式响应状态
  const streaming = status === 'streaming';

  // 使用新的action creator
  store.dispatch(newMessagesActions.setTopicStreaming({
    topicId,
    streaming
  }));

  store.dispatch(newMessagesActions.setTopicLoading({
    topicId,
    loading
  }));

  // 移除重复的事件发送，避免与流式处理器的事件冲突
  // 流式事件应该只由实际的流式处理器发送
  console.log(`[ResponseHandler] 设置响应状态: topicId=${topicId}, status=${status}, loading=${loading}`);
};