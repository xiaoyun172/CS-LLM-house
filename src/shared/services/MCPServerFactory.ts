import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { BraveSearchServer } from './mcpServers/BraveSearchServer';
import { FetchServer } from './mcpServers/FetchServer';
import { MemoryServer } from './mcpServers/MemoryServer';
import { ThinkingServer } from './mcpServers/ThinkingServer';
import { FileSystemServer } from './mcpServers/FileSystemServer';
import { DifyKnowledgeServer } from './mcpServers/DifyKnowledgeServer';
import { LocalGoogleSearchServer } from './mcpServers/LocalGoogleSearchServer';

/**
 * 创建内存 MCP 服务器
 * 移植自最佳实例的内置服务器工厂
 */
export function createInMemoryMCPServer(name: string, args: string[] = [], envs: Record<string, string> = {}): Server {
  console.log(`[MCP] 创建内存 MCP 服务器: ${name}，参数: ${args}，环境变量: ${JSON.stringify(envs)}`);

  switch (name) {
    case '@aether/memory': {
      const envPath = envs.MEMORY_FILE_PATH;
      return new MemoryServer(envPath).server;
    }

    case '@aether/sequentialthinking': {
      return new ThinkingServer().server;
    }

    case '@aether/brave-search': {
      return new BraveSearchServer(envs.BRAVE_API_KEY).server;
    }

    case '@aether/fetch': {
      return new FetchServer().server;
    }

    case '@aether/filesystem': {
      return new FileSystemServer(args).server;
    }

    case '@aether/dify-knowledge': {
      const difyKey = envs.DIFY_KEY;
      return new DifyKnowledgeServer(difyKey, args).server;
    }

    case '@aether/local-google-search': {
      return new LocalGoogleSearchServer().server;
    }

    default:
      throw new Error(`未知的内置 MCP 服务器: ${name}`);
  }
}

/**
 * 获取内置 MCP 服务器列表
 */
export function getBuiltinMCPServers() {
  return [
    {
      id: 'builtin-memory',
      name: '@aether/memory',
      type: 'inMemory' as const,
      description: '基于本地知识图谱的持久性记忆基础实现。这使得模型能够在不同对话间记住用户的相关信息。需要配置 MEMORY_FILE_PATH 环境变量。',
      isActive: false,
      env: {
        MEMORY_FILE_PATH: 'memory.json'
      },
      provider: 'AetherAI',
      logoUrl: '',
      tags: ['记忆', '知识图谱']
    },
    {
      id: 'builtin-thinking',
      name: '@aether/sequentialthinking',
      type: 'inMemory' as const,
      description: '一个 MCP 服务器实现，提供了通过结构化思维过程进行动态和反思性问题解决的工具',
      isActive: false,
      provider: 'AetherAI',
      logoUrl: '',
      tags: ['思维', '推理']
    },
    {
      id: 'builtin-brave-search',
      name: '@aether/brave-search',
      type: 'inMemory' as const,
      description: '一个集成了 Brave 搜索 API 的 MCP 服务器实现，提供网页与本地搜索双重功能。需要配置 BRAVE_API_KEY 环境变量',
      isActive: false,
      env: {
        BRAVE_API_KEY: 'YOUR_API_KEY'
      },
      provider: 'AetherAI',
      logoUrl: '',
      tags: ['搜索', 'Brave']
    },
    {
      id: 'builtin-fetch',
      name: '@aether/fetch',
      type: 'inMemory' as const,
      description: '用于获取 URL 网页内容的 MCP 服务器',
      isActive: false,
      provider: 'AetherAI',
      logoUrl: '',
      tags: ['网页', '抓取']
    },
    {
      id: 'builtin-filesystem',
      name: '@aether/filesystem',
      type: 'inMemory' as const,
      description: '实现文件系统操作的模型上下文协议（MCP）的 Node.js 服务器',
      isActive: false,
      provider: 'AetherAI',
      logoUrl: '',
      tags: ['文件系统', '文件操作']
    },
    {
      id: 'builtin-dify-knowledge',
      name: '@aether/dify-knowledge',
      type: 'inMemory' as const,
      description: 'Dify 知识库集成服务器，提供知识库搜索功能。需要配置 DIFY_KEY 环境变量',
      isActive: false,
      env: {
        DIFY_KEY: 'YOUR_DIFY_KEY'
      },
      provider: 'AetherAI',
      logoUrl: '',
      tags: ['Dify', '知识库']
    },
    {
      id: 'builtin-local-google-search',
      name: '@aether/local-google-search',
      type: 'inMemory' as const,
      description: '本地 Google 和 Bing 搜索服务器，提供免费的网络搜索功能，无需 API 密钥',
      isActive: false,
      provider: 'AetherAI',
      logoUrl: '',
      tags: ['搜索', 'Google', 'Bing', '免费']
    }
  ];
}

/**
 * 检查服务器是否为内置服务器
 */
export function isBuiltinServer(serverName: string): boolean {
  const builtinNames = [
    '@aether/memory',
    '@aether/sequentialthinking',
    '@aether/brave-search',
    '@aether/fetch',
    '@aether/filesystem',
    '@aether/dify-knowledge',
    '@aether/local-google-search'
  ];
  return builtinNames.includes(serverName);
}

/**
 * 获取内置服务器的默认配置
 */
export function getBuiltinServerConfig(serverName: string) {
  const servers = getBuiltinMCPServers();
  return servers.find(server => server.name === serverName);
}
