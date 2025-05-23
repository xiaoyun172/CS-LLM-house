import type { FileContent } from '../types';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { Toast } from '@capacitor/toast';
import { mobileFileStorage } from './MobileFileStorageService';

// 最大文件大小限制（50MB）
const MAX_FILE_SIZE = 50 * 1024 * 1024;

/**
 * 文件上传服务
 * 处理文件选择、转换和管理
 */
export const FileUploadService = {
  /**
   * 选择文件
   * @returns Promise<FileContent[]> 选择的文件内容数组
   */
  async selectFiles(): Promise<FileContent[]> {
    try {
      // 检查当前是否在移动设备上
      const isNative = Capacitor.isNativePlatform();

      if (isNative) {
        // 在移动设备上使用Capacitor FilePicker
        const result = await FilePicker.pickFiles({
          // 只读取一个文件，但将来可以根据需求支持多个
          // multiple: true, // FilePicker不支持multiple参数
          // 允许所有类型的文件
          readData: true,
        });

        if (!result || !result.files || result.files.length === 0) {
          return [];
        }

        // 处理文件
        const fileContents: FileContent[] = [];

        for (const file of result.files) {
          // 检查文件大小
          if (file.size > MAX_FILE_SIZE) {
            await Toast.show({
              text: `文件 ${file.name} 太大，最大允许50MB`,
              duration: 'long'
            });
            continue;
          }

          // 使用新的文件存储服务处理文件
          try {
            const uploadedFile = await mobileFileStorage.uploadFile({
              name: file.name,
              mimeType: file.mimeType,
              size: file.size,
              base64Data: file.data ? `data:${file.mimeType};base64,${file.data}` : ''
            });

            fileContents.push({
              name: file.name,
              mimeType: file.mimeType,
              extension: file.name.split('.').pop() || '',
              size: file.size,
              base64Data: file.data ? `data:${file.mimeType};base64,${file.data}` : undefined,
              url: '',
              // 添加文件ID用于后续引用
              fileId: uploadedFile.id,
              fileRecord: uploadedFile
            });
          } catch (uploadError) {
            console.error('文件上传失败:', uploadError);
            await Toast.show({
              text: `文件 ${file.name} 上传失败: ${uploadError instanceof Error ? uploadError.message : '未知错误'}`,
              duration: 'long'
            });
          }
        }

        return fileContents;
      } else {
        // 在Web环境中使用文件选择器
        return new Promise((resolve, reject) => {
          const input = document.createElement('input');
          input.type = 'file';
          input.multiple = true;

          input.onchange = async (event) => {
            const files = (event.target as HTMLInputElement).files;
            if (!files || files.length === 0) {
              resolve([]);
              return;
            }

            try {
              const validFiles = Array.from(files).filter(file => {
                if (file.size > MAX_FILE_SIZE) {
                  alert(`文件 ${file.name} 太大，最大允许50MB`);
                  return false;
                }
                return true;
              });

              if (validFiles.length === 0) {
                resolve([]);
                return;
              }

              const fileContents = [];
              for (const file of validFiles) {
                try {
                  const processedFile = await this.processFile(file);

                  // 使用文件存储服务处理文件
                  const uploadedFile = await mobileFileStorage.uploadFile({
                    name: file.name,
                    mimeType: file.type,
                    size: file.size,
                    base64Data: processedFile.base64Data || ''
                  });

                  // 添加文件ID到处理结果
                  processedFile.fileId = uploadedFile.id;
                  processedFile.fileRecord = uploadedFile;

                  fileContents.push(processedFile);
                } catch (uploadError) {
                  console.error('文件上传失败:', uploadError);
                  alert(`文件 ${file.name} 上传失败: ${uploadError instanceof Error ? uploadError.message : '未知错误'}`);
                }
              }
              resolve(fileContents);
            } catch (error) {
              reject(error);
            }
          };

          input.click();
        });
      }
    } catch (error) {
      console.error('选择文件失败:', error);
      await Toast.show({
        text: '选择文件失败: ' + (error instanceof Error ? error.message : String(error)),
        duration: 'long'
      });
      throw error;
    }
  },

  /**
   * 处理文件，转换为FileContent对象
   * @param file 文件对象
   * @returns Promise<FileContent> 处理后的文件内容
   */
  async processFile(file: File): Promise<FileContent> {
    return new Promise((resolve, reject) => {
      try {
        // 限制文件大小
        if (file.size > MAX_FILE_SIZE) {
          reject(new Error(`文件太大，最大允许50MB`));
          return;
        }

        // 处理不同类型的文件
        if (file.type.startsWith('image/')) {
          // 图片文件特殊处理，读取宽高信息
          this.processImageFile(file)
            .then(resolve)
            .catch(reject);
        } else {
          // 其他类型文件简单处理
          const reader = new FileReader();
          reader.onload = (event) => {
            if (!event.target || !event.target.result) {
              reject(new Error('读取文件失败'));
              return;
            }

            const base64Data = event.target.result as string;
            const fileContent: FileContent = {
              name: file.name,
              mimeType: file.type,
              extension: file.name.split('.').pop() || '',
              size: file.size,
              base64Data,
              url: '',
            };
            resolve(fileContent);
          };
          reader.onerror = () => {
            reject(new Error('读取文件失败'));
          };
          reader.readAsDataURL(file);
        }
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * 处理图片文件，获取宽高信息
   * @param file 图片文件
   * @returns Promise<FileContent> 处理后的图片内容
   */
  async processImageFile(file: File): Promise<FileContent> {
    return new Promise((resolve, reject) => {
      try {
        const reader = new FileReader();
        reader.onload = (event) => {
          if (!event.target || !event.target.result) {
            reject(new Error('读取文件失败'));
            return;
          }

          const base64Data = event.target.result as string;
          const img = new Image();
          img.onload = () => {
            const fileContent: FileContent = {
              name: file.name,
              mimeType: file.type,
              extension: file.name.split('.').pop() || '',
              size: file.size,
              base64Data,
              url: '',
              width: img.width,
              height: img.height,
            };
            resolve(fileContent);
          };
          img.onerror = () => {
            // 图片加载失败，但仍然返回基本信息
            resolve({
              name: file.name,
              mimeType: file.type,
              extension: file.name.split('.').pop() || '',
              size: file.size,
              base64Data,
              url: '',
            });
          };
          img.src = base64Data;
        };
        reader.onerror = () => {
          reject(new Error('读取文件失败'));
        };
        reader.readAsDataURL(file);
      } catch (error) {
        reject(error);
      }
    });
  },

  /**
   * 根据MIME类型获取文件图标
   * @param mimeType 文件MIME类型
   * @returns 文件图标名称
   */
  getFileIconByMimeType(mimeType: string): string {
    if (mimeType.startsWith('image/')) {
      return 'image';
    } else if (mimeType.startsWith('video/')) {
      return 'video';
    } else if (mimeType.startsWith('audio/')) {
      return 'audio';
    } else if (mimeType.includes('pdf')) {
      return 'picture_as_pdf';
    } else if (mimeType.includes('word') || mimeType.includes('document')) {
      return 'description';
    } else if (mimeType.includes('spreadsheet') || mimeType.includes('excel')) {
      return 'table_chart';
    } else if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) {
      return 'slideshow';
    } else if (mimeType.includes('text/')) {
      return 'text_snippet';
    } else {
      return 'insert_drive_file';
    }
  },

  /**
   * 格式化文件大小
   * @param bytes 文件大小（字节）
   * @returns 格式化后的文件大小字符串
   */
  formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sizes[i];
  }
};