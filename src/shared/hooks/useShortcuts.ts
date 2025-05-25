/**
 * 快捷键功能绑定Hook
 */

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../store';
import { shortcutsService } from '../services/ShortcutsService';
import { selectShortcutsEnabled } from '../store/slices/shortcutsSlice';
import { EventEmitter, EVENT_NAMES } from '../services/EventService';
import { TopicService } from '../services/TopicService';
import { newMessagesActions } from '../store/slices/newMessagesSlice';
import type { ShortcutAction } from '../types/shortcuts';

/**
 * 快捷键功能绑定Hook
 */
export const useShortcuts = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const shortcutsEnabled = useAppSelector(selectShortcutsEnabled);

  useEffect(() => {
    if (!shortcutsEnabled) return;

    // 定义快捷键处理函数
    const shortcutHandlers: Record<ShortcutAction, () => void | Promise<void>> = {
      // 发送消息 - 由输入框组件处理
      send_message: () => {
        // 这个由输入框的keypress事件处理，这里不需要额外处理
      },

      // 新建话题
      new_topic: async () => {
        try {
          EventEmitter.emit(EVENT_NAMES.ADD_NEW_TOPIC);
          const newTopic = await TopicService.createNewTopic();
          if (newTopic) {
            dispatch(newMessagesActions.setCurrentTopicId(newTopic.id));
            setTimeout(() => {
              EventEmitter.emit(EVENT_NAMES.SHOW_TOPIC_SIDEBAR);
            }, 100);
          }
        } catch (error) {
          console.error('快捷键创建新话题失败:', error);
        }
      },

      // 清空输入
      clear_input: () => {
        // 触发清空输入事件
        window.dispatchEvent(new CustomEvent('shortcut-clear-input'));
      },

      // 聚焦输入框
      focus_input: () => {
        // 查找输入框并聚焦
        const textarea = document.querySelector('textarea') as HTMLTextAreaElement;
        if (textarea) {
          textarea.focus();
        }
      },

      // 切换侧边栏
      toggle_sidebar: () => {
        EventEmitter.emit(EVENT_NAMES.SWITCH_TOPIC_SIDEBAR);
      },

      // 打开设置
      open_settings: () => {
        navigate('/settings');
      },

      // 复制最后回复
      copy_last_response: () => {
        // 查找最后一条AI回复并复制
        const lastAiMessage = document.querySelector('[data-role="assistant"]:last-of-type .message-content');
        if (lastAiMessage) {
          const text = lastAiMessage.textContent || '';
          navigator.clipboard.writeText(text).then(() => {
            console.log('已复制最后回复');
          }).catch(err => {
            console.error('复制失败:', err);
          });
        }
      },

      // 重新生成回复
      regenerate_response: () => {
        // 触发重新生成事件 - 使用自定义事件
        window.dispatchEvent(new CustomEvent('shortcut-regenerate-response'));
      },

      // 切换模型
      switch_model: () => {
        // 触发模型选择器显示
        window.dispatchEvent(new CustomEvent('shortcut-switch-model'));
      },

      // 切换网络搜索
      toggle_web_search: () => {
        // 触发网络搜索切换事件
        window.dispatchEvent(new CustomEvent('shortcut-toggle-web-search'));
      },

      // 切换图像模式
      toggle_image_mode: () => {
        // 触发图像模式切换事件
        window.dispatchEvent(new CustomEvent('shortcut-toggle-image-mode'));
      },

      // 打开开发者工具
      open_devtools: () => {
        navigate('/devtools');
      },

      // 导出聊天记录
      export_chat: () => {
        // 触发导出聊天记录事件
        window.dispatchEvent(new CustomEvent('shortcut-export-chat'));
      },

      // 导入文件
      import_file: () => {
        // 触发文件导入事件
        window.dispatchEvent(new CustomEvent('shortcut-import-file'));
      },

      // 语音输入
      voice_input: () => {
        // 触发语音输入事件
        window.dispatchEvent(new CustomEvent('shortcut-voice-input'));
      },

      // 停止生成
      stop_generation: () => {
        // 触发停止生成事件 - 使用自定义事件
        window.dispatchEvent(new CustomEvent('shortcut-stop-generation'));
      }
    };

    // 注册所有快捷键
    const shortcuts = shortcutsService.getShortcuts();
    shortcuts.forEach(shortcut => {
      if (shortcut.enabled && shortcutHandlers[shortcut.action]) {
        shortcutsService.register(shortcut, () => {
          shortcutHandlers[shortcut.action]();
        });
      }
    });

    // 清理函数
    return () => {
      shortcuts.forEach(shortcut => {
        shortcutsService.unregister(shortcut.id);
      });
    };
  }, [shortcutsEnabled, navigate, dispatch]);

  // 返回一些有用的函数
  return {
    /**
     * 手动触发快捷键动作
     */
    triggerAction: (action: ShortcutAction) => {
      if (!shortcutsEnabled) return;

      const shortcuts = shortcutsService.getShortcuts();
      const shortcut = shortcuts.find(s => s.action === action && s.enabled);
      if (shortcut) {
        // 这里可以添加具体的动作处理逻辑
        console.log(`手动触发快捷键动作: ${action}`);
      }
    },

    /**
     * 检查快捷键是否启用
     */
    isShortcutEnabled: (action: ShortcutAction) => {
      if (!shortcutsEnabled) return false;

      const shortcuts = shortcutsService.getShortcuts();
      const shortcut = shortcuts.find(s => s.action === action);
      return shortcut?.enabled || false;
    },

    /**
     * 获取快捷键组合显示文本
     */
    getShortcutText: (action: ShortcutAction) => {
      const shortcuts = shortcutsService.getShortcuts();
      const shortcut = shortcuts.find(s => s.action === action);
      if (!shortcut) return '';

      const combo = shortcut.combination;
      const parts: string[] = [];
      if (combo.ctrl) parts.push('Ctrl');
      if (combo.alt) parts.push('Alt');
      if (combo.shift) parts.push('Shift');
      if (combo.meta) parts.push('Cmd');
      parts.push(combo.key);
      return parts.join(' + ');
    }
  };
};

/**
 * 输入框快捷键Hook
 * 专门用于输入框组件的快捷键处理
 */
export const useInputShortcuts = (
  textareaRef: React.RefObject<HTMLTextAreaElement>,
  onClear?: () => void
) => {
  useEffect(() => {
    const handleClearInput = () => {
      if (textareaRef.current && onClear) {
        onClear();
        textareaRef.current.focus();
      }
    };

    // 监听清空输入事件
    window.addEventListener('shortcut-clear-input', handleClearInput);

    return () => {
      window.removeEventListener('shortcut-clear-input', handleClearInput);
    };
  }, [onClear]);
};

export default useShortcuts;
