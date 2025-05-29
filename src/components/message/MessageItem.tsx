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
import type { Message, MessageBlock } from '../../shared/types/newMessage.ts';
import { messageBlocksSelectors } from '../../shared/store/slices/messageBlocksSlice';
import { dexieStorage } from '../../shared/services/DexieStorageService';
import { upsertManyBlocks } from '../../shared/store/slices/messageBlocksSlice';
// import { EventEmitter, EVENT_NAMES } from '../../shared/services/EventEmitter';
import MessageActions from './MessageActions';
import MessageBlockRenderer from './MessageBlockRenderer';
import type { RootState } from '../../shared/store';
import { getMessageDividerSetting } from '../../shared/utils/settingsUtils';

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

  // 获取设置中的气泡宽度配置
  const settings = useSelector((state: RootState) => state.settings);

  // 获取头像和名称显示设置
  const showUserAvatar = settings.showUserAvatar !== false;
  const showUserName = settings.showUserName !== false;
  const showModelAvatar = settings.showModelAvatar !== false;
  const showModelName = settings.showModelName !== false;

  // 获取消息样式设置
  const messageStyle = settings.messageStyle || 'bubble';
  const isBubbleStyle = messageStyle === 'bubble';

  // 获取消息分割线设置
  const [showMessageDivider, setShowMessageDivider] = useState<boolean>(true);

  useEffect(() => {
    const fetchMessageDividerSetting = () => {
      try {
        const dividerSetting = getMessageDividerSetting();
        setShowMessageDivider(dividerSetting);
      } catch (error) {
        console.error('获取消息分割线设置失败:', error);
      }
    };

    fetchMessageDividerSetting();

    // 监听 localStorage 变化，实时更新设置
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'appSettings') {
        fetchMessageDividerSetting();
      }
    };

    // 使用自定义事件监听设置变化（用于同一页面内的变化）
    const handleCustomSettingChange = () => {
      fetchMessageDividerSetting();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('appSettingsChanged', handleCustomSettingChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('appSettingsChanged', handleCustomSettingChange);
    };
  }, []);

  // 获取供应商友好名称的函数 - 使用useMemo进一步优化
  const getProviderName = useMemo(() => {
    const providerMap = new Map(providers.map(p => [p.id, p.name]));
    return (providerId: string) => providerMap.get(providerId) || providerId;
  }, [providers]);

  // 创建记忆化的 selector 来避免不必要的重新渲染
  const selectMessageBlocks = useMemo(
    () => createSelector(
      [
        (state: RootState) => state.messageBlocks.entities,
        () => message.blocks
      ],
      (blockEntities, blockIds) => {
        // 添加转换逻辑避免直接返回输入
        const blocks = blockIds
          .map((blockId: string) => blockEntities[blockId])
          .filter(Boolean) as MessageBlock[];
        return [...blocks]; // 返回新数组避免直接返回输入
      }
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
              // 🔧 修复：验证对比分析块的数据完整性
              if ('subType' in block && (block as any).subType === 'comparison') {
                const comparisonBlock = block as any;
                if (!comparisonBlock.comboResult || !comparisonBlock.comboResult.modelResults) {
                  console.error(`[MessageItem] 对比分析块数据不完整: ${blockId}`);
                  continue; // 跳过损坏的块
                }
                console.log(`[MessageItem] 成功加载对比分析块: ${blockId}`);
              }
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

  // 🔥 新增：监听消息编辑更新事件，确保UI重新渲染
  useEffect(() => {
    const handleMessageUpdated = (event: CustomEvent) => {
      const { messageId } = event.detail;
      if (messageId === message.id) {
        console.log('[MessageItem] 收到消息更新事件，强制重新渲染:', messageId);
        if (forceUpdateRef.current) {
          forceUpdateRef.current();
        }
      }
    };

    const handleForceRefresh = () => {
      console.log('[MessageItem] 收到强制刷新事件');
      if (forceUpdateRef.current) {
        forceUpdateRef.current();
      }
    };

    // 监听自定义事件
    window.addEventListener('messageUpdated', handleMessageUpdated as EventListener);
    window.addEventListener('forceRefresh', handleForceRefresh as EventListener);

    return () => {
      window.removeEventListener('messageUpdated', handleMessageUpdated as EventListener);
      window.removeEventListener('forceRefresh', handleForceRefresh as EventListener);
    };
  }, [message.id]); // 依赖message.id，确保监听正确的消息

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

  // 如果是简洁样式，使用纯白简洁布局
  if (!isBubbleStyle) {
    return (
      <Box
        id={`message-${message.id}`}
        sx={{
          display: 'flex',
          flexDirection: 'row',
          marginBottom: 0,
          paddingX: 2,
          paddingY: 2,
          alignItems: 'flex-start',
          gap: 2,
          backgroundColor: 'transparent',
          borderBottom: showMessageDivider ? '1px solid' : 'none',
          borderColor: showMessageDivider
            ? (theme.palette.mode === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)')
            : 'transparent',
        }}
      >
        {/* 头像 - 根据设置控制显示 */}
        {((isUserMessage && showUserAvatar) || (!isUserMessage && showModelAvatar)) && (
          <Avatar
            sx={{
              width: 40,
              height: 40,
              fontSize: '1.2rem',
              fontWeight: 600,
              background: isUserMessage
                ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
              color: 'white',
              flexShrink: 0,
              boxShadow: theme.palette.mode === 'dark'
                ? '0 8px 32px rgba(0, 0, 0, 0.3)'
                : '0 8px 32px rgba(0, 0, 0, 0.15)',
              border: '3px solid',
              borderColor: theme.palette.mode === 'dark'
                ? 'rgba(255, 255, 255, 0.1)'
                : 'rgba(255, 255, 255, 0.8)',
            }}
          >
            {isUserMessage ? (
              userAvatar ? (
                <img src={userAvatar} alt="用户头像" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
              ) : (
                '👤'
              )
            ) : (
              modelAvatar ? (
                <img src={modelAvatar} alt="AI头像" style={{ width: '100%', height: '100%', borderRadius: '50%' }} />
              ) : (
                '🤖'
              )
            )}
          </Avatar>
        )}

        {/* 内容区域 - 简洁样式 */}
        <Box sx={{ flex: 1, minWidth: 0 }}>
          {/* 名称和时间行 - 根据设置控制显示 */}
          {((isUserMessage && showUserName) || (!isUserMessage && showModelName)) && (
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mb: 0.5 }}>
              {/* 名称显示 - 根据设置控制 */}
              {((isUserMessage && showUserName) || (!isUserMessage && showModelName)) && (
                <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.primary' }}>
                  {isUserMessage ? '用户' : (message.model?.name || 'AI')}
                </Typography>
              )}
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.75rem' }}>
                {new Date(message.createdAt).toLocaleString('zh-CN', {
                  month: 'numeric',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Typography>
            </Box>
          )}

          {/* 消息内容 */}
          <Box sx={{ position: 'relative' }}>
            {loading ? (
              <>
                <Skeleton variant="text" width="80%" />
                <Skeleton variant="text" width="60%" />
              </>
            ) : (
              <Box sx={{ width: '100%' }}>
                {message.blocks && message.blocks.length > 0 ? (
                  <MessageBlockRenderer
                    blocks={message.blocks}
                    message={message}
                    extraPaddingLeft={0}
                    extraPaddingRight={0}
                  />
                ) : (
                  <Typography variant="body2" sx={{ lineHeight: 1.5 }}>
                    {(message as any).content || ''}
                  </Typography>
                )}
              </Box>
            )}

            {/* 底部工具栏 - 简洁样式，显示操作按钮 */}
            <Box sx={{
              display: 'flex',
              justifyContent: 'flex-start',
              alignItems: 'center',
              mt: 1,
              pt: 0.5,
              opacity: 0.7,
              '&:hover': {
                opacity: 1,
              }
            }}>
              <MessageActions
                message={message as any}
                topicId={message.topicId}
                messageIndex={messageIndex}
                onRegenerate={onRegenerate}
                onDelete={onDelete}
                onSwitchVersion={onSwitchVersion}
                onResend={onResend}
                renderMode="toolbar" // 工具栏模式，显示所有操作按钮
              />
            </Box>
          </Box>
        </Box>
      </Box>
    );
  }

  // 气泡样式（原有的布局）
  return (
    <Box
      id={`message-${message.id}`}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        marginBottom: isCompact ? 2 : 4,
        marginTop: isCompact ? 1 : 2,
        paddingX: 2,
        alignItems: isUserMessage ? 'flex-end' : 'flex-start',
      }}
    >
      {/* 头像和模型信息 - 根据样式和设置控制显示 */}
      {showAvatar && (showUserAvatar || showUserName || showModelAvatar || showModelName) && (
        <Box
          sx={{
            display: 'flex',
            justifyContent: isBubbleStyle
              ? (isUserMessage ? 'flex-end' : 'flex-start') // 气泡样式：根据用户/AI调整对齐
              : 'flex-start', // 简洁样式：都靠左对齐
            alignItems: 'center', // 垂直居中对齐
            width: isBubbleStyle ? '100%' : 'auto', // 气泡样式占满宽度，简洁样式自适应
            marginBottom: isBubbleStyle ? 1 : 0, // 气泡样式时头像与内容之间有间距
            flexShrink: 0, // 简洁样式时头像区域不收缩
            minWidth: isBubbleStyle ? 'auto' : '60px', // 简洁样式时头像区域最小宽度
          }}
        >
          {/* 用户消息显示"用户"文字和时间，右侧显示头像 */}
          {isUserMessage ? (
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1, flexDirection: 'row-reverse' }}>
              {/* 用户头像 - 根据设置控制显示 */}
              {showUserAvatar && (
                userAvatar ? (
                  <Avatar
                    src={userAvatar}
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '20%', // 更接近方形的头像
                    }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      bgcolor: '#00c853', // 绿色背景
                      width: 30,
                      height: 30,
                      borderRadius: '20%', // 更接近方形的头像
                    }}
                  >
                    <PersonIcon sx={{ fontSize: 20, color: 'white' }} />
                  </Avatar>
                )
              )}

              {/* 用户名称和时间 - 根据设置控制名称显示 */}
              {(showUserName || !showUserAvatar) && (
                <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                  {/* 用户名称 - 根据设置控制显示 */}
                  {showUserName && (
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
                  )}
                  {/* 时间显示 - 当头像或名称被隐藏时仍然显示时间 */}
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.7rem',
                      color: theme.palette.text.secondary,
                      lineHeight: 1,
                      marginTop: showUserName ? '2px' : '0'
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
              )}
            </Box>
          ) : (
            // AI消息显示头像和模型信息
            <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
              {/* 模型头像 - 根据设置控制显示 */}
              {showModelAvatar && (
                modelAvatar ? (
                  <Avatar
                    src={modelAvatar}
                    sx={{
                      width: 30,
                      height: 30,
                      borderRadius: '20%', // 更接近方形的头像
                    }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      bgcolor: 'secondary.main',
                      width: 30,
                      height: 30,
                      borderRadius: '20%', // 更接近方形的头像
                      fontSize: '1rem',
                      fontWeight: 600
                    }}
                  >
                    {message.model?.name
                      ? message.model.name.charAt(0).toUpperCase()
                      : (message.modelId
                          ? message.modelId.charAt(0).toUpperCase()
                          : 'AI')}
                  </Avatar>
                )
              )}

              {/* 模型名称和供应商名称 - 根据设置控制名称显示 */}
              {(showModelName || !showModelAvatar) && (
                <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                  {/* 模型名称 - 根据设置控制显示 */}
                  {showModelName && (
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
                  )}
                  {/* 时间显示 - 当头像或名称被隐藏时仍然显示时间 */}
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.7rem',
                      color: theme.palette.text.secondary,
                      lineHeight: 1,
                      marginTop: showModelName ? '2px' : '0'
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
              )}
            </Box>
          )}
        </Box>
      )}

      <Box sx={{
        position: 'relative',
        maxWidth: isBubbleStyle
          ? (isUserMessage
              ? `${settings.userMessageMaxWidth || 80}%`
              : `${settings.messageBubbleMaxWidth || 99}%`) // 气泡样式使用设置中的宽度值
          : '100%', // 简洁样式占满剩余宽度
        minWidth: isBubbleStyle ? `${settings.messageBubbleMinWidth || 50}%` : 'auto', // 气泡样式使用最小宽度
        width: isBubbleStyle ? 'auto' : '100%', // 气泡样式自适应内容，简洁样式占满宽度
        alignSelf: isBubbleStyle
          ? (isUserMessage ? 'flex-end' : 'flex-start') // 气泡样式：用户消息靠右，AI消息靠左
          : 'stretch', // 简洁样式：拉伸占满空间
        flex: isBubbleStyle ? 'none' : 1, // 简洁样式时占据剩余空间
      }}>
        {/* 消息内容容器 */}
        <Paper
          elevation={0}
          sx={{
            padding: isBubbleStyle ? 1.5 : 1,
            backgroundColor: isBubbleStyle
              ? (isUserMessage
                  ? theme.palette.mode === 'dark'
                    ? '#333333' // 深色主题下使用灰色背景
                    : theme.palette.primary.light
                  : theme.palette.background.paper)
              : 'transparent', // 简洁样式使用透明背景
            color: isBubbleStyle && isUserMessage && theme.palette.mode === 'dark'
              ? '#ffffff' // 深色主题下使用白色文字
              : 'inherit',
            width: '100%',
            borderRadius: isBubbleStyle ? '12px' : '0px', // 气泡样式使用圆角，简洁样式不使用
            border: isBubbleStyle ? 'none' : (theme.palette.mode === 'dark' ? '1px solid #333' : '1px solid #e0e0e0'), // 简洁样式添加边框
            position: 'relative', // 确保相对定位
            maxWidth: '100%', // 确保不会超出容器
            boxShadow: isBubbleStyle ? 'none' : 'none', // 都不使用阴影
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