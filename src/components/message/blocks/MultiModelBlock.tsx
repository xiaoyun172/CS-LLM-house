import React, { useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Paper,
  useTheme,
  Chip
} from '@mui/material';
import type { MultiModelMessageBlock } from '../../../shared/types/newMessage';
import { MessageBlockStatus } from '../../../shared/types/newMessage';
import Markdown from '../Markdown';

interface Props {
  block: MultiModelMessageBlock;
}

/**
 * 多模型响应块组件
 * 负责渲染多个模型的并行响应
 */
const MultiModelBlock: React.FC<Props> = ({ block }) => {
  const theme = useTheme();
  const [selectedTab, setSelectedTab] = useState(0);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setSelectedTab(newValue);
  };

  // 如果没有响应，不渲染任何内容
  if (!block.responses || block.responses.length === 0) {
    return null;
  }

  // 水平布局 - 标签页形式
  if (block.displayStyle === 'horizontal' || !block.displayStyle) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <Paper variant="outlined" sx={{ p: 1 }}>
          <Tabs
            value={selectedTab}
            onChange={handleTabChange}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}
          >
            {block.responses.map((response, index) => (
              <Tab
                key={index}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <Typography variant="body2">{response.modelName}</Typography>
                    {response.status === MessageBlockStatus.STREAMING && (
                      <Chip
                        label="生成中"
                        size="small"
                        color="primary"
                        variant="outlined"
                        sx={{ ml: 1, height: 20 }}
                      />
                    )}
                  </Box>
                }
              />
            ))}
          </Tabs>

          {block.responses.map((response, index) => (
            <Box
              key={index}
              role="tabpanel"
              hidden={selectedTab !== index}
              sx={{ p: 1 }}
            >
              {selectedTab === index && (
                <Markdown content={response.content} allowHtml={false} />
              )}
            </Box>
          ))}
        </Paper>
      </Box>
    );
  }

  // 网格布局
  if (block.displayStyle === 'grid') {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2 }}>
          {block.responses.map((response, index) => (
            <Paper
              key={index}
              variant="outlined"
              sx={{
                p: 2,
                height: '100%',
                position: 'relative'
              }}
              >
                <Typography
                  variant="subtitle2"
                  sx={{
                    mb: 1,
                    pb: 1,
                    borderBottom: `1px solid ${theme.palette.divider}`
                  }}
                >
                  {response.modelName}
                  {response.status === MessageBlockStatus.STREAMING && (
                    <Chip
                      label="生成中"
                      size="small"
                      color="primary"
                      variant="outlined"
                      sx={{ ml: 1, height: 20 }}
                    />
                  )}
                </Typography>
                <Markdown content={response.content} allowHtml={false} />
              </Paper>
          ))}
        </Box>
      </Box>
    );
  }

  // 垂直布局
  return (
    <Box sx={{ width: '100%', mt: 2 }}>
      {block.responses.map((response, index) => (
        <Paper
          key={index}
          variant="outlined"
          sx={{
            p: 2,
            mb: 2,
            position: 'relative'
          }}
        >
          <Typography
            variant="subtitle2"
            sx={{
              mb: 1,
              pb: 1,
              borderBottom: `1px solid ${theme.palette.divider}`
            }}
          >
            {response.modelName}
            {response.status === MessageBlockStatus.STREAMING && (
              <Chip
                label="生成中"
                size="small"
                color="primary"
                variant="outlined"
                sx={{ ml: 1, height: 20 }}
              />
            )}
          </Typography>
          <Markdown content={response.content} allowHtml={false} />
        </Paper>
      ))}
    </Box>
  );
};

export default React.memo(MultiModelBlock);
