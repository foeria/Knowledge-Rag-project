import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { processAndStoreDocument, chatWithKnowledgeBase, clearKnowledgeBaseVectors, deleteFileVectors } from './rag.js';
import { db } from './db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// 中间件
app.use(cors());
app.use(express.json());

// 配置 Multer 用于文件上传
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // 解决中文文件名乱码问题
    file.originalname = Buffer.from(file.originalname, "latin1").toString(
      "utf8"
    );
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage: storage });

// 路由: 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Knowledge RAG Server is running' });
});

// --- 知识库管理 API ---

// 获取所有知识库
app.get('/api/knowledge-bases', (req, res) => {
  const kbs = db.getKnowledgeBases();
  res.json(kbs);
});

// 创建知识库
app.post('/api/knowledge-bases', (req, res) => {
  const { name, description } = req.body;
  if (!name) return res.status(400).json({ error: 'Name is required' });
  const newKb = db.createKnowledgeBase(name, description);
  res.json(newKb);
});

// 删除知识库
app.delete('/api/knowledge-bases/:id', async (req, res) => {
  const { id } = req.params;
  try {
    // 先尝试清理向量数据（可能失败，但要继续）
    try {
      await clearKnowledgeBaseVectors(id);
    } catch (vectorError) {
      console.warn(`[KnowledgeBase] 清理向量失败，但继续删除知识库:`, vectorError.message);
      // 继续执行，不中断
    }
    
    // 最后删除知识库记录（这一步必须成功）
    db.deleteKnowledgeBase(id);
    console.log(`[KnowledgeBase] 已删除 "${id}"`);
    res.json({ success: true, message: `Knowledge base "${id}" deleted` });
  } catch (error) {
    console.error(`[KnowledgeBase] 删除 "${id}" 失败:`, error);
    res.status(500).json({
      error: 'Failed to delete knowledge base',
      details: error.message,
    });
  }
});

// 删除知识库文件
app.delete('/api/knowledge-bases/:kbId/files/:fileId', async (req, res) => {
  const { kbId, fileId } = req.params;
  try {
    // 先从 DB 获取文件信息（验证存在性）
    const files = db.getFiles(kbId);
    const fileToDelete = files.find(f => f.id === fileId);
    
    if (!fileToDelete) {
      return res.status(404).json({ error: 'File not found in knowledge base' });
    }

    // 先尝试删除向量（可能失败，但要继续）
    try {
      await deleteFileVectors(fileId, kbId);
    } catch (vectorError) {
      console.warn(`[File] 删除向量失败，但继续删除文件记录:`, vectorError.message);
      // 继续执行，不中断
    }

    // 最后删除 DB 记录（这一步必须成功）
    db.deleteFile(kbId, fileId);
    res.json({ success: true });
  } catch (error) {
    console.error(`[File] 删除 ${fileId} 失败:`, error);
    res.status(500).json({ error: 'Failed to delete file', details: error.message });
  }
});

// 获取知识库文件
app.get('/api/knowledge-bases/:id/files', (req, res) => {
  const { id } = req.params;
  const files = db.getFiles(id);
  res.json(files);
});

// --- 核心功能 API ---

// 路由: 上传文件并处理
app.post('/api/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const kbId = req.body.kbId;
    
    // 验证知识库ID是否存在
    if (!kbId) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: 'Knowledge base ID is required' });
    }

    const knowledgeBases = db.getKnowledgeBases();
    if (!knowledgeBases.find(kb => kb.id === kbId)) {
      fs.unlinkSync(req.file.path);
      return res.status(404).json({ error: 'Knowledge base not found' });
    }

    const filePath = req.file.path;
    const fileExtension = path.extname(req.file.originalname).toLowerCase();
    let fileType = 'text';

    if (['.txt', '.md'].includes(fileExtension)) {
      fileType = 'text';
    } else {
      // 删除不支持的文件
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Unsupported file type. Only Text and Markdown files allowed.' });
    }

    // 记录到 DB
    const newFile = db.addFile(kbId, req.file.originalname, filePath, fileType);

    // 异步处理文档 (存入对应的 Collection: kbId)
    const result = await processAndStoreDocument(filePath, fileType, kbId, {
      sourceFileId: newFile.id,
      sourceKbId: kbId,
    });

    // 处理完成后删除临时文件 (可选，取决于是否需要保留原件)
    // fs.unlinkSync(filePath); 

    res.json({ 
      message: 'File processed and added to knowledge base successfully', 
      details: result 
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Failed to process document', details: error.message });
  }
});

// 路由: 聊天问答
app.post('/api/chat', async (req, res) => {
  try {
    const { question, kbId } = req.body;
    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // 如果指定了 kbId，验证它是否存在；如果为 null，进行全局搜索
    let targetKbId = kbId;
    if (kbId) {
      const knowledgeBases = db.getKnowledgeBases();
      if (!knowledgeBases.find(kb => kb.id === kbId)) {
        return res.status(404).json({ error: 'Knowledge base not found' });
      }
    }

    const answer = await chatWithKnowledgeBase(question, targetKbId);
    res.json({ answer });

  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to generate answer', details: error.message });
  }
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`- Upload API: POST http://localhost:${PORT}/api/upload`);
  console.log(`- Chat API: POST http://localhost:${PORT}/api/chat`);
});
