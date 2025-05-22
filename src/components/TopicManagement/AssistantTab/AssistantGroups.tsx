import React from 'react';
import { Box, Typography, List, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { Assistant } from '../../../shared/types/Assistant';
import type { Group } from '../../../shared/types';
import AssistantItem from './AssistantItem';

interface AssistantGroupsProps {
  assistantGroups: Group[];
  userAssistants: Assistant[];
  assistantGroupMap: Record<string, string>;
  currentAssistant: Assistant | null;
  onSelectAssistant: (assistant: Assistant) => void;
  onOpenMenu: (event: React.MouseEvent, assistant: Assistant) => void;
  onDeleteAssistant: (assistantId: string, event: React.MouseEvent) => void;
  isGroupEditMode: boolean; // 保留但不使用
  onAddItem?: () => void;
}

/**
 * 助手分组组件 - 简化版
 */
export default function AssistantGroups({
  assistantGroups,
  userAssistants,
  assistantGroupMap,
  currentAssistant,
  onSelectAssistant,
  onOpenMenu,
  onDeleteAssistant
}: AssistantGroupsProps) {
  // 渲染助手组 - 使用Accordion代替拖拽组件
  return (
    <Box sx={{ mb: 2 }}>
      {assistantGroups.length > 0 ? (
        assistantGroups.map((group) => {
          // 获取该分组中的所有助手
          const groupAssistants = userAssistants.filter(
            assistant => assistant && assistant.id && assistantGroupMap[assistant.id] === group.id
          );

          // 即使分组中没有助手，也显示分组，但添加提示信息
          // 不再返回null，而是显示空分组

          return (
            <Accordion
              key={group.id}
              defaultExpanded={Boolean(group.expanded)}
              disableGutters
              sx={{
                mb: 1,
                boxShadow: 'none',
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: '8px',
                '&:before': {
                  display: 'none',
                },
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                sx={{
                  minHeight: '48px',
                  '& .MuiAccordionSummary-content': {
                    margin: '8px 0',
                  }
                }}
              >
                <Typography variant="body2">{group.name}</Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ p: 1 }}>
                {groupAssistants.length > 0 ? (
                  <List disablePadding>
                    {groupAssistants.map((assistant) => (
                      <AssistantItem
                        key={assistant.id}
                        assistant={assistant}
                        isSelected={currentAssistant?.id === assistant.id}
                        onSelectAssistant={onSelectAssistant}
                        onOpenMenu={onOpenMenu}
                        onDeleteAssistant={onDeleteAssistant}
                      />
                    ))}
                  </List>
                ) : (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    sx={{
                      py: 1,
                      px: 1,
                      textAlign: 'center',
                      fontStyle: 'italic',
                      fontSize: '0.85rem'
                    }}
                  >
                    此分组暂无助手，请从未分组助手中添加
                  </Typography>
                )}
              </AccordionDetails>
            </Accordion>
          );
        })
      ) : (
        <Typography variant="body2" color="textSecondary" sx={{ py: 2, textAlign: 'center' }}>
          没有助手分组
        </Typography>
      )}
    </Box>
  );
}