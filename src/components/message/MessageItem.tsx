import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { createSelector } from '@reduxjs/toolkit';
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
import { messageBlocksSelectors } from '../../shared/store/slices/messageBlocksSlice';
import { dexieStorage } from '../../shared/services/DexieStorageService';
import { upsertManyBlocks } from '../../shared/store/slices/messageBlocksSlice';
// import { EventEmitter, EVENT_NAMES } from '../../shared/services/EventEmitter';
import MessageActions from './MessageActions';
import MessageBlockRenderer from './MessageBlockRenderer';
import type { RootState } from '../../shared/store';

interface MessageItemProps {
  message: Message;
  showAvatar?: boolean;
  isCompact?: boolean;
  messageIndex?: number; // 消息在全局列表中的索引，用于分支功能
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onSwitchVersion?: (versionId: string) => void;
  onResend?: (messageId: string) => void;
  forceUpdate?: () => void;
}

const MessageItem: React.FC<MessageItemProps> = ({
  message,
  showAvatar = true,
  isCompact = false,
  messageIndex,
  onRegenerate,
  onDelete,
  onSwitchVersion,
  onResend,
  forceUpdate
}) => {
  const dispatch = useDispatch();
  const theme = useTheme();
  // 新增状态来存储模型头像
  const [modelAvatar, setModelAvatar] = useState<string | null>(null);
  // 新增状态来存储用户头像
  const [userAvatar, setUserAvatar] = useState<string | null>(null);

  // 使用 useRef 存储 forceUpdate 引用，避免依赖项问题
  const forceUpdateRef = useRef(forceUpdate);

  // 更新 forceUpdateRef 的当前值
  useEffect(() => {
    forceUpdateRef.current = forceUpdate;
  }, [forceUpdate]);

  // 创建记忆化的 providers selector
  const providers = useSelector((state: RootState) => state.settings.providers || [],
    (prev, next) => prev === next // 浅比较，因为providers数组引用应该是稳定的
  );

  // 获取供应商友好名称的函数 - 使用useMemo进一步优化
  const getProviderName = useMemo(() => {
    const providerMap = new Map(providers.map(p => [p.id, p.name]));
    return (providerId: string) => providerMap.get(providerId) || providerId;
  }, [providers]);

  // 创建记忆化的 selector 来避免不必要的重新渲染
  const selectMessageBlocks = useMemo(
    () => createSelector(
      [
        (state: RootState) => state,
        () => message.blocks
      ],
      (state, blockIds) =>
        blockIds
          .map((blockId: string) => messageBlocksSelectors.selectById(state, blockId))
          .filter(Boolean) as MessageBlock[]
    ),
    [message.blocks] // 只有当 message.blocks 改变时才重新创建 selector
  );

  // 从Redux状态中获取块
  const blocks = useSelector(selectMessageBlocks);

  const loading = useSelector((state: RootState) =>
    state.messageBlocks.loadingState === 'loading'
  );



  // 如果Redux中没有块，从数据库加载
  useEffect(() => {
    const loadBlocks = async () => {
      if (blocks.length === 0 && message.blocks.length > 0) {
        try {
          const messageBlocks: MessageBlock[] = [];
          for (const blockId of message.blocks) {
            const block = await dexieStorage.getMessageBlock(blockId);
            if (block) {
              messageBlocks.push(block);
            } else {
              console.warn(`[MessageItem] 数据库中找不到块: ID=${blockId}`);
            }
          }

          if (messageBlocks.length > 0) {
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
    if (message.status === 'streaming') {
      // 减少强制更新频率，避免过度渲染
      const interval = setInterval(() => {
        if (forceUpdateRef.current) {
          forceUpdateRef.current();
        }
      }, 200); // 增加到200ms，减少更新频率

      // 移除事件监听器中的 forceUpdate 调用，避免无限循环
      // 流式输出的更新应该由 MainTextBlock 组件自己处理

      return () => {
        clearInterval(interval);
      };
    }
  }, [message.status]); // 只依赖message.status，避免无限循环

  // 版本恢复逻辑已移至TopicService.loadTopicMessages中统一处理
  // 这里不再需要重复的版本恢复逻辑

  // 获取用户头像
  useEffect(() => {
    const fetchUserAvatar = () => {
      try {
        const savedUserAvatar = localStorage.getItem('user_avatar');
        if (savedUserAvatar) {
          setUserAvatar(savedUserAvatar);
        } else {
          setUserAvatar(null);
        }
      } catch (error) {
        console.error('获取用户头像失败:', error);
      }
    };

    fetchUserAvatar();

    // 监听 localStorage 变化，实时更新头像
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'user_avatar') {
        setUserAvatar(e.newValue);
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 尝试获取模型头像
  useEffect(() => {
    const fetchModelAvatar = async () => {
      if (message.role === 'assistant' && message.model?.id) {
        try {
          // 从数据库获取模型配置
          const modelConfig = await dexieStorage.getModel(message.model.id);

          if (modelConfig?.avatar) {
            // 如果数据库中有头像，使用它
            setModelAvatar(modelConfig.avatar);
          } else if (message.model.iconUrl) {
            // 如果模型有iconUrl，使用它
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
              {userAvatar ? (
                <Avatar
                  src={userAvatar}
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: '20%', // 更接近方形的头像
                  }}
                />
              ) : (
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
              )}

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
                    `${message.model.name}${message.model.provider ? ' | ' + getProviderName(message.model.provider) : ''}`
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
              messageIndex={messageIndex}
              onRegenerate={onRegenerate}
              onDelete={onDelete}
              onSwitchVersion={onSwitchVersion}
              onResend={onResend}
              renderMode="full" // 完整模式，显示版本指示器和播放按钮
            />
          </Box>
        )}

        {/* 三点菜单按钮 - 对所有消息显示，放置在气泡内的右上角 */}
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
            messageIndex={messageIndex}
            onRegenerate={onRegenerate}
            onDelete={onDelete}
            onSwitchVersion={onSwitchVersion}
            onResend={onResend}
            renderMode="menuOnly" // 只显示三点菜单按钮
          />
        </Box>
      </Box>


    </Box>
  );
};

export default MessageItem;