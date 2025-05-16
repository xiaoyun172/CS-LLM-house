import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  FormGroup,
  FormControlLabel,
  Checkbox,
  Box,
  Divider
} from '@mui/material';
import type { CustomBackupOptions } from '../../utils/customBackupUtils';

interface CustomBackupDialogProps {
  open: boolean;
  options: CustomBackupOptions;
  isLoading: boolean;
  onClose: () => void;
  onOptionChange: (option: keyof CustomBackupOptions) => void;
  onBackup: () => void;
}

/**
 * 自定义备份对话框组件
 */
const CustomBackupDialog: React.FC<CustomBackupDialogProps> = ({
  open,
  options,
  isLoading,
  onClose,
  onOptionChange,
  onBackup
}) => {
  const isAnyOptionSelected = Object.values(options).some(value => value);
  
  return (
    <Dialog 
      open={open} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        自定义选择性备份
      </DialogTitle>
      <DialogContent dividers>
        <Typography variant="body2" color="text.secondary" paragraph>
          选择需要备份的内容：
        </Typography>
        
        <FormGroup>
          <FormControlLabel
            control={
              <Checkbox 
                checked={options.topics} 
                onChange={() => onOptionChange('topics')}
                sx={{ color: "#9333EA", "&.Mui-checked": { color: "#9333EA" } }}
              />
            }
            label="对话历史记录"
          />
          
          <FormControlLabel
            control={
              <Checkbox 
                checked={options.assistants} 
                onChange={() => onOptionChange('assistants')}
                sx={{ color: "#9333EA", "&.Mui-checked": { color: "#9333EA" } }}
              />
            }
            label="自定义助手"
          />
          
          <Divider sx={{ my: 1.5 }} />
          
          <FormControlLabel
            control={
              <Checkbox 
                checked={options.settings} 
                onChange={() => onOptionChange('settings')}
                sx={{ color: "#9333EA", "&.Mui-checked": { color: "#9333EA" } }}
              />
            }
            label="所有设置"
          />
          
          {!options.settings && (
            <Box sx={{ pl: 4 }}>
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={options.modelSettings} 
                    onChange={() => onOptionChange('modelSettings')}
                    sx={{ color: "#9333EA", "&.Mui-checked": { color: "#9333EA" } }}
                    disabled={options.settings}
                  />
                }
                label="模型和供应商设置"
              />
              
              <FormControlLabel
                control={
                  <Checkbox 
                    checked={options.uiSettings} 
                    onChange={() => onOptionChange('uiSettings')}
                    sx={{ color: "#9333EA", "&.Mui-checked": { color: "#9333EA" } }}
                    disabled={options.settings}
                  />
                }
                label="界面和行为设置"
              />
            </Box>
          )}
          
          <Divider sx={{ my: 1.5 }} />
          
          <FormControlLabel
            control={
              <Checkbox 
                checked={options.backupSettings} 
                onChange={() => onOptionChange('backupSettings')}
                sx={{ color: "#9333EA", "&.Mui-checked": { color: "#9333EA" } }}
              />
            }
            label="备份设置"
          />
          
          <FormControlLabel
            control={
              <Checkbox 
                checked={options.otherData} 
                onChange={() => onOptionChange('otherData')}
                sx={{ color: "#9333EA", "&.Mui-checked": { color: "#9333EA" } }}
              />
            }
            label="其他应用数据"
          />
        </FormGroup>
      </DialogContent>
      <DialogActions>
        <Button 
          onClick={onClose} 
          color="inherit"
        >
          取消
        </Button>
        <Button 
          onClick={onBackup} 
          variant="contained" 
          sx={{ bgcolor: "#9333EA", "&:hover": { bgcolor: "#8324DB" } }}
          disabled={isLoading || !isAnyOptionSelected}
        >
          创建备份
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default CustomBackupDialog; 