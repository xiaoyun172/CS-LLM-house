/**
 * 文件处理工具
 * 提供文件处理相关的工具函数
 */

/**
 * 文件类型接口
 */
export interface FileType {
  name?: string;
  origin_name?: string;
  ext?: string;
  mimeType?: string;
  size?: number;
  path?: string;
  url?: string;
  content?: string;
  base64?: string;
}

/**
 * 文件类型枚举
 */
export const FileTypes = {
  IMAGE: 'image',
  TEXT: 'text',
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

  // 文本文件
  if (['txt', 'md', 'markdown', 'csv', 'json', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'jsx', 'tsx'].includes(ext)) {
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
  // 这里应该实现实际的文件读取逻辑
  // 在移动端环境中，可能需要使用特定的API

  // 模拟实现，实际应用中需要替换为真实的文件读取逻辑
  return `文件内容: ${file.name || file.origin_name || '未知文件'}`;
}

/**
 * 将文件转换为Base64
 * @param file 文件对象
 * @returns Base64编码的文件内容
 */
export async function fileToBase64(file: FileType): Promise<string> {
  // 这里应该实现实际的文件转Base64逻辑
  // 在移动端环境中，可能需要使用特定的API

  // 模拟实现，实际应用中需要替换为真实的转换逻辑
  return `data:${getFileMimeType(file)};base64,mockBase64Content`;
}

/**
 * 查找消息中的文件块
 * @param message 消息对象
 * @returns 文件块数组
 */
export function findFileBlocks(message: any): any[] {
  if (!message || !message.blocks || message.blocks.length === 0) {
    return [];
  }

  // 在移动端环境中，可能需要使用不同的方式获取文件块
  // 这里使用简化的实现

  return message.blocks
    .filter((blockId: string) => {
      const block = message.blockMap?.[blockId];
      return block && block.type === 'file';
    })
    .map((blockId: string) => message.blockMap?.[blockId]) || [];
}
