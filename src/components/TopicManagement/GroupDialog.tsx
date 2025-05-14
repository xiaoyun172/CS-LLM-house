import { useState } from 'react';
import { 
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button
} from '@mui/material';
import { useDispatch } from 'react-redux';
import { createGroup } from '../../shared/store/slices/groupsSlice';

interface GroupDialogProps {
  open: boolean;
  onClose: () => void;
  type: 'assistant' | 'topic';
  title?: string;
}

export default function GroupDialog({ open, onClose, type, title = '添加分组' }: GroupDialogProps) {
  const dispatch = useDispatch();
  const [groupName, setGroupName] = useState('');
  const [error, setError] = useState('');
  
  const handleClose = () => {
    setGroupName('');
    setError('');
    onClose();
  };
  
  const handleSubmit = () => {
    if (!groupName.trim()) {
      setError('分组名称不能为空');
      return;
    }
    
    // 创建新分组
    dispatch(createGroup({ 
      name: groupName.trim(), 
      type 
    }));
    
    handleClose();
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };
  
  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      fullWidth
      maxWidth="xs"
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          margin="dense"
          label={`${type === 'assistant' ? '助手' : '话题'}分组名称`}
          type="text"
          fullWidth
          variant="outlined"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          onKeyDown={handleKeyDown}
          error={!!error}
          helperText={error}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>取消</Button>
        <Button 
          onClick={handleSubmit} 
          variant="contained" 
          disableElevation
        >
          确定
        </Button>
      </DialogActions>
    </Dialog>
  );
} 