import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useKnowledgeStore = defineStore('knowledge', () => {
  const knowledgeBases = ref([])
  const currentKbId = ref(null)
  const currentFiles = ref([])
  const isLoading = ref(false)
  const deletingKbId = ref(null)
  const deletingFileId = ref(null)

  // 计算属性：判断是否有可用的知识库
  const hasKnowledgeBases = computed(() => knowledgeBases.value.length > 0)
  const currentKb = computed(() => knowledgeBases.value.find(kb => kb.id === currentKbId.value))

  async function fetchKnowledgeBases() {
    try {
      const res = await fetch('http://localhost:3000/api/knowledge-bases')
      knowledgeBases.value = await res.json()
      
      // 如果没有知识库，清空currentKbId
      if (knowledgeBases.value.length === 0) {
        currentKbId.value = null
        currentFiles.value = []
      } else if (!currentKbId.value || !knowledgeBases.value.find(kb => kb.id === currentKbId.value)) {
        // 如果当前选中的知识库不存在，选择第一个
        currentKbId.value = knowledgeBases.value[0].id
        await fetchFiles(currentKbId.value)
      }
    } catch (e) {
      console.error(e)
    }
  }

  async function createKnowledgeBase(name, description) {
    try {
      const res = await fetch('http://localhost:3000/api/knowledge-bases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, description })
      })
      const newKb = await res.json()
      knowledgeBases.value.push(newKb)
      
      // 如果之前没有知识库，创建后自动选中新知识库
      if (!currentKbId.value) {
        currentKbId.value = newKb.id
      }
      
      return newKb
    } catch (e) {
      console.error(e)
    }
  }

  async function deleteKnowledgeBase(id) {
    if (!id) return
    deletingKbId.value = id
    try {
      const res = await fetch(`http://localhost:3000/api/knowledge-bases/${id}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const errPayload = await res.json().catch(() => null)
        const errMessage = errPayload?.details || errPayload?.error || errPayload?.message || `HTTP ${res.status}`
        throw new Error(errMessage)
      }
      await fetchKnowledgeBases()
    } catch (e) {
      console.error(e)
      throw e
    } finally {
      deletingKbId.value = null
    }
  }

  async function fetchFiles(kbId) {
    if (!kbId) {
      currentFiles.value = []
      isLoading.value = false
      return
    }
    isLoading.value = true
    try {
      const res = await fetch(`http://localhost:3000/api/knowledge-bases/${kbId}/files`)
      currentFiles.value = await res.json()
    } catch (e) {
      console.error(e)
    } finally {
      isLoading.value = false
    }
  }

  async function deleteFile(fileId) {
    if (!fileId || !currentKbId.value) return
    deletingFileId.value = fileId
    try {
      const res = await fetch(`http://localhost:3000/api/knowledge-bases/${currentKbId.value}/files/${fileId}`, {
        method: 'DELETE'
      })
      if (!res.ok) {
        const errPayload = await res.json().catch(() => null)
        const errMessage = errPayload?.details || errPayload?.error || errPayload?.message || `HTTP ${res.status}`
        throw new Error(errMessage)
      }
      await fetchFiles(currentKbId.value)
    } catch (e) {
      console.error(e)
      throw e
    } finally {
      deletingFileId.value = null
    }
  }

  function selectKb(id) {
    currentKbId.value = id
    fetchFiles(id)
  }

  return {
    knowledgeBases,
    currentKbId,
    currentFiles,
    isLoading,
    deletingKbId,
    deletingFileId,
    hasKnowledgeBases,
    currentKb,
    fetchKnowledgeBases,
    createKnowledgeBase,
    deleteKnowledgeBase,
    deleteFile,
    fetchFiles,
    selectKb
  }
})
