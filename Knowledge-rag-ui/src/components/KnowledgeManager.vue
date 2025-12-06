<script setup>
import { ref, onMounted } from 'vue'
import { useKnowledgeStore } from '../stores/knowledge'
import { storeToRefs } from 'pinia'

const store = useKnowledgeStore()
const { knowledgeBases, currentKbId, currentFiles, isLoading, deletingKbId, deletingFileId, hasKnowledgeBases, currentKb } = storeToRefs(store)
const { fetchKnowledgeBases, createKnowledgeBase, deleteKnowledgeBase, selectKb, deleteFile } = store

const newKbName = ref('')
const newKbDesc = ref('')
const showCreateModal = ref(false)
const fileInput = ref(null)
const isUploading = ref(false)

onMounted(() => {
  fetchKnowledgeBases()
  if (currentKbId.value) {
    selectKb(currentKbId.value)
  }
})

const handleCreate = async () => {
  if (!newKbName.value) return
  await createKnowledgeBase(newKbName.value, newKbDesc.value)
  showCreateModal.value = false
  newKbName.value = ''
  newKbDesc.value = ''
}

const handleDelete = async (id) => {
  if (!confirm('确定要删除这个知识库吗？所有关联文件和向量数据将被移除。')) {
    return
  }
  try {
    await deleteKnowledgeBase(id)
  } catch (error) {
    console.error(error)
    alert(`删除失败：${error.message}`)
  }
}

const handleDeleteFile = async (fileId) => {
  if (!confirm('确定要删除这个文档吗？该操作将移除已上传文件及向量碎片。')) {
    return
  }
  try {
    await deleteFile(fileId)
  } catch (error) {
    console.error(error)
    alert(`删除失败：${error.message}`)
  }
}

const triggerUpload = () => {
  fileInput.value.click()
}

const handleFileChange = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  
  isUploading.value = true
  try {
    // Manually calling fetch here because chatStore.uploadFile is tied to chat UI logic
    const formData = new FormData()
    formData.append('file', file)
    formData.append('kbId', currentKbId.value)

    const res = await fetch('http://localhost:3000/api/upload', {
      method: 'POST',
      body: formData
    })
    
    if (res.ok) {
      // Refresh file list
      store.fetchFiles(currentKbId.value)
      alert('上传成功！')
    } else {
      alert('上传失败')
    }
  } catch (e) {
    console.error(e)
    alert('上传出错')
  } finally {
    isUploading.value = false
    e.target.value = ''
  }
}
</script>

