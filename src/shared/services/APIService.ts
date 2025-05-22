import type { Model } from '../types';
import { logApiRequest, logApiResponse } from './LoggerService';
import { handleError } from '../utils/error';
import type { ImageGenerationParams, GeneratedImage } from '../types';
import { ModelType } from '../types';
import { log } from './LoggerService';
import { generateImage as openaiGenerateImage } from '../api/openai';

// 工具函数已移至ProviderFactory，保持APIService简洁

// 这些函数已移至ProviderFactory，保持APIService简洁

// Gemini模型获取已移至ProviderFactory

// Anthropic和Grok模型获取已移至ProviderFactory

// 分组逻辑已移至ProviderFactory，保持APIService简洁

// DeepSeek现在使用OpenAI兼容API，不需要独立实现

// 添加图像生成方法
export async function generateImage(
  model: Model,
  params: ImageGenerationParams
): Promise<GeneratedImage> {
  try {
    log('INFO', `开始生成图像，使用模型: ${model.name}`);

    // 检查模型是否支持图像生成
    const isImageGenerationModel =
      model.imageGeneration ||
      model.capabilities?.imageGeneration ||
      (model.modelTypes && model.modelTypes.includes(ModelType.ImageGen)) ||
      model.id.toLowerCase().includes('flux') ||
      model.id.toLowerCase().includes('black-forest') ||
      model.id.toLowerCase().includes('stable-diffusion') ||
      model.id.toLowerCase().includes('sd') ||
      model.id.toLowerCase().includes('dalle') ||
      model.id.toLowerCase().includes('midjourney');

    if (!isImageGenerationModel) {
      throw new Error(`模型 ${model.name} 不支持图像生成`);
    }

    // 调用OpenAI兼容API生成图像
    const imageUrls = await openaiGenerateImage(model, params);

    // 创建图像生成结果
    const generatedImage: GeneratedImage = {
      url: imageUrls[0], // 取第一个生成的图像
      prompt: params.prompt,
      timestamp: new Date().toISOString(),
      modelId: model.id
    };

    log('INFO', `图像生成成功: ${generatedImage.url.substring(0, 50)}...`);

    return generatedImage;
  } catch (error: any) {
    handleError(error, 'APIService.generateImage', {
      logLevel: 'ERROR',
      additionalData: { params },
      rethrow: true
    });
    throw error;
  }
}

/**
 * 从API提供商获取模型列表 - 简化版本，参考电脑版架构
 * @param provider 模型提供商配置
 * @returns 模型列表
 */
export async function fetchModels(provider: any): Promise<Model[]> {
  try {
    logApiRequest('获取模型列表', 'INFO', { provider: provider.id });

    // 直接使用供应商工厂获取已格式化的模型，参考电脑版架构
    const { fetchModels: factoryFetchModels } = await import('./ProviderFactory');
    const models = await factoryFetchModels(provider);

    logApiResponse('获取模型列表', 200, {
      provider: provider.id,
      modelsCount: models.length
    });

    return models;
  } catch (error) {
    handleError(error, 'APIService.fetchModels', {
      logLevel: 'ERROR',
      additionalData: { provider: provider.id }
    });
    logApiResponse('获取模型列表', 500, {
      provider: provider.id,
      error: error instanceof Error ? error.message : '未知错误'
    });
    return [];
  }
}