import { dexieStorage } from './DexieStorageService';
import { versionService } from './VersionService';
import { EventEmitter, EVENT_NAMES } from './EventEmitter';
import store from '../store';
import { setUpdateState } from '../store/slices/runtimeSlice';
import { throttle } from 'lodash';

/**
 * 版本历史服务
 * 用于管理版本历史记录和自动加载最新版本
 */
class VersionHistoryService {
  // 节流计时器
  private throttleTimers: Record<string, NodeJS.Timeout> = {};
  
  // 版本缓存
  private versionCache: Record<string, any> = {};
  
  constructor() {
    // 监听应用启动事件
    EventEmitter.on(EVENT_NAMES.APP_INITIALIZED, this.checkForLatestVersions.bind(this));
  }
  
  /**
   * 保存最新版本ID到本地存储
   * @param messageId 消息ID
   * @param versionId 版本ID
   */
  saveLatestVersionId(messageId: string, versionId: string): void {
    try {
      localStorage.setItem(`message_latest_version_${messageId}`, versionId);
      
      // 缓存版本
      this.versionCache[versionId] = {
        messageId,
        timestamp: Date.now()
      };
      
      console.log(`[VersionHistoryService] 保存最新版本ID - 消息ID: ${messageId}, 版本ID: ${versionId}`);
    } catch (error) {
      console.error(`[VersionHistoryService] 保存最新版本ID失败:`, error);
    }
  }
  
  /**
   * 获取最新版本ID
   * @param messageId 消息ID
   * @returns 最新版本ID，如果没有则返回null
   */
  getLatestVersionId(messageId: string): string | null {
    try {
      const versionId = localStorage.getItem(`message_latest_version_${messageId}`);
      return versionId;
    } catch (error) {
      console.error(`[VersionHistoryService] 获取最新版本ID失败:`, error);
      return null;
    }
  }
  
  /**
   * 自动加载最新版本
   * @param messageId 消息ID
   * @returns 是否成功加载
   */
  async autoLoadLatestVersion(messageId: string): Promise<boolean> {
    try {
      // 获取最新版本ID
      const latestVersionId = this.getLatestVersionId(messageId);
      
      if (!latestVersionId) {
        console.log(`[VersionHistoryService] 没有找到最新版本ID - 消息ID: ${messageId}`);
        return false;
      }
      
      console.log(`[VersionHistoryService] 自动加载最新版本 - 消息ID: ${messageId}, 版本ID: ${latestVersionId}`);
      
      // 切换到最新版本
      const success = await versionService.switchToVersion(latestVersionId);
      
      if (success) {
        // 清除本地存储中的版本ID
        localStorage.removeItem(`message_latest_version_${messageId}`);
        console.log(`[VersionHistoryService] 自动加载最新版本成功 - 消息ID: ${messageId}`);
        
        // 发送事件
        EventEmitter.emit(EVENT_NAMES.VERSION_LOADED, { 
          messageId, 
          versionId: latestVersionId 
        });
      }
      
      return success;
    } catch (error) {
      console.error(`[VersionHistoryService] 自动加载最新版本失败:`, error);
      return false;
    }
  }
  
  /**
   * 节流保存最新版本ID
   * 在短时间内多次调用时，只有最后一次会被执行
   * @param messageId 消息ID
   * @param versionId 版本ID
   * @param delay 延迟时间，默认500ms
   */
  throttleSaveLatestVersionId(messageId: string, versionId: string, delay: number = 500): void {
    // 清除之前的计时器
    if (this.throttleTimers[messageId]) {
      clearTimeout(this.throttleTimers[messageId]);
    }
    
    // 设置新的计时器
    this.throttleTimers[messageId] = setTimeout(() => {
      this.saveLatestVersionId(messageId, versionId);
      delete this.throttleTimers[messageId];
    }, delay);
  }
  
  /**
   * 检查所有消息是否有最新版本
   */
  async checkForLatestVersions(): Promise<void> {
    try {
      console.log(`[VersionHistoryService] 检查最新版本`);
      
      // 更新状态
      store.dispatch(setUpdateState({
        checking: true
      }));
      
      // 获取所有消息
      const messages = await dexieStorage.getAllMessages();
      
      // 检查每个消息是否有最新版本
      for (const message of messages) {
        const latestVersionId = this.getLatestVersionId(message.id);
        
        if (latestVersionId) {
          console.log(`[VersionHistoryService] 发现消息 ${message.id} 有最新版本 ${latestVersionId}`);
          
          // 自动加载最新版本
          await this.autoLoadLatestVersion(message.id);
        }
      }
      
      // 更新状态
      store.dispatch(setUpdateState({
        checking: false
      }));
      
      console.log(`[VersionHistoryService] 检查最新版本完成`);
    } catch (error) {
      console.error(`[VersionHistoryService] 检查最新版本失败:`, error);
      
      // 更新状态
      store.dispatch(setUpdateState({
        checking: false,
        error: String(error)
      }));
    }
  }
  
  /**
   * 节流检查最新版本
   */
  throttleCheckForLatestVersions = throttle(this.checkForLatestVersions.bind(this), 5000);
}

export const versionHistoryService = new VersionHistoryService();
