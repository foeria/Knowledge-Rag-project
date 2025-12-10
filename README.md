# Knowledge RAG Project

一个私有知识库 RAG（Retrieval-Augmented Generation）系统，将本地文档转换为向量并通过 AI 进行智能问答。

## 功能特性

- 📚 **知识库管理**：支持创建和管理多个独立的知识库
- 📄 **文档上传**：支持上传 TXT 和 Markdown 文档
- 🔍 **向量检索**：使用 Chroma 向量数据库进行高效的文档相似度搜索
- 🤖 **AI 问答**：基于本地 Ollama 模型的智能对话，保护数据隐私
- 💻 **现代化 UI**：使用 Vue 3 + Tailwind CSS 构建的响应式前端

## 系统要求

### 硬件要求
- CPU：至少 4 核（推荐 8 核）
- RAM：至少 8GB（推荐 16GB 及以上，因为需要运行大型语言模型）
- 存储：至少 20GB 可用空间（用于模型和向量数据库）

### 软件要求
- Windows 10/11、macOS 或 Linux
- Node.js 16.0+ 和 npm/yarn
- Docker Desktop（用于运行 Chroma 向量数据库）
- Ollama（用于本地 LLM 推理）

## 项目结构

```
Knowledge-Rag-project/
├── Knowledge-rag-server/          # 后端服务（Node.js + Express）
│   ├── src/
│   │   ├── index.js              # 主入口
│   │   ├── rag.js                # RAG 核心逻辑
│   │   └── db.js                 # 知识库数据管理
│   ├── docker-compose.yml        # Chroma 容器编排
│   └── package.json
├── Knowledge-rag-ui/              # 前端应用（Vue 3 + Vite）
│   ├── src/
│   │   ├── components/           # Vue 组件
│   │   ├── router/               # 路由配置
│   │   ├── stores/               # Pinia 状态管理
│   │   └── App.vue
│   └── package.json
└── README.md
```

## 安装步骤

### 1. 克隆项目

```bash
git clone <repository-url>
cd Knowledge-Rag-project
```

### 2. 安装依赖

#### 后端依赖
```powershell
cd Knowledge-rag-server
npm install
cd ..
```

#### 前端依赖
```powershell
cd Knowledge-rag-ui
npm install
cd ..
```

## 配置步骤

### 配置 1：Docker Desktop 安装与启动

