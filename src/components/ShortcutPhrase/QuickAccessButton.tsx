/**
 * 快捷短语快速访问按钮
 */

import React, { useState } from 'react';
import {
  IconButton,
  Menu,
  MenuItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Typography,
  Box,
  Chip,
  Tooltip
} from '@mui/material';
import ChatBubbleIcon from '@mui/icons-material/ChatBubble';
import FavoriteIcon from '@mui/icons-material/Favorite';
import SettingsIcon from '@mui/icons-material/Settings';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import FolderIcon from '@mui/icons-material/Folder';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { useAppSelector } from '../../shared/store';
import {
  selectCategories,
  selectFavoritePhrases
} from '../../shared/store/slices/shortcutLanguageSlice';
import { shortcutLanguageService } from '../../shared/services/ShortcutLanguageService';
import { useNavigate } from 'react-router-dom';

interface QuickAccessButtonProps {
  /** 按钮大小 */
  size?: 'small' | 'medium' | 'large';
  /** 按钮颜色 */
  color?: string;
  /** 是否显示标签 */
  showLabel?: boolean;
  /** 最大显示短语数量 */
  maxPhrases?: number;
}

const QuickAccessButton: React.FC<QuickAccessButtonProps> = ({
  size = 'medium',
  color = '#2196F3',
  showLabel = false,
  maxPhrases = 8
}) => {
  const navigate = useNavigate();

  // Redux状态
  const categories = useAppSelector(selectCategories);
  const favoritePhrases = useAppSelector(selectFavoritePhrases);

  // 本地状态
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [currentView, setCurrentView] = useState<'main' | 'category'>('main');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const open = Boolean(anchorEl);

  // 获取最近使用的短语
  const getRecentPhrases = () => {
    const allPhrases = shortcutLanguageService.getAllPhrases();
    return allPhrases
      .filter(phrase => phrase.lastUsedAt)
      .sort((a, b) => new Date(b.lastUsedAt!).getTime() - new Date(a.lastUsedAt!).getTime())
      .slice(0, maxPhrases);
  };

  // 获取最常用的短语
  const getPopularPhrases = () => {
    const allPhrases = shortcutLanguageService.getAllPhrases();
    return allPhrases
      .filter(phrase => phrase.usageCount > 0)
      .sort((a, b) => b.usageCount - a.usageCount)
      .slice(0, maxPhrases);
  };

  // 获取推荐短语（当其他类别为空时显示）
  const getRecommendedPhrases = () => {
    const allPhrases = shortcutLanguageService.getAllPhrases();
    return allPhrases
      .sort((a, b) => a.name.localeCompare(b.name)) // 按名称排序
      .slice(0, Math.min(5, maxPhrases)); // 最多显示5个
  };

  // 获取指定分类的短语
  const getCategoryPhrases = (categoryId: string) => {
    const allPhrases = shortcutLanguageService.getAllPhrases();
    return allPhrases
      .filter(phrase => phrase.categoryId === categoryId)
      .sort((a, b) => a.name.localeCompare(b.name));
  };

  // 获取分类统计信息
  const getCategoryStats = (categoryId: string) => {
    const phrases = getCategoryPhrases(categoryId);
    return {
      total: phrases.length,
      used: phrases.filter(p => p.usageCount > 0).length
    };
  };

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
    setCurrentView('main');
    setSelectedCategoryId(null);
  };

  const handlePhraseClick = async (phraseId: string) => {
    try {
      console.log('[QuickAccessButton] 点击短语:', phraseId);
      const phrase = shortcutLanguageService.getAllPhrases().find(p => p.id === phraseId);
      console.log('[QuickAccessButton] 找到短语:', phrase);
      await shortcutLanguageService.usePhrase(phraseId);
      console.log('[QuickAccessButton] 短语使用完成');
      handleClose();
    } catch (error) {
      console.error('使用短语失败:', error);
    }
  };

  const handleOpenSettings = () => {
    navigate('/settings/shortcut-language');
    handleClose();
  };

  const handleCategoryClick = (categoryId: string) => {
    setSelectedCategoryId(categoryId);
    setCurrentView('category');
  };

  const handleBackToMain = () => {
    setCurrentView('main');
    setSelectedCategoryId(null);
  };

  const getCategoryName = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : '未知分类';
  };

  const getCategoryIcon = (categoryId: string) => {
    const category = categories.find(c => c.id === categoryId);
    return category?.icon || '📝';
  };

  const recentPhrases = getRecentPhrases();
  const popularPhrases = getPopularPhrases();
  const recommendedPhrases = getRecommendedPhrases();

  // 判断是否需要显示推荐短语
  const hasAnyPhrases = favoritePhrases.length > 0 || recentPhrases.length > 0 || popularPhrases.length > 0;
  const shouldShowRecommended = !hasAnyPhrases && recommendedPhrases.length > 0;

  return (
    <>
      <Tooltip title={showLabel ? '' : '快捷短语'}>
        <IconButton
          onClick={handleClick}
          size={size}
          sx={{
            color: color,
            backgroundColor: open ? `${color}20` : 'transparent',
            '&:hover': {
              backgroundColor: `${color}20`,
            }
          }}
        >
          <ChatBubbleIcon />
        </IconButton>
      </Tooltip>

      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        PaperProps={{
          sx: {
            maxWidth: 320,
            minWidth: 280,
            maxHeight: 400,
            overflow: 'auto'
          }
        }}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
      >
        {/* 标题栏 */}
        <Box sx={{ px: 2, py: 1, borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 1 }}>
          {currentView === 'category' && (
            <IconButton
              size="small"
              onClick={handleBackToMain}
              sx={{ p: 0.5 }}
            >
              <ArrowBackIcon fontSize="small" />
            </IconButton>
          )}
          <Typography variant="subtitle2" fontWeight="bold" sx={{ flexGrow: 1 }}>
            {currentView === 'main' ? '快捷短语' : getCategoryName(selectedCategoryId!)}
          </Typography>
        </Box>

        {/* 主视图 */}
        {currentView === 'main' && (
          <>
            {/* 收藏短语 */}
            {favoritePhrases.length > 0 && (
          <>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <FavoriteIcon sx={{ fontSize: 14, color: 'error.main' }} />
                收藏短语
              </Typography>
            </Box>
            {favoritePhrases.slice(0, 3).map((phrase) => (
              <MenuItem
                key={phrase.id}
                onClick={() => handlePhraseClick(phrase.id)}
                sx={{ px: 2, py: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Box sx={{ fontSize: 16 }}>
                    {getCategoryIcon(phrase.categoryId)}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={phrase.name}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        label={getCategoryName(phrase.categoryId)}
                        size="small"
                        variant="outlined"
                        sx={{ height: 16, fontSize: 10 }}
                      />
                      {phrase.usageCount > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          使用 {phrase.usageCount} 次
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </MenuItem>
            ))}
            <Divider />
          </>
        )}

        {/* 最近使用 */}
        {recentPhrases.length > 0 && (
          <>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                最近使用
              </Typography>
            </Box>
            {recentPhrases.slice(0, 3).map((phrase) => (
              <MenuItem
                key={phrase.id}
                onClick={() => handlePhraseClick(phrase.id)}
                sx={{ px: 2, py: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Box sx={{ fontSize: 16 }}>
                    {getCategoryIcon(phrase.categoryId)}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={phrase.name}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        label={getCategoryName(phrase.categoryId)}
                        size="small"
                        variant="outlined"
                        sx={{ height: 16, fontSize: 10 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {new Date(phrase.lastUsedAt!).toLocaleDateString()}
                      </Typography>
                    </Box>
                  }
                />
              </MenuItem>
            ))}
            <Divider />
          </>
        )}

        {/* 热门短语 */}
        {popularPhrases.length > 0 && (
          <>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                热门短语
              </Typography>
            </Box>
            {popularPhrases.slice(0, 2).map((phrase) => (
              <MenuItem
                key={phrase.id}
                onClick={() => handlePhraseClick(phrase.id)}
                sx={{ px: 2, py: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Box sx={{ fontSize: 16 }}>
                    {getCategoryIcon(phrase.categoryId)}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={phrase.name}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        label={getCategoryName(phrase.categoryId)}
                        size="small"
                        variant="outlined"
                        sx={{ height: 16, fontSize: 10 }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        使用 {phrase.usageCount} 次
                      </Typography>
                    </Box>
                  }
                />
              </MenuItem>
            ))}
            <Divider />
          </>
        )}

        {/* 推荐短语 */}
        {shouldShowRecommended && (
          <>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                推荐短语
              </Typography>
            </Box>
            {recommendedPhrases.map((phrase) => (
              <MenuItem
                key={phrase.id}
                onClick={() => handlePhraseClick(phrase.id)}
                sx={{ px: 2, py: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Box sx={{ fontSize: 16 }}>
                    {getCategoryIcon(phrase.categoryId)}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={phrase.name}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip
                        label={getCategoryName(phrase.categoryId)}
                        size="small"
                        variant="outlined"
                        sx={{ height: 16, fontSize: 10 }}
                      />
                    </Box>
                  }
                />
              </MenuItem>
            ))}
            <Divider />
          </>
        )}

            {/* 分类浏览 */}
            {categories.length > 0 && (
              <>
                <Box sx={{ px: 2, py: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    按分类浏览
                  </Typography>
                </Box>
                {categories.map((category) => {
                  const stats = getCategoryStats(category.id);
                  return (
                    <MenuItem
                      key={category.id}
                      onClick={() => handleCategoryClick(category.id)}
                      sx={{ px: 2, py: 1 }}
                    >
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <Box sx={{ fontSize: 16 }}>
                          {category.icon || <FolderIcon />}
                        </Box>
                      </ListItemIcon>
                      <ListItemText
                        primary={category.name}
                        secondary={
                          <Typography variant="caption" color="text.secondary">
                            {stats.total} 个短语
                            {stats.used > 0 && ` · ${stats.used} 个已使用`}
                          </Typography>
                        }
                      />
                      <ChevronRightIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                    </MenuItem>
                  );
                })}
                <Divider />
              </>
            )}

            {/* 设置入口 */}
            <MenuItem onClick={handleOpenSettings} sx={{ px: 2, py: 1.5 }}>
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="管理短语" />
            </MenuItem>

            {/* 空状态 */}
            {!hasAnyPhrases && !shouldShowRecommended && (
              <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  暂无快捷短语
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  点击"管理短语"开始创建
                </Typography>
              </Box>
            )}
          </>
        )}

        {/* 分类视图 */}
        {currentView === 'category' && selectedCategoryId && (
          <>
            {getCategoryPhrases(selectedCategoryId).map((phrase) => (
              <MenuItem
                key={phrase.id}
                onClick={() => handlePhraseClick(phrase.id)}
                sx={{ px: 2, py: 1 }}
              >
                <ListItemIcon sx={{ minWidth: 32 }}>
                  <Box sx={{ fontSize: 16 }}>
                    {getCategoryIcon(phrase.categoryId)}
                  </Box>
                </ListItemIcon>
                <ListItemText
                  primary={phrase.name}
                  secondary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      {phrase.description && (
                        <Typography variant="caption" color="text.secondary" sx={{ flexGrow: 1 }}>
                          {phrase.description}
                        </Typography>
                      )}
                      {phrase.usageCount > 0 && (
                        <Typography variant="caption" color="text.secondary">
                          使用 {phrase.usageCount} 次
                        </Typography>
                      )}
                    </Box>
                  }
                />
              </MenuItem>
            ))}

            {getCategoryPhrases(selectedCategoryId).length === 0 && (
              <Box sx={{ px: 2, py: 3, textAlign: 'center' }}>
                <Typography variant="body2" color="text.secondary">
                  该分类暂无短语
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  点击"管理短语"添加新短语
                </Typography>
              </Box>
            )}
          </>
        )}
      </Menu>
    </>
  );
};

export default QuickAccessButton;
