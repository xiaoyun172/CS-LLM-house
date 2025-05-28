import type { MCPServer, MCPTool, MCPPrompt, MCPResource, MCPCallToolResponse, MCPServerType } from '../types';
import { getStorageItem, setStorageItem } from '../utils/storage';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createInMemoryMCPServer } from './MCPServerFactory';
import { createSSEProxyUrl, createHTTPProxyUrl, logProxyUsage } from '../utils/mcpProxy';
import { CustomHTTPTransport } from '../utils/CustomHTTPTransport';
import { Capacitor } from '@capacitor/core';

/**
 * 构建函数调用工具名称 - 参考最佳实例逻辑
 */
function buildFunctionCallToolName(serverName: string, toolName: string): string {
  const sanitizedServer = serverName.trim().replace(/-/g, '_');
  const sanitizedTool = toolName.trim().replace(/-/g, '_');

  // Combine server name and tool name
  let name = sanitizedTool;
  if (!sanitizedTool.includes(sanitizedServer.slice(0, 7))) {
    name = `${sanitizedServer.slice(0, 7) || ''}-${sanitizedTool || ''}`;
  }

  // Replace invalid characters with underscores or dashes
  // Keep a-z, A-Z, 0-9, underscores and dashes
  name = name.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Ensure name starts with a letter or underscore (for valid JavaScript identifier)
  if (!/^[a-zA-Z]/.test(name)) {
    name = `tool-${name}`;
  }

  // Remove consecutive underscores/dashes (optional improvement)
  name = name.replace(/[_-]{2,}/g, '_');

  // Truncate to 63 characters maximum
  if (name.length > 63) {
    name = name.slice(0, 63);
  }

  // Handle edge case: ensure we still have a valid name if truncation left invalid chars at edges
  if (name.endsWith('_') || name.endsWith('-')) {
    name = name.slice(0, -1);
  }

  return name;
}

/**
 * MCP 服务管理类
 * 负责管理 MCP 服务器的配置、连接和工具调用
 */
export class MCPService {
  private static instance: MCPService;
  private servers: MCPServer[] = [];
  private clients: Map<string, Client> = new Map();

  private constructor() {
    this.loadServers();
  }

  public static getInstance(): MCPService {
    if (!MCPService.instance) {
      MCPService.instance = new MCPService();
    }
    return MCPService.instance;
  }

  /**
   * 从存储加载 MCP 服务器配置
   */
  private async loadServers(): Promise<void> {
    try {
      const savedServers = await getStorageItem<MCPServer[]>('mcp_servers');
      if (savedServers) {
        this.servers = savedServers;
      }
    } catch (error) {
      console.error('[MCP] 加载服务器配置失败:', error);
    }
  }

  /**
   * 保存 MCP 服务器配置到存储
   */
  private async saveServers(): Promise<void> {
    try {
      await setStorageItem('mcp_servers', this.servers);
    } catch (error) {
      console.error('[MCP] 保存服务器配置失败:', error);
    }
  }

  /**
   * 获取所有 MCP 服务器
   */
  public getServers(): MCPServer[] {
    return [...this.servers];
  }

  /**
   * 列出所有服务器（与getServers功能相同，但用于兼容其他代码）
   */
  public async listServers(): Promise<MCPServer[]> {
    return this.getServers();
  }

  /**
   * 获取活跃的 MCP 服务器
   */
  public getActiveServers(): MCPServer[] {
    return this.servers.filter(server => server.isActive);
  }

  /**
   * 根据 ID 获取服务器
   */
  public getServerById(id: string): MCPServer | undefined {
    return this.servers.find(server => server.id === id);
  }

  /**
   * 添加新的 MCP 服务器
   */
  public async addServer(server: MCPServer): Promise<void> {
    this.servers.push(server);
    await this.saveServers();
  }

  /**
   * 更新 MCP 服务器
   */
  public async updateServer(updatedServer: MCPServer): Promise<void> {
    const index = this.servers.findIndex(server => server.id === updatedServer.id);
    if (index !== -1) {
      this.servers[index] = updatedServer;
      await this.saveServers();
    }
  }

  /**
   * 删除 MCP 服务器
   */
  public async removeServer(serverId: string): Promise<void> {
    this.servers = this.servers.filter(server => server.id !== serverId);
    // 清理客户端连接
    this.clients.delete(serverId);
    await this.saveServers();
  }

