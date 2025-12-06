import { OllamaEmbeddings } from "@langchain/ollama";
import { ChatOllama } from "@langchain/ollama";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { Document } from "@langchain/core/documents";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { PromptTemplate } from "@langchain/core/prompts";
import { StringOutputParser } from "@langchain/core/output_parsers";
import { RunnableSequence, RunnablePassthrough, RunnableLambda } from "@langchain/core/runnables";
import { formatDocumentsAsString } from "langchain/util/document";
import { TextLoader } from "langchain/document_loaders/fs/text";
import { db } from "./db.js";

// 配置常量
const CHROMA_URL = "http://localhost:8000";
const COLLECTION_NAME = "private-knowledge-base";
const OLLAMA_BASE_URL = "http://localhost:11434"; // Ollama 默认地址
const EMBEDDING_MODEL = "nomic-embed-text"; // 推荐的 Embedding 模型
const CHAT_MODEL = "deepseek-r1:7b"; // 推荐的聊天模型

// 初始化 Embedding 模型
const embeddings = new OllamaEmbeddings({
  model: EMBEDDING_MODEL,
  baseUrl: OLLAMA_BASE_URL,
});

// 初始化 Chat 模型
const llm = new ChatOllama({
  model: CHAT_MODEL,
  baseUrl: OLLAMA_BASE_URL,
  temperature: 0.7,
});

// 获取 Vector Store 实例
async function getVectorStore(collectionName = COLLECTION_NAME) {
  try {
    const vectorStore = await Chroma.fromExistingCollection(embeddings, {
      url: CHROMA_URL,
      collectionName: collectionName,
      filter: undefined, // 显式设置 filter 为 undefined，避免传递无效值
    });
    console.log(`[VectorStore] 已加载 collection "${collectionName}"`);
    return vectorStore;
  } catch (error) {
    console.warn(`[VectorStore] 集合 "${collectionName}" 不存在或无法连接，创建新集合`, error.message);
    const vectorStore = new Chroma(embeddings, {
      url: CHROMA_URL,
      collectionName: collectionName,
    });
    console.log(`[VectorStore] 已创建 collection "${collectionName}"`);
    return vectorStore;
  }
}

export async function clearKnowledgeBaseVectors(collectionName = COLLECTION_NAME) {
  console.log(`[VectorStore] 清理知识库 "${collectionName}" 的向量数据`);
  try {
    const vectorStore = await getVectorStore(collectionName);
    await vectorStore.delete({ filter: {} });
    console.log(`[VectorStore] 知识库 "${collectionName}" 的向量数据已清空`);
  } catch (error) {
    const invalidWhere = error?.message?.includes?.("Invalid where clause") || error?.name === 'InvalidArgumentError';
    const jsonError = error?.message?.includes?.('Unexpected end of JSON input');
    const connectionError = error?.message?.includes?.('ECONNREFUSED') || error?.message?.includes?.('Cannot GET');
    
    if (invalidWhere || jsonError || connectionError) {
      console.warn(`[VectorStore] 无法清理 "${collectionName}"，忽略并继续:`, error.message);
      return;
    }
    console.error(`[VectorStore] 清理 "${collectionName}" 时出错:`, error.message);
    throw error;
  }
}

export async function deleteFileVectors(sourceFileId, collectionName = COLLECTION_NAME) {
  if (!sourceFileId) return;
  console.log(`[VectorStore] 删除文件 ${sourceFileId} 对应的向量 (${collectionName})`);
  try {
    const vectorStore = await getVectorStore(collectionName);
    await vectorStore.delete({ filter: { sourceFileId } });
    console.log(`[VectorStore] 已删除文件 ${sourceFileId} 的向量数据`);
  } catch (error) {
    const invalidWhere = error?.message?.includes?.('Invalid where clause') || error?.name === 'InvalidArgumentError';
    const jsonError = error?.message?.includes?.('Unexpected end of JSON input');
    const connectionError = error?.message?.includes?.('ECONNREFUSED') || error?.message?.includes?.('Cannot GET');
    
    if (invalidWhere) {
      console.warn(`[VectorStore] 删除文件 ${sourceFileId} 时出现无效过滤器，忽略并继续:`, error.message);
      return;
    }
    
    if (jsonError || connectionError) {
      console.warn(`[VectorStore] Chroma 连接异常或数据异常，忽略向量删除:`, error.message);
      return;
    }
    
    // 其他错误才抛出
    throw error;
  }
}

