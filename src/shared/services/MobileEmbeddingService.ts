/**
 * 移动端嵌入服务
 * 使用现有模型配置系统进行向量嵌入计算
 */
import type { KnowledgeDocument, KnowledgeSearchResult } from '../types/KnowledgeBase';
import type { Model } from '../types';
import { isEmbeddingModel } from '../config/models';
import { getEmbeddingDimensions } from '../config/embeddingModels';
import store from '../store';

/**
 * 获取模型的维度
 * @param modelId 模型ID
 * @returns 模型维度
 */
export function getModelDimensions(modelId: string): number {
  return getEmbeddingDimensions(modelId);
}

/**
 * 获取所有可用的嵌入模型
 * @returns 嵌入模型列表
 */
export function getAvailableEmbeddingModels(): Model[] {
  try {
    const state = store.getState();
    const allModels: Model[] = [];

    // 从所有供应商中收集模型
    for (const provider of state.settings.providers) {
      if (provider.models && Array.isArray(provider.models)) {
        for (const model of provider.models) {
          // 检查是否为嵌入模型
          if (isEmbeddingModel(model)) {
            allModels.push({
              ...model,
              apiKey: model.apiKey || provider.apiKey,
              baseUrl: model.baseUrl || provider.baseUrl,
              providerType: model.providerType || provider.providerType || provider.id
            });
          }
        }
      }
    }

    return allModels;
  } catch (error) {
    console.error('[MobileEmbeddingService] 获取嵌入模型失败:', error);
    return [];
  }
}

/**
 * 移动端嵌入服务类
 */
export class MobileEmbeddingService {
  private static instance: MobileEmbeddingService;
  private embeddingCache: Map<string, number[]> = new Map();

  private constructor() {}

  /**
   * 获取服务实例
   */
  public static getInstance(): MobileEmbeddingService {
    if (!MobileEmbeddingService.instance) {
      MobileEmbeddingService.instance = new MobileEmbeddingService();
    }
    return MobileEmbeddingService.instance;
  }

  /**
   * 根据模型ID获取模型配置
   */
  private getModelById(modelId: string): Model | null {
    const availableModels = getAvailableEmbeddingModels();
    return availableModels.find(model => model.id === modelId) || null;
  }

  /**
   * 获取向量嵌入
   */
  public async getEmbedding(text: string, modelId: string): Promise<number[]> {
    try {
      // 检查缓存
      const cacheKey = `${modelId}:${text}`;
      if (this.embeddingCache.has(cacheKey)) {
        return this.embeddingCache.get(cacheKey)!;
      }

      // 获取模型配置
      const model = this.getModelById(modelId);
      if (!model) {
        throw new Error(`未找到嵌入模型: ${modelId}`);
      }

      if (!model.apiKey) {
        throw new Error(`模型 ${modelId} 未配置API密钥`);
      }

      if (!model.baseUrl) {
        throw new Error(`模型 ${modelId} 未配置API端点`);
      }

      // 构建API端点
      let apiEndpoint = model.baseUrl;
      if (!apiEndpoint.endsWith('/')) {
        apiEndpoint += '/';
      }
      apiEndpoint += 'embeddings';

      // 构建请求头
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${model.apiKey}`
      };

      // 调用API
      const response = await fetch(apiEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model: modelId,
          input: text
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`API错误: ${response.status} - ${JSON.stringify(errorData)}`);
      }

      const data = await response.json();
      const embedding = data.data[0].embedding;

      // 缓存结果
      this.embeddingCache.set(cacheKey, embedding);

      // 限制缓存大小
      if (this.embeddingCache.size > 100) {
        // 删除最旧的缓存项
        const oldestKey = this.embeddingCache.keys().next().value;
        if (oldestKey) {
          this.embeddingCache.delete(oldestKey);
        }
      }

      return embedding;
    } catch (error) {
      console.error('[MobileEmbeddingService] 获取向量嵌入失败:', error);
      throw error;
    }
  }

  /**
   * 搜索向量
   * 由于移动端性能考虑，直接使用本地计算
   */
  public async searchVectors(params: {
    queryVector: number[];
    documents: KnowledgeDocument[];
    threshold?: number;
    limit?: number;
  }): Promise<KnowledgeSearchResult[]> {
    try {
      // 直接使用本地向量搜索，避免复杂的云端调用
      return this.localVectorSearch(params);
    } catch (error) {
      console.error('[MobileEmbeddingService] 搜索向量失败:', error);
      return [];
    }
  }

  /**
   * 本地向量搜索（备用方案）
   */
  private localVectorSearch(params: {
    queryVector: number[];
    documents: KnowledgeDocument[];
    threshold?: number;
    limit?: number;
  }): KnowledgeSearchResult[] {
    const { queryVector, documents, threshold = 0.7, limit = 5 } = params;

    // 计算余弦相似度
    const results: KnowledgeSearchResult[] = documents
      .map(doc => {
        const similarity = this.cosineSimilarity(queryVector, doc.vector);
        return {
          documentId: doc.id,
          content: doc.content,
          similarity,
          metadata: doc.metadata
        };
      })
      .filter(result => result.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return results;
  }

  /**
   * 计算余弦相似度
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('向量维度不匹配');
    }

    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      magnitudeA += vecA[i] * vecA[i];
      magnitudeB += vecB[i] * vecB[i];
    }

    magnitudeA = Math.sqrt(magnitudeA);
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) {
      return 0;
    }

    return dotProduct / (magnitudeA * magnitudeB);
  }
}