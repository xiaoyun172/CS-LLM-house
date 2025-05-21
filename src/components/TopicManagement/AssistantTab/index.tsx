import {
  Box,
  List,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Menu,
  MenuItem,
  Typography,
  Tooltip,
  TextField,
  Divider,
  Snackbar,
  Alert
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import type { Assistant } from '../../../shared/types/Assistant';
import AssistantGroups from './AssistantGroups';
import AssistantItem from './AssistantItem';
import PresetAssistantItem from './PresetAssistantItem';
import GroupDialog from '../GroupDialog';
import { COMMON_EMOJIS } from './AssistantIconPicker';
import { useAssistantTabLogic } from './useAssistantTabLogic';
import type { Group } from '../../../shared/types';

// 组件属性定义
interface AssistantTabProps {
  userAssistants: Assistant[];
  currentAssistant: Assistant | null;
  onSelectAssistant: (assistant: Assistant) => void;
  onAddAssistant: (assistant: Assistant) => void;
  onUpdateAssistant?: (assistant: Assistant) => void;
  onDeleteAssistant?: (assistantId: string) => void;
}

/**
 * 助手选项卡组件 - 只负责渲染UI
 */
export default function AssistantTab({
  userAssistants,
  currentAssistant,
  onSelectAssistant,
  onAddAssistant,
  onUpdateAssistant,
  onDeleteAssistant
}: AssistantTabProps) {
  // 使用自定义hook获取所有逻辑和状态
  const {
    // 状态
    assistantDialogOpen,
    selectedAssistantId,
    assistantGroups,
    assistantGroupMap,
    ungroupedAssistants,
    notification,
    assistantMenuAnchorEl,
    selectedMenuAssistant,
    addToGroupMenuAnchorEl,
    groupDialogOpen,
    editDialogOpen,
    editAssistantName,
    editAssistantPrompt,
    
    // 处理函数
    handleCloseNotification,
    handleOpenAssistantDialog,
    handleCloseAssistantDialog,
    handleSelectAssistant,
    handleSelectAssistantFromList,
    handleAddAssistant,
    handleOpenGroupDialog,
    handleCloseGroupDialog,
    handleOpenMenu,
    handleCloseAssistantMenu,
    handleOpenAddToGroupMenu,
    handleCloseAddToGroupMenu,
    handleAddToNewGroup,
    handleDeleteAssistantAction,
    handleOpenEditDialog,
    handleCloseEditDialog,
    handleSaveAssistant,
    handleCopyAssistant,
    handleClearTopics,
    handleSelectEmoji,
    handleSortByPinyinAsc,
    handleSortByPinyinDesc,
    handleAddToGroup,
    handleEditNameChange,
    handleEditPromptChange,
    
    // 数据
    predefinedAssistantsData
  } = useAssistantTabLogic(
    userAssistants,
    currentAssistant,
    onSelectAssistant,
    onAddAssistant,
    onUpdateAssistant,
    onDeleteAssistant
  );

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* 标题和按钮区域 */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography variant="subtitle1" fontWeight="medium">所有助手</Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Tooltip title="创建分组">
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleOpenGroupDialog}
            >
              创建分组
            </Button>
          </Tooltip>
          <Tooltip title="创建新助手">
            <Button
              variant="outlined"
              size="small"
              startIcon={<AddIcon />}
              onClick={handleOpenAssistantDialog}
            >
              添加助手
            </Button>
          </Tooltip>
        </Box>
      </Box>

      {/* 分组区域 */}
      <AssistantGroups
        assistantGroups={assistantGroups || []}
        userAssistants={userAssistants}
        assistantGroupMap={assistantGroupMap || {}}
        currentAssistant={currentAssistant}
        onSelectAssistant={handleSelectAssistantFromList}
        onOpenMenu={handleOpenMenu}
        onDeleteAssistant={handleDeleteAssistantAction}
        isGroupEditMode={false}
        onAddItem={handleOpenGroupDialog}
      />

      {/* 未分组助手列表 */}
      <Typography variant="body2" color="textSecondary" sx={{ mt: 1, mb: 1 }}>
        未分组助手
      </Typography>
      <List sx={{ flexGrow: 1, overflow: 'auto' }}>
        {(ungroupedAssistants || []).map((assistant: Assistant) => (
          <AssistantItem
            key={assistant.id}
            assistant={assistant}
            isSelected={currentAssistant?.id === assistant.id}
            onSelectAssistant={handleSelectAssistantFromList}
            onOpenMenu={handleOpenMenu}
            onDeleteAssistant={handleDeleteAssistantAction}
          />
        ))}
      </List>

      {/* 助手选择对话框 */}
      <Dialog open={assistantDialogOpen} onClose={handleCloseAssistantDialog}>
        <DialogTitle>选择助手</DialogTitle>
        <DialogContent>
          <DialogContentText>
            选择一个预设助手来添加到你的助手列表中
          </DialogContentText>
          <List sx={{ pt: 1 }}>
            {predefinedAssistantsData.map((assistant: Assistant) => (
              <PresetAssistantItem
                key={assistant.id}
                assistant={assistant}
                isSelected={selectedAssistantId === assistant.id}
                onSelect={handleSelectAssistant}
              />
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseAssistantDialog}>取消</Button>
          <Button onClick={handleAddAssistant} color="primary">
            添加
          </Button>
        </DialogActions>
      </Dialog>

      {/* 分组对话框 */}
      <GroupDialog
        open={groupDialogOpen}
        onClose={handleCloseGroupDialog}
        type="assistant"
      />

      {/* 助手菜单 */}
      <Menu
        anchorEl={assistantMenuAnchorEl}
        open={Boolean(assistantMenuAnchorEl)}
        onClose={handleCloseAssistantMenu}
      >
        <MenuItem onClick={handleOpenAddToGroupMenu}>添加到分组...</MenuItem>
        <MenuItem onClick={handleOpenEditDialog}>编辑助手</MenuItem>
        <MenuItem onClick={() => {
          handleCloseAssistantMenu();
          // 直接打开一个Dialog形式的图标选择器，而不是依赖于Popover
          const tempAssistant = selectedMenuAssistant;
          if (tempAssistant) {
            // 使用Dialog来显示图标选择器，这种方式更可靠
            const dialog = document.createElement('dialog');
            dialog.style.padding = '20px';
            dialog.style.borderRadius = '8px';
            dialog.style.border = '1px solid #ccc';
            dialog.style.boxShadow = '0 4px 8px rgba(0,0,0,0.1)';
            dialog.style.maxWidth = '400px';
            
            const title = document.createElement('h3');
            title.textContent = '选择助手图标';
            title.style.marginTop = '0';
            title.style.marginBottom = '16px';
            
            const container = document.createElement('div');
            container.style.display = 'grid';
            container.style.gridTemplateColumns = 'repeat(8, 1fr)';
            container.style.gap = '8px';
            
            COMMON_EMOJIS.forEach((emoji: string) => {
              const button = document.createElement('button');
              button.textContent = emoji;
              button.style.fontSize = '20px';
              button.style.padding = '8px';
              button.style.cursor = 'pointer';
              button.style.border = emoji === tempAssistant.emoji ? '2px solid #1976d2' : '1px solid #ddd';
              button.style.borderRadius = '4px';
              button.style.background = 'none';
              
              button.onclick = () => {
                handleSelectEmoji(emoji);
                dialog.close();
              };
              
              container.appendChild(button);
            });
            
            const closeBtn = document.createElement('button');
            closeBtn.textContent = '关闭';
            closeBtn.style.marginTop = '16px';
            closeBtn.style.padding = '8px 12px';
            closeBtn.style.float = 'right';
            closeBtn.onclick = () => dialog.close();
            
            dialog.appendChild(title);
            dialog.appendChild(container);
            dialog.appendChild(document.createElement('br'));
            dialog.appendChild(closeBtn);
            
            document.body.appendChild(dialog);
            dialog.showModal();
            
            dialog.addEventListener('close', () => {
              document.body.removeChild(dialog);
            });
          }
        }}>修改图标</MenuItem>
        <MenuItem onClick={handleCopyAssistant}>复制助手</MenuItem>
        <MenuItem onClick={handleClearTopics}>清空话题</MenuItem>
        <Divider />
        <MenuItem onClick={handleSortByPinyinAsc}>按拼音升序排列</MenuItem>
        <MenuItem onClick={handleSortByPinyinDesc}>按拼音降序排列</MenuItem>
        <Divider />
        <MenuItem onClick={() => {
          if (selectedMenuAssistant) handleDeleteAssistantAction(selectedMenuAssistant.id);
        }}>
          删除助手
        </MenuItem>
      </Menu>

      {/* 添加到分组菜单 */}
      <Menu
        anchorEl={addToGroupMenuAnchorEl}
        open={Boolean(addToGroupMenuAnchorEl)}
        onClose={handleCloseAddToGroupMenu}
      >
        {(assistantGroups || []).map((group: Group) => (
          <MenuItem
            key={group.id}
            onClick={() => handleAddToGroup(group.id)}
          >
            {group.name}
          </MenuItem>
        ))}
        <MenuItem onClick={handleAddToNewGroup}>创建新分组...</MenuItem>
      </Menu>

      {/* 编辑助手对话框 */}
      <Dialog open={editDialogOpen} onClose={handleCloseEditDialog} maxWidth="sm" fullWidth>
        <DialogTitle>编辑助手</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="助手名称"
            type="text"
            fullWidth
            variant="outlined"
            value={editAssistantName}
            onChange={handleEditNameChange}
            sx={{ mb: 2 }}
          />
          <TextField
            margin="dense"
            label="系统提示词"
            multiline
            rows={6}
            fullWidth
            variant="outlined"
            value={editAssistantPrompt}
            onChange={handleEditPromptChange}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseEditDialog}>取消</Button>
          <Button onClick={handleSaveAssistant} color="primary">保存</Button>
        </DialogActions>
      </Dialog>

      {/* 通知提示 */}
      <Snackbar
        open={notification.open}
        autoHideDuration={3000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity}>
          {notification.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}