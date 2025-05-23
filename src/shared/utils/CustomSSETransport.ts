/**
 * 自定义 SSE 传输类，用于 MCP SDK，解决移动端 CORS 问题
 */

import type { Transport } from '@modelcontextprotocol/sdk/shared/transport.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import { createSSEClient, SSEClient } from './sseClient';

export interface CustomSSETransportOptions {
  headers?: Record<string, string>;
  withCredentials?: boolean;
  heartbeatTimeout?: number;
}

export class CustomSSETransport implements Transport {
  private sseClient: SSEClient;
  private url: URL;
  private options: CustomSSETransportOptions;
  private messageHandlers: Set<(message: JSONRPCMessage) => void> = new Set();
  private errorHandlers: Set<(error: Error) => void> = new Set();
  private closeHandlers: Set<() => void> = new Set();

  constructor(url: URL, options: CustomSSETransportOptions = {}) {
    this.url = url;
    this.options = options;
    this.sseClient = createSSEClient(url.toString(), {
      headers: options.headers,
      withCredentials: options.withCredentials,
      heartbeatTimeout: options.heartbeatTimeout
    });

    this.setupEventListeners();
  }

  /**
   * 设置事件监听器
   */
  private setupEventListeners(): void {
    // 监听消息事件
    this.sseClient.addEventListener('message', (event) => {
      try {
        const message = JSON.parse(event.data) as JSONRPCMessage;
        console.log(`[Custom SSE Transport] 收到消息:`, message);
        this.notifyMessageHandlers(message);
      } catch (error) {
        console.error(`[Custom SSE Transport] 解析消息失败:`, error);
        this.notifyErrorHandlers(new Error(`Failed to parse SSE message: ${error}`));
      }
    });

    // 监听错误事件
    this.sseClient.addEventListener('error', (event) => {
      console.error(`[Custom SSE Transport] SSE 错误:`, event);
      this.notifyErrorHandlers(new Error('SSE connection error'));
    });
  }

  /**
   * 启动传输
   */
  async start(): Promise<void> {
    console.log(`[Custom SSE Transport] 启动传输: ${this.url.toString()}`);
    try {
      await this.sseClient.connect();
      console.log(`[Custom SSE Transport] 传输已启动`);
    } catch (error) {
      console.error(`[Custom SSE Transport] 启动失败:`, error);
      throw error;
    }
  }

  /**
   * 发送消息
   * 注意：SSE 是单向的，这里我们需要使用 HTTP POST 发送消息
   */
  async send(message: JSONRPCMessage): Promise<void> {
    console.log(`[Custom SSE Transport] 发送消息:`, message);

    try {
      // 构建发送 URL（通常是 SSE URL 去掉 /sse 后缀）
      const sendUrl = this.url.toString().replace(/\/sse\??.*$/, '/message');

      const response = await fetch(sendUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...this.options.headers
        },
        body: JSON.stringify(message),
        credentials: this.options.withCredentials ? 'include' : 'same-origin'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log(`[Custom SSE Transport] 消息发送成功`);
    } catch (error) {
      console.error(`[Custom SSE Transport] 发送消息失败:`, error);
      throw error;
    }
  }

  /**
   * 关闭传输
   */
  async close(): Promise<void> {
    console.log(`[Custom SSE Transport] 关闭传输`);
    this.sseClient.close();
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
        console.error(`[Custom SSE Transport] 消息处理器错误:`, error);
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
        console.error(`[Custom SSE Transport] 错误处理器错误:`, handlerError);
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
        console.error(`[Custom SSE Transport] 关闭处理器错误:`, error);
      }
    });
  }
}
