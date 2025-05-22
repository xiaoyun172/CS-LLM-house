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
    cancel() {
      // 尝试取消生成器
      return generator.return?.({} as T).catch(() => {});
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
 * 将OpenAI块转换为文本增量
 * @param chunk OpenAI块
 * @returns 文本增量对象
 */
export async function* openAIChunkToTextDelta(stream: AsyncIterable<any>): AsyncGenerator<{ type: 'text-delta'; textDelta: string }> {
  for await (const chunk of stream) {
    if (chunk.choices && chunk.choices.length > 0) {
      const delta = chunk.choices[0].delta;
      
      // 处理文本内容
      if (delta?.content) {
        yield { type: 'text-delta', textDelta: delta.content };
      }
      
      // 处理思考内容
      if (delta?.reasoning_content || delta?.reasoning) {
        yield { type: 'reasoning', textDelta: delta.reasoning_content || delta.reasoning };
      }
    }
  }
}
