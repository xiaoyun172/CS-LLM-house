/**
 * 自定义 HTTP 传输类，用于 MCP SDK，解决移动端 CORS 问题
 * 使用 Capacitor 的原生 HTTP 插件绕过 CORS 限制
 */

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { Capacitor } from '@capacitor/core';
import { CapacitorHttp } from '@capacitor/core';

export interface CustomHTTPTransportOptions {
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
}

export class CustomHTTPTransport implements Transport {
  private url: URL;
  private options: CustomHTTPTransportOptions;
  private messageHandlers: Set<(message: JSONRPCMessage) => void> = new Set();
  private errorHandlers: Set<(error: Error) => void> = new Set();
  private closeHandlers: Set<() => void> = new Set();
  private isClosed = false;

  constructor(url: URL, options: CustomHTTPTransportOptions = {}) {
    this.url = url;
    this.options = {
      timeout: 30000, // 30秒超时
      retries: 3,
      ...options
    };

    console.log(`[Custom HTTP Transport] 初始化传输: ${url.toString()}`);
  }

  /**
   * 发送消息到 MCP 服务器
   */
  async send(message: JSONRPCMessage): Promise<void> {
    if (this.isClosed) {
      throw new Error('传输已关闭');
    }

    console.log(`[Custom HTTP Transport] 发送消息:`, message);

    try {
      const response = await this.makeRequest(message);

      if (response.data) {
        // 如果响应包含数据，通知消息处理器
        this.notifyMessageHandlers(response.data);
      }

      console.log(`[Custom HTTP Transport] 消息发送成功`);
    } catch (error) {
      console.error(`[Custom HTTP Transport] 发送消息失败:`, error);
      this.notifyErrorHandlers(error instanceof Error ? error : new Error(String(error)));
      throw error;
    }
  }

  /**
   * 使用 Capacitor HTTP 或标准 fetch 发送请求
   */
  private async makeRequest(message: JSONRPCMessage, retryCount = 0): Promise<any> {
    try {
      if (Capacitor.isNativePlatform()) {
        // 移动端：使用 Capacitor HTTP 原生请求，完全绕过 CORS
        console.log(`[Custom HTTP Transport] 使用原生 HTTP 请求`);

        const response = await CapacitorHttp.request({
          url: this.url.toString(),
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'AetherLink-Mobile/1.0',
            ...this.options.headers
          },
          data: message,
          readTimeout: this.options.timeout,
          connectTimeout: this.options.timeout
        });

        if (response.status >= 400) {
          throw new Error(`HTTP ${response.status}: ${response.data?.error || 'Request failed'}`);
        }

        return response;
      } else {
        // Web 端：使用标准 fetch
        console.log(`[Custom HTTP Transport] 使用标准 fetch 请求`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.options.timeout);

        try {
          const response = await fetch(this.url.toString(), {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...this.options.headers
            },
            body: JSON.stringify(message),
            signal: controller.signal
          });

          clearTimeout(timeoutId);

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`HTTP ${response.status}: ${errorText}`);
          }

          const data = await response.json();
          return { status: response.status, data };
        } finally {
          clearTimeout(timeoutId);
        }
      }
    } catch (error) {
      console.error(`[Custom HTTP Transport] 请求失败 (尝试 ${retryCount + 1}/${this.options.retries! + 1}):`, error);

      // 如果还有重试次数，则重试
      if (retryCount < this.options.retries!) {
        const delay = Math.pow(2, retryCount) * 1000; // 指数退避
        console.log(`[Custom HTTP Transport] ${delay}ms 后重试...`);

        await new Promise(resolve => setTimeout(resolve, delay));
        return this.makeRequest(message, retryCount + 1);
      }

      throw error;
    }
  }

  /**
   * 启动传输（HTTP 传输不需要特殊启动逻辑）
   */
  async start(): Promise<void> {
    console.log(`[Custom HTTP Transport] 启动传输`);
    // HTTP 传输不需要特殊的启动逻辑
  }

  /**
   * 关闭传输
   */
  async close(): Promise<void> {
    console.log(`[Custom HTTP Transport] 关闭传输`);
    this.isClosed = true;
    this.notifyCloseHandlers();
  }

  /**
   * 添加消息处理器
   */
  onMessage(handler: (message: JSONRPCMessage) => void): void {
    this.messageHandlers.add(handler);
  }

  /**
   * 添加错误处理器
   */
  onError(handler: (error: Error) => void): void {
    this.errorHandlers.add(handler);
  }

  /**
   * 添加关闭处理器
   */
  onClose(handler: () => void): void {
    this.closeHandlers.add(handler);
  }

  /**
   * 通知消息处理器
   */
  private notifyMessageHandlers(message: JSONRPCMessage): void {
    this.messageHandlers.forEach(handler => {
      try {
        handler(message);
      } catch (error) {
        console.error(`[Custom HTTP Transport] 消息处理器错误:`, error);
      }
    });
  }

  /**
   * 通知错误处理器
   */
  private notifyErrorHandlers(error: Error): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(error);
      } catch (handlerError) {
        console.error(`[Custom HTTP Transport] 错误处理器错误:`, handlerError);
      }
    });
  }

  /**
   * 通知关闭处理器
   */
  private notifyCloseHandlers(): void {
    this.closeHandlers.forEach(handler => {
      try {
        handler();
      } catch (error) {
        console.error(`[Custom HTTP Transport] 关闭处理器错误:`, error);
      }
    });
  }
}