<template>
  <div class="flex h-full w-full bg-[#343541] text-white">
    <div class="w-64 border-r border-gray-700 p-4 flex flex-col">
      <h2 class="text-xl font-bold mb-4">知识库列表</h2>
      <button 
        @click="showCreateModal = true"
        class="mb-4 w-full py-2 px-4 bg-green-600 hover:bg-green-700 rounded flex items-center justify-center gap-2"
      >
        <span>+</span> 新建知识库
      </button>

      <div v-if="!hasKnowledgeBases" class="flex-1 flex items-center justify-center text-center text-gray-400 px-2">
        <div>
          <div class="text-2xl mb-2">📚</div>
          <div class="text-sm">暂无知识库</div>
          <div class="text-xs text-gray-500 mt-2">点击上方按钮创建第一个</div>
        </div>
      </div>

      <div v-else class="flex-1 overflow-y-auto space-y-2">
        <div 
          v-for="kb in knowledgeBases"
          :key="kb.id"
          @click="selectKb(kb.id)"
          class="p-3 rounded cursor-pointer hover:bg-gray-700 transition-colors relative group"
          :class="{ 'bg-gray-700': currentKbId === kb.id }"
        >
          <div class="font-medium">{{ kb.name }}</div>
          <div class="text-xs text-gray-400 truncate">{{ kb.description || '无描述' }}</div>

          <button 
            type="button"
            @click.stop="handleDelete(kb.id)"
            :disabled="deletingKbId === kb.id"
            class="absolute right-2 top-3 text-gray-400 hover:text-red-400 opacity-0 group-hover:opacity-100 disabled:text-gray-500 disabled:hover:text-gray-500"
          >
            <span v-if="deletingKbId === kb.id" class="text-xs">删除中...</span>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
          </button>
        </div>
      </div>
    </div>

    <div v-if="hasKnowledgeBases && currentKb" class="flex-1 p-8 overflow-y-auto">
      <div class="flex justify-between items-start mb-8 gap-4">
        <div>
          <h1 class="text-3xl font-bold mb-2">{{ currentKb.name }}</h1>
          <p class="text-gray-400">{{ currentKb.description }}</p>
          <div class="text-xs text-gray-500 mt-2">ID: {{ currentKb.id }}</div>
        </div>

        <div class="flex gap-3 items-center">
          <input type="file" ref="fileInput" @change="handleFileChange" class="hidden" accept=".pdf,.txt,.md" />
          <button 
            @click="triggerUpload"
            :disabled="isUploading"
            class="py-2 px-4 bg-blue-600 hover:bg-blue-700 rounded flex items-center gap-2 disabled:opacity-50"
          >
            <span v-if="isUploading" class="animate-spin">⌛</span>
            <span v-else>📤</span>
            上传文档
          </button>
          <button
            type="button"
            @click="handleDelete(currentKb.id)"
            :disabled="deletingKbId === currentKb.id"
            class="py-2 px-3 border border-red-500 hover:bg-red-500 hover:text-white rounded text-sm disabled:bg-gray-600 disabled:border-gray-600 disabled:text-gray-300"
          >
            <span v-if="deletingKbId === currentKb.id">删除中…</span>
            <span v-else>删除知识库</span>
          </button>
        </div>
      </div>

      <div class="bg-gray-800 rounded-lg p-6">
        <h3 class="text-lg font-semibold mb-4 border-b border-gray-700 pb-2">已收录文档 ({{ currentFiles.length }})</h3>

        <div v-if="isLoading" class="text-center py-8 text-gray-400">加载中...</div>

        <div v-else-if="currentFiles.length === 0" class="text-center py-8 text-gray-500">
          暂无文档，请点击右上角上传。
        </div>

        <div v-else class="grid gap-4">
          <div 
            v-for="file in currentFiles" 
            :key="file.id"
            class="flex items-center justify-between p-4 bg-gray-700/50 rounded hover:bg-gray-700 transition-colors"
          >
            <div class="flex items-center gap-3">
              <span class="text-2xl">{{ file.type === 'pdf' ? '📄' : '📝' }}</span>
              <div>
                <div class="font-medium">{{ file.filename }}</div>
                <div class="text-xs text-gray-400">{{ new Date(file.uploadedAt).toLocaleString() }}</div>
              </div>
            </div>
            <div class="flex items-center gap-3">
              <div class="text-xs text-gray-500 truncate max-w-xs">{{ file.path }}</div>
              <button
                type="button"
                @click.stop="handleDeleteFile(file.id)"
                :disabled="deletingFileId === file.id"
                class="text-xs px-2 py-1 border border-red-500 rounded hover:bg-red-500 hover:text-white disabled:border-gray-600 disabled:text-gray-400 disabled:hover:bg-transparent"
              >
                <span v-if="deletingFileId === file.id">删除中…</span>
                <span v-else>删除</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="hasKnowledgeBases" class="flex-1 flex items-center justify-center text-gray-500">
      请选择一个知识库
    </div>

    <div v-if="showCreateModal" class="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div class="bg-gray-800 p-6 rounded-lg w-96 shadow-xl border border-gray-700">
        <h3 class="text-xl font-bold mb-4">新建知识库</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">名称</label>
            <input v-model="newKbName" class="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-blue-500" placeholder="例如：公司规章制度" />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">描述</label>
            <textarea v-model="newKbDesc" class="w-full bg-gray-700 border border-gray-600 rounded p-2 text-white focus:outline-none focus:border-blue-500" rows="3" placeholder="可选"></textarea>
          </div>
        </div>
        <div class="flex justify-end gap-3 mt-6">
          <button @click="showCreateModal = false" class="px-4 py-2 text-gray-300 hover:text-white">取消</button>
          <button @click="handleCreate" class="px-4 py-2 bg-green-600 hover:bg-green-700 rounded">创建</button>
        </div>
      </div>
    </div>
  </div>
</template>
