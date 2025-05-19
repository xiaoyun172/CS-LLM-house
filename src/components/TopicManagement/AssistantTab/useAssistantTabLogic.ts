import { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { v4 as uuidv4 } from 'uuid';
import * as tinyPinyin from 'tiny-pinyin';
import type { Assistant } from '../../../shared/types/Assistant';
import type { RootState } from '../../../shared/store';
import { AssistantService } from '../../../shared/services';
import { addItemToGroup } from '../../../shared/store/slices/groupsSlice';
import { useAssistantGroups } from './hooks/useAssistantGroups';
import { getAllAgentSources } from '../../../shared/services/assistant/PredefinedAssistants';

// 预设助手数据 - 从服务中获取
const predefinedAssistantsData = getAllAgentSources();

/**
 * 助手标签页逻辑Hook
 */
export function useAssistantTabLogic(
  userAssistants: Assistant[],
  currentAssistant: Assistant | null,
  onSelectAssistant: (assistant: Assistant) => void,
  onAddAssistant: (assistant: Assistant) => void,
  onUpdateAssistant?: (assistant: Assistant) => void,
  onDeleteAssistant?: (assistantId: string) => void
) {
  const dispatch = useDispatch();
  const [assistantDialogOpen, setAssistantDialogOpen] = useState(false);
  const [selectedAssistantId, setSelectedAssistantId] = useState<string | null>(null);

  // 从Redux获取助手列表，用于调试
  const reduxAssistants = useSelector((state: RootState) => state.assistants.assistants);

  // 使用助手分组钩子
  const {
    assistantGroups,
    assistantGroupMap,
    ungroupedAssistants
  } = useAssistantGroups(userAssistants);

  // 通知提示状态
  const [notification, setNotification] = useState<{message: string, open: boolean, severity: 'success' | 'error' | 'info' | 'warning'}>({
    message: '',
    open: false,
    severity: 'success'
  });

  // 助手操作菜单状态
  const [assistantMenuAnchorEl, setAssistantMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMenuAssistant, setSelectedMenuAssistant] = useState<Assistant | null>(null);

  // 添加助手到分组对话框状态
  const [addToGroupMenuAnchorEl, setAddToGroupMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [assistantToGroup, setAssistantToGroup] = useState<Assistant | null>(null);

  // 分组对话框状态
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);

  // 编辑助手对话框状态
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editAssistantName, setEditAssistantName] = useState('');
  const [editAssistantPrompt, setEditAssistantPrompt] = useState('');

  // 图标选择对话框状态
  const [iconPickerOpen, setIconPickerOpen] = useState(false);

  // 添加调试日志，监控助手列表变化
  useEffect(() => {
    console.log('[AssistantTab] userAssistants 更新:', userAssistants.length);
    console.log('[AssistantTab] reduxAssistants:', reduxAssistants.length);
    console.log('[AssistantTab] ungroupedAssistants:', ungroupedAssistants?.length || 0);
  }, [userAssistants, reduxAssistants, ungroupedAssistants]);

  // 显示通知
  const showNotification = (message: string, severity: 'success' | 'error' | 'info' | 'warning' = 'success') => {
    setNotification({
      message,
      open: true,
      severity
    });
  };

  // 关闭通知
  const handleCloseNotification = () => {
    setNotification({...notification, open: false});
  };

  // 打开助手选择对话框
  const handleOpenAssistantDialog = () => {
    setAssistantDialogOpen(true);
    setSelectedAssistantId(null);
  };

  // 关闭助手选择对话框
  const handleCloseAssistantDialog = () => {
    setAssistantDialogOpen(false);
    setSelectedAssistantId(null);
  };

  // 选择助手
  const handleSelectAssistant = (assistantId: string) => {
    setSelectedAssistantId(assistantId);
  };

  // 选择助手（从列表中）
  const handleSelectAssistantFromList = (assistant: Assistant) => {
    // 调用父组件传入的onSelectAssistant函数
    onSelectAssistant(assistant);
  };

  // 添加选中的预设助手
  const handleAddAssistant = () => {
    const selectedAssistant = predefinedAssistantsData.find(a => a.id === selectedAssistantId);
    if (selectedAssistant && onAddAssistant) {
      const newAssistant = {
        ...selectedAssistant,
        id: uuidv4(), // 使用uuidv4代替nanoid
        isSystem: false, // 设置为非系统助手
        topicIds: [], // 清空话题列表
        topics: [] // 清空话题对象列表
      };
      onAddAssistant(newAssistant);
      handleCloseAssistantDialog();
    }
  };

  // 打开分组对话框
  const handleOpenGroupDialog = () => {
    setGroupDialogOpen(true);
  };

  // 关闭分组对话框
  const handleCloseGroupDialog = () => {
    setGroupDialogOpen(false);
  };

  // 打开助手菜单
  const handleOpenMenu = (event: React.MouseEvent, assistant: Assistant) => {
    event.stopPropagation();
    setAssistantMenuAnchorEl(event.currentTarget as HTMLElement);
    setSelectedMenuAssistant(assistant);
  };

  // 关闭助手菜单
  const handleCloseAssistantMenu = () => {
    setAssistantMenuAnchorEl(null);
    setSelectedMenuAssistant(null);
  };

  // 打开添加到分组菜单
  const handleOpenAddToGroupMenu = () => {
    if (!selectedMenuAssistant) return;

    setAssistantToGroup(selectedMenuAssistant);
    setAddToGroupMenuAnchorEl(assistantMenuAnchorEl);
    setAssistantMenuAnchorEl(null);
  };

  // 关闭添加到分组菜单
  const handleCloseAddToGroupMenu = () => {
    setAddToGroupMenuAnchorEl(null);
    setAssistantToGroup(null);
  };

  // 添加到新分组
  const handleAddToNewGroup = () => {
    handleCloseAddToGroupMenu();
    handleOpenGroupDialog();
  };

  // 处理删除助手
  const handleDeleteAssistantAction = (assistantId: string, event?: React.MouseEvent) => {
    if (event) event.stopPropagation();
    if (onDeleteAssistant) onDeleteAssistant(assistantId);
    handleCloseAssistantMenu();
  };

  // 打开编辑助手对话框
  const handleOpenEditDialog = () => {
    if (!selectedMenuAssistant) return;

    setEditAssistantName(selectedMenuAssistant.name);
    setEditAssistantPrompt(selectedMenuAssistant.systemPrompt || '');
    setEditDialogOpen(true);
    handleCloseAssistantMenu();
  };

  // 关闭编辑助手对话框
  const handleCloseEditDialog = () => {
    setEditDialogOpen(false);
  };

  // 保存编辑后的助手
  const handleSaveAssistant = () => {
    if (!selectedMenuAssistant) return;

    const updatedAssistant = {
      ...selectedMenuAssistant,
      name: editAssistantName,
      systemPrompt: editAssistantPrompt
    };

    if (onUpdateAssistant) {
      onUpdateAssistant(updatedAssistant);
    }

    handleCloseEditDialog();
  };

  // 复制助手
  const handleCopyAssistant = () => {
    if (!selectedMenuAssistant) return;

    const newAssistant = {
      ...selectedMenuAssistant,
      id: uuidv4(),
      name: `${selectedMenuAssistant.name} (复制)`,
      topicIds: [],
      topics: []
    };

    onAddAssistant(newAssistant);
    handleCloseAssistantMenu();
  };

  // 清空话题
  const handleClearTopics = async () => {
    if (!selectedMenuAssistant) return;

    try {
      await AssistantService.clearAssistantTopics(selectedMenuAssistant.id);

      // 如果选中的助手是当前助手，刷新它
      if (currentAssistant && currentAssistant.id === selectedMenuAssistant.id) {
        const updatedAssistant = {
          ...currentAssistant,
          topicIds: [],
          topics: []
        };
        if (onUpdateAssistant) {
          onUpdateAssistant(updatedAssistant);
        }
      }
    } catch (error) {
      console.error('清空话题失败:', error);
    }

    handleCloseAssistantMenu();
  };

  // 打开图标选择对话框
  const handleOpenIconPicker = () => {
    handleCloseAssistantMenu();
    setIconPickerOpen(true);
  };

  // 关闭图标选择对话框
  const handleCloseIconPicker = () => {
    setIconPickerOpen(false);
  };

  // 选择新的图标
  const handleSelectEmoji = (emoji: string) => {
    if (!selectedMenuAssistant) return;

    const updatedAssistant = {
      ...selectedMenuAssistant,
      emoji: emoji
    };

    if (onUpdateAssistant) {
      onUpdateAssistant(updatedAssistant);
    }
  };

  // 按拼音升序排序
  const handleSortByPinyinAsc = () => {
    const sorted = [...userAssistants].sort((a, b) => {
      const pinyinA = tinyPinyin.convertToPinyin(a.name, '', true);
      const pinyinB = tinyPinyin.convertToPinyin(b.name, '', true);
      return pinyinA.localeCompare(pinyinB);
    });
    
    // 更新Redux中的助手列表顺序
    sorted.forEach((assistant, index) => {
      dispatch({
        type: 'assistants/updateAssistantOrder',
        payload: { assistantId: assistant.id, order: index }
      });
    });
    
    // 显示通知
    showNotification('助手已按拼音升序排列');
    
    handleCloseAssistantMenu();
  };

  // 按拼音降序排序
  const handleSortByPinyinDesc = () => {
    const sorted = [...userAssistants].sort((a, b) => {
      const pinyinA = tinyPinyin.convertToPinyin(a.name, '', true);
      const pinyinB = tinyPinyin.convertToPinyin(b.name, '', true);
      return pinyinB.localeCompare(pinyinA);
    });
    
    // 更新Redux中的助手列表顺序
    sorted.forEach((assistant, index) => {
      dispatch({
        type: 'assistants/updateAssistantOrder',
        payload: { assistantId: assistant.id, order: index }
      });
    });
    
    // 显示通知
    showNotification('助手已按拼音降序排列');
    
    handleCloseAssistantMenu();
  };

  // 添加助手到分组
  const handleAddToGroup = (groupId: string) => {
    if (assistantToGroup) {
      dispatch(addItemToGroup({
        groupId: groupId,
        itemId: assistantToGroup.id
      }));
      handleCloseAddToGroupMenu();
    }
  };

  // 处理助手名称输入变化
  const handleEditNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditAssistantName(e.target.value);
  };

  // 处理助手提示词输入变化
  const handleEditPromptChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditAssistantPrompt(e.target.value);
  };

  return {
    // 状态
    assistantDialogOpen,
    selectedAssistantId,
    assistantGroups,
    assistantGroupMap,
    ungroupedAssistants,
    notification,
    assistantMenuAnchorEl,
    selectedMenuAssistant,
    addToGroupMenuAnchorEl,
    assistantToGroup,
    groupDialogOpen,
    editDialogOpen,
    editAssistantName,
    editAssistantPrompt,
    iconPickerOpen,
    
    // 处理函数
    showNotification,
    handleCloseNotification,
    handleOpenAssistantDialog,
    handleCloseAssistantDialog,
    handleSelectAssistant,
    handleSelectAssistantFromList,
    handleAddAssistant,
    handleOpenGroupDialog,
    handleCloseGroupDialog,
    handleOpenMenu,
    handleCloseAssistantMenu,
    handleOpenAddToGroupMenu,
    handleCloseAddToGroupMenu,
    handleAddToNewGroup,
    handleDeleteAssistantAction,
    handleOpenEditDialog,
    handleCloseEditDialog,
    handleSaveAssistant,
    handleCopyAssistant,
    handleClearTopics,
    handleOpenIconPicker,
    handleCloseIconPicker,
    handleSelectEmoji,
    handleSortByPinyinAsc,
    handleSortByPinyinDesc,
    handleAddToGroup,
    handleEditNameChange,
    handleEditPromptChange,
    
    // 数据
    predefinedAssistantsData
  };
} 