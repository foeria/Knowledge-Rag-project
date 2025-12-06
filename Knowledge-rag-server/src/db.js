import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DB_PATH = path.join(__dirname, '../data/db.json');

// 初始化 DB
if (!fs.existsSync(DB_PATH)) {
  const initialData = {
    knowledgeBases: [
      { id: 'default', name: '默认知识库', description: '系统默认知识库', createdAt: new Date().toISOString() }
    ],
    files: []
  };
  fs.writeFileSync(DB_PATH, JSON.stringify(initialData, null, 2));
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

export const db = {
  getKnowledgeBases: () => {
    const data = readDB();
    return data.knowledgeBases;
  },
  
  createKnowledgeBase: (name, description) => {
    const data = readDB();
    const newKb = {
      id: uuidv4(),
      name,
      description,
      createdAt: new Date().toISOString()
    };
    data.knowledgeBases.push(newKb);
    writeDB(data);
    return newKb;
  },

  deleteKnowledgeBase: (id) => {
    const data = readDB();
    const filesToDelete = data.files.filter(f => f.kbId === id);
    data.knowledgeBases = data.knowledgeBases.filter(kb => kb.id !== id);
    // 同时也应该删除关联的文件记录（实际文件和向量库清理在 controller 做）
    data.files = data.files.filter(f => f.kbId !== id);
    writeDB(data);
    for (const file of filesToDelete) {
      try {
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          console.log(`[DB] 删除文件: ${file.path}`);
        }
      } catch (error) {
        console.warn(`[DB] 删除文件失败: ${file.path}`, error.message);
      }
    }
  },

  getFiles: (kbId) => {
    const data = readDB();
    return data.files.filter(f => f.kbId === kbId);
  },

  deleteFile: (kbId, fileId) => {
    const data = readDB();
    const fileIdx = data.files.findIndex(f => f.id === fileId && f.kbId === kbId);
    if (fileIdx === -1) {
      return null;
    }
    const [deletedFile] = data.files.splice(fileIdx, 1);
    writeDB(data);
    try {
      if (fs.existsSync(deletedFile.path)) {
        fs.unlinkSync(deletedFile.path);
        console.log(`[DB] 删除文件: ${deletedFile.path}`);
      }
    } catch (error) {
      console.warn(`[DB] 删除文件失败: ${deletedFile.path}`, error.message);
    }
    return deletedFile;
  },

  addFile: (kbId, filename, filePath, type) => {
    const data = readDB();
    const newFile = {
      id: uuidv4(),
      kbId,
      filename,
      path: filePath,
      type,
      uploadedAt: new Date().toISOString()
    };
    data.files.push(newFile);
    writeDB(data);
    return newFile;
  }
};
