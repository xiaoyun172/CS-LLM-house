/**
 * 模型检测函数
 * 用于检测模型的各种能力和特性
 */
import type { Model } from '../types';

/**
 * 检查模型是否支持推理功能
 * @param model 模型对象
 * @returns 是否支持推理
 */
export function isReasoningModel(model: Model): boolean {
  // 首先检查模型类型是否包含推理类型
  if (model.modelTypes && model.modelTypes.includes('reasoning')) {
    return true;
  }

  const modelId = model.id;

  // 如果是deepseek-reasoner模型，则默认支持推理
  if (modelId === 'deepseek-reasoner') {
    return true;
  }

  // 如果是deepseek-chat模型，则需要检查modelTypes
  if (modelId === 'deepseek-chat') {
    // 如果明确设置了modelTypes但不包含reasoning，则不支持推理
    if (model.modelTypes && !model.modelTypes.includes('reasoning')) {
      return false;
    }
  }

  return Boolean(
    model.capabilities?.reasoning ||
    modelId.includes('gpt-4') ||
    modelId.includes('gpt-4o') ||
    modelId.includes('claude-3') ||
    modelId.includes('gemini') ||
    modelId.includes('qwen3') ||
    modelId.includes('deepseek-coder') ||
    (modelId.includes('deepseek-chat') && !model.modelTypes) || // 只有在未设置modelTypes时才默认支持
    modelId.includes('grok')
  );
}

/**
 * 检查模型是否支持OpenAI风格的推理参数
 * @param model 模型对象
 * @returns 是否支持OpenAI风格的推理参数
 */
export function isOpenAIReasoningModel(model: Model): boolean {
  const modelId = model.id;

  return Boolean(
    modelId.includes('gpt-4') ||
    modelId.includes('gpt-4o')
  );
}

/**
 * 检查模型是否支持Claude风格的推理参数
 * @param model 模型对象
 * @returns 是否支持Claude风格的推理参数
 */
export function isClaudeReasoningModel(model: Model): boolean {
  const modelId = model.id;

  return Boolean(
    modelId.includes('claude-3')
  );
}

/**
 * 检查模型是否支持Gemini风格的推理参数
 * @param model 模型对象
 * @returns 是否支持Gemini风格的推理参数
 */
export function isGeminiReasoningModel(model: Model): boolean {
  const modelId = model.id;

  return Boolean(
    modelId.includes('gemini')
  );
}

/**
 * 检查模型是否支持Qwen风格的推理参数
 * @param model 模型对象
 * @returns 是否支持Qwen风格的推理参数
 */
export function isQwenReasoningModel(model: Model): boolean {
  const modelId = model.id;

  return Boolean(
    modelId.includes('qwen3')
  );
}

/**
 * 检查模型是否支持Grok风格的推理参数
 * @param model 模型对象
 * @returns 是否支持Grok风格的推理参数
 */
export function isGrokReasoningModel(model: Model): boolean {
  const modelId = model.id;

  return Boolean(
    modelId.includes('grok')
  );
}

/**
 * 检查模型是否支持推理努力程度参数
 * @param model 模型对象
 * @returns 是否支持推理努力程度参数
 */
export function isSupportedReasoningEffortModel(model: Model): boolean {
  return isOpenAIReasoningModel(model) || isGrokReasoningModel(model);
}

/**
 * 检查模型是否支持思考token参数
 * @param model 模型对象
 * @returns 是否支持思考token参数
 */
export function isSupportedThinkingTokenModel(model: Model): boolean {
  return isClaudeReasoningModel(model) || isGeminiReasoningModel(model) || isQwenReasoningModel(model);
}

/**
 * 检查模型是否支持多模态输入
 * @param model 模型对象
 * @returns 是否支持多模态输入
 */
export function isVisionModel(model: Model): boolean {
  const modelId = model.id;

  return Boolean(
    model.capabilities?.multimodal ||
    modelId.includes('gpt-4-vision') ||
    modelId.includes('gpt-4o') ||
    modelId.includes('claude-3') ||
    modelId.includes('gemini')
  );
}
