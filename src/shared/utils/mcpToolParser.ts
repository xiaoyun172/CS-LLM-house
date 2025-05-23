import type { MCPTool, MCPToolResponse, MCPCallToolResponse } from '../types';
import { mcpService } from '../services/MCPService';

/**
 * 解析 XML 格式的工具调用
 * 支持两种格式：
 * 1. <tool_use><name>工具名</name><arguments>参数</arguments></tool_use>
 * 2. <tool_name>参数</tool_name> (提示词注入模式)
 */
export function parseToolUse(content: string, mcpTools: MCPTool[]): MCPToolResponse[] {
  if (!content || !mcpTools || mcpTools.length === 0) {
    return [];
  }

  // 工具使用模式：<tool_use><name>工具名</name><arguments>参数</arguments></tool_use>
  const toolUsePattern = /<tool_use>([\s\S]*?)<name>([\s\S]*?)<\/name>([\s\S]*?)<arguments>([\s\S]*?)<\/arguments>([\s\S]*?)<\/tool_use>/g;
  const tools: MCPToolResponse[] = [];
  let match;
  let idx = 0;

  // 查找所有工具使用块
  while ((match = toolUsePattern.exec(content)) !== null) {
    const toolName = match[2].trim();
    const toolArgs = match[4].trim();

    // 尝试解析参数为 JSON
    let parsedArgs;
    try {
      parsedArgs = JSON.parse(toolArgs);
    } catch (error) {
      // 如果解析失败，使用原始字符串
      parsedArgs = toolArgs;
    }

    // 查找对应的 MCP 工具
    const mcpTool = mcpTools.find((tool) => tool.id === toolName || tool.name === toolName);
    if (!mcpTool) {
      console.error(`[MCP] 工具 "${toolName}" 未在 MCP 工具列表中找到`);
      continue;
    }

    // 添加到工具数组
    tools.push({
      id: `${toolName}-${idx++}`, // 为每个工具使用生成唯一ID
      tool: mcpTool,
      arguments: parsedArgs,
      status: 'pending'
    });
  }

  // 格式2：<tool_name>参数</tool_name> - 支持提示词注入模式
  mcpTools.forEach((mcpTool) => {
    const toolName = mcpTool.id || mcpTool.name;
    // 转义特殊字符以避免正则表达式错误
    const escapedToolName = toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const directPattern = new RegExp(`<${escapedToolName}>([\s\S]*?)<\/${escapedToolName}>`, 'g');
    let directMatch;

    while ((directMatch = directPattern.exec(content)) !== null) {
      const toolArgs = directMatch[1].trim();

      // 尝试解析参数为 JSON
      let parsedArgs;
      try {
        parsedArgs = JSON.parse(toolArgs);
      } catch (error) {
        // 如果不是 JSON，尝试作为简单字符串参数
        parsedArgs = { input: toolArgs };
      }

      tools.push({
        id: `${toolName}-${idx++}`,
        tool: mcpTool,
        arguments: parsedArgs,
        status: 'pending'
      });
    }
  });

  return tools;
}

/**
 * 调用 MCP 工具并返回结果
 */
export async function callMCPTool(toolResponse: MCPToolResponse): Promise<MCPCallToolResponse> {
  console.log(`[MCP] 调用工具: ${toolResponse.tool.serverName}.${toolResponse.tool.name}`, toolResponse.arguments);

  try {
    // 获取工具对应的服务器
    const server = mcpService.getServerById(toolResponse.tool.serverId);

    if (!server) {
      throw new Error(`服务器未找到: ${toolResponse.tool.serverName}`);
    }

    // 调用工具
    const response = await mcpService.callTool(
      server,
      toolResponse.tool.name,
      toolResponse.arguments
    );

    console.log(`[MCP] 工具调用成功: ${toolResponse.tool.serverName}.${toolResponse.tool.name}`, response);
    return response;
  } catch (error) {
    console.error(`[MCP] 工具调用失败: ${toolResponse.tool.serverName}.${toolResponse.tool.name}`, error);
    return {
      isError: true,
      content: [
        {
          type: 'text',
          text: `工具调用失败 ${toolResponse.tool.name}: ${error instanceof Error ? error.message : '未知错误'}`
        }
      ]
    };
  }
}

/**
 * 解析和调用工具
 * 支持批量处理多个工具调用
 */
export async function parseAndCallTools(
  content: string | MCPToolResponse[],
  mcpTools: MCPTool[] = [],
  onUpdate?: (toolResponse: MCPToolResponse, result: MCPCallToolResponse) => void
): Promise<MCPCallToolResponse[]> {
  const toolResults: MCPCallToolResponse[] = [];
  let currentToolResponses: MCPToolResponse[] = [];

  // 处理输入
  if (Array.isArray(content)) {
    currentToolResponses = content;
  } else {
    // 解析工具使用
    currentToolResponses = parseToolUse(content, mcpTools);
  }

  if (!currentToolResponses || currentToolResponses.length === 0) {
    return toolResults;
  }

  // 并行调用所有工具
  const toolPromises = currentToolResponses.map(async (toolResponse) => {
    try {
      // 更新状态为调用中（创建新对象避免只读属性问题）
      const mutableToolResponse = { ...toolResponse, status: 'invoking' as const };

      // 调用工具
      const result = await callMCPTool(mutableToolResponse);

      // 更新状态（创建新对象）
      const finalToolResponse = {
        ...mutableToolResponse,
        status: result.isError ? 'error' as const : 'done' as const,
        response: result
      };

      // 通知更新
      if (onUpdate) {
        onUpdate(finalToolResponse, result);
      }

      return result;
    } catch (error) {
      console.error(`[MCP] 工具调用异常:`, error);

      const errorResult: MCPCallToolResponse = {
        isError: true,
        content: [
          {
            type: 'text',
            text: `工具调用异常: ${error instanceof Error ? error.message : '未知错误'}`
          }
        ]
      };

      const errorToolResponse = {
        ...toolResponse,
        status: 'error' as const,
        response: errorResult
      };

      if (onUpdate) {
        onUpdate(errorToolResponse, errorResult);
      }

      return errorResult;
    }
  });

  // 等待所有工具调用完成
  const results = await Promise.all(toolPromises);
  toolResults.push(...results);

  return toolResults;
}

