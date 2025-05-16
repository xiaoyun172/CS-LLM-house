import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import BackupRestoreSection from './BackupRestoreSection';

/**
 * 数据设置页面
 * 包含数据备份和恢复功能
 */
const DataSettings: React.FC = () => {
  return (
    <Container
      maxWidth="md"
        sx={{
        height: '100%',
        overflow: 'auto',
        pb: 8 // 添加底部填充，确保内容完全可滚动
      }}
    >
      <Box sx={{ py: 3 }}>
        <Typography variant="h5" gutterBottom>
          数据管理
          </Typography>

        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
          管理应用数据，包括备份和恢复功能
        </Typography>

        <BackupRestoreSection />
      </Box>
    </Container>
  );
};

export default DataSettings;