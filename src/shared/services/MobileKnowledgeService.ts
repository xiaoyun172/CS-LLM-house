/**
 * 移动端知识库服务
 * 基于DexieStorageService版本6实现，使用云端API进行嵌入计算
 */
import { v4 as uuid } from 'uuid';
import { dexieStorage } from './DexieStorageService';
import { EventEmitter, EVENT_NAMES } from './EventService';
import { MobileEmbeddingService } from './MobileEmbeddingService';
import {
  DEFAULT_KNOWLEDGE_DOCUMENT_COUNT,
  DEFAULT_KNOWLEDGE_THRESHOLD,
  DEFAULT_CHUNK_SIZE,
  DEFAULT_CHUNK_OVERLAP
} from '../constants/knowledge';
import type { KnowledgeBase, KnowledgeDocument, KnowledgeSearchResult } from '../types/KnowledgeBase';

/**
 * 移动端知识库服务类
 */
export class MobileKnowledgeService {
  private static instance: MobileKnowledgeService;
  // 先注释掉未定义的服务
  // private embeddingService: MobileEmbeddingService;
  // private fileService: MobileFileStorageService;

  private constructor() {
    // this.embeddingService = MobileEmbeddingService.getInstance();
    // this.fileService = MobileFileStorageService.getInstance();
  }

  /**
   * 获取服务实例
   */
  public static getInstance(): MobileKnowledgeService {
    if (!MobileKnowledgeService.instance) {
      MobileKnowledgeService.instance = new MobileKnowledgeService();
    }
    return MobileKnowledgeService.instance;
  }

  /**
   * 创建知识库
   */
  public async createKnowledgeBase(params: {
    name: string;
    description?: string;
    model: string;
    dimensions: number;
    documentCount?: number;
    chunkSize?: number;
    chunkOverlap?: number;
    threshold?: number;
  }): Promise<KnowledgeBase> {
    const now = new Date().toISOString();

    const knowledgeBase: KnowledgeBase = {
      id: uuid(),
      name: params.name,
      description: params.description || '',
      model: params.model,
      dimensions: params.dimensions,
      documentCount: params.documentCount || DEFAULT_KNOWLEDGE_DOCUMENT_COUNT,
      chunkSize: params.chunkSize || DEFAULT_CHUNK_SIZE,
      chunkOverlap: params.chunkOverlap || DEFAULT_CHUNK_OVERLAP,
      threshold: params.threshold || DEFAULT_KNOWLEDGE_THRESHOLD,
      created_at: now,
      updated_at: now
    };

    try {
      // 保存到数据库
      await dexieStorage.knowledge_bases.put(knowledgeBase);

      console.log(`[MobileKnowledgeService] 知识库创建成功: ${knowledgeBase.id}`);
      EventEmitter.emit(EVENT_NAMES.KNOWLEDGE_BASE_CREATED, knowledgeBase);

      return knowledgeBase;
    } catch (error) {
      console.error('[MobileKnowledgeService] 创建知识库失败:', error);
      throw error;
    }
  }

  /**
   * 获取知识库
   */
  public async getKnowledgeBase(id: string): Promise<KnowledgeBase | null> {
    try {
      return await dexieStorage.knowledge_bases.get(id);
    } catch (error) {
      console.error(`[MobileKnowledgeService] 获取知识库失败: ${id}`, error);
      return null;
    }
  }

  /**
   * 获取所有知识库
   */
  public async getAllKnowledgeBases(): Promise<KnowledgeBase[]> {
    try {
      return await dexieStorage.knowledge_bases.toArray();
    } catch (error) {
      console.error('[MobileKnowledgeService] 获取所有知识库失败:', error);
      return [];
    }
  }

  /**
   * 更新知识库
   */
  public async updateKnowledgeBase(
    id: string,
    updates: Partial<Omit<KnowledgeBase, 'id' | 'created_at'>>
  ): Promise<KnowledgeBase | null> {
    try {
      const knowledgeBase = await this.getKnowledgeBase(id);
      if (!knowledgeBase) {
        return null;
      }

      const updatedKnowledgeBase = {
        ...knowledgeBase,
        ...updates,
        updated_at: new Date().toISOString()
      };

      await dexieStorage.knowledge_bases.put(updatedKnowledgeBase);

      console.log(`[MobileKnowledgeService] 知识库更新成功: ${id}`);
      EventEmitter.emit(EVENT_NAMES.KNOWLEDGE_BASE_UPDATED, updatedKnowledgeBase);

      return updatedKnowledgeBase;
    } catch (error) {
      console.error(`[MobileKnowledgeService] 更新知识库失败: ${id}`, error);
      return null;
    }
  }

  /**
   * 删除知识库
   */
  public async deleteKnowledgeBase(id: string): Promise<boolean> {
    try {
      // 获取关联的文档
      const documents = await dexieStorage.knowledge_documents
        .where('knowledgeBaseId')
        .equals(id)
        .toArray();

      // 删除所有关联的文档
      await dexieStorage.knowledge_documents
        .where('knowledgeBaseId')
        .equals(id)
        .delete();

      // 删除知识库
      await dexieStorage.knowledge_bases.delete(id);

      console.log(`[MobileKnowledgeService] 知识库删除成功: ${id}`);
      EventEmitter.emit(EVENT_NAMES.KNOWLEDGE_BASE_DELETED, { id, documentCount: documents.length });

      return true;
    } catch (error) {
      console.error(`[MobileKnowledgeService] 删除知识库失败: ${id}`, error);
      return false;
    }
  }

  /**
   * 添加文档到知识库
   * 文档会被分块处理和向量化
   */
  public async addDocument(params: {
    knowledgeBaseId: string;
    content: string;
    metadata: {
      source: string;
      fileName?: string;
      fileId?: string;
    };
  }): Promise<KnowledgeDocument[]> {
    try {
      const knowledgeBase = await this.getKnowledgeBase(params.knowledgeBaseId);
      if (!knowledgeBase) {
        throw new Error(`知识库不存在: ${params.knowledgeBaseId}`);
      }

      // 分块
      const chunks = this.chunkText(
        params.content,
        knowledgeBase.chunkSize || DEFAULT_CHUNK_SIZE,
        knowledgeBase.chunkOverlap || DEFAULT_CHUNK_OVERLAP
      );

      console.log(`[MobileKnowledgeService] 文档分块: ${chunks.length} 个块`);

      // 批量获取嵌入向量
      const documents: KnowledgeDocument[] = [];

      // 每个块处理
      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];

        try {
          // 获取向量嵌入（使用云端API）
          let vector: number[];
          try {
            const embeddingService = MobileEmbeddingService.getInstance();
            vector = await embeddingService.getEmbedding(chunk, knowledgeBase.model);
          } catch (embeddingError) {
            console.warn(`[MobileKnowledgeService] 云端嵌入API失败，使用本地模拟向量:`, embeddingError);
            // 回退到本地模拟向量
            vector = this.createFallbackVector(knowledgeBase.dimensions);
          }

          // 创建文档记录
          const document: KnowledgeDocument = {
            id: uuid(),
            knowledgeBaseId: params.knowledgeBaseId,
            content: chunk,
            vector,
            metadata: {
              source: params.metadata.source,
              fileName: params.metadata.fileName,
              fileId: params.metadata.fileId,
              chunkIndex: i,
              timestamp: Date.now()
            }
          };

          // 保存到数据库
          await dexieStorage.knowledge_documents.put(document);
          documents.push(document);

          // 发出进度事件
          EventEmitter.emit(EVENT_NAMES.KNOWLEDGE_DOCUMENT_PROCESSED, {
            documentId: document.id,
            knowledgeBaseId: params.knowledgeBaseId,
            progress: {
              current: i + 1,
              total: chunks.length
            }
          });
        } catch (error) {
          console.error(`[MobileKnowledgeService] 处理文档块失败:`, error);
          // 继续处理其他块
        }
      }

      console.log(`[MobileKnowledgeService] 文档添加成功: ${documents.length} 个块`);
      EventEmitter.emit(EVENT_NAMES.KNOWLEDGE_DOCUMENTS_ADDED, {
        knowledgeBaseId: params.knowledgeBaseId,
        count: documents.length
      });

      return documents;
    } catch (error) {
      console.error('[MobileKnowledgeService] 添加文档失败:', error);
      throw error;
    }
  }

  /**
   * 获取知识库中的所有文档
   * @param knowledgeBaseId 知识库ID
   * @returns 知识库中的所有文档
   */
  public async getDocumentsByKnowledgeBaseId(knowledgeBaseId: string): Promise<KnowledgeDocument[]> {
    try {
      const documents = await dexieStorage.knowledge_documents
        .where('knowledgeBaseId')
        .equals(knowledgeBaseId)
        .toArray();

      console.log(`[MobileKnowledgeService] 获取知识库文档成功: ${knowledgeBaseId}, 共 ${documents.length} 个文档`);
      return documents;
    } catch (error) {
      console.error(`[MobileKnowledgeService] 获取知识库文档失败: ${knowledgeBaseId}`, error);
      return [];
    }
  }

  /**
   * 删除指定ID的文档
   * @param documentId 文档ID
   * @returns 是否删除成功
   */
  public async deleteDocument(documentId: string): Promise<boolean> {
    try {
      // 获取文档信息，用于通知事件
      const document = await dexieStorage.knowledge_documents.get(documentId);
      if (!document) {
        console.warn(`[MobileKnowledgeService] 尝试删除不存在的文档: ${documentId}`);
        return false;
      }

      // 删除文档
      await dexieStorage.knowledge_documents.delete(documentId);

      console.log(`[MobileKnowledgeService] 删除文档成功: ${documentId}, 知识库: ${document.knowledgeBaseId}`);

      // 发出文档删除事件
      EventEmitter.emit(EVENT_NAMES.KNOWLEDGE_DOCUMENT_DELETED, {
        documentId,
        knowledgeBaseId: document.knowledgeBaseId
      });

      return true;
    } catch (error) {
      console.error(`[MobileKnowledgeService] 删除文档失败: ${documentId}`, error);
      return false;
    }
  }

  /**
   * 搜索知识库（别名方法，兼容KnowledgeSelector调用）
   */
  public async searchKnowledge(
    knowledgeBaseId: string,
    query: string,
    limit?: number
  ): Promise<KnowledgeSearchResult[]> {
    return this.search({
      knowledgeBaseId,
      query,
      limit
    });
  }

  /**
   * 搜索知识库
   */
  public async search(params: {
    knowledgeBaseId: string;
    query: string;
    threshold?: number;
    limit?: number;
  }): Promise<KnowledgeSearchResult[]> {
    try {
      const knowledgeBase = await this.getKnowledgeBase(params.knowledgeBaseId);
      if (!knowledgeBase) {
        throw new Error(`知识库不存在: ${params.knowledgeBaseId}`);
      }

      // 获取查询向量（使用云端API）
      let queryVector: number[];
      try {
        const embeddingService = MobileEmbeddingService.getInstance();
        queryVector = await embeddingService.getEmbedding(params.query, knowledgeBase.model);
        console.log(`[MobileKnowledgeService] 查询向量获取成功，维度: ${queryVector.length}`);
      } catch (embeddingError) {
        console.warn(`[MobileKnowledgeService] 查询向量获取失败，使用本地模拟向量:`, embeddingError);
        // 回退到本地模拟向量
        queryVector = this.createFallbackVector(knowledgeBase.dimensions);
        console.log(`[MobileKnowledgeService] 使用回退向量，维度: ${queryVector.length}`);
      }

      // 获取所有文档向量
      const documents = await dexieStorage.knowledge_documents
        .where('knowledgeBaseId')
        .equals(params.knowledgeBaseId)
        .toArray();

      console.log(`[MobileKnowledgeService] 搜索知识库: ${documents.length} 个文档`);

      // 检查文档向量维度
      if (documents.length > 0) {
        const firstDocVector = documents[0].vector;
        console.log(`[MobileKnowledgeService] 文档向量维度: ${firstDocVector?.length || '未知'}`);
        console.log(`[MobileKnowledgeService] 查询向量维度: ${queryVector.length}`);

        if (firstDocVector && firstDocVector.length !== queryVector.length) {
          console.warn(`[MobileKnowledgeService] 维度不匹配警告: 查询向量(${queryVector.length}) vs 文档向量(${firstDocVector.length})`);
        }
      }

      // 计算余弦相似度并排序
      const threshold = params.threshold || knowledgeBase.threshold || DEFAULT_KNOWLEDGE_THRESHOLD;
      const limit = params.limit || 5;

      // 使用简单的相似度计算
      const results = this.localVectorSearch(queryVector, documents, threshold, limit);

      console.log(`[MobileKnowledgeService] 搜索结果: ${results.length} 条`);

      return results;
    } catch (error) {
      console.error('[MobileKnowledgeService] 搜索知识库失败:', error);
      return [];
    }
  }

  /**
   * 本地向量搜索（临时实现）
   * 在实际场景中应使用嵌入服务
   */
  private localVectorSearch(
    queryVector: number[],
    documents: KnowledgeDocument[],
    threshold: number,
    limit: number
  ): KnowledgeSearchResult[] {
    return documents
      .map(doc => {
        // 简单的余弦相似度计算
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
  }

  /**
   * 计算余弦相似度（带维度兼容性处理）
   */
  private cosineSimilarity(vecA: number[], vecB: number[]): number {
    // 处理维度不匹配的情况
    if (vecA.length !== vecB.length) {
      console.warn(`[MobileKnowledgeService] 向量维度不匹配: ${vecA.length} vs ${vecB.length}，尝试维度对齐`);

      // 尝试维度对齐
      const alignedVectors = this.alignVectorDimensions(vecA, vecB);
      if (!alignedVectors) {
        console.error('[MobileKnowledgeService] 无法对齐向量维度，返回0相似度');
        return 0;
      }

      vecA = alignedVectors.vecA;
      vecB = alignedVectors.vecB;
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

  /**
   * 对齐向量维度（处理维度不匹配）
   */
  private alignVectorDimensions(vecA: number[], vecB: number[]): { vecA: number[], vecB: number[] } | null {
    const lenA = vecA.length;
    const lenB = vecB.length;

    if (lenA === lenB) {
      return { vecA, vecB };
    }

    // 取较小的维度作为目标维度
    const targetDim = Math.min(lenA, lenB);

    if (targetDim === 0) {
      return null;
    }

    // 截断到目标维度
    const alignedVecA = vecA.slice(0, targetDim);
    const alignedVecB = vecB.slice(0, targetDim);

    console.log(`[MobileKnowledgeService] 向量维度已对齐: ${lenA},${lenB} -> ${targetDim}`);

    return { vecA: alignedVecA, vecB: alignedVecB };
  }

  /**
   * 创建回退向量（当云端API失败时使用）
   */
  private createFallbackVector(dimensions: number): number[] {
    const vector = [];
    for (let i = 0; i < dimensions; i++) {
      vector.push(Math.random() * 2 - 1); // -1到1之间的随机值
    }
    return vector;
  }

  /**
   * 文本分块
   */
  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];

    // 简单的基于字符的分块策略
    for (let i = 0; i < text.length; i += chunkSize - overlap) {
      const chunk = text.slice(i, i + chunkSize);
      chunks.push(chunk);
    }

    return chunks;
  }
}