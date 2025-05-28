import React, { useState } from 'react';
import { Box, Typography, Paper, Link, IconButton, Chip, Collapse } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import type { SearchResult } from '../../../shared/types/search';
import { alpha } from '@mui/material/styles';

interface SearchResultBlockProps {
  query: string;
  results: SearchResult[];
  compact?: boolean;
}

/**
 * 搜索结果显示组件
 */
const SearchResultBlock: React.FC<SearchResultBlockProps> = ({ query, results, compact = false }) => {
  const [expanded, setExpanded] = useState(!compact);

  const handleExpandToggle = () => {
    setExpanded(!expanded);
  };

  if (!results || results.length === 0) {
    return (
      <Paper 
        elevation={0} 
        sx={{ 
          p: 2, 
          mb: 2,
          borderRadius: 2,
          border: '1px solid',
          borderColor: 'divider',
          bgcolor: (theme) => alpha(theme.palette.info.main, 0.05)
        }}
      >
        <Typography color="text.secondary">没有找到关于「{query}」的搜索结果。</Typography>
      </Paper>
    );
  }

  return (
    <Paper 
      elevation={0} 
      sx={{ 
        p: 2, 
        mb: 2,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: (theme) => alpha(theme.palette.info.main, 0.05)
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" fontWeight={600} color="primary.main">
            网络搜索结果
          </Typography>
          <Chip 
            label={results.length}
            size="small"
            sx={{ 
              ml: 1, 
              height: 20, 
              bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
              color: 'primary.main',
              fontWeight: 600
            }}
          />
        </Box>
        <IconButton size="small" onClick={handleExpandToggle}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      
      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
        搜索查询：{query}
      </Typography>
      
      <Collapse in={expanded}>
        {results.map((result, index) => (
          <Box 
            key={index} 
            sx={{ 
              mb: index < results.length - 1 ? 2 : 0,
              p: 1.5,
              borderRadius: 1,
              bgcolor: (theme) => alpha(theme.palette.background.paper, 0.7),
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
              <Typography 
                variant="subtitle2" 
                sx={{ 
                  fontWeight: 600,
                  color: 'primary.main',
                  mb: 0.5,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                  flexGrow: 1
                }}
              >
                {result.title}
              </Typography>
              <IconButton 
                size="small" 
                href={result.href}
                target="_blank"
                rel="noopener noreferrer"
                sx={{ 
                  ml: 1, 
                  color: 'primary.main',
                  bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                  '&:hover': {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.2),
                  }
                }}
              >
                <OpenInNewIcon fontSize="small" />
              </IconButton>
            </Box>
            
            <Typography 
              variant="body2" 
              color="text.secondary"
              sx={{
                mb: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical'
              }}
            >
              {result.body}
            </Typography>
            
            <Link 
              href={result.href}
              target="_blank"
              rel="noopener noreferrer"
              variant="caption"
              color="text.secondary"
              underline="hover"
              sx={{ 
                display: 'block', 
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {result.href}
            </Link>
          </Box>
        ))}
      </Collapse>
    </Paper>
  );
};

export default SearchResultBlock; 