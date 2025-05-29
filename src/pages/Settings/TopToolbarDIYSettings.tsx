import React, { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../shared/store';
import { updateSettings } from '../../shared/store/settingsSlice';
import {
  Box,
  Typography,
  Paper,
  FormGroup,
  FormControlLabel,
  Switch,
  IconButton,
  Tooltip,
  AppBar,
  Toolbar,
  Chip,
  Button,
  Divider,
  Card,
  Grid
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import InfoIcon from '@mui/icons-material/Info';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import AddIcon from '@mui/icons-material/Add';
import ClearAllIcon from '@mui/icons-material/ClearAll';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import TitleIcon from '@mui/icons-material/Title';
import TopicIcon from '@mui/icons-material/Topic';
import TouchAppIcon from '@mui/icons-material/TouchApp';
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import RestoreIcon from '@mui/icons-material/Restore';

interface ComponentPosition {
  id: string;
  x: number;
  y: number;
  width?: number;
  height?: number;
}

interface DragState {
  isDragging: boolean;
  draggedComponent: string | null;
  startPosition: { x: number; y: number };
  currentPosition: { x: number; y: number };
}

const TopToolbarDIYSettings: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const settings = useAppSelector((state) => state.settings);
  const previewRef = useRef<HTMLDivElement>(null);

  // 获取当前工具栏设置，如果没有positions则初始化
  const topToolbar = settings.topToolbar || {
    showSettingsButton: true,
    showModelSelector: true,
    modelSelectorStyle: 'full',
    showChatTitle: true,
    showTopicName: false,
    showNewTopicButton: false,
    showClearButton: false,
    showMenuButton: true,
    // 新增：组件位置信息
    componentPositions: [] as ComponentPosition[]
  };

  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedComponent: null,
    startPosition: { x: 0, y: 0 },
    currentPosition: { x: 0, y: 0 }
  });

  // 组件配置
  const componentConfig = {
    menuButton: { name: '菜单按钮', icon: <MenuIcon />, key: 'showMenuButton' },
    chatTitle: { name: '对话标题', icon: <TitleIcon />, key: 'showChatTitle' },
    topicName: { name: '话题名称', icon: <TopicIcon />, key: 'showTopicName' },
    newTopicButton: { name: '新建话题', icon: <AddIcon />, key: 'showNewTopicButton' },
    clearButton: { name: '清空按钮', icon: <ClearAllIcon />, key: 'showClearButton' },
    modelSelector: { name: '模型选择器', icon: <SmartToyIcon />, key: 'showModelSelector' },
    settingsButton: { name: '设置按钮', icon: <SettingsIcon />, key: 'showSettingsButton' },
  };

  const handleBack = () => {
    navigate('/settings/appearance');
  };

  // 更新组件开关状态
  const handleComponentToggle = (componentId: string, enabled: boolean) => {
    const config = componentConfig[componentId as keyof typeof componentConfig];
    if (!config) return;

    dispatch(updateSettings({
      topToolbar: {
        ...topToolbar,
        [config.key]: enabled
      }
    }));
  };

  // 开始拖拽
  const handleDragStart = useCallback((componentId: string, event: React.MouseEvent | React.TouchEvent) => {
    event.preventDefault();

    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    setDragState({
      isDragging: true,
      draggedComponent: componentId,
      startPosition: { x: clientX, y: clientY },
      currentPosition: { x: clientX, y: clientY }
    });
  }, []);

  // 拖拽移动
  const handleDragMove = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!dragState.isDragging) return;

    event.preventDefault();
    const clientX = 'touches' in event ? event.touches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.touches[0].clientY : event.clientY;

    setDragState(prev => ({
      ...prev,
      currentPosition: { x: clientX, y: clientY }
    }));
  }, [dragState.isDragging]);

  // 结束拖拽
  const handleDragEnd = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    if (!dragState.isDragging || !dragState.draggedComponent || !previewRef.current) return;

    const clientX = 'touches' in event ? event.changedTouches[0].clientX : event.clientX;
    const clientY = 'touches' in event ? event.changedTouches[0].clientY : event.clientY;

    const previewRect = previewRef.current.getBoundingClientRect();

    // 检查是否拖拽到预览区域内
    if (
      clientX >= previewRect.left &&
      clientX <= previewRect.right &&
      clientY >= previewRect.top &&
      clientY <= previewRect.bottom
    ) {
      // 计算相对于预览区域的位置
      const relativeX = ((clientX - previewRect.left) / previewRect.width) * 100;
      const relativeY = ((clientY - previewRect.top) / previewRect.height) * 100;

      // 更新组件位置
      const newPositions = [...(topToolbar.componentPositions || [])];
      const existingIndex = newPositions.findIndex(pos => pos.id === dragState.draggedComponent);

      const newPosition: ComponentPosition = {
        id: dragState.draggedComponent,
        x: Math.max(0, Math.min(90, relativeX)), // 限制在0-90%范围内
        y: Math.max(0, Math.min(80, relativeY))  // 限制在0-80%范围内
      };

      if (existingIndex >= 0) {
        newPositions[existingIndex] = newPosition;
      } else {
        newPositions.push(newPosition);
      }

      dispatch(updateSettings({
        topToolbar: {
          ...topToolbar,
          componentPositions: newPositions
        }
      }));
    }

    setDragState({
      isDragging: false,
      draggedComponent: null,
      startPosition: { x: 0, y: 0 },
      currentPosition: { x: 0, y: 0 }
    });
  }, [dragState, topToolbar, dispatch]);

  // 渲染预览组件
  const renderPreviewComponent = (componentId: string, position?: ComponentPosition) => {
    const config = componentConfig[componentId as keyof typeof componentConfig];
    if (!config || !topToolbar[config.key as keyof typeof topToolbar]) return null;

    const style = position ? {
      position: 'absolute' as const,
      left: `${position.x}%`,
      top: `${position.y}%`,
      transform: 'translate(-50%, -50%)',
      zIndex: 10
    } : {};

    switch (componentId) {
      case 'menuButton':
        return (
          <IconButton key={componentId} color="inherit" size="small" sx={style}>
            <MenuIcon />
          </IconButton>
        );
      case 'chatTitle':
        return (
          <Typography key={componentId} variant="h6" noWrap sx={style}>
            对话
          </Typography>
        );
      case 'topicName':
        return (
          <Typography key={componentId} variant="body2" noWrap sx={{ ...style, color: 'text.secondary' }}>
            示例话题
          </Typography>
        );
      case 'newTopicButton':
        return (
          <IconButton key={componentId} color="inherit" size="small" sx={style}>
            <AddIcon />
          </IconButton>
        );
      case 'clearButton':
        return (
          <IconButton key={componentId} color="inherit" size="small" sx={style}>
            <ClearAllIcon />
          </IconButton>
        );
      case 'modelSelector':
        return topToolbar.modelSelectorStyle === 'icon' ? (
          <IconButton key={componentId} color="inherit" size="small" sx={style}>
            <SmartToyIcon />
          </IconButton>
        ) : (
          <Chip
            key={componentId}
            label="GPT-4"
            size="small"
            variant="outlined"
            sx={{
              ...style,
              borderColor: 'divider',
              color: 'text.primary'
            }}
          />
        );
      case 'settingsButton':
        return (
          <IconButton key={componentId} color="inherit" size="small" sx={style}>
            <SettingsIcon />
          </IconButton>
        );
      default:
        return null;
    }
  };

  // 重置布局
  const handleResetLayout = () => {
    dispatch(updateSettings({
      topToolbar: {
        ...topToolbar,
        componentPositions: []
      }
    }));
  };

  return (
    <Box sx={{
      height: '100vh',
      backgroundColor: 'background.default',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {/* 头部 */}
      <Box sx={{
        display: 'flex',
        alignItems: 'center',
        padding: 2,
        borderBottom: 1,
        borderColor: 'divider',
        backgroundColor: 'background.paper',
        zIndex: 10,
        flexShrink: 0
      }}>
        <ArrowBackIcon
          sx={{ mr: 2, cursor: 'pointer' }}
          onClick={handleBack}
        />
        <Typography variant="h6" color="primary" sx={{ flexGrow: 1 }}>
          顶部工具栏 DIY 设置
        </Typography>
        <Button
          startIcon={<RestoreIcon />}
          onClick={handleResetLayout}
          size="small"
          variant="outlined"
        >
          重置布局
        </Button>
      </Box>

      <Box sx={{ p: 2, flex: 1, overflow: 'auto' }}>
        {/* DIY 预览区域 */}
        <Paper elevation={2} sx={{ mb: 3, overflow: 'hidden' }}>
          <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
            <AutoFixHighIcon color="primary" />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              DIY 布局预览
            </Typography>
            <Tooltip title="拖拽下方组件到此区域进行自由布局">
              <IconButton size="small">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Box
            ref={previewRef}
            sx={{
              position: 'relative',
              height: 200,
              bgcolor: 'background.paper',
              border: '2px dashed',
              borderColor: 'primary.main',
              borderTop: '1px solid',
              borderTopColor: 'divider',
              overflow: 'hidden'
            }}
            onMouseMove={handleDragMove}
            onMouseUp={handleDragEnd}
            onTouchMove={handleDragMove}
            onTouchEnd={handleDragEnd}
          >
            {/* 网格背景 */}
            <Box sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundImage: `
                linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px),
                linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)
              `,
              backgroundSize: '20px 20px',
              opacity: 0.3
            }} />

            {/* 渲染已放置的组件 */}
            {(topToolbar.componentPositions || []).map(position =>
              renderPreviewComponent(position.id, position)
            )}

            {/* 拖拽中的组件 */}
            {dragState.isDragging && dragState.draggedComponent && (
              <Box sx={{
                position: 'fixed',
                left: dragState.currentPosition.x,
                top: dragState.currentPosition.y,
                transform: 'translate(-50%, -50%)',
                zIndex: 1000,
                opacity: 0.8,
                pointerEvents: 'none'
              }}>
                {renderPreviewComponent(dragState.draggedComponent)}
              </Box>
            )}

            {/* 提示文字 */}
            {(topToolbar.componentPositions || []).length === 0 && (
              <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                textAlign: 'center',
                color: 'text.secondary'
              }}>
                <TouchAppIcon sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                <Typography variant="body2">
                  拖拽下方组件到此区域进行自由布局
                </Typography>
              </Box>
            )}
          </Box>
        </Paper>

        {/* 组件面板 */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #eee' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">可用组件</Typography>
            <Tooltip title="长按组件拖拽到预览区域进行布局">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Grid container spacing={2}>
            {Object.entries(componentConfig).map(([componentId, config]) => {
              const isEnabled = topToolbar[config.key as keyof typeof topToolbar];
              const isPlaced = (topToolbar.componentPositions || []).some(pos => pos.id === componentId);

              return (
                <Grid item xs={6} sm={4} md={3} key={componentId}>
                  <Card
                    sx={{
                      p: 2,
                      textAlign: 'center',
                      cursor: isEnabled ? 'grab' : 'not-allowed',
                      opacity: isEnabled ? 1 : 0.5,
                      border: isPlaced ? '2px solid' : '1px solid',
                      borderColor: isPlaced ? 'success.main' : 'divider',
                      bgcolor: isPlaced ? 'success.light' : 'background.paper',
                      transition: 'all 0.2s ease',
                      '&:hover': isEnabled ? {
                        transform: 'translateY(-2px)',
                        boxShadow: 2
                      } : {},
                      '&:active': isEnabled ? {
                        cursor: 'grabbing',
                        transform: 'scale(0.95)'
                      } : {}
                    }}
                    onMouseDown={isEnabled ? (e) => handleDragStart(componentId, e) : undefined}
                    onTouchStart={isEnabled ? (e) => handleDragStart(componentId, e) : undefined}
                  >
                    <Box sx={{ mb: 1, color: isEnabled ? 'primary.main' : 'text.disabled' }}>
                      {config.icon}
                    </Box>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: 500,
                        color: isEnabled ? 'text.primary' : 'text.disabled'
                      }}
                    >
                      {config.name}
                    </Typography>
                    {isPlaced && (
                      <Typography variant="caption" color="success.main" sx={{ display: 'block', mt: 0.5 }}>
                        已放置
                      </Typography>
                    )}
                  </Card>
                </Grid>
              );
            })}
          </Grid>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            💡 提示：长按组件并拖拽到预览区域的任意位置进行自由布局。灰色组件需要先在下方开启显示。
          </Typography>
        </Paper>

        {/* 组件开关设置 */}
        <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #eee' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <Typography variant="subtitle1">组件显示设置</Typography>
            <Tooltip title="控制哪些组件可以在工具栏中显示">
              <IconButton size="small" sx={{ ml: 1 }}>
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>

          <Grid container spacing={2}>
            {Object.entries(componentConfig).map(([componentId, config]) => (
              <Grid item xs={12} sm={6} key={componentId}>
                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={topToolbar[config.key as keyof typeof topToolbar] as boolean}
                      onChange={(e) => handleComponentToggle(componentId, e.target.checked)}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {config.icon}
                      <Typography variant="body2">{config.name}</Typography>
                    </Box>
                  }
                />
              </Grid>
            ))}
          </Grid>
        </Paper>

        {/* 模型选择器样式设置 */}
        {topToolbar.showModelSelector && (
          <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid #eee' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Typography variant="subtitle1">模型选择器样式</Typography>
              <Tooltip title="选择模型选择器的显示样式">
                <IconButton size="small" sx={{ ml: 1 }}>
                  <InfoIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>

            <FormGroup row>
              <FormControlLabel
                control={
                  <Switch
                    size="small"
                    checked={topToolbar.modelSelectorStyle === 'full'}
                    onChange={(e) => {
                      dispatch(updateSettings({
                        topToolbar: {
                          ...topToolbar,
                          modelSelectorStyle: e.target.checked ? 'full' : 'icon'
                        }
                      }));
                    }}
                  />
                }
                label={topToolbar.modelSelectorStyle === 'full' ? '完整显示' : '图标模式'}
              />
            </FormGroup>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              图标模式可以节省空间，适合小屏设备使用。
            </Typography>
          </Paper>
        )}

        {/* 使用说明 */}
        <Paper elevation={0} sx={{ p: 2, border: '1px solid #eee', bgcolor: 'info.light' }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            🎨 DIY 布局使用说明
          </Typography>
          <Box component="ul" sx={{ pl: 2, m: 0 }}>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              首先在"组件显示设置"中开启需要的组件
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              长按"可用组件"中的组件并拖拽到预览区域
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              可以将组件放置在工具栏的任意位置
            </Typography>
            <Typography component="li" variant="body2" sx={{ mb: 0.5 }}>
              点击"重置布局"可以清除所有自定义位置
            </Typography>
            <Typography component="li" variant="body2">
              设置会实时保存并应用到聊天页面
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default TopToolbarDIYSettings;