/**
 * 处理并存储文档
 * @param {string} filePath 文件路径
 * @param {string} fileType 文件类型 ('text' | 'txt')
 * @param {string} collectionName 知识库集合名称 (ID)
 */
export async function processAndStoreDocument(filePath, fileType, collectionName = COLLECTION_NAME, extraMetadata = {}) {
  console.log(`开始处理文件: ${filePath} -> 知识库: ${collectionName}`);
  
  try {
    let loader;
    if (fileType === 'text' || fileType === 'txt') {
      console.log(`[TEXT] 使用 TextLoader 加载文本文件: ${filePath}`);
      loader = new TextLoader(filePath);
    } else {
      throw new Error(`不支持的文件类型: ${fileType}。只支持 txt 和 text 格式。`);
    }

    const docs = await loader.load();
    console.log(`[Loader] 加载完成，获得 ${docs.length} 个文档对象`);

    if (!docs || docs.length === 0) {
      throw new Error(`文件加载结果为空！文件类型: ${fileType}, 路径: ${filePath}`);
    }

    // 检查文档内容
    docs.forEach((doc, index) => {
      const contentLength = doc.pageContent?.length || 0;
      console.log(`[Document ${index}] 页面内容长度: ${contentLength} 字符`);
      if (contentLength === 0) {
        console.warn(`[Warning] 文档 ${index} 的内容为空！`);
      }
    });

    // 文本切分
    const splitter = new RecursiveCharacterTextSplitter({
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    const splitDocs = await splitter.splitDocuments(docs);
    
    if (!splitDocs || splitDocs.length === 0) {
      throw new Error('文本切分结果为空，无有效内容可切分！');
    }

    const enhancedDocs = splitDocs.map((doc) => new Document({
      pageContent: doc.pageContent,
      metadata: {
        ...doc.metadata,
        ...extraMetadata,
      },
    }));
    console.log(`文档已切分为 ${splitDocs.length} 个片段`);
    console.log(`[Process] 准备将 ${splitDocs.length} 片段写入 "${collectionName}" 的向量库`);

    // 存入 Chroma
    const vectorStore = await Chroma.fromDocuments(enhancedDocs, embeddings, {
      url: CHROMA_URL,
      collectionName: collectionName,
    });

    console.log("向量化并存储完成");
    return { success: true, chunks: splitDocs.length };
  } catch (error) {
    console.error(`[Error] 文档处理失败:`, error);
    throw error;
  }
}

/**
 * 执行 RAG 问答
 * @param {string} question 用户问题
 * @param {string} collectionName 知识库集合名称 (ID)
 */
export async function chatWithKnowledgeBase(question, collectionName = COLLECTION_NAME) {
  console.log(`收到问题: ${question} (knowledge-base param: ${collectionName})`);

  const isInvalidWhereClauseError = (error) => {
    const message = error?.message ?? '';
    return message.includes('Invalid where clause') || error?.name === 'InvalidArgumentError';
  };

  const convertQueryResultToDocScore = (result, sourceKbId) => {
    const documents = result?.documents?.[0] ?? [];
    const metadatas = result?.metadatas?.[0] ?? [];
    const distances = result?.distances?.[0] ?? [];
    const output = [];
    for (let i = 0; i < documents.length; i += 1) {
      let metadata = metadatas?.[i] ?? {};
      if (metadata.locFrom && metadata.locTo) {
        metadata = {
          ...metadata,
          loc: {
            lines: {
              from: metadata.locFrom,
              to: metadata.locTo,
            },
          },
        };
        delete metadata.locFrom;
        delete metadata.locTo;
      }
      metadata = {
        ...metadata,
        sourceKbId: metadata.sourceKbId || sourceKbId,
      };
      output.push({
        document: new Document({
          pageContent: documents[i] ?? "",
          metadata,
        }),
        score: distances?.[i] ?? Infinity,
      });
    }
    return output;
  };

  const queryChromaCollection = async (vectorStore, question, k = 4, sourceKbId) => {
    const collection = await vectorStore.ensureCollection();
    const embedding = await embeddings.embedQuery(question);
    const result = await collection.query({
      queryEmbeddings: [embedding],
      nResults: k,
    });
    return convertQueryResultToDocScore(result, sourceKbId);
  };

  const searchCollectionWithScore = async (vectorStore, question, k = 4, sourceKbId) => {
    try {
      const results = await vectorStore.similaritySearchWithScore(question, k);
      return results.map(([doc, score]) => ({
        document: new Document({
          pageContent: doc.pageContent,
          metadata: {
            ...doc.metadata,
            sourceKbId,
          },
        }),
        score,
      }));
    } catch (error) {
      if (isInvalidWhereClauseError(error)) {
        console.warn(`[VectorStore] 无效 where 查询 (${sourceKbId})，使用原生查询: ${error.message}`);
        return queryChromaCollection(vectorStore, question, k, sourceKbId);
      }
      throw error;
    }
  };

  // 优化的搜索策略：先从指定知识库搜索，无结果再全局搜索
  const searchWithFallback = async (question, k = 4) => {
    // 第一步：尝试从指定知识库检索
    if (collectionName && collectionName !== COLLECTION_NAME) {
      console.log(`[VectorStore] 第一步：从知识库 "${collectionName}" 搜索`);
      try {
        const vectorStore = await getVectorStore(collectionName);
        const results = await searchCollectionWithScore(vectorStore, question, k, collectionName);
        
        // 有结果则直接返回
        if (results && results.length > 0) {
          console.log(`[VectorStore] 在知识库 "${collectionName}" 中找到 ${results.length} 个相关结果`);
          return results.map(r => r.document);
        }
        
        console.log(`[VectorStore] 在知识库 "${collectionName}" 中未找到结果，执行全局搜索`);
      } catch (error) {
        console.warn(`[VectorStore] 从知识库 "${collectionName}" 检索失败，执行全局搜索: ${error.message}`);
      }
    }

    // 第二步：全局搜索
    console.log(`[VectorStore] 第二步：执行全局搜索`);
    const knowledgeBases = db.getKnowledgeBases();
    
    if (knowledgeBases.length === 0) {
      console.warn('[VectorStore] 没有可用的知识库，返回空结果');
      return [];
    }

    const aggregated = [];
    for (const kb of knowledgeBases) {
      try {
        const vectorStore = await getVectorStore(kb.id);
        const results = await searchCollectionWithScore(vectorStore, question, k, kb.id);
        aggregated.push(...results);
      } catch (error) {
        console.warn(`[VectorStore] 查询知识库 "${kb.id}" 时失败:`, error.message);
      }
    }
    
    aggregated.sort((a, b) => (a.score ?? Infinity) - (b.score ?? Infinity));
    const top = aggregated.slice(0, k).map((entry) => entry.document);
    
    if (top.length === 0) {
      console.warn('[VectorStore] 全局搜索未返回文档');
    }
    
    return top;
  };

  // 使用 RunnableLambda 进行相似性搜索
  const retriever = RunnableLambda.from(async (input) => {
    return await searchWithFallback(input, 4);
  });

  // 构建 Prompt
  const template = `你是一个智能助手，请根据以下提供的上下文信息回答用户的问题。
如果上下文没有包含答案，请直接说你不知道，不要编造。

上下文:
{context}

问题: {question}

回答:`;

  const prompt = PromptTemplate.fromTemplate(template);

  // 构建 RAG 链
  const chain = RunnableSequence.from([
    {
      context: retriever.pipe((docs) => {
        // 如果没有文档，返回默认消息
        if (!docs || docs.length === 0) {
          return "没有找到相关上下文信息。";
        }
        return formatDocumentsAsString(docs);
      }),
      question: new RunnablePassthrough(),
    },
    prompt,
    llm,
    new StringOutputParser(),
  ]);

  const response = await chain.invoke(question);
  return response;
}
