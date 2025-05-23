/**
 * 文件处理工具
 * 提供文件处理相关的工具函数
 */

/**
 * 文件类型接口
 */
export interface FileType {
  id: string;
  name?: string;
  origin_name?: string;
  ext?: string;
  mimeType?: string;
  size?: number;
  type?: string;
  path?: string;
  url?: string;
  content?: string;
  base64?: string;
  base64Data?: string;
}

/**
 * 文件类型枚举
 */
export const FileTypes = {
  IMAGE: 'image',
  TEXT: 'text',
  CODE: 'code',
  DOCUMENT: 'document',
  AUDIO: 'audio',
  VIDEO: 'video',
  ARCHIVE: 'archive',
  BINARY: 'binary',
  UNKNOWN: 'unknown'
}

/**
 * 根据文件扩展名判断文件类型
 * @param filename 文件名
 * @returns 文件类型
 */
export function getFileTypeByExtension(filename: string): string {
  if (!filename) return FileTypes.UNKNOWN;

  const ext = filename.split('.').pop()?.toLowerCase() || '';

  // 图片文件
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp', 'ico', 'tiff', 'tif'].includes(ext)) {
    return FileTypes.IMAGE;
  }

  // 代码文件
  if (['js', 'ts', 'jsx', 'tsx', 'py', 'java', 'cpp', 'c', 'h', 'cs', 'php', 'rb', 'go', 'rs', 'swift', 'kt', 'scala', 'sh', 'bat', 'ps1', 'sql', 'r', 'matlab', 'm', 'pl', 'lua', 'dart', 'vue', 'svelte'].includes(ext)) {
    return FileTypes.CODE;
  }

  // 文本文件
  if (['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'html', 'htm', 'css'].includes(ext)) {
    return FileTypes.TEXT;
  }

  // 文档文件
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'odt', 'ods', 'odp', 'rtf'].includes(ext)) {
    return FileTypes.DOCUMENT;
  }

  // 音频文件
  if (['mp3', 'wav', 'ogg', 'flac', 'aac', 'm4a', 'wma'].includes(ext)) {
    return FileTypes.AUDIO;
  }

  // 视频文件
  if (['mp4', 'avi', 'mov', 'wmv', 'flv', 'mkv', 'webm'].includes(ext)) {
    return FileTypes.VIDEO;
  }

  // 压缩文件
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2'].includes(ext)) {
    return FileTypes.ARCHIVE;
  }

  // 二进制文件
  if (['exe', 'dll', 'so', 'bin', 'dat'].includes(ext)) {
    return FileTypes.BINARY;
  }

  return FileTypes.UNKNOWN;
}

/**
 * 根据MIME类型判断文件类型
 * @param mimeType MIME类型
 * @returns 文件类型
 */
export function getFileTypeByMimeType(mimeType: string): string {
  if (!mimeType) return FileTypes.UNKNOWN;

  const type = mimeType.split('/')[0];
  const subtype = mimeType.split('/')[1];

  switch (type) {
    case 'image':
      return FileTypes.IMAGE;
    case 'text':
      return FileTypes.TEXT;
    case 'audio':
      return FileTypes.AUDIO;
    case 'video':
      return FileTypes.VIDEO;
    case 'application':
      if (['pdf', 'msword', 'vnd.openxmlformats-officedocument.wordprocessingml.document',
           'vnd.ms-excel', 'vnd.openxmlformats-officedocument.spreadsheetml.sheet',
           'vnd.ms-powerpoint', 'vnd.openxmlformats-officedocument.presentationml.presentation',
           'rtf', 'vnd.oasis.opendocument.text', 'vnd.oasis.opendocument.spreadsheet',
           'vnd.oasis.opendocument.presentation'].includes(subtype)) {
        return FileTypes.DOCUMENT;
      }
      if (['zip', 'x-rar-compressed', 'x-7z-compressed', 'x-tar', 'x-gzip', 'x-bzip2'].includes(subtype)) {
        return FileTypes.ARCHIVE;
      }
      if (['json', 'xml'].includes(subtype)) {
        return FileTypes.TEXT;
      }
      if (['octet-stream', 'x-msdownload', 'x-executable'].includes(subtype)) {
        return FileTypes.BINARY;
      }
      break;
    default:
      break;
  }

  return FileTypes.UNKNOWN;
}

/**
 * 获取文件的MIME类型
 * @param file 文件对象
 * @returns MIME类型
 */
export function getFileMimeType(file: FileType): string {
  if (file.mimeType) return file.mimeType;

  const ext = file.ext?.toLowerCase() || '';

  switch (ext) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg';
    case '.png':
      return 'image/png';
    case '.gif':
      return 'image/gif';
    case '.webp':
      return 'image/webp';
    case '.svg':
      return 'image/svg+xml';
    case '.pdf':
      return 'application/pdf';
    case '.txt':
      return 'text/plain';
    case '.md':
    case '.markdown':
      return 'text/markdown';
    case '.html':
    case '.htm':
      return 'text/html';
    case '.css':
      return 'text/css';
    case '.js':
      return 'application/javascript';
    case '.json':
      return 'application/json';
    case '.xml':
      return 'application/xml';
    case '.csv':
      return 'text/csv';
    default:
      return 'application/octet-stream';
  }
}

/**
 * 读取文件内容
 * @param file 文件对象
 * @returns 文件内容
 */
export async function readFileContent(file: FileType): Promise<string> {
  try {
    // 动态导入文件存储服务以避免循环依赖
    const { mobileFileStorage } = await import('../services/MobileFileStorageService');

    // 使用文件存储服务读取文件内容
    return await mobileFileStorage.readFile(file.id);
  } catch (error) {
    console.error('[fileUtils.readFileContent] 读取文件内容失败:', error);

    // 降级处理：返回文件基本信息
    return `文件: ${file.origin_name || file.name || '未知文件'}\n类型: ${file.type || '未知'}\n大小: ${file.size || 0} bytes`;
  }
}

/**
 * 将文件转换为Base64
 * @param file 文件对象
 * @returns Base64编码的文件内容
 */
export async function fileToBase64(file: FileType): Promise<string> {
  try {
    // 动态导入文件存储服务以避免循环依赖
    const { mobileFileStorage } = await import('../services/MobileFileStorageService');

    // 使用文件存储服务获取base64数据
    const result = await mobileFileStorage.getFileBase64(file.id);
    return result.data;
  } catch (error) {
    console.error('[fileUtils.fileToBase64] 转换文件为Base64失败:', error);

    // 降级处理：返回占位符
    return `data:${getFileMimeType(file)};base64,`;
  }
}


