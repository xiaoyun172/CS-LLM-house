/**
 * Gemini 文件服务
 * 提供类似最佳实例的文件上传和管理功能
 * 注意：移动端暂时不支持真正的文件上传到 Gemini，这里提供兼容接口
 */
import type { Model, FileType } from '../../types';
import { logApiRequest, logApiResponse } from '../../services/LoggerService';
import { mobileFileStorage } from '../../services/MobileFileStorageService';

// 文件大小常量
const MB = 1024 * 1024;
const MAX_FILE_SIZE = 20 * MB; // 20MB 限制，与最佳实例保持一致

/**
 * Gemini 文件缓存
 */
interface GeminiFileCache {
  files: any[];
  timestamp: number;
}

const FILE_CACHE_DURATION = 3000; // 3秒缓存
let fileCache: GeminiFileCache | null = null;

/**
 * Gemini 文件服务类
 * 移动端兼容版本，提供基础文件处理功能
 */
export class GeminiFileService {
  private model: Model;

  constructor(model: Model) {
    this.model = model;
    if (!model.apiKey) {
      throw new Error('API密钥未设置');
    }
    // 移动端暂时不需要实际的客户端连接
    console.log(`[GeminiFileService] 初始化文件服务，模型: ${this.model.id}`);
  }

  /**
   * 上传文件到 Gemini
   * @param file 文件对象
   * @returns Gemini 文件对象
   */
  async uploadFile(file: FileType): Promise<any> {
    try {
      console.log(`[GeminiFileService] 开始上传文件: ${file.origin_name}`);

      // 检查文件大小
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`文件太大，最大允许 ${MAX_FILE_SIZE / MB}MB`);
      }

      // 检查是否为 PDF 文件
      if (file.ext !== '.pdf') {
        throw new Error('Gemini 目前只支持 PDF 文件上传');
      }

      // 记录 API 请求
      logApiRequest('Gemini File Upload', 'INFO', {
        method: 'POST',
        fileName: file.origin_name,
        fileSize: file.size,
        fileType: file.ext
      });

      // 移动端暂时返回模拟的上传结果
      const mockResult = {
        uri: `files/${file.id}`,
        name: file.id,
        displayName: file.origin_name,
        mimeType: 'application/pdf',
        sizeBytes: file.size.toString(),
        state: 'ACTIVE'
      };

      // 记录 API 响应
      logApiResponse('Gemini File Upload', 200, {
        fileUri: mockResult.uri,
        fileName: mockResult.name,
        displayName: mockResult.displayName
      });

      console.log(`[GeminiFileService] 文件上传成功: ${mockResult.uri}`);
      return mockResult;
    } catch (error) {
      console.error('[GeminiFileService] 文件上传失败:', error);
      throw error;
    }
  }

  /**
   * 获取文件的 base64 编码
   * @param file 文件对象
   * @returns base64 数据和 MIME 类型
   */
  async getBase64File(file: FileType): Promise<{ data: string; mimeType: string }> {
    try {
      let base64Data = file.base64Data;
      if (!base64Data) {
        // 从文件存储服务读取
        const fileContent = await mobileFileStorage.readFile(file.id);
        base64Data = fileContent;
      }

      if (!base64Data) {
        throw new Error('无法获取文件内容');
      }

      // 移除 data URL 前缀（如果存在）
      const cleanBase64 = base64Data.includes(',') ? base64Data.split(',')[1] : base64Data;

      return {
        data: cleanBase64,
        mimeType: file.mimeType || 'application/pdf'
      };
    } catch (error) {
      console.error('[GeminiFileService] 获取文件 base64 失败:', error);
      throw error;
    }
  }

  /**
   * 检索已上传的文件
   * @param file 文件对象
   * @returns Gemini 文件对象或 undefined
   */
  async retrieveFile(file: FileType): Promise<any | undefined> {
    try {
      console.log(`[GeminiFileService] 检索文件: ${file.origin_name}`);

      // 检查缓存
      if (fileCache && Date.now() - fileCache.timestamp < FILE_CACHE_DURATION) {
        const cachedFile = this.findFileInList(fileCache.files, file);
        if (cachedFile) {
          console.log(`[GeminiFileService] 从缓存中找到文件: ${cachedFile.uri}`);
          return cachedFile;
        }
      }

      // 移动端暂时返回空文件列表
      const files: any[] = [];

      // 更新缓存
      fileCache = {
        files,
        timestamp: Date.now()
      };

      // 查找匹配的文件
      const foundFile = this.findFileInList(files, file);
      if (foundFile) {
        console.log(`[GeminiFileService] 找到已上传的文件: ${foundFile.uri}`);
      } else {
        console.log(`[GeminiFileService] 未找到已上传的文件: ${file.origin_name}`);
      }

      return foundFile;
    } catch (error) {
      console.error('[GeminiFileService] 检索文件失败:', error);
      return undefined;
    }
  }

  /**
   * 列出所有已上传的文件
   * @returns 文件列表
   */
  async listFiles(): Promise<any[]> {
    try {
      console.log(`[GeminiFileService] 获取文件列表`);

      // 移动端暂时返回空列表
      const files: any[] = [];

      console.log(`[GeminiFileService] 获取到 ${files.length} 个文件`);
      return files;
    } catch (error) {
      console.error('[GeminiFileService] 获取文件列表失败:', error);
      throw error;
    }
  }

  /**
   * 删除已上传的文件
   * @param fileId Gemini 文件 ID
   */
  async deleteFile(fileId: string): Promise<void> {
    try {
      console.log(`[GeminiFileService] 删除文件: ${fileId}`);

      // 移动端暂时不执行实际删除操作

      // 清除缓存
      fileCache = null;

      console.log(`[GeminiFileService] 文件删除成功: ${fileId}`);
    } catch (error) {
      console.error('[GeminiFileService] 删除文件失败:', error);
      throw error;
    }
  }

  /**
   * 在文件列表中查找匹配的文件
   * @param files 文件列表
   * @param targetFile 目标文件
   * @returns 匹配的文件或 undefined
   */
  private findFileInList(files: any[], targetFile: FileType): any | undefined {
    return files.find(f => {
      // 检查文件状态
      if (f.state !== 'ACTIVE') {
        return false;
      }

      // 按显示名称和大小匹配
      return f.displayName === targetFile.origin_name &&
             Number(f.sizeBytes) === targetFile.size;
    });
  }


}

/**
 * 创建 Gemini 文件服务实例
 * @param model 模型配置
 * @returns Gemini 文件服务实例
 */
export function createGeminiFileService(model: Model): GeminiFileService {
  return new GeminiFileService(model);
}
