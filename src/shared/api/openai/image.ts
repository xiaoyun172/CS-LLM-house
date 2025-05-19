/**
 * OpenAI兼容格式的图像生成API
 */
import type { Model, ImageGenerationParams } from '../../types';
import { createClient } from './client';
import { logApiRequest, logApiResponse, log } from '../../services/LoggerService';

/**
 * 使用OpenAI兼容格式生成图像
 * @param model 模型配置
 * @param params 图像生成参数
 * @returns 生成的图像URL数组
 */
export async function generateImage(
  model: Model,
  params: ImageGenerationParams
): Promise<string[]> {
  try {
    // 获取API密钥和基础URL
    const apiKey = model.apiKey;
    const baseUrl = model.baseUrl || 'https://api.siliconflow.cn/v1';

    if (!apiKey) {
      throw new Error(`API密钥未设置，无法使用${model.name}生成图像`);
    }

    // 创建OpenAI兼容客户端
    const client = createClient(model);

    // 准备请求参数
    // 确保size参数符合OpenAI API的要求
    let imageSize = params.imageSize || '1024x1024';
    // 检查是否是有效的尺寸
    if (!['256x256', '512x512', '1024x1024', '1024x1536', '1536x1024'].includes(imageSize)) {
      // 默认使用1024x1024
      imageSize = '1024x1024';
    }

    const requestParams: any = {
      model: model.id,
      prompt: params.prompt,
      n: params.batchSize || 1,
      size: imageSize as '1024x1024', // 使用类型断言
      response_format: 'url' as 'url', // 使用URL格式返回图像，指定字面量类型
    };

    // 添加可选参数
    if (params.negativePrompt) {
      (requestParams as any).negative_prompt = params.negativePrompt;
    }

    if (params.seed !== undefined) {
      (requestParams as any).seed = params.seed;
    }

    if (params.steps) {
      (requestParams as any).steps = params.steps;
    }

    if (params.guidanceScale) {
      (requestParams as any).guidance_scale = params.guidanceScale;
    }

    // 记录API请求
    logApiRequest('Image Generation', 'INFO', {
      method: 'POST',
      url: `${baseUrl}/images/generations`,
      model: model.id,
      provider: model.provider,
      params: {
        ...requestParams,
        prompt: params.prompt.substring(0, 50) + (params.prompt.length > 50 ? '...' : '')
      }
    });

    // 发送请求
    const response = await client.images.generate(requestParams);

    // 提取图像URL，添加空值检查
    const imageUrls = response.data?.map(item => item.url || '') || [];

    // 如果没有返回图像URL，抛出错误
    if (imageUrls.length === 0) {
      throw new Error('图像生成API没有返回有效的图像URL');
    }

    // 记录API响应
    logApiResponse('Image Generation', 200, {
      model: model.id,
      provider: model.provider,
      imageCount: imageUrls.length,
      firstImageUrl: imageUrls[0]?.substring(0, 50) + '...'
    });

    return imageUrls;
  } catch (error: any) {
    // 记录错误
    log('ERROR', `图像生成失败: ${error.message || '未知错误'}`, {
      model: model.id,
      provider: model.provider,
      error
    });

    throw error;
  }
}