/**
 * 将 MCP 工具转换为 Anthropic 兼容的工具格式
 */
export function mcpToolsToAnthropicTools(mcpTools: MCPTool[]): any[] {
  return mcpTools.map((tool) => ({
    name: tool.id || tool.name,
    description: tool.description,
    input_schema: tool.inputSchema
  }));
}

/**
 * 将 MCP 工具转换为 OpenAI 兼容的工具格式
 */
export function mcpToolsToOpenAITools(mcpTools: MCPTool[]): any[] {
  return mcpTools.map((tool) => ({
    type: 'function',
    function: {
      name: tool.id || tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    }
  }));
}

/**
 * 将 MCP 工具转换为 Gemini 兼容的工具格式
 */
export function mcpToolsToGeminiTools(mcpTools: MCPTool[]): any[] {
  return mcpTools.map((tool) => ({
    functionDeclarations: [{
      name: tool.id || tool.name,
      description: tool.description,
      parameters: tool.inputSchema
    }]
  }));
}

/**
 * 将 MCP 工具调用响应转换为消息格式
 */
export function mcpToolCallResponseToMessage(
  toolResponse: MCPToolResponse,
  result: MCPCallToolResponse
): any {
  const message: any = {
    role: 'user',
    content: []
  };

  if (result.isError) {
    message.content = result.content.map(c => c.text).join('\n');
  } else {
    const content: any[] = [
      {
        type: 'text',
        text: `以下是 MCP 工具 \`${toolResponse.tool.name}\` 的调用结果:`
      }
    ];

    // 处理不同类型的内容
    for (const item of result.content) {
      switch (item.type) {
        case 'text':
          content.push({
            type: 'text',
            text: item.text || '无内容'
          });
          break;
        case 'image':
          if (item.data) {
            content.push({
              type: 'image',
              image_url: `data:${item.mimeType || 'image/png'};base64,${item.data}`
            });
          }
          break;
        default:
          content.push({
            type: 'text',
            text: `不支持的内容类型: ${item.type}`
          });
          break;
      }
    }

    message.content = content;
  }

  return message;
}

/**
 * 从内容中移除工具使用标签
 * 支持两种格式的移除
 */
export function removeToolUseTags(content: string): string {
  // 移除格式1：<tool_use>...</tool_use>
  let result = content.replace(/<tool_use>([\s\S]*?)<\/tool_use>/g, '');

  // 移除格式2：<tool_name>...</tool_name> (简单移除所有XML标签)
  result = result.replace(/<[a-zA-Z0-9_-]+>([\s\S]*?)<\/[a-zA-Z0-9_-]+>/g, '');

  return result.trim();
}

/**
 * 检查内容是否包含工具使用标签
 * 支持两种格式的检测
 */
export function hasToolUseTags(content: string, mcpTools: MCPTool[] = []): boolean {
  // 格式1：<tool_use>...</tool_use>
  const toolUsePattern = /<tool_use>([\s\S]*?)<name>([\s\S]*?)<\/name>([\s\S]*?)<arguments>([\s\S]*?)<\/arguments>([\s\S]*?)<\/tool_use>/;
  if (toolUsePattern.test(content)) {
    return true;
  }

  // 格式2：检查是否包含具体的工具名称标签
  if (mcpTools && mcpTools.length > 0) {
    for (const tool of mcpTools) {
      const toolName = tool.id || tool.name;
      const escapedToolName = toolName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const directPattern = new RegExp(`<${escapedToolName}>([\s\S]*?)<\/${escapedToolName}>`, 'g');
      if (directPattern.test(content)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * 获取 MCP 工具的系统提示词
 * 用于提示词注入模式
 */
export function getMCPSystemPrompt(mcpTools: MCPTool[]): string {
  if (!mcpTools || mcpTools.length === 0) {
    return '';
  }

  let systemPrompt = '\n\n# MCP 工具\n\n';
  systemPrompt += '你可以使用以下工具来帮助用户。使用工具时，请使用以下 XML 格式：\n\n';
  systemPrompt += '<tool_use>\n  <name>工具名称</name>\n  <arguments>{"参数": "值"}</arguments>\n</tool_use>\n\n';
  systemPrompt += '## 可用工具\n\n';

  mcpTools.forEach(tool => {
    systemPrompt += `### ${tool.name}\n`;
    if (tool.description) {
      systemPrompt += `${tool.description}\n`;
    }
    if (tool.inputSchema) {
      systemPrompt += `参数格式: ${JSON.stringify(tool.inputSchema, null, 2)}\n`;
    }
    systemPrompt += `服务器: ${tool.serverName}\n\n`;
  });

  systemPrompt += '请根据用户的需求选择合适的工具来协助完成任务。\n';

  return systemPrompt;
}
