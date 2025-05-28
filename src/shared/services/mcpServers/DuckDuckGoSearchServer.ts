/**
 * DuckDuckGo 搜索 MCP 服务器
 * 提供无需API密钥的网页搜索功能
 */
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema
} from '@modelcontextprotocol/sdk/types.js';
import { searchService } from '../SearchService';
import type { SearchResult } from '../../types/search';

// DuckDuckGo 搜索工具定义
const DDG_SEARCH_TOOL = {
  name: 'web_search',
  description: '使用DuckDuckGo搜索网页信息，无需API密钥',
  inputSchema: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: '搜索查询词'
      },
      maxResults: {
        type: 'number',
        description: '最大结果数量',
        default: 3
      }
    },
    required: ['query']
  }
};

// 验证搜索参数
function isWebSearchArgs(args: any): args is { query: string; maxResults?: number } {
  return typeof args === 'object' && 
         args !== null && 
         typeof args.query === 'string' && 
         (args.maxResults === undefined || typeof args.maxResults === 'number');
}

// 执行搜索并格式化结果
async function performWebSearch(query: string, maxResults: number = 3): Promise<string> {
  try {
    const results = await searchService.search(query, { maxResults });
    
    if (!results || results.length === 0) {
      return '未找到搜索结果。';
    }

    // 格式化搜索结果
    const formattedResults = results.map((result: SearchResult, index: number) => {
      return `[${index + 1}] "${result.title}"\n${result.body}\n来源: ${result.href}\n`;
    }).join('\n');

    return `### DuckDuckGo 搜索结果: "${query}"\n\n${formattedResults}`;
  } catch (error) {
    console.error('DuckDuckGo搜索失败:', error);
    if (error instanceof Error) {
      return `搜索失败: ${error.message}`;
    }
    return '搜索过程中发生未知错误。';
  }
}

export class DuckDuckGoSearchServer {
  public server: Server;

  constructor() {
    this.server = new Server(
      {
        name: 'duckduckgo-search-server',
        version: '1.0.0'
      },
      {
        capabilities: {
          tools: {}
        }
      }
    );

    this.initialize();
  }

  initialize() {
    // 工具处理器
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [DDG_SEARCH_TOOL]
    }));

    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      try {
        const { name, arguments: args } = request.params;

        if (!args) {
          throw new Error('未提供参数');
        }

        switch (name) {
          case 'web_search': {
            if (!isWebSearchArgs(args)) {
              throw new Error('web_search 的参数无效');
            }
            const { query, maxResults = 3 } = args;
            const results = await performWebSearch(query, maxResults);
            return {
              content: [{ type: 'text', text: results }],
              isError: false
            };
          }

          default:
            return {
              content: [{ type: 'text', text: `未知工具: ${name}` }],
              isError: true
            };
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        return {
          content: [{ type: 'text', text: `错误: ${errorMessage}` }],
          isError: true
        };
      }
    });
  }
} 