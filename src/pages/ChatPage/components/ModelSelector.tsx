import React from 'react';
import { Button, Menu, MenuItem, Box, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';

// 定义组件props类型
interface ModelSelectorProps {
  selectedModel: any;
  availableModels: any[];
  handleModelSelect: (model: any) => void;
  handleMenuClick: (event: React.MouseEvent<HTMLElement>) => void;
  handleMenuClose: () => void;
  menuOpen: boolean;
}

// 导出ModelSelector组件
export const ModelSelector: React.FC<ModelSelectorProps> = (props) => {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', mr: 1 }}>
      <Button
        id="model-button"
        aria-controls={props.menuOpen ? 'model-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={props.menuOpen ? 'true' : undefined}
        onClick={props.handleMenuClick}
        endIcon={<KeyboardArrowDownIcon />}
        sx={{
          textTransform: 'none',
          color: 'text.primary',
          '&:hover': {
            backgroundColor: 'rgba(0, 0, 0, 0.04)',
          },
        }}
      >
        <Typography variant="body2" noWrap>
          {props.selectedModel ? props.selectedModel.name : '选择模型'}
        </Typography>
      </Button>
      <Menu
        id="model-menu"
        anchorEl={document.getElementById('model-button')}
        open={props.menuOpen}
        onClose={props.handleMenuClose}
        MenuListProps={{
          'aria-labelledby': 'model-button',
        }}
      >
        {props.availableModels.map((model) => (
          <MenuItem
            key={model.id}
            onClick={() => {
              props.handleModelSelect(model);
              props.handleMenuClose();
            }}
            selected={props.selectedModel ? props.selectedModel.id === model.id : false}
          >
            <Typography variant="body2">{model.name}</Typography>
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
}; 