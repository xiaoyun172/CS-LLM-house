import type { WebDavConfig, WebDavConnectionResult, WebDavUploadResult, WebDavDownloadResult, WebDavBackupFile } from '../types';

/**
 * WebDAV 服务类
 * 提供 WebDAV 服务器的基本操作功能
 */
export class WebDavService {
  private config: WebDavConfig;

  constructor(config: WebDavConfig) {
    this.config = config;
  }

  /**
   * 检查 WebDAV 连接
   */
  async checkConnection(): Promise<WebDavConnectionResult> {
    try {
      const response = await fetch(this.config.webdavHost, {
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.webdavUser}:${this.config.webdavPass}`)}`,
          'Content-Type': 'application/xml',
          'Depth': '0'
        }
      });

      if (response.ok || response.status === 207) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: `连接失败: ${response.status} ${response.statusText}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `连接错误: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * 上传文件到 WebDAV
   */
  async uploadFile(fileName: string, data: string | Blob): Promise<WebDavUploadResult> {
    try {
      // 确保目录存在
      await this.ensureDirectory();

      const url = `${this.config.webdavHost.replace(/\/$/, '')}${this.config.webdavPath}/${fileName}`;
      
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.webdavUser}:${this.config.webdavPass}`)}`,
          'Content-Type': 'application/octet-stream'
        },
        body: data
      });

      if (response.ok || response.status === 201 || response.status === 204) {
        return { success: true, fileName };
      } else {
        return { 
          success: false, 
          error: `上传失败: ${response.status} ${response.statusText}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `上传错误: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * 从 WebDAV 下载文件
   */
  async downloadFile(fileName: string): Promise<WebDavDownloadResult> {
    try {
      const url = `${this.config.webdavHost.replace(/\/$/, '')}${this.config.webdavPath}/${fileName}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.webdavUser}:${this.config.webdavPass}`)}`
        }
      });

      if (response.ok) {
        const data = await response.text();
        return { success: true, data };
      } else {
        return { 
          success: false, 
          error: `下载失败: ${response.status} ${response.statusText}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `下载错误: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * 列出 WebDAV 目录中的备份文件
   */
  async listBackupFiles(): Promise<WebDavBackupFile[]> {
    try {
      const url = `${this.config.webdavHost.replace(/\/$/, '')}${this.config.webdavPath}/`;
      
      const response = await fetch(url, {
        method: 'PROPFIND',
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.webdavUser}:${this.config.webdavPass}`)}`,
          'Content-Type': 'application/xml',
          'Depth': '1'
        },
        body: `<?xml version="1.0" encoding="utf-8" ?>
          <D:propfind xmlns:D="DAV:">
            <D:prop>
              <D:displayname/>
              <D:getlastmodified/>
              <D:getcontentlength/>
              <D:resourcetype/>
            </D:prop>
          </D:propfind>`
      });

      if (!response.ok && response.status !== 207) {
        throw new Error(`列表请求失败: ${response.status} ${response.statusText}`);
      }

      const xmlText = await response.text();
      return this.parseWebDavResponse(xmlText);
    } catch (error) {
      console.error('列出备份文件失败:', error);
      return [];
    }
  }

  /**
   * 删除 WebDAV 文件
   */
  async deleteFile(fileName: string): Promise<WebDavConnectionResult> {
    try {
      const url = `${this.config.webdavHost.replace(/\/$/, '')}${this.config.webdavPath}/${fileName}`;
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.webdavUser}:${this.config.webdavPass}`)}`
        }
      });

      if (response.ok || response.status === 204) {
        return { success: true };
      } else {
        return { 
          success: false, 
          error: `删除失败: ${response.status} ${response.statusText}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        error: `删除错误: ${error instanceof Error ? error.message : String(error)}` 
      };
    }
  }

  /**
   * 确保目录存在
   */
  private async ensureDirectory(): Promise<void> {
    try {
      const url = `${this.config.webdavHost.replace(/\/$/, '')}${this.config.webdavPath}/`;
      
      const response = await fetch(url, {
        method: 'MKCOL',
        headers: {
          'Authorization': `Basic ${btoa(`${this.config.webdavUser}:${this.config.webdavPass}`)}`
        }
      });

      // 201 表示创建成功，405 表示目录已存在
      if (!response.ok && response.status !== 405) {
        console.warn('创建目录失败，但继续执行:', response.status, response.statusText);
      }
    } catch (error) {
      console.warn('创建目录时出错，但继续执行:', error);
    }
  }

  /**
   * 解析 WebDAV PROPFIND 响应
   */
  private parseWebDavResponse(xmlText: string): WebDavBackupFile[] {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
      const responses = xmlDoc.getElementsByTagName('response');
      const files: WebDavBackupFile[] = [];

      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        const href = response.getElementsByTagName('href')[0]?.textContent || '';
        const displayName = response.getElementsByTagName('displayname')[0]?.textContent || '';
        const lastModified = response.getElementsByTagName('getlastmodified')[0]?.textContent || '';
        const contentLength = response.getElementsByTagName('getcontentlength')[0]?.textContent || '0';
        const resourceType = response.getElementsByTagName('resourcetype')[0];
        
        // 跳过目录和非备份文件
        const isDirectory = resourceType?.getElementsByTagName('collection').length > 0;
        if (isDirectory || !displayName.endsWith('.json')) {
          continue;
        }

        files.push({
          fileName: displayName,
          modifiedTime: lastModified,
          size: parseInt(contentLength, 10),
          path: href
        });
      }

      // 按修改时间降序排序
      return files.sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime());
    } catch (error) {
      console.error('解析 WebDAV 响应失败:', error);
      return [];
    }
  }
}
