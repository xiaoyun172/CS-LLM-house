import React, { useState } from 'react';
import { Box, Typography, Paper, IconButton, Collapse, Chip } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import LinkIcon from '@mui/icons-material/Link';
import type { KnowledgeReferenceMessageBlock } from '../../../shared/types/newMessage';
import { styled } from '@mui/material/styles';

interface KnowledgeReferenceBlockProps {
  block: KnowledgeReferenceMessageBlock;
}

const StyledPaper = styled(Paper)(({ theme }) => ({
  padding: theme.spacing(2),
  marginBottom: theme.spacing(1),
  borderLeft: `4px solid ${theme.palette.primary.main}`,
  backgroundColor: theme.palette.background.paper,
  position: 'relative',
  '&:hover': {
    boxShadow: theme.shadows[2],
  }
}));

const SimilarityChip = styled(Chip)(({ theme }) => ({
  marginLeft: theme.spacing(1),
  fontSize: '0.75rem',
  height: 20,
}));

const KnowledgeReferenceBlock: React.FC<KnowledgeReferenceBlockProps> = ({ block }) => {
  const [expanded, setExpanded] = useState(false);

  const toggleExpanded = () => {
    setExpanded(!expanded);
  };

  const formatSimilarity = (similarity?: number) => {
    if (!similarity) return '匹配度未知';
    return `${Math.round(similarity * 100)}%`;
  };

  const sourceLabel = block.source || (block.metadata?.fileName || '知识库');

  const handleSourceClick = () => {
    // 如果有文件ID，可以打开文件
    if (block.metadata?.fileId) {
      // TODO: 实现文件打开功能
      console.log('打开文件:', block.metadata.fileId);
    }
  };

  return (
    <StyledPaper elevation={1}>
      {/* 显示来源和相似度 */}
      <Box display="flex" alignItems="center" mb={1}>
        <Typography variant="caption" color="textSecondary">
          引用自知识库
        </Typography>
        {block.similarity && (
          <SimilarityChip 
            size="small" 
            color={block.similarity > 0.8 ? "success" : "default"}
            label={formatSimilarity(block.similarity)} 
          />
        )}
        <Box flexGrow={1} />
        <IconButton size="small" onClick={toggleExpanded}>
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>

      {/* 显示内容摘要 */}
      <Typography variant="body1">{expanded ? block.content : `${block.content.slice(0, 150)}${block.content.length > 150 ? '...' : ''}`}</Typography>
      
      {/* 展开时显示的详细信息 */}
      <Collapse in={expanded}>
        <Box mt={2} p={1} bgcolor="rgba(0, 0, 0, 0.03)" borderRadius={1}>
          <Typography variant="caption" color="textSecondary" display="block" gutterBottom>
            来源文件: {sourceLabel}
          </Typography>
          {block.metadata?.searchQuery && (
            <Typography variant="caption" color="textSecondary" display="block">
              搜索查询: {block.metadata.searchQuery}
            </Typography>
          )}
        </Box>
      </Collapse>

      {/* 来源链接 */}
      {(block.metadata?.fileId || block.metadata?.fileName) && (
        <IconButton 
          size="small" 
          sx={{ position: 'absolute', bottom: 8, right: 8 }}
          onClick={handleSourceClick}
        >
          <LinkIcon fontSize="small" />
        </IconButton>
      )}
    </StyledPaper>
  );
};

export default React.memo(KnowledgeReferenceBlock); 