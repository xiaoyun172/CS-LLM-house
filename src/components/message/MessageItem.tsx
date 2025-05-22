import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Avatar,
  Paper,
  useTheme,
  Skeleton,
  Typography
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import SmartToyOutlinedIcon from '@mui/icons-material/SmartToyOutlined';
import type { Message, MessageBlock } from '../../shared/types/newMessage.ts';
import { MessageBlockType } from '../../shared/types/newMessage.ts';
import { messageBlocksSelectors } from '../../shared/store/slices/messageBlocksSlice';
import { dexieStorage } from '../../shared/services/DexieStorageService';
import { upsertManyBlocks } from '../../shared/store/slices/messageBlocksSlice';
import { EventEmitter, EVENT_NAMES } from '../../shared/services/EventEmitter';
import MessageActions from './MessageActions';
import MessageBlockRenderer from './MessageBlockRenderer';
import type { RootState } from '../../shared/store';
import { versionService } from '../../shared/services/VersionService';

interface MessageItemProps {
  message: Message;
  showAvatar?: boolean;
  isCompact?: boolean;
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onSwitchVersion?: (versionId: string) => void;
  forceUpdate?: () => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  showAvatar = true,
  isCompact = false,
  onRegenerate,
  onDelete,
  onSwitchVersion,
  forceUpdate
}) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  // 新增状态来存储模型头像
  const [modelAvatar, setModelAvatar] = useState<string | null>(null);

  // 从Redux状态中获取块
  const blocks = useSelector((state: RootState) =>
    message.blocks
      .map((blockId: string) => messageBlocksSelectors.selectById(state, blockId))
      .filter(Boolean) as MessageBlock[]
  );

  const loading = useSelector((state: RootState) =>
    state.messageBlocks.loadingState === 'loading'
  );

  // 调试日志
  console.log(`[MessageItem] 渲染消息: ID=${message.id}, 角色=${message.role}, 状态=${message.status}, 块数量=${blocks.length}, 版本数量=${message.versions?.length || 0}`);

  // 记录当前活跃版本
  if (message.versions && message.versions.length > 0) {
    const activeVersion = message.versions.find(v => v.isActive);
    console.log(`[MessageItem] 当前活跃版本: ${activeVersion?.id}, 版本块数量: ${activeVersion?.blocks?.length || 0}`);
  }

  // 记录消息块信息
  if (blocks.length > 0) {
    blocks.forEach(block => {
      // 安全地获取内容长度
      let contentLength = 0;
      if (block.type === MessageBlockType.MAIN_TEXT ||
          block.type === MessageBlockType.CODE ||
          block.type === MessageBlockType.THINKING ||
          block.type === MessageBlockType.CITATION ||
          block.type === MessageBlockType.TRANSLATION) {
        contentLength = (block as any).content?.length || 0;
      }
      console.log(`[MessageItem] 块信息: ID=${block.id}, 类型=${block.type}, 状态=${block.status}, 内容长度=${contentLength}`);
    });
  }

  // 如果Redux中没有块，从数据库加载
  useEffect(() => {
    const loadBlocks = async () => {
      if (blocks.length === 0 && message.blocks.length > 0) {
        console.log(`[MessageItem] 从数据库加载块: 消息ID=${message.id}, 块ID列表=${message.blocks.join(',')}`);
        try {
          const messageBlocks: MessageBlock[] = [];
          for (const blockId of message.blocks) {
            const block = await dexieStorage.getMessageBlock(blockId);
            if (block) {
              // 安全地获取内容长度
              let contentLength = 0;
              if (block.type === MessageBlockType.MAIN_TEXT ||
                  block.type === MessageBlockType.CODE ||
                  block.type === MessageBlockType.THINKING ||
                  block.type === MessageBlockType.CITATION ||
                  block.type === MessageBlockType.TRANSLATION) {
                contentLength = (block as any).content?.length || 0;
              }
              console.log(`[MessageItem] 从数据库加载块成功: ID=${block.id}, 类型=${block.type}, 内容长度=${contentLength}`);
              messageBlocks.push(block);
            } else {
              console.warn(`[MessageItem] 数据库中找不到块: ID=${blockId}`);
            }
          }

          if (messageBlocks.length > 0) {
            console.log(`[MessageItem] 更新Redux状态: 加载了${messageBlocks.length}个块`);
            dispatch(upsertManyBlocks(messageBlocks));
          } else {
            console.warn(`[MessageItem] 数据库中没有找到任何块: 消息ID=${message.id}`);
          }
        } catch (error) {
          console.error('加载消息块失败:', error);
        }
      }
    };

    loadBlocks();
  }, [message.blocks, blocks.length, dispatch]);

  // 在块状态变化时，可以使用forceUpdate触发重新渲染
  useEffect(() => {
    if (message.status === 'streaming' && forceUpdate) {
      // 定期触发强制更新以确保UI反映最新状态
      const interval = setInterval(() => {
        forceUpdate();
      }, 100);

      // 监听流式输出事件
      const textDeltaHandler = () => {
        forceUpdate();
      };

      // 订阅事件
      const unsubscribeTextDelta = EventEmitter.on(EVENT_NAMES.STREAM_TEXT_DELTA, textDeltaHandler);
      const unsubscribeTextComplete = EventEmitter.on(EVENT_NAMES.STREAM_TEXT_COMPLETE, textDeltaHandler);
      const unsubscribeThinkingDelta = EventEmitter.on(EVENT_NAMES.STREAM_THINKING_DELTA, textDeltaHandler);

      return () => {
        clearInterval(interval);
        unsubscribeTextDelta();
        unsubscribeTextComplete();
        unsubscribeThinkingDelta();
      };
    }
  }, [message.status, forceUpdate]);

  // 自动加载最新版本
  useEffect(() => {
    const autoLoadLatestVersion = async () => {
      // 只处理助手消息
      if (message.role !== 'assistant') return;

      // 检查消息是否有版本但没有块
      if (message.versions && message.versions.length > 0 &&
          (!message.blocks || message.blocks.length === 0)) {
        console.log(`[MessageItem] 检测到消息有版本但没有块，尝试加载最新版本: 消息ID=${message.id}`);

        // 首先检查localStorage中是否有保存的最新版本ID
        const latestVersionId = localStorage.getItem(`message_latest_version_${message.id}`);

        if (latestVersionId) {
          console.log(`[MessageItem] 从localStorage找到最新版本ID: ${latestVersionId}`);
          // 切换到最新版本
          try {
            const success = await versionService.switchToVersion(latestVersionId);
            if (success) {
              console.log(`[MessageItem] 成功切换到最新版本: ${latestVersionId}`);
              // 清除localStorage中的版本ID
              localStorage.removeItem(`message_latest_version_${message.id}`);
              // 如果有forceUpdate函数，调用它触发重新渲染
              if (forceUpdate) forceUpdate();
            } else {
              console.error(`[MessageItem] 切换到最新版本失败: ${latestVersionId}`);
            }
          } catch (error) {
            console.error(`[MessageItem] 切换版本时出错:`, error);
          }
        } else {
          // 如果localStorage中没有保存的版本ID，尝试找到活跃版本
          const activeVersion = message.versions.find(v => v.isActive);
          if (activeVersion) {
            console.log(`[MessageItem] 找到活跃版本: ${activeVersion.id}`);
            try {
              const success = await versionService.switchToVersion(activeVersion.id);
              if (success) {
                console.log(`[MessageItem] 成功切换到活跃版本: ${activeVersion.id}`);
                if (forceUpdate) forceUpdate();
              } else {
                console.error(`[MessageItem] 切换到活跃版本失败: ${activeVersion.id}`);
              }
            } catch (error) {
              console.error(`[MessageItem] 切换版本时出错:`, error);
            }
          } else {
            // 如果没有活跃版本，使用最后一个版本
            const lastVersion = message.versions[message.versions.length - 1];
            if (lastVersion) {
              console.log(`[MessageItem] 使用最后一个版本: ${lastVersion.id}`);
              try {
                const success = await versionService.switchToVersion(lastVersion.id);
                if (success) {
                  console.log(`[MessageItem] 成功切换到最后一个版本: ${lastVersion.id}`);
                  if (forceUpdate) forceUpdate();
                } else {
                  console.error(`[MessageItem] 切换到最后一个版本失败: ${lastVersion.id}`);
                }
              } catch (error) {
                console.error(`[MessageItem] 切换版本时出错:`, error);
              }
            }
          }
        }
      }
    };

    autoLoadLatestVersion();
  }, [message.id, message.role, message.versions, message.blocks, forceUpdate]);

  // 尝试获取模型头像
  useEffect(() => {
    const fetchModelAvatar = async () => {
      if (message.role === 'assistant' && message.model?.id) {
        try {
          // 从数据库获取模型配置
          const modelConfig = await dexieStorage.getModel(message.model.id);

          if (modelConfig?.avatar) {
            // 如果数据库中有头像，使用它
            console.log(`[MessageItem] 从数据库获取模型头像: ${message.model.id}`);
            setModelAvatar(modelConfig.avatar);
          } else if (message.model.iconUrl) {
            // 如果模型有iconUrl，使用它
            console.log(`[MessageItem] 使用模型iconUrl: ${message.model.id}`);
            setModelAvatar(message.model.iconUrl);

            // 同时保存到数据库以便将来使用
            await dexieStorage.saveModel(message.model.id, {
              id: message.model.id,
              avatar: message.model.iconUrl,
              updatedAt: new Date().toISOString()
            });
          }
          // 如果没有头像，将使用默认的字母头像
        } catch (error) {
          console.error('获取模型头像失败:', error);

          // 如果数据库访问失败但模型有iconUrl，仍然使用它
          if (message.model.iconUrl) {
            setModelAvatar(message.model.iconUrl);
          }
        }
      }
    };

    fetchModelAvatar();
  }, [message.role, message.model?.id]);

  // 所有渲染逻辑已移至MessageBlockRenderer组件

  const isUserMessage = message.role === 'user';

  return (
    <Box
      id={`message-${message.id}`}
      sx={{
        display: 'flex',
        flexDirection: 'column', // 改为列布局，使头像在上方
        marginBottom: isCompact ? 2 : 4,
        marginTop: isCompact ? 1 : 2,
        paddingX: 2,
        alignItems: isUserMessage ? 'flex-end' : 'flex-start', // 用户消息靠右，AI消息靠左
      }}
    >
      {/* 头像和模型信息放在气泡上方 */}
      {showAvatar && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: isUserMessage ? 'flex-end' : 'flex-start',
            alignItems: 'center', // 垂直居中对齐
            width: '100%',
            marginBottom: 1, // 头像与气泡之间的间距
          }}
        >
          {/* 用户消息显示"用户"文字和时间，右侧显示头像 */}
          {isUserMessage ? (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexDirection: 'row-reverse' }}>
              {/* 用户头像 */}
              <Avatar
                sx={{
                  bgcolor: '#00c853', // 绿色背景
                  width: 36,
                  height: 36,
                  borderRadius: '20%', // 更接近方形的头像
                }}
              >
                <PersonIcon sx={{ fontSize: 20, color: 'white' }} />
              </Avatar>

              {/* 用户名称和时间 */}
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                {/* 用户名称 */}
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.85rem',
                    color: theme.palette.text.primary,
                    fontWeight: 600,
                    lineHeight: 1.2
                  }}
                >
                  用户
                </Typography>
                {/* 时间显示 */}
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.7rem',
                    color: theme.palette.text.secondary,
                    lineHeight: 1,
                    marginTop: '2px'
                  }}
                >
                  {new Date(message.createdAt).toLocaleString('zh-CN', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Typography>
              </Box>
            </Box>
          ) : (
            // AI消息显示头像和模型信息
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              {/* 模型头像 */}
              {modelAvatar ? (
                <Avatar
                  src={modelAvatar}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '20%', // 更接近方形的头像
                  }}
                />
              ) : (
                <Avatar
                  sx={{
                    bgcolor: 'secondary.main',
                    width: 36,
                    height: 36,
                    borderRadius: '20%', // 更接近方形的头像
                  }}
                >
                  {message.model?.name ? message.model.name.charAt(0).toUpperCase() :
                   <SmartToyOutlinedIcon sx={{ fontSize: 20 }} />}
                </Avatar>
              )}

              {/* 模型名称和供应商名称 */}
              <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                <Typography
                  variant="body2"
                  sx={{
                    fontSize: '0.85rem',
                    color: theme.palette.text.primary,
                    fontWeight: 600,
                    lineHeight: 1.2
                  }}
                >
                  {/* 模型名 + 供应商名称 */}
                  {message.model ?
                    `${message.model.name}${message.model.provider ? ' | ' + message.model.provider : ''}`
                    : (message.modelId || 'AI')}
                </Typography>
                {/* 时间显示 */}
                <Typography
                  variant="caption"
                  sx={{
                    fontSize: '0.7rem',
                    color: theme.palette.text.secondary,
                    lineHeight: 1,
                    marginTop: '2px'
                  }}
                >
                  {new Date(message.createdAt).toLocaleString('zh-CN', {
                    month: 'numeric',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      )}

      <Box sx={{
        position: 'relative',
        maxWidth: '80%', // 限制气泡最大宽度
        minWidth: '50%', // 最小宽度占据屏幕50%
        width: 'auto',   // 宽度自适应内容
        alignSelf: isUserMessage ? 'flex-end' : 'flex-start', // 用户消息靠右，AI消息靠左
      }}>
        {/* 消息气泡 */}
        <Paper
          elevation={0}
          sx={{
            padding: 1.5,
            backgroundColor: isUserMessage
              ? theme.palette.mode === 'dark'
                ? '#333333' // 深色主题下使用灰色背景
                : theme.palette.primary.light
              : theme.palette.background.paper,
            color: isUserMessage && theme.palette.mode === 'dark'
              ? '#ffffff' // 深色主题下使用白色文字
              : 'inherit',
            width: '100%',
            borderRadius: '12px',
            // 移除气泡顶部的特殊圆角，因为头像现在在上方而不是左/右侧
            position: 'relative', // 确保相对定位
            maxWidth: '100%', // 确保气泡不会超出容器
          }}
        >
          {loading ? (
            <>
              <Skeleton variant="text" width="80%" />
              <Skeleton variant="text" width="60%" />
            </>
          ) : (
            // 使用新的MessageBlockRenderer组件渲染所有块
            <Box sx={{ width: '100%' }}>
              {message.blocks && message.blocks.length > 0 ? (
                <MessageBlockRenderer
                  blocks={message.blocks}
                  message={message}
                  // 无论是用户还是助手消息，右侧都需要额外padding，避免与三点菜单重叠
                  extraPaddingLeft={0}
                  extraPaddingRight={2}
                />
              ) : (
                // 如果消息没有块，显示消息内容
                <Box sx={{
                  p: 1,
                  // 无论是用户还是助手消息，右侧都需要额外padding
                  pl: 1,
                  pr: 3
                }}>
                  {(message as any).content || ''}
                </Box>
              )}
            </Box>
          )}
        </Paper>

        {/* 版本指示器和播放按钮 - 放在气泡上方贴合位置 */}
        {!isUserMessage && (
          <Box sx={{
            position: 'absolute',
            top: -22, // 调整位置使其贴合气泡
            right: 0, // 靠右对齐
            display: 'flex',
            flexDirection: 'row',
            gap: '5px',
            zIndex: 10,
            pointerEvents: 'auto', // 确保可点击
          }}>
            <MessageActions
              message={message as any}
              topicId={message.topicId}
              onRegenerate={onRegenerate}
              onDelete={onDelete}
              onSwitchVersion={onSwitchVersion}
              renderMode="full" // 完整模式，显示版本指示器和播放按钮
            />
          </Box>
        )}

        {/* 三点菜单按钮 - 只对AI消息显示，放置在气泡内的右上角 */}
        {!isUserMessage && (
          <Box sx={{
            position: 'absolute',
            top: 5, // 放在气泡内部的右上角
            right: 5, // 放在气泡内部的右上角
            display: 'flex',
            flexDirection: 'row',
            zIndex: 10,
            pointerEvents: 'auto', // 确保可点击
          }}>
            <MessageActions
              message={message as any}
              topicId={message.topicId}
              onRegenerate={onRegenerate}
              onDelete={onDelete}
              onSwitchVersion={onSwitchVersion}
              renderMode="menuOnly" // 只显示三点菜单按钮
            />
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default MessageItem;