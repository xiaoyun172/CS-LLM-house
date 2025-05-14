import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Group } from '../../types';
import { nanoid } from '../../utils';
import * as storage from '../../utils/storage';

interface GroupsState {
  groups: Group[];
  assistantGroupMap: Record<string, string>; // assistantId -> groupId
  topicGroupMap: Record<string, string>; // topicId -> groupId
}

const initialState: GroupsState = {
  groups: [],
  assistantGroupMap: {},
  topicGroupMap: {}
};

// 从localStorage加载初始状态
const savedGroups = storage.getItem('groups');
const savedAssistantGroupMap = storage.getItem('assistantGroupMap');
const savedTopicGroupMap = storage.getItem('topicGroupMap');

if (savedGroups) {
  initialState.groups = JSON.parse(savedGroups);
}

if (savedAssistantGroupMap) {
  initialState.assistantGroupMap = JSON.parse(savedAssistantGroupMap);
}

if (savedTopicGroupMap) {
  initialState.topicGroupMap = JSON.parse(savedTopicGroupMap);
}

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    // 创建新分组
    createGroup: (state, action: PayloadAction<{ name: string; type: 'assistant' | 'topic' }>) => {
      const { name, type } = action.payload;
      const newGroup: Group = {
        id: nanoid(),
        name,
        type,
        items: [],
        order: state.groups.filter(g => g.type === type).length,
        expanded: true
      };
      state.groups.push(newGroup);
      storage.setItem('groups', JSON.stringify(state.groups));
    },
    
    // 更新分组
    updateGroup: (state, action: PayloadAction<{ id: string; changes: Partial<Omit<Group, 'id' | 'type'>> }>) => {
      const { id, changes } = action.payload;
      const group = state.groups.find(g => g.id === id);
      if (group) {
        Object.assign(group, changes);
        storage.setItem('groups', JSON.stringify(state.groups));
      }
    },
    
    // 删除分组
    deleteGroup: (state, action: PayloadAction<string>) => {
      const groupId = action.payload;
      const group = state.groups.find(g => g.id === groupId);
      
      if (group) {
        // 清除该分组中所有项目的映射
        if (group.type === 'assistant') {
          for (const assistantId of group.items) {
            delete state.assistantGroupMap[assistantId];
          }
        } else if (group.type === 'topic') {
          for (const topicId of group.items) {
            delete state.topicGroupMap[topicId];
          }
        }
        
        // 移除分组
        state.groups = state.groups.filter(g => g.id !== groupId);
        
        // 重新排序
        state.groups
          .filter(g => g.type === group.type)
          .sort((a, b) => a.order - b.order)
          .forEach((g, index) => {
            g.order = index;
          });
          
        // 保存更改
        storage.setItem('groups', JSON.stringify(state.groups));
        storage.setItem('assistantGroupMap', JSON.stringify(state.assistantGroupMap));
        storage.setItem('topicGroupMap', JSON.stringify(state.topicGroupMap));
      }
    },
    
    // 将项目添加到分组
    addItemToGroup: (state, action: PayloadAction<{ groupId: string; itemId: string }>) => {
      const { groupId, itemId } = action.payload;
      const group = state.groups.find(g => g.id === groupId);
      
      if (group) {
        // 避免重复添加
        if (!group.items.includes(itemId)) {
          group.items.push(itemId);
          
          // 更新映射
          if (group.type === 'assistant') {
            state.assistantGroupMap[itemId] = groupId;
          } else if (group.type === 'topic') {
            state.topicGroupMap[itemId] = groupId;
          }
          
          // 保存更改
          storage.setItem('groups', JSON.stringify(state.groups));
          storage.setItem(
            group.type === 'assistant' ? 'assistantGroupMap' : 'topicGroupMap', 
            JSON.stringify(group.type === 'assistant' ? state.assistantGroupMap : state.topicGroupMap)
          );
        }
      }
    },
    
    // 从分组中移除项目
    removeItemFromGroup: (state, action: PayloadAction<{ itemId: string; type: 'assistant' | 'topic' }>) => {
      const { itemId, type } = action.payload;
      
      // 确定项目当前所在的分组
      const mapToUse = type === 'assistant' ? state.assistantGroupMap : state.topicGroupMap;
      const groupId = mapToUse[itemId];
      
      if (groupId) {
        const group = state.groups.find(g => g.id === groupId);
        if (group) {
          group.items = group.items.filter(id => id !== itemId);
          delete mapToUse[itemId];
          
          // 保存更改
          storage.setItem('groups', JSON.stringify(state.groups));
          storage.setItem(
            type === 'assistant' ? 'assistantGroupMap' : 'topicGroupMap', 
            JSON.stringify(mapToUse)
          );
        }
      }
    },
    
    // 重新排序分组
    reorderGroups: (state, action: PayloadAction<{ type: 'assistant' | 'topic'; newOrder: string[] }>) => {
      const { type, newOrder } = action.payload;
      
      // 按新顺序重新排序分组
      state.groups
        .filter(g => g.type === type)
        .forEach(g => {
          const newIndex = newOrder.findIndex(id => id === g.id);
          if (newIndex !== -1) {
            g.order = newIndex;
          }
        });
        
      // 保存更改
      storage.setItem('groups', JSON.stringify(state.groups));
    },
    
    // 重新排序分组内的项目
    reorderItemsInGroup: (state, action: PayloadAction<{ groupId: string; newOrder: string[] }>) => {
      const { groupId, newOrder } = action.payload;
      const group = state.groups.find(g => g.id === groupId);
      
      if (group) {
        group.items = newOrder;
        storage.setItem('groups', JSON.stringify(state.groups));
      }
    },
    
    // 切换分组展开/折叠状态
    toggleGroupExpanded: (state, action: PayloadAction<string>) => {
      const groupId = action.payload;
      const group = state.groups.find(g => g.id === groupId);
      
      if (group) {
        group.expanded = !group.expanded;
        storage.setItem('groups', JSON.stringify(state.groups));
      }
    }
  }
});

export const { 
  createGroup, 
  updateGroup, 
  deleteGroup, 
  addItemToGroup, 
  removeItemFromGroup,
  reorderGroups,
  reorderItemsInGroup,
  toggleGroupExpanded
} = groupsSlice.actions;

export default groupsSlice.reducer; 