  /**
   * 启动/停止服务器
   */
  public async toggleServer(serverId: string, isActive: boolean): Promise<void> {
    const server = this.getServerById(serverId);
    if (server) {
      const serverKey = this.getServerKey(server);

      if (!isActive) {
        // 停止时清理客户端连接
        await this.closeClient(serverKey);
      }

      server.isActive = isActive;
      await this.saveServers();

      // 如果启动服务器，尝试初始化连接
      if (isActive) {
        try {
          await this.initClient(server);
          console.log(`[MCP] 服务器已启动: ${server.name}`);
        } catch (error) {
          console.error(`[MCP] 启动服务器失败: ${server.name}`, error);
          // 启动失败时回滚状态
          server.isActive = false;
          await this.saveServers();
          throw error;
        }
      }
    }
  }

  /**
   * 获取服务器的唯一键
   */
  private getServerKey(server: MCPServer): string {
    return `${server.name}-${server.type}-${server.baseUrl || 'local'}`;
  }

  /**
   * 初始化 MCP 客户端
   */
  private async initClient(server: MCPServer): Promise<Client> {
    const serverKey = this.getServerKey(server);

    // 检查是否已有客户端连接
    const existingClient = this.clients.get(serverKey);
    if (existingClient) {
      console.log(`[MCP] 复用现有连接: ${server.name}`);
      return existingClient;
    }

    // 创建新的客户端
    const client = new Client(
      { name: 'AetherLink Mobile', version: '1.0.0' },
      { capabilities: {} }
    );

    try {
      let transport;

      // 根据服务器类型创建传输层
      if (server.type === 'inMemory') {
        console.log(`[MCP] 创建内存传输: ${server.name}`);
        const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

        // 创建内存服务器
        const inMemoryServer = createInMemoryMCPServer(server.name, server.args || [], server.env || {});
        await inMemoryServer.connect(serverTransport);

        transport = clientTransport;
      } else if (server.type === 'sse') {
        if (!server.baseUrl) {
          throw new Error('SSE 服务器需要提供 baseUrl');
        }

        if (Capacitor.isNativePlatform()) {
          // 移动端：使用自定义 SSE 传输，直接连接原始 URL，绕过 CORS
          console.log(`[MCP] 创建原生 SSE 传输: ${server.baseUrl}`);
          const { CustomSSETransport } = await import('../utils/CustomSSETransport');
          transport = new CustomSSETransport(new URL(server.baseUrl), {
            headers: server.headers || {},
            heartbeatTimeout: (server.timeout || 60) * 1000
          });
        } else {
          // Web 端：使用代理解决 CORS 问题
          const finalUrl = createSSEProxyUrl(server.baseUrl);
          logProxyUsage(server.baseUrl, finalUrl, 'SSE');

          console.log(`[MCP] 创建 SSE 传输: ${finalUrl}`);

          const { SSEClientTransport } = await import('@modelcontextprotocol/sdk/client/sse.js');
          transport = new SSEClientTransport(new URL(finalUrl));
        }
      } else if (server.type === 'streamableHttp') {
        if (!server.baseUrl) {
          throw new Error('HTTP 流服务器需要提供 baseUrl');
        }

        const isNative = Capacitor.isNativePlatform();
        console.log(`[MCP] 平台检测结果: isNative=${isNative}, platform=${Capacitor.getPlatform()}`);

        if (isNative) {
          // 移动端：使用自定义 HTTP 传输，直接连接原始 URL，绕过 CORS
          console.log(`[MCP] 创建原生 HTTP 流传输: ${server.baseUrl}`);
          transport = new CustomHTTPTransport(new URL(server.baseUrl), {
            headers: server.headers || {},
            timeout: (server.timeout || 60) * 1000
          });
        } else {
          // Web 端：使用代理解决 CORS 问题
          const finalUrl = createHTTPProxyUrl(server.baseUrl);
          logProxyUsage(server.baseUrl, finalUrl, 'HTTP');

          console.log(`[MCP] 创建 HTTP 流传输: ${finalUrl}`);
          transport = new StreamableHTTPClientTransport(new URL(finalUrl), {
            requestInit: {
              headers: server.headers || {}
            }
          });
        }
      } else {
        throw new Error(`不支持的服务器类型: ${server.type}`);
      }

      // 连接客户端
      await client.connect(transport);

      // 缓存客户端
      this.clients.set(serverKey, client);

      console.log(`[MCP] 成功连接到服务器: ${server.name}`);
      return client;
    } catch (error) {
      console.error(`[MCP] 连接服务器失败: ${server.name}`, error);
      throw error;
    }
  }

  /**
   * 关闭客户端连接
   */
  private async closeClient(serverKey: string): Promise<void> {
    const client = this.clients.get(serverKey);
    if (client) {
      try {
        await client.close();
      } catch (error) {
        console.error(`[MCP] 关闭客户端连接失败:`, error);
      }
      this.clients.delete(serverKey);
    }
  }