#### Windows 用户
1. **下载 Docker Desktop**
   - 访问 [Docker 官方网站](https://www.docker.com/products/docker-desktop)
   - 选择 Windows 版本下载（需要 WSL 2）

2. **安装步骤**
   - 运行安装程序，按默认设置完成安装
   - 安装完成后重启计算机

3. **启动 Docker Desktop**
   - 从 Windows 菜单打开 "Docker Desktop"
   - 等待 Docker 引擎启动（状态栏中出现 Docker 图标表示就绪）

4. **验证安装**
   ```powershell
   docker --version
   docker run hello-world
   ```


### 配置 2：Ollama 安装与配置

#### Windows 用户
1. **下载 Ollama**
   - 访问 [Ollama 官方网站](https://ollama.ai)
   - 下载 Windows 版本的安装程序

2. **安装并启动**
   - 运行安装程序，按默认选项完成
   - 安装完成后 Ollama 会自动启动

3. **下载必要的模型**
   ```powershell
   # 下载嵌入模型（用于向量化文档）
   ollama pull nomic-embed-text
   
   # 下载聊天模型（用于问答）
   ollama pull deepseek-r1:7b
   ```
   > 注：首次下载模型可能需要 5-15 分钟，取决于网络速度和模型大小

4. **验证 Ollama 运行**
   ```powershell
   # 测试嵌入模型
   curl http://localhost:11434/api/embeddings -d '{\"model\":\"nomic-embed-text\",\"prompt\":\"test\"}'
   
   # 测试聊天模型
   curl http://localhost:11434/api/generate -d '{\"model\":\"deepseek-r1:7b\",\"prompt\":\"Hello\"}'
   ```

#### macOS 用户
1. 从 [Ollama 官方网站](https://ollama.ai) 下载 macOS 版本
2. 打开 `.dmg` 文件，将 Ollama 拖到 Applications 文件夹
3. 从 Applications 中启动 Ollama
4. 通过终端下载模型：
   ```bash
   ollama pull nomic-embed-text
   ollama pull deepseek-r1:7b
   ```

#### Linux 用户
1. 使用一行命令安装：
   ```bash
   curl https://ollama.ai/install.sh | sh
   ```

2. 启动 Ollama：
   ```bash
   ollama serve
   ```

3. 在新终端窗口中下载模型：
   ```bash
   ollama pull nomic-embed-text
   ollama pull deepseek-r1:7b
   ```

### 配置 3：项目配置

项目已使用合理的默认配置。如需自定义，编辑 `Knowledge-rag-server/src/rag.js`：

```javascript
// 主要配置常量
const CHROMA_URL = "http://localhost:8000";        // Chroma 向量数据库地址
const OLLAMA_BASE_URL = "http://localhost:11434";  // Ollama 服务地址
const EMBEDDING_MODEL = "nomic-embed-text";        // 嵌入模型名称
const CHAT_MODEL = "deepseek-r1:7b";               // 聊天模型名称
```

## 启动项目

### 步骤 1：启动 Chroma 向量数据库

```powershell
cd Knowledge-rag-server
docker-compose up -d
```

验证 Chroma 已启动：
```powershell
curl http://localhost:8000/api/v1/heartbeat
```

### 步骤 2：启动后端服务

在新的 PowerShell 窗口中：
```powershell
cd Knowledge-rag-server
npm start
```

预期输出：
```
[Server] 服务器运行在 http://localhost:3000
```

### 步骤 3：启动前端应用

在另一个新的 PowerShell 窗口中：
```powershell
cd Knowledge-rag-ui
npm run dev
```

预期输出会显示本地开发服务器地址（通常是 http://localhost:5173）

### 步骤 4：访问应用

在浏览器中打开前端地址，通常是：
- **http://localhost:5173**

## 使用流程

1. **创建知识库**
   - 在左侧栏中输入知识库名称
   - 点击"创建"按钮

2. **上传文档**
   - 选择一个知识库
   - 点击"上传"按钮选择 TXT 或 Markdown 文件
   - 等待文档处理完成

3. **进行问答**
   - 在聊天窗口中输入问题
   - 系统会从知识库中检索相关内容并给出回答
   - 查看来源文档信息

## 故障排除

### 问题 1：Chroma 连接失败

**错误信息：** `ECONNREFUSED 127.0.0.1:8000`

**解决方案：**
```powershell
# 检查容器状态
docker ps

# 查看日志
docker logs knowledge-rag-chroma

# 重启服务
docker-compose restart
```

### 问题 2：Ollama 模型未响应

**错误信息：** `Error: connect ECONNREFUSED 127.0.0.1:11434`

**解决方案：**
1. 确认 Ollama 已启动（Windows 系统托盘中应有图标）
2. 检查模型是否已下载：
   ```powershell
   ollama list
   ```
3. 重新启动 Ollama 应用

### 问题 3：文档上传后报错

**错误信息：** `Unexpected end of JSON input`

**解决方案：**
- 确保 Chroma 和 Ollama 都在运行
- 重新启动后端服务：
  ```powershell
  # 在 Knowledge-rag-server 目录中 Ctrl+C 停止，然后
  npm start
  ```

### 问题 4：GPU 加速配置（可选）

如果您有 NVIDIA GPU 并希望加速模型推理：

1. **安装 CUDA 工具包**
   - 访问 [NVIDIA 官网](https://developer.nvidia.com/cuda-downloads)
   - 下载适配您 GPU 的版本

2. **配置 Ollama 使用 GPU**
   - Ollama 会自动检测 GPU（需要正确安装 CUDA）
   - 启动 Ollama 时应显示："GPU information" 相关日志

## API 文档

### 创建知识库
```
POST /api/knowledge-base
{
  "name": "我的知识库"
}
```

### 上传文档
```
POST /api/knowledge-base/:kbId/upload
Content-Type: multipart/form-data
- file: <文件对象>
```

### 发送问题
```
POST /api/chat
{
  "message": "问题内容",
  "kbId": "知识库ID"
}
```

## 开发模式

### 后端热重载
```powershell
cd Knowledge-rag-server
npm run dev
```

### 前端热重载
```powershell
cd Knowledge-rag-ui
npm run dev
```

## 性能优化建议

1. **模型选择**
   - 对于快速响应：使用较小的模型如 `llama2:7b`
   - 对于高质量回答：使用 `deepseek-r1:7b` 或更大的模型

2. **文档切分**
   - 调整 `rag.js` 中的 `chunkSize` 以平衡准确性和性能
   - 当前设置：1000 字符块，200 字符重叠

3. **向量检索**
   - 增加 `k` 参数（检索文档数量）以获得更多上下文
   - 减少 `k` 参数以加快响应速度

## 许可证

MIT

## 联系方式

如有问题或建议，请提交 Issue 或 Pull Request。
