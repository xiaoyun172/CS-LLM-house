import React from 'react';
import { Button, Menu, MenuItem, Box, Typography } from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import type { Model } from '../../../shared/types';

interface ModelSelectorProps {
  selectedModel: Model | null;
  availableModels: Model[];
  handleModelSelect: (model: Model) => void;
  handleModelMenuClick: (event: React.MouseEvent<HTMLElement>) => void;
  handleModelMenuClose: () => void;
  anchorEl: HTMLElement | null;
  menuOpen: boolean;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({
  selectedModel,
  availableModels,
  handleModelSelect,
  handleModelMenuClick,
  handleModelMenuClose,
  anchorEl,
  menuOpen
}) => {
  return (
    <>
      <Button
        onClick={handleModelMenuClick}
        endIcon={<KeyboardArrowDownIcon />}
        sx={{
          textTransform: 'none',
          color: 'black',
          mr: 1,
          fontWeight: 'normal',
          fontSize: '0.9rem',
          border: '1px solid #eeeeee',
          borderRadius: '16px',
          px: 2,
          py: 0.5,
          '&:hover': {
            bgcolor: '#f5f5f5',
            border: '1px solid #e0e0e0',
          }
        }}
      >
        {selectedModel?.name || '选择模型'}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={menuOpen}
        onClose={handleModelMenuClose}
        sx={{ mt: 1 }}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        {availableModels.map((model) => (
          <MenuItem
            key={model.id}
            onClick={() => handleModelSelect(model)}
            selected={selectedModel?.id === model.id}
            sx={{
              minWidth: '180px',
              py: 1,
              '&.Mui-selected': {
                bgcolor: 'rgba(25, 118, 210, 0.08)',
              },
              '&.Mui-selected:hover': {
                bgcolor: 'rgba(25, 118, 210, 0.12)',
              }
            }}
          >
            <Box>
              <Typography variant="body2" component="div">
                {model.name}
              </Typography>
              <Typography variant="caption" color="textSecondary">
                {model.description}
              </Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}; 