  /**
   * 测试服务器连接
   */
  public async testConnection(server: MCPServer): Promise<boolean> {
    try {
      console.log(`[MCP] 测试连接到服务器: ${server.name}`);

      const client = await this.initClient(server);

      // 尝试列出工具来测试连接
      await client.listTools();

      console.log(`[MCP] 连接测试成功: ${server.name}`);
      return true;
    } catch (error) {
      console.error(`[MCP] 连接测试失败: ${server.name}`, error);

      // 清理失败的连接
      const serverKey = this.getServerKey(server);
      await this.closeClient(serverKey);

      return false;
    }
  }

  /**
   * 获取服务器工具列表
   */
  public async listTools(server: MCPServer): Promise<MCPTool[]> {
    try {
      console.log(`[MCP] 获取服务器工具: ${server.name}`);

      const client = await this.initClient(server);
      console.log(`[MCP] 客户端已连接，正在调用 listTools...`);

      const result = await client.listTools();
      console.log(`[MCP] listTools 响应:`, result);

      const tools = result.tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        inputSchema: tool.inputSchema,
        serverName: server.name,
        serverId: server.id,
        id: buildFunctionCallToolName(server.name, tool.name)
      }));

      console.log(`[MCP] 服务器 ${server.name} 返回 ${tools.length} 个工具:`, tools.map(t => t.name));
      return tools;
    } catch (error) {
      console.error(`[MCP] 获取工具列表失败:`, error);
      return [];
    }
  }

  /**
   * 调用 MCP 工具
   */
  public async callTool(
    server: MCPServer,
    toolName: string,
    args: Record<string, any>
  ): Promise<MCPCallToolResponse> {
    try {
      console.log(`[MCP] 调用工具: ${server.name}.${toolName}`, args);

      const client = await this.initClient(server);
      const result = await client.callTool(
        { name: toolName, arguments: args },
        undefined,
        { timeout: (server.timeout || 60) * 1000 }
      );

      return {
        content: result.content as Array<{
          type: 'text' | 'image' | 'resource';
          text?: string;
          data?: string;
          mimeType?: string;
        }>,
        isError: Boolean(result.isError)
      };
    } catch (error) {
      console.error(`[MCP] 工具调用失败:`, error);
      return {
        content: [
          {
            type: 'text',
            text: `工具调用失败: ${error instanceof Error ? error.message : '未知错误'}`
          }
        ],
        isError: true
      };
    }
  }

  /**
   * 获取服务器提示词列表
   */
  public async listPrompts(server: MCPServer): Promise<MCPPrompt[]> {
    try {
      console.log(`[MCP] 获取服务器提示词: ${server.name}`);

      const client = await this.initClient(server);
      const result = await client.listPrompts();

      return result.prompts.map(prompt => ({
        name: prompt.name,
        description: prompt.description,
        arguments: prompt.arguments,
        serverName: server.name,
        serverId: server.id
      }));
    } catch (error) {
      // 如果是 Method not found 错误，说明服务器不支持此功能，静默处理
      if (error instanceof Error && error.message.includes('-32601')) {
        console.log(`[MCP] 服务器 ${server.name} 不支持提示词功能`);
        return [];
      }
      console.error(`[MCP] 获取提示词列表失败:`, error);
      return [];
    }
  }

  /**
   * 获取服务器资源列表
   */
  public async listResources(server: MCPServer): Promise<MCPResource[]> {
    try {
      console.log(`[MCP] 获取服务器资源: ${server.name}`);

      const client = await this.initClient(server);
      const result = await client.listResources();

      return result.resources.map(resource => ({
        uri: resource.uri,
        name: resource.name,
        description: resource.description,
        mimeType: resource.mimeType,
        serverName: server.name,
        serverId: server.id
      }));
    } catch (error) {
      // 如果是 Method not found 错误，说明服务器不支持此功能，静默处理
      if (error instanceof Error && error.message.includes('-32601')) {
        console.log(`[MCP] 服务器 ${server.name} 不支持资源功能`);
        return [];
      }
      console.error(`[MCP] 获取资源列表失败:`, error);
      return [];
    }
  }

  /**
   * 停止服务器
   */
  public async stopServer(serverId: string): Promise<void> {
    const server = this.getServerById(serverId);
    if (server) {
      const serverKey = this.getServerKey(server);
      await this.closeClient(serverKey);
      console.log(`[MCP] 服务器已停止: ${server.name}`);
    }
  }

  /**
   * 重启服务器
   */
  public async restartServer(serverId: string): Promise<void> {
    const server = this.getServerById(serverId);
    if (server) {
      console.log(`[MCP] 重启服务器: ${server.name}`);
      const serverKey = this.getServerKey(server);
      await this.closeClient(serverKey);

      if (server.isActive) {
        // 重新初始化连接
        await this.initClient(server);
      }
    }
  }

  /**
   * 获取内置服务器列表
   */
  public getBuiltinServers(): MCPServer[] {
    // 直接返回硬编码列表，避免动态导入问题
    return [
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
      }
    ];
  }

  /**
   * 添加内置服务器
   */
  public async addBuiltinServer(serverName: string, config?: Partial<MCPServer>): Promise<void> {
    try {
      // 从内置服务器列表中查找配置
      const builtinServers = this.getBuiltinServers();
      const defaultConfig = builtinServers.find(server => server.name === serverName);

      if (!defaultConfig) {
        throw new Error(`未找到内置服务器: ${serverName}`);
      }

      // 合并配置
      const serverConfig: MCPServer = {
        ...defaultConfig,
        ...config,
        id: config?.id || `builtin-${Date.now()}`,
        name: serverName,
        isActive: config?.isActive !== undefined ? config.isActive : true
      };

      // 添加到服务器列表
      await this.addServer(serverConfig);
      console.log(`[MCP] 成功添加内置服务器: ${serverName}`);
    } catch (error) {
      console.error(`[MCP] 添加内置服务器失败: ${serverName}`, error);
      throw error;
    }
  }

  /**
   * 检查服务器是否为内置服务器
   */
  public isBuiltinServer(serverName: string): boolean {
    const builtinNames = [
      '@aether/memory',
      '@aether/sequentialthinking',
      '@aether/brave-search',
      '@aether/fetch',
      '@aether/filesystem',
      '@aether/dify-knowledge'
    ];
    return builtinNames.includes(serverName);
  }

  /**
   * 获取所有可用的 MCP 工具
   */
  public async getAllAvailableTools(): Promise<MCPTool[]> {
    const allServers = this.getServers();
    const activeServers = this.getActiveServers();
    const allTools: MCPTool[] = [];

    console.log(`[MCP] 总服务器数量: ${allServers.length}, 活跃服务器数量: ${activeServers.length}`);

    if (allServers.length > 0) {
      console.log(`[MCP] 所有服务器:`, allServers.map(s => `${s.name}(${s.isActive ? '活跃' : '非活跃'})`).join(', '));
    }

    if (activeServers.length === 0) {
      console.log(`[MCP] 没有活跃的 MCP 服务器`);
      return allTools;
    }

    for (const server of activeServers) {
      try {
        console.log(`[MCP] 正在获取服务器 ${server.name} 的工具...`);
        const tools = await this.listTools(server);
        console.log(`[MCP] 服务器 ${server.name} 提供 ${tools.length} 个工具`);
        allTools.push(...tools);
      } catch (error) {
        console.error(`[MCP] 获取服务器 ${server.name} 的工具失败:`, error);
      }
    }

    return allTools;
  }

  /**
   * 清理所有连接
   */
  public async cleanup(): Promise<void> {
    const promises = Array.from(this.clients.keys()).map(key => this.closeClient(key));
    await Promise.all(promises);
    console.log('[MCP] 所有连接已清理');
  }

  /**
   * 初始化搜索服务器，确保DuckDuckGo搜索服务可用
   */
  public async initializeSearchService(): Promise<void> {
    try {
      console.log('[MCP] 初始化DuckDuckGo搜索服务');
      
      // 检查是否已添加DuckDuckGo搜索服务器
      const servers = await this.listServers();
      const duckduckgoServer = servers.find((server: MCPServer) => server.name === '@aether/duckduckgo-search');
      
      if (!duckduckgoServer) {
        // 如果服务器未添加，添加并启用搜索服务
        console.log('[MCP] 添加DuckDuckGo搜索服务器');
        
        const newServer: MCPServer = {
          id: 'builtin-duckduckgo-search',
          name: '@aether/duckduckgo-search',
          type: 'inMemory' as MCPServerType,
          description: '基于DuckDuckGo的免费网络搜索服务，无需API密钥，在对话中提供实时搜索结果',
          isActive: true,
          provider: 'AetherAI',
          logoUrl: '',
          tags: ['搜索', 'DuckDuckGo', '免费']
        };
        
        await this.addServer(newServer);
        console.log('[MCP] DuckDuckGo搜索服务器已添加');
      } else if (!duckduckgoServer.isActive) {
        // 如果服务器存在但未激活，则激活它
        console.log('[MCP] 激活DuckDuckGo搜索服务器');
        await this.toggleServer(duckduckgoServer.id, true);
      }
      
      console.log('[MCP] DuckDuckGo搜索服务初始化完成');
    } catch (error) {
      console.error('[MCP] 初始化DuckDuckGo搜索服务失败:', error);
    }
  }
}

// 导出单例实例
export const mcpService = MCPService.getInstance();
