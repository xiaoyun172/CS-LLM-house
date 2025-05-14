import { useState } from 'react';
import { 
  Box, 
  Typography, 
  IconButton,
  Collapse,
  TextField,
  Menu,
  MenuItem
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import { useDispatch } from 'react-redux';
import { 
  toggleGroupExpanded, 
  updateGroup, 
  deleteGroup,
  reorderItemsInGroup
} from '../../shared/store/slices/groupsSlice';
import type { Group } from '../../shared/types';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';

interface GroupHeaderProps {
  group: Group;
  onAddItemClick: () => void;
}

// 分组标题栏组件
export function GroupHeader({ group, onAddItemClick }: GroupHeaderProps) {
  const dispatch = useDispatch();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(group.name);
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  
  const handleToggleExpand = () => {
    dispatch(toggleGroupExpanded(group.id));
  };
  
  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setMenuAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setMenuAnchorEl(null);
  };
  
  const handleEditClick = () => {
    setIsEditing(true);
    handleMenuClose();
  };
  
  const handleDeleteClick = () => {
    dispatch(deleteGroup(group.id));
    handleMenuClose();
  };
  
  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditName(e.target.value);
  };
  
  const handleNameBlur = () => {
    if (editName.trim()) {
      dispatch(updateGroup({ id: group.id, changes: { name: editName.trim() } }));
    }
    setIsEditing(false);
  };
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleNameBlur();
    } else if (e.key === 'Escape') {
      setEditName(group.name);
      setIsEditing(false);
    }
  };
  
  const handleAddClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAddItemClick();
  };
  
  return (
    <Box 
      sx={{
        display: 'flex',
        alignItems: 'center',
        padding: '6px 4px',
        borderRadius: '4px',
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.04)',
        }
      }}
      onClick={handleToggleExpand}
    >
      <IconButton 
        size="small" 
        sx={{ padding: '2px', mr: 0.5 }}
        onClick={(e) => {
          e.stopPropagation();
          handleToggleExpand();
        }}
      >
        {group.expanded ? <KeyboardArrowDownIcon fontSize="small" /> : <KeyboardArrowRightIcon fontSize="small" />}
      </IconButton>
      
      {isEditing ? (
        <TextField
          size="small"
          value={editName}
          onChange={handleNameChange}
          onBlur={handleNameBlur}
          onKeyDown={handleKeyDown}
          autoFocus
          variant="outlined"
          sx={{ 
            flexGrow: 1,
            '& .MuiOutlinedInput-root': {
              height: '28px',
              fontSize: '0.875rem',
              padding: '2px 8px'
            }
          }}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <Typography 
          variant="body2" 
          sx={{ 
            flexGrow: 1, 
            fontWeight: 500,
            fontSize: '0.875rem',
            color: 'text.secondary'
          }}
        >
          {group.name}
        </Typography>
      )}
      
      <IconButton 
        size="small" 
        sx={{ padding: '2px' }}
        onClick={handleAddClick}
      >
        <AddIcon fontSize="small" />
      </IconButton>
      
      <IconButton 
        size="small" 
        sx={{ padding: '2px' }}
        onClick={handleMenuOpen}
      >
        <MoreVertIcon fontSize="small" />
      </IconButton>
      
      <Menu
        anchorEl={menuAnchorEl}
        open={Boolean(menuAnchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={handleEditClick}>
          <EditIcon fontSize="small" sx={{ mr: 1 }} />
          编辑分组
        </MenuItem>
        <MenuItem onClick={handleDeleteClick}>
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} />
          删除分组
        </MenuItem>
      </Menu>
    </Box>
  );
}

interface GroupContainerProps {
  group: Group;
  children: React.ReactNode;
  onAddItem: () => void;
}

// 分组容器组件
export function GroupContainer({ group, children, onAddItem }: GroupContainerProps) {
  return (
    <Box sx={{ mb: 1 }}>
      <GroupHeader group={group} onAddItemClick={onAddItem} />
      <Collapse in={group.expanded}>
        <Box sx={{ pl: 2 }}>
          {children}
        </Box>
      </Collapse>
    </Box>
  );
}

interface DraggableGroupProps {
  group: Group;
  children: React.ReactNode;
  onAddItem: () => void;
}

// 可拖拽的分组组件
export function DraggableGroup({ group, children, onAddItem }: DraggableGroupProps) {
  const dispatch = useDispatch();
  
  const handleDragEnd = (result: any) => {
    if (!result.destination) {
      return;
    }
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) {
      return;
    }
    
    // 获取当前项目顺序
    const currentItems = Array.from(group.items);
    // 移动项目
    const [removed] = currentItems.splice(sourceIndex, 1);
    currentItems.splice(destinationIndex, 0, removed);
    
    // 分发重新排序操作
    dispatch(reorderItemsInGroup({ 
      groupId: group.id, 
      newOrder: currentItems 
    }));
  };
  
  return (
    <GroupContainer group={group} onAddItem={onAddItem}>
      <DragDropContext onDragEnd={handleDragEnd}>
        <Droppable droppableId={`group-${group.id}`}>
          {(provided) => (
            <div
              ref={provided.innerRef}
              {...provided.droppableProps}
            >
              {children}
              {provided.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
    </GroupContainer>
  );
}

interface DraggableItemProps {
  id: string;
  index: number;
  children: React.ReactNode;
}

// 可拖拽的项目组件
export function DraggableItem({ id, index, children }: DraggableItemProps) {
  return (
    <Draggable draggableId={id} index={index}>
      {(provided) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
        >
          {children}
        </div>
      )}
    </Draggable>
  );
}

interface CreateGroupButtonProps {
  type: 'assistant' | 'topic';
  onClick: () => void;
}

// 创建分组按钮组件
export function CreateGroupButton({ type, onClick }: CreateGroupButtonProps) {
  return (
    <Box 
      sx={{ 
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '1px dashed',
        borderColor: 'divider',
        borderRadius: '8px',
        p: 1,
        mb: 2,
        cursor: 'pointer',
        '&:hover': {
          backgroundColor: 'rgba(0, 0, 0, 0.02)',
        }
      }}
      onClick={onClick}
    >
      <AddIcon fontSize="small" sx={{ mr: 1 }} />
      <Typography variant="body2">
        创建{type === 'assistant' ? '助手' : '话题'}分组
      </Typography>
    </Box>
  );
} 