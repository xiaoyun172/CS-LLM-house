import React, { useState } from 'react';
import { 
  Box, 
  Tabs, 
  Tab, 
  Typography, 
  Paper, 
  Chip, 
  IconButton, 
  Collapse,
  useTheme
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import GridViewIcon from '@mui/icons-material/GridView';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import type { MultiModelMessageBlock } from '../../shared/types/newMessage.ts';
import { MessageBlockStatus } from '../../shared/types/newMessage.ts';
import Markdown from './Markdown';

interface MultiModelBlockProps {
  block: MultiModelMessageBlock;
}

/**
 * 多模型响应块组件
 */
const MultiModelBlock: React.FC<MultiModelBlockProps> = ({ block }) => {
  const theme = useTheme();
  const [selectedModel, setSelectedModel] = useState(0);
  const [displayMode, setDisplayMode] = useState<'tabs' | 'grid'>(
    block.displayStyle === 'grid' ? 'grid' : 'tabs'
  );
  const [expandedModels, setExpandedModels] = useState<Record<string, boolean>>(
    block.responses.reduce((acc, response) => {
      acc[response.modelId] = block.displayStyle !== 'fold';
      return acc;
    }, {} as Record<string, boolean>)
  );

  // 切换选中的模型
  const handleChangeModel = (_event: React.SyntheticEvent, newValue: number) => {
    setSelectedModel(newValue);
  };

  // 切换显示模式
  const toggleDisplayMode = () => {
    setDisplayMode(prev => prev === 'tabs' ? 'grid' : 'tabs');
  };

  // 切换展开/折叠状态
  const toggleExpand = (modelId: string) => {
    setExpandedModels(prev => ({
      ...prev,
      [modelId]: !prev[modelId]
    }));
  };

  // 渲染标签页模式
  const renderTabMode = () => (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs 
          value={selectedModel} 
          onChange={handleChangeModel}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            '& .MuiTabs-indicator': {
              backgroundColor: theme.palette.primary.main,
            },
          }}
        >
          {block.responses.map((response) => (
            <Tab 
              key={response.modelId}
              label={response.modelName}
              sx={{ 
                fontSize: '0.8rem',
                minHeight: 'auto',
                py: 0.5
              }}
            />
          ))}
        </Tabs>
      </Box>

      {block.responses.map((response, index) => (
        <Box
          key={response.modelId}
          role="tabpanel"
          hidden={selectedModel !== index}
          sx={{ pt: 2, pb: 1 }}
        >
          {selectedModel === index && (
            <Markdown content={response.content} allowHtml={false} />
          )}
        </Box>
      ))}
    </Box>
  );

  // 渲染网格模式
  const renderGridMode = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {block.responses.map((response) => (
        <Paper 
          key={response.modelId}
          elevation={0}
          sx={{ 
            p: 2,
            backgroundColor: theme.palette.mode === 'dark' 
              ? 'rgba(255, 255, 255, 0.05)' 
              : 'rgba(0, 0, 0, 0.02)',
            borderRadius: '8px',
            position: 'relative'
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 500 }}>
                {response.modelName}
              </Typography>
              {response.status === MessageBlockStatus.PROCESSING && (
                <Chip 
                  label="处理中" 
                  size="small" 
                  color="primary" 
                  variant="outlined" 
                  sx={{ ml: 1, height: 20 }}
                />
              )}
              {response.status === MessageBlockStatus.ERROR && (
                <Chip 
                  label="错误" 
                  size="small" 
                  color="error" 
                  variant="outlined" 
                  sx={{ ml: 1, height: 20 }}
                />
              )}
            </Box>
            
            <IconButton 
              size="small" 
              onClick={() => toggleExpand(response.modelId)}
              sx={{ p: 0.5 }}
            >
              {expandedModels[response.modelId] ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
            </IconButton>
          </Box>
          
          <Collapse in={expandedModels[response.modelId]}>
            <Markdown content={response.content} allowHtml={false} />
          </Collapse>
        </Paper>
      ))}
    </Box>
  );

  return (
    <Box sx={{ marginY: 2 }}>
      <Box 
        sx={{ 
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 1
        }}
      >
        <Typography variant="caption" sx={{ color: theme.palette.primary.main }}>
          多模型响应 ({block.responses.length})
        </Typography>
        <IconButton 
          size="small" 
          onClick={toggleDisplayMode}
          sx={{ p: 0.5 }}
        >
          {displayMode === 'tabs' ? <GridViewIcon fontSize="small" /> : <ViewAgendaIcon fontSize="small" />}
        </IconButton>
      </Box>

      {displayMode === 'tabs' ? renderTabMode() : renderGridMode()}
    </Box>
  );
};

export default MultiModelBlock; 