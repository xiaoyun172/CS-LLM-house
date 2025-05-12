import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  Switch, 
  IconButton, 
  Chip,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { Model } from '../../shared/types';
import { getProviderName } from '../../shared/data/presetModels';

interface ModelCardProps {
  model: Model;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onEdit: (model: Model) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

const ModelCard: React.FC<ModelCardProps> = ({ 
  model, 
  onToggleEnabled, 
  onEdit, 
  onDelete,
  onSetDefault,
}) => {
  const [anchorEl, setAnchorEl] = React.useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);
  
  const handleMenuClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const handleEdit = () => {
    handleMenuClose();
    onEdit(model);
  };
  
  const handleDelete = () => {
    handleMenuClose();
    onDelete(model.id);
  };
  
  const handleSetDefault = () => {
    handleMenuClose();
    onSetDefault(model.id);
  };
  
  return (
    <Card 
      sx={{ 
        mb: 2, 
        position: 'relative',
        border: model.isDefault ? '2px solid' : '1px solid',
        borderColor: model.isDefault ? 'primary.main' : 'divider',
      }}
    >
      {model.isDefault && (
        <Chip
          label="默认"
          color="primary"
          size="small"
          icon={<CheckCircleIcon />}
          sx={{
            position: 'absolute',
            top: 8,
            right: 8,
          }}
        />
      )}
      
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
          <Avatar 
            src={model.iconUrl} 
            alt={model.name}
            sx={{ mr: 2, width: 40, height: 40 }}
          />
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" component="div">
              {model.name}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {getProviderName(model.provider)}
            </Typography>
          </Box>
          <Box>
            <IconButton
              aria-label="more"
              aria-controls={open ? 'model-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={open ? 'true' : undefined}
              onClick={handleMenuClick}
            >
              <MoreVertIcon />
            </IconButton>
            <Menu
              id="model-menu"
              anchorEl={anchorEl}
              open={open}
              onClose={handleMenuClose}
              MenuListProps={{
                'aria-labelledby': 'model-menu-button',
              }}
            >
              <MenuItem onClick={handleEdit}>
                <ListItemIcon>
                  <EditIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>编辑</ListItemText>
              </MenuItem>
              {!model.isDefault && (
                <MenuItem onClick={handleSetDefault}>
                  <ListItemIcon>
                    <CheckCircleIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText>设为默认</ListItemText>
                </MenuItem>
              )}
              <MenuItem onClick={handleDelete}>
                <ListItemIcon>
                  <DeleteIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText>删除</ListItemText>
              </MenuItem>
            </Menu>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
          <Typography variant="body2">
            {model.enabled ? '已启用' : '已禁用'}
          </Typography>
          <Switch
            checked={model.enabled}
            onChange={(e) => onToggleEnabled(model.id, e.target.checked)}
            inputProps={{ 'aria-label': 'toggle model' }}
          />
        </Box>
      </CardContent>
    </Card>
  );
};

export default ModelCard;
