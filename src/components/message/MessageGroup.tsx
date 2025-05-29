import React, { useMemo, useEffect, useState, useCallback } from 'react';
import { Box, Paper, Typography, useTheme } from '@mui/material';
import { styled } from '@mui/material/styles';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useSelector } from 'react-redux';
import type { RootState } from '../../shared/store';
import MessageItem from './MessageItem';
import ConversationDivider from './ConversationDivider';
import type { Message } from '../../shared/types/newMessage';
import { EventEmitter, EVENT_NAMES } from '../../shared/services/EventEmitter';
import { getMessageDividerSetting, shouldShowConversationDivider } from '../../shared/utils/settingsUtils';

interface MessageGroupProps {
  date: string;
  messages: Message[];
  expanded?: boolean;
  onToggleExpand?: () => void;
  forceUpdate?: () => void;
  startIndex?: number; // 当前组在全局消息列表中的起始索引
  onRegenerate?: (messageId: string) => void;
  onDelete?: (messageId: string) => void;
  onSwitchVersion?: (versionId: string) => void;
  onResend?: (messageId: string) => void;
}

/**
 * 消息分组组件
 * 按日期对消息进行分组显示
 */
const MessageGroup: React.FC<MessageGroupProps> = ({
  date,
  messages,
  expanded = true,
  onToggleExpand,
  forceUpdate: parentForceUpdate,
  startIndex = 0,
  onRegenerate,
  onDelete,
  onSwitchVersion,
  onResend,
}) => {
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';

  // 从Redux获取设置
  const messageGrouping = useSelector((state: RootState) =>
    (state.settings as any).messageGrouping || 'byDate'
  );

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

  // 格式化日期
  const formattedDate = useMemo(() => {
    try {
      const dateObj = new Date(date);
      return format(dateObj, 'yyyy年MM月dd日 EEEE', { locale: zhCN });
    } catch (error) {
      return date;
    }
  }, [date]);

  // 添加强制更新机制，优先使用父组件传入的forceUpdate
  const [, setLocalUpdateCounter] = useState(0);
  const localForceUpdate = useCallback(() => {
    setLocalUpdateCounter(prev => prev + 1);
  }, []);
  const forceUpdate = parentForceUpdate || localForceUpdate;

  // 添加流式输出事件监听
  useEffect(() => {
    // 检查是否有正在流式输出的消息
    const hasStreamingMessage = messages.some(message => message.status === 'streaming');

    if (hasStreamingMessage) {
      // 监听流式输出事件
      const textDeltaHandler = () => {
        forceUpdate();
      };

      // 订阅事件
      const unsubscribeTextDelta = EventEmitter.on(EVENT_NAMES.STREAM_TEXT_DELTA, textDeltaHandler);
      const unsubscribeTextComplete = EventEmitter.on(EVENT_NAMES.STREAM_TEXT_COMPLETE, textDeltaHandler);
      const unsubscribeThinkingDelta = EventEmitter.on(EVENT_NAMES.STREAM_THINKING_DELTA, textDeltaHandler);

      // 定期强制更新UI，确保流式输出显示
      const updateInterval = setInterval(() => {
        if (messages.some(message => message.status === 'streaming')) {
          forceUpdate();
        }
      }, 100); // 每100ms更新一次

      return () => {
        unsubscribeTextDelta();
        unsubscribeTextComplete();
        unsubscribeThinkingDelta();
        clearInterval(updateInterval);
      };
    }
  }, [messages, forceUpdate]);

  // 如果禁用了消息分组，直接渲染消息列表
  if (messageGrouping === 'disabled') {
    return (
      <Box>
        {messages.map((message, index) => (
          <React.Fragment key={message.id}>
            <MessageItem
              message={message}
              forceUpdate={forceUpdate}
              messageIndex={startIndex + index} // 传递全局消息索引
              onRegenerate={onRegenerate}
              onDelete={onDelete}
              onSwitchVersion={onSwitchVersion}
              onResend={onResend}
            />
            {/* 在对话轮次结束后显示分割线 */}
            {shouldShowConversationDivider(messages, index) && (
              <ConversationDivider show={showMessageDivider} style="subtle" />
            )}
          </React.Fragment>
        ))}
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3 }}>
      {/* 日期标题 */}
      <DateHeader
        onClick={onToggleExpand}
        sx={{
          cursor: onToggleExpand ? 'pointer' : 'default',
          backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
        }}
      >
        <Typography variant="body2" color="text.secondary">
          {formattedDate}
        </Typography>

        {onToggleExpand && (
          <ExpandMoreIcon
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.3s ease',
              fontSize: '1.2rem',
              color: 'text.secondary',
            }}
          />
        )}
      </DateHeader>

      {/* 消息列表 */}
      {expanded && (
        <Box>
          {messages.map((message, index) => (
            <React.Fragment key={message.id}>
              <MessageItem
                message={message}
                forceUpdate={forceUpdate}
                messageIndex={startIndex + index} // 传递全局消息索引
                onRegenerate={onRegenerate}
                onDelete={onDelete}
                onSwitchVersion={onSwitchVersion}
                onResend={onResend}
              />
              {/* 在对话轮次结束后显示分割线 */}
              {shouldShowConversationDivider(messages, index) && (
                <ConversationDivider show={showMessageDivider} style="subtle" />
              )}
            </React.Fragment>
          ))}
        </Box>
      )}
    </Box>
  );
};

// 样式化组件
const DateHeader = styled(Paper)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: theme.spacing(1, 2),
  marginBottom: theme.spacing(1),
  borderRadius: theme.shape.borderRadius,
  boxShadow: 'none',
}));

export default React.memo(MessageGroup);
