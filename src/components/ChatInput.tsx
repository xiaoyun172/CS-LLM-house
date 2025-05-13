import React, { useState, useRef, useEffect } from 'react';
import { IconButton, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import PhotoIcon from '@mui/icons-material/Photo';
import KeyboardVoiceIcon from '@mui/icons-material/KeyboardVoice';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isLoading?: boolean;
  allowConsecutiveMessages?: boolean; // 允许连续发送消息，即使AI尚未回复
}

const ChatInput: React.FC<ChatInputProps> = ({ 
  onSendMessage, 
  isLoading = false,
  allowConsecutiveMessages = true // 默认允许连续发送
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 判断是否允许发送消息
  const canSendMessage = () => {
    // 如果允许连续发送，则只要有内容就可以发送
    // 如果不允许连续发送，则需要检查isLoading状态
    return message.trim() && (allowConsecutiveMessages || !isLoading);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSendMessage()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  };

  // 添加焦点管理以确保复制粘贴功能正常工作
  useEffect(() => {
    // 设置一个延迟以确保组件挂载后聚焦生效
    const timer = setTimeout(() => {
      if (textareaRef.current) {
        // 聚焦后立即模糊，这有助于解决某些Android设备上的复制粘贴问题
        textareaRef.current.focus();
        textareaRef.current.blur();
      }
    }, 300);
    
    return () => clearTimeout(timer);
  }, []);

  // 显示正在加载的指示器，但不禁用输入框
  const showLoadingIndicator = isLoading && !allowConsecutiveMessages;

  return (
    <div style={{
        borderTop: '1px solid #f0f0f0',
      backgroundColor: '#f9f9f9',
      padding: '10px',
        position: 'relative',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <div style={{
          display: 'flex',
          alignItems: 'center',
        padding: '5px 8px',
        borderRadius: '20px',
        backgroundColor: '#ffffff',
          border: 'none',
        minHeight: '40px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        width: '100%',
        maxWidth: '600px'
      }}>
        {/* 语音图标 */}
          <IconButton
          size="medium"
          style={{
            color: '#797979',
            padding: '8px',
            marginRight: '4px'
          }}
          >
          <KeyboardVoiceIcon />
          </IconButton>
        
        {/* 文本输入区域 */}
        <div style={{
          flexGrow: 1,
          margin: '0 8px',
          position: 'relative'
        }}>
          <textarea
            ref={textareaRef}
            style={{
              fontSize: '15px',
              padding: '8px 0',
              border: 'none',
              outline: 'none',
              width: '100%',
              backgroundColor: 'transparent',
              lineHeight: '1.4',
              fontFamily: 'inherit',
              resize: 'none',
              overflow: 'hidden',
              minHeight: '16px',
              maxHeight: '60px'
            }}
            placeholder="和LLM小屋聊点什么"
            value={message}
            onChange={handleChange}
            onKeyPress={handleKeyPress}
            disabled={showLoadingIndicator}
            rows={1}
          />
        </div>
        
        {/* 其他功能图标和发送按钮 */}
        <div style={{
          display: 'flex',
          alignItems: 'center'
        }}>
          <IconButton
            size="medium"
            style={{
              color: '#797979',
              padding: '8px',
              margin: '0 2px'
            }}
          >
            <PhotoIcon />
          </IconButton>
          
          <IconButton
            size="medium"
            style={{
              color: '#797979',
              padding: '8px',
              margin: '0 2px'
            }}
          >
            <AddCircleOutlineIcon />
          </IconButton>
          
          {message.trim() ? (
            <IconButton
              color="primary"
              type="submit"
              disabled={!canSendMessage()}
              size="medium"
              onClick={handleSubmit}
              style={{
                color: '#07c160',
                padding: '8px',
                margin: '0 2px'
              }}
            >
              {isLoading && !allowConsecutiveMessages ? <CircularProgress size={24} thickness={5} /> : <SendIcon />}
            </IconButton>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
