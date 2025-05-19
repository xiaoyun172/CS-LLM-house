import { dexieStorage } from './DexieStorageService';

/**
 * 数据修复服务 - 负责修复助手和话题的关联关系
 */
export class DataRepairService {
  /**
   * 检查数据一致性
   * 返回是否存在一致性问题
   */
  static async checkDataConsistency(): Promise<boolean> {
    console.log('[DataRepairService] 开始检查数据一致性');
    
    try {
      // 获取所有助手和话题
      const assistants = await dexieStorage.getAllAssistants();
      const topics = await dexieStorage.getAllTopics();
      
      console.log(`[DataRepairService] 找到 ${assistants.length} 个助手和 ${topics.length} 个话题`);
      
      // 检查助手的topicIds和话题的assistantId是否一致
      let inconsistencies = 0;
      
      // 检查每个话题
      for (const topic of topics) {
        if (!topic.assistantId) {
          console.log(`[DataRepairService] 话题 ${topic.id} 没有assistantId字段`);
          inconsistencies++;
          continue;
        }
        
        // 查找对应的助手
        const assistant = assistants.find(a => a.id === topic.assistantId);
        if (!assistant) {
          console.log(`[DataRepairService] 话题 ${topic.id} 的助手 ${topic.assistantId} 不存在`);
          inconsistencies++;
          continue;
        }
        
        // 检查助手的topicIds是否包含该话题
        if (!assistant.topicIds?.includes(topic.id)) {
          console.log(`[DataRepairService] 助手 ${assistant.id} 的topicIds不包含话题 ${topic.id}`);
          inconsistencies++;
        }
      }
      
      // 检查每个助手的topicIds
      for (const assistant of assistants) {
        if (!assistant.topicIds || !Array.isArray(assistant.topicIds)) {
          console.log(`[DataRepairService] 助手 ${assistant.id} 没有有效的topicIds数组`);
          inconsistencies++;
          continue;
        }
        
        // 检查每个topicId是否存在对应的话题
        for (const topicId of assistant.topicIds) {
          const topic = topics.find(t => t.id === topicId);
          if (!topic) {
            console.log(`[DataRepairService] 助手 ${assistant.id} 的topicId ${topicId} 对应的话题不存在`);
            inconsistencies++;
            continue;
          }
          
          // 检查话题的assistantId是否指向当前助手
          if (topic.assistantId !== assistant.id) {
            console.log(`[DataRepairService] 话题 ${topicId} 的assistantId (${topic.assistantId}) 与助手ID (${assistant.id}) 不一致`);
            inconsistencies++;
          }
        }
      }
      
      console.log(`[DataRepairService] 检查完成，发现 ${inconsistencies} 个数据一致性问题`);
      return inconsistencies > 0;
    } catch (error) {
      console.error('[DataRepairService] 检查数据一致性失败:', error);
      return true; // 如果发生错误，也认为需要修复
    }
  }

  /**
   * 修复所有助手和话题的关联关系
   */
  static async repairAllAssistantsAndTopics(): Promise<void> {
    try {
      console.log('[DataRepairService] 开始修复所有助手和话题的关联关系');
      
      // 获取所有助手和话题
      const assistants = await dexieStorage.getAllAssistants();
      const topics = await dexieStorage.getAllTopics();
      
      console.log(`[DataRepairService] 找到 ${assistants.length} 个助手和 ${topics.length} 个话题`);
      
      // 修复每个话题的assistantId
      for (const topic of topics) {
        // 如果话题没有assistantId，尝试从topicIds中找到对应的助手
        if (!topic.assistantId) {
          const assistant = assistants.find(a => 
            a.topicIds && a.topicIds.includes(topic.id)
          );
          
          if (assistant) {
            console.log(`[DataRepairService] 为话题 ${topic.id} 设置assistantId: ${assistant.id}`);
            topic.assistantId = assistant.id;
            await dexieStorage.saveTopic(topic);
          }
        }
      }
      
      // 修复每个助手的topics数组和topicIds数组
      for (const assistant of assistants) {
        // 找出属于该助手的所有话题
        const assistantTopics = topics.filter(t => t.assistantId === assistant.id);
        
        // 更新助手的topicIds数组
        assistant.topicIds = assistantTopics.map(t => t.id);
        
        console.log(`[DataRepairService] 更新助手 ${assistant.id} 的topicIds，数量: ${assistant.topicIds.length}`);
        
        await dexieStorage.saveAssistant(assistant);
      }
      
      console.log('[DataRepairService] 修复完成');
    } catch (error) {
      console.error('[DataRepairService] 修复失败:', error);
    }
  }
} 