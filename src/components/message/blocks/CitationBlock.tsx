import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  Collapse,
  IconButton,
  Link,
  useTheme,
  Chip,
  Tabs,
  Tab
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LinkIcon from '@mui/icons-material/Link';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import NewspaperIcon from '@mui/icons-material/Newspaper';
import BookIcon from '@mui/icons-material/Book';
import PublicIcon from '@mui/icons-material/Public';
import PeopleIcon from '@mui/icons-material/People';
import RssFeedIcon from '@mui/icons-material/RssFeed';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import { styled } from '@mui/material/styles';
import { useDeepMemo } from '../../../hooks/useMemoization';
import { MessageBlockStatus } from '../../../shared/types/newMessage';
import type { CitationMessageBlock } from '../../../shared/types/newMessage';
import Markdown from '../Markdown';
import { EventEmitter } from '../../../shared/services/EventService';

// 扩展CitationMessageBlock类型，添加citations属性
interface ExtendedCitationBlock extends CitationMessageBlock {
  citations?: Array<{
    number: number;
    url: string;
    title: string;
    hostname: string;
    content: string;
    showFavicon: boolean;
    type: string;
    category?: string;
    metadata?: {
      provider?: string;
      timestamp?: string;
      category?: string;
    }
  }>
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  backgroundColor: theme.palette.mode === 'dark'
    ? 'rgba(20, 30, 45, 0.7)'
    : 'rgba(245, 248, 255, 0.7)',
}));

interface Props {
  block: ExtendedCitationBlock;
}

/**
 * 引用块组件
 * 显示引用的内容和来源
 */
const CitationBlock: React.FC<Props> = ({ block }) => {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const theme = useTheme();
  const [activeTab, setActiveTab] = useState('all');

  // 使用记忆化的block内容，避免不必要的重渲染
  const memoizedContent = useDeepMemo(() => block.content, [block.content]);
  const memoizedSources = useDeepMemo(() => block.sources, [block.sources]);
  const memoizedCitations = useDeepMemo(() => block.citations, [block.citations]);

  const isProcessing = block.status === MessageBlockStatus.STREAMING ||
                       block.status === MessageBlockStatus.PROCESSING;

  // 判断是否为网络搜索结果
  const isWebSearch = useMemo(() => {
    if (block.source === 'web_search' || 
        (memoizedCitations && memoizedCitations.some((citation) => citation.type === 'websearch'))) {
      return true;
    }
    return false;
  }, [block.source, memoizedCitations]);

  // 获取分类
  const categories = useMemo(() => {
    if (!memoizedCitations || !isWebSearch) return {};
    
    const categorized: Record<string, any[]> = {};
    memoizedCitations.forEach((citation) => {
      const category = citation.category || citation.metadata?.category || '其他';
      if (!categorized[category]) {
        categorized[category] = [];
      }
      categorized[category].push(citation);
    });
    
    return categorized;
  }, [memoizedCitations, isWebSearch]);
  
  // 获取分类列表
  const categoryList = useMemo(() => {
    return Object.keys(categories).sort((a, b) => {
      const order = ['新闻', '百科', '官方网站', '社交媒体', '博客', '其他'];
      return order.indexOf(a) - order.indexOf(b);
    });
  }, [categories]);
  
  // 根据当前选择的分类过滤引用
  const filteredCitations = useMemo(() => {
    if (!memoizedCitations) return [];
    if (activeTab === 'all') return memoizedCitations;
    
    return memoizedCitations.filter((citation) => 
      (citation.category === activeTab) || (citation.metadata?.category === activeTab)
    );
  }, [memoizedCitations, activeTab]);

  // 如果没有引用内容，不渲染任何内容
  if (!block.citations && !block.sources || 
      (block.citations && block.citations.length === 0) && 
      (block.sources && block.sources.length === 0)) {
    return null;
  }

  // 复制引用内容到剪贴板
  const handleCopy = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发折叠/展开
    if (block.content) {
      navigator.clipboard.writeText(block.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      EventEmitter.emit('ui:copy_success', { content: '已复制引用内容' });
    }
  }, [block.content]);

  // 切换折叠/展开状态
  const toggleExpanded = useCallback(() => {
    setExpanded(!expanded);
  }, [expanded]);

  // 打开链接
  const handleOpenLink = useCallback((url: string, e: React.MouseEvent) => {
    e.stopPropagation(); // 防止触发折叠/展开
    window.open(url, '_blank', 'noopener,noreferrer');
  }, []);

  // 获取引用类型名称
  const getCitationType = useCallback(() => {
    if (block.source === 'web_search' || isWebSearch) {
      return '网络搜索';
    } else if (block.source === 'knowledge_base') {
      return '知识库';
    } else if (block.source === 'document') {
      return '文档';
    }
    return '引用';
  }, [block.source, isWebSearch]);

  // 格式化来源URL，确保以http或https开头
  const formatUrl = useCallback((url?: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    return `https://${url}`;
  }, []);
  
  // 获取分类图标
  const getCategoryIcon = useCallback((category: string) => {
    switch(category) {
      case '新闻':
        return <NewspaperIcon sx={{ fontSize: '1rem', mr: 0.5 }} />;
      case '百科':
        return <BookIcon sx={{ fontSize: '1rem', mr: 0.5 }} />;
      case '官方网站':
        return <PublicIcon sx={{ fontSize: '1rem', mr: 0.5 }} />;
      case '社交媒体':
        return <PeopleIcon sx={{ fontSize: '1rem', mr: 0.5 }} />;
      case '博客':
        return <RssFeedIcon sx={{ fontSize: '1rem', mr: 0.5 }} />;
      case '其他':
      default:
        return <MoreHorizIcon sx={{ fontSize: '1rem', mr: 0.5 }} />;
    }
  }, []);

  // 处理分类切换
  const handleTabChange = useCallback((_event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
  }, []);

  return (
    <StyledPaper
      elevation={0}
      sx={{
        mb: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      {/* 标题栏 */}
      <Box
        onClick={toggleExpanded}
        sx={{
          display: 'flex',
          alignItems: 'center',
          p: 1.5,
          cursor: 'pointer',
          borderBottom: expanded ? `1px solid ${theme.palette.divider}` : 'none',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark'
              ? 'rgba(255, 255, 255, 0.05)'
              : 'rgba(0, 0, 0, 0.02)',
          }
        }}
      >
        <LinkIcon
          sx={{
            mr: 1,
            color: theme.palette.primary.main
          }}
        />

        <Typography variant="subtitle2" sx={{ flexGrow: 1 }}>
          {getCitationType()}
          {isWebSearch && filteredCitations.length > 0 && (
            <Chip
              label={filteredCitations.length}
              size="small"
              color="primary"
              variant="outlined"
              sx={{ ml: 1, height: 20 }}
            />
          )}
          {isProcessing && (
            <Chip
              label="加载中"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ ml: 1, height: 20 }}
            />
          )}
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton
            size="small"
            onClick={handleCopy}
            sx={{ mr: 1 }}
            color={copied ? "success" : "default"}
          >
            <ContentCopyIcon fontSize="small" />
          </IconButton>

          <ExpandMoreIcon
            sx={{
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s'
            }}
          />
        </Box>
      </Box>

      {/* 内容区域 */}
      <Collapse in={expanded}>
        <Box sx={{ p: 2 }}>
          {isWebSearch && categoryList.length > 0 ? (
            <Box sx={{ width: '100%' }}>
              {/* 分类标签页 */}
              <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Tabs 
                  value={activeTab} 
                  onChange={handleTabChange}
                  variant="scrollable"
                  scrollButtons="auto"
                  sx={{ minHeight: '36px' }}
                >
                  <Tab 
                    label="全部" 
                    value="all"
                    sx={{ 
                      minHeight: '36px',
                      py: 0.5,
                      textTransform: 'none',
                      fontWeight: activeTab === 'all' ? 600 : 400
                    }} 
                  />
                  {categoryList.map((category) => (
                    <Tab
                      key={category}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                          {getCategoryIcon(category)}
                          {category}
                          <Chip
                            label={categories[category].length}
                            size="small"
                            sx={{ 
                              ml: 0.5, 
                              height: 16, 
                              fontSize: '0.65rem',
                              '& .MuiChip-label': { px: 0.5 } 
                            }}
                          />
                        </Box>
                      }
                      value={category}
                      sx={{ 
                        minHeight: '36px',
                        py: 0.5,
                        textTransform: 'none',
                        fontWeight: activeTab === category ? 600 : 400
                      }}
                    />
                  ))}
                </Tabs>
              </Box>
              
              {/* 引用列表 */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {filteredCitations.map((citation, index) => {
                  const category = citation.category || citation.metadata?.category || '其他';
                  return (
                    <Paper
                      key={`citation-${index}`}
                      elevation={0}
                      sx={{
                        p: 1.5,
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: theme.palette.mode === 'dark' 
                          ? 'rgba(30, 40, 55, 0.7)'
                          : 'rgba(255, 255, 255, 0.9)',
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        '&:hover': {
                          boxShadow: theme.palette.mode === 'dark' 
                            ? '0 4px 8px rgba(0, 0, 0, 0.3)' 
                            : '0 4px 8px rgba(0, 0, 0, 0.1)',
                          transform: 'translateY(-2px)'
                        }
                      }}
                    >
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <Box sx={{ flex: 1 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                            <Chip
                              label={category}
                              size="small"
                              color="primary"
                              variant="outlined"
                              icon={getCategoryIcon(category)}
                              sx={{ height: 20, mr: 1, backgroundColor: theme.palette.mode === 'dark' ? 'rgba(25, 118, 210, 0.1)' : 'rgba(25, 118, 210, 0.05)' }}
                            />
                            <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                              {new URL(citation.url).hostname}
                            </Typography>
                          </Box>
                          
                          <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                            {citation.title || '未知标题'}
                          </Typography>
                          {citation.url && (
                            <Link
                              href="#"
                              onClick={(e) => handleOpenLink(formatUrl(citation.url), e)}
                              color="primary"
                              sx={{
                                fontSize: '0.8rem',
                                display: 'flex',
                                alignItems: 'center',
                                width: 'fit-content'
                              }}
                            >
                              {citation.url.length > 50 ? `${citation.url.substring(0, 50)}...` : citation.url}
                              <OpenInNewIcon sx={{ ml: 0.5, fontSize: '0.9rem' }} />
                            </Link>
                          )}
                        </Box>
                        <Chip
                          label={`#${citation.number}`}
                          size="small"
                          sx={{ height: 20, minWidth: 30 }}
                        />
                      </Box>
                      {citation.content && (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            mt: 1,
                            fontSize: '0.85rem',
                            display: '-webkit-box',
                            WebkitLineClamp: 3,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}
                        >
                          {citation.content}
                        </Typography>
                      )}
                    </Paper>
                  );
                })}
              </Box>
            </Box>
          ) : (
            <Box>
              <Box sx={{ mb: 2 }}>
                {block.content && <Markdown content={memoizedContent} />}
              </Box>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {memoizedSources?.map((source, index) => (
                  <Paper
                    key={`source-${index}`}
                    elevation={0}
                    sx={{
                      p: 1.5,
                      borderRadius: '8px',
                      border: '1px solid',
                      borderColor: 'divider'
                    }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', mb: 0.5 }}>
                          {source.title || '未知标题'}
                        </Typography>
                        {source.url && (
                          <Link
                            href="#"
                            onClick={(e) => handleOpenLink(formatUrl(source.url), e)}
                            color="primary"
                            sx={{
                              fontSize: '0.8rem',
                              display: 'flex',
                              alignItems: 'center',
                              width: 'fit-content'
                            }}
                          >
                            {source.url.length > 50 ? `${source.url.substring(0, 50)}...` : source.url}
                            <OpenInNewIcon sx={{ ml: 0.5, fontSize: '0.9rem' }} />
                          </Link>
                        )}
                      </Box>
                    </Box>
                    {source.content && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{
                          mt: 1,
                          fontSize: '0.85rem',
                          display: '-webkit-box',
                          WebkitLineClamp: 3,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {source.content}
                      </Typography>
                    )}
                  </Paper>
                ))}
              </Box>
            </Box>
          )}
        </Box>
      </Collapse>
    </StyledPaper>
  );
};

export default CitationBlock;
