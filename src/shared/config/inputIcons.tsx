import React from 'react';
import AddCircleIcon from '@mui/icons-material/AddCircle';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import SearchIcon from '@mui/icons-material/Search';
import BuildIcon from '@mui/icons-material/Build';
import ImageIcon from '@mui/icons-material/Image';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import MenuBookIcon from '@mui/icons-material/MenuBook';

export interface IconConfig {
  icon: React.ReactElement;
  label: string;
  onClick: () => void;
  color: string;
  active?: boolean;
  disabled?: boolean;
}

interface GetIconConfigsProps {
  // 状态
  toolsEnabled: boolean;
  webSearchActive: boolean;
  imageGenerationMode: boolean;
  uploadingMedia: boolean;

  // 回调函数
  onNewTopic?: () => void;
  onClearTopic?: () => void;
  toggleToolsEnabled?: () => void;
  handleWebSearchClick: () => void;
  toggleImageGenerationMode?: () => void;
  handleImageUpload: (source: 'camera' | 'photos') => void;
  handleFileUpload: () => void;
  handleKnowledgeClick?: () => void;
}

// 基础功能图标配置
export const getBasicIcons = ({
  toolsEnabled,
  webSearchActive,
  imageGenerationMode,
  onNewTopic,
  onClearTopic,
  handleWebSearchClick,
  toggleImageGenerationMode
}: Pick<GetIconConfigsProps, 'toolsEnabled' | 'webSearchActive' | 'imageGenerationMode' | 'onNewTopic' | 'onClearTopic' | 'handleWebSearchClick' | 'toggleImageGenerationMode'>): IconConfig[] => [
  {
    icon: <BuildIcon />,
    label: '工具',
    onClick: () => {}, // 空函数，实际功能由 MCPToolsButton 处理
    color: toolsEnabled ? '#4CAF50' : '#9E9E9E',
    active: toolsEnabled
  },
  {
    icon: <SearchIcon />,
    label: '网络搜索',
    onClick: handleWebSearchClick,
    color: webSearchActive ? '#3b82f6' : '#607D8B',
    active: webSearchActive
  },
  {
    icon: <ImageIcon />,
    label: '生成图片',
    onClick: toggleImageGenerationMode || (() => {}),
    color: imageGenerationMode ? '#9C27B0' : '#FF9800',
    active: imageGenerationMode
  },
  {
    icon: <AddCircleIcon />,
    label: '新建话题',
    onClick: onNewTopic || (() => {}),
    color: '#2196F3'
  },
  {
    icon: <ClearAllIcon />,
    label: '清空内容',
    onClick: onClearTopic || (() => {}),
    color: '#f44336'
  }
];

// 扩展功能图标配置 - 包含上传功能
export const getExpandedIcons = ({
  toolsEnabled,
  uploadingMedia,
  toggleToolsEnabled,
  handleImageUpload,
  handleFileUpload,
  handleKnowledgeClick
}: Pick<GetIconConfigsProps, 'toolsEnabled' | 'uploadingMedia' | 'toggleToolsEnabled' | 'handleImageUpload' | 'handleFileUpload' | 'handleKnowledgeClick'>): IconConfig[] => [
  {
    icon: <PhotoCameraIcon />,
    label: '拍照上传',
    onClick: () => handleImageUpload('camera'),
    color: '#FF9800',
    disabled: uploadingMedia
  },
  {
    icon: <ImageIcon />,
    label: '图片上传',
    onClick: () => handleImageUpload('photos'),
    color: '#2196F3',
    disabled: uploadingMedia
  },
  {
    icon: <AttachFileIcon />,
    label: '文件上传',
    onClick: handleFileUpload,
    color: '#9C27B0',
    disabled: uploadingMedia
  },
  {
    icon: <MenuBookIcon />,
    label: '知识库',
    onClick: handleKnowledgeClick || (() => {}),
    color: '#059669'
  },
  {
    icon: <BuildIcon />,
    label: '高级工具',
    onClick: toggleToolsEnabled || (() => {}),
    color: toolsEnabled ? '#4CAF50' : '#9E9E9E',
    active: toolsEnabled
  }
];
