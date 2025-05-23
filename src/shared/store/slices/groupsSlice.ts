import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Group } from '../../types';
import { nanoid } from '../../utils';
import { getStorageItem, setStorageItem } from '../../utils/storage';
import { makeSerializable, diagnoseSerializationIssues } from '../../utils/serialization';
import { dexieStorage } from '../../services/DexieStorageService';

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

/**
 * 安全地保存分组数据到存储
 * 确保数据是可序列化的
 */
const saveGroupsToStorage = async (groups: Group[]): Promise<void> => {
  try {


    // 先诊断数据是否存在序列化问题
    const { hasCircularRefs, nonSerializableProps } = diagnoseSerializationIssues(groups);

    if (hasCircularRefs || nonSerializableProps.length > 0) {
      console.warn('分组数据存在序列化问题，将尝试修复：', {
        hasCircularRefs,
        nonSerializableProps
      });
    }

    // 使用makeSerializable确保数据可序列化
    const serializableGroups = makeSerializable(groups);

    // 直接使用dexieStorage保存，避免中间层
    await dexieStorage.saveSetting('groups', serializableGroups);

    // 同时使用setStorageItem作为备份方式
    await setStorageItem('groups', serializableGroups);


  } catch (error) {
    console.error('保存分组失败:', error);
    // 记录更详细的错误信息，帮助诊断问题
    if (error instanceof Error) {
      console.error('错误类型:', error.name);
      console.error('错误消息:', error.message);
      console.error('错误堆栈:', error.stack);
    }
  }
};

/**
 * 安全地保存映射数据到存储
 */
const saveMapToStorage = async (key: string, map: Record<string, string>): Promise<void> => {
  try {


    // 先诊断数据是否存在序列化问题
    const { hasCircularRefs, nonSerializableProps } = diagnoseSerializationIssues(map);

    if (hasCircularRefs || nonSerializableProps.length > 0) {
      console.warn(`${key}数据存在序列化问题，将尝试修复：`, {
        hasCircularRefs,
        nonSerializableProps
      });
    }

    // 使用makeSerializable确保数据可序列化
    const serializableMap = makeSerializable(map);

    // 直接使用dexieStorage保存，避免中间层
    await dexieStorage.saveSetting(key, serializableMap);

    // 同时使用setStorageItem作为备份方式
    await setStorageItem(key, serializableMap);

    console.log(`${key}数据保存成功`);
  } catch (error) {
    console.error(`保存${key}失败:`, error);
    // 记录更详细的错误信息
    if (error instanceof Error) {
      console.error('错误类型:', error.name);
      console.error('错误消息:', error.message);
      console.error('错误堆栈:', error.stack);
    }
  }
};

// 初始化函数，从IndexedDB加载数据
const initializeGroups = async (dispatch: any) => {
  try {


    // 尝试直接从dexieStorage加载
    let savedGroups: Group[] | null = null;
    let savedAssistantGroupMap: Record<string, string> | null = null;
    let savedTopicGroupMap: Record<string, string> | null = null;

    try {
      // 首先尝试直接从dexieStorage加载
      savedGroups = await dexieStorage.getSetting('groups');
      savedAssistantGroupMap = await dexieStorage.getSetting('assistantGroupMap');
      savedTopicGroupMap = await dexieStorage.getSetting('topicGroupMap');


    } catch (dexieError) {
      console.warn('从dexieStorage直接加载分组数据失败，尝试使用getStorageItem:', dexieError);

      // 如果直接加载失败，尝试使用getStorageItem
      savedGroups = await getStorageItem<Group[]>('groups');
      savedAssistantGroupMap = await getStorageItem<Record<string, string>>('assistantGroupMap');
      savedTopicGroupMap = await getStorageItem<Record<string, string>>('topicGroupMap');
    }



    const payload = {
      groups: savedGroups || [],
      assistantGroupMap: savedAssistantGroupMap || {},
      topicGroupMap: savedTopicGroupMap || {}
    };

    dispatch(loadGroupsSuccess(payload));
  } catch (error) {
    console.error('加载分组数据失败:', error);
    if (error instanceof Error) {
      console.error('错误类型:', error.name);
      console.error('错误消息:', error.message);
      console.error('错误堆栈:', error.stack);
    }
  }
};

const groupsSlice = createSlice({
  name: 'groups',
  initialState,
  reducers: {
    // 加载分组数据成功
    loadGroupsSuccess: (state, action: PayloadAction<{
      groups: Group[];
      assistantGroupMap: Record<string, string>;
      topicGroupMap: Record<string, string>;
    }>) => {
      state.groups = action.payload.groups;
      state.assistantGroupMap = action.payload.assistantGroupMap;
      state.topicGroupMap = action.payload.topicGroupMap;
    },

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

      // 保存更改
      saveGroupsToStorage(state.groups);
    },

    // 更新分组
    updateGroup: (state, action: PayloadAction<{ id: string; changes: Partial<Omit<Group, 'id' | 'type'>> }>) => {
      const { id, changes } = action.payload;
      const group = state.groups.find(g => g.id === id);
      if (group) {
        Object.assign(group, changes);

        // 保存更改
        saveGroupsToStorage(state.groups);
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
        saveGroupsToStorage(state.groups);
        saveMapToStorage('assistantGroupMap', state.assistantGroupMap);
        saveMapToStorage('topicGroupMap', state.topicGroupMap);
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
          saveGroupsToStorage(state.groups);

          const mapKey = group.type === 'assistant' ? 'assistantGroupMap' : 'topicGroupMap';
          const mapValue = group.type === 'assistant' ? state.assistantGroupMap : state.topicGroupMap;

          saveMapToStorage(mapKey, mapValue);
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
          saveGroupsToStorage(state.groups);

          const mapKey = type === 'assistant' ? 'assistantGroupMap' : 'topicGroupMap';
          saveMapToStorage(mapKey, mapToUse);
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
      saveGroupsToStorage(state.groups);
    },

    // 重新排序分组内的项目
    reorderItemsInGroup: (state, action: PayloadAction<{ groupId: string; newOrder: string[] }>) => {
      const { groupId, newOrder } = action.payload;
      const group = state.groups.find(g => g.id === groupId);

      if (group) {
        group.items = newOrder;
        saveGroupsToStorage(state.groups);
      }
    },

    // 切换分组展开/折叠状态
    toggleGroupExpanded: (state, action: PayloadAction<string>) => {
      const groupId = action.payload;
      const group = state.groups.find(g => g.id === groupId);

      if (group) {
        group.expanded = !group.expanded;
        saveGroupsToStorage(state.groups);
      }
    }
  }
});

export const {
  loadGroupsSuccess,
  createGroup,
  updateGroup,
  deleteGroup,
  addItemToGroup,
  removeItemFromGroup,
  reorderGroups,
  reorderItemsInGroup,
  toggleGroupExpanded
} = groupsSlice.actions;

// 异步初始化action
export const initGroups = () => async (dispatch: any) => {
  await initializeGroups(dispatch);
  // 返回一个符合UnknownAction类型的对象
  return { type: 'groups/initGroups' };
};

export default groupsSlice.reducer;