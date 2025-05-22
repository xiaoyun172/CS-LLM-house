/**
 * 流处理工具函数
 * 提供处理流式响应的工具函数
 */

/**
 * 将异步生成器转换为可读流
 * @param generator 异步生成器
 * @returns 可读流
 */
export async function* asyncIterableToGenerator<T>(iterable: AsyncIterable<T>): AsyncGenerator<T> {
  for await (const item of iterable) {
    yield item;
  }
}

/**
 * 将异步生成器转换为可读流
 * @param generator 异步生成器
 * @returns 可读流
 */
export function asyncGeneratorToReadableStream<T>(generator: AsyncGenerator<T>): ReadableStream<T> {
  return new ReadableStream<T>({
    async pull(controller) {
      try {
        const { value, done } = await generator.next();
        if (done) {
          controller.close();
        } else {
          controller.enqueue(value);
        }
      } catch (error) {
        controller.error(error);
      }
    },
    async cancel() {
      // 尝试取消生成器，忽略返回值
      try {
        await generator.return?.({} as T);
      } catch (e) {
        // 忽略错误
      }
    }
  });
}

/**
 * 将可读流转换为异步迭代器
 * @param stream 可读流
 * @returns 异步迭代器
 */
export async function* readableStreamAsyncIterable<T>(stream: ReadableStream<T>): AsyncIterable<T> {
  const reader = stream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        return;
      }
      yield value;
    }
  } finally {
    reader.releaseLock();
  }
}

/**
 * 将文本块转换为文本增量
 * @param text 文本块
 * @returns 文本增量对象
 */
export function textToTextDelta(text: string): { type: 'text-delta'; textDelta: string } {
  return { type: 'text-delta', textDelta: text };
}

/**
 * 将思考块转换为思考增量
 * @param text 思考块
 * @returns 思考增量对象
 */
export function textToReasoningDelta(text: string): { type: 'reasoning'; textDelta: string } {
  return { type: 'reasoning', textDelta: text };
}

/**
 * OpenAI流式响应块类型
 */
export type OpenAIStreamChunk =
  | { type: 'text-delta'; textDelta: string }
  | { type: 'reasoning'; textDelta: string };

/**
 * 将OpenAI块转换为文本增量或思考增量
 * @param chunk OpenAI块
 * @returns 文本增量或思考增量对象
 */
export async function* openAIChunkToTextDelta(stream: AsyncIterable<any>): AsyncGenerator<OpenAIStreamChunk> {
  // 跟踪已处理的完整内容，用于检测重复
  let processedContent = '';
  let processedReasoning = '';

  for await (const chunk of stream) {
    if (chunk.choices && chunk.choices.length > 0) {
      // 检查是否为DeepSeek的完整响应（非增量）
      const isCompleteResponse = chunk.choices[0].message && !chunk.choices[0].delta;

      if (isCompleteResponse) {
        console.log('[openAIChunkToTextDelta] 检测到DeepSeek完整响应，非增量模式');

        // 处理完整的思考内容
        if (chunk.choices[0].message.reasoning_content) {
          const reasoningContent = chunk.choices[0].message.reasoning_content;
          // 检查是否已处理过此内容
          if (reasoningContent !== processedReasoning) {
            processedReasoning = reasoningContent;
            yield { type: 'reasoning', textDelta: reasoningContent };
          }
        }

        // 处理完整的文本内容
        if (chunk.choices[0].message.content) {
          const content = chunk.choices[0].message.content;
          // 检查是否已处理过此内容
          if (content !== processedContent) {
            processedContent = content;
            yield { type: 'text-delta', textDelta: content };
          }
        }

        continue; // 处理完完整响应后，跳过当前循环
      }

      const delta = chunk.choices[0].delta;

      // 处理DeepSeek特有的思考内容字段 - 优先处理，避免与文本内容混淆
      if (chunk.choices[0]?.message?.reasoning_content) {
        const reasoningContent = chunk.choices[0].message.reasoning_content;
        // 检查是否已处理过此内容
        if (reasoningContent !== processedReasoning) {
          processedReasoning = reasoningContent;
          yield { type: 'reasoning', textDelta: reasoningContent };
        }
        continue; // 处理完思考内容后，跳过当前循环
      }

      // 处理思考内容 - 支持多种字段名
      if (delta?.reasoning_content || delta?.reasoning) {
        const reasoningDelta = delta.reasoning_content || delta.reasoning;
        processedReasoning += reasoningDelta;
        yield { type: 'reasoning', textDelta: reasoningDelta };
        continue; // 处理完思考内容后，跳过当前循环
      }

      // 处理文本内容 - 只有在没有思考内容时才处理
      if (delta?.content) {
        // 检查是否为重复内容
        if (processedContent.endsWith(delta.content)) {
          console.log('[openAIChunkToTextDelta] 跳过重复内容:', delta.content);
          continue;
        }

        processedContent += delta.content;
        yield { type: 'text-delta', textDelta: delta.content };
      }
    }
  }
}
