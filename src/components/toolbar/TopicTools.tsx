import ReplayIcon from '@mui/icons-material/Replay';
import PlaylistAddIcon from '@mui/icons-material/PlaylistAdd';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import type { ReactNode } from 'react';

// 定义自己的按钮接口
interface ToolbarButton {
  id: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
}

interface TopicToolsProps {
  onRegenerateLast?: () => void;
  onAddToCollection?: () => void;
  onMoreOptions?: () => void;
}

/**
 * 话题工具按钮模块
 * 提供与话题相关的额外功能按钮
 */
export const getTopicTools = ({
  onRegenerateLast,
  onAddToCollection,
  onMoreOptions
}: TopicToolsProps): ToolbarButton[] => {
  // 返回按钮列表
  return [
    {
      id: 'regenerate-last',
      icon: <ReplayIcon />,
      label: '重新生成最后回复',
      onClick: () => onRegenerateLast && onRegenerateLast()
    },
    {
      id: 'add-to-collection',
      icon: <PlaylistAddIcon />,
      label: '添加到收藏',
      onClick: () => onAddToCollection && onAddToCollection()
    },
    {
      id: 'more-options',
      icon: <MoreHorizIcon />,
      label: '更多选项',
      onClick: () => onMoreOptions && onMoreOptions()
    }
  ];
};

export default getTopicTools